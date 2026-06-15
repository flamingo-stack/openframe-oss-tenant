pub mod checks;

use crate::installation_initial_config_service::InstallConfigParams;
use crate::platform::DirectoryManager;
use crate::service::Service;
use checks::*;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CheckCategory {
    Command,
    Admin,
    Disk,
    Network,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CheckStatus {
    Pass,
    Fail,
    Warn,
    Info,
}

#[derive(Debug)]
pub struct CheckResult {
    pub category: CheckCategory,
    pub status: CheckStatus,
    pub name: String,
    pub hint: Option<String>,
}

impl CheckResult {
    pub fn pass(category: CheckCategory, name: &str) -> Self {
        Self { category, status: CheckStatus::Pass, name: name.to_string(), hint: None }
    }

    pub fn fail(category: CheckCategory, name: &str, hint: impl Into<String>) -> Self {
        Self { category, status: CheckStatus::Fail, name: name.to_string(), hint: Some(hint.into()) }
    }

    pub fn warn(category: CheckCategory, name: &str, hint: impl Into<String>) -> Self {
        Self { category, status: CheckStatus::Warn, name: name.to_string(), hint: Some(hint.into()) }
    }

    pub fn info(category: CheckCategory, name: &str) -> Self {
        Self { category, status: CheckStatus::Info, name: name.to_string(), hint: None }
    }
}

pub struct DoctorReport {
    pub results: Vec<CheckResult>,
    title: &'static str,
}

impl DoctorReport {
    pub fn has_failures(&self) -> bool {
        self.results.iter().any(|r| r.status == CheckStatus::Fail)
    }

    pub fn failure_count(&self) -> usize {
        self.results.iter().filter(|r| r.status == CheckStatus::Fail).count()
    }

    pub fn warn_count(&self) -> usize {
        self.results.iter().filter(|r| r.status == CheckStatus::Warn).count()
    }

    pub fn print(&self) {
        println!("\nOpenFrame Doctor \u{2014} {}\n", self.title);
        for r in &self.results {
            let icon = match r.status {
                CheckStatus::Pass => "+",
                CheckStatus::Fail => "x",
                CheckStatus::Warn => "!",
                CheckStatus::Info => "i",
            };
            println!("  [{}] {}", icon, r.name);
            if let Some(hint) = &r.hint {
                println!("      {}", hint);
            }
        }
    }
}

/// Pre-install diagnostics. Validates CLI args, admin, disk, network.
pub async fn run_preinstall(params: &InstallConfigParams) -> DoctorReport {
    let mut results = Vec::new();

    results.push(check_required_args(params));
    if results.last().unwrap().status == CheckStatus::Fail {
        return DoctorReport { results, title: "pre-install diagnostics" };
    }

    results.push(check_admin_privileges());
    if results.last().unwrap().status == CheckStatus::Fail {
        return DoctorReport { results, title: "pre-install diagnostics" };
    }

    let dir_manager = DirectoryManager::new();
    let disk_targets: Vec<(&std::path::Path, &str)> = vec![
        (dir_manager.app_support_dir(), dir_manager.app_support_dir().to_str().unwrap_or("app support")),
        (dir_manager.secured_dir(), dir_manager.secured_dir().to_str().unwrap_or("secured")),
        (dir_manager.logs_dir(), dir_manager.logs_dir().to_str().unwrap_or("logs")),
    ];

    let install_path = Service::get_install_location();
    let bin_dir = install_path.parent().unwrap_or(&install_path);
    results.push(check_dir_writable(bin_dir, &bin_dir.display().to_string()));
    results.push(check_disk_space(dir_manager.app_support_dir(), 200));

    for (path, label) in &disk_targets {
        results.push(check_dir_writable(path, label));
    }

    results.push(check_service_config_writable());

    let server_url = params.server_url.as_deref().unwrap_or_default();
    run_network_checks(&mut results, server_url).await;

    DoctorReport { results, title: "pre-install diagnostics" }
}

/// Post-install health check. Reads config from disk, checks admin + network.
pub async fn run_healthcheck() -> DoctorReport {
    let mut results = Vec::new();

    results.push(check_admin_privileges());
    if results.last().unwrap().status == CheckStatus::Fail {
        return DoctorReport { results, title: "health check" };
    }

    let dir_manager = DirectoryManager::new();
    let config_path = dir_manager.secured_dir().join("initial_config.json");

    let server_url = match std::fs::read_to_string(&config_path) {
        Ok(json) => {
            match serde_json::from_str::<serde_json::Value>(&json) {
                Ok(val) => {
                    results.push(CheckResult::pass(CheckCategory::Command, "Config: initial_config.json loaded"));
                    match val["server_host"].as_str().filter(|s| !s.trim().is_empty()) {
                        Some(host) => host.to_string(),
                        None => {
                            results.push(CheckResult::fail(
                                CheckCategory::Command,
                                "Config: server_host",
                                format!("'server_host' missing or empty in {}", config_path.display()),
                            ));
                            return DoctorReport { results, title: "health check" };
                        }
                    }
                }
                Err(_) => {
                    results.push(CheckResult::fail(
                        CheckCategory::Command,
                        "Config: initial_config.json",
                        format!("Config file is corrupted: {}", config_path.display()),
                    ));
                    return DoctorReport { results, title: "health check" };
                }
            }
        }
        Err(_) => {
            results.push(CheckResult::fail(
                CheckCategory::Command,
                "Config: initial_config.json",
                format!(
                    "Config not found at {}. Is the agent installed?",
                    config_path.display()
                ),
            ));
            return DoctorReport { results, title: "health check" };
        }
    };

    run_network_checks(&mut results, &server_url).await;

    DoctorReport { results, title: "health check" }
}

async fn run_network_checks(results: &mut Vec<CheckResult>, server_url: &str) {
    results.push(check_dns_resolve(server_url));
    if results.last().unwrap().status == CheckStatus::Fail {
        return;
    }

    results.push(check_tcp_connect(server_url));
    results.push(check_tls_handshake(server_url).await);
    results.push(check_websocket_upgrade(server_url).await);

    if let Some(proxy) = check_proxy_env() {
        results.push(proxy);
    }
}
