mod process;
mod run_as_user;

use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};

use anyhow::{anyhow, Result};

use crate::executor::env::apply_env_vars;
use crate::executor::tempfile::{temp_script_name, TempFileGuard};
use crate::executor::{ExecResult, ScriptParams};

use process::execute_with_timeout;
use run_as_user::{configure_preexec, resolve_run_as, RunAs};

pub async fn execute_script(params: ScriptParams<'_>) -> ExecResult {
    let run_as = match resolve_run_as(params.privilege).await {
        Ok(run_as) => run_as,
        Err(e) => return spawn_error(e),
    };

    let code = normalize_line_endings(params.code);

    let tmp_file = match create_temp_script(&code, &run_as) {
        Ok(path) => path,
        Err(e) => return spawn_error(e),
    };
    let _cleanup = TempFileGuard {
        path: tmp_file.clone(),
    };

    let mut cmd = build_script_command(&tmp_file, params.args);
    apply_env_vars(&mut cmd, params.env_vars);

    if let Err(e) = configure_preexec(&mut cmd, &run_as) {
        return spawn_error(e);
    }

    execute_with_timeout(cmd, params.timeout_secs).await
}

fn spawn_error(e: anyhow::Error) -> ExecResult {
    ExecResult {
        stdout: String::new(),
        stderr: e.to_string(),
        retcode: 85,
        timed_out: false,
    }
}

fn normalize_line_endings(code: &str) -> String {
    code.replace("\r\n", "\n")
}

fn create_temp_script(code: &str, run_as: &RunAs) -> Result<PathBuf> {
    let exe = std::env::current_exe().map_err(|e| anyhow!("failed to resolve executable: {e}"))?;
    let dir = exe
        .parent()
        .ok_or_else(|| anyhow!("executable has no parent directory"))?;

    let path = dir.join(temp_script_name("sh"));
    std::fs::write(&path, code.as_bytes())
        .map_err(|e| anyhow!("failed to write temp script: {e}"))?;
    std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o700))
        .map_err(|e| anyhow!("failed to set temp script permissions: {e}"))?;

    if let RunAs::User(user) = run_as {
        std::os::unix::fs::chown(&path, Some(user.uid), Some(user.gid))
            .map_err(|e| anyhow!("failed to chown temp script to {}: {e}", user.username))?;
    }

    Ok(path)
}

fn build_script_command(script_path: &Path, args: &[String]) -> tokio::process::Command {
    let mut cmd = tokio::process::Command::new(script_path);
    cmd.args(args);
    cmd
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn run(code: &str, args: &[String], env: &[String]) -> ExecResult {
        execute_script(ScriptParams {
            code,
            shell: "/bin/sh",
            args,
            timeout_secs: 30,
            privilege: crate::executor::Privilege::Agent,
            env_vars: env,
        })
        .await
    }

    #[tokio::test]
    async fn happy_path() {
        let r = run("#!/bin/sh\necho hi\n", &[], &[]).await;
        assert_eq!(r.stdout, "hi\n");
        assert_eq!(r.retcode, 0);
        assert!(!r.timed_out);
    }

    #[tokio::test]
    async fn script_exit_code() {
        let r = run("#!/bin/sh\nexit 42\n", &[], &[]).await;
        assert_eq!(r.retcode, 42);
    }

    #[tokio::test]
    async fn stderr_captured() {
        let r = run("#!/bin/sh\necho err 1>&2\n", &[], &[]).await;
        assert_eq!(r.stdout, "");
        assert_eq!(r.stderr, "err\n");
    }

    #[tokio::test]
    async fn raw_no_trailing_newline() {
        let r = run("#!/bin/sh\nprintf hi\n", &[], &[]).await;
        assert_eq!(r.stdout, "hi");
    }

    #[tokio::test]
    async fn raw_preserves_crlf_in_output() {
        let r = run("#!/bin/sh\nprintf 'a\\r\\nb'\n", &[], &[]).await;
        assert_eq!(r.stdout, "a\r\nb");
    }

    #[tokio::test]
    async fn passes_args() {
        let args = vec!["x".to_string(), "y".to_string()];
        let r = run("#!/bin/sh\necho \"$1 $2\"\n", &args, &[]).await;
        assert_eq!(r.stdout, "x y\n");
    }

    #[tokio::test]
    async fn applies_env_vars() {
        let env = vec!["FOO=bar".to_string()];
        let r = run("#!/bin/sh\nprintf '%s' \"$FOO\"\n", &[], &env).await;
        assert_eq!(r.stdout, "bar");
    }

    #[tokio::test]
    async fn env_value_with_equals() {
        let env = vec!["K=a=b".to_string()];
        let r = run("#!/bin/sh\nprintf '%s' \"$K\"\n", &[], &env).await;
        assert_eq!(r.stdout, "a=b");
    }

    #[tokio::test]
    async fn crlf_in_code_normalized() {
        let r = run("#!/bin/sh\r\necho hi\r\n", &[], &[]).await;
        assert_eq!(r.stdout, "hi\n");
        assert_eq!(r.retcode, 0);
    }

    #[tokio::test]
    async fn no_shebang_runs_via_sh() {
        let r = run("echo hi\n", &[], &[]).await;
        assert_eq!(r.stdout, "hi\n");
        assert_eq!(r.retcode, 0);
    }

    #[tokio::test]
    async fn bad_shebang_interpreter_fails() {
        let r = run("#!/nonexistent/ofcmd-bad-interp\necho hi\n", &[], &[]).await;
        assert_eq!(r.retcode, 85);
    }

    #[tokio::test]
    async fn empty_code_runs_empty() {
        let r = run("", &[], &[]).await;
        assert_eq!(r.retcode, 0);
        assert_eq!(r.stdout, "");
    }
}
