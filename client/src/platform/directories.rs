/// Cross-platform directory management
///
/// This module provides a unified interface for managing platform-specific directories
/// across Windows, macOS, and Linux. It handles:
///
/// - Application support directories
/// - Log directories
/// - Permissions and ownership
/// - Directory health checks
/// - Platform-specific path resolution
///
/// The DirectoryManager struct provides a common API that hides platform-specific
/// implementation details.
use directories::BaseDirs;
use std::fs;
use std::io;
#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use tracing::{error, info, warn};

use super::permissions::{PermissionError, Permissions};

#[derive(Debug)]
pub enum DirectoryError {
    CreateFailed(PathBuf, io::Error),
    PermissionDenied(PathBuf),
    ValidationFailed(PathBuf, String),
    FixFailed(PathBuf, String),
    HomeDirectoryNotFound,
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
                write!(
                    f,
                    "Failed to fix permissions for {}: {}",
                    path.display(),
                    reason
                )
            }
            DirectoryError::HomeDirectoryNotFound => {
                write!(f, "Could not determine user's home directory")
            }
        }
    }
}

impl std::error::Error for DirectoryError {}

impl From<PermissionError> for DirectoryError {
    fn from(err: PermissionError) -> Self {
        match err {
            PermissionError::Io(e) => DirectoryError::CreateFailed(PathBuf::new(), e),
            PermissionError::InvalidMode(msg) => {
                DirectoryError::ValidationFailed(PathBuf::new(), msg)
            }
            PermissionError::InvalidPath(msg) => {
                DirectoryError::ValidationFailed(PathBuf::new(), msg)
            }
            PermissionError::AdminCheckFailed(msg) => {
                DirectoryError::ValidationFailed(PathBuf::new(), msg)
            }
            PermissionError::ElevationRequired => DirectoryError::ValidationFailed(
                PathBuf::new(),
                "Elevation to admin/root required".to_string(),
            ),
            PermissionError::CommandFailed(code) => DirectoryError::ValidationFailed(
                PathBuf::new(),
                format!("Command failed with code: {}", code),
            ),
        }
    }
}

/// Returns the platform-specific app support directory path
pub fn get_app_support_directory() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let program_data =
            std::env::var_os("ProgramData").expect("ProgramData environment variable not found");
        let mut path = PathBuf::from(program_data);
        path.push("OpenFrame");
        path
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

/// Returns the platform-specific logs directory path
pub fn get_logs_directory() -> PathBuf {
    // First check for environment variable override
    if let Ok(log_dir) = std::env::var("OPENFRAME_LOG_DIR") {
        let path = PathBuf::from(log_dir);

        // Ensure the directory exists
        if !path.exists() {
            if let Err(e) = std::fs::create_dir_all(&path) {
                // Log error but continue with the path
                eprintln!(
                    "Failed to create custom log directory {}: {}",
                    path.display(),
                    e
                );
            }
        }

        return path;
    }

    // If no override, use platform-specific defaults
    #[cfg(target_os = "windows")]
    {
        let program_data =
            std::env::var_os("ProgramData").expect("ProgramData environment variable not found");
        let mut path = PathBuf::from(program_data);
        path.push("OpenFrame");
        path.push("logs");
        path
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

/// Returns the platform-specific secured directory path (admin/root access only)
pub fn get_secured_directory() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let program_data =
            std::env::var_os("ProgramData").expect("ProgramData environment variable not found");
        let mut path = PathBuf::from(program_data);
        path.push("OpenFrame");
        path.push("secured");
        path
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

/// Sets the correct platform-specific permissions on a directory
pub fn set_directory_permissions(path: &Path) -> io::Result<()> {
    #[cfg(target_os = "windows")]
    {
        // On Windows, ensure everyone has read access and admins have write access
        // This is a simplified approach - for production, consider using proper ACLs
        // Windows permissions are complex and handled by the Windows API
        info!(
            "Setting Windows directory permissions for: {}",
            path.display()
        );

        // Try to run icacls to set permissions (requires admin privileges)
        let _ = Command::new("icacls")
            .args([
                path.to_str().unwrap(),
                "/grant",
                "Everyone:(OI)(CI)R", // Everyone gets read access
                "/grant",
                "Administrators:(OI)(CI)F", // Admins get full control
            ])
            .status();
    }

    #[cfg(target_os = "macos")]
    {
        // On macOS, we need root:admin ownership and 755 permissions
        info!(
            "Setting macOS directory permissions for: {}",
            path.display()
        );

        // These commands will fail gracefully if not run as root
        let _ = Command::new("chown")
            .args(["-R", "root:admin", path.to_str().unwrap()])
            .status();
        let _ = Command::new("chmod")
            .args(["-R", "755", path.to_str().unwrap()])
            .status();
    }

    #[cfg(target_os = "linux")]
    {
        // Set directory permissions to 755 (rwxr-xr-x) on Linux
        info!(
            "Setting Linux directory permissions for: {}",
            path.display()
        );

        #[cfg(unix)]
        {
            let permissions = fs::Permissions::from_mode(0o755);
            fs::set_permissions(path, permissions)?;

            // On Linux, we typically want root:root ownership
            let _ = Command::new("chown")
                .args(["-R", "root:root", path.to_str().unwrap()])
                .status();
        }
    }

    Ok(())
}

/// Sets admin-only permissions on a secured directory
pub fn set_secured_directory_permissions(path: &Path) -> io::Result<()> {
    #[cfg(target_os = "windows")]
    {
        info!(
            "Setting Windows secured directory permissions for: {}",
            path.display()
        );

        // On Windows, only give Administrators full control, remove all other access
        let _ = Command::new("icacls")
            .args([
                path.to_str().unwrap(),
                "/inheritance:r", // Remove inherited permissions
                "/grant:r",
                "Administrators:(OI)(CI)F", // Only admins get full control
            ])
            .status();
    }

    #[cfg(target_os = "macos")]
    {
        info!(
            "Setting macOS secured directory permissions for: {}",
            path.display()
        );

        // Set ownership to root:wheel and 700 permissions (owner only)
        let _ = Command::new("chown")
            .args(["-R", "root:wheel", path.to_str().unwrap()])
            .status();
        let _ = Command::new("chmod")
            .args(["-R", "700", path.to_str().unwrap()])
            .status();
    }

    #[cfg(target_os = "linux")]
    {
        info!(
            "Setting Linux secured directory permissions for: {}",
            path.display()
        );

        #[cfg(unix)]
        {
            // Set permissions to 700 (rwx------) - only owner can access
            let permissions = fs::Permissions::from_mode(0o700);
            fs::set_permissions(path, permissions)?;

            // Set ownership to root:root
            let _ = Command::new("chown")
                .args(["-R", "root:root", path.to_str().unwrap()])
                .status();
        }
    }

    Ok(())
}

#[derive(Debug, Clone)]
pub struct DirectoryManager {
    logs_dir: PathBuf,
    app_support_dir: PathBuf,
    secured_dir: PathBuf,
    user_logs_dir: Option<PathBuf>, // For per-user logs when needed
}

impl DirectoryManager {
    /// Creates a new DirectoryManager with default platform-specific paths
    pub fn new() -> Self {
        Self {
            logs_dir: get_logs_directory(),
            app_support_dir: get_app_support_directory(),
            secured_dir: get_secured_directory(),
            user_logs_dir: None,
        }
    }

    /// Creates a new DirectoryManager with custom directories
    pub fn with_custom_dirs(logs_dir: PathBuf, app_support_dir: PathBuf, secured_dir: PathBuf) -> Self {
        Self {
            logs_dir,
            app_support_dir,
            secured_dir: secured_dir,
            user_logs_dir: None,
        }
    }

    /// Creates a new DirectoryManager with a user-specific logs directory
    pub fn with_user_logs_dir() -> Self {
        let system_logs_dir = get_logs_directory();
        let system_app_dir = get_app_support_directory();

        // Set up user-specific logs directory based on platform
        let user_logs = Self::get_user_logs_directory();

        Self {
            logs_dir: system_logs_dir,
            app_support_dir: system_app_dir,
            secured_dir: get_secured_directory(),
            user_logs_dir: Some(user_logs),
        }
    }

    /// Creates a development mode DirectoryManager that only uses user directories
    pub fn for_development() -> Self {
        let user_logs = Self::get_user_logs_directory();
        
        // In development mode, use user logs for everything to avoid permission issues
        Self {
            logs_dir: user_logs.clone(),
            app_support_dir: user_logs.clone(),
            secured_dir: user_logs.clone(),
            user_logs_dir: Some(user_logs),
        }
    }

    /// Checks if this DirectoryManager is configured for development mode
    fn is_development_mode(&self) -> bool {
        // Development mode is detected when user_logs_dir is set and 
        // the logs_dir points to a user directory (not system directory)
        if let Some(user_logs) = &self.user_logs_dir {
            self.logs_dir == *user_logs
        } else {
            false
        }
    }

    /// Get the platform-specific user logs directory based on the platform
    fn get_user_logs_directory() -> PathBuf {
        // Cross-platform implementation for user-specific logs
        #[cfg(target_os = "windows")]
        {
            if let Some(base_dirs) = BaseDirs::new() {
                let mut path = base_dirs.data_local_dir().to_path_buf();
                path.push("OpenFrame");
                path.push("Logs");
                return path;
            }
        }

        #[cfg(target_os = "macos")]
        {
            if let Some(base_dirs) = BaseDirs::new() {
                let mut path = base_dirs.home_dir().to_path_buf();
                path.push("Library");
                path.push("Logs");
                path.push("OpenFrame");
                return path;
            }
        }

        #[cfg(target_os = "linux")]
        {
            if let Some(base_dirs) = BaseDirs::new() {
                let mut path = base_dirs.home_dir().to_path_buf();
                path.push(".local");
                path.push("share");
                path.push("openframe");
                path.push("logs");
                return path;
            }
        }

        // Fallback to temporary directory if we can't determine the home directory
        let mut path = std::env::temp_dir();
        path.push("OpenFrame");
        path.push("Logs");
        path
    }

    /// Runs a health check on all managed directories
    pub fn perform_health_check(&self) -> Result<(), DirectoryError> {
        info!("Performing directory health check");

        // Create directories if they don't exist
        self.ensure_directories()?;

        // Validate permissions
        self.validate_permissions()?;

        info!("Directory health check completed successfully");
        Ok(())
    }

    /// Ensures all required directories exist with correct permissions
    pub fn ensure_directories(&self) -> Result<(), DirectoryError> {
        info!("Ensuring required directories exist...");

        let dir_perms = Permissions::directory();

        // Create and verify logs directory
        self.create_directory_with_permissions(&self.logs_dir, &dir_perms)?;

        // Create and verify application support directory
        self.create_directory_with_permissions(&self.app_support_dir, &dir_perms)?;

        // Create and verify secured directory with admin-only permissions
        self.create_secured_directory(&self.secured_dir)?;

        // If user logs directory is set, create and verify it too
        if let Some(user_logs) = &self.user_logs_dir {
            self.create_directory_with_permissions(user_logs, &dir_perms)?;
        }

        Ok(())
    }

    /// Creates a directory with specified permissions if it doesn't exist
    fn create_directory_with_permissions(
        &self,
        path: &Path,
        perms: &Permissions,
    ) -> Result<(), DirectoryError> {
        if !path.exists() {
            info!("Creating directory: {}", path.display());

            // Create parent directories if they don't exist
            if let Some(parent) = path.parent() {
                if !parent.exists() {
                    fs::create_dir_all(parent)
                        .map_err(|e| DirectoryError::CreateFailed(parent.to_path_buf(), e))?;
                }
            }

            fs::create_dir_all(path)
                .map_err(|e| DirectoryError::CreateFailed(path.to_path_buf(), e))?;

            // Set platform-specific permissions
            set_directory_permissions(path)
                .map_err(|e| DirectoryError::FixFailed(path.to_path_buf(), e.to_string()))?;
        }

        info!("Setting permissions for: {}", path.display());
        perms
            .apply(path)
            .map_err(|e| DirectoryError::FixFailed(path.to_path_buf(), e.to_string()))?;

        // Verify we can write to the directory
        if !self.can_write_to_directory(path) {
            return Err(DirectoryError::PermissionDenied(path.to_path_buf()));
        }

        Ok(())
    }

    /// Creates a secured directory with admin-only permissions if it doesn't exist
    fn create_secured_directory(&self, path: &Path) -> Result<(), DirectoryError> {
        if !path.exists() {
            info!("Creating secured directory: {}", path.display());

            // Create parent directories if they don't exist
            if let Some(parent) = path.parent() {
                if !parent.exists() {
                    fs::create_dir_all(parent)
                        .map_err(|e| DirectoryError::CreateFailed(parent.to_path_buf(), e))?;
                }
            }

            fs::create_dir_all(path)
                .map_err(|e| DirectoryError::CreateFailed(path.to_path_buf(), e))?;

            // In development mode, use regular permissions to avoid permission issues
            if self.is_development_mode() {
                info!("Development mode: using regular directory permissions for secured directory");
                set_directory_permissions(path)
                    .map_err(|e| DirectoryError::FixFailed(path.to_path_buf(), e.to_string()))?;
            } else {
                // Set admin-only permissions in production mode
                set_secured_directory_permissions(path)
                    .map_err(|e| DirectoryError::FixFailed(path.to_path_buf(), e.to_string()))?;
            }
        } else if !self.is_development_mode() {
            // Directory exists, ensure it has correct secured permissions (production mode only)
            info!("Updating secured permissions for: {}", path.display());
            set_secured_directory_permissions(path)
                .map_err(|e| DirectoryError::FixFailed(path.to_path_buf(), e.to_string()))?;
        }

        Ok(())
    }

    /// Validates permissions on all directories
    pub fn validate_permissions(&self) -> Result<(), DirectoryError> {
        let dir_perms = Permissions::directory();

        self.validate_directory_permissions(&self.logs_dir, &dir_perms)?;
        self.validate_directory_permissions(&self.app_support_dir, &dir_perms)?;
        
        // Validate secured directory with special admin-only checks
        self.validate_secured_directory_permissions(&self.secured_dir)?;

        // Validate user logs directory if set
        if let Some(user_logs) = &self.user_logs_dir {
            self.validate_directory_permissions(user_logs, &dir_perms)?;
        }

        Ok(())
    }

    /// Validates permissions for a specific directory
    fn validate_directory_permissions(
        &self,
        path: &Path,
        expected_perms: &Permissions,
    ) -> Result<(), DirectoryError> {
        if !path.exists() {
            return Err(DirectoryError::ValidationFailed(
                path.to_path_buf(),
                "Directory does not exist".to_string(),
            ));
        }

        // Verify permissions - skip on Windows as it uses a different permission model
        #[cfg(unix)]
        {
            if let Ok(current) = Permissions::from_path(path) {
                if current.mode != expected_perms.mode {
                    return Err(DirectoryError::ValidationFailed(
                        path.to_path_buf(),
                        format!(
                            "Expected mode {:o}, got {:o}",
                            expected_perms.mode, current.mode
                        ),
                    ));
                }
            }
        }

        // Verify we can write to the directory
        if !self.can_write_to_directory(path) {
            return Err(DirectoryError::PermissionDenied(path.to_path_buf()));
        }

        Ok(())
    }

    /// Validates permissions for the secured directory (admin-only access)
    fn validate_secured_directory_permissions(&self, path: &Path) -> Result<(), DirectoryError> {
        if !path.exists() {
            return Err(DirectoryError::ValidationFailed(
                path.to_path_buf(),
                "Secured directory does not exist".to_string(),
            ));
        }

        // In development mode, use more relaxed validation
        if self.is_development_mode() {
            // Just verify we can write to the directory in development mode
            if !self.can_write_to_directory(path) {
                return Err(DirectoryError::PermissionDenied(path.to_path_buf()));
            }
            return Ok(());
        }

        // Check admin-only permissions on Unix systems (production mode only)
        #[cfg(unix)]
        {
            if let Ok(current) = Permissions::from_path(path) {
                // For secured directory, we expect 700 permissions (owner only)
                if current.mode & 0o777 != 0o700 {
                    return Err(DirectoryError::ValidationFailed(
                        path.to_path_buf(),
                        format!(
                            "Expected mode 700 for secured directory, got {:o}",
                            current.mode & 0o777
                        ),
                    ));
                }
            }
        }

        // Verify only admin/root can write to the directory
        if !self.is_admin_only_directory(path) {
            return Err(DirectoryError::PermissionDenied(path.to_path_buf()));
        }

        Ok(())
    }

    /// Checks if directory is accessible only by admin/root
    fn is_admin_only_directory(&self, path: &Path) -> bool {
        #[cfg(target_os = "windows")]
        {
            // On Windows, we try to check if only Administrators have access
            // This is a simplified check - in production, proper ACL inspection would be needed
            Command::new("icacls")
                .args([path.to_str().unwrap()])
                .output()
                .map(|output| {
                    let output_str = String::from_utf8_lossy(&output.stdout);
                    // Check if output contains only Administrator access
                    output_str.contains("BUILTIN\\Administrators:(OI)(CI)F") 
                        && !output_str.contains("Everyone:")
                        && !output_str.contains("Users:")
                })
                .unwrap_or(false)
        }

        #[cfg(unix)]
        {
            // Check if the directory has 700 permissions and is owned by root
            if let Ok(metadata) = fs::metadata(path) {
                #[cfg(unix)]
                {
                    use std::os::unix::fs::MetadataExt;
                    let mode = metadata.permissions().mode() & 0o777;
                    let uid = metadata.uid();
                    
                    // Directory should have 700 permissions and be owned by root (uid 0)
                    mode == 0o700 && uid == 0
                }
                #[cfg(not(unix))]
                {
                    true
                }
            } else {
                false
            }
        }
    }

    /// Attempts to fix permissions on all directories
    pub fn fix_permissions(&self) -> Result<(), DirectoryError> {
        let dir_perms = Permissions::directory();

        self.fix_directory_permissions(&self.logs_dir, &dir_perms)?;
        self.fix_directory_permissions(&self.app_support_dir, &dir_perms)?;
        
        // Fix secured directory with admin-only permissions
        self.fix_secured_directory_permissions(&self.secured_dir)?;

        // Fix user logs directory if set
        if let Some(user_logs) = &self.user_logs_dir {
            self.fix_directory_permissions(user_logs, &dir_perms)?;
        }

        Ok(())
    }

    /// Attempts to fix permissions for a specific directory
    fn fix_directory_permissions(
        &self,
        path: &Path,
        perms: &Permissions,
    ) -> Result<(), DirectoryError> {
        if !path.exists() {
            return Err(DirectoryError::ValidationFailed(
                path.to_path_buf(),
                "Directory does not exist".to_string(),
            ));
        }

        // Set platform-specific permissions
        set_directory_permissions(path)
            .map_err(|e| DirectoryError::FixFailed(path.to_path_buf(), e.to_string()))?;

        // Apply specific permission mode
        perms
            .apply(path)
            .map_err(|e| DirectoryError::FixFailed(path.to_path_buf(), e.to_string()))?;

        Ok(())
    }

    /// Attempts to fix permissions for the secured directory (admin-only access)
    fn fix_secured_directory_permissions(&self, path: &Path) -> Result<(), DirectoryError> {
        if !path.exists() {
            return Err(DirectoryError::ValidationFailed(
                path.to_path_buf(),
                "Secured directory does not exist".to_string(),
            ));
        }

        if self.is_development_mode() {
            // In development mode, use regular permissions
            set_directory_permissions(path)
                .map_err(|e| DirectoryError::FixFailed(path.to_path_buf(), e.to_string()))?;
        } else {
            // Set admin-only permissions in production mode
            set_secured_directory_permissions(path)
                .map_err(|e| DirectoryError::FixFailed(path.to_path_buf(), e.to_string()))?;
        }

        Ok(())
    }

    /// Determines if a user can write to the given directory
    ///
    /// This is a cross-platform implementation that works on Windows, macOS, and Linux.
    fn can_write_to_directory(&self, path: &Path) -> bool {
        // Try to create a temporary file in the directory
        let temp_file = path.join(".write_test");
        let result = std::fs::OpenOptions::new()
            .write(true)
            .create(true)
            .open(&temp_file);

        // Clean up the test file if it was created
        if temp_file.exists() {
            let _ = fs::remove_file(&temp_file);
        }

        result.is_ok()
    }

    /// Returns the logs directory path
    pub fn logs_dir(&self) -> &Path {
        &self.logs_dir
    }

    /// Returns the application support directory path
    pub fn app_support_dir(&self) -> &Path {
        &self.app_support_dir
    }

    /// Returns the secured directory path
    pub fn secured_dir(&self) -> &Path {
        &self.secured_dir
    }

    /// Returns the user logs directory path if set, or falls back to system logs
    pub fn user_logs_dir(&self) -> &Path {
        if let Some(user_logs) = &self.user_logs_dir {
            user_logs
        } else {
            &self.logs_dir
        }
    }

    /// Returns the path to the agent executable for a specific tool
    pub fn get_agent_path(&self, tool_agent_id: &str) -> PathBuf {
        let agent_name = if cfg!(target_os = "windows") {
            "agent.exe"
        } else {
            "agent"
        };
        
        self.app_support_dir()
            .join(tool_agent_id)
            .join(agent_name)
    }

    /// Returns the path to an asset file for a specific tool, adding .exe extension on Windows if executable
    pub fn get_asset_path(&self, tool_agent_id: &str, asset_filename: &str, is_executable: bool) -> PathBuf {
        let asset_name = if cfg!(target_os = "windows") && is_executable {
            format!("{}.exe", asset_filename)
        } else {
            asset_filename.to_string()
        };
        
        self.app_support_dir()
            .join(tool_agent_id)
            .join(asset_name)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_directory_creation() {
        let temp_dir = tempdir().unwrap();
        let logs_dir = temp_dir.path().join("logs");
        let app_dir = temp_dir.path().join("app");

        let manager = DirectoryManager::with_custom_dirs(logs_dir.clone(), app_dir.clone());

        // Test directory creation
        assert!(manager.ensure_directories().is_ok());
        assert!(logs_dir.exists());
        assert!(app_dir.exists());
    }

    #[test]
    fn test_directory_permissions() {
        let temp_dir = tempdir().unwrap();
        let logs_dir = temp_dir.path().join("logs");
        let app_dir = temp_dir.path().join("app");

        let manager = DirectoryManager::with_custom_dirs(logs_dir.clone(), app_dir.clone());

        // Create directories first
        assert!(manager.ensure_directories().is_ok());

        // Test permission validation and fixing
        assert!(manager.validate_permissions().is_ok());

        // Test user directory creation
        let user_manager = DirectoryManager::with_user_logs_dir();
        if let Some(user_logs) = &user_manager.user_logs_dir {
            assert!(
                user_logs.to_string_lossy().contains("OpenFrame")
                    || user_logs.to_string_lossy().contains("openframe")
            );
        }
    }

    #[test]
    fn test_file_permissions() {
        let temp_dir = tempdir().unwrap();
        let logs_dir = temp_dir.path().join("logs");
        let app_dir = temp_dir.path().join("app");

        let manager = DirectoryManager::with_custom_dirs(logs_dir.clone(), app_dir.clone());

        // Create directories first
        assert!(manager.ensure_directories().is_ok());

        // Create a test file in the logs directory
        let test_file = logs_dir.join("test.log");
        fs::write(&test_file, "test").unwrap();

        // Apply file permissions
        let file_perms = Permissions::file();
        assert!(file_perms.apply(&test_file).is_ok());

        // Verify file permissions
        #[cfg(unix)]
        {
            if unsafe { libc::geteuid() } == 0 {
                // Only run this check if we're root, otherwise it will fail
                let metadata = fs::metadata(&test_file).unwrap();
                assert_eq!(metadata.permissions().mode() & 0o777, 0o644);
            }
        }
    }

    #[test]
    fn test_error_handling() {
        // Test with a non-existent directory
        let non_existent = PathBuf::from("/non_existent_dir_for_test");

        let manager =
            DirectoryManager::with_custom_dirs(non_existent.clone(), non_existent.clone());

        // This should fail on validate because we can't create the directory
        if cfg!(unix) && unsafe { libc::geteuid() } != 0 {
            // We expect this to fail if we're not root
            assert!(manager.validate_permissions().is_err());
        }
    }

    #[test]
    fn test_user_logs_directory() {
        let manager = DirectoryManager::with_user_logs_dir();

        // Ensure the user logs directory exists
        assert!(manager.user_logs_dir.is_some());

        #[cfg(target_os = "macos")]
        {
            let user_logs = manager.user_logs_dir.unwrap();
            assert!(user_logs
                .to_string_lossy()
                .contains("Library/Logs/OpenFrame"));
        }

        #[cfg(target_os = "windows")]
        {
            let user_logs = manager.user_logs_dir.unwrap();
            assert!(user_logs.to_string_lossy().contains("OpenFrame\\Logs"));
        }

        #[cfg(target_os = "linux")]
        {
            let user_logs = manager.user_logs_dir.unwrap();
            assert!(user_logs
                .to_string_lossy()
                .contains(".local/share/openframe/logs"));
        }
    }

    #[test]
    fn test_health_check() {
        let temp_dir = tempdir().unwrap();
        let logs_dir = temp_dir.path().join("logs");
        let app_dir = temp_dir.path().join("app");

        let manager = DirectoryManager::with_custom_dirs(logs_dir.clone(), app_dir.clone());

        // Test health check
        assert!(manager.perform_health_check().is_ok());
        assert!(logs_dir.exists());
        assert!(app_dir.exists());

        // Intentionally corrupt permissions to test fixing
        #[cfg(unix)]
        {
            if unsafe { libc::geteuid() } == 0 {
                // Only run this check if we're root, otherwise it will fail
                use std::os::unix::fs::PermissionsExt;
                let bad_perms = fs::Permissions::from_mode(0o700);
                fs::set_permissions(&logs_dir, bad_perms).unwrap();

                // Health check should fix the permissions
                assert!(manager.perform_health_check().is_ok());

                // Verify permissions were fixed
                let metadata = fs::metadata(&logs_dir).unwrap();
                assert_eq!(metadata.permissions().mode() & 0o777, 0o755);
            }
        }
    }

    #[test]
    fn test_write_permissions() {
        let temp_dir = tempdir().unwrap();
        let logs_dir = temp_dir.path().join("logs");
        let app_dir = temp_dir.path().join("app");

        let manager = DirectoryManager::with_custom_dirs(logs_dir.clone(), app_dir.clone());

        // Create directories first
        assert!(manager.ensure_directories().is_ok());

        // Test write permissions
        assert!(manager.can_write_to_directory(&logs_dir));
        assert!(manager.can_write_to_directory(&app_dir));
    }

    #[test]
    fn test_get_logs_directory() {
        let logs_dir = get_logs_directory();

        #[cfg(target_os = "macos")]
        assert_eq!(logs_dir, PathBuf::from("/Library/Logs/OpenFrame"));

        #[cfg(target_os = "linux")]
        assert_eq!(logs_dir, PathBuf::from("/var/log/openframe"));

        #[cfg(target_os = "windows")]
        {
            let program_data = std::env::var_os("ProgramData").unwrap_or_default();
            let expected = PathBuf::from(program_data).join("OpenFrame").join("logs");
            assert_eq!(logs_dir, expected);
        }
    }

    #[test]
    fn test_get_app_support_directory() {
        let app_dir = get_app_support_directory();

        #[cfg(target_os = "macos")]
        assert_eq!(
            app_dir,
            PathBuf::from("/Library/Application Support/OpenFrame")
        );

        #[cfg(target_os = "linux")]
        assert_eq!(app_dir, PathBuf::from("/var/lib/openframe"));

        #[cfg(target_os = "windows")]
        {
            let program_data = std::env::var_os("ProgramData").unwrap_or_default();
            let expected = PathBuf::from(program_data).join("OpenFrame");
            assert_eq!(app_dir, expected);
        }
    }

    #[test]
    fn test_secured_directory() {
        let temp_dir = tempdir().unwrap();
        let logs_dir = temp_dir.path().join("logs");
        let app_dir = temp_dir.path().join("app");
        let secured_dir = temp_dir.path().join("secured");

        let manager = DirectoryManager::with_all_custom_dirs(logs_dir, app_dir, secured_dir.clone());

        // Test secured directory creation
        assert!(manager.ensure_directories().is_ok());
        assert!(secured_dir.exists());

        // Test secured directory permissions (only on Unix systems with root)
        #[cfg(unix)]
        {
            if unsafe { libc::geteuid() } == 0 {
                // Only run this check if we're root
                let metadata = fs::metadata(&secured_dir).unwrap();
                assert_eq!(metadata.permissions().mode() & 0o777, 0o700);
            }
        }
    }

    #[test]
    fn test_get_secured_directory() {
        let secured_dir = get_secured_directory();

        #[cfg(target_os = "macos")]
        assert_eq!(
            secured_dir,
            PathBuf::from("/Library/Application Support/OpenFrame/secured")
        );

        #[cfg(target_os = "linux")]
        assert_eq!(secured_dir, PathBuf::from("/var/lib/openframe/secured"));

        #[cfg(target_os = "windows")]
        {
            let program_data = std::env::var_os("ProgramData").unwrap_or_default();
            let expected = PathBuf::from(program_data)
                .join("OpenFrame")
                .join("secured");
            assert_eq!(secured_dir, expected);
        }
    }
}
