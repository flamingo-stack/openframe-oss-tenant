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
    /// Converts an I/O error into a [`PermissionError::Io`] variant.
    ///
    /// # Examples
    ///
    /// ```
    /// let error: PermissionError = std::io::Error::other("failed").into();
    /// assert!(matches!(error, PermissionError::Io(_)));
    /// ```
    fn from(err: io::Error) -> Self {
        PermissionError::Io(err)
    }
}

#[derive(Debug, Clone)]
pub struct Permissions {
    pub mode: u32,
}

impl Permissions {
    /// Creates permissions for a directory that are accessible by the owner, group, and others.
    ///
    /// # Examples
    ///
    /// ```
    /// let permissions = Permissions::directory();
    /// assert_eq!(permissions.mode, 0o755);
    /// ```
    pub fn directory() -> Self {
        Self { mode: 0o755 }
    }

    /// Creates permissions for a directory accessible only by its owner.
    ///
    /// # Examples
    ///
    /// ```
    /// let permissions = Permissions::secured_directory();
    /// assert_eq!(permissions.mode, 0o700);
    /// ```
    pub fn secured_directory() -> Self {
        Self { mode: 0o700 }
    }

    /// Creates permissions for a regular file using mode `0o644`.
    ///
    /// # Examples
    ///
    /// ```
    /// let permissions = Permissions::file();
    /// assert_eq!(permissions.mode, 0o644);
    /// ```
    pub fn file() -> Self {
        Self { mode: 0o644 }
    }

    /// Applies these permissions to the specified path.
    ///
    /// On Unix, this applies the full numeric permission mode. On non-Unix platforms,
    /// it clears the read-only flag when the mode requests write access and the path
    /// exists.
    ///
    /// # Errors
    ///
    /// Returns [`PermissionError::Io`] if reading metadata or updating permissions
    /// fails.
    ///
    /// # Examples
    ///
    /// ```
    /// use std::fs;
    ///
    /// let path = std::env::temp_dir().join("permissions-example");
    /// fs::write(&path, b"example")?;
    ///
    /// Permissions::file().apply(&path)?;
    /// assert!(path.exists());
    ///
    /// fs::remove_file(path)?;
    /// # Ok::<(), PermissionError>(())
    /// ```
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
                    #[allow(clippy::permissions_set_readonly_false)]
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
    /// Determines whether the current process has administrative privileges.
    ///
    /// # Returns
    ///
    /// `true` if administrative privileges are available, `false` otherwise.
    ///
    /// # Examples
    ///
    /// ```
    /// let is_admin = PermissionUtils::is_admin();
    /// ```
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
    /// Determines whether the current process has the specified capability.
    ///
    /// All supported capabilities require administrative privileges.
    ///
    /// # Examples
    ///
    /// ```
    /// let can_manage_services = PermissionUtils::has_capability(Capability::ManageServices);
    /// assert_eq!(can_manage_services, PermissionUtils::is_admin());
    /// ```
    ///
    /// # Returns
    ///
    /// `true` if the current process has the capability, `false` otherwise.
    pub fn has_capability(capability: Capability) -> bool {
        match capability {
            Capability::ManageServices => Self::is_admin(),
            Capability::WriteSystemDirectories => Self::is_admin(),
        }
    }
}
