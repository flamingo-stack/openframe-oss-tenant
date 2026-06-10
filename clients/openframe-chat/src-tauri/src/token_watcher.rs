use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};
use crate::nats_bridge::mask_token;
use crate::token_decryption_service::TokenDecryptionService;
use tauri::{AppHandle, Emitter};
use serde::Serialize;

#[derive(Clone, Serialize)]
struct TokenUpdateEvent {
    token: String,
}

/// Shared, cheaply-cloneable access to the decrypted auth token.
///
/// Created empty and `enable`d once the daemon-written config is available, so
/// it survives main's late/recovery config path. All clones share the same
/// source, so enabling one (from `apply_config`) makes the token visible to
/// every holder (the NATS bridge, `get_token`, the watcher thread).
///
/// `read_fresh` decrypts the file on demand. Used on the NATS reconnect path
/// (`auth_url_callback`) and by `get_token` so a (re)connect or a frontend
/// refresh always sees the newest token the daemon has written, with zero
/// dependency on poll timing. `TokenWatcher` polls the same file and pushes
/// `token-update` events to the WebView when it rotates.
#[derive(Clone)]
pub struct TokenSource {
    inner: Arc<Mutex<Option<TokenSourceInner>>>,
}

struct TokenSourceInner {
    path: PathBuf,
    decryptor: TokenDecryptionService,
}

impl TokenSource {
    /// An empty source. `enable` it once the token path + secret are known.
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(None)),
        }
    }

    /// Sets the token file + decryptor. Returns `true` the first time, `false`
    /// if already enabled — callers use that as a once-guard (e.g. to start the
    /// watcher a single time across repeated `apply_config` calls).
    pub fn enable(&self, path: String, decryptor: TokenDecryptionService) -> bool {
        let mut inner = self.inner.lock().unwrap();
        if inner.is_some() {
            return false;
        }
        *inner = Some(TokenSourceInner {
            path: PathBuf::from(path),
            decryptor,
        });
        true
    }

    /// Reads + decrypts the token file now.
    pub fn read_fresh(&self) -> Option<String> {
        let guard = self.inner.lock().unwrap();
        let inner = guard.as_ref()?;
        read_and_decrypt(&inner.path, &inner.decryptor)
    }

    fn path(&self) -> Option<PathBuf> {
        self.inner.lock().unwrap().as_ref().map(|i| i.path.clone())
    }
}

fn read_and_decrypt(path: &Path, decryptor: &TokenDecryptionService) -> Option<String> {
    let content = fs::read_to_string(path).ok()?;
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return None;
    }
    match decryptor.decrypt(trimmed) {
        Ok(token) => Some(token),
        Err(e) => {
            log::error!("token watcher: failed to decrypt token: {}", e);
            None
        }
    }
}

/// Polls the token file for rotation and pushes `token-update` events to the
/// WebView. An mtime fast-path avoids re-decrypting an unchanged file.
pub struct TokenWatcher;

impl TokenWatcher {
    /// Spawns the watcher thread. No-op when the source is not enabled.
    pub fn start(source: TokenSource, app_handle: AppHandle) {
        let Some(path) = source.path() else {
            return;
        };

        std::thread::spawn(move || {
            let mut last_mtime: Option<SystemTime> = None;
            // Compare against the last token *emitted to the WebView*, not a
            // shared cache — `read_fresh` from the NATS auth callback or
            // `get_token` can read the file first, which would make a
            // cache-based comparison swallow the rotation event.
            let mut last_emitted: Option<String> = None;

            loop {
                let mtime = fs::metadata(&path).and_then(|m| m.modified()).ok();
                // Re-decrypt only when the file mtime moved (or stat failed).
                if mtime.is_none() || mtime != last_mtime {
                    last_mtime = mtime;

                    let new = source.read_fresh();
                    if new != last_emitted {
                        if let Some(token) = &new {
                            match last_emitted {
                                None => log::info!(
                                    "token watcher: first token received ({})",
                                    mask_token(token)
                                ),
                                Some(_) => log::info!(
                                    "token watcher: token refreshed ({})",
                                    mask_token(token)
                                ),
                            }
                            emit_token_to_frontend(&app_handle, token);
                        }
                        last_emitted = new;
                    }
                }

                std::thread::sleep(Duration::from_secs(1));
            }
        });
    }
}

fn emit_token_to_frontend(app_handle: &AppHandle, token: &str) {
    let event = TokenUpdateEvent {
        token: token.to_string(),
    };
    // emit_to: a broadcast `emit` reaches every event target, so a single JS
    // `listen` would receive the event once per target (duplicates).
    match app_handle.emit_to("main", "token-update", event) {
        Ok(_) => log::debug!("token watcher: token emitted to frontend"),
        Err(e) => log::error!("token watcher: failed to emit token-update event: {}", e),
    }
}
