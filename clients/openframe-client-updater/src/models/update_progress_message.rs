use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProgressMessage {
    pub phase: String,
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rolled_back: Option<bool>,
}

impl UpdateProgressMessage {
    /// Creates a progress update message for the specified phase and version.
    ///
    /// # Examples
    ///
    /// ```
    /// let message = UpdateProgressMessage::new("installing", "1.2.3");
    ///
    /// assert_eq!(message.phase, "installing");
    /// assert_eq!(message.version, "1.2.3");
    /// assert_eq!(message.reason, None);
    /// assert_eq!(message.rolled_back, None);
    /// ```
    pub fn new(phase: impl Into<String>, version: impl Into<String>) -> Self {
        Self {
            phase: phase.into(),
            version: version.into(),
            reason: None,
            rolled_back: None,
        }
    }

    /// Creates a progress message describing a failed update.
    ///
    /// # Arguments
    ///
    /// * `reason` - Explains why the update failed.
    /// * `rolled_back` - Indicates whether the update was rolled back.
    ///
    /// # Returns
    ///
    /// A progress message containing the failure reason and rollback status.
    ///
    /// # Examples
    ///
    /// ```
    /// let message = UpdateProgressMessage::with_failure(
    ///     "failed",
    ///     "1.2.3",
    ///     "Installation failed",
    ///     true,
    /// );
    ///
    /// assert_eq!(message.phase, "failed");
    /// assert_eq!(message.version, "1.2.3");
    /// assert_eq!(message.reason.as_deref(), Some("Installation failed"));
    /// assert_eq!(message.rolled_back, Some(true));
    /// ```
    pub fn with_failure(
        phase: impl Into<String>,
        version: impl Into<String>,
        reason: impl Into<String>,
        rolled_back: bool,
    ) -> Self {
        Self {
            phase: phase.into(),
            version: version.into(),
            reason: Some(reason.into()),
            rolled_back: Some(rolled_back),
        }
    }
}
