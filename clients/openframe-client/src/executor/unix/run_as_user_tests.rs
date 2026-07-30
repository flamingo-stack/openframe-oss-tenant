use super::*;
use crate::executor::{execute_script, Privilege, ScriptParams};

fn params<'a>(code: &'a str, privilege: Privilege) -> ScriptParams<'a> {
    ScriptParams {
        code,
        shell: "/bin/sh",
        args: &[],
        timeout_secs: 30,
        privilege,
        env_vars: &[],
    }
}

#[tokio::test]
async fn agent_privilege_is_current() {
    assert!(matches!(
        resolve_run_as(Privilege::Agent).await.unwrap(),
        RunAs::Current
    ));
}

#[tokio::test]
async fn agent_privilege_runs_as_agent() {
    let r = execute_script(params("#!/bin/sh\necho hi\n", Privilege::Agent)).await;
    assert_eq!(r.stdout, "hi\n");
    assert_eq!(r.retcode, 0);
    assert!(!r.timed_out);
}

#[tokio::test]
async fn user_privilege_runs_or_hard_fails() {
    let r = execute_script(params("#!/bin/sh\nid -u\n", Privilege::User)).await;
    assert!(
        r.retcode == 0 || r.retcode == 85,
        "retcode was {}",
        r.retcode
    );
    assert!(!r.timed_out);
}

#[tokio::test]
#[ignore = "requires root + an active interactive session"]
async fn user_privilege_drops_privilege() {
    let r = execute_script(params("#!/bin/sh\nid -u\n", Privilege::User)).await;
    assert_eq!(r.retcode, 0);
    let uid: u32 = r.stdout.trim().parse().unwrap();
    assert_ne!(uid, 0);
}
