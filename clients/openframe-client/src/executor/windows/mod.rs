mod job;
mod process;
mod run_as_user;

use std::path::PathBuf;

use anyhow::{anyhow, Result};

use crate::executor::tempfile::{temp_script_name, TempFileGuard};
use crate::executor::{ExecResult, ScriptParams};

pub(crate) struct Interpreter {
    pub exe: &'static str,
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

    let wants_run_as = params
        .run_as_user
        .map(str::trim)
        .filter(|name| !name.is_empty())
        .is_some();

    let tmp_file = match create_temp_script(params.code, interpreter.ext) {
        Ok(path) => path,
        Err(e) => return spawn_error(e.to_string()),
    };
    let _cleanup = TempFileGuard {
        path: tmp_file.clone(),
    };

    if wants_run_as {
        run_as_user::run_as_interactive(&interpreter, &tmp_file, &params).await
    } else {
        process::run_normal(&interpreter, &tmp_file, &params).await
    }
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
            exe: "powershell.exe",
            flags: &[
                "-NonInteractive",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
            ],
            ext: "ps1",
        }),
        "cmd" => Some(Interpreter {
            exe: "cmd.exe",
            flags: &["/C"],
            ext: "bat",
        }),
        _ => None,
    }
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
mod tests {
    use super::*;

    #[test]
    fn resolves_powershell() {
        let i = resolve_interpreter("powershell").unwrap();
        assert_eq!(i.exe, "powershell.exe");
        assert_eq!(i.ext, "ps1");
    }

    #[test]
    fn resolves_cmd() {
        let i = resolve_interpreter("cmd").unwrap();
        assert_eq!(i.exe, "cmd.exe");
        assert_eq!(i.ext, "bat");
    }

    #[test]
    fn rejects_unknown_shell() {
        assert!(resolve_interpreter("bash").is_none());
        assert!(resolve_interpreter("").is_none());
    }

    #[tokio::test]
    async fn unknown_shell_is_85() {
        let r = execute_script(ScriptParams {
            code: "echo hi",
            shell: "bash",
            args: &[],
            timeout_secs: 30,
            run_as_user: None,
            env_vars: &[],
        })
        .await;
        assert_eq!(r.retcode, 85);
        assert!(r.stderr.contains("unsupported shell"));
    }
}
