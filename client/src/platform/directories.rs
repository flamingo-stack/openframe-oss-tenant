use directories::BaseDirs;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
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
        }
    }
}

#[derive(Debug, Clone)]
pub struct DirectoryManager {
    logs_dir: PathBuf,
    app_support_dir: PathBuf,
}

impl DirectoryManager {
    pub fn new() -> Self {
        let app_support_dir = PathBuf::from("/Library/Application Support/OpenFrame");
        let logs_dir = PathBuf::from("/Library/Logs/OpenFrame");

        Self {
            logs_dir,
            app_support_dir,
        }
    }

    /// Performs a comprehensive health check of all directories
    pub fn perform_health_check(&self) -> Result<(), DirectoryError> {
        info!("Starting directory health check...");

        // Check and create directories if needed
        self.ensure_directories()?;

        // Validate permissions
        if let Err(e) = self.validate_permissions() {
            warn!("Permission validation failed: {}", e);
            info!("Attempting to fix permissions...");
            self.fix_permissions()?;
        }

        // Final validation
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
            fs::create_dir_all(path)
                .map_err(|e| DirectoryError::CreateFailed(path.to_path_buf(), e))?;
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

    /// Validates permissions on all directories
    pub fn validate_permissions(&self) -> Result<(), DirectoryError> {
        let dir_perms = Permissions::directory();

        self.validate_directory_permissions(&self.logs_dir, &dir_perms)?;
        self.validate_directory_permissions(&self.app_support_dir, &dir_perms)?;

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

        if !expected_perms
            .verify(path)
            .map_err(|e| DirectoryError::ValidationFailed(path.to_path_buf(), e.to_string()))?
        {
            let current = Permissions::from_path(path)
                .map_err(|e| DirectoryError::ValidationFailed(path.to_path_buf(), e.to_string()))?;

            return Err(DirectoryError::ValidationFailed(
                path.to_path_buf(),
                format!(
                    "Incorrect permissions: expected mode {:o}, got mode {:o}",
                    expected_perms.mode, current.mode,
                ),
            ));
        }

        if !self.can_write_to_directory(path) {
            return Err(DirectoryError::PermissionDenied(path.to_path_buf()));
        }

        Ok(())
    }

    /// Attempts to fix permissions on all directories
    pub fn fix_permissions(&self) -> Result<(), DirectoryError> {
        let dir_perms = Permissions::directory();

        self.fix_directory_permissions(&self.logs_dir, &dir_perms)?;
        self.fix_directory_permissions(&self.app_support_dir, &dir_perms)?;

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

        perms
            .apply(path)
            .map_err(|e| DirectoryError::FixFailed(path.to_path_buf(), e.to_string()))?;

        Ok(())
    }

    /// Tests if we can write to a directory
    fn can_write_to_directory(&self, path: &Path) -> bool {
        let test_file = path.join(".write_test");
        let result = fs::OpenOptions::new()
            .write(true)
            .create(true)
            .open(&test_file);

        // Clean up test file if it was created
        if test_file.exists() {
            let _ = fs::remove_file(&test_file);
        }

        result.is_ok()
    }

    // Getter methods for directory paths
    pub fn logs_dir(&self) -> &Path {
        &self.logs_dir
    }

    pub fn app_support_dir(&self) -> &Path {
        &self.app_support_dir
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::os::unix::fs::PermissionsExt;
    use tempfile::tempdir;

    #[test]
    fn test_directory_creation() {
        let temp = tempdir().unwrap();
        let test_dir = DirectoryManager {
            logs_dir: temp.path().join("logs"),
            app_support_dir: temp.path().join("app"),
        };

        assert!(test_dir.ensure_directories().is_ok());
        assert!(test_dir.logs_dir.exists());
        assert!(test_dir.app_support_dir.exists());
    }

    #[test]
    fn test_directory_permissions() {
        let temp = tempdir().unwrap();
        let test_dir = DirectoryManager {
            logs_dir: temp.path().join("logs"),
            app_support_dir: temp.path().join("app"),
        };

        // Create directories with wrong permissions first
        std::fs::create_dir_all(&test_dir.logs_dir).unwrap();
        std::fs::create_dir_all(&test_dir.app_support_dir).unwrap();

        // Set wrong permissions (too open)
        std::fs::set_permissions(&test_dir.logs_dir, std::fs::Permissions::from_mode(0o777))
            .unwrap();

        // Validation should fail
        assert!(test_dir.validate_permissions().is_err());

        // Fix permissions
        assert!(test_dir.fix_permissions().is_ok());

        // Validation should now pass
        assert!(test_dir.validate_permissions().is_ok());

        // Verify specific permissions
        let logs_perms = std::fs::metadata(&test_dir.logs_dir).unwrap().permissions();
        assert_eq!(logs_perms.mode() & 0o777, 0o755);
    }

    #[test]
    fn test_file_permissions() {
        let temp = tempdir().unwrap();
        let test_dir = DirectoryManager {
            logs_dir: temp.path().join("logs"),
            app_support_dir: temp.path().join("app"),
        };

        // Create directories
        test_dir.ensure_directories().unwrap();

        // Create a test log file
        let log_file = test_dir.logs_dir.join("test.log");
        File::create(&log_file).unwrap();

        // Set wrong permissions
        std::fs::set_permissions(&log_file, std::fs::Permissions::from_mode(0o777)).unwrap();

        // Fix permissions
        let file_perms = Permissions::file();
        assert!(file_perms.apply(&log_file).is_ok());

        // Verify permissions
        let perms = std::fs::metadata(&log_file).unwrap().permissions();
        assert_eq!(perms.mode() & 0o777, 0o644);
    }

    #[test]
    fn test_error_handling() {
        let temp = tempdir().unwrap();
        let test_dir = DirectoryManager {
            logs_dir: temp.path().join("logs"),
            app_support_dir: temp.path().join("app"),
        };

        // Create a file where a directory should be
        std::fs::write(&test_dir.logs_dir, "").unwrap();

        // Ensure directories should fail
        let result = test_dir.ensure_directories();
        assert!(result.is_err());
        match result.unwrap_err() {
            DirectoryError::CreateFailed(path, _) => {
                assert_eq!(path, test_dir.logs_dir);
            }
            _ => panic!("Wrong error type"),
        }
    }

    #[test]
    fn test_health_check() {
        let temp = tempdir().unwrap();
        let test_dir = DirectoryManager {
            logs_dir: temp.path().join("logs"),
            app_support_dir: temp.path().join("app"),
        };

        // Initial health check should succeed and create directories
        assert!(test_dir.perform_health_check().is_ok());

        // Corrupt permissions
        std::fs::set_permissions(&test_dir.logs_dir, std::fs::Permissions::from_mode(0o777))
            .unwrap();

        // Health check should detect and fix the issue
        assert!(test_dir.perform_health_check().is_ok());

        // Verify fixed permissions
        let perms = std::fs::metadata(&test_dir.logs_dir).unwrap().permissions();
        assert_eq!(perms.mode() & 0o777, 0o755);
    }

    #[test]
    fn test_write_permissions() {
        let temp = tempdir().unwrap();
        let test_dir = DirectoryManager {
            logs_dir: temp.path().join("logs"),
            app_support_dir: temp.path().join("app"),
        };

        test_dir.ensure_directories().unwrap();

        // Test write access to each directory
        assert!(test_dir.can_write_to_directory(&test_dir.logs_dir));
        assert!(test_dir.can_write_to_directory(&test_dir.app_support_dir));
    }
}
