use std::ffi::CString;
use std::path::PathBuf;

use anyhow::{anyhow, Result};
use nix::unistd::User;
use tokio::process::Command;

use crate::executor::Privilege;

pub(crate) enum RunAs {
    Current,
    User(UserInfo),
}

pub(crate) struct UserInfo {
    pub username: String,
    pub uid: u32,
    pub gid: u32,
    pub home_dir: PathBuf,
}

pub(crate) async fn resolve_run_as(privilege: Privilege) -> Result<RunAs> {
    match privilege {
        Privilege::Agent => Ok(RunAs::Current),
        Privilege::User => Ok(RunAs::User(lookup_user(&resolve_active_user().await?)?)),
    }
}

fn lookup_user(username: &str) -> Result<UserInfo> {
    let user = User::from_name(username)
        .map_err(|e| anyhow!("failed to look up user '{username}': {e}"))?
        .ok_or_else(|| anyhow!("user '{username}' not found"))?;
    Ok(UserInfo {
        username: username.to_string(),
        uid: user.uid.as_raw(),
        gid: user.gid.as_raw(),
        home_dir: user.dir,
    })
}

#[cfg(target_os = "macos")]
async fn resolve_active_user() -> Result<String> {
    let output = Command::new("stat")
        .args(["-f", "%Su", "/dev/console"])
        .output()
        .await
        .map_err(|e| anyhow!("failed to query console user: {e}"))?;
    let user = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if user.is_empty() || user == "root" {
        return Err(anyhow!("no active interactive user (USER privilege)"));
    }
    Ok(user)
}

#[cfg(not(target_os = "macos"))]
async fn resolve_active_user() -> Result<String> {
    if let Ok(output) = Command::new("loginctl")
        .args(["list-sessions", "--no-legend"])
        .output()
        .await
    {
        let text = String::from_utf8_lossy(&output.stdout);
        for line in text.lines() {
            let fields: Vec<&str> = line.split_whitespace().collect();
            if fields.len() >= 4 && fields[3].starts_with("seat") {
                let user = fields[2];
                if !user.is_empty() && user != "root" {
                    return Ok(user.to_string());
                }
            }
        }
    }

    let output = Command::new("who")
        .output()
        .await
        .map_err(|e| anyhow!("failed to query active user: {e}"))?;
    String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter_map(|line| line.split_whitespace().next())
        .find(|user| !user.is_empty() && *user != "root")
        .map(|user| user.to_string())
        .ok_or_else(|| anyhow!("no active interactive user (USER privilege)"))
}

pub(crate) fn configure_preexec(cmd: &mut Command, run_as: &RunAs) -> Result<()> {
    let switch = match run_as {
        RunAs::Current => None,
        RunAs::User(user) => {
            let current = unsafe { libc::geteuid() };
            if user.uid == current {
                None
            } else if current != 0 {
                return Err(anyhow!(
                    "run_as_user '{}' requires the agent to run as root",
                    user.username
                ));
            } else {
                cmd.env("HOME", &user.home_dir);
                cmd.env("USER", &user.username);
                cmd.env("LOGNAME", &user.username);
                if user.home_dir.is_dir() {
                    cmd.current_dir(&user.home_dir);
                }
                Some((user.uid, user.gid, CString::new(user.username.as_bytes())?))
            }
        }
    };

    unsafe {
        cmd.pre_exec(move || {
            if libc::setpgid(0, 0) == -1 {
                return Err(std::io::Error::last_os_error());
            }
            if let Some((uid, gid, ref username)) = switch {
                if libc::initgroups(username.as_ptr(), gid as _) == -1 {
                    return Err(std::io::Error::last_os_error());
                }
                if libc::setgid(gid) == -1 {
                    return Err(std::io::Error::last_os_error());
                }
                if libc::setuid(uid) == -1 {
                    return Err(std::io::Error::last_os_error());
                }
            }
            Ok(())
        });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
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
}
