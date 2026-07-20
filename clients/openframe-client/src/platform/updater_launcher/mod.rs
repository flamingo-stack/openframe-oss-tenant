use std::path::PathBuf;

/// Parameters needed to launch the updater
pub struct UpdaterParams {
    pub binary_path: PathBuf,
    pub target_exe: PathBuf,
    pub service_name: String,
    pub update_state_path: String,
    /// Version the boot marker is compared against.
    pub target_version: String,
    /// Written by the new binary at startup (layer-1 boot check).
    pub boot_marker_path: PathBuf,
    /// Last-known-good reserve binary — preferred rollback source.
    pub lkg_path: PathBuf,
    /// Updater transcript output path.
    pub transcript_path: PathBuf,
    /// Skip the archive/swap and only restore the reserve (layer-2 rollback).
    pub rollback_only: bool,
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
