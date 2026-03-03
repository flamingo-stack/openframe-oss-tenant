use std::path::Path;
use tracing::info;

use crate::models::{DownloadConfiguration, Installation, InstallationType};
use crate::platform::DirectoryManager;

pub fn detect_actual_installation(
    tool_id: &str,
    config: &DownloadConfiguration,
    directory_manager: &DirectoryManager,
) -> Option<Installation> {
    match config.installation_type {
        InstallationType::Service => detect_service(tool_id, config, directory_manager),
        InstallationType::GuiApp => None,
        InstallationType::Standard => None,
    }
}

fn detect_service(
    tool_id: &str,
    config: &DownloadConfiguration,
    directory_manager: &DirectoryManager,
) -> Option<Installation> {
    let service_name = config.service_name.as_ref()?;

    #[cfg(target_os = "macos")]
    {
        let plist_path = format!("/Library/LaunchDaemons/{}.plist", service_name);
        if Path::new(&plist_path).exists() {
            info!(tool_id = %tool_id, "Detected existing service: {}", plist_path);

            let exec_path = directory_manager
                .get_tool_executable_path(tool_id, Some(&config.target_file_name))
                .to_string_lossy()
                .to_string();

            return Some(Installation::Service {
                service_name: service_name.clone(),
                executable_path: Some(exec_path),
            });
        }
    }

    #[cfg(windows)]
    {
        use std::process::Command;

        let output = Command::new("sc")
            .args(&["query", service_name])
            .output();

        if let Ok(out) = output {
            if out.status.success() {
                info!(tool_id = %tool_id, "Detected existing Windows service: {}", service_name);

                let exec_path = directory_manager
                    .get_tool_executable_path(tool_id, Some(&config.target_file_name))
                    .to_string_lossy()
                    .to_string();

                return Some(Installation::Service {
                    service_name: service_name.clone(),
                    executable_path: Some(exec_path),
                });
            }
        }
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let _ = (tool_id, service_name, directory_manager);
    }

    None
}
