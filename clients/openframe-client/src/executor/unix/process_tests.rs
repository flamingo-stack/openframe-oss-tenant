use super::*;
use crate::executor::unix::run_as_user::{configure_preexec, RunAs};

fn sh(script: &str) -> Command {
    let mut cmd = Command::new("/bin/sh");
    cmd.arg("-c").arg(script);
    configure_preexec(&mut cmd, &RunAs::Current).unwrap();
    cmd
}

#[tokio::test]
async fn timeout_yields_98() {
    let r = execute_with_timeout(sh("sleep 5"), 1).await;
    assert_eq!(r.retcode, 98);
    assert!(r.timed_out);
    assert!(r.stderr.contains("timed out"));
}

#[tokio::test]
async fn instant_exit_zero() {
    let r = execute_with_timeout(sh("exit 0"), 30).await;
    assert_eq!(r.retcode, 0);
    assert!(!r.timed_out);
}

#[tokio::test]
async fn large_timeout_ok() {
    let r = execute_with_timeout(sh("echo hi"), 999_999).await;
    assert_eq!(r.retcode, 0);
    assert_eq!(r.stdout, "hi\n");
}

#[tokio::test]
async fn output_capped_and_no_hang() {
    let r = execute_with_timeout(sh("yes | head -c 11534336"), 30).await;
    assert_eq!(r.stdout.len(), crate::executor::output::MAX_OUTPUT_SIZE);
    assert!(!r.timed_out);
}

#[tokio::test]
async fn backgrounded_child_does_not_hang() {
    let started = std::time::Instant::now();
    let r = execute_with_timeout(sh("sleep 30 & exit 0"), 30).await;
    assert_eq!(r.retcode, 0);
    assert!(!r.timed_out);
    assert!(started.elapsed() < Duration::from_secs(20));
}

#[tokio::test]
async fn signal_kill_yields_137() {
    let r = execute_with_timeout(sh("kill -9 $$"), 30).await;
    assert_eq!(r.retcode, 137);
    assert!(!r.timed_out);
}

#[tokio::test]
async fn signal_term_yields_143() {
    let r = execute_with_timeout(sh("kill -15 $$"), 30).await;
    assert_eq!(r.retcode, 143);
}

#[tokio::test]
async fn spawn_with_retry_returns_non_etxtbsy_error() {
    let mut cmd = Command::new("/nonexistent/ofcmd-no-such-binary");
    let result = spawn_with_retry(&mut cmd, 5).await;
    assert!(result.is_err());
}

#[test]
fn kill_process_group_zero_is_refused() {
    kill_process_tree(0);
}
