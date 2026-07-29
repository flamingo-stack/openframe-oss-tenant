use tracing::{info, warn};

use crate::models::{InstalledAgentMessage, UpdateProgressMessage, UpdaterPhase};
use crate::services::NatsMessagePublisher;

#[derive(Clone)]
pub struct UpdateProgressPublisher {
    nats_publisher: NatsMessagePublisher,
    machine_id: String,
}

impl UpdateProgressPublisher {
    /// Creates an update progress publisher for the specified machine.
    ///
    /// # Examples
    ///
    /// ```
    /// # fn example(nats_publisher: NatsMessagePublisher) {
    /// let publisher = UpdateProgressPublisher::new(nats_publisher, "machine-123".to_owned());
    /// # }
    /// ```
    pub fn new(nats_publisher: NatsMessagePublisher, machine_id: String) -> Self {
        Self {
            nats_publisher,
            machine_id,
        }
    }

    // Errors are swallowed — a NATS hiccup must never abort the binary swap.
    /// Publishes update progress for the specified phase and version.
    ///
    /// Publishing failures are logged and ignored so they do not interrupt the update process.
    ///
    /// # Examples
    ///
    /// ```
    /// # async fn example(publisher: &UpdateProgressPublisher) {
    /// publisher.publish(&UpdaterPhase::Completed, "1.2.3").await;
    /// # }
    /// ```
    pub async fn publish(&self, phase: &UpdaterPhase, version: &str) {
        let subject = self.progress_subject();
        let msg = UpdateProgressMessage::new(phase.to_string(), version);
        info!(phase = %phase, version = %version, subject = %subject, "Publishing update progress");

        if let Err(e) = self.nats_publisher.publish(&subject, &msg).await {
            warn!("Failed to publish update progress ({}): {}", phase, e);
        }
    }

    /// Publishes a failure notification for an update phase.
    ///
    /// Publishing errors are logged and do not propagate to the caller.
    ///
    /// # Parameters
    ///
    /// * `phase` - The update phase in which the failure occurred.
    /// * `version` - The update version associated with the failure.
    /// * `reason` - A description of the failure.
    /// * `rolled_back` - Whether the update was rolled back.
    ///
    /// # Examples
    ///
    /// ```
    /// # async fn example(
    /// #     publisher: &UpdateProgressPublisher,
    /// #     phase: &UpdaterPhase,
    /// # ) {
    /// publisher
    ///     .publish_failure(phase, "1.2.3", "download failed", false)
    ///     .await;
    /// # }
    /// ```
    pub async fn publish_failure(
        &self,
        phase: &UpdaterPhase,
        version: &str,
        reason: &str,
        rolled_back: bool,
    ) {
        let subject = self.progress_subject();
        let msg =
            UpdateProgressMessage::with_failure(phase.to_string(), version, reason, rolled_back);
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
    /// Publishes the updater's installed-agent version to the backend.
    ///
    /// Publishing failures are logged and do not propagate to the caller.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # async fn example(
    /// #     nats_publisher: NatsMessagePublisher,
    /// # ) {
    /// let publisher = UpdateProgressPublisher::new(
    ///     nats_publisher,
    ///     "machine-123".to_string(),
    /// );
    /// publisher.publish_updater_version().await;
    /// # }
    /// ```
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
    /// Publishes completed update progress and reports the installed client version.
    ///
    /// Publication failures are logged and do not propagate to the caller.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # async fn example(publisher: UpdateProgressPublisher) {
    /// publisher.publish_success("1.2.3").await;
    /// # }
    /// ```
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

    /// Builds the NATS subject used for update progress messages.
    ///
    /// # Examples
    ///
    /// ```
    /// let machine_id = "machine-123";
    /// let subject = format!("machine.{machine_id}.client-update-progress");
    ///
    /// assert_eq!(subject, "machine.machine-123.client-update-progress");
    /// ```
    fn progress_subject(&self) -> String {
        format!("machine.{}.client-update-progress", self.machine_id)
    }

    /// Builds the NATS subject used for installed-agent messages.
    ///
    /// # Examples
    ///
    /// ```
    /// let machine_id = "machine-123";
    /// let subject = format!("machine.{machine_id}.installed-agent");
    ///
    /// assert_eq!(subject, "machine.machine-123.installed-agent");
    /// ```
    fn installed_agent_subject(&self) -> String {
        format!("machine.{}.installed-agent", self.machine_id)
    }
}
