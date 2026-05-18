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

    pub fn info(category: CheckCategory, name: &str) -> Self {
        Self { category, status: CheckStatus::Info, name: name.to_string(), hint: None }
    }
}

pub struct DoctorReport {
    pub results: Vec<CheckResult>,
}

impl DoctorReport {
    pub fn has_failures(&self) -> bool {
        self.results.iter().any(|r| r.status == CheckStatus::Fail)
    }

    pub fn failure_count(&self) -> usize {
        self.results.iter().filter(|r| r.status == CheckStatus::Fail).count()
    }

    pub fn print(&self) {
        println!("\nOpenFrame Doctor \u{2014} pre-install diagnostics\n");
        for r in &self.results {
            let icon = match r.status {
                CheckStatus::Pass => "\u{2713}",
                CheckStatus::Fail => "\u{2717}",
                CheckStatus::Info => "i",
            };
            println!("  [{}] {}", icon, r.name);
            if let Some(hint) = &r.hint {
                println!("      {}", hint);
            }
        }
    }
}

pub async fn run_doctor(params: &InstallConfigParams) -> DoctorReport {
    let mut results = Vec::new();

    results.push(check_required_args(params));
    if results.last().unwrap().status == CheckStatus::Fail {
        return DoctorReport { results };
    }

    results.push(check_admin_privileges());
    if results.last().unwrap().status == CheckStatus::Fail {
        return DoctorReport { results };
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
    results.push(check_dns_resolve(server_url));
    results.push(check_tcp_connect(server_url));
    results.push(check_tls_handshake(server_url).await);
    results.push(check_websocket_upgrade(server_url).await);

    if let Some(proxy) = check_proxy_env() {
        results.push(proxy);
    }

    DoctorReport { results }
}
