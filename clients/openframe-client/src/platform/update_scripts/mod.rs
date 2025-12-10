#[cfg(target_os = "windows")]
pub mod windows;

#[cfg(target_os = "macos")]
pub mod macos;

#[cfg(target_os = "windows")]
pub use windows::UPDATE_SCRIPT_WINDOWS;

#[cfg(target_os = "macos")]
pub use macos::{UPDATE_SCRIPT_MACOS, UPDATER_PLIST_TEMPLATE};
