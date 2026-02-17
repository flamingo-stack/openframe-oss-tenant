pub mod directories;
pub mod dmg_extractor;
pub mod file_lock;
pub mod permissions;
pub mod uninstall;
pub mod update_scripts;
pub mod updater_launcher;
pub mod user_session;

#[cfg(target_os = "macos")]
pub mod preferences_writer;
#[cfg(target_os = "windows")]
pub mod windows_cleanup;
#[cfg(target_os = "windows")]
pub mod powershell;

// Re-export commonly used items
pub use directories::{DirectoryError, DirectoryManager};
pub use dmg_extractor::DmgExtractor;
#[cfg(target_os = "windows")]
pub use file_lock::{format_locking_processes, get_locking_processes, is_file_in_use_error, log_file_lock_info, LockingProcess};
pub use permissions::{Capability, PermissionError, PermissionUtils, Permissions};
pub use uninstall::remove_directory_with_retry;
#[cfg(target_os = "windows")]
pub use powershell::get_powershell_path;
