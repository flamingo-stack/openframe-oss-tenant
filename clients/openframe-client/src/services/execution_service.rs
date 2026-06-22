use std::time::Instant;

use crate::models::{ExecutionRequest, RmmResult};

#[derive(Clone, Default)]
pub struct ExecutionService;

impl ExecutionService {
    pub fn new() -> Self {
        Self
    }

    pub async fn execute(&self, req: &ExecutionRequest<'_>, machine_id: &str) -> RmmResult {
        let start = Instant::now();

        #[cfg(any(unix, windows))]
        {
            use crate::executor::{execute_script, Privilege, ScriptParams};
            use crate::models::PrivilegeLevel;

            let timeout_secs = match req.timeout_secs {
                0 => 900,
                t => t.min(u32::MAX as u64) as u32,
            };
            let privilege = match req.privilege {
                PrivilegeLevel::Admin => Privilege::Agent,
                PrivilegeLevel::User => Privilege::User,
            };

            let result = execute_script(ScriptParams {
                code: req.code,
                shell: req.shell.as_param(),
                args: req.args,
                timeout_secs,
                privilege,
                env_vars: &req.env_vars,
            })
            .await;

            let error = if result.retcode == 85 {
                Some(result.stderr.clone())
            } else {
                None
            };

            RmmResult {
                execution_id: req.execution_id.to_string(),
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
            RmmResult {
                execution_id: req.execution_id.to_string(),
                machine_id: machine_id.to_string(),
                stdout: String::new(),
                stderr: "execution is not supported on this platform".to_string(),
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
    use crate::models::{PrivilegeLevel, ScriptShell};

    fn req(code: &str) -> ExecutionRequest<'_> {
        ExecutionRequest {
            execution_id: "exec-1",
            code,
            shell: ScriptShell::Bash,
            privilege: PrivilegeLevel::Admin,
            args: &[],
            timeout_secs: 30,
            env_vars: Vec::new(),
        }
    }

    #[tokio::test]
    async fn maps_successful_execution() {
        let r = ExecutionService::new()
            .execute(&req("#!/bin/sh\necho hi\n"), "machine-1")
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
        let mut r = req("#!/bin/sh\nsleep 5\n");
        r.timeout_secs = 1;
        let r = ExecutionService::new().execute(&r, "m").await;
        assert_eq!(r.exit_code, 98);
        assert!(r.timed_out);
    }

    #[tokio::test]
    async fn maps_spawn_failure_to_error() {
        let r = ExecutionService::new()
            .execute(&req("#!/nonexistent/ofcmd-bad\necho hi\n"), "m")
            .await;
        assert_eq!(r.exit_code, 85);
        assert!(r.error.is_some());
        assert!(!r.timed_out);
    }
}

#[cfg(all(test, windows))]
mod windows_tests {
    use super::*;
    use crate::models::{PrivilegeLevel, ScriptShell};

    fn req(shell: ScriptShell, code: &str) -> ExecutionRequest<'_> {
        ExecutionRequest {
            execution_id: "exec-1",
            code,
            shell,
            privilege: PrivilegeLevel::Admin,
            args: &[],
            timeout_secs: 30,
            env_vars: Vec::new(),
        }
    }

    #[tokio::test]
    async fn maps_powershell_execution() {
        let r = ExecutionService::new()
            .execute(&req(ScriptShell::Powershell, "Write-Output hi"), "m")
            .await;
        assert_eq!(r.exit_code, 0, "stderr: {}", r.stderr);
        assert_eq!(r.stdout.trim_end(), "hi");
        assert!(r.error.is_none());
    }

    #[tokio::test]
    async fn maps_unsupported_shell_to_error() {
        let r = ExecutionService::new()
            .execute(&req(ScriptShell::Python, "print('x')"), "m")
            .await;
        assert_eq!(r.exit_code, 85);
        assert!(r.error.is_some());
    }
}
