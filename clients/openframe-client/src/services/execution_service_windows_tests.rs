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
        script_id: None,
        schedule_id: None,
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
