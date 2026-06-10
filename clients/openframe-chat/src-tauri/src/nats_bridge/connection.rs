// Connect/reconnect lifecycle: credential wait, ConnectOptions (auth refresh
// callback with its own 401 backoff), connection events, and delay policy.

use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::time::Duration;

use async_nats::Event;
use percent_encoding::{utf8_percent_encode, AsciiSet, NON_ALPHANUMERIC};
use tauri::async_runtime;
use tauri::Emitter;

use super::dialogs::resubscribe_all_dialogs;
use super::notifications::ensure_notification_subscription;
use super::{ConnectionState, Inner, NatsBridge, NatsStatus};

const NATS_USER: &str = "machine";
const NATS_PASS: &str = "";
const NATS_WS_PATH: &str = "/ws/nats-api";

const FAST_RETRIES: usize = 3;
const FAST_DELAY_MS: u64 = 200;
const BASE_DELAY_MS: u64 = 1_000;
const MAX_DELAY_MS: u64 = 30_000;
const PING_INTERVAL: Duration = Duration::from_secs(10);

impl NatsBridge {
    pub(super) async fn run(&self) {
        let inner = &self.inner;

        loop {
            loop {
                let have_url = read_server_url(inner).is_some();
                let have_token = inner.token_source.read_fresh().is_some();
                if have_url && have_token {
                    break;
                }
                tracing::info!(
                    "[NATS] waiting for credentials before initial connect (server_url={have_url}, token={have_token})"
                );
                set_state(inner, ConnectionState::Connecting).await;
                tokio::time::sleep(Duration::from_secs(5)).await;
            }

            set_state(inner, ConnectionState::Connecting).await;

            let Some(server_url) = read_server_url(inner) else { continue };
            let token = inner.token_source.read_fresh().unwrap_or_default();
            let connect_url = build_connect_url(&server_url, &token);
            tracing::info!(
                "[NATS] initial connect: url={} token={}",
                mask_connect_url(&connect_url),
                mask_token(&token)
            );

            let event_inner = inner.clone();
            let auth_inner = inner.clone();

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
                    let inner = auth_inner.clone();
                    async move {
                        // Every invocation means the server rejected the
                        // previous token; from the second consecutive one on,
                        // back off so a revoked token doesn't re-dial with
                        // full TLS+WS handshakes every ~200ms forever.
                        let failures = inner.auth_failures.fetch_add(1, Ordering::Relaxed);
                        if failures > 0 {
                            let delay_ms = backoff_ms(failures);
                            tracing::warn!(
                                "[NATS] {failures} consecutive auth failures — delaying reconnect {delay_ms}ms"
                            );
                            tokio::time::sleep(Duration::from_millis(delay_ms)).await;
                        }
                        // Decrypt the file at the moment async-nats needs a
                        // token, so reconnect uses the freshest rotation with
                        // no poll lag.
                        match (inner.token_source.read_fresh(), read_server_url(&inner)) {
                            (Some(t), Some(url)) => {
                                tracing::info!(
                                    "[NATS] auth_url_callback: supplying token for (re)connect ({})",
                                    mask_token(&t)
                                );
                                Ok(build_connect_url(&url, &t))
                            }
                            _ => {
                                tracing::warn!(
                                    "[NATS] auth_url_callback: no token available for (re)connect"
                                );
                                Err(async_nats::AuthError::new(
                                    "no token available for NATS reconnect",
                                ))
                            }
                        }
                    }
                });

            match connect_options.connect(&connect_url).await {
                Ok(client) => {
                    *inner.client.write().await = Some(client);
                    tracing::info!(
                        "[NATS] connect() returned Ok (TCP/WS handshake done; awaiting Connected event)"
                    );
                    return;
                }
                Err(err) => {
                    // With retry_on_initial_connect this only happens for
                    // unrecoverable setup errors (e.g. URL parse) — but the
                    // URL can be corrected at runtime, so keep trying.
                    tracing::error!("[NATS] connect() failed: {err}; retrying in 10s");
                    set_state(inner, ConnectionState::Disconnected).await;
                    tokio::time::sleep(Duration::from_secs(10)).await;
                }
            }
        }
    }
}

fn read_server_url(inner: &Inner) -> Option<String> {
    inner.server_url.url.lock().ok().and_then(|g| g.clone())
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
    // emit_to: a broadcast `emit` reaches every event target, so a single JS
    // `listen` would receive the event once per target (duplicates).
    let _ = inner.app.emit_to("main", "nats:status", payload);
}

async fn handle_nats_event(event: Event, inner: &Arc<Inner>) {
    match event {
        Event::Connected => {
            tracing::info!("[NATS] connected");
            inner.auth_failures.store(0, Ordering::Relaxed);
            let was_connected_before = inner.had_connection.swap(true, Ordering::Relaxed);
            if was_connected_before {
                inner.reconnect_count.fetch_add(1, Ordering::Relaxed);
            }
            set_state(inner, ConnectionState::Connected).await;
            let inner_for_spawn = inner.clone();
            async_runtime::spawn(async move {
                // The initial Connected can race `run()` storing the client;
                // wait for it so the subscriptions below don't silently no-op.
                for _ in 0..50 {
                    if inner_for_spawn.client.read().await.is_some() {
                        break;
                    }
                    tokio::time::sleep(Duration::from_millis(100)).await;
                }
                ensure_notification_subscription(&inner_for_spawn).await;
                resubscribe_all_dialogs(&inner_for_spawn).await;
            });
        }
        Event::Disconnected => {
            tracing::info!("[NATS] disconnected");
            set_state(inner, ConnectionState::Disconnected).await;
        }
        other => {
            // ClientError/ServerError/etc. — the connector already logs the
            // underlying cause at warn/error.
            tracing::debug!("[NATS] event: {:?}", other);
        }
    }
}

/// Capped exponential backoff: BASE_DELAY_MS · 2^exp, at most MAX_DELAY_MS.
pub(super) fn backoff_ms(exp: u32) -> u64 {
    BASE_DELAY_MS
        .saturating_mul(2u64.saturating_pow(exp.min(20)))
        .min(MAX_DELAY_MS)
}

/// `attempt` is 1-based — the connector increments before invoking us, and
/// the returned delay precedes every dial including the first.
fn reconnect_delay(attempt: usize) -> Duration {
    let base_ms = if attempt <= FAST_RETRIES {
        FAST_DELAY_MS
    } else {
        backoff_ms((attempt - FAST_RETRIES - 1) as u32)
    };
    let jitter = 0.5 + rand::random::<f64>() * 0.5;
    Duration::from_millis((base_ms as f64 * jitter) as u64)
}

/// Everything except RFC 3986 unreserved characters gets percent-encoded —
/// a no-op for JWTs, and the same output the web client's URLSearchParams
/// produces for this query param.
const QUERY_VALUE: &AsciiSet = &NON_ALPHANUMERIC
    .remove(b'-')
    .remove(b'_')
    .remove(b'.')
    .remove(b'~');

fn build_connect_url(server_url: &str, token: &str) -> String {
    let (scheme, host) = match server_url.strip_prefix("http://") {
        Some(h) => ("ws", h),
        None => ("wss", server_url.strip_prefix("https://").unwrap_or(server_url)),
    };
    let host = host.trim_end_matches('/');
    let token = utf8_percent_encode(token, QUERY_VALUE);
    format!("{scheme}://{host}{NATS_WS_PATH}?authorization={token}")
}

pub(crate) fn mask_token(token: &str) -> String {
    let n = token.chars().count();
    if n <= 8 {
        return "****".to_string();
    }
    let first: String = token.chars().take(4).collect();
    let last: String = token.chars().skip(n - 4).collect();
    format!("{first}...{last} (len {n})")
}

/// Masks the `authorization=` query param so the connect URL can be logged
/// without leaking the bearer token.
fn mask_connect_url(url: &str) -> String {
    match url.split_once("authorization=") {
        Some((base, tok)) => format!("{base}authorization={}", mask_token(tok)),
        None => url.to_string(),
    }
}
