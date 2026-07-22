use anyhow::Result;
use tracing::{info, warn};

use crate::models::{InstalledAgentMessage, UpdateProgressMessage, UpdaterPhase};
use crate::services::NatsMessagePublisher;

#[derive(Clone)]
pub struct UpdateProgressPublisher {
    nats_publisher: NatsMessagePublisher,
    machine_id: String,
}

impl UpdateProgressPublisher {
    pub fn new(nats_publisher: NatsMessagePublisher, machine_id: String) -> Self {
        Self { nats_publisher, machine_id }
    }

    // Errors are swallowed — a NATS hiccup must never abort the binary swap.
    pub async fn publish(&self, phase: &UpdaterPhase, version: &str) {
        let subject = self.progress_subject();
        let msg = UpdateProgressMessage::new(phase.to_string(), version);
        info!(phase = %phase, version = %version, subject = %subject, "Publishing update progress");

        if let Err(e) = self.nats_publisher.publish(&subject, &msg).await {
            warn!("Failed to publish update progress ({}): {}", phase, e);
        }
    }

    pub async fn publish_failure(
        &self,
        phase: &UpdaterPhase,
        version: &str,
        reason: &str,
        rolled_back: bool,
    ) {
        let subject = self.progress_subject();
        let msg = UpdateProgressMessage::with_failure(phase.to_string(), version, reason, rolled_back);
        warn!(
            phase = %phase,
            version = %version,
            reason = %reason,
            rolled_back = rolled_back,
            "Publishing update failure"
        );

        if let Err(e) = self.nats_publisher.publish(&subject, &msg).await {
            warn!("Failed to publish update failure ({}): {}", phase, e);
        }
    }

    // Reports the updater's own version to the backend on startup.
    pub async fn publish_updater_version(&self) {
        let version = env!("OPENFRAME_UPDATER_VERSION");
        let subject = self.installed_agent_subject();
        let msg = InstalledAgentMessage {
            agent_type: "openframe-client-updater".to_string(),
            version: version.to_string(),
        };
        info!(version = %version, subject = %subject, "Reporting updater version to backend");
        if let Err(e) = self.nats_publisher.publish(&subject, &msg).await {
            warn!("Failed to publish updater version: {}", e);
        }
    }

    // Also publishes installed-agent for backward compat with the existing backend handler.
    pub async fn publish_success(&self, version: &str) {
        self.publish(&UpdaterPhase::Completed, version).await;

        let subject = self.installed_agent_subject();
        let msg = InstalledAgentMessage {
            agent_type: "openframe-client".to_string(),
            version: version.to_string(),
        };

        info!(version = %version, subject = %subject, "Publishing installed-agent (update success)");

        if let Err(e) = self.nats_publisher.publish(&subject, &msg).await {
            warn!("Failed to publish installed-agent message: {}", e);
        }
    }

    fn progress_subject(&self) -> String {
        format!("machine.{}.client-update-progress", self.machine_id)
    }

    fn installed_agent_subject(&self) -> String {
        format!("machine.{}.installed-agent", self.machine_id)
    }
}
