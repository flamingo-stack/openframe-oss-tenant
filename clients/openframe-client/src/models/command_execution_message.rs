use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CommandExecutionMessage {
    pub execution_id: String,
    pub code: String,
    #[serde(default = "default_shell")]
    pub shell: String,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default = "default_timeout")]
    pub timeout: u64,
    #[serde(default)]
    pub env_vars: Vec<String>,
}

fn default_shell() -> String {
    "/bin/bash".to_string()
}

fn default_timeout() -> u64 {
    900
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CommandExecutionResult {
    pub execution_id: String,
    pub machine_id: String,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub execution_time_ms: u64,
    pub timed_out: bool,
    pub error: Option<String>,
}
