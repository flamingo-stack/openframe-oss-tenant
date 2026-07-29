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
    /// Formats a directory error as a human-readable message.
    ///
    /// # Examples
    ///
    /// ```
    /// let error = DirectoryError::PermissionDenied("/var/lib/openframe".into());
    /// assert_eq!(
    ///     error.to_string(),
    ///     "Permission denied for /var/lib/openframe"
    /// );
    /// ```
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
                write!(
                    f,
                    "Failed to fix permissions for {}: {}",
                    path.display(),
                    reason
                )
            }
        }
    }
}

impl std::error::Error for DirectoryError {}

impl From<PermissionError> for DirectoryError {
    /// Converts a permission error into a directory permission-fix failure.
    ///
    /// The resulting error contains an empty path because the source error does not identify a directory.
    ///
    /// # Examples
    ///
    /// ```
    /// # fn convert(error: PermissionError) -> DirectoryError {
    /// #     error.into()
    /// # }
    /// ```
    fn from(err: PermissionError) -> Self {
        DirectoryError::FixFailed(PathBuf::new(), err.to_string())
    }
}

/// Determines the platform-specific application support directory.
///
/// On Windows, this uses the `ProgramData` environment variable and appends
/// `OpenFrame`. On macOS and Linux, it uses the standard OpenFrame application
/// support path.
///
/// # Examples
///
/// ```
/// let directory = get_app_support_directory();
/// assert!(!directory.as_os_str().is_empty());
/// ```
pub fn get_app_support_directory() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let program_data =
            std::env::var_os("ProgramData").expect("ProgramData environment variable not found");
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

/// Resolves the OpenFrame logs directory, honoring the `OPENFRAME_LOG_DIR` environment variable when set.
///
/// # Examples
///
/// ```
/// let logs_directory = get_logs_directory();
/// assert!(!logs_directory.as_os_str().is_empty());
/// ```
pub fn get_logs_directory() -> PathBuf {
    if let Ok(log_dir) = std::env::var("OPENFRAME_LOG_DIR") {
        return PathBuf::from(log_dir);
    }

    #[cfg(target_os = "windows")]
    {
        let program_data =
            std::env::var_os("ProgramData").expect("ProgramData environment variable not found");
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

/// Determines the platform-specific directory for secured OpenFrame data.
///
/// # Examples
///
/// ```
/// let directory = get_secured_directory();
/// assert!(directory.ends_with("secured"));
/// ```
pub fn get_secured_directory() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let program_data =
            std::env::var_os("ProgramData").expect("ProgramData environment variable not found");
        PathBuf::from(program_data)
            .join("OpenFrame")
            .join("secured")
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

impl Default for DirectoryManager {
    /// Creates a directory manager using the platform-specific default directories.
    ///
    /// # Examples
    ///
    /// ```
    /// let manager = DirectoryManager::default();
    /// assert!(!manager.logs_dir().as_os_str().is_empty());
    /// ```
    fn default() -> Self {
        Self::new()
    }
}

impl DirectoryManager {
    /// Creates a directory manager using the platform's default directories.
    ///
    /// # Examples
    ///
    /// ```
    /// let manager = DirectoryManager::new();
    /// assert!(!manager.logs_dir().as_os_str().is_empty());
    /// ```
    pub fn new() -> Self {
        Self {
            logs_dir: get_logs_directory(),
            app_support_dir: get_app_support_directory(),
            secured_dir: get_secured_directory(),
        }
    }

    /// Creates a directory manager using a temporary directory layout for development.
    ///
    /// # Examples
    ///
    /// ```
    /// let manager = DirectoryManager::for_development();
    /// assert!(manager.logs_dir().ends_with("OpenFrame-dev/logs"));
    /// assert!(manager.app_support_dir().ends_with("OpenFrame-dev"));
    /// assert!(manager.secured_dir().ends_with("OpenFrame-dev/secured"));
    /// ```
    pub fn for_development() -> Self {
        let dev_dir = std::env::temp_dir().join("OpenFrame-dev");
        Self {
            logs_dir: dev_dir.join("logs"),
            app_support_dir: dev_dir.clone(),
            secured_dir: dev_dir.join("secured"),
        }
    }

    /// Creates a directory manager using caller-provided paths.
    ///
    /// # Examples
    ///
    /// ```
    /// use std::path::PathBuf;
    ///
    /// let manager = DirectoryManager::with_custom_dirs(
    ///     PathBuf::from("/var/log/openframe"),
    ///     PathBuf::from("/var/lib/openframe"),
    ///     PathBuf::from("/var/lib/openframe/secured"),
    /// );
    ///
    /// assert_eq!(manager.logs_dir(), PathBuf::from("/var/log/openframe"));
    /// ```
    ///
    /// # Parameters
    ///
    /// * `logs_dir` - Directory for application logs.
    /// * `app_support_dir` - Directory for application support data.
    /// * `secured_dir` - Directory for secured application data.
    pub fn with_custom_dirs(
        logs_dir: PathBuf,
        app_support_dir: PathBuf,
        secured_dir: PathBuf,
    ) -> Self {
        Self {
            logs_dir,
            app_support_dir,
            secured_dir,
        }
    }

    /// Provides the directory used for application logs.
    ///
    /// # Examples
    ///
    /// ```
    /// let manager = DirectoryManager::for_development();
    /// assert!(manager.logs_dir().ends_with("logs"));
    /// ```
    pub fn logs_dir(&self) -> &Path {
        &self.logs_dir
    }

    pub fn app_support_dir(&self) -> &Path {
        &self.app_support_dir
    }

    /// Returns the directory used to store secured application data.
    ///
    /// # Examples
    ///
    /// ```
    /// let manager = DirectoryManager::with_custom_dirs(
    ///     "logs".into(),
    ///     "app-support".into(),
    ///     "secured".into(),
    /// );
    ///
    /// assert_eq!(manager.secured_dir(), std::path::Path::new("secured"));
    /// ```
    pub fn secured_dir(&self) -> &Path {
        &self.secured_dir
    }

    /// Ensures the configured directories exist and are writable.
    ///
    /// # Examples
    ///
    /// ```
    /// let manager = DirectoryManager::for_development();
    /// manager.perform_health_check().unwrap();
    /// ```
    pub fn perform_health_check(&self) -> Result<(), DirectoryError> {
        info!("Performing directory health check");
        self.ensure_directories()?;
        info!("Directory health check completed");
        Ok(())
    }

    /// Ensures the configured directories exist, have the required permissions, and are writable.
    ///
    /// # Errors
    ///
    /// Returns a [`DirectoryError`] if a directory cannot be created, configured, or written to.
    ///
    /// # Examples
    ///
    /// ```
    /// # fn main() -> Result<(), DirectoryError> {
    /// let manager = DirectoryManager::for_development();
    /// manager.ensure_directories()?;
    /// # Ok(())
    /// # }
    /// ```
    pub fn ensure_directories(&self) -> Result<(), DirectoryError> {
        let dir_perms = Permissions::directory();
        self.create_directory(&self.logs_dir, &dir_perms)?;
        self.create_directory(&self.app_support_dir, &dir_perms)?;
        self.create_directory(&self.secured_dir, &Permissions::secured_directory())?;
        Ok(())
    }

    /// Creates a directory, applies the specified permissions, and verifies that it is writable.
    ///
    /// # Errors
    ///
    /// Returns [`DirectoryError::CreateFailed`] if the directory cannot be created,
    /// [`DirectoryError::FixFailed`] if permissions cannot be applied, or
    /// [`DirectoryError::PermissionDenied`] if the directory is not writable.
    ///
    /// # Examples
    ///
    /// ```ignore
    /// let manager = DirectoryManager::for_development();
    /// let permissions = Permissions::directory();
    /// manager.create_directory(Path::new("/tmp/example"), &permissions)?;
    /// # Ok::<(), DirectoryError>(())
    /// ```
    fn create_directory(&self, path: &Path, perms: &Permissions) -> Result<(), DirectoryError> {
        if !path.exists() {
            info!("Creating directory: {}", path.display());
            fs::create_dir_all(path)
                .map_err(|e| DirectoryError::CreateFailed(path.to_path_buf(), e))?;
        }

        perms
            .apply(path)
            .map_err(|e| DirectoryError::FixFailed(path.to_path_buf(), e.to_string()))?;

        if !self.can_write_to(path) {
            return Err(DirectoryError::PermissionDenied(path.to_path_buf()));
        }

        Ok(())
    }

    /// Checks whether a directory supports creating and writing files.
    ///
    /// # Examples
    ///
    /// ```
    /// let manager = DirectoryManager::for_development();
    /// let directory = std::env::temp_dir();
    ///
    /// assert!(manager.can_write_to(&directory));
    /// ```
    fn can_write_to(&self, path: &Path) -> bool {
        let probe = path.join(".write_test");
        let result = std::fs::OpenOptions::new()
            .write(true)
            .create(true)
            .truncate(true)
            .open(&probe);
        if probe.exists() {
            let _ = fs::remove_file(&probe);
        }
        result.is_ok()
    }
}
