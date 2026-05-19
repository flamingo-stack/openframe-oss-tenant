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
        let cfg = Self::from_cli_args();

        println!(
            "[startup] config_reader: loaded (token_path: {}, secret: {}, server_url: {}, debug: {})",
            cfg.token_path.is_some(),
            cfg.secret.is_some(),
            cfg.server_url.is_some(),
            cfg.debug_mode,
        );

        cfg
    }

    /// Parses configuration from command line arguments (for Windows/Linux).
    #[cfg(not(target_os = "macos"))]
    fn from_cli_args() -> Self {
        let args: Vec<String> = std::env::args().collect();

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
