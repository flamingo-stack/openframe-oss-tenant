use serde::{Deserialize, Serialize};

/// Remote-healing request. v1 is an allowlist of named native actions — no
/// arbitrary code. Arbitrary script execution, if ever needed, extends this
/// same shape with a `code` field rather than replacing it.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HealingMessage {
    pub execution_id: String,
    /// One of: "ping", "restart-client", "rollback-client", "clear-update-state".
    pub action: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct HealingResult {
    pub execution_id: String,
    pub machine_id: String,
    pub action: String,
    pub success: bool,
    pub message: String,
    pub execution_time_ms: u64,
}
