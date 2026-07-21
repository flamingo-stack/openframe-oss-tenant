use std::path::PathBuf;

/// Parameters needed to launch the updater
pub struct UpdaterParams {
    pub binary_path: PathBuf,
    pub target_exe: PathBuf,
    pub service_name: String,
    pub update_state_path: String,
}

#[cfg(windows)]
mod windows;
#[cfg(windows)]
pub use windows::launch_updater;

#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "macos")]
pub use macos::launch_updater;

#[cfg(target_os = "linux")]
mod linux;
#[cfg(target_os = "linux")]
pub use linux::launch_updater;
