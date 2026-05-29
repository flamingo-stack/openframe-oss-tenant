// NATS bridge — owns the user-scoped NATS WebSocket connection on behalf of
// the WebView. Two responsibilities:
//   1. A core NATS subscription on `machine.<machineId>.notification` for OS
//      notifications. Always on; subject is determined by machineId provided
//      via `OPENFRAME_MACHINE_ID` env var or `nats_set_machine_id` IPC.
//   2. On-demand JetStream OrderedConsumers on `chat.<dialogId>.message` for
//      chat streaming. Created when the WebView calls `nats_subscribe_dialog`
//      after the user opens a ticket; torn down on `nats_unsubscribe_dialog`.
//
// Resume on WS reconnect is owned entirely by the bridge: each DialogState
// tracks `last_delivered_stream_seq` so a new OrderedConsumer can resume from
// the right point without any ack from the WebView.

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex as StdMutex};
use std::time::{Duration, Instant};

use async_nats::jetstream::consumer::{pull::OrderedConfig, DeliverPolicy};
use async_nats::jetstream::{self, Message as JsMessage};
use async_nats::{Client, Event};
use futures::StreamExt;
use serde::Serialize;
use tauri::async_runtime::JoinHandle;
use tauri::ipc::Channel;
use tauri::{async_runtime, AppHandle, Emitter, Manager};
use tauri_plugin_notification::NotificationExt;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::token_watcher::TokenState;
use crate::ServerUrlState;

const NATS_USER: &str = "machine";
const NATS_PASS: &str = "";
const NATS_WS_PATH: &str = "/ws/nats-api";

const FAST_RETRIES: usize = 3;
const FAST_DELAY_MS: u64 = 200;
const BASE_DELAY_MS: u64 = 1_000;
const MAX_DELAY_MS: u64 = 30_000;
const PING_INTERVAL: Duration = Duration::from_secs(10);

const CHAT_CHUNKS_STREAM: &str = "CHAT_CHUNKS";

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

#[derive(Clone, Debug, Serialize)]
pub struct NatsEvent {
    #[serde(rename = "dialogId")]
    pub dialog_id: String,
    #[serde(rename = "streamSeq")]
    pub stream_seq: u64,
    pub payload: serde_json::Value,
}

#[derive(Clone)]
pub struct NatsBridge {
    inner: Arc<Inner>,
}

struct Inner {
    client: RwLock<Option<Client>>,
    state: RwLock<ConnectionState>,
    reconnect_count: AtomicU32,
    had_connection: AtomicBool,
    started: AtomicBool,
    unread_count: AtomicU32,
    server_url: ServerUrlState,
    token_state: TokenState,
    app: AppHandle,

    /// machineId for the notification subject. Seeded from
    /// `OPENFRAME_MACHINE_ID`; overridable via `nats_set_machine_id`.
    machine_id: RwLock<Option<String>>,
    /// Router task for `machine.<id>.notification`. async-nats re-issues
    /// SUB frames after reconnect, so the same task survives WS drops.
    /// Re-created only when machineId changes.
    notification_task: RwLock<Option<JoinHandle<()>>>,

    /// JetStream OrderedConsumers per open dialog. Created on
    /// `subscribe_dialog`, recreated on every `Connected` (consumers are
    /// ephemeral and die with the connection).
    dialogs: RwLock<HashMap<String, DialogState>>,

    event_channels: RwLock<HashMap<String, Channel<NatsEvent>>>,
    /// Most recent notification's dialog id + when it was fired. Consumed
    /// by the window-focus handler to emit `notification:click`.
    pending_notification: StdMutex<Option<PendingNotification>>,
}

struct DialogState {
    /// Initial replay point supplied by the WebView (e.g. from history fetch).
    /// Only consulted when computing the resume seq on (re)subscribe.
    initial_opt_start_seq: Option<u64>,
    /// Highest stream_sequence we've handed to the channel. On reconnect,
    /// the new consumer resumes from `max(initial, last_delivered) + 1`.
    last_delivered_stream_seq: Option<u64>,
    /// Router task. Aborting drops the OrderedConsumer stream.
    task: JoinHandle<()>,
}

#[derive(Clone, Debug)]
struct PendingNotification {
    dialog_id: String,
    fired_at: Instant,
}

impl NatsBridge {
    pub fn new(app: AppHandle, server_url: ServerUrlState, token_state: TokenState) -> Self {
        let env_machine_id = std::env::var("OPENFRAME_MACHINE_ID")
            .ok()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        if let Some(id) = &env_machine_id {
            tracing::info!("[NATS] machineId seeded from OPENFRAME_MACHINE_ID: {id}");
        }
        Self {
            inner: Arc::new(Inner {
                client: RwLock::new(None),
                state: RwLock::new(ConnectionState::Disconnected),
                reconnect_count: AtomicU32::new(0),
                had_connection: AtomicBool::new(false),
                started: AtomicBool::new(false),
                unread_count: AtomicU32::new(0),
                server_url,
                token_state,
                app,
                machine_id: RwLock::new(env_machine_id),
                notification_task: RwLock::new(None),
                dialogs: RwLock::new(HashMap::new()),
                event_channels: RwLock::new(HashMap::new()),
                pending_notification: StdMutex::new(None),
            }),
        }
    }

    /// Spawn the connect task. Idempotent: subsequent calls are no-ops.
    pub fn start(&self) {
        if self
            .inner
            .started
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Relaxed)
            .is_err()
        {
            return;
        }
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

    pub fn unread_count(&self) -> u32 {
        self.inner.unread_count.load(Ordering::Relaxed)
    }

    /// Override the env-seeded machineId. Aborts any existing notification
    /// subscription and lets `ensure_notification_subscription` recreate it
    /// on the new subject.
    pub async fn set_machine_id(&self, id: String) {
        let trimmed = id.trim();
        if trimmed.is_empty() {
            return;
        }
        let new_id = trimmed.to_string();
        let prev_task = {
            let mut guard = self.inner.machine_id.write().await;
            if guard.as_deref() == Some(trimmed) {
                return;
            }
            *guard = Some(new_id);
            self.inner.notification_task.write().await.take()
        };
        if let Some(handle) = prev_task {
            handle.abort();
        }
        ensure_notification_subscription(&self.inner).await;
    }

    /// Subscribe to `chat.<dialog_id>.message` via JetStream. Idempotent: if
    /// already subscribed, updates the initial replay seq for the next
    /// recreation (e.g. after reconnect) but does not tear down the live
    /// consumer.
    pub async fn subscribe_dialog(&self, dialog_id: String, opt_start_seq: Option<u64>) {
        if dialog_id.is_empty() {
            return;
        }
        {
            let mut dialogs = self.inner.dialogs.write().await;
            if let Some(state) = dialogs.get_mut(&dialog_id) {
                state.initial_opt_start_seq = opt_start_seq;
                return;
            }
        }
        let client = self.inner.client.read().await.clone();
        match client {
            Some(c) => create_and_store_consumer(&self.inner, c, dialog_id, opt_start_seq, None).await,
            None => {
                // Connection not up — stash a placeholder; the next `Connected`
                // event will spin up the real consumer via resubscribe_all_dialogs.
                self.inner.dialogs.write().await.insert(
                    dialog_id,
                    DialogState {
                        initial_opt_start_seq: opt_start_seq,
                        last_delivered_stream_seq: None,
                        task: async_runtime::spawn(async {}),
                    },
                );
            }
        }
    }

    pub async fn unsubscribe_dialog(&self, dialog_id: &str) {
        let removed = self.inner.dialogs.write().await.remove(dialog_id);
        if let Some(state) = removed {
            state.task.abort();
            tracing::info!("[NATS] unsubscribed JetStream consumer for chat.{dialog_id}.message");
        }
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

    /// Called from the main-window focus handler. Clears unread state and,
    /// if a notification was fired in the last `MAX_PENDING_AGE` seconds,
    /// emits `notification:click` so the WebView can navigate.
    pub fn on_main_window_focused(&self) {
        const MAX_PENDING_AGE: Duration = Duration::from_secs(30);

        if self.inner.unread_count.swap(0, Ordering::Relaxed) > 0 {
            set_unread_surfaces(&self.inner, 0);
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
        let inner = &self.inner;

        loop {
            if read_server_url(inner).is_some() && read_token(inner).is_some() {
                break;
            }
            set_state(inner, ConnectionState::Connecting).await;
            tokio::time::sleep(Duration::from_secs(5)).await;
        }

        set_state(inner, ConnectionState::Connecting).await;

        let server_url = read_server_url(inner).expect("server url present");
        let connect_url = build_connect_url(&server_url, &read_token(inner).unwrap_or_default());

        let event_inner = inner.clone();
        let auth_token_state = inner.token_state.clone();
        let auth_server_url = server_url.clone();

        let connect_options = async_nats::ConnectOptions::new()
            .name("openframe-chat")
            .user_and_password(NATS_USER.to_string(), NATS_PASS.to_string())
            .retry_on_initial_connect()
            .reconnect_delay_callback(reconnect_delay)
            .ping_interval(PING_INTERVAL)
            .event_callback(move |event| {
                let inner = event_inner.clone();
                async move {
                    handle_nats_event(event, &inner).await;
                }
            })
            .auth_url_callback(move |()| {
                let token = auth_token_state
                    .current_token
                    .lock()
                    .ok()
                    .and_then(|g| g.clone());
                let server_url = auth_server_url.clone();
                async move {
                    match token {
                        Some(t) => Ok(build_connect_url(&server_url, &t)),
                        None => Err(async_nats::AuthError::new(
                            "no token available for NATS reconnect",
                        )),
                    }
                }
            });

        match connect_options.connect(&connect_url).await {
            Ok(client) => {
                *inner.client.write().await = Some(client);
                tracing::info!("[NATS] connect() returned Ok");
            }
            Err(err) => {
                tracing::error!("[NATS] connect() failed unrecoverably: {err}");
                set_state(inner, ConnectionState::Disconnected).await;
            }
        }
    }
}

fn read_server_url(inner: &Inner) -> Option<String> {
    inner.server_url.url.lock().ok().and_then(|g| g.clone())
}

fn read_token(inner: &Inner) -> Option<String> {
    inner
        .token_state
        .current_token
        .lock()
        .ok()
        .and_then(|g| g.clone())
}

async fn set_state(inner: &Inner, new_state: ConnectionState) {
    let mut state = inner.state.write().await;
    if *state == new_state {
        return;
    }
    *state = new_state;
    let payload = NatsStatus {
        state: new_state,
        reconnect_count: inner.reconnect_count.load(Ordering::Relaxed),
    };
    let _ = inner.app.emit("nats:status", payload);
}

async fn handle_nats_event(event: Event, inner: &Arc<Inner>) {
    tracing::info!("[NATS] event: {:?}", event);
    match event {
        Event::Connected => {
            let was_connected_before = inner.had_connection.swap(true, Ordering::Relaxed);
            if was_connected_before {
                inner.reconnect_count.fetch_add(1, Ordering::Relaxed);
            }
            set_state(inner, ConnectionState::Connected).await;
            if was_connected_before {
                let _ = inner.app.emit("nats:reconnected", ());
            }
            let inner_for_spawn = inner.clone();
            async_runtime::spawn(async move {
                ensure_notification_subscription(&inner_for_spawn).await;
                resubscribe_all_dialogs(&inner_for_spawn).await;
            });
        }
        Event::Disconnected => {
            set_state(inner, ConnectionState::Disconnected).await;
        }
        _ => {}
    }
}

// ---------------------------- notification subject ----------------------------

async fn ensure_notification_subscription(inner: &Arc<Inner>) {
    let machine_id = match inner.machine_id.read().await.clone() {
        Some(id) => id,
        None => return,
    };
    let client = match inner.client.read().await.clone() {
        Some(c) => c,
        None => return,
    };

    {
        let task_guard = inner.notification_task.read().await;
        if task_guard.is_some() {
            // Already subscribed — async-nats re-issues SUB on reconnect, so
            // the existing router task continues to receive messages.
            return;
        }
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
    *inner.notification_task.write().await = Some(handle);
    tracing::info!("[NATS] subscribed to {subject}");
}

async fn notification_router(inner: Arc<Inner>, mut subscriber: async_nats::Subscriber) {
    while let Some(message) = subscriber.next().await {
        let payload: serde_json::Value = match serde_json::from_slice(&message.payload) {
            Ok(v) => v,
            Err(err) => {
                tracing::warn!("[NATS] dropping non-JSON notification: {err}");
                continue;
            }
        };
        let dialog_id = payload
            .get("dialogId")
            .or_else(|| payload.get("dialog_id"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        maybe_notify(&inner, &dialog_id, &payload);
    }
    tracing::info!("[NATS] notification router exited (stream closed)");
}

// ---------------------------- JetStream dialog consumers ----------------------------

async fn create_and_store_consumer(
    inner: &Arc<Inner>,
    client: Client,
    dialog_id: String,
    initial_opt_start_seq: Option<u64>,
    existing_last_delivered: Option<u64>,
) {
    let js = jetstream::new(client);
    let stream = match js.get_stream(CHAT_CHUNKS_STREAM).await {
        Ok(s) => s,
        Err(err) => {
            tracing::warn!(
                "[NATS] get_stream({CHAT_CHUNKS_STREAM}) failed for chat.{dialog_id}: {err}"
            );
            return;
        }
    };

    let start_seq = compute_start_seq(initial_opt_start_seq, existing_last_delivered);
    let deliver_policy = match start_seq {
        Some(s) => DeliverPolicy::ByStartSequence { start_sequence: s },
        None => DeliverPolicy::New,
    };

    let filter_subject = format!("chat.{}.message", dialog_id);
    let config = OrderedConfig {
        filter_subject: filter_subject.clone(),
        deliver_policy,
        ..Default::default()
    };

    let consumer = match stream.create_consumer(config).await {
        Ok(c) => c,
        Err(err) => {
            tracing::warn!("[NATS] create_consumer failed for {filter_subject}: {err}");
            return;
        }
    };

    let messages = match consumer.messages().await {
        Ok(m) => m,
        Err(err) => {
            tracing::warn!("[NATS] consumer.messages() failed for {filter_subject}: {err}");
            return;
        }
    };

    let inner_for_task = inner.clone();
    let dialog_id_for_task = dialog_id.clone();
    let handle = async_runtime::spawn(async move {
        dialog_router(inner_for_task, dialog_id_for_task, messages).await;
    });

    inner.dialogs.write().await.insert(
        dialog_id.clone(),
        DialogState {
            initial_opt_start_seq,
            last_delivered_stream_seq: existing_last_delivered,
            task: handle,
        },
    );

    let _ = inner
        .app
        .emit("nats:subscribed", serde_json::json!({ "dialogId": dialog_id }));
    tracing::info!(
        "[NATS] subscribed JetStream consumer for {filter_subject} (start_seq={:?})",
        start_seq
    );
}

fn compute_start_seq(opt_start_seq: Option<u64>, last_delivered: Option<u64>) -> Option<u64> {
    match (opt_start_seq, last_delivered) {
        (Some(a), Some(b)) => Some(a.max(b) + 1),
        (Some(a), None) => Some(a + 1),
        (None, Some(b)) => Some(b + 1),
        (None, None) => None,
    }
}

async fn dialog_router<S, E>(inner: Arc<Inner>, dialog_id: String, mut messages: S)
where
    S: futures::Stream<Item = Result<JsMessage, E>> + Unpin,
    E: std::fmt::Display,
{
    while let Some(item) = messages.next().await {
        let msg = match item {
            Ok(m) => m,
            Err(err) => {
                tracing::warn!("[NATS] JetStream stream error on chat.{dialog_id}: {err}");
                break;
            }
        };
        let stream_seq = match msg.info() {
            Ok(info) => info.stream_sequence,
            Err(err) => {
                tracing::warn!("[NATS] missing stream info on chat.{dialog_id}: {err}");
                continue;
            }
        };
        let payload: serde_json::Value = match serde_json::from_slice(&msg.payload) {
            Ok(v) => v,
            Err(err) => {
                tracing::warn!("[NATS] non-JSON chunk on chat.{dialog_id}: {err}");
                continue;
            }
        };

        // Track delivered seq under lock; skip duplicates.
        {
            let mut dialogs = inner.dialogs.write().await;
            let state = match dialogs.get_mut(&dialog_id) {
                Some(s) => s,
                None => break, // unsubscribed mid-stream
            };
            if let Some(prev) = state.last_delivered_stream_seq {
                if prev >= stream_seq {
                    continue;
                }
            }
            state.last_delivered_stream_seq = Some(stream_seq);
        }

        let event = NatsEvent {
            dialog_id: dialog_id.clone(),
            stream_seq,
            payload,
        };

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
    }
    tracing::info!("[NATS] dialog router for chat.{dialog_id}.message exited");
}

async fn resubscribe_all_dialogs(inner: &Arc<Inner>) {
    let client = match inner.client.read().await.clone() {
        Some(c) => c,
        None => return,
    };
    let snapshot: Vec<(String, Option<u64>, Option<u64>)> = {
        let dialogs = inner.dialogs.read().await;
        dialogs
            .iter()
            .map(|(id, s)| (id.clone(), s.initial_opt_start_seq, s.last_delivered_stream_seq))
            .collect()
    };
    for (dialog_id, initial, last_delivered) in snapshot {
        // Abort the old router task (its message stream is dead post-reconnect).
        if let Some(state) = inner.dialogs.write().await.get_mut(&dialog_id) {
            state.task.abort();
        }
        create_and_store_consumer(inner, client.clone(), dialog_id, initial, last_delivered).await;
    }
}

// ---------------------------- notification dispatch ----------------------------

/// Discriminator shape mirrors `chunk-parser.ts`:
///   `DIRECT_MESSAGE` — `{ type, text, ownerType, displayName, dialogId }`
///   `DIALOG_CLOSED`  — `{ type, dialogId }`
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
            let text = payload.get("text").and_then(|v| v.as_str()).unwrap_or("");
            let body = truncate_for_notification(text, 140);
            (format!("New message from {display_name}"), body)
        }
        "DIALOG_CLOSED" => (
            "Dialog closed".to_string(),
            "A technician closed the conversation.".to_string(),
        ),
        _ => return,
    };

    if !should_notify(app) {
        tracing::debug!(
            "[NATS] skipping notification for {kind} (window visible+focused)"
        );
        return;
    }

    if let Ok(mut guard) = inner.pending_notification.lock() {
        *guard = Some(PendingNotification {
            dialog_id: dialog_id.to_string(),
            fired_at: Instant::now(),
        });
    }

    let n = inner.unread_count.fetch_add(1, Ordering::Relaxed) + 1;
    set_unread_surfaces(inner, n);

    let app = app.clone();
    let dialog_id = dialog_id.to_string();
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

fn should_notify(app: &AppHandle) -> bool {
    let main = match app.get_webview_window("main") {
        Some(w) => w,
        None => return false,
    };
    let visible = main.is_visible().unwrap_or(false);
    let focused = main.is_focused().unwrap_or(false);
    !(visible && focused)
}

fn set_unread_surfaces(inner: &Inner, count: u32) {
    if let Some(window) = inner.app.get_webview_window("main") {
        let badge = if count == 0 { None } else { Some(count as i64) };
        if let Err(err) = window.set_badge_count(badge) {
            tracing::debug!("[NATS] set_badge_count failed: {err}");
        }
    }
    let _ = inner.app.emit("unread:count", count);
}

fn truncate_for_notification(text: &str, max: usize) -> String {
    if text.chars().count() <= max {
        return text.to_string();
    }
    let mut out: String = text.chars().take(max.saturating_sub(1)).collect();
    out.push('…');
    out
}

/// `attempt` is 0-based: 0 = first reconnect attempt after a drop.
fn reconnect_delay(attempt: usize) -> Duration {
    let base_ms = if attempt < FAST_RETRIES {
        FAST_DELAY_MS
    } else {
        let n = (attempt - FAST_RETRIES).min(20) as u32;
        BASE_DELAY_MS
            .saturating_mul(2u64.saturating_pow(n))
            .min(MAX_DELAY_MS)
    };
    let jitter = 0.5 + rand::random::<f64>() * 0.5;
    Duration::from_millis((base_ms as f64 * jitter) as u64)
}

fn build_connect_url(server_url: &str, token: &str) -> String {
    let host = server_url
        .trim_start_matches("https://")
        .trim_start_matches("http://")
        .trim_end_matches('/');
    format!("wss://{host}{NATS_WS_PATH}?authorization={token}")
}
