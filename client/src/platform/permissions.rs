use std::ffi::CString;
use std::fs::{self, Metadata};
use std::io;
#[cfg(unix)]
use std::os::unix::fs::{MetadataExt, PermissionsExt};
use std::path::{Path, PathBuf};
use tracing::{error, info, warn};

#[cfg(unix)]
use libc;

/// Default UID for root user
#[cfg(unix)]
const ROOT_UID: u32 = 0;
/// Default GID for admin group on macOS
#[cfg(unix)]
const ADMIN_GID: u32 = 80;

#[cfg(not(unix))]
const ROOT_UID: u32 = 0;
#[cfg(not(unix))]
const ADMIN_GID: u32 = 0;

#[derive(Debug)]
pub enum PermissionError {
    Io(io::Error),
    InvalidMode(String),
    InvalidPath(String),
}

impl std::fmt::Display for PermissionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PermissionError::Io(e) => write!(f, "IO error: {}", e),
            PermissionError::InvalidMode(msg) => write!(f, "Invalid mode: {}", msg),
            PermissionError::InvalidPath(msg) => write!(f, "Invalid path: {}", msg),
        }
    }
}

impl std::error::Error for PermissionError {}

impl From<io::Error> for PermissionError {
    fn from(err: io::Error) -> Self {
        PermissionError::Io(err)
    }
}

#[derive(Debug, Clone)]
pub struct Permissions {
    pub mode: u32,
}

impl Permissions {
    /// Create standard directory permissions (755, root:admin)
    pub fn directory() -> Self {
        Self { mode: 0o755 }
    }

    /// Create standard file permissions (644, root:admin)
    pub fn file() -> Self {
        Self { mode: 0o644 }
    }

    /// Apply permissions to a path
    pub fn apply(&self, path: &Path) -> Result<(), PermissionError> {
        let perms = fs::Permissions::from_mode(self.mode);
        fs::set_permissions(path, perms).map_err(PermissionError::Io)
    }

    /// Verify permissions on a path
    pub fn verify(&self, path: &Path) -> Result<bool, PermissionError> {
        let metadata = fs::metadata(path).map_err(PermissionError::Io)?;
        Ok((metadata.permissions().mode() & 0o777) == self.mode)
    }

    /// Get permissions from an existing path
    pub fn from_path(path: &Path) -> Result<Self, PermissionError> {
        let metadata = fs::metadata(path).map_err(PermissionError::Io)?;
        Ok(Self {
            mode: metadata.permissions().mode() & 0o777,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_permissions_creation() {
        let dir_perms = Permissions::directory();
        assert_eq!(dir_perms.mode, 0o755);

        let file_perms = Permissions::file();
        assert_eq!(file_perms.mode, 0o644);
    }

    #[cfg(unix)]
    #[test]
    fn test_permissions_verification() {
        if unsafe { libc::geteuid() } == 0 {
            let temp = tempdir().unwrap();
            let test_path = temp.path().join("test_file");
            fs::write(&test_path, "test").unwrap();

            let perms = Permissions::file();
            assert!(perms.apply(&test_path).is_ok());
            assert!(perms.verify(&test_path).unwrap());
        }
    }
}
