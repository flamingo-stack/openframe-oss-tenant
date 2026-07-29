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
                script_id: req.script_id.map(str::to_string),
                schedule_id: req.schedule_id.map(str::to_string),
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
                script_id: req.script_id.map(str::to_string),
                schedule_id: req.schedule_id.map(str::to_string),
            }
        }
    }
}

#[cfg(all(test, unix))]
#[path = "execution_service_tests.rs"]
mod tests;

#[cfg(all(test, windows))]
#[path = "execution_service_windows_tests.rs"]
mod windows_tests;
