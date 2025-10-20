use crate::clients::tool_agent_file_client::ToolAgentFileClient;
use tracing::{info, debug, warn};
use anyhow::{Context, Result};
use crate::models::tool_agent_update_message::ToolAgentUpdateMessage;
use crate::services::InstalledToolsService;
use crate::services::ToolRunManager;
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
    tool_run_manager: ToolRunManager,
    directory_manager: DirectoryManager,
}

impl ToolAgentUpdateService {
    pub fn new(
        tool_agent_file_client: ToolAgentFileClient,
        installed_tools_service: InstalledToolsService,
        tool_run_manager: ToolRunManager,
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
            tool_run_manager,
            directory_manager,
        }
    }

    /// Process tool agent update message.
    /// Currently only updates session type if tool is installed.
    /// Version updates are temporarily disabled.
    pub async fn process_update(&self, message: ToolAgentUpdateMessage) -> Result<()> {
        let tool_agent_id = &message.tool_agent_id;
        let session_type = &message.session_type;
        
        info!("Processing tool agent update for tool: {}, session type: {:?}", tool_agent_id, session_type);

        // Check if tool is installed
        let mut installed_tool = match self.installed_tools_service.get_by_tool_agent_id(tool_agent_id).await? {
            Some(tool) => tool,
            None => {
                warn!("Tool {} is not installed, skipping update", tool_agent_id);
                return Ok(());
            }
        };

        // Update session type if changed
        if installed_tool.session_type != message.session_type {
            info!("Updating session type for tool {} from {:?} to {:?}", 
                  tool_agent_id, installed_tool.session_type, session_type);
            
            // Update the session type
            installed_tool.session_type = message.session_type.clone();
            
            // Save the updated configuration to database
            self.installed_tools_service.save(installed_tool.clone()).await
                .with_context(|| format!("Failed to update installed tool record for: {}", tool_agent_id))?;
            
            info!("Session type updated successfully in database for tool: {}", tool_agent_id);
            
            // Rerun the tool with new configuration
            info!("Rerunning tool {} with new session type: {:?}", tool_agent_id, session_type);
            self.tool_run_manager.rerun_tool(installed_tool).await
                .with_context(|| format!("Failed to rerun tool with new configuration: {}", tool_agent_id))?;
            
            info!("Tool {} has been restarted with new session type: {:?}", tool_agent_id, session_type);
        } else {
            debug!("Session type for tool {} is already {:?}, no update needed", tool_agent_id, session_type);
        }

        // TODO: Version updates are temporarily disabled
        // Uncomment the line below to enable version updates
        // self.process_version_update(&message, installed_tool).await?;
        
        Ok(())
    }

    /// Process version update for a tool agent.
    /// This method handles:
    /// - Backing up current binary
    /// - Downloading new binary
    /// - Updating version in database
    /// - Stopping and restarting the tool
    /// 
    /// TODO: add version timestamp and process race conditions
    #[allow(dead_code)]
    async fn process_version_update(&self, message: &ToolAgentUpdateMessage, mut installed_tool: crate::models::InstalledTool) -> Result<()> {
        let tool_agent_id = &message.tool_agent_id;
        let new_version = &message.version;
        
        info!("Processing version update for tool: {} to version: {}", tool_agent_id, new_version);

        // Check if version is different
        if installed_tool.version == *new_version {
            info!("Tool {} is already at version {}, no version update needed", tool_agent_id, new_version);
            return Ok(());
        }

        info!("Updating tool {} from version {} to {}", 
              tool_agent_id, installed_tool.version, new_version);

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

        // Update installed tool version
        installed_tool.version = new_version.clone();

        // Save the updated configuration to database
        self.installed_tools_service.save(installed_tool.clone()).await
            .with_context(|| format!("Failed to update installed tool record for: {}", tool_agent_id))?;

        info!("Version updated successfully in database for tool: {}", tool_agent_id);

        // Rerun the tool with new binary version
        info!("Rerunning tool {} with new version: {}", tool_agent_id, new_version);
        self.tool_run_manager.rerun_tool(installed_tool).await
            .with_context(|| format!("Failed to rerun tool with new version: {}", tool_agent_id))?;

        // Remove backup on successful update
        if backup_file_path.exists() {
            fs::remove_file(&backup_file_path)
                .await
                .with_context(|| format!("Failed to remove backup file for tool: {}", tool_agent_id))?;
            debug!("Removed backup file for tool: {}", tool_agent_id);
        }

        info!("Tool agent version update completed successfully for tool: {} to version: {}", tool_agent_id, new_version);
        info!("Tool {} has been restarted with new version: {}", tool_agent_id, new_version);
        
        Ok(())
    }
}