use anyhow::Result;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use tracing::info;

use super::permissions::{PermissionError, Permissions};

#[derive(Debug)]
pub enum DirectoryError {
    CreateFailed(PathBuf, io::Error),
    PermissionDenied(PathBuf),
    ValidationFailed(PathBuf, String),
    FixFailed(PathBuf, String),
}

impl std::fmt::Display for DirectoryError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DirectoryError::CreateFailed(path, err) => {
                write!(f, "Failed to create directory {}: {}", path.display(), err)
            }
            DirectoryError::PermissionDenied(path) => {
                write!(f, "Permission denied for {}", path.display())
            }
            DirectoryError::ValidationFailed(path, reason) => {
                write!(f, "Validation failed for {}: {}", path.display(), reason)
            }
            DirectoryError::FixFailed(path, reason) => {
                write!(f, "Failed to fix permissions for {}: {}", path.display(), reason)
            }
        }
    }
}

impl std::error::Error for DirectoryError {}

impl From<PermissionError> for DirectoryError {
    fn from(err: PermissionError) -> Self {
        DirectoryError::FixFailed(PathBuf::new(), err.to_string())
    }
}

pub fn get_app_support_directory() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let program_data = std::env::var_os("ProgramData")
            .expect("ProgramData environment variable not found");
        PathBuf::from(program_data).join("OpenFrame")
    }

    #[cfg(target_os = "macos")]
    {
        PathBuf::from("/Library/Application Support/OpenFrame")
    }

    #[cfg(target_os = "linux")]
    {
        PathBuf::from("/var/lib/openframe")
    }
}

pub fn get_logs_directory() -> PathBuf {
    if let Ok(log_dir) = std::env::var("OPENFRAME_LOG_DIR") {
        return PathBuf::from(log_dir);
    }

    #[cfg(target_os = "windows")]
    {
        let program_data = std::env::var_os("ProgramData")
            .expect("ProgramData environment variable not found");
        PathBuf::from(program_data).join("OpenFrame").join("logs")
    }

    #[cfg(target_os = "macos")]
    {
        PathBuf::from("/Library/Logs/OpenFrame")
    }

    #[cfg(target_os = "linux")]
    {
        PathBuf::from("/var/log/openframe")
    }
}

pub fn get_secured_directory() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let program_data = std::env::var_os("ProgramData")
            .expect("ProgramData environment variable not found");
        PathBuf::from(program_data).join("OpenFrame").join("secured")
    }

    #[cfg(target_os = "macos")]
    {
        PathBuf::from("/Library/Application Support/OpenFrame/secured")
    }

    #[cfg(target_os = "linux")]
    {
        PathBuf::from("/var/lib/openframe/secured")
    }
}

#[derive(Debug, Clone)]
pub struct DirectoryManager {
    logs_dir: PathBuf,
    app_support_dir: PathBuf,
    secured_dir: PathBuf,
}

impl DirectoryManager {
    pub fn new() -> Self {
        Self {
            logs_dir: get_logs_directory(),
            app_support_dir: get_app_support_directory(),
            secured_dir: get_secured_directory(),
        }
    }

    pub fn for_development() -> Self {
        let dev_dir = std::env::temp_dir().join("OpenFrame-dev");
        Self {
            logs_dir: dev_dir.join("logs"),
            app_support_dir: dev_dir.clone(),
            secured_dir: dev_dir.join("secured"),
        }
    }

    pub fn with_custom_dirs(logs_dir: PathBuf, app_support_dir: PathBuf, secured_dir: PathBuf) -> Self {
        Self { logs_dir, app_support_dir, secured_dir }
    }

    pub fn logs_dir(&self) -> &Path {
        &self.logs_dir
    }

    pub fn app_support_dir(&self) -> &Path {
        &self.app_support_dir
    }

    pub fn secured_dir(&self) -> &Path {
        &self.secured_dir
    }

    pub fn perform_health_check(&self) -> Result<(), DirectoryError> {
        info!("Performing directory health check");
        self.ensure_directories()?;
        info!("Directory health check completed");
        Ok(())
    }

    pub fn ensure_directories(&self) -> Result<(), DirectoryError> {
        let dir_perms = Permissions::directory();
        self.create_directory(&self.logs_dir, &dir_perms)?;
        self.create_directory(&self.app_support_dir, &dir_perms)?;
        self.create_directory(&self.secured_dir, &dir_perms)?;
        Ok(())
    }

    fn create_directory(&self, path: &Path, perms: &Permissions) -> Result<(), DirectoryError> {
        if !path.exists() {
            info!("Creating directory: {}", path.display());
            fs::create_dir_all(path)
                .map_err(|e| DirectoryError::CreateFailed(path.to_path_buf(), e))?;
        }

        perms.apply(path)
            .map_err(|e| DirectoryError::FixFailed(path.to_path_buf(), e.to_string()))?;

        if !self.can_write_to(path) {
            return Err(DirectoryError::PermissionDenied(path.to_path_buf()));
        }

        Ok(())
    }

    fn can_write_to(&self, path: &Path) -> bool {
        let probe = path.join(".write_test");
        let result = std::fs::OpenOptions::new().write(true).create(true).open(&probe);
        if probe.exists() {
            let _ = fs::remove_file(&probe);
        }
        result.is_ok()
    }
}
