use std::sync::Arc;

use chrono::Utc;
use tokio::time::{sleep, timeout, Duration};
use tracing::{error, info, debug, warn};

use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::services::deactivation_service::DeactivationService;
use crate::services::AgentAuthService;
use crate::utils::jwt;

/// Refresh this long before `exp` under normal TTLs.
const REFRESH_MARGIN: Duration = Duration::from_secs(5 * 60);
/// Lead for a short-lived token (TTL <= margin) so it doesn't refresh every loop.
const MIN_LEAD: Duration = Duration::from_secs(15);
/// Used when the token's `exp` can't be decoded.
const FALLBACK_INTERVAL: Duration = Duration::from_secs(30 * 60);
/// Delay between refresh attempts after a failure.
const RETRY_INTERVAL: Duration = Duration::from_secs(60);
/// Cap on a single `reauthenticate()` call.
const REAUTH_TIMEOUT: Duration = Duration::from_secs(30);

/// Proactively refreshes the access token before `exp` so `shared_token.enc` stays valid without a NATS reconnect.
#[derive(Clone)]
pub struct TokenRefreshRunManager {
    auth_service: AgentAuthService,
    config_service: AgentConfigurationService,
    deactivation: Arc<DeactivationService>,
}

impl TokenRefreshRunManager {
    pub fn new(
        auth_service: AgentAuthService,
        config_service: AgentConfigurationService,
        deactivation: Arc<DeactivationService>,
    ) -> Self {
        Self {
            auth_service,
            config_service,
            deactivation,
        }
    }

    pub fn start(&self) {
        let auth_service = self.auth_service.clone();
        let config_service = self.config_service.clone();
        let deactivation = self.deactivation.clone();

        info!("Starting proactive token refresh run manager");

        tokio::spawn(async move {
            loop {
                // Tenant-gone suspension: this loop is the single backoff probe. Its outcome is
                // recorded inside AuthClient (410 -> stay gone / advance uninstall; 2xx -> recover).
                if deactivation.is_suspended() {
                    let wait = deactivation.next_probe_delay().await;
                    debug!("Tenant-gone suspension active; next probe in {}s", wait.as_secs());
                    sleep(wait).await;
                    let _ = timeout(REAUTH_TIMEOUT, auth_service.reauthenticate()).await;
                    continue;
                }

                let wait = next_refresh_delay(&config_service).await;
                if !wait.is_zero() {
                    debug!("Next proactive token refresh in {}s", wait.as_secs());
                }
                sleep(wait).await;

                // Retry on the short interval until a refresh succeeds.
                loop {
                    match timeout(REAUTH_TIMEOUT, auth_service.reauthenticate()).await {
                        Ok(Ok(_)) => {
                            info!("Proactively refreshed access token; shared_token.enc updated");
                            break;
                        }
                        Ok(Err(e)) => error!(
                            "Proactive token refresh failed: {e:#}; retrying in {}s",
                            RETRY_INTERVAL.as_secs()
                        ),
                        Err(_) => error!(
                            "Proactive token refresh timed out after {}s; retrying in {}s",
                            REAUTH_TIMEOUT.as_secs(),
                            RETRY_INTERVAL.as_secs()
                        ),
                    }
                    // Tenant went gone mid-retry — hand control to the backoff probe above.
                    if deactivation.is_suspended() {
                        break;
                    }
                    sleep(RETRY_INTERVAL).await;
                }
            }
        });
    }
}

/// Delay until the next refresh; zero when the token is at/near expiry, missing, or undecodable.
async fn next_refresh_delay(config_service: &AgentConfigurationService) -> Duration {
    let token = match config_service.get_access_token().await {
        Ok(t) if !t.is_empty() => t,
        Ok(_) => return Duration::ZERO,
        Err(e) => {
            warn!("Token refresh: cannot read access token ({e:#}); using fallback interval");
            return FALLBACK_INTERVAL;
        }
    };

    let Some(exp) = jwt::token_exp_unix(&token) else {
        warn!("Token refresh: access token has no decodable exp; using fallback interval");
        return FALLBACK_INTERVAL;
    };

    // Full margin normally; MIN_LEAD for short-lived tokens. Saturating so a bad `exp` can't underflow.
    let secs_to_exp = exp.saturating_sub(Utc::now().timestamp());
    let lead = if secs_to_exp > REFRESH_MARGIN.as_secs() as i64 {
        REFRESH_MARGIN.as_secs() as i64
    } else {
        MIN_LEAD.as_secs() as i64
    };
    let secs_until_refresh = secs_to_exp.saturating_sub(lead);
    if secs_until_refresh <= 0 {
        Duration::ZERO
    } else {
        Duration::from_secs(secs_until_refresh as u64)
    }
}
