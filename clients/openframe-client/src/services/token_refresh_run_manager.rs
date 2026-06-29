use chrono::Utc;
use tokio::time::{sleep, timeout, Duration};
use tracing::{error, info, debug, warn};

use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::services::AgentAuthService;
use crate::utils::jwt;

/// Refresh this long before the access token's `exp` so the meshagent never reads an expired token.
const REFRESH_MARGIN: Duration = Duration::from_secs(5 * 60);
/// Cadence used when the token's `exp` can't be decoded (≈ TTL/2 for a 1h token).
const FALLBACK_INTERVAL: Duration = Duration::from_secs(30 * 60);
/// Delay after a failed refresh so an expiring token gets another attempt soon.
const RETRY_INTERVAL: Duration = Duration::from_secs(60);
/// Cap on a single `reauthenticate()` call.
const REAUTH_TIMEOUT: Duration = Duration::from_secs(30);

/// Keeps `shared_token.enc` valid independent of NATS by proactively refreshing the access
/// token before it expires. Without this the file is only rewritten on NATS reconnect, so a
/// frozen token leaves the meshagent presenting an expired JWT and the gateway rejects it.
#[derive(Clone)]
pub struct TokenRefreshRunManager {
    auth_service: AgentAuthService,
    config_service: AgentConfigurationService,
}

impl TokenRefreshRunManager {
    pub fn new(
        auth_service: AgentAuthService,
        config_service: AgentConfigurationService,
    ) -> Self {
        Self {
            auth_service,
            config_service,
        }
    }

    pub fn start(&self) {
        let auth_service = self.auth_service.clone();
        let config_service = self.config_service.clone();

        info!("Starting proactive token refresh run manager");

        tokio::spawn(async move {
            loop {
                let wait = next_refresh_delay(&config_service).await;
                if !wait.is_zero() {
                    debug!("Next proactive token refresh in {}s", wait.as_secs());
                }
                sleep(wait).await;

                // Retry on the short interval until a refresh succeeds, so a failure never falls
                // back into the long scheduling delay (e.g. for an undecodable token).
                loop {
                    match timeout(REAUTH_TIMEOUT, auth_service.reauthenticate()).await {
                        Ok(Ok(_)) => {
                            debug!("Proactively refreshed access token; shared_token.enc updated");
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
                    sleep(RETRY_INTERVAL).await;
                }
            }
        });
    }
}

/// Time to wait before the next refresh: `exp - margin` of the current access token, clamped to
/// zero (refresh immediately) when the token is already at/near expiry, missing, or undecodable.
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

    // Saturating math: a malformed/negative `exp` must never underflow into a huge sleep (or
    // panic in debug builds) — treat any non-positive result as "refresh now".
    let secs_until_refresh = exp
        .saturating_sub(Utc::now().timestamp())
        .saturating_sub(REFRESH_MARGIN.as_secs() as i64);
    if secs_until_refresh <= 0 {
        Duration::ZERO
    } else {
        Duration::from_secs(secs_until_refresh as u64)
    }
}
