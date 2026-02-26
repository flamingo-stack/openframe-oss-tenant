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
        {
            Self {
                token_path: macos::read_string("openframe-token-path"),
                secret: macos::read_string("openframe-secret"),
                server_url: macos::read_string("serverUrl"),
                debug_mode: macos::read_bool("devMode"),
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            Self::from_cli_args()
        }
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
        let output = Command::new("defaults")
            .args(["read", BUNDLE_ID, key])
            .output()
            .ok()?;

        if !output.status.success() {
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
