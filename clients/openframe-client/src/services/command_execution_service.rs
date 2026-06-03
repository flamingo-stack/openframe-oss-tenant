use std::time::Instant;
use tracing::info;

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

        info!(
            execution_id = %message.execution_id,
            shell = %message.shell,
            timeout = message.timeout,
            code_len = message.code.len(),
            args_count = message.args.len(),
            env_vars_count = message.env_vars.len(),
            "Mock command execution (not actually running)"
        );

        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

        let elapsed = start.elapsed().as_millis() as u64;

        CommandExecutionResult {
            execution_id: message.execution_id.clone(),
            machine_id: machine_id.to_string(),
            stdout: format!(
                "[MOCK] Would execute with shell={}, code_len={}, args={:?}",
                message.shell,
                message.code.len(),
                message.args
            ),
            stderr: String::new(),
            exit_code: 0,
            execution_time_ms: elapsed,
            timed_out: false,
            error: None,
        }
    }
}
