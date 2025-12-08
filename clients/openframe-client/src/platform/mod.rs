pub mod directories;
pub mod file_lock;
pub mod permissions;
pub mod uninstall;

#[cfg(target_os = "windows")]
pub mod windows_cleanup;
#[cfg(target_os = "windows")]
pub mod powershell;

// Re-export commonly used items
pub use directories::{DirectoryError, DirectoryManager};
#[cfg(target_os = "windows")]
pub use file_lock::{format_locking_processes, get_locking_processes, is_file_in_use_error, log_file_lock_info, LockingProcess};
pub use permissions::{Capability, PermissionError, PermissionUtils, Permissions};
pub use uninstall::remove_directory_with_retry;
#[cfg(target_os = "windows")]
pub use powershell::get_powershell_path;
