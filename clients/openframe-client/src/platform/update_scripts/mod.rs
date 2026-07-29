#[cfg(target_os = "windows")]
pub mod windows;

#[cfg(target_os = "macos")]
pub mod macos;

#[cfg(target_os = "windows")]
pub use windows::UPDATE_SCRIPT_WINDOWS;

#[cfg(target_os = "macos")]
pub use macos::{UPDATER_PLIST_TEMPLATE, UPDATE_SCRIPT_MACOS};

#[cfg(test)]
#[path = "mod_tests.rs"]
mod tests;
