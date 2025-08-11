use crate::clients::tool_agent_file_client::ToolAgentFileClient;
use crate::services::tool_installer::ToolInstaller;
use crate::services::tool_connection_message_publisher::ToolConnectionMessagePublisher;

pub struct ToolInstallationService {
    tool_agent_file_client: ToolAgentFileClient,
    tool_installer: ToolInstaller,
    tool_connection_message_publisher: ToolConnectionMessagePublisher,
}

impl ToolInstallationService {
    pub fn new(
        tool_agent_file_client: ToolAgentFileClient,
        tool_installer: ToolInstaller,
        tool_connection_message_publisher: ToolConnectionMessagePublisher,
    ) -> Self {
        Self {
            tool_agent_file_client,
            tool_installer,
            tool_connection_message_publisher,
        }
    }

    pub async fn install(&self, tool_id: String, tool_installation_message: ToolInstallationMessage) -> Result<()> {
        info!("Installing tool {} with version {}", tool_id, tool_installation_message.version);

        let tool_agent_file_bytes = self.tool_agent_file_client.get_tool_agent_id(tool_id).await?;
        let tool_installation_result = self.tool_installer.install(tool_id, tool_agent_file_bytes).await?;

        let tool_agent_id = tool_installation_result.tool_agent_id;

        // TODO: add error handling
        self.tool_connection_message_publisher.publish(machine_id, tool_agent_id).await
    }
}