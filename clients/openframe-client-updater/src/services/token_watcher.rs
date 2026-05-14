use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tracing::{error, info};

use crate::services::encryption_service::EncryptionService;

pub struct TokenWatcher;

impl TokenWatcher {
    /// Starts a background task that polls `shared_token.enc` every 5 seconds.
    /// Returns a shared handle to the current decrypted token.
    pub fn start(token_file_path: PathBuf) -> Arc<RwLock<Option<String>>> {
        let encryption_service = EncryptionService::new();
        let current_token: Arc<RwLock<Option<String>>> = Arc::new(RwLock::new(None));
        let token_ref = current_token.clone();

        tokio::spawn(async move {
            loop {
                let new_token = Self::read_and_decrypt(&token_file_path, &encryption_service);

                let current = token_ref.read().await.clone();
                if current != new_token {
                    match (&current, &new_token) {
                        (None, Some(_)) => info!("Shared token received"),
                        (Some(_), Some(_)) => info!("Shared token updated"),
                        _ => {}
                    }
                    *token_ref.write().await = new_token;
                }

                tokio::time::sleep(Duration::from_secs(5)).await;
            }
        });

        current_token
    }

    fn read_and_decrypt(path: &PathBuf, encryption_service: &EncryptionService) -> Option<String> {
        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => return None,
        };

        let trimmed = content.trim();
        if trimmed.is_empty() {
            return None;
        }

        match encryption_service.decrypt(trimmed) {
            Ok(token) => Some(token),
            Err(e) => {
                error!("Failed to decrypt shared token: {}", e);
                None
            }
        }
    }
}
