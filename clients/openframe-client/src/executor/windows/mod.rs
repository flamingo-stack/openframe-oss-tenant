mod job;
mod process;
mod run_as_user;

use std::path::{Path, PathBuf};
use std::time::Duration;

use anyhow::{anyhow, Result};

use crate::executor::tempfile::{temp_script_name, TempFileGuard};
use crate::executor::{ExecResult, ScriptParams};

pub(crate) struct Interpreter {
    pub exe: String,
    pub flags: &'static [&'static str],
    pub ext: &'static str,
}

pub async fn execute_script(params: ScriptParams<'_>) -> ExecResult {
    let interpreter = match resolve_interpreter(params.shell) {
        Some(interpreter) => interpreter,
        None => {
            return spawn_error(format!(
                "unsupported shell '{}' (expected powershell or cmd)",
                params.shell
            ))
        }
    };

    let wants_run_as = matches!(params.privilege, crate::executor::Privilege::User);

    let tmp_file = match create_temp_script(params.code, interpreter.ext) {
        Ok(path) => path,
        Err(e) => return spawn_error(e.to_string()),
    };
    let _cleanup = TempFileGuard {
        path: tmp_file.clone(),
    };

    if wait_until_readable(&tmp_file).await {
        return spawn_error("Script file locked by another process".to_string());
    }

    if wants_run_as {
        run_as_user::run_as_interactive(&interpreter, &tmp_file, &params).await
    } else {
        process::run_normal(&interpreter, &tmp_file, &params).await
    }
}

const SCRIPT_READY_RETRIES: u32 = 3;
const SCRIPT_READY_DELAY_MS: u64 = 200;

async fn wait_until_readable(path: &Path) -> bool {
    for attempt in 0..SCRIPT_READY_RETRIES {
        match std::fs::File::open(path) {
            Ok(_) => return false,
            Err(e) => {
                let locked = matches!(e.raw_os_error(), Some(32) | Some(33));
                let transient = locked || e.raw_os_error() == Some(5);
                if transient && attempt + 1 < SCRIPT_READY_RETRIES {
                    tracing::warn!(
                        attempt = attempt + 1,
                        error = %e,
                        path = %path.display(),
                        "script file not yet readable (antivirus scan lock?), waiting before launch"
                    );
                    tokio::time::sleep(Duration::from_millis(SCRIPT_READY_DELAY_MS)).await;
                    continue;
                }
                return locked;
            }
        }
    }
    false
}

fn spawn_error(msg: String) -> ExecResult {
    ExecResult {
        stdout: String::new(),
        stderr: msg,
        retcode: 85,
        timed_out: false,
    }
}

fn resolve_interpreter(shell: &str) -> Option<Interpreter> {
    match shell {
        "powershell" => Some(Interpreter {
            exe: resolve_exe(
                r"System32\WindowsPowerShell\v1.0\powershell.exe",
                "powershell.exe",
            ),
            flags: &[
                "-NonInteractive",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
            ],
            ext: "ps1",
        }),
        "cmd" => Some(Interpreter {
            exe: resolve_exe(r"System32\cmd.exe", "cmd.exe"),
            flags: &["/C"],
            ext: "bat",
        }),
        _ => None,
    }
}

fn resolve_exe(system32_rel: &str, bare: &str) -> String {
    let windir = std::env::var_os("WINDIR")
        .or_else(|| std::env::var_os("SystemRoot"))
        .map(PathBuf::from);
    if let Some(windir) = windir {
        let abs = windir.join(system32_rel);
        if abs.is_file() {
            return abs.to_string_lossy().into_owned();
        }
    }
    bare.to_string()
}

fn win_tmp_dir() -> Result<PathBuf> {
    let base = std::env::var_os("PROGRAMDATA")
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir);
    let dir = base.join("OpenFrame");
    std::fs::create_dir_all(&dir).map_err(|e| anyhow!("failed to create temp dir: {e}"))?;
    Ok(dir)
}

fn create_temp_script(code: &str, ext: &str) -> Result<PathBuf> {
    let dir = win_tmp_dir()?;
    let path = dir.join(temp_script_name(ext));
    std::fs::write(&path, code.as_bytes())
        .map_err(|e| anyhow!("failed to write temp script: {e}"))?;
    Ok(path)
}

#[cfg(test)]
#[path = "mod_tests.rs"]
mod tests;
