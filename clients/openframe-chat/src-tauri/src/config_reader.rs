#[derive(Debug, Clone, Default)]
pub struct AppConfig {
    pub token_path: Option<String>,
    pub secret: Option<String>,
    pub server_url: Option<String>,
    pub debug_mode: bool,
}

impl AppConfig {
    /// Reads configuration from system preferences (macOS) or returns default (other platforms).
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
            Self::default()
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
