use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;

use anyhow::{Context, Result};
use tracing::{info, warn};
use winreg::{enums::HKEY_LOCAL_MACHINE, RegKey};

// 64-bit HKLM Run key — where we register a GuiApp for per-user autostart at logon.
const AUTORUN_KEY_PATH: &str = r"Software\Microsoft\Windows\CurrentVersion\Run";
// 32-bit (WOW64) mirror — checked only to delete any stale entry; Windows fires both at logon.
const AUTORUN_KEY_WOW64_PATH: &str = r"Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run";

// Persistent per-tool config store, read by the tool as a fallback when launched without CLI args.
const APP_CONFIG_KEY_BASE: &str = r"SOFTWARE\OpenFrame";

/// Convert a Rust `&str` to a null-terminated UTF-16 buffer suitable for passing to Win32 wide APIs.
pub(crate) fn to_wide(s: &str) -> Vec<u16> {
    use std::iter::once;
    OsStr::new(s).encode_wide().chain(once(0)).collect()
}

pub(crate) fn wcslen(ptr: *const u16) -> usize {
    let mut len = 0;
    unsafe {
        while *ptr.add(len) != 0 {
            len += 1;
        }
    }
    len
}

pub(crate) fn build_command_line(command_path: &str, args: &[String]) -> String {
    fn needs_quoting(arg: &str) -> bool {
        arg.is_empty() || arg.contains(' ') || arg.contains('\t') || arg.contains('"')
    }

    fn escape_arg(arg: &str, quote: bool) -> String {
        if !quote {
            // Unquoted args preserve backslashes as-is
            return arg.to_string();
        }

        let mut result = String::new();
        let mut backslash_count = 0;

        for ch in arg.chars() {
            if ch == '\\' {
                backslash_count += 1;
            } else if ch == '"' {
                // Emit 2*N+1 backslashes before the quote to escape both the backslashes and the quote
                result.push_str(&"\\".repeat(backslash_count * 2 + 1));
                result.push('"');
                backslash_count = 0;
            } else {
                // Emit any pending backslashes as-is
                result.push_str(&"\\".repeat(backslash_count));
                result.push(ch);
                backslash_count = 0;
            }
        }

        // At end of quoted arg: emit 2*N backslashes for trailing backslashes
        result.push_str(&"\\".repeat(backslash_count * 2));
        result
    }

    let mut cmdline = format!("\"{}\"", command_path);
    for arg in args {
        cmdline.push(' ');
        let quote = needs_quoting(arg);
        if quote {
            cmdline.push('"');
            cmdline.push_str(&escape_arg(arg, true));
            cmdline.push('"');
        } else {
            cmdline.push_str(&escape_arg(arg, false));
        }
    }
    cmdline
}

/// Register `value_name` under the 64-bit HKLM Run key so Windows launches `command_path`
/// Also deletes any entry from the WOW6432Node mirror to avoid double-launch
pub(crate) fn register_autorun(value_name: &str, command_path: &str, args: &[String]) -> Result<()> {
    let cmdline = build_command_line(command_path, args);
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

    // Write to the 64-bit Run key with KEY_WOW64_64KEY flag
    let (key, _disp) = hklm
        .create_subkey_with_flags(
            AUTORUN_KEY_PATH,
            winreg::enums::KEY_READ | winreg::enums::KEY_WRITE | winreg::enums::KEY_WOW64_64KEY,
        )
        .with_context(|| format!("Failed to open/create HKLM\\{}", AUTORUN_KEY_PATH))?;
    let needs_write = match key.get_value::<String, _>(value_name) {
        Ok(existing) => existing != cmdline,
        Err(_) => true,
    };
    if needs_write {
        key.set_value(value_name, &cmdline)
            .with_context(|| format!("Failed to set HKLM\\{}\\{}", AUTORUN_KEY_PATH, value_name))?;
        info!("Wrote Run-key entry: HKLM\\{} :: {} = {}", AUTORUN_KEY_PATH, value_name, cmdline);
    }

    // Delete any entry from the WOW6432Node mirror
    if let Ok(wow_key) = hklm.open_subkey_with_flags(
        AUTORUN_KEY_WOW64_PATH,
        winreg::enums::KEY_READ | winreg::enums::KEY_WRITE,
    ) {
        if wow_key.get_value::<String, _>(value_name).is_ok() {
            if let Err(e) = wow_key.delete_value(value_name) {
                warn!("Failed to delete stale Run-key entry: HKLM\\{}\\{}: {:#}", AUTORUN_KEY_WOW64_PATH, value_name, e);
            } else {
                info!("Deleted stale Run-key entry: HKLM\\{}\\{}", AUTORUN_KEY_WOW64_PATH, value_name);
            }
        }
    }

    Ok(())
}

/// Persist a tool's resolved launch args under `HKLM\SOFTWARE\OpenFrame\<value_name>` so the tool
/// can recover its configuration when Windows relaunches it without CLI arguments.
/// `["--serverUrl", "https://...", "--devMode"]` -> values `serverUrl = https://...`, `devMode = 1`.
pub(crate) fn write_app_config(value_name: &str, args: &[String]) -> Result<()> {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let path = format!(r"{}\{}", APP_CONFIG_KEY_BASE, value_name);
    let (key, _disp) = hklm
        .create_subkey_with_flags(
            &path,
            winreg::enums::KEY_WRITE | winreg::enums::KEY_WOW64_64KEY,
        )
        .with_context(|| format!("Failed to open/create HKLM\\{}", path))?;

    let mut i = 0;
    let mut count = 0;
    while i < args.len() {
        if let Some(k) = args[i].strip_prefix("--") {
            let v = match args.get(i + 1) {
                Some(val) if !val.starts_with("--") => {
                    i += 2;
                    val.as_str()
                }
                _ => {
                    i += 1;
                    "1"
                }
            };
            key.set_value(k, &v)
                .with_context(|| format!("Failed to set HKLM\\{}\\{}", path, k))?;
            count += 1;
        } else {
            i += 1;
        }
    }

    info!("Wrote app config: HKLM\\{} ({} keys)", path, count);
    Ok(())
}

/// Remove `value_name` from both HKLM Run key views
pub(crate) fn unregister_autorun(value_name: &str) {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);

    // Delete from 64-bit Run key with KEY_WOW64_64KEY flag
    if let Ok(key) = hklm.open_subkey_with_flags(
        AUTORUN_KEY_PATH,
        winreg::enums::KEY_READ | winreg::enums::KEY_WRITE | winreg::enums::KEY_WOW64_64KEY,
    ) {
        if key.get_value::<String, _>(value_name).is_ok() {
            match key.delete_value(value_name) {
                Ok(()) => info!("Deleted Run-key entry: HKLM\\{}\\{}", AUTORUN_KEY_PATH, value_name),
                Err(e) => warn!("Failed to delete Run-key entry: HKLM\\{}\\{}: {:#}", AUTORUN_KEY_PATH, value_name, e),
            }
        }
    }

    // Delete from WOW6432Node mirror
    if let Ok(key) = hklm.open_subkey_with_flags(
        AUTORUN_KEY_WOW64_PATH,
        winreg::enums::KEY_READ | winreg::enums::KEY_WRITE,
    ) {
        if key.get_value::<String, _>(value_name).is_ok() {
            match key.delete_value(value_name) {
                Ok(()) => info!("Deleted Run-key entry: HKLM\\{}\\{}", AUTORUN_KEY_WOW64_PATH, value_name),
                Err(e) => warn!("Failed to delete Run-key entry: HKLM\\{}\\{}: {:#}", AUTORUN_KEY_WOW64_PATH, value_name, e),
            }
        }
    }
}
