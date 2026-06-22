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
pub struct ScriptMessage {
    pub execution_id: String,
    #[serde(default)]
    pub machine_id: Option<String>,
    pub code: String,
    pub shell: ScriptShell,
    #[serde(default)]
    pub privilege_level: Option<PrivilegeLevel>,
    #[serde(default)]
    pub args: Vec<String>,
    #[serde(default = "default_timeout")]
    pub timeout_seconds: u64,
    #[serde(default)]
    pub env_vars: Vec<ScriptEnvVar>,
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
}

pub struct ExecutionRequest<'a> {
    pub execution_id: &'a str,
    pub code: &'a str,
    pub shell: ScriptShell,
    pub privilege: PrivilegeLevel,
    pub args: &'a [String],
    pub timeout_secs: u64,
    pub env_vars: Vec<String>,
}

pub trait ExecutionMessage: Sized + Send {
    const KIND: &'static str;

    fn from_payload(payload: &str) -> Result<Self>;
    fn execution_id(&self) -> &str;
    fn to_request(&self) -> ExecutionRequest<'_>;
}

impl ExecutionMessage for CommandMessage {
    const KIND: &'static str = "command-execution";

    fn from_payload(payload: &str) -> Result<Self> {
        Ok(serde_json::from_str(payload)?)
    }

    fn execution_id(&self) -> &str {
        &self.execution_id
    }

    fn to_request(&self) -> ExecutionRequest<'_> {
        ExecutionRequest {
            execution_id: &self.execution_id,
            code: &self.code,
            shell: self.shell,
            privilege: self.privilege_level.unwrap_or(PrivilegeLevel::Admin),
            args: &[],
            timeout_secs: self.timeout,
            env_vars: Vec::new(),
        }
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

    fn to_request(&self) -> ExecutionRequest<'_> {
        ExecutionRequest {
            execution_id: &self.execution_id,
            code: &self.code,
            shell: self.shell,
            privilege: self.privilege_level.unwrap_or(PrivilegeLevel::Admin),
            args: &self.args,
            timeout_secs: self.timeout_seconds,
            env_vars: self
                .env_vars
                .iter()
                .map(|e| format!("{}={}", e.name, e.value))
                .collect(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_command_message_camel_case() {
        let m = CommandMessage::from_payload(
            r#"{"executionId":"e","code":"echo hi","shell":"BASH","privilegeLevel":"ADMIN","timeout":30}"#,
        )
        .unwrap();
        assert_eq!(m.execution_id, "e");
        assert!(matches!(m.shell, ScriptShell::Bash));
        assert_eq!(m.timeout, 30);
    }

    #[test]
    fn parses_script_message_with_env_and_args() {
        let m = ScriptMessage::from_payload(
            r#"{"executionId":"e","machineId":"mac","code":"x","shell":"POWERSHELL","privilegeLevel":"USER","args":["-v"],"timeoutSeconds":60,"envVars":[{"name":"FOO","value":"bar"}]}"#,
        )
        .unwrap();
        let req = m.to_request();
        assert_eq!(req.timeout_secs, 60);
        assert_eq!(req.args, &["-v".to_string()]);
        assert_eq!(req.env_vars, vec!["FOO=bar".to_string()]);
        assert!(matches!(req.privilege, PrivilegeLevel::User));
    }

    #[test]
    fn missing_privilege_defaults_to_admin() {
        let m = CommandMessage::from_payload(r#"{"executionId":"e","code":"x","shell":"CMD"}"#)
            .unwrap();
        assert!(matches!(m.to_request().privilege, PrivilegeLevel::Admin));
        assert_eq!(m.timeout, 900);
    }

    #[test]
    fn result_serializes_snake_case() {
        let r = RmmResult {
            execution_id: "e".into(),
            machine_id: "m".into(),
            stdout: "o".into(),
            stderr: String::new(),
            exit_code: 0,
            execution_time_ms: 1,
            timed_out: false,
            error: None,
        };
        let v = serde_json::to_value(&r).unwrap();
        assert!(v.get("execution_id").is_some());
        assert!(v.get("exit_code").is_some());
        assert!(v.get("execution_time_ms").is_some());
        assert!(v.get("timed_out").is_some());
        assert!(v.get("error").is_none(), "None error must be omitted");
    }

    #[test]
    fn shell_maps_to_param() {
        assert_eq!(ScriptShell::Powershell.as_param(), "powershell");
        assert_eq!(ScriptShell::Cmd.as_param(), "cmd");
        assert_eq!(ScriptShell::Shell.as_param(), "sh");
    }
}
