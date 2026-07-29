use chrono::Utc;
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tracing::{error, info, warn};

use crate::clients::AuthClient;
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::services::encryption_service::EncryptionService;
use crate::utils::jwt;

/// How often the shared token file is polled.
const POLL_INTERVAL_SECS: u64 = 5;
/// Self-refresh when the current token expires within this margin and the
/// shared file has not produced a fresher one (openframe-client presumed dead).
const SELF_REFRESH_MARGIN_SECS: i64 = 120;
/// Minimum delay between self-refresh attempts.
const SELF_REFRESH_COOLDOWN_SECS: i64 = 60;

/// Supplies the updater with a valid access token.
///
/// Primary source: `shared_token.enc`, written and refreshed by openframe-client
/// (same consumer pattern as openframe-chat). Fallback: if the client stops
/// refreshing the file — crashed, uninstalled mid-flight, or wedged — the
/// provider authenticates on its own via OAuth2 client_credentials using the
/// credentials in `agent_config.json`. Self-obtained tokens are held in memory
/// only; the provider never writes `shared_token.enc` (the client owns it).
pub struct TokenProvider;

impl TokenProvider {
    /// Starts the background token provider and returns a shared handle to the current access token.
    ///
    /// The provider periodically checks the encrypted token file and obtains a token through
    /// OAuth2 client credentials when the available token is missing or nearing expiration.
    ///
    /// # Arguments
    ///
    /// * `token_file_path` - Path to the encrypted shared token file.
    /// * `auth_client` - Client used to obtain a token during self-refresh.
    /// * `config_service` - Service that supplies OAuth2 client credentials.
    ///
    /// # Returns
    ///
    /// A shared, asynchronously readable and writable handle containing the latest available token.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// let token = TokenProvider::start(token_file_path, auth_client, config_service);
    /// let current_token = token.read().await.clone();
    /// ```
    pub fn start(
        token_file_path: PathBuf,
        auth_client: AuthClient,
        config_service: AgentConfigurationService,
    ) -> Arc<RwLock<Option<String>>> {
        let encryption_service = EncryptionService::new();
        let current_token: Arc<RwLock<Option<String>>> = Arc::new(RwLock::new(None));
        let token_ref = current_token.clone();

        tokio::spawn(async move {
            let mut last_self_refresh_attempt: i64 = 0;

            loop {
                let file_token = Self::read_and_decrypt(&token_file_path, &encryption_service);
                let current = token_ref.read().await.clone();

                if let Some(adopted) = Self::pick_fresher(&current, file_token) {
                    match &current {
                        None => info!("Shared token received"),
                        Some(_) => info!("Shared token updated"),
                    }
                    *token_ref.write().await = Some(adopted);
                } else if Self::needs_self_refresh(&current) {
                    let now = Utc::now().timestamp();
                    if now - last_self_refresh_attempt >= SELF_REFRESH_COOLDOWN_SECS {
                        last_self_refresh_attempt = now;
                        match Self::self_refresh(&auth_client, &config_service).await {
                            Ok(token) => {
                                warn!(
                                    "Shared token stale and not refreshed by openframe-client — \
                                     obtained own token via client_credentials"
                                );
                                *token_ref.write().await = Some(token);
                            }
                            Err(e) => error!(
                                "Self token refresh failed (will retry in {}s): {:#}",
                                SELF_REFRESH_COOLDOWN_SECS, e
                            ),
                        }
                    }
                }

                tokio::time::sleep(Duration::from_secs(POLL_INTERVAL_SECS)).await;
            }
        });

        current_token
    }

    /// Selects a file token when it is newer than the current token.
    ///
    /// A file token is selected when no current token exists or when its JWT `exp`
    /// claim is later than the current token's. Identical or older tokens are
    /// ignored.
    ///
    /// # Examples
    ///
    /// ```
    /// let selected = pick_fresher(&None, Some("token".to_owned()));
    /// assert_eq!(selected, Some("token".to_owned()));
    /// ```
    fn pick_fresher(current: &Option<String>, file_token: Option<String>) -> Option<String> {
        let file_token = file_token?;

        match current {
            None => Some(file_token),
            Some(cur) if *cur == file_token => None,
            Some(cur) => {
                let cur_exp = jwt::token_exp_unix(cur).unwrap_or(0);
                let file_exp = jwt::token_exp_unix(&file_token).unwrap_or(0);
                if file_exp > cur_exp {
                    Some(file_token)
                } else {
                    None
                }
            }
        }
    }

    /// Determines whether the current token should be refreshed.
    ///
    /// A missing token or a token expiring within the configured margin requires
    /// refresh. Tokens whose expiration cannot be decoded are treated as
    /// client-managed and do not require refresh.
    ///
    /// # Examples
    ///
    /// ```
    /// assert!(TokenProvider::needs_self_refresh(&None));
    /// ```
    fn needs_self_refresh(current: &Option<String>) -> bool {
        let Some(token) = current else {
            return true;
        };
        let Some(exp) = jwt::token_exp_unix(token) else {
            // Undecodable exp: assume the client is managing it; don't churn.
            return false;
        };
        exp - Utc::now().timestamp() < SELF_REFRESH_MARGIN_SECS
    }

    /// Obtains an access token using the configured OAuth2 client credentials.
    ///
    /// # Errors
    ///
    /// Propagates errors from credential retrieval or authentication.
    ///
    /// # Examples
    ///
    /// ```ignore
    /// let token = TokenProvider::self_refresh(&auth_client, &config_service).await?;
    /// assert!(!token.is_empty());
    /// ```
    ///
    /// # Returns
    ///
    /// The access token returned by the authentication service.
    async fn self_refresh(
        auth_client: &AuthClient,
        config_service: &AgentConfigurationService,
    ) -> anyhow::Result<String> {
        let (client_id, client_secret) = config_service.get_client_credentials().await?;
        let response = auth_client
            .authenticate_with_secret(client_id, client_secret)
            .await?;
        Ok(response.access_token)
    }

    /// Reads and decrypts a token from an encrypted file.
    ///
    /// Returns `None` when the file cannot be read, is empty, or cannot be decrypted.
    ///
    /// # Examples
    ///
    /// ```
    /// # use std::path::Path;
    /// # let encryption_service = /* configured encryption service */ unimplemented!();
    /// let token = TokenProvider::read_and_decrypt(
    ///     Path::new("shared_token.enc"),
    ///     &encryption_service,
    /// );
    /// ```
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
