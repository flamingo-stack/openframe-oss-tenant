use crate::clients::tool_agent_file_client::ToolAgentFileClient;
use tracing::{info, debug, warn};
use anyhow::{Context, Result};
use crate::models::tool_agent_update_message::ToolAgentUpdateMessage;
use crate::services::InstalledToolsService;
use crate::services::ToolKillService;
use crate::platform::DirectoryManager;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use tokio::fs;
#[cfg(target_family = "unix")]
use std::os::unix::fs::PermissionsExt;

#[derive(Clone)]
pub struct ToolAgentUpdateService {
    tool_agent_file_client: ToolAgentFileClient,
    installed_tools_service: InstalledToolsService,
    tool_kill_service: ToolKillService,
    directory_manager: DirectoryManager,
}

impl ToolAgentUpdateService {
    pub fn new(
        tool_agent_file_client: ToolAgentFileClient,
        installed_tools_service: InstalledToolsService,
        tool_kill_service: ToolKillService,
        directory_manager: DirectoryManager,
    ) -> Self {
        // Ensure directories exist
        directory_manager
            .ensure_directories()
            .with_context(|| "Failed to ensure secured directory exists")
            .unwrap();

        Self {
            tool_agent_file_client,
            installed_tools_service,
            tool_kill_service,
            directory_manager,
        }
    }

    // TODO: add version timestamp and process race conditions
    pub async fn process_update(&self, message: ToolAgentUpdateMessage) -> Result<()> {
        let tool_agent_id = &message.tool_agent_id;
        let new_version = &message.version;
        
        info!("Processing tool agent update for tool: {} to version: {}", tool_agent_id, new_version);

        // Check if tool is installed
        let mut installed_tool = match self.installed_tools_service.get_by_tool_agent_id(tool_agent_id).await? {
            Some(tool) => tool,
            None => {
                warn!("Tool {} is not installed, skipping update", tool_agent_id);
                return Ok(());
            }
        };

        // Check if version is different
        if installed_tool.version == *new_version {
            info!("Tool {} is already at version {}, no update needed", tool_agent_id, new_version);
            return Ok(());
        }

        info!("Updating tool {} from version {} to {}", tool_agent_id, installed_tool.version, new_version);

        // Get tool directory path
        let base_folder_path = self.directory_manager.app_support_dir();
        let tool_folder_path = base_folder_path.join(tool_agent_id);
        let agent_file_path = tool_folder_path.join("agent");
        let backup_file_path = tool_folder_path.join("agent.backup");

        // Backup current binary
        if agent_file_path.exists() {
            info!("Backing up current agent binary for tool: {}", tool_agent_id);
            fs::copy(&agent_file_path, &backup_file_path)
                .await
                .with_context(|| format!("Failed to backup agent binary for tool: {}", tool_agent_id))?;
        }

        // Download new binary
        info!("Downloading new agent binary for tool: {} version: {}", tool_agent_id, new_version);
        let new_agent_bytes = self
            .tool_agent_file_client
            .get_tool_agent_file(tool_agent_id.clone())
            .await
            .with_context(|| format!("Failed to download new agent binary for tool: {}", tool_agent_id))?;

        // Write new binary
        File::create(&agent_file_path)
            .await?
            .write_all(&new_agent_bytes)
            .await
            .with_context(|| format!("Failed to write new agent binary for tool: {}", tool_agent_id))?;

        // Set executable permissions
        #[cfg(target_family = "unix")]
        {
            let mut perms = fs::metadata(&agent_file_path).await?.permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&agent_file_path, perms)
                .await
                .with_context(|| format!("Failed to chmod +x {}", agent_file_path.display()))?;
        }

        info!("New agent binary downloaded and saved for tool: {}", tool_agent_id);

        // Stop running tool process before updating
        info!("Stopping tool process before update: {}", tool_agent_id);
        self.tool_kill_service.stop_tool(tool_agent_id).await
            .with_context(|| format!("Failed to stop tool process for: {}", tool_agent_id))?;

        // Update installed tool version and status
        installed_tool.version = new_version.clone();

        self.installed_tools_service.save(installed_tool).await
            .with_context(|| format!("Failed to update installed tool record for: {}", tool_agent_id))?;

        // Remove backup on successful update
        if backup_file_path.exists() {
            fs::remove_file(&backup_file_path)
                .await
                .with_context(|| format!("Failed to remove backup file for tool: {}", tool_agent_id))?;
            debug!("Removed backup file for tool: {}", tool_agent_id);
        }

        info!("Tool agent update completed successfully for tool: {} to version: {}", tool_agent_id, new_version);
        info!("Tool {} will be restarted by ToolRunManager after detecting process exit", tool_agent_id);
        
        Ok(())
    }
}