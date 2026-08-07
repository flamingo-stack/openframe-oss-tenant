use std::os::unix::process::ExitStatusExt;
use std::process::Stdio;

use tokio::process::Command;
use tokio::time::{timeout, Duration};

use crate::executor::output::{clean_string, join_reads, read_capped};
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
            let (out, err) =
                join_reads(stdout_task, stderr_task, READ_GRACE, || kill_process_tree(pid))
                    .await;
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
            let (out, err) =
                join_reads(stdout_task, stderr_task, READ_GRACE, || kill_process_tree(pid))
                    .await;
            ExecResult {
                stdout: clean_string(&out),
                stderr: format!("{}\n{}", clean_string(&err), e),
                retcode: 1,
                timed_out: false,
            }
        }
        Err(_) => {
            kill_process_tree(pid);
            let (out, err) =
                join_reads(stdout_task, stderr_task, READ_GRACE, || kill_process_tree(pid))
                    .await;
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
#[path = "process_tests.rs"]
mod tests;

