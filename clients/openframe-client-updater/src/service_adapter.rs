use anyhow::{Context, Result};
use plist::Dictionary;
use service_manager::{
    ServiceInstallCtx, ServiceLabel, ServiceManager, ServiceStartCtx, ServiceStopCtx,
    ServiceUninstallCtx,
};
use std::collections::HashMap;
use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::str::FromStr;
use tracing::{debug, info, warn};

#[derive(Debug, Clone)]
pub struct RecoveryConfig {
    pub first_restart_secs: u64,
    pub second_restart_secs: u64,
    pub subsequent_restart_secs: u64,
    pub reset_period_days: u32,
    pub enable_on_non_crash_failures: bool,
}

#[derive(Debug, Clone)]
pub struct ServiceConfig {
    pub name: String,
    pub display_name: String,
    pub description: String,
    pub exec_path: PathBuf,
    pub run_at_load: bool,
    pub keep_alive: bool,
    pub restart_on_crash: bool,
    pub restart_throttle_seconds: u32,
    pub working_directory: Option<PathBuf>,
    pub environment_vars: Vec<(String, String)>,
    pub stdout_path: Option<PathBuf>,
    pub stderr_path: Option<PathBuf>,
    pub user_name: Option<String>,
    pub group_name: Option<String>,
    pub file_limit: Option<u32>,
    pub exit_timeout_seconds: Option<u32>,
    pub is_interactive: bool,
    pub recovery: Option<RecoveryConfig>,
}

impl Default for ServiceConfig {
    fn default() -> Self {
        Self {
            name: String::new(),
            display_name: String::new(),
            description: String::new(),
            exec_path: PathBuf::new(),
            run_at_load: true,
            keep_alive: true,
            restart_on_crash: true,
            restart_throttle_seconds: 10,
            working_directory: None,
            environment_vars: vec![],
            stdout_path: None,
            stderr_path: None,
            user_name: None,
            group_name: None,
            file_limit: None,
            exit_timeout_seconds: None,
            is_interactive: true,
            recovery: None,
        }
    }
}

pub struct CrossPlatformServiceManager {
    pub config: ServiceConfig,
}

impl CrossPlatformServiceManager {
    pub fn with_config(config: ServiceConfig) -> Self {
        Self { config }
    }

    pub fn install(&self) -> Result<()> {
        let label = self.label()?;
        let manager = <dyn ServiceManager>::native()
            .context("Failed to detect native service manager")?;

        let working_dir = self
            .config
            .working_directory
            .clone()
            .unwrap_or_else(|| self.app_support_dir());

        let mut ctx = ServiceInstallCtx {
            label: label.clone(),
            program: self.config.exec_path.clone(),
            args: vec![OsString::from("run-as-service")],
            contents: None,
            username: self.service_username(),
            working_directory: Some(working_dir),
            environment: Some(self.config.environment_vars.clone()),
            autostart: self.config.run_at_load,
            disable_restart_on_failure: !self.config.restart_on_crash,
        };

        self.apply_platform_config(&mut ctx);
        self.create_log_dirs()?;

        info!("Installing service '{}'", self.config.name);
        manager.install(ctx).context("Failed to install service")?;

        #[cfg(target_os = "windows")]
        if let Some(recovery) = &self.config.recovery {
            let svc_name = format!("com.openframe.{}", self.config.name.to_lowercase());
            apply_windows_recovery(&svc_name, recovery)
                .context("Failed to configure Windows recovery actions")?;
        }

        self.start()?;
        Ok(())
    }

    pub fn uninstall(&self) -> Result<()> {
        let label = self.label()?;
        let manager = <dyn ServiceManager>::native()
            .context("Failed to detect native service manager")?;

        if let Err(e) = self.stop() {
            warn!("Could not stop service before uninstall: {}", e);
        }

        #[cfg(target_os = "windows")]
        {
            if let Err(e) = self.wait_for_process_stop(60) {
                warn!("Service process did not stop cleanly: {}", e);
            }
        }

        let ctx = ServiceUninstallCtx { label };

        #[cfg(target_os = "windows")]
        {
            match manager.uninstall(ctx) {
                Ok(_) => {}
                Err(e) => {
                    let msg = e.to_string();
                    if msg.contains("1072") || msg.contains("1060") {
                        info!("Service already removed");
                    } else {
                        return Err(e).context("Failed to uninstall service");
                    }
                }
            }
        }

        #[cfg(not(target_os = "windows"))]
        manager.uninstall(ctx).context("Failed to uninstall service")?;

        Ok(())
    }

    pub fn start(&self) -> Result<()> {
        let label = self.label()?;
        let manager = <dyn ServiceManager>::native()
            .context("Failed to detect native service manager")?;
        manager.start(ServiceStartCtx { label }).context("Failed to start service")
    }

    pub fn stop(&self) -> Result<()> {
        let label = self.label()?;
        let manager = <dyn ServiceManager>::native()
            .context("Failed to detect native service manager")?;
        manager.stop(ServiceStopCtx { label }).context("Failed to stop service")
    }

    fn label(&self) -> Result<ServiceLabel> {
        ServiceLabel::from_str(&format!("com.openframe.{}", self.config.name.to_lowercase()))
            .context("Failed to create service label")
    }

    fn app_support_dir(&self) -> PathBuf {
        #[cfg(target_os = "windows")]
        {
            let pd = std::env::var("PROGRAMDATA").unwrap_or_else(|_| "C:\\ProgramData".to_string());
            PathBuf::from(pd).join("OpenFrame")
        }
        #[cfg(target_os = "macos")]
        {
            PathBuf::from("/Library/Application Support/OpenFrame")
        }
        #[cfg(all(unix, not(target_os = "macos")))]
        {
            PathBuf::from("/var/lib/openframe")
        }
    }

    fn service_username(&self) -> Option<String> {
        if let Some(u) = &self.config.user_name {
            return Some(u.clone());
        }
        #[cfg(target_os = "windows")]
        return Some("LocalSystem".to_string());
        #[cfg(target_os = "macos")]
        return Some("root".to_string());
        #[cfg(all(unix, not(target_os = "macos")))]
        return Some("root".to_string());
    }

    fn create_log_dirs(&self) -> Result<()> {
        for opt in [&self.config.stdout_path, &self.config.stderr_path] {
            if let Some(path) = opt {
                if let Some(parent) = path.parent() {
                    std::fs::create_dir_all(parent).ok();
                }
            }
        }
        Ok(())
    }

    fn apply_platform_config(&self, ctx: &mut ServiceInstallCtx) {
        #[cfg(target_os = "macos")]
        self.apply_macos_config(ctx);

        #[cfg(all(unix, not(target_os = "macos")))]
        self.apply_linux_config(ctx);
    }

    #[cfg(target_os = "macos")]
    fn apply_macos_config(&self, ctx: &mut ServiceInstallCtx) {
        let mut dict = Dictionary::new();

        dict.insert(
            "Label".into(),
            plist::Value::String(format!("com.openframe.{}", self.config.name.to_lowercase())),
        );

        let args = vec![
            plist::Value::String(self.config.exec_path.to_string_lossy().to_string()),
            plist::Value::String("run-as-service".to_string()),
        ];
        dict.insert("ProgramArguments".into(), plist::Value::Array(args));
        dict.insert("RunAtLoad".into(), plist::Value::Boolean(self.config.run_at_load));

        let mut keep_alive = Dictionary::new();
        keep_alive.insert("SuccessfulExit".into(), plist::Value::Boolean(false));
        keep_alive.insert("Crashed".into(), plist::Value::Boolean(true));
        dict.insert("KeepAlive".into(), plist::Value::Dictionary(keep_alive));

        if let Some(p) = &self.config.stdout_path {
            dict.insert("StandardOutPath".into(), plist::Value::String(p.to_string_lossy().to_string()));
        }
        if let Some(p) = &self.config.stderr_path {
            dict.insert("StandardErrorPath".into(), plist::Value::String(p.to_string_lossy().to_string()));
        }
        if let Some(limit) = self.config.file_limit {
            let mut limits = Dictionary::new();
            limits.insert("NumberOfFiles".into(), plist::Value::Integer(limit.into()));
            dict.insert("SoftResourceLimits".into(), plist::Value::Dictionary(limits));
        }
        if self.config.is_interactive {
            dict.insert("ProcessType".into(), plist::Value::String("Interactive".to_string()));
        }
        if self.config.restart_on_crash {
            dict.insert("ThrottleInterval".into(), plist::Value::Integer(self.config.restart_throttle_seconds.into()));
        }
        dict.insert("ExitTimeOut".into(), plist::Value::Integer(
            self.config.exit_timeout_seconds.unwrap_or(10).into()
        ));
        dict.insert("AbandonProcessGroup".into(), plist::Value::Boolean(false));
        if let Some(u) = &self.config.user_name {
            dict.insert("UserName".into(), plist::Value::String(u.clone()));
        }
        if let Some(g) = &self.config.group_name {
            dict.insert("GroupName".into(), plist::Value::String(g.clone()));
        }
        if let Some(wd) = &self.config.working_directory {
            dict.insert("WorkingDirectory".into(), plist::Value::String(wd.to_string_lossy().to_string()));
        }

        let value = plist::Value::Dictionary(dict);
        let mut xml = Vec::new();
        match plist::to_writer_xml(&mut xml, &value) {
            Ok(_) => match String::from_utf8(xml) {
                Ok(s) => { debug!("macOS plist: {}", s); ctx.contents = Some(s); }
                Err(e) => warn!("Failed to encode plist as UTF-8: {}", e),
            },
            Err(e) => warn!("Failed to serialize plist: {}", e),
        }
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    fn apply_linux_config(&self, ctx: &mut ServiceInstallCtx) {
        let mut opts: HashMap<&str, String> = HashMap::new();

        if let Some(p) = &self.config.stdout_path {
            opts.insert("StandardOutput", "file".to_string());
            opts.insert("StandardOutputPath", p.to_string_lossy().to_string());
        }
        if let Some(p) = &self.config.stderr_path {
            opts.insert("StandardError", "file".to_string());
            opts.insert("StandardErrorPath", p.to_string_lossy().to_string());
        }
        if let Some(limit) = self.config.file_limit {
            opts.insert("LimitNOFILE", limit.to_string());
        }
        if self.config.restart_on_crash {
            opts.insert("Restart", "on-failure".to_string());
            opts.insert("RestartSec", self.config.restart_throttle_seconds.to_string());
        }

        if !opts.is_empty() {
            match serde_json::to_string(&opts) {
                Ok(s) => { debug!("Linux service options: {}", s); ctx.contents = Some(s); }
                Err(e) => warn!("Failed to serialize Linux service options: {}", e),
            }
        }
    }

    #[cfg(target_os = "windows")]
    fn wait_for_process_stop(&self, timeout_secs: u64) -> Result<()> {
        use std::time::{Duration, Instant};
        let svc = format!("com.openframe.{}", self.config.name.to_lowercase());
        let deadline = Instant::now() + Duration::from_secs(timeout_secs);
        while Instant::now() < deadline {
            if !Self::service_process_running(&svc) {
                return Ok(());
            }
            std::thread::sleep(Duration::from_millis(500));
        }
        Err(anyhow::anyhow!("Service did not stop within {}s", timeout_secs))
    }

    #[cfg(target_os = "windows")]
    fn service_process_running(service_name: &str) -> bool {
        std::process::Command::new("sc")
            .args(["query", service_name])
            .output()
            .map(|o| {
                let out = String::from_utf8_lossy(&o.stdout);
                !out.contains("STOPPED") && o.status.success()
            })
            .unwrap_or(false)
    }
}

#[cfg(target_os = "windows")]
fn apply_windows_recovery(service_name: &str, cfg: &RecoveryConfig) -> Result<()> {
    use std::time::Duration;
    use windows_service::{
        service::{ServiceAccess, ServiceAction, ServiceActionType, ServiceFailureActions, ServiceFailureResetPeriod},
        service_manager::{ServiceManager, ServiceManagerAccess},
    };

    let scm = ServiceManager::local_computer(None::<&str>, ServiceManagerAccess::CONNECT)
        .context("Failed to connect to SCM")?;

    let service = scm
        .open_service(service_name, ServiceAccess::CHANGE_CONFIG | ServiceAccess::START)
        .context("Failed to open service")?;

    let actions = vec![
        ServiceAction { action_type: ServiceActionType::Restart, delay: Duration::from_secs(cfg.first_restart_secs) },
        ServiceAction { action_type: ServiceActionType::Restart, delay: Duration::from_secs(cfg.second_restart_secs) },
        ServiceAction { action_type: ServiceActionType::Restart, delay: Duration::from_secs(cfg.subsequent_restart_secs) },
    ];

    service.update_failure_actions(ServiceFailureActions {
        reset_period: ServiceFailureResetPeriod::After(Duration::from_secs(cfg.reset_period_days as u64 * 86_400)),
        reboot_msg: None,
        command: None,
        actions: Some(actions),
    }).context("Failed to update failure actions")?;

    if cfg.enable_on_non_crash_failures {
        service.set_failure_actions_on_non_crash_failures(true)
            .context("Failed to enable failure actions on non-crash failures")?;
    }

    Ok(())
}
