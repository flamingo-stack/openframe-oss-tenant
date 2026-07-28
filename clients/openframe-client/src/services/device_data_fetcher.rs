use std::net::TcpStream;
use std::panic;
use tracing::{info, warn, debug};

#[derive(Clone)]
pub struct DeviceDataFetcher;

impl DeviceDataFetcher {
    pub fn new() -> Self {
        Self
    }

    pub fn get_hostname(&self) -> Option<String> {
        match hostname::get() {
            Ok(hostname) => {
                let hostname_str = hostname.to_string_lossy().trim().to_string();
                if Self::is_valid_hostname(&hostname_str) {
                    info!("Resolved hostname '{}' from kernel", hostname_str);
                    return Some(hostname_str);
                }
                warn!(
                    "Kernel hostname '{}' is empty or looks like junk — falling back",
                    hostname_str
                );
            }
            Err(e) => {
                warn!("Failed to get hostname: {:#}", e);
            }
        }

        #[cfg(target_os = "macos")]
        {
            if let Some(name) = Self::scutil_get("LocalHostName") {
                let name = format!("{}.local", name);
                if Self::is_valid_hostname(&name) {
                    info!("Resolved hostname '{}' from LocalHostName", name);
                    return Some(name);
                }
                warn!("LocalHostName '{}' is invalid — falling back", name);
            }
            if let Some(name) = Self::scutil_get("ComputerName") {
                if Self::is_valid_hostname(&name) {
                    info!("Resolved hostname '{}' from ComputerName", name);
                    return Some(name);
                }
                warn!("ComputerName '{}' is invalid — falling back", name);
            }
        }

        warn!("Could not resolve any hostname");
        None
    }

    fn is_valid_hostname(name: &str) -> bool {
        if name.is_empty() {
            return false;
        }
        if name.parse::<std::net::IpAddr>().is_ok() {
            return false;
        }
        let lower = name.to_lowercase();
        lower != "localhost" && lower != "localhost.localdomain"
    }

    #[cfg(target_os = "macos")]
    fn scutil_get(key: &str) -> Option<String> {
        let output = std::process::Command::new("/usr/sbin/scutil")
            .args(["--get", key])
            .output()
            .map_err(|e| warn!("Failed to run scutil --get {}: {:#}", key, e))
            .ok()?;

        if !output.status.success() {
            warn!(
                "scutil --get {} failed: {}",
                key,
                String::from_utf8_lossy(&output.stderr).trim()
            );
            return None;
        }

        let value = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if value.is_empty() { None } else { Some(value) }
    }

    pub fn get_agent_version(&self) -> Option<String> {
        let version = env!("OPENFRAME_VERSION").to_string();
        info!("Agent version: {}", version);
        Some(version)
    }

    pub fn get_os_type(&self) -> String {
        if cfg!(target_os = "windows") {
            "WINDOWS".to_string()
        } else {
            "MAC_OS".to_string()
        }
    }
} 