#[derive(Debug, Clone, Default)]
pub struct AppConfig {
    pub token_path: Option<String>,
    pub secret: Option<String>,
    pub server_url: Option<String>,
    pub debug_mode: bool,
}

impl AppConfig {
    /// Reads configuration from system preferences (macOS) or CLI arguments (other platforms).
    pub fn from_preferences() -> Self {
        #[cfg(target_os = "macos")]
        let cfg = Self {
            token_path: macos::read_string("openframe-token-path"),
            secret: macos::read_string("openframe-secret"),
            server_url: macos::read_string("serverUrl"),
            debug_mode: macos::read_bool("devMode"),
        };

        #[cfg(not(target_os = "macos"))]
        let cfg = {
            let args: Vec<String> = std::env::args().collect();
            #[allow(unused_mut)]
            let mut cfg = Self::from_args(&args);
            #[cfg(windows)]
            if !cfg.is_valid() {
                cfg.fill_missing_from_registry();
            }
            cfg
        };

        println!(
            "[startup] config_reader: loaded (token_path: {}, secret: {}, server_url: {}, debug: {})",
            cfg.token_path.is_some(),
            cfg.secret.is_some(),
            cfg.server_url.is_some(),
            cfg.debug_mode,
        );

        cfg
    }

    /// Parses configuration from a list of CLI-style arguments.
    pub fn from_args(args: &[String]) -> Self {
        let mut token_path: Option<String> = None;
        let mut secret: Option<String> = None;
        let mut server_url: Option<String> = None;
        let mut debug_mode = false;

        for i in 0..args.len() {
            if args[i] == "--openframe-token-path" && i + 1 < args.len() {
                token_path = Some(args[i + 1].clone());
            } else if args[i] == "--openframe-secret" && i + 1 < args.len() {
                secret = Some(args[i + 1].clone());
            } else if args[i] == "--serverUrl" && i + 1 < args.len() {
                server_url = Some(args[i + 1].clone());
            } else if args[i] == "--devMode" {
                debug_mode = true;
            }
        }

        Self {
            token_path,
            secret,
            server_url,
            debug_mode,
        }
    }

    #[cfg(windows)]
    fn fill_missing_from_registry(&mut self) {
        if self.token_path.is_none() {
            self.token_path = windows::read_string("openframe-token-path");
        }
        if self.secret.is_none() {
            self.secret = windows::read_string("openframe-secret");
        }
        if self.server_url.is_none() {
            self.server_url = windows::read_string("serverUrl");
        }
        if !self.debug_mode {
            self.debug_mode = windows::read_bool("devMode");
        }
    }

    /// Returns true if all required fields are present.
    pub fn is_valid(&self) -> bool {
        self.token_path.is_some() && self.secret.is_some() && self.server_url.is_some()
    }
}

#[cfg(target_os = "macos")]
mod macos {
    use std::process::Command;

    const BUNDLE_ID: &str = "com.openframe.chat";

    pub fn read_string(key: &str) -> Option<String> {
        let output = match Command::new("defaults")
            .args(["read", BUNDLE_ID, key])
            .output()
        {
            Ok(out) => out,
            Err(e) => {
                eprintln!(
                    "[startup] config_reader: spawning 'defaults read {} {}' failed: {}",
                    BUNDLE_ID, key, e
                );
                return None;
            }
        };

        if !output.status.success() {
            eprintln!(
                "[startup] config_reader: 'defaults read {} {}' returned non-zero exit",
                BUNDLE_ID, key
            );
            return None;
        }

        let value = String::from_utf8_lossy(&output.stdout)
            .trim()
            .to_string();

        if value.is_empty() { None } else { Some(value) }
    }

    pub fn read_bool(key: &str) -> bool {
        read_string(key)
            .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
            .unwrap_or(false)
    }
}

#[cfg(windows)]
mod windows {
    use winreg::enums::{HKEY_LOCAL_MACHINE, KEY_READ, KEY_WOW64_64KEY};
    use winreg::RegKey;

    const CONFIG_KEY_PATH: &str = r"SOFTWARE\OpenFrame\openframe-chat";

    pub fn read_string(key: &str) -> Option<String> {
        let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
        let subkey = hklm
            .open_subkey_with_flags(CONFIG_KEY_PATH, KEY_READ | KEY_WOW64_64KEY)
            .ok()?;
        let value: String = subkey.get_value(key).ok()?;
        let value = value.trim().to_string();
        if value.is_empty() {
            None
        } else {
            Some(value)
        }
    }

    pub fn read_bool(key: &str) -> bool {
        read_string(key)
            .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
            .unwrap_or(false)
    }
}
