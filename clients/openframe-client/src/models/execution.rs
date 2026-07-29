use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum ScriptShell {
    Powershell,
    Cmd,
    Bash,
    Python,
    Nushell,
    Shell,
}

impl ScriptShell {
    pub fn as_param(self) -> &'static str {
        match self {
            ScriptShell::Powershell => "powershell",
            ScriptShell::Cmd => "cmd",
            ScriptShell::Bash => "bash",
            ScriptShell::Shell => "sh",
            ScriptShell::Python => "python",
            ScriptShell::Nushell => "nushell",
        }
    }
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum PrivilegeLevel {
    User,
    Admin,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptEnvVar {
    pub name: String,
    pub value: String,
    #[serde(default)]
    pub secret: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptSpec {
    pub code: String,
    pub shell: ScriptShell,
    #[serde(default)]
    pub privilege_level: Option<PrivilegeLevel>,
    #[serde(default)]
    pub args: Option<Vec<String>>,
    #[serde(default)]
    pub timeout_seconds: Option<u64>,
    #[serde(default)]
    pub env_vars: Option<Vec<ScriptEnvVar>>,
}

impl ScriptSpec {
    fn to_request<'a>(
        &'a self,
        execution_id: &'a str,
        script_id: Option<&'a str>,
        schedule_id: Option<&'a str>,
    ) -> ExecutionRequest<'a> {
        ExecutionRequest {
            execution_id,
            code: &self.code,
            shell: self.shell,
            privilege: self.privilege_level.unwrap_or(PrivilegeLevel::Admin),
            args: self.args.as_deref().unwrap_or(&[]),
            timeout_secs: self.timeout_seconds.unwrap_or_else(default_timeout),
            env_vars: self
                .env_vars
                .as_deref()
                .unwrap_or(&[])
                .iter()
                .map(|e| format!("{}={}", e.name, e.value))
                .collect(),
            script_id,
            schedule_id,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptMessage {
    pub execution_id: String,
    #[serde(default)]
    pub machine_id: Option<String>,
    #[serde(default)]
    pub schedule_id: Option<String>,
    #[serde(default)]
    pub script_id: Option<String>,
    #[serde(flatten)]
    pub spec: ScriptSpec,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptScheduleExecutionItem {
    pub script_id: String,
    #[serde(flatten)]
    pub spec: ScriptSpec,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScriptScheduleExecutionMessage {
    pub execution_id: String,
    #[serde(default)]
    pub schedule_id: Option<String>,
    #[serde(default)]
    pub machine_id: Option<String>,
    #[serde(default)]
    pub initiated_by: Option<String>,
    #[serde(default)]
    pub scripts: Vec<ScriptScheduleExecutionItem>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandMessage {
    pub execution_id: String,
    pub code: String,
    pub shell: ScriptShell,
    #[serde(default)]
    pub privilege_level: Option<PrivilegeLevel>,
    #[serde(default = "default_timeout")]
    pub timeout: u64,
}

fn default_timeout() -> u64 {
    900
}

#[derive(Debug, Clone, Serialize)]
pub struct RmmResult {
    pub execution_id: String,
    pub machine_id: String,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
    pub execution_time_ms: u64,
    pub timed_out: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub script_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub schedule_id: Option<String>,
}

pub struct ExecutionRequest<'a> {
    pub execution_id: &'a str,
    pub code: &'a str,
    pub shell: ScriptShell,
    pub privilege: PrivilegeLevel,
    pub args: &'a [String],
    pub timeout_secs: u64,
    pub env_vars: Vec<String>,
    pub script_id: Option<&'a str>,
    pub schedule_id: Option<&'a str>,
}

pub trait ExecutionMessage: Sized + Send {
    const KIND: &'static str;
    const RESULT_KIND: &'static str = Self::KIND;
    const DURABLE: bool = false;

    fn from_payload(payload: &str) -> Result<Self>;
    fn execution_id(&self) -> &str;
    fn to_requests(&self) -> Vec<ExecutionRequest<'_>>;

    fn schedule_id(&self) -> Option<&str> {
        None
    }
}

impl ExecutionMessage for CommandMessage {
    const KIND: &'static str = "command-execution";

    fn from_payload(payload: &str) -> Result<Self> {
        Ok(serde_json::from_str(payload)?)
    }

    fn execution_id(&self) -> &str {
        &self.execution_id
    }

    fn to_requests(&self) -> Vec<ExecutionRequest<'_>> {
        vec![ExecutionRequest {
            execution_id: &self.execution_id,
            code: &self.code,
            shell: self.shell,
            privilege: self.privilege_level.unwrap_or(PrivilegeLevel::Admin),
            args: &[],
            timeout_secs: self.timeout,
            env_vars: Vec::new(),
            script_id: None,
            schedule_id: None,
        }]
    }
}

impl ExecutionMessage for ScriptMessage {
    const KIND: &'static str = "script-execution";

    fn from_payload(payload: &str) -> Result<Self> {
        Ok(serde_json::from_str(payload)?)
    }

    fn execution_id(&self) -> &str {
        &self.execution_id
    }

    fn schedule_id(&self) -> Option<&str> {
        self.schedule_id.as_deref()
    }

    fn to_requests(&self) -> Vec<ExecutionRequest<'_>> {
        vec![self.spec.to_request(
            &self.execution_id,
            self.script_id.as_deref(),
            self.schedule_id.as_deref(),
        )]
    }
}

impl ExecutionMessage for ScriptScheduleExecutionMessage {
    const KIND: &'static str = "script-schedule-execution";
    const RESULT_KIND: &'static str = ScriptMessage::KIND;
    const DURABLE: bool = true;

    fn from_payload(payload: &str) -> Result<Self> {
        Ok(serde_json::from_str(payload)?)
    }

    fn execution_id(&self) -> &str {
        &self.execution_id
    }

    fn schedule_id(&self) -> Option<&str> {
        self.schedule_id.as_deref()
    }

    fn to_requests(&self) -> Vec<ExecutionRequest<'_>> {
        self.scripts
            .iter()
            .map(|item| {
                item.spec.to_request(
                    &self.execution_id,
                    Some(&item.script_id),
                    self.schedule_id.as_deref(),
                )
            })
            .collect()
    }
}

#[cfg(test)]
#[path = "execution_tests.rs"]
mod tests;
