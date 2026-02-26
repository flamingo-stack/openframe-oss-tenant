pub mod tool_installation_message_listener;
pub mod openframe_client_update_listener;
pub mod tool_agent_update_listener;

pub use tool_installation_message_listener::ToolInstallationMessageListener;
pub use openframe_client_update_listener::OpenFrameClientUpdateListener;
pub use tool_agent_update_listener::ToolAgentUpdateListener;

use crate::models::download_configuration::{DownloadConfiguration, InstallationType};
use tracing::warn;

/// TEMP HARDCODE: Override installation types for specific tools until backend supports per-OS config.
/// Remove when backend sends correct installationType and serviceName per download configuration.
pub(crate) fn apply_download_config_overrides(tool_agent_id: &str, configs: &mut [DownloadConfiguration]) {
    match tool_agent_id {
        "meshcentral-agent" => {
            warn!("TEMP HARDCODE: Overriding meshcentral-agent to Service installation");
            for config in configs.iter_mut() {
                if config.matches_current_os() {
                    config.installation_type = InstallationType::Service;
                    config.service_name = Some(if cfg!(target_os = "windows") {
                        "Mesh Agent".to_string()
                    } else {
                        "meshagent".to_string()
                    });
                }
            }
        }
        "openframe-chat" => {
            warn!("TEMP HARDCODE: Overriding openframe-chat to GuiApp installation");
            for config in configs.iter_mut() {
                if config.matches_current_os() {
                    config.installation_type = InstallationType::GuiApp;
                }
            }
        }
        _ => {}
    }
}