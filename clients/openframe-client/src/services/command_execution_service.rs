use std::time::Instant;

use crate::models::command_execution_message::{CommandExecutionMessage, CommandExecutionResult};

#[derive(Clone, Default)]
pub struct CommandExecutionService;

impl CommandExecutionService {
    pub fn new() -> Self {
        Self
    }

    pub async fn execute(
        &self,
        message: &CommandExecutionMessage,
        machine_id: &str,
    ) -> CommandExecutionResult {
        let start = Instant::now();

        #[cfg(any(unix, windows))]
        {
            use crate::executor::{execute_script, ScriptParams};

            tracing::info!(
                execution_id = %message.execution_id,
                shell = %message.shell,
                timeout = message.timeout,
                code_len = message.code.len(),
                "Executing command"
            );

            let timeout_secs = match message.timeout {
                0 => 900,
                t => t.min(u32::MAX as u64) as u32,
            };
            let result = execute_script(ScriptParams {
                code: &message.code,
                shell: &message.shell,
                args: &message.args,
                timeout_secs,
                run_as_user: None,
                env_vars: &message.env_vars,
            })
            .await;

            let error = if result.retcode == 85 {
                Some(result.stderr.clone())
            } else {
                None
            };

            CommandExecutionResult {
                execution_id: message.execution_id.clone(),
                machine_id: machine_id.to_string(),
                stdout: result.stdout,
                stderr: result.stderr,
                exit_code: result.retcode,
                execution_time_ms: start.elapsed().as_millis() as u64,
                timed_out: result.timed_out,
                error,
            }
        }

        #[cfg(not(any(unix, windows)))]
        {
            CommandExecutionResult {
                execution_id: message.execution_id.clone(),
                machine_id: machine_id.to_string(),
                stdout: String::new(),
                stderr: "command execution is not supported on this platform".to_string(),
                exit_code: 85,
                execution_time_ms: start.elapsed().as_millis() as u64,
                timed_out: false,
                error: Some("unsupported platform".to_string()),
            }
        }
    }
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;

    fn msg(code: &str, timeout: u64) -> CommandExecutionMessage {
        CommandExecutionMessage {
            execution_id: "exec-1".to_string(),
            code: code.to_string(),
            shell: "/bin/bash".to_string(),
            args: Vec::new(),
            timeout,
            env_vars: Vec::new(),
        }
    }

    #[tokio::test]
    async fn maps_successful_execution() {
        let svc = CommandExecutionService::new();
        let r = svc
            .execute(&msg("#!/bin/sh\necho hi\n", 30), "machine-1")
            .await;
        assert_eq!(r.execution_id, "exec-1");
        assert_eq!(r.machine_id, "machine-1");
        assert_eq!(r.stdout, "hi\n");
        assert_eq!(r.exit_code, 0);
        assert!(!r.timed_out);
        assert!(r.error.is_none());
    }

    #[tokio::test]
    async fn maps_timeout() {
        let svc = CommandExecutionService::new();
        let r = svc.execute(&msg("#!/bin/sh\nsleep 5\n", 1), "m").await;
        assert_eq!(r.exit_code, 98);
        assert!(r.timed_out);
    }

    #[tokio::test]
    async fn maps_spawn_failure_to_error() {
        let svc = CommandExecutionService::new();
        let r = svc
            .execute(&msg("#!/nonexistent/ofcmd-bad-interp\necho hi\n", 30), "m")
            .await;
        assert_eq!(r.exit_code, 85);
        assert!(r.error.is_some());
        assert!(!r.timed_out);
    }

    #[test]
    fn result_serializes_camel_case() {
        let r = CommandExecutionResult {
            execution_id: "e".to_string(),
            machine_id: "m".to_string(),
            stdout: "o".to_string(),
            stderr: String::new(),
            exit_code: 0,
            execution_time_ms: 1,
            timed_out: false,
            error: None,
        };
        let v = serde_json::to_value(&r).unwrap();
        assert!(v.get("executionId").is_some());
        assert!(v.get("exitCode").is_some());
        assert!(v.get("timedOut").is_some());
        assert!(v.get("executionTimeMs").is_some());
    }
}
