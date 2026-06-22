// OS notifications: the core NATS subscription on
// `machine.<machineId>.notification`, envelope parsing/dispatch, the dock
// badge, and the pending-click handoff consumed on window focus.

use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::time::{Duration, Instant};

use futures::StreamExt;
use tauri::{async_runtime, AppHandle, Emitter, Manager};

use super::{current_client, Inner, NatsBridge};

/// What the WebView should open when the user clicks a notification.
#[derive(Clone, Debug)]
enum NotificationTarget {
    Ticket { ticket_id: String },
    Dialog { dialog_id: String },
}

#[derive(Clone, Debug)]
pub(super) struct PendingNotification {
    target: NotificationTarget,
    fired_at: Instant,
}

impl NatsBridge {
    /// Driven by the frontend's `notifications` feature flag.
    pub fn set_notifications_enabled(&self, enabled: bool) {
        let was = self
            .inner
            .notifications_enabled
            .swap(enabled, Ordering::Relaxed);
        if was != enabled {
            tracing::info!("[NATS] notifications feature flag: {enabled}");
        }
    }

    /// Called from the main-window focus handler. Clears unread state and,
    /// if a notification was fired in the last `MAX_PENDING_AGE` seconds,
    /// emits `notification:click` so the WebView can navigate.
    pub fn on_main_window_focused(&self) {
        const MAX_PENDING_AGE: Duration = Duration::from_secs(30);

        if self.inner.unread_count.swap(0, Ordering::Relaxed) > 0 {
            set_badge(&self.inner, 0);
        }

        let pending = {
            let mut guard = match self.inner.pending_notification.lock() {
                Ok(g) => g,
                Err(p) => p.into_inner(),
            };
            guard.take()
        };

        let Some(p) = pending else { return };
        if p.fired_at.elapsed() > MAX_PENDING_AGE {
            tracing::debug!("[NATS] dropping stale pending notification: {:?}", p.target);
            return;
        }

        let payload = match p.target {
            NotificationTarget::Ticket { ticket_id } => {
                tracing::info!("[NATS] window focused — emitting notification:click for ticket {ticket_id}");
                serde_json::json!({ "kind": "ticket", "id": ticket_id })
            }
            NotificationTarget::Dialog { dialog_id } => {
                tracing::info!("[NATS] window focused — emitting notification:click for dialog {dialog_id}");
                serde_json::json!({ "kind": "dialog", "id": dialog_id })
            }
        };
        let _ = self.inner.app.emit_to("main", "notification:click", payload);
    }
}

pub(super) async fn ensure_notification_subscription(inner: &Arc<Inner>) {
    let machine_id = match &inner.machine_id {
        Some(id) => id,
        None => return,
    };
    let client = match current_client(inner).await {
        Some(c) => c,
        None => return,
    };

    // Hold the write lock across check + subscribe + store so concurrent
    // Connected handlers can't double-subscribe.
    let mut task_guard = inner.notification_task.write().await;
    if task_guard.is_some() {
        // Already subscribed — async-nats re-issues SUB on reconnect, so
        // the existing router task continues to receive messages.
        return;
    }

    let subject = format!("machine.{}.notification", machine_id);
    let subscriber = match client.subscribe(subject.clone()).await {
        Ok(s) => s,
        Err(err) => {
            tracing::warn!("[NATS] subscribe to {subject} failed: {err}");
            return;
        }
    };

    let inner_for_task = inner.clone();
    let handle = async_runtime::spawn(async move {
        notification_router(inner_for_task, subscriber).await;
    });
    *task_guard = Some(handle);
    tracing::info!("[NATS] subscribed to {subject}");
}

async fn notification_router(inner: Arc<Inner>, mut subscriber: async_nats::Subscriber) {
    while let Some(message) = subscriber.next().await {
        // Payload carries user-facing content — full dump only at debug.
        tracing::info!(
            "[NATS] notification received on '{}' ({} bytes)",
            message.subject,
            message.payload.len()
        );
        tracing::debug!(
            "[NATS] notification payload: {}",
            String::from_utf8_lossy(&message.payload)
        );
        let payload: serde_json::Value = match serde_json::from_slice(&message.payload) {
            Ok(v) => v,
            Err(err) => {
                tracing::warn!("[NATS] dropping non-JSON notification: {err}");
                continue;
            }
        };
        maybe_notify(&inner, &payload);
    }
    // The stream only closes if the client is torn down — but if it ever
    // does, clear the slot so the next Connected event re-subscribes instead
    // of treating the dead handle as "already subscribed". No generation
    // guard needed: this task is installed once and never replaced.
    *inner.notification_task.write().await = None;
    tracing::info!("[NATS] notification router exited (stream closed) — will re-subscribe on next connect");
}

/// A backend notification reduced to what we render + where a click lands.
struct ParsedNotification {
    title: String,
    body: String,
    target: Option<NotificationTarget>,
}

/// Generic parsing: every envelope on this subject is user-displayable by
/// contract, so any payload with a `title` fires as-is. `None` only for
/// envelopes with no title (not meant for display).
///
/// Envelope shape:
///   `{ id, severity, title, description, createdAt, context: { type, .. } }`
fn parse_notification(payload: &serde_json::Value) -> Option<ParsedNotification> {
    let title = string_field(payload, "title")?;
    Some(ParsedNotification {
        title,
        body: string_field(payload, "description")
            .map(|t| truncate_for_notification(&t, 140))
            .unwrap_or_default(),
        target: payload.get("context").and_then(parse_target),
    })
}

fn parse_target(context: &serde_json::Value) -> Option<NotificationTarget> {
    let ticket = || string_field(context, "ticketId").map(|ticket_id| NotificationTarget::Ticket { ticket_id });
    let dialog = || string_field(context, "dialogId").map(|dialog_id| NotificationTarget::Dialog { dialog_id });

    match string_field(context, "type").as_deref() {
        Some("CLIENT_AI_MESSAGE") => dialog(),
        Some("ADMIN_MESSAGE_PUBLISHED") | Some("TICKET_STATUS_CHANGED") => ticket(),
        _ => ticket().or_else(dialog),
    }
}

fn string_field(value: &serde_json::Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(str::to_string)
}

fn maybe_notify(inner: &Arc<Inner>, payload: &serde_json::Value) {
    if !inner.notifications_enabled.load(Ordering::Relaxed) {
        tracing::debug!("[NATS] notifications feature flag off — dropping notification");
        return;
    }
    let app = &inner.app;
    let Some(parsed) = parse_notification(payload) else {
        let ctx_type = payload
            .get("context")
            .and_then(|c| c.get("type"))
            .and_then(|v| v.as_str())
            .unwrap_or("");
        tracing::info!(
            "[NATS] maybe_notify: ignoring notification without title (context.type='{ctx_type}')"
        );
        return;
    };

    if !should_notify(app) {
        tracing::debug!("[NATS] skipping notification (window visible+focused)");
        return;
    }

    if let Some(target) = &parsed.target {
        if let Ok(mut guard) = inner.pending_notification.lock() {
            *guard = Some(PendingNotification {
                target: target.clone(),
                fired_at: Instant::now(),
            });
        }
    }

    let n = inner.unread_count.fetch_add(1, Ordering::Relaxed) + 1;
    set_badge(inner, n);

    let ParsedNotification { title, body, .. } = parsed;
    fire_notification(app.clone(), title, body);
}

fn fire_notification(app: AppHandle, title: String, body: String) {
    std::thread::spawn(move || {
        let mut notification = notify_rust::Notification::new();
        notification.summary(&title);
        if !body.is_empty() {
            notification.body(&body);
        }
        notification.action("open", "Open");

        #[cfg(target_os = "macos")]
        {
            let identifier = if tauri::is_dev() {
                "com.apple.Terminal".to_string()
            } else {
                app.config().identifier.clone()
            };
            let _ = notify_rust::set_application(&identifier);
        }
        #[cfg(target_os = "windows")]
        if !tauri::is_dev() {
            notification.app_id(&app.config().identifier);
        }

        match notification.show() {
            Ok(handle) => {
                tracing::info!("[NATS] notification fired: {title}");
                use notify_rust::NotificationResponse;
                let _ = handle.wait_for_response(|response: &NotificationResponse| {
                    if !matches!(response, NotificationResponse::Closed(_)) {
                        tracing::info!("[NATS] notification activated — opening window");
                        crate::activate_main_window(&app);
                    }
                });
            }
            Err(err) => tracing::warn!("[NATS] notification show failed: {err}"),
        }
    });
}

fn should_notify(app: &AppHandle) -> bool {
    // No window = the user can't be looking at the chat — notify. Matches
    // the unwrap_or(false) policy below: unknown state counts as not engaged.
    let Some(main) = app.get_webview_window("main") else {
        return true;
    };
    let visible = main.is_visible().unwrap_or(false);
    let focused = main.is_focused().unwrap_or(false);
    !(visible && focused)
}

fn set_badge(inner: &Inner, count: u32) {
    if let Some(window) = inner.app.get_webview_window("main") {
        let badge = if count == 0 { None } else { Some(count as i64) };
        if let Err(err) = window.set_badge_count(badge) {
            tracing::debug!("[NATS] set_badge_count failed: {err}");
        }
    }
}

fn truncate_for_notification(text: &str, max: usize) -> String {
    if text.chars().count() <= max {
        return text.to_string();
    }
    let mut out: String = text.chars().take(max.saturating_sub(1)).collect();
    out.push('…');
    out
}
