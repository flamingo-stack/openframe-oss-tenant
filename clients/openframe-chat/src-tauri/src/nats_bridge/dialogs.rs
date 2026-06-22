// JetStream chat-chunk consumers: one OrderedConsumer per open dialog on
// `chat.<dialogId>.message`, with resume-on-reconnect and failure-driven
// recreation. The router fans chunks out to the WebView's event channel.

use std::sync::Arc;
use std::time::Duration;

use async_nats::jetstream::consumer::{pull::OrderedConfig, DeliverPolicy};
use async_nats::jetstream::{self, Message as JsMessage};
use async_nats::Client;
use futures::StreamExt;
use tauri::async_runtime::{self, JoinHandle};
use tauri::Emitter;
use uuid::Uuid;

use super::connection::backoff_ms;
use super::{current_client, Inner, NatsBridge, NatsEvent};

const CHAT_CHUNKS_STREAM: &str = "CHAT_CHUNKS";

pub(super) struct DialogState {
    /// Initial replay point supplied by the WebView (e.g. from history fetch).
    /// Only consulted when computing the resume seq on (re)subscribe.
    initial_opt_start_seq: Option<u64>,
    /// Highest stream_sequence we've handed to the channel. On reconnect,
    /// the new consumer resumes from `max(initial, last_delivered) + 1`.
    last_delivered_stream_seq: Option<u64>,
    /// Router task. Aborting drops the OrderedConsumer stream. `None` while
    /// no live consumer exists (pre-connect, creation failed, or the router
    /// exited on a stream error and is awaiting recreation).
    task: Option<JoinHandle<()>>,
    /// Bumped each time `task` is replaced. The router compares it on exit so
    /// only the *current* router clears `task` (a replaced one must not).
    generation: u64,
}

impl NatsBridge {
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
                // A reloaded WebView re-subscribes while the consumer is still
                // live; re-confirm so its subscription wait doesn't time out.
                // task: None falls through and retries creation.
                if state.task.is_some() {
                    emit_subscribed(&self.inner, &dialog_id);
                    return;
                }
            } else {
                // Record intent before attempting creation so a failure
                // (offline, JetStream request timeout) is retried later
                // instead of losing the dialog.
                dialogs.insert(
                    dialog_id.clone(),
                    DialogState {
                        initial_opt_start_seq: opt_start_seq,
                        last_delivered_stream_seq: None,
                        task: None,
                        generation: 0,
                    },
                );
            }
        }
        if !recreate_dialog_consumer(&self.inner, &dialog_id).await {
            schedule_consumer_recreate(self.inner.clone(), dialog_id);
        }
    }

    pub async fn unsubscribe_dialog(&self, dialog_id: &str) {
        let removed = self.inner.dialogs.write().await.remove(dialog_id);
        if let Some(state) = removed {
            if let Some(task) = state.task {
                task.abort();
            }
            tracing::info!("[NATS] unsubscribed JetStream consumer for chat.{dialog_id}.message");
        }
    }
}

/// Returns false when consumer creation failed and a retry may help.
async fn create_and_store_consumer(
    inner: &Arc<Inner>,
    client: Client,
    dialog_id: String,
    initial_opt_start_seq: Option<u64>,
    existing_last_delivered: Option<u64>,
) -> bool {
    let js = jetstream::new(client);
    let stream = match js.get_stream(CHAT_CHUNKS_STREAM).await {
        Ok(s) => s,
        Err(err) => {
            tracing::warn!(
                "[NATS] get_stream({CHAT_CHUNKS_STREAM}) failed for chat.{dialog_id}: {err}"
            );
            return false;
        }
    };

    let start_seq = compute_start_seq(initial_opt_start_seq, existing_last_delivered);
    // Live-tail subscriptions get a concrete floor instead of
    // DeliverPolicy::New: New forgets its position, so a consumer recreated
    // after a reconnect skips everything published during the gap (e.g. the
    // whole assistant response if the WS dropped right after sending). The
    // stream tail comes fresh from the get_stream above. `tail_floor` is also
    // persisted below as the dialog's resume point.
    let (start_seq, tail_floor) = match start_seq {
        Some(s) => (s, None),
        None => {
            let tail = stream.cached_info().state.last_sequence;
            (tail + 1, Some(tail))
        }
    };
    let deliver_policy = DeliverPolicy::ByStartSequence { start_sequence: start_seq };

    let filter_subject = format!("chat.{}.message", dialog_id);
    // A consumer name makes async-nats publish CONSUMER.CREATE to the named
    // subject `$JS.API.CONSUMER.CREATE.CHAT_CHUNKS.<name>.<filter>` instead of
    // the bare `$JS.API.CONSUMER.CREATE.CHAT_CHUNKS`. The NATS `machine` user is
    // authorized via `$JS.API.CONSUMER.CREATE.CHAT_CHUNKS.>`, which matches the
    // named form only (a trailing `>` requires ≥1 token). Unique per create so
    // a stale ephemeral consumer from a prior subscribe never collides.
    let consumer_name = format!("chat-{}", Uuid::new_v4().simple());
    let config = OrderedConfig {
        name: Some(consumer_name),
        filter_subject: filter_subject.clone(),
        deliver_policy,
        ..Default::default()
    };

    let consumer = match stream.create_consumer(config).await {
        Ok(c) => c,
        Err(err) => {
            tracing::warn!("[NATS] create_consumer failed for {filter_subject}: {err}");
            return false;
        }
    };

    let messages = match consumer.messages().await {
        Ok(m) => m,
        Err(err) => {
            tracing::warn!("[NATS] consumer.messages() failed for {filter_subject}: {err}");
            return false;
        }
    };

    // Re-check under the lock: the awaits above can interleave with an
    // unsubscribe (don't resurrect the dialog) or a concurrent create for the
    // same id (abort the task being replaced instead of leaking it). Spawning
    // is synchronous, so doing it under the lock means the router has its
    // final generation before it can possibly observe its own exit.
    {
        let mut dialogs = inner.dialogs.write().await;
        match dialogs.get_mut(&dialog_id) {
            Some(state) => {
                // Persist the live-tail floor so a post-reconnect resubscribe
                // resumes from it (replaying the gap) instead of starting New
                // again. Skip if a router already advanced past it.
                if let Some(tail) = tail_floor {
                    if state.last_delivered_stream_seq.is_none() {
                        state.last_delivered_stream_seq = Some(tail);
                    }
                }
                if let Some(old) = state.task.take() {
                    old.abort();
                }
                state.generation += 1;
                let generation = state.generation;
                let inner_for_task = inner.clone();
                let dialog_id_for_task = dialog_id.clone();
                let handle = async_runtime::spawn(async move {
                    dialog_router(inner_for_task, dialog_id_for_task, messages, generation).await;
                });
                state.task = Some(handle);
            }
            None => {
                tracing::info!(
                    "[NATS] dialog {dialog_id} unsubscribed during consumer creation — dropping"
                );
                return true;
            }
        }
    }

    emit_subscribed(inner, &dialog_id);
    tracing::info!(
        "[NATS] subscribed JetStream consumer for {filter_subject} (start_seq={:?})",
        start_seq
    );
    true
}

fn emit_subscribed(inner: &Inner, dialog_id: &str) {
    let _ = inner
        .app
        .emit_to("main", "nats:subscribed", serde_json::json!({ "dialogId": dialog_id }));
}

fn compute_start_seq(opt_start_seq: Option<u64>, last_delivered: Option<u64>) -> Option<u64> {
    match (opt_start_seq, last_delivered) {
        (Some(a), Some(b)) => Some(a.max(b) + 1),
        (Some(a), None) => Some(a + 1),
        (None, Some(b)) => Some(b + 1),
        (None, None) => None,
    }
}

async fn dialog_router<S, E>(inner: Arc<Inner>, dialog_id: String, mut messages: S, generation: u64)
where
    S: futures::Stream<Item = Result<JsMessage, E>> + Unpin,
    E: std::fmt::Display,
{
    let mut delivered: u64 = 0;
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

        // Snapshot the channel before taking the dedup lock — the read is
        // async, but the send below must stay synchronous (see next block).
        let channel = inner.event_channel.read().await.clone();

        // Dedup + send atomically under the dialogs lock: the seq that wins the
        // lock is the seq that reaches the channel first. If the send happened
        // after releasing the lock, an old consumer task and a freshly
        // resubscribed one (which overlap briefly on reconnect) could win
        // adjacent seqs and then send out of order — the WebView's monotonic
        // streamSeq gate would drop the lower one, losing a chunk. `channel.send`
        // is synchronous, so holding the lock across it adds no await.
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

            delivered += 1;
            if delivered == 1 {
                tracing::info!(
                    "[NATS] first chunk delivered for chat.{dialog_id} (stream_seq={stream_seq})"
                );
            }

            let event = NatsEvent {
                dialog_id: dialog_id.clone(),
                stream_seq,
                payload,
            };
            match &channel {
                Some(channel) => {
                    if let Err(err) = channel.send(event) {
                        tracing::warn!("[NATS] channel.send failed: {err}");
                    }
                }
                None => {
                    tracing::warn!(
                        "[NATS] chunk for chat.{dialog_id} (stream_seq={stream_seq}) dropped — no event channel registered"
                    );
                }
            }
        }
    }
    // Clear `task` so its Some-ness keeps meaning "live consumer" — but only
    // if we're still the current router (a replacement must not be wiped).
    // An exit while still current (stream error or close) gets no Connected
    // event if the WS itself stayed healthy, so schedule the recreate here.
    let mut still_current = false;
    if let Some(state) = inner.dialogs.write().await.get_mut(&dialog_id) {
        if state.generation == generation {
            state.task = None;
            still_current = true;
        }
    }
    if still_current {
        schedule_consumer_recreate(inner.clone(), dialog_id.clone());
    }
    tracing::info!(
        "[NATS] dialog router for chat.{dialog_id}.message exited (delivered {delivered} chunks)"
    );
}

/// Snapshots the dialog's resume state and (re)creates its consumer. Returns
/// false when creation failed and a retry may help; returns true when retrying
/// is pointless — dialog unsubscribed, a live consumer already exists (e.g. a
/// Connected-driven resubscribe beat a lingering retry loop), or no client yet
/// (the next Connected event resubscribes anyway).
async fn recreate_dialog_consumer(inner: &Arc<Inner>, dialog_id: &str) -> bool {
    let snapshot = match inner.dialogs.read().await.get(dialog_id) {
        None => return true,
        Some(s) if s.task.is_some() => return true,
        Some(s) => (s.initial_opt_start_seq, s.last_delivered_stream_seq),
    };
    let (initial, last) = snapshot;
    let Some(client) = current_client(inner).await else { return true };
    create_and_store_consumer(inner, client, dialog_id.to_string(), initial, last).await
}

/// Retries consumer creation with backoff after a failure or a stream error,
/// since no Connected event will trigger a resubscribe while the WS itself
/// stays healthy. A plain fn spawning a type-erased future — an async fn here
/// would make the `dialog_router` ↔ `create_and_store_consumer` opaque future
/// types mutually recursive (E0391).
fn schedule_consumer_recreate(inner: Arc<Inner>, dialog_id: String) {
    const MAX_ATTEMPTS: u32 = 5;
    let fut: std::pin::Pin<Box<dyn std::future::Future<Output = ()> + Send>> =
        Box::pin(async move {
            for attempt in 1..=MAX_ATTEMPTS {
                tokio::time::sleep(Duration::from_millis(backoff_ms(attempt))).await;
                if recreate_dialog_consumer(&inner, &dialog_id).await {
                    return;
                }
            }
            tracing::error!(
                "[NATS] giving up on consumer for chat.{dialog_id} after {MAX_ATTEMPTS} attempts; \
                 the next reconnect or re-subscribe will retry"
            );
        });
    async_runtime::spawn(fut);
}

pub(super) async fn resubscribe_all_dialogs(inner: &Arc<Inner>) {
    let dialog_ids: Vec<String> = inner.dialogs.read().await.keys().cloned().collect();
    for dialog_id in dialog_ids {
        // Abort the old router task (its message stream is dead post-reconnect).
        if let Some(state) = inner.dialogs.write().await.get_mut(&dialog_id) {
            if let Some(task) = state.task.take() {
                task.abort();
            }
        }
        if !recreate_dialog_consumer(inner, &dialog_id).await {
            schedule_consumer_recreate(inner.clone(), dialog_id);
        }
    }
}
