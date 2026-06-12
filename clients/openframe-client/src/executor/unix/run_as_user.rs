use std::ffi::CString;
use std::path::PathBuf;

use anyhow::{anyhow, Result};
use nix::unistd::User;
use tokio::process::Command;

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

pub(crate) fn resolve_run_as(requested: Option<&str>) -> Result<RunAs> {
    match requested.map(str::trim).filter(|name| !name.is_empty()) {
        None => Ok(RunAs::Current),
        Some(name) => Ok(RunAs::User(lookup_user(name)?)),
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
                libc::initgroups(username.as_ptr(), gid as _);
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
    use crate::executor::{execute_script, ScriptParams};

    fn current_uid() -> u32 {
        unsafe { libc::geteuid() }
    }

    fn current_username() -> String {
        User::from_uid(nix::unistd::Uid::from_raw(current_uid()))
            .unwrap()
            .unwrap()
            .name
    }

    #[test]
    fn resolve_none_is_current() {
        assert!(matches!(resolve_run_as(None).unwrap(), RunAs::Current));
    }

    #[test]
    fn resolve_blank_is_current() {
        assert!(matches!(
            resolve_run_as(Some("   ")).unwrap(),
            RunAs::Current
        ));
    }

    #[test]
    fn resolve_unknown_user_errors() {
        assert!(resolve_run_as(Some("ofcmd_no_such_user_xyz")).is_err());
    }

    #[tokio::test]
    async fn unknown_user_hard_fails() {
        let r = execute_script(ScriptParams {
            code: "#!/bin/sh\necho hi\n",
            shell: "/bin/sh",
            args: &[],
            timeout_secs: 30,
            run_as_user: Some("ofcmd_no_such_user_xyz"),
            env_vars: &[],
        })
        .await;
        assert_eq!(r.retcode, 85);
    }

    #[tokio::test]
    async fn current_user_is_noop() {
        let name = current_username();
        let r = execute_script(ScriptParams {
            code: "#!/bin/sh\necho hi\n",
            shell: "/bin/sh",
            args: &[],
            timeout_secs: 30,
            run_as_user: Some(&name),
            env_vars: &[],
        })
        .await;
        assert_eq!(r.stdout, "hi\n");
        assert_eq!(r.retcode, 0);
    }

    #[tokio::test]
    async fn non_root_switch_preflight_fails() {
        if current_uid() == 0 {
            return;
        }
        let r = execute_script(ScriptParams {
            code: "#!/bin/sh\necho hi\n",
            shell: "/bin/sh",
            args: &[],
            timeout_secs: 30,
            run_as_user: Some("root"),
            env_vars: &[],
        })
        .await;
        assert_eq!(r.retcode, 85);
    }

    #[tokio::test]
    #[ignore = "requires root"]
    async fn runs_as_named_user() {
        let r = execute_script(ScriptParams {
            code: "#!/bin/sh\nid -un\n",
            shell: "/bin/sh",
            args: &[],
            timeout_secs: 30,
            run_as_user: Some("nobody"),
            env_vars: &[],
        })
        .await;
        assert_eq!(r.retcode, 0);
        assert_eq!(r.stdout.trim(), "nobody");
    }

    #[tokio::test]
    #[ignore = "requires root"]
    async fn named_user_env_is_set() {
        let r = execute_script(ScriptParams {
            code: "#!/bin/sh\nprintf '%s' \"$USER\"\n",
            shell: "/bin/sh",
            args: &[],
            timeout_secs: 30,
            run_as_user: Some("nobody"),
            env_vars: &[],
        })
        .await;
        assert_eq!(r.stdout, "nobody");
    }

    #[tokio::test]
    #[ignore = "requires root"]
    async fn named_user_drops_privilege() {
        let r = execute_script(ScriptParams {
            code: "#!/bin/sh\nid -u\n",
            shell: "/bin/sh",
            args: &[],
            timeout_secs: 30,
            run_as_user: Some("nobody"),
            env_vars: &[],
        })
        .await;
        let uid: u32 = r.stdout.trim().parse().unwrap();
        assert_ne!(uid, 0);
    }
}
