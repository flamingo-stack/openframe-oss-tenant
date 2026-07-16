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
mod tests {
    use super::*;

    #[test]
    fn resolves_powershell() {
        let i = resolve_interpreter("powershell").unwrap();
        assert!(
            i.exe.to_lowercase().ends_with("powershell.exe"),
            "exe was {:?}",
            i.exe
        );
        assert_eq!(i.ext, "ps1");
        assert_eq!(i.flags.last(), Some(&"-File"));
    }

    #[test]
    fn resolves_cmd() {
        let i = resolve_interpreter("cmd").unwrap();
        assert!(
            i.exe.to_lowercase().ends_with("cmd.exe"),
            "exe was {:?}",
            i.exe
        );
        assert_eq!(i.ext, "bat");
    }

    #[test]
    fn resolves_exe_to_absolute_system32() {
        let ps = resolve_interpreter("powershell").unwrap().exe;
        assert!(
            std::path::Path::new(&ps).is_absolute(),
            "expected absolute powershell path, got {ps:?}"
        );
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
            privilege: crate::executor::Privilege::Agent,
            env_vars: &[],
        })
        .await;
        assert_eq!(r.retcode, 85);
        assert!(r.stderr.contains("unsupported shell"));
    }

    async fn run(
        shell: &str,
        code: &str,
        args: &[String],
        env: &[String],
        timeout: u32,
    ) -> ExecResult {
        execute_script(ScriptParams {
            code,
            shell,
            args,
            timeout_secs: timeout,
            privilege: crate::executor::Privilege::Agent,
            env_vars: env,
        })
        .await
    }

    #[tokio::test]
    async fn powershell_happy_path() {
        let r = run("powershell", "Write-Output hi", &[], &[], 30).await;
        assert_eq!(r.retcode, 0, "stderr: {}", r.stderr);
        assert_eq!(r.stdout.trim_end(), "hi");
        assert!(!r.timed_out);
    }

    #[tokio::test]
    async fn cmd_happy_path() {
        let r = run("cmd", "@echo hi", &[], &[], 30).await;
        assert_eq!(r.retcode, 0, "stderr: {}", r.stderr);
        assert!(r.stdout.contains("hi"), "stdout: {:?}", r.stdout);
        assert!(!r.timed_out);
    }

    #[tokio::test]
    async fn cmd_exit_code() {
        let r = run("cmd", "@exit /b 42", &[], &[], 30).await;
        assert_eq!(r.retcode, 42);
    }

    #[tokio::test]
    async fn powershell_exit_code() {
        let r = run("powershell", "exit 42", &[], &[], 30).await;
        assert_eq!(
            r.retcode, 42,
            "stdout: {:?} stderr: {:?}",
            r.stdout, r.stderr
        );
    }

    #[tokio::test]
    async fn powershell_stderr_captured() {
        let r = run(
            "powershell",
            "[Console]::Error.WriteLine('boom')",
            &[],
            &[],
            30,
        )
        .await;
        assert!(r.stderr.contains("boom"), "stderr: {:?}", r.stderr);
    }

    #[tokio::test]
    async fn powershell_timeout_is_98() {
        let r = run("powershell", "Start-Sleep -Seconds 60", &[], &[], 2).await;
        assert_eq!(r.retcode, 98);
        assert!(r.timed_out);
    }

    #[tokio::test]
    async fn powershell_passes_args() {
        let args = vec!["alpha".to_string(), "beta".to_string()];
        let r = run(
            "powershell",
            "Write-Output \"$($args[0]) $($args[1])\"",
            &args,
            &[],
            30,
        )
        .await;
        assert_eq!(r.stdout.trim_end(), "alpha beta", "stderr: {}", r.stderr);
    }

    #[tokio::test]
    async fn powershell_applies_env_vars() {
        let env = vec!["FOO=bar".to_string()];
        let r = run("powershell", "Write-Output $env:FOO", &[], &env, 30).await;
        assert_eq!(r.stdout.trim_end(), "bar", "stderr: {}", r.stderr);
    }

    #[tokio::test]
    async fn cmd_applies_env_vars() {
        let env = vec!["FOO=bar".to_string()];
        let r = run("cmd", "@echo %FOO%", &[], &env, 30).await;
        assert_eq!(r.stdout.trim_end(), "bar", "stderr: {}", r.stderr);
    }

    #[tokio::test]
    async fn env_value_with_equals() {
        let env = vec!["K=a=b".to_string()];
        let r = run("powershell", "Write-Output $env:K", &[], &env, 30).await;
        assert_eq!(r.stdout.trim_end(), "a=b", "stderr: {}", r.stderr);
    }

    #[tokio::test]
    async fn empty_code_runs_ok() {
        let r = run("powershell", "", &[], &[], 30).await;
        assert_eq!(r.retcode, 0, "stderr: {}", r.stderr);
    }

    #[tokio::test]
    #[ignore = "spawns real child processes; run explicitly with --ignored"]
    async fn timeout_tree_kills_grandchild() {
        let marker = std::env::temp_dir().join(format!(
            "ofcmd_heartbeat_{}.txt",
            uuid::Uuid::new_v4().simple()
        ));
        let marker_ps = marker.to_string_lossy().replace('\'', "''");
        let code = format!(
            "$gc = '$m = ''{m}''; while ($true) {{ Set-Content -Path $m -Value ([DateTime]::UtcNow.Ticks); Start-Sleep -Milliseconds 200 }}'\n\
             Start-Process powershell -WindowStyle Hidden -ArgumentList '-NoProfile','-Command',$gc\n\
             Start-Sleep -Seconds 120\n",
            m = marker_ps
        );

        let r = run("powershell", &code, &[], &[], 3).await;
        assert_eq!(r.retcode, 98, "expected timeout; stderr: {}", r.stderr);
        assert!(r.timed_out);

        let mut waited = 0;
        while !marker.exists() && waited < 5000 {
            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
            waited += 100;
        }
        assert!(marker.exists(), "grandchild never wrote heartbeat marker");

        let first = std::fs::read_to_string(&marker).unwrap_or_default();
        tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
        let second = std::fs::read_to_string(&marker).unwrap_or_default();
        let _ = std::fs::remove_file(&marker);

        assert_eq!(
            first, second,
            "heartbeat still advancing after timeout — grandchild escaped the Job Object tree-kill"
        );
    }

    #[tokio::test]
    #[ignore = "context-dependent: asserts 85 only when agent is NOT SYSTEM"]
    async fn run_as_without_privilege_hard_fails_85() {
        let r = execute_script(ScriptParams {
            code: "Write-Output whoami",
            shell: "powershell",
            args: &[],
            timeout_secs: 30,
            privilege: crate::executor::Privilege::User,
            env_vars: &[],
        })
        .await;
        assert_eq!(
            r.retcode, 85,
            "expected hard-fail 85 (no silent fallback); got {} stdout={:?} stderr={:?}",
            r.retcode, r.stdout, r.stderr
        );
        assert!(
            r.stdout.is_empty(),
            "must not have run anything: {:?}",
            r.stdout
        );
    }

    #[tokio::test]
    #[ignore = "requires agent running as SYSTEM with an active interactive session"]
    async fn run_as_user_impersonates_interactive_user() {
        let r = execute_script(ScriptParams {
            code: "whoami",
            shell: "cmd",
            args: &[],
            timeout_secs: 30,
            privilege: crate::executor::Privilege::User,
            env_vars: &[],
        })
        .await;
        assert_eq!(r.retcode, 0, "stderr: {}", r.stderr);
        let who = r.stdout.trim().to_lowercase();
        assert!(
            !who.ends_with("\\system") && who != "nt authority\\system",
            "expected the interactive user, not SYSTEM; got {who:?}"
        );
    }

    #[tokio::test]
    #[ignore = "requires agent running as SYSTEM with an active interactive session"]
    async fn run_as_user_sees_env_vars() {
        let env = vec!["OF_RUNAS_PROBE=present".to_string()];
        let r = execute_script(ScriptParams {
            code: "Write-Output $env:OF_RUNAS_PROBE",
            shell: "powershell",
            args: &[],
            timeout_secs: 30,
            privilege: crate::executor::Privilege::User,
            env_vars: &env,
        })
        .await;
        assert_eq!(r.retcode, 0, "stderr: {}", r.stderr);
        assert_eq!(r.stdout.trim_end(), "present", "stderr: {}", r.stderr);
    }
}
