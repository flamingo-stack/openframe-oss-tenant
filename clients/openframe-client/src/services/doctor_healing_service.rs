use std::panic::AssertUnwindSafe;
use std::sync::Arc;

use futures::FutureExt;
use tracing::{debug, error, info, warn};

use crate::doctor::healing::{self, HealResult};
use crate::doctor::Remediation;
use crate::services::deactivation_service::DeactivationService;
use crate::services::mesh_self_heal_service::panic_message;
use crate::services::tool_restart_service::{RestartOutcome, ToolRestartService};

const CHAT_TOOL_ID: &str = "openframe-chat";

/// Runs doctor checks that have automatic remediations once at startup and applies them.
#[derive(Clone)]
pub struct DoctorHealingService {
    tool_restart: ToolRestartService,
    deactivation: Arc<DeactivationService>,
}

impl DoctorHealingService {
    pub fn new(tool_restart: ToolRestartService, deactivation: Arc<DeactivationService>) -> Self {
        Self { tool_restart, deactivation }
    }

    pub fn start(&self) {
        let this = self.clone();
        tokio::spawn(async move {
            // Un-caught, a spawn panic dies silently — capture it into tracing.
            if let Err(panic) = AssertUnwindSafe(this.run()).catch_unwind().await {
                error!("Doctor healing panicked: {}", panic_message(&*panic));
            }
        });
    }

    async fn run(self) {
        if self.deactivation.is_suspended() {
            debug!("Doctor healing skipped: agent is suspended");
            return;
        }

        let results = healing::healable_checks();
        if healing::pending(&results).is_empty() {
            debug!("Doctor healing: nothing to remediate");
            return;
        }

        let heals = healing::heal(&results).await;
        // Re-check after the potentially long install so we don't relaunch chat on a suspended agent.
        if self.deactivation.is_suspended() {
            debug!("Doctor healing: agent suspended mid-heal, skipping follow-ups");
            return;
        }
        self.follow_up(&heals).await;
    }

    async fn follow_up(&self, heals: &[HealResult]) {
        for heal in heals.iter().filter(|h| h.healed()) {
            match heal.remediation {
                // Chat must be restarted to pick up the freshly installed runtime.
                Remediation::InstallWebview2 => self.restart_chat().await,
            }
        }
    }

    async fn restart_chat(&self) {
        match self.tool_restart.restart_guarded(CHAT_TOOL_ID).await {
            Ok(RestartOutcome::Restarted) => info!("Doctor healing: restarted {}", CHAT_TOOL_ID),
            Ok(RestartOutcome::NotInstalled) => {
                debug!("Doctor healing: {} not installed, restart skipped", CHAT_TOOL_ID)
            }
            Ok(RestartOutcome::Busy) => {
                warn!("Doctor healing: {} busy, restart skipped", CHAT_TOOL_ID)
            }
            Err(e) => warn!("Doctor healing: failed to restart {}: {:#}", CHAT_TOOL_ID, e),
        }
    }
}
