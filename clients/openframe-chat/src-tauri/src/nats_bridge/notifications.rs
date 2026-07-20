// OS notifications: the core NATS subscription on
// `machine.<machineId>.notification`, envelope parsing/dispatch, the dock
// badge, and click handling that navigates the WebView to the notification's
// source entity.
//
// Click delivery per platform:
//   - macOS bundled builds: `UNUserNotificationCenter` (`macos_un`) delivers a
//     callback for every click — live banner, Notification Center, or a
//     cold-start launch — with the target carried in the notification's
//     userInfo.
//   - Windows: toasts use protocol activation; every click opens an
//     `openframe-chat://notify` URI which reaches the running instance via
//     single-instance argv forwarding, or launches the app cold
//     (`handle_notification_uri`).
//   - macOS dev builds (unbundled — UN APIs abort there) and other platforms
//     have no OS notification backend.
//
// All click paths funnel into `deliver_click_payload`, which stashes the
// payload until the WebView signals readiness (`take_startup_click`) so
// cold-start clicks are not emitted into a not-yet-mounted listener.

use std::sync::atomic::Ordering;
use std::sync::Arc;

use futures::StreamExt;
use tauri::{async_runtime, AppHandle, Emitter, Manager};

use super::{current_client, Inner, NatsBridge};

const CLICK_URI_PREFIX: &str = "openframe-chat://notify";

/// What the WebView should open when the user clicks a notification.
#[derive(Clone, Debug, PartialEq, Eq)]
pub(super) enum NotificationTarget {
    Ticket { ticket_id: String },
    Dialog { dialog_id: String },
}

impl NotificationTarget {
    pub(super) fn click_payload(&self) -> serde_json::Value {
        match self {
            NotificationTarget::Ticket { ticket_id } => {
                serde_json::json!({ "kind": "ticket", "id": ticket_id })
            }
            NotificationTarget::Dialog { dialog_id } => {
                serde_json::json!({ "kind": "dialog", "id": dialog_id })
            }
        }
    }
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
        #[cfg(target_os = "macos")]
        if enabled {
            super::macos_un::ensure_authorized();
        }
    }

    /// Called from the main-window focus handler: clears the unread badge.
    pub fn on_main_window_focused(&self) {
        if self.inner.unread_count.swap(0, Ordering::Relaxed) > 0 {
            set_badge(&self.inner, 0);
        }
    }

    /// Handles an `openframe-chat://notify` URI from a Windows toast click,
    /// arriving either as our own argv (cold start) or forwarded by the
    /// single-instance plugin (warm click). Returns `false` for foreign URIs.
    pub fn handle_notification_uri(&self, uri: &str) -> bool {
        if !uri.starts_with(CLICK_URI_PREFIX) {
            return false;
        }
        let payload = parse_click_payload(uri);
        tracing::info!(
            "[NATS] notification click URI received (target: {})",
            payload.is_some()
        );
        deliver_click_payload(&self.inner, payload);
        true
    }

    /// Invoked once by the WebView when its `notification:click` listener is
    /// mounted. Marks the gate open and drains any click that happened before
    /// (cold-start launch via a notification).
    pub fn take_startup_click(&self) -> Option<serde_json::Value> {
        // Flip ready and drain under the stash lock — see emit_or_stash.
        let mut stash = match self.inner.stashed_click.lock() {
            Ok(g) => g,
            Err(p) => p.into_inner(),
        };
        self.inner
            .webview_click_ready
            .store(true, Ordering::Release);
        stash.take()
    }
}

/// Emit `notification:click` to the WebView, or stash it if the WebView has
/// not signalled readiness yet (cold start: the click that launched the app
/// happens before React mounts the listener).
fn emit_or_stash(inner: &Inner, payload: serde_json::Value) {
    // The readiness check and the stash write share the stash lock: checked
    // outside it, a concurrent take_startup_click could flip ready and drain
    // between our check and store, stranding the payload until the next
    // webview reload.
    let mut stash = match inner.stashed_click.lock() {
        Ok(g) => g,
        Err(p) => p.into_inner(),
    };
    if inner.webview_click_ready.load(Ordering::Acquire) {
        let _ = inner.app.emit_to("main", "notification:click", payload);
    } else {
        tracing::info!("[NATS] webview not ready — stashing notification click");
        *stash = Some(payload);
    }
}

/// The OS identified the exact notification that was clicked: deliver the
/// payload and activate the window.
pub(super) fn deliver_click_payload(inner: &Inner, payload: Option<serde_json::Value>) {
    match payload {
        Some(payload) => {
            tracing::info!("[NATS] notification activated — opening {payload}");
            emit_or_stash(inner, payload);
        }
        None => tracing::info!("[NATS] notification activated — opening window"),
    }
    crate::activate_main_window(&inner.app);
}

#[cfg(any(target_os = "windows", test))]
fn click_uri(target: Option<&NotificationTarget>) -> String {
    use percent_encoding::{utf8_percent_encode, NON_ALPHANUMERIC};
    let encode = |id: &str| utf8_percent_encode(id, NON_ALPHANUMERIC).to_string();
    match target {
        Some(NotificationTarget::Ticket { ticket_id }) => {
            format!("{CLICK_URI_PREFIX}?kind=ticket&id={}", encode(ticket_id))
        }
        Some(NotificationTarget::Dialog { dialog_id }) => {
            format!("{CLICK_URI_PREFIX}?kind=dialog&id={}", encode(dialog_id))
        }
        None => CLICK_URI_PREFIX.to_string(),
    }
}

/// `openframe-chat://notify?kind=<ticket|dialog>&id=<percent-encoded>` →
/// the `notification:click` payload. `None` for a bare/malformed URI (the
/// click still activates the window, it just doesn't navigate).
fn parse_click_payload(uri: &str) -> Option<serde_json::Value> {
    let rest = uri.strip_prefix(CLICK_URI_PREFIX)?;
    let query = rest.strip_prefix('/').unwrap_or(rest).strip_prefix('?')?;
    let mut kind = None;
    let mut id = None;
    for pair in query.split('&') {
        let Some((k, v)) = pair.split_once('=') else {
            continue;
        };
        match k {
            "kind" => kind = Some(v.to_string()),
            "id" => {
                id = percent_encoding::percent_decode_str(v)
                    .decode_utf8()
                    .ok()
                    .map(|s| s.into_owned())
            }
            _ => {}
        }
    }
    match (kind, id) {
        (Some(kind), Some(id)) if !id.is_empty() => {
            Some(serde_json::json!({ "kind": kind, "id": id }))
        }
        _ => None,
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
    tracing::info!(
        "[NATS] notification router exited (stream closed) — will re-subscribe on next connect"
    );
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
    let ticket = || {
        string_field(context, "ticketId").map(|ticket_id| NotificationTarget::Ticket { ticket_id })
    };
    let dialog = || {
        string_field(context, "dialogId").map(|dialog_id| NotificationTarget::Dialog { dialog_id })
    };

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

    let n = inner.unread_count.fetch_add(1, Ordering::Relaxed) + 1;
    set_badge(inner, n);

    let ParsedNotification {
        title,
        body,
        target,
    } = parsed;
    #[cfg(target_os = "macos")]
    super::macos_un::fire(title, body, target);
    #[cfg(target_os = "windows")]
    fire_toast(inner, title, body, target);
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = (title, body, target);
        tracing::debug!("[NATS] no notification backend on this platform");
    }
}

#[cfg(target_os = "windows")]
fn fire_toast(inner: &Arc<Inner>, title: String, body: String, target: Option<NotificationTarget>) {
    // Dev builds have no registered AUMID; PowerShell's works out of the box.
    const POWERSHELL_APP_ID: &str =
        "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe";
    let app_id = if tauri::is_dev() {
        POWERSHELL_APP_ID.to_string()
    } else {
        inner.app.config().identifier.clone()
    };
    let uri = click_uri(target.as_ref());

    std::thread::spawn(
        move || match super::windows_toast::show(&app_id, &title, &body, &uri) {
            Ok(()) => tracing::info!("[NATS] notification fired: {title}"),
            Err(err) => tracing::warn!("[NATS] notification show failed: {err:?}"),
        },
    );
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn click_uri_roundtrip() {
        let target = NotificationTarget::Ticket {
            ticket_id: "6a4fda9ba8b65c28c4dbf6ba".into(),
        };
        let payload = parse_click_payload(&click_uri(Some(&target))).unwrap();
        assert_eq!(payload["kind"], "ticket");
        assert_eq!(payload["id"], "6a4fda9ba8b65c28c4dbf6ba");

        let target = NotificationTarget::Dialog {
            dialog_id: "abc/д ф".into(),
        };
        let payload = parse_click_payload(&click_uri(Some(&target))).unwrap();
        assert_eq!(payload["kind"], "dialog");
        assert_eq!(payload["id"], "abc/д ф");
    }

    #[test]
    fn bare_uri_has_no_payload() {
        assert_eq!(click_uri(None), "openframe-chat://notify");
        assert!(parse_click_payload("openframe-chat://notify").is_none());
        assert!(parse_click_payload("openframe-chat://notify?kind=ticket&id=").is_none());
        assert!(parse_click_payload("openframe-chat://notify?id=x").is_none());
    }
}
