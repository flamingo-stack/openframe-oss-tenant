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
            r#"{"executionId":"e","machineId":"mac","scheduleId":"sch-1","scriptId":"scr-1","code":"x","shell":"POWERSHELL","privilegeLevel":"USER","args":["-v"],"timeoutSeconds":60,"envVars":[{"name":"FOO","value":"bar"}]}"#,
        )
        .unwrap();
        let req = &m.to_requests()[0];
        assert_eq!(req.timeout_secs, 60);
        assert_eq!(req.args, &["-v".to_string()]);
        assert_eq!(req.env_vars, vec!["FOO=bar".to_string()]);
        assert!(matches!(req.privilege, PrivilegeLevel::User));
        assert_eq!(req.script_id, Some("scr-1"));
        assert_eq!(req.schedule_id, Some("sch-1"));
    }

    #[test]
    fn script_message_without_script_id_still_parses() {
        let m = ScriptMessage::from_payload(r#"{"executionId":"e","code":"x","shell":"BASH"}"#)
            .unwrap();
        assert!(m.script_id.is_none());
        assert!(m.to_requests()[0].script_id.is_none());
    }

    #[test]
    fn missing_privilege_defaults_to_admin() {
        let m = CommandMessage::from_payload(r#"{"executionId":"e","code":"x","shell":"CMD"}"#)
            .unwrap();
        assert!(matches!(m.to_requests()[0].privilege, PrivilegeLevel::Admin));
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
            script_id: Some("scr-1".into()),
            schedule_id: None,
        };
        let v = serde_json::to_value(&r).unwrap();
        assert!(v.get("execution_id").is_some());
        assert!(v.get("exit_code").is_some());
        assert!(v.get("execution_time_ms").is_some());
        assert!(v.get("timed_out").is_some());
        assert!(v.get("error").is_none(), "None error must be omitted");
        assert_eq!(v.get("script_id").and_then(|s| s.as_str()), Some("scr-1"));
        assert!(v.get("schedule_id").is_none(), "None schedule_id must be omitted");
    }

    #[test]
    fn parses_schedule_batch_preserving_order() {
        let m = ScriptScheduleExecutionMessage::from_payload(
            r#"{"executionId":"ex-1","scheduleId":"sch-1","machineId":"mac","initiatedBy":"user@x","scripts":[
                {"scriptId":"a","code":"1","shell":"BASH","timeoutSeconds":10},
                {"scriptId":"b","code":"2","shell":"BASH","privilegeLevel":"USER","args":["-v"],"envVars":[{"name":"FOO","value":"bar"}]}
            ]}"#,
        )
        .unwrap();
        let reqs = m.to_requests();
        assert_eq!(reqs.len(), 2);
        assert_eq!(reqs[0].script_id, Some("a"));
        assert_eq!(reqs[0].code, "1");
        assert_eq!(reqs[0].timeout_secs, 10);
        assert!(matches!(reqs[0].privilege, PrivilegeLevel::Admin));
        assert_eq!(reqs[1].script_id, Some("b"));
        assert_eq!(reqs[1].args, &["-v".to_string()]);
        assert_eq!(reqs[1].env_vars, vec!["FOO=bar".to_string()]);
        assert!(reqs.iter().all(|r| r.execution_id == "ex-1"));
        assert!(reqs.iter().all(|r| r.schedule_id == Some("sch-1")));
    }

    #[test]
    fn schedule_batch_tolerates_explicit_nulls() {
        let m = ScriptScheduleExecutionMessage::from_payload(
            r#"{"executionId":"ex-1","scheduleId":null,"machineId":null,"initiatedBy":null,"scripts":[
                {"scriptId":"a","code":"x","shell":"BASH","privilegeLevel":null,"args":null,"timeoutSeconds":null,"envVars":null}
            ]}"#,
        )
        .unwrap();
        let reqs = m.to_requests();
        assert_eq!(reqs.len(), 1);
        assert_eq!(reqs[0].timeout_secs, 900);
        assert!(reqs[0].args.is_empty());
        assert!(reqs[0].env_vars.is_empty());
        assert!(matches!(reqs[0].privilege, PrivilegeLevel::Admin));
        assert_eq!(reqs[0].schedule_id, None);
    }

    #[test]
    fn schedule_batch_runs_every_script() {
        let n = 120;
        let scripts: Vec<String> = (0..n)
            .map(|i| format!(r#"{{"scriptId":"s{}","code":"x","shell":"BASH"}}"#, i))
            .collect();
        let m = ScriptScheduleExecutionMessage::from_payload(&format!(
            r#"{{"executionId":"ex-1","scripts":[{}]}}"#,
            scripts.join(",")
        ))
        .unwrap();
        let reqs = m.to_requests();
        assert_eq!(reqs.len(), n);
        assert_eq!(reqs[0].script_id, Some("s0"));
        assert_eq!(reqs[n - 1].script_id, Some("s119"));
    }

    #[test]
    fn schedule_results_reuse_the_script_execution_subject() {
        assert_eq!(
            ScriptScheduleExecutionMessage::KIND,
            "script-schedule-execution"
        );
        assert_eq!(ScriptScheduleExecutionMessage::RESULT_KIND, "script-execution");
        assert_eq!(ScriptMessage::RESULT_KIND, ScriptMessage::KIND);
        assert_eq!(CommandMessage::RESULT_KIND, CommandMessage::KIND);
    }

    #[test]
    fn shell_maps_to_param() {
        assert_eq!(ScriptShell::Powershell.as_param(), "powershell");
        assert_eq!(ScriptShell::Cmd.as_param(), "cmd");
        assert_eq!(ScriptShell::Shell.as_param(), "sh");
    }
}
