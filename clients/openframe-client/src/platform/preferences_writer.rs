#[cfg(target_os = "macos")]
use anyhow::{Context, Result};
#[cfg(target_os = "macos")]
use std::process::Command;

#[cfg(target_os = "macos")]
use crate::platform::user_session::get_console_user;

#[cfg(target_os = "macos")]
pub fn write<'a>(
    bundle_id: &str,
    prefs: impl IntoIterator<Item = (&'a str, &'a str)>,
) -> Result<()> {
    let user = get_console_user().context("No console user found")?;
    let prefs: Vec<_> = prefs.into_iter().collect();

    if prefs.is_empty() {
        return Ok(());
    }

    for (key, value) in &prefs {
        let status = Command::new("sudo")
            .args(["-u", &user.username, "defaults", "write", bundle_id, key, value])
            .status()
            .with_context(|| format!("Failed to write preference '{}'", key))?;

        if !status.success() {
            anyhow::bail!("defaults write failed for '{}': exit {}", key, status);
        }
    }

    Ok(())
}

#[cfg(not(target_os = "macos"))]
pub fn write<'a>(
    _bundle_id: &str,
    _prefs: impl IntoIterator<Item = (&'a str, &'a str)>,
) -> anyhow::Result<()> {
    Ok(())
}

/// Converts CLI-style args to key-value pairs.
/// `["--serverUrl", "https://...", "--devMode"]` -> `[("serverUrl", "https://..."), ("devMode", "1")]`
pub fn args_to_pairs(args: &[String]) -> Vec<(&str, &str)> {
    let mut result = Vec::new();
    let mut i = 0;

    while i < args.len() {
        if let Some(key) = args[i].strip_prefix("--") {
            match args.get(i + 1).filter(|v| !v.starts_with("--")) {
                Some(value) => {
                    result.push((key, value.as_str()));
                    i += 2;
                }
                None => {
                    result.push((key, "1"));
                    i += 1;
                }
            }
        } else {
            i += 1;
        }
    }

    result
}
