// NATS bridge — owns the user-scoped NATS WebSocket connection on behalf of
// the WebView. Two responsibilities:
//   1. A core NATS subscription on `machine.<machineId>.notification` for OS
//      notifications (`notifications`). Always on; subject is determined by
//      the machineId provided by the openframe-agent daemon config.
//   2. On-demand JetStream OrderedConsumers on `chat.<dialogId>.message` for
//      chat streaming (`dialogs`). Created when the WebView calls
//      `nats_subscribe_dialog` after the user opens a ticket; torn down on
//      `nats_unsubscribe_dialog`.
//
// `connection` owns the connect/reconnect/auth lifecycle. Resume on WS
// reconnect is owned entirely by the bridge: each DialogState tracks
// `last_delivered_stream_seq` so a new OrderedConsumer can resume from the
// right point without any ack from the WebView.

mod connection;
mod dialogs;
mod notifications;

pub(crate) use connection::mask_token;

use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex as StdMutex};

use async_nats::Client;
use serde::Serialize;
use tauri::async_runtime::{self, JoinHandle};
use tauri::ipc::Channel;
use tauri::AppHandle;
use tokio::sync::RwLock;

use crate::token_watcher::TokenSource;
use crate::ServerUrlState;

use dialogs::DialogState;
use notifications::PendingNotification;

#[derive(Clone, Copy, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ConnectionState {
    Connecting,
    Connected,
    Disconnected,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NatsStatus {
    pub state: ConnectionState,
    pub reconnect_count: u32,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NatsEvent {
    pub dialog_id: String,
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
    /// Consecutive `auth_url_callback` invocations without a Connected in
    /// between. The forked connector resets its own attempt counter after a
    /// successful callback, so on a persistently rejected token its backoff
    /// never engages — we back off here instead.
    auth_failures: AtomicU32,
    /// Gate for OS notification dispatch, driven by the frontend's
    /// `notifications` feature flag via `nats_set_notifications_enabled`.
    /// Off until the WebView pushes the loaded flag value.
    notifications_enabled: AtomicBool,
    server_url: ServerUrlState,
    token_source: TokenSource,
    app: AppHandle,

    /// machineId for the notification subject. Provided by the
    /// openframe-agent daemon via preferences/CLI args (like the token path
    /// and secret); fixed for the process lifetime.
    machine_id: Option<String>,
    /// Router task for `machine.<id>.notification`. async-nats re-issues
    /// SUB frames after reconnect, so the same task survives WS drops.
    /// Re-created only when machineId changes.
    notification_task: RwLock<Option<JoinHandle<()>>>,

    /// JetStream OrderedConsumers per open dialog. Created on
    /// `subscribe_dialog`, recreated on every `Connected` (consumers are
    /// ephemeral and die with the connection).
    dialogs: RwLock<HashMap<String, DialogState>>,

    /// The current WebView's event channel. A new registration (page reload,
    /// HMR) replaces the previous one — `Channel::send` to a hidden-but-alive
    /// webview still succeeds, so stale channels can't be detected by send
    /// failures and must not accumulate.
    event_channel: RwLock<Option<Channel<NatsEvent>>>,
    /// Most recent notification's dialog id + when it was fired. Consumed
    /// by the window-focus handler to emit `notification:click`.
    pending_notification: StdMutex<Option<PendingNotification>>,
}

impl NatsBridge {
    pub fn new(
        app: AppHandle,
        server_url: ServerUrlState,
        token_source: TokenSource,
        machine_id: Option<String>,
    ) -> Self {
        let machine_id = machine_id
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        if let Some(id) = &machine_id {
            tracing::info!("[NATS] machineId from config: {id}");
        } else {
            tracing::warn!("[NATS] no machineId in config — OS notifications disabled");
        }
        Self {
            inner: Arc::new(Inner {
                client: RwLock::new(None),
                state: RwLock::new(ConnectionState::Disconnected),
                reconnect_count: AtomicU32::new(0),
                had_connection: AtomicBool::new(false),
                started: AtomicBool::new(false),
                unread_count: AtomicU32::new(0),
                auth_failures: AtomicU32::new(0),
                notifications_enabled: AtomicBool::new(false),
                server_url,
                token_source,
                app,
                machine_id,
                notification_task: RwLock::new(None),
                dialogs: RwLock::new(HashMap::new()),
                event_channel: RwLock::new(None),
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

    pub async fn register_event_channel(&self, channel: Channel<NatsEvent>) {
        *self.inner.event_channel.write().await = Some(channel);
    }
}

async fn current_client(inner: &Inner) -> Option<Client> {
    inner.client.read().await.clone()
}
