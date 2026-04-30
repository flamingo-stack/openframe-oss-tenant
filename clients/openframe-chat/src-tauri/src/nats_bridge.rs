// NATS bridge — owns the user-scoped NATS WebSocket connection on behalf of
// the WebView. Mirrors the connection style used by `openframe-client`
// (see openframe-client/src/services/nats_connection_manager.rs) but with:
//   - user-scoped path (`/ws/nats-api`) instead of machine-scoped (`/ws/nats`)
//   - no `X-MACHINE-ID` header
//   - no in-process OAuth refresh: token rotation is delegated to the
//     openframe-client daemon; we wait on `TokenState.token_changed`.

use std::collections::{HashMap, HashSet};
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex as StdMutex};
use std::time::{Duration, Instant};

use async_nats::{Client, Event};
use futures::StreamExt;
use serde::Serialize;
use tauri::async_runtime::JoinHandle;
use tauri::ipc::Channel;
use tauri::{async_runtime, AppHandle, Emitter, Manager};
use tauri_plugin_notification::NotificationExt;
use tokio::sync::{Mutex, RwLock};
use uuid::Uuid;

use crate::token_watcher::TokenState;
use crate::ServerUrlState;

/// NATS user that the gateway expects on the WS upgrade.
///
/// The actual auth happens via the JWT in the `?authorization=` query
/// parameter; the username/password are required by the NATS protocol but
/// carry no auth weight here. Same convention as `openframe-client`.
const NATS_USER: &str = "machine";
const NATS_PASS: &str = "";

/// Path on the gateway that proxies user-scoped NATS over WebSocket.
const NATS_WS_PATH: &str = "/ws/nats-api";

/// Reconnect delay used by the underlying async-nats client.
const RECONNECT_DELAY: Duration = Duration::from_secs(5);

/// How often async-nats sends WS pings.
const PING_INTERVAL: Duration = Duration::from_secs(10);


#[derive(Clone, Copy, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ConnectionState {
    Connecting,
    Connected,
    Disconnected,
}

#[derive(Clone, Debug, Serialize)]
pub struct NatsStatus {
    pub state: ConnectionState,
    pub reconnect_count: u32,
}

/// Event payload broadcast on every registered Tauri Channel for each
/// incoming NATS message. The `dialog_id` lets WebView consumers filter
/// to the dialog they currently render.
#[derive(Clone, Debug, Serialize)]
pub struct NatsEvent {
    pub dialog_id: String,
    pub payload: serde_json::Value,
}

/// Owns the NATS connection. Cloneable — internal state is shared.
#[derive(Clone)]
pub struct NatsBridge {
    inner: Arc<Inner>,
}

struct Inner {
    client: RwLock<Option<Client>>,
    state: RwLock<ConnectionState>,
    reconnect_count: AtomicU32,
    /// Set the first time we hit `Connected`; subsequent transitions to
    /// `Connected` then bump `reconnect_count`.
    had_connection: AtomicBool,
    server_url: ServerUrlState,
    token_state: TokenState,
    app: AppHandle,
    /// Guards `start()` so the connect task is only spawned once.
    started: Mutex<bool>,

    /// Dialog ids the WebView currently wants subscribed. Updated by
    /// `set_tracked_dialogs`; `reconcile_subscriptions` enforces it.
    desired: RwLock<HashSet<String>>,
    /// Active per-dialog router tasks. Dropping (`abort`) the JoinHandle
    /// stops the task, drops the Subscriber, and unsubscribes server-side.
    active: RwLock<HashMap<String, JoinHandle<()>>>,
    /// Tauri Channels registered by WebView consumers. Each incoming NATS
    /// message is fan-out to every channel.
    event_channels: RwLock<HashMap<String, Channel<NatsEvent>>>,
    /// Most recent notification's dialog id + when it was fired. Consumed
    /// by the window-focus handler to emit `notification:click` for
    /// "click notification → land on dialog" navigation.
    pending_notification: StdMutex<Option<PendingNotification>>,
}

#[derive(Clone, Debug)]
struct PendingNotification {
    dialog_id: String,
    fired_at: Instant,
}

impl NatsBridge {
    pub fn new(app: AppHandle, server_url: ServerUrlState, token_state: TokenState) -> Self {
        Self {
            inner: Arc::new(Inner {
                client: RwLock::new(None),
                state: RwLock::new(ConnectionState::Disconnected),
                reconnect_count: AtomicU32::new(0),
                had_connection: AtomicBool::new(false),
                server_url,
                token_state,
                app,
                started: Mutex::new(false),
                desired: RwLock::new(HashSet::new()),
                active: RwLock::new(HashMap::new()),
                event_channels: RwLock::new(HashMap::new()),
                pending_notification: StdMutex::new(None),
            }),
        }
    }

    /// Spawn the connect task. Idempotent: subsequent calls are no-ops.
    pub async fn start(&self) {
        let mut started = self.inner.started.lock().await;
        if *started {
            return;
        }
        *started = true;

        let bridge = self.clone();
        async_runtime::spawn(async move {
            bridge.run().await;
        });
    }

    pub async fn status(&self) -> NatsStatus {
        NatsStatus {
            state: *self.inner.state.read().await,
            reconnect_count: self.inner.reconnect_count.load(Ordering::Relaxed),
        }
    }

    /// Replace the set of dialog ids the bridge keeps subscribed. Adds
    /// missing subscriptions, removes ones no longer wanted. No-ops on the
    /// network side until the connection is established; the desired set
    /// is remembered and reconciled on each `Connected` event.
    pub async fn set_tracked_dialogs(&self, ids: Vec<String>) {
        let new_set: HashSet<String> = ids.into_iter().collect();
        {
            let mut desired = self.inner.desired.write().await;
            if *desired == new_set {
                return;
            }
            *desired = new_set;
        }
        reconcile_subscriptions(&self.inner).await;
    }

    pub async fn register_event_channel(&self, channel: Channel<NatsEvent>) -> String {
        let id = Uuid::new_v4().to_string();
        self.inner
            .event_channels
            .write()
            .await
            .insert(id.clone(), channel);
        id
    }

    pub async fn unregister_event_channel(&self, id: &str) {
        self.inner.event_channels.write().await.remove(id);
    }

    /// Called from the main-window focus handler. If a notification was
    /// fired in the last `MAX_PENDING_AGE` seconds, consume it and emit
    /// `notification:click` so the WebView can navigate. Otherwise no-op.
    pub fn on_main_window_focused(&self) {
        const MAX_PENDING_AGE: Duration = Duration::from_secs(30);

        let pending = {
            let mut guard = match self.inner.pending_notification.lock() {
                Ok(g) => g,
                Err(p) => p.into_inner(),
            };
            guard.take()
        };

        let Some(p) = pending else { return };
        if p.fired_at.elapsed() > MAX_PENDING_AGE {
            tracing::debug!(
                "[NATS] dropping stale pending notification for dialog {}",
                p.dialog_id
            );
            return;
        }

        tracing::info!(
            "[NATS] window focused — emitting notification:click for dialog {}",
            p.dialog_id
        );
        let _ = self.inner.app.emit(
            "notification:click",
            serde_json::json!({ "kind": "dialog", "id": p.dialog_id }),
        );
    }

    async fn run(&self) {
        // Wait for server URL + token to both be available. The token
        // arrives asynchronously from the daemon-driven watcher.
        loop {
            let server = self.read_server_url();
            let token = self.read_token();
            if server.is_some() && token.is_some() {
                break;
            }
            self.set_state(ConnectionState::Connecting).await;
            // Park until the next token update or 5s, whichever comes first.
            let notified = self.inner.token_state.token_changed.notified();
            tokio::select! {
                _ = notified => {}
                _ = tokio::time::sleep(Duration::from_secs(5)) => {}
            }
        }

        self.set_state(ConnectionState::Connecting).await;

        let server_url = self.read_server_url().expect("server url present");
        let connect_url = build_connect_url(&server_url, &self.read_token().unwrap_or_default());

        let app_for_event = self.inner.app.clone();
        let state_for_event = self.inner.clone();
        let token_state = self.inner.token_state.clone();
        let server_for_auth = server_url.clone();

        let connect_options = async_nats::ConnectOptions::new()
            .name("openframe-chat")
            .user_and_password(NATS_USER.to_string(), NATS_PASS.to_string())
            .retry_on_initial_connect()
            .reconnect_delay_callback(|_attempt| RECONNECT_DELAY)
            .ping_interval(PING_INTERVAL)
            .event_callback(move |event| {
                let app = app_for_event.clone();
                let state = state_for_event.clone();
                async move {
                    handle_nats_event(event, &app, &state).await;
                }
            })
            .auth_url_callback(move |()| {
                let token_state = token_state.clone();
                let server_url = server_for_auth.clone();
                async move {
                    wait_for_fresh_url(server_url, token_state).await
                }
            });

        match connect_options.connect(&connect_url).await {
            Ok(client) => {
                *self.inner.client.write().await = Some(client);
                // event_callback will fire `Connected` shortly; don't
                // pre-emptively flip state here.
                tracing::info!("[NATS] connect() returned Ok");
            }
            Err(err) => {
                // `retry_on_initial_connect` means this branch is hit only
                // for unrecoverable errors (bad URL, bad TLS, etc.). Log
                // and stay in `Connecting` — the run-loop is single-shot,
                // so caller must restart the app to retry from scratch.
                tracing::error!("[NATS] connect() failed unrecoverably: {err}");
                self.set_state(ConnectionState::Disconnected).await;
            }
        }
    }

    fn read_server_url(&self) -> Option<String> {
        self.inner.server_url.url.lock().ok().and_then(|g| g.clone())
    }

    fn read_token(&self) -> Option<String> {
        self.inner
            .token_state
            .current_token
            .lock()
            .ok()
            .and_then(|g| g.clone())
    }

    async fn set_state(&self, new_state: ConnectionState) {
        let mut state = self.inner.state.write().await;
        if *state == new_state {
            return;
        }
        *state = new_state;
        let count = self.inner.reconnect_count.load(Ordering::Relaxed);
        let payload = NatsStatus {
            state: new_state,
            reconnect_count: count,
        };
        let _ = self.inner.app.emit("nats:status", payload);
    }
}

async fn handle_nats_event(event: Event, app: &AppHandle, inner: &Arc<Inner>) {
    tracing::info!("[NATS] event: {:?}", event);
    match event {
        Event::Connected => {
            // First connect: just flip state. Subsequent connects: also bump
            // the reconnect counter so the WebView knows to run catch-up.
            let was_connected_before = inner.had_connection.swap(true, Ordering::Relaxed);
            if was_connected_before {
                inner.reconnect_count.fetch_add(1, Ordering::Relaxed);
            }
            *inner.state.write().await = ConnectionState::Connected;
            emit_status(app, inner).await;
            if was_connected_before {
                let _ = app.emit("nats:reconnected", ());
            }
            // Apply any subscription requests that arrived while we were
            // disconnected. On a clean reconnect async-nats keeps existing
            // subscribers alive, but a tracked set added in the meantime
            // wouldn't have been subscribed yet.
            let inner = inner.clone();
            async_runtime::spawn(async move {
                reconcile_subscriptions(&inner).await;
            });
        }
        Event::Disconnected => {
            *inner.state.write().await = ConnectionState::Disconnected;
            emit_status(app, inner).await;
        }
        Event::ClientError(_) | Event::ServerError(_) => {
            // Leave state as-is — async-nats will follow up with
            // Disconnected if it actually drops the connection.
        }
        _ => {}
    }
}

/// Bring `active` in line with `desired`. Adds new subscriptions, aborts
/// router tasks for removed ones. Safe to call repeatedly; idempotent.
async fn reconcile_subscriptions(inner: &Arc<Inner>) {
    let client = match inner.client.read().await.clone() {
        Some(c) => c,
        None => return, // not connected yet — nothing to do
    };
    let desired: HashSet<String> = inner.desired.read().await.clone();
    let current: HashSet<String> = inner.active.read().await.keys().cloned().collect();

    // Add subscriptions for newly desired dialogs.
    for dialog_id in desired.difference(&current) {
        let subject = format!("chat.{dialog_id}.message");
        match client.subscribe(subject.clone()).await {
            Ok(subscriber) => {
                let inner_for_task = inner.clone();
                let dialog_id_for_task = dialog_id.clone();
                let handle = async_runtime::spawn(async move {
                    run_subscription_router(inner_for_task, dialog_id_for_task, subscriber).await;
                });
                inner.active.write().await.insert(dialog_id.clone(), handle);
                tracing::info!("[NATS] subscribed to {subject}");
            }
            Err(err) => {
                tracing::warn!("[NATS] subscribe to {subject} failed: {err}");
            }
        }
    }

    // Remove subscriptions for dialogs no longer desired.
    let to_remove: Vec<String> = current.difference(&desired).cloned().collect();
    if !to_remove.is_empty() {
        let mut active = inner.active.write().await;
        for dialog_id in to_remove {
            if let Some(handle) = active.remove(&dialog_id) {
                handle.abort();
                tracing::info!("[NATS] unsubscribed from chat.{dialog_id}.message");
            }
        }
    }
}

/// Per-subscription router task. Reads messages off the Subscriber stream,
/// parses JSON payloads, and broadcasts them on every registered channel.
async fn run_subscription_router(
    inner: Arc<Inner>,
    dialog_id: String,
    mut subscriber: async_nats::Subscriber,
) {
    while let Some(message) = subscriber.next().await {
        let payload: serde_json::Value = match serde_json::from_slice(&message.payload) {
            Ok(v) => v,
            Err(err) => {
                tracing::warn!(
                    "[NATS] dropping non-JSON payload on {subject}: {err}",
                    subject = message.subject
                );
                continue;
            }
        };

        let event = NatsEvent {
            dialog_id: dialog_id.clone(),
            payload: payload.clone(),
        };

        // Snapshot the channel list under the read lock, then send outside
        // the lock so a slow consumer can't block the router.
        let channels: Vec<Channel<NatsEvent>> = inner
            .event_channels
            .read()
            .await
            .values()
            .cloned()
            .collect();
        for channel in channels {
            if let Err(err) = channel.send(event.clone()) {
                tracing::warn!("[NATS] channel.send failed: {err}");
            }
        }

        // OS notifications are independent of the WebView consumers — fire
        // them whenever a notification-worthy chunk arrives and the user
        // can't currently see the message.
        maybe_notify(&inner, &dialog_id, &payload);
    }
    tracing::info!(
        "[NATS] router task for chat.{dialog_id}.message exited (stream closed)"
    );
}

/// Examine an incoming chunk payload and, if it represents a
/// notification-worthy event AND the main window can't show it to the
/// user right now, fire an OS notification.
///
/// Discriminator shape mirrors `chunk-parser.ts`:
///   `DIRECT_MESSAGE` — `{ type, text, ownerType, displayName }`
///   `DIALOG_CLOSED`  — `{ type }`
///
/// Echoes from the user themselves carry `ownerType == "CLIENT"`; we skip
/// those.
fn maybe_notify(inner: &Arc<Inner>, dialog_id: &str, payload: &serde_json::Value) {
    let app = &inner.app;
    let kind = payload.get("type").and_then(|v| v.as_str()).unwrap_or("");
    let (title, body) = match kind {
        "DIRECT_MESSAGE" => {
            let owner_type = payload
                .get("ownerType")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            if owner_type == "CLIENT" {
                return;
            }
            let display_name = payload
                .get("displayName")
                .and_then(|v| v.as_str())
                .unwrap_or("Technician");
            let text = payload
                .get("text")
                .and_then(|v| v.as_str())
                .unwrap_or("");
            let body = truncate_for_notification(text, 140);
            (format!("New message from {display_name}"), body)
        }
        "DIALOG_CLOSED" => {
            ("Dialog closed".to_string(), "A technician closed the conversation.".to_string())
        }
        _ => return,
    };

    if !should_notify(app) {
        tracing::debug!(
            "[NATS] skipping notification for {kind} (window visible+focused)"
        );
        return;
    }

    // Stash before firing so the focus handler picks up the right dialog
    // even if `show()` is delayed by the worker thread.
    if let Ok(mut guard) = inner.pending_notification.lock() {
        *guard = Some(PendingNotification {
            dialog_id: dialog_id.to_string(),
            fired_at: Instant::now(),
        });
    }

    let app = app.clone();
    let dialog_id = dialog_id.to_string();
    // Notification.show() blocks; punt to a worker thread so the router
    // task isn't held up.
    std::thread::spawn(move || {
        match app
            .notification()
            .builder()
            .title(&title)
            .body(&body)
            .show()
        {
            Ok(()) => {
                tracing::info!("[NATS] notification fired for dialog {dialog_id}");
            }
            Err(err) => {
                tracing::warn!("[NATS] notification show failed: {err}");
            }
        }
    });
}

/// Notify only when the user can't already see the message — i.e. the
/// main window is hidden or unfocused.
fn should_notify(app: &AppHandle) -> bool {
    let main = match app.get_webview_window("main") {
        Some(w) => w,
        None => return false,
    };
    let visible = main.is_visible().unwrap_or(false);
    let focused = main.is_focused().unwrap_or(false);
    !(visible && focused)
}

fn truncate_for_notification(text: &str, max: usize) -> String {
    if text.chars().count() <= max {
        return text.to_string();
    }
    let mut out: String = text.chars().take(max.saturating_sub(1)).collect();
    out.push('…');
    out
}

async fn emit_status(app: &AppHandle, inner: &Inner) {
    let payload = NatsStatus {
        state: *inner.state.read().await,
        reconnect_count: inner.reconnect_count.load(Ordering::Relaxed),
    };
    let _ = app.emit("nats:status", payload);
}

fn build_connect_url(server_url: &str, token: &str) -> String {
    // server_url is the API base, e.g. https://api.example.com
    let host = server_url
        .trim_start_matches("https://")
        .trim_start_matches("http://")
        .trim_end_matches('/');
    format!("wss://{host}{NATS_WS_PATH}?authorization={token}")
}

/// Called by async-nats whenever it needs a connection URL — both on
/// initial connect and on every reconnect attempt. We don't run our own
/// OAuth refresh; the openframe-client daemon polls + rotates the token
/// file every ~5s, our `TokenWatcher` re-decrypts on the next tick, and
/// async-nats' own 5s reconnect delay gives a fresh token a chance to
/// arrive between attempts. Worst-case recovery window is ~10s.
async fn wait_for_fresh_url(
    server_url: String,
    token_state: TokenState,
) -> Result<String, async_nats::AuthError> {
    let token = token_state
        .current_token
        .lock()
        .ok()
        .and_then(|g| g.clone());

    match token {
        Some(t) => Ok(build_connect_url(&server_url, &t)),
        None => Err(async_nats::AuthError::new(
            "no token available for NATS reconnect",
        )),
    }
}
