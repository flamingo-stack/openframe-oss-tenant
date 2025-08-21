use crate::clients::tool_agent_file_client::ToolAgentFileClient;
use crate::services::tool_installer::ToolInstaller;
use crate::services::tool_connection_message_publisher::ToolConnectionMessagePublisher;
use tracing::info;
use anyhow::{Context, Result};
use crate::models::ToolInstallationMessage;
use crate::services::InstalledToolsService;
use crate::models::installed_tool::ToolStatus;
use crate::models::InstalledTool;

pub struct ToolInstallationService {
    tool_agent_file_client: ToolAgentFileClient,
    tool_installer: ToolInstaller,
    tool_connection_message_publisher: ToolConnectionMessagePublisher,
    installed_tools_service: InstalledToolsService,
}

impl ToolInstallationService {
    pub fn new(
        tool_agent_file_client: ToolAgentFileClient,
        tool_installer: ToolInstaller,
        tool_connection_message_publisher: ToolConnectionMessagePublisher,
        installed_tools_service: InstalledToolsService,
    ) -> Self {
        Self {
            tool_agent_file_client,
            tool_installer,
            tool_connection_message_publisher,
            installed_tools_service,
        }
    }

    pub async fn install(&self, tool_installation_message: ToolInstallationMessage) -> Result<()> {
        let machine_id = tool_installation_message.tool_id.clone();
        info!("Installing tool {} with version {}", tool_installation_message.tool_id, tool_installation_message.version);

        // TODO: process different version race conditions
        // TODO: mark as installing before installation
        // TODO: idenpotency of each operation

        let version_clone = tool_installation_message.version.clone();
        let run_args_clone = tool_installation_message.run_command_args.clone();

        let tool_agent_file_bytes = self
            .tool_agent_file_client
            .get_tool_agent_file(tool_installation_message.tool_id.clone())
            .await?;

        let tool_installation_result = self
            .tool_installer
            .install(tool_installation_message, tool_agent_file_bytes)
            .await?;

        let tool_agent_id = tool_installation_result.tool_agent_id;

        // Publish connection message (ignore errors for now)
        // self
        //     .tool_connection_message_publisher
        //     .publish(machine_id.clone(), tool_agent_id)
        //     .await?;

        // Persist installed tool information
        let installed_tool = InstalledTool {
            tool_id: machine_id,
            version: version_clone,
            run_command_args: run_args_clone,
            status: ToolStatus::Installed,
        };

        self.installed_tools_service.save(installed_tool).await
            .context("Failed to save installed tool")?;

        Ok(())
    }
}