use anyhow::{Context, Result};
use std::process::Command as StdCommand;
use std::process::Stdio;
use tokio::process::Command;
use tracing::{info, warn};

#[derive(Debug, Clone)]
pub struct ConsoleUser {
    pub username: String,
    pub uid: u32,
}

pub fn get_console_user() -> Option<ConsoleUser> {
    // Get username from /dev/console owner
    let output = StdCommand::new("stat")
        .args(["-f", "%Su", "/dev/console"])
        .output()
        .ok()?;

    let username = String::from_utf8_lossy(&output.stdout).trim().to_string();

    if username.is_empty() || username == "root" {
        warn!("No regular user at console (got: '{}')", username);
        return None;
    }

    let uid_output = StdCommand::new("id")
        .args(["-u", &username])
        .output()
        .ok()?;

    let uid: u32 = String::from_utf8_lossy(&uid_output.stdout)
        .trim()
        .parse()
        .ok()?;

    info!("Console user: {} (UID: {})", username, uid);
    Some(ConsoleUser { username, uid })
}

pub async fn launch_as_user(
    executable: &str,
    args: &[String],
    user: &ConsoleUser,
) -> Result<tokio::process::Child> {
    if !std::path::Path::new(executable).exists() {
        anyhow::bail!("Executable not found: {}", executable);
    }

    match launch_via_launchctl(executable, args, user.uid).await {
        Ok(child) => return Ok(child),
        Err(e) => {
            warn!("launchctl asuser failed: {:#}, trying sudo -u", e);
        }
    }

    launch_via_sudo(executable, args, &user.username).await
}

async fn launch_via_launchctl(
    executable: &str,
    args: &[String],
    uid: u32,
) -> Result<tokio::process::Child> {
    info!("Launching via launchctl asuser {}: {}", uid, executable);

    let child = Command::new("launchctl")
        .arg("asuser")
        .arg(uid.to_string())
        .arg(executable)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .with_context(|| format!("launchctl asuser {} failed", uid))?;

    info!("Spawned via launchctl, PID: {:?}", child.id());
    Ok(child)
}

async fn launch_via_sudo(
    executable: &str,
    args: &[String],
    username: &str,
) -> Result<tokio::process::Child> {
    info!("Launching via sudo -u {}: {}", username, executable);

    let child = Command::new("sudo")
        .arg("-u")
        .arg(username)
        .arg(executable)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .with_context(|| format!("sudo -u {} failed", username))?;

    info!("Spawned via sudo, PID: {:?}", child.id());
    Ok(child)
}
