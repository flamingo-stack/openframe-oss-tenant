#[cfg(target_os = "macos")]
mod macos;

#[cfg(target_os = "macos")]
pub use macos::{get_console_user, is_gui_session_ready, is_process_running, launch_as_user};
