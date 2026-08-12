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
        script_id: None,
        schedule_id: None,
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
