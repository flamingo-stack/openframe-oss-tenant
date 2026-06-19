use std::os::unix::process::ExitStatusExt;
use std::process::Stdio;

use tokio::process::Command;
use tokio::task::JoinHandle;
use tokio::time::{timeout, Duration};

use crate::executor::output::{clean_string, read_capped};
use crate::executor::ExecResult;

const READ_GRACE: Duration = Duration::from_secs(5);

pub(crate) async fn execute_with_timeout(mut cmd: Command, timeout_secs: u32) -> ExecResult {
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = match spawn_with_retry(&mut cmd, 5).await {
        Ok(child) => child,
        Err(e) => {
            return ExecResult {
                stdout: String::new(),
                stderr: e.to_string(),
                retcode: 85,
                timed_out: false,
            }
        }
    };

    let pid = child.id().unwrap_or(0);
    let stdout_task = tokio::spawn(read_capped(child.stdout.take()));
    let stderr_task = tokio::spawn(read_capped(child.stderr.take()));

    match timeout(Duration::from_secs(timeout_secs as u64), child.wait()).await {
        Ok(Ok(status)) => {
            let (out, err) = join_reads(stdout_task, stderr_task, pid).await;
            let retcode = status
                .code()
                .unwrap_or_else(|| status.signal().map(|s| 128 + s).unwrap_or(1));
            ExecResult {
                stdout: clean_string(&out),
                stderr: clean_string(&err),
                retcode,
                timed_out: false,
            }
        }
        Ok(Err(e)) => {
            let (out, err) = join_reads(stdout_task, stderr_task, pid).await;
            ExecResult {
                stdout: clean_string(&out),
                stderr: format!("{}\n{}", clean_string(&err), e),
                retcode: 1,
                timed_out: false,
            }
        }
        Err(_) => {
            kill_process_tree(pid);
            let (out, err) = join_reads(stdout_task, stderr_task, pid).await;
            let _ = timeout(READ_GRACE, child.wait()).await;
            ExecResult {
                stdout: clean_string(&out),
                stderr: format!(
                    "{}\nScript timed out after {} seconds",
                    clean_string(&err),
                    timeout_secs
                ),
                retcode: 98,
                timed_out: true,
            }
        }
    }
}

async fn spawn_with_retry(
    cmd: &mut Command,
    max_retries: u32,
) -> std::io::Result<tokio::process::Child> {
    let mut last_err = None;
    for attempt in 0..=max_retries {
        match cmd.spawn() {
            Ok(child) => return Ok(child),
            Err(e) => {
                if e.raw_os_error() == Some(libc::ETXTBSY) && attempt < max_retries {
                    tracing::warn!(
                        attempt = attempt + 1,
                        max_retries,
                        "ETXTBSY (text file busy), retrying in 500ms"
                    );
                    tokio::time::sleep(Duration::from_millis(500)).await;
                    last_err = Some(e);
                    continue;
                }
                return Err(e);
            }
        }
    }
    Err(last_err.unwrap())
}

async fn join_reads(
    mut stdout_task: JoinHandle<Vec<u8>>,
    mut stderr_task: JoinHandle<Vec<u8>>,
    pid: u32,
) -> (Vec<u8>, Vec<u8>) {
    let pair = async {
        let out = (&mut stdout_task).await.unwrap_or_default();
        let err = (&mut stderr_task).await.unwrap_or_default();
        (out, err)
    };
    tokio::pin!(pair);

    match timeout(READ_GRACE, &mut pair).await {
        Ok(result) => result,
        Err(_) => {
            tracing::warn!(
                pid,
                "output streams still open after exit (backgrounded child?), killing process group"
            );
            kill_process_tree(pid);
            timeout(READ_GRACE, &mut pair).await.unwrap_or_default()
        }
    }
}

fn kill_process_tree(pid: u32) {
    if pid == 0 {
        tracing::error!("refusing to kill process group 0 (would target the agent itself)");
        return;
    }
    unsafe {
        libc::kill(-(pid as i32), libc::SIGKILL);
    }
}

#[cfg(test)]
mod tests {
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
}
