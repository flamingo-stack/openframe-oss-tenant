use std::net::{TcpStream, ToSocketAddrs};
use std::path::Path;
use std::time::Duration;

use super::{CheckCategory, CheckResult};
use crate::installation_initial_config_service::InstallConfigParams;
use crate::platform::permissions::PermissionUtils;

pub fn check_required_args(params: &InstallConfigParams) -> CheckResult {
    let mut missing = Vec::new();
    if params.server_url.as_ref().map_or(true, |s| s.trim().is_empty()) {
        missing.push("--serverUrl");
    }
    if params.initial_key.as_ref().map_or(true, |s| s.trim().is_empty()) {
        missing.push("--initialKey");
    }
    if params.org_id.as_ref().map_or(true, |s| s.trim().is_empty()) {
        missing.push("--orgId");
    }

    if missing.is_empty() {
        CheckResult::pass(CheckCategory::Command, "Install command: all required arguments provided")
    } else {
        CheckResult::fail(
            CheckCategory::Command,
            "Install command: missing required arguments",
            format!(
                "Missing: {}. Usage: openframe-client install --serverUrl <url> --initialKey <key> --orgId <id>",
                missing.join(", ")
            ),
        )
    }
}

pub fn check_admin_privileges() -> CheckResult {
    if PermissionUtils::is_admin() {
        CheckResult::pass(CheckCategory::Admin, "Admin privileges")
    } else {
        let hint = if cfg!(windows) {
            "Please run the installer as Administrator (right-click \u{2192} Run as administrator)."
        } else {
            "Please run with sudo: sudo openframe-client install ..."
        };
        CheckResult::fail(CheckCategory::Admin, "Admin privileges", hint)
    }
}

pub fn check_dir_writable(path: &Path, label: &str) -> CheckResult {
    let name = format!("Disk: {} \u{2014} writable", label);

    let test_dir = if path.exists() {
        path
    } else if let Some(parent) = path.ancestors().find(|p| p.exists()) {
        parent
    } else {
        return CheckResult::fail(
            CheckCategory::Disk,
            &name,
            format!("Path {} does not exist and has no accessible parent.", path.display()),
        );
    };

    let probe = test_dir.join(".openframe_write_test");
    match std::fs::write(&probe, b"ok") {
        Ok(_) => {
            let _ = std::fs::remove_file(&probe);
            CheckResult::pass(CheckCategory::Disk, &name)
        }
        Err(_) => CheckResult::fail(
            CheckCategory::Disk,
            &name,
            format!("Cannot write to {}. Please check directory permissions.", path.display()),
        ),
    }
}

pub fn check_disk_space(path: &Path, min_mb: u64) -> CheckResult {
    use sysinfo::Disks;

    let disks = Disks::new_with_refreshed_list();
    let path_str = path.to_string_lossy();

    let disk = disks
        .iter()
        .filter(|d| path_str.starts_with(&d.mount_point().to_string_lossy().as_ref()))
        .max_by_key(|d| d.mount_point().as_os_str().len());

    match disk {
        Some(d) => {
            let available_mb = d.available_space() / (1024 * 1024);
            if available_mb >= min_mb {
                CheckResult::pass(
                    CheckCategory::Disk,
                    &format!("Disk: {} GB free", available_mb / 1024),
                )
            } else {
                CheckResult::fail(
                    CheckCategory::Disk,
                    &format!("Disk: {} MB free", available_mb),
                    format!(
                        "Low disk space: {}MB available, at least {}MB recommended.",
                        available_mb, min_mb
                    ),
                )
            }
        }
        None => CheckResult::fail(
            CheckCategory::Disk,
            "Disk: space check",
            "Could not determine available disk space.",
        ),
    }
}

pub fn check_service_config_writable() -> CheckResult {
    let path = service_config_dir();
    check_dir_writable(&path, &path.display().to_string())
}

pub fn check_dns_resolve(server_url: &str) -> CheckResult {
    let host = strip_scheme(server_url);
    let addr = if host.contains(':') {
        host.to_string()
    } else {
        format!("{}:443", host)
    };

    let resolved = addr
        .to_socket_addrs()
        .map(|mut a| a.next().is_some())
        .unwrap_or(false);

    if resolved {
        CheckResult::pass(CheckCategory::Network, &format!("Network: DNS resolves {}", host))
    } else {
        CheckResult::fail(
            CheckCategory::Network,
            &format!("Network: DNS resolve {}", host),
            format!(
                "Cannot resolve '{}'. Please check your DNS settings or verify the server URL is correct.",
                host
            ),
        )
    }
}

pub fn check_tcp_connect(server_url: &str) -> CheckResult {
    let host = strip_scheme(server_url);
    let addr = if host.contains(':') {
        host.to_string()
    } else {
        format!("{}:443", host)
    };

    let port_display = addr.split(':').last().unwrap_or("443");

    match addr.to_socket_addrs() {
        Ok(addrs) => {
            let connected = addrs
                .into_iter()
                .any(|a| TcpStream::connect_timeout(&a, Duration::from_secs(5)).is_ok());

            if connected {
                CheckResult::pass(
                    CheckCategory::Network,
                    &format!("Network: TCP {}:{} reachable", strip_port(host), port_display),
                )
            } else {
                CheckResult::warn(
                    CheckCategory::Network,
                    &format!("Network: TCP {}:{}", strip_port(host), port_display),
                    format!(
                        "Cannot reach {} on port {}. Please check that your firewall allows outbound connections on this port.",
                        strip_port(host), port_display
                    ),
                )
            }
        }
        Err(_) => CheckResult::warn(
            CheckCategory::Network,
            &format!("Network: TCP {}:{}", strip_port(host), port_display),
            format!("Cannot resolve '{}' for TCP connection.", host),
        ),
    }
}

pub async fn check_tls_handshake(server_url: &str) -> CheckResult {
    let url = ensure_https(server_url);

    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
    {
        Ok(c) => c,
        Err(_) => {
            return CheckResult::warn(
                CheckCategory::Network,
                "Network: TLS handshake",
                "Failed to create HTTP client for TLS check.",
            );
        }
    };

    match client.get(&url).send().await {
        Ok(_) => CheckResult::pass(CheckCategory::Network, "Network: TLS handshake ok"),
        Err(e) if e.is_connect() => CheckResult::warn(
            CheckCategory::Network,
            "Network: TLS handshake",
            format!(
                "TLS handshake failed with {}. If behind a corporate proxy, you may need to add a CA certificate or use --localMode.",
                strip_scheme(server_url)
            ),
        ),
        Err(_) => CheckResult::warn(
            CheckCategory::Network,
            "Network: TLS handshake",
            format!(
                "Could not connect to {}. Please verify the server is running.",
                strip_scheme(server_url)
            ),
        ),
    }
}

/// We send a WebSocket upgrade request to /ws/nats without auth.
/// Any HTTP response (even 401/403) means the path is reachable.
/// A connection error means a proxy or firewall is blocking WebSocket.
pub async fn check_websocket_upgrade(server_url: &str) -> CheckResult {
    let base = ensure_https(server_url);
    let ws_url = format!("{}/ws/nats", base.trim_end_matches('/'));

    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
    {
        Ok(c) => c,
        Err(_) => {
            return CheckResult::warn(
                CheckCategory::Network,
                "Network: WebSocket upgrade",
                "Failed to create HTTP client for WebSocket check.",
            );
        }
    };

    match client
        .get(&ws_url)
        .header("Upgrade", "websocket")
        .header("Connection", "Upgrade")
        .header("Sec-WebSocket-Version", "13")
        .header("Sec-WebSocket-Key", "dGhlIHNhbXBsZSBub25jZQ==")
        .send()
        .await
    {
        Ok(resp) => {
            let status = resp.status().as_u16();
            if matches!(status, 101 | 400 | 401 | 403 | 426) {
                CheckResult::pass(CheckCategory::Network, "Network: WebSocket upgrade supported")
            } else {
                CheckResult::warn(
                    CheckCategory::Network,
                    "Network: WebSocket upgrade",
                    format!(
                        "WebSocket endpoint returned unexpected status {}. If behind a proxy, ensure it supports WebSocket upgrade (HTTP 101).",
                        status
                    ),
                )
            }
        }
        Err(_) => CheckResult::fail(
            CheckCategory::Network,
            "Network: WebSocket upgrade",
            format!(
                "WebSocket connection to {} was blocked. If behind a proxy, ensure it supports WebSocket upgrade (HTTP 101).",
                strip_scheme(server_url)
            ),
        ),
    }
}

pub fn check_proxy_env() -> Option<CheckResult> {
    let mut detected = Vec::new();
    for var in ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"] {
        if std::env::var(var).is_ok() {
            detected.push(var);
        }
    }

    if detected.is_empty() {
        None
    } else {
        Some(CheckResult::info(
            CheckCategory::Network,
            &format!("Proxy: {} is set", detected.join(", ")),
        ))
    }
}

fn strip_scheme(url: &str) -> &str {
    url.strip_prefix("https://")
        .or_else(|| url.strip_prefix("http://"))
        .unwrap_or(url)
}

fn strip_port(host: &str) -> &str {
    host.split(':').next().unwrap_or(host)
}

fn ensure_https(server_url: &str) -> String {
    if server_url.starts_with("http://") || server_url.starts_with("https://") {
        server_url.to_string()
    } else {
        format!("https://{}", server_url)
    }
}

fn service_config_dir() -> std::path::PathBuf {
    #[cfg(target_os = "macos")]
    {
        std::path::PathBuf::from("/Library/LaunchDaemons")
    }
    #[cfg(target_os = "linux")]
    {
        std::path::PathBuf::from("/etc/systemd/system")
    }
    #[cfg(target_os = "windows")]
    {
        let pf = std::env::var("ProgramFiles").unwrap_or_else(|_| r"C:\Program Files".into());
        std::path::PathBuf::from(pf).join("OpenFrame").join("bin")
    }
}
