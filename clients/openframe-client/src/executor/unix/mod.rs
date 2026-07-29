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
#[path = "mod_tests.rs"]
mod tests;
