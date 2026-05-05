use std::fs;
use std::io;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

static ADMIN_PRIVILEGES_GRANTED: AtomicBool = AtomicBool::new(false);

#[derive(Debug)]
pub enum PermissionError {
    Io(io::Error),
    InvalidMode(String),
    InvalidPath(String),
    AdminCheckFailed(String),
    ElevationRequired,
    CommandFailed(i32),
}

impl std::fmt::Display for PermissionError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PermissionError::Io(e) => write!(f, "IO error: {}", e),
            PermissionError::InvalidMode(msg) => write!(f, "Invalid mode: {}", msg),
            PermissionError::InvalidPath(msg) => write!(f, "Invalid path: {}", msg),
            PermissionError::AdminCheckFailed(msg) => write!(f, "Admin check failed: {}", msg),
            PermissionError::ElevationRequired => write!(f, "Elevation to admin/root required"),
            PermissionError::CommandFailed(code) => write!(f, "Command failed with code: {}", code),
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
    pub fn directory() -> Self {
        Self { mode: 0o755 }
    }

    pub fn file() -> Self {
        Self { mode: 0o644 }
    }

    pub fn apply(&self, path: &Path) -> Result<(), PermissionError> {
        #[cfg(unix)]
        {
            let perms = fs::Permissions::from_mode(self.mode);
            fs::set_permissions(path, perms).map_err(PermissionError::Io)
        }

        #[cfg(not(unix))]
        {
            if self.mode & 0o200 != 0 && path.exists() {
                let metadata = fs::metadata(path)?;
                let mut perms = metadata.permissions();
                if perms.readonly() {
                    perms.set_readonly(false);
                    fs::set_permissions(path, perms)?;
                }
            }
            Ok(())
        }
    }
}

pub struct PermissionUtils;

impl PermissionUtils {
    pub fn is_admin() -> bool {
        if ADMIN_PRIVILEGES_GRANTED.load(Ordering::Relaxed) {
            return true;
        }

        #[cfg(unix)]
        {
            unsafe { libc::geteuid() == 0 }
        }

        #[cfg(target_os = "windows")]
        {
            is_elevated::is_elevated()
        }

        #[cfg(all(not(unix), not(target_os = "windows")))]
        {
            false
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub enum Capability {
    ManageServices,
    WriteSystemDirectories,
}

impl PermissionUtils {
    pub fn has_capability(capability: Capability) -> bool {
        match capability {
            Capability::ManageServices => Self::is_admin(),
            Capability::WriteSystemDirectories => Self::is_admin(),
        }
    }
}
