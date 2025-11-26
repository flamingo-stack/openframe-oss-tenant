pub mod directories;
pub mod permissions;
pub mod uninstall;

#[cfg(target_os = "windows")]
pub mod windows_cleanup;

// Re-export commonly used items
pub use directories::{DirectoryError, DirectoryManager};
pub use permissions::{Capability, PermissionError, PermissionUtils, Permissions};
pub use uninstall::remove_directory_with_retry;
