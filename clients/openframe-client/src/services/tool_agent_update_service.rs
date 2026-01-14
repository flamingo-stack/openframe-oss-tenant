use crate::clients::tool_agent_file_client::ToolAgentFileClient;
use tracing::{info, debug, warn};
use anyhow::{Context, Result};
use crate::models::tool_agent_update_message::ToolAgentUpdateMessage;
use crate::services::InstalledToolsService;
use crate::services::ToolKillService;
use crate::services::GithubDownloadService;
use crate::services::InstalledAgentMessagePublisher;
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::services::tool_run_manager::ToolRunManager;
use crate::platform::DirectoryManager;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use tokio::fs;
#[cfg(target_family = "unix")]
use std::os::unix::fs::PermissionsExt;

#[derive(Clone)]
pub struct ToolAgentUpdateService {
    github_download_service: GithubDownloadService,
    tool_agent_file_client: ToolAgentFileClient,
    installed_tools_service: InstalledToolsService,
    tool_kill_service: ToolKillService,
    tool_run_manager: ToolRunManager,
    directory_manager: DirectoryManager,
    config_service: AgentConfigurationService,
    installed_agent_publisher: InstalledAgentMessagePublisher,
}

impl ToolAgentUpdateService {
    pub fn new(
        github_download_service: GithubDownloadService,
        tool_agent_file_client: ToolAgentFileClient,
        installed_tools_service: InstalledToolsService,
        tool_kill_service: ToolKillService,
        tool_run_manager: ToolRunManager,
        directory_manager: DirectoryManager,
        config_service: AgentConfigurationService,
        installed_agent_publisher: InstalledAgentMessagePublisher,
    ) -> Self {
        // Ensure directories exist
        directory_manager
            .ensure_directories()
            .with_context(|| "Failed to ensure secured directory exists")
            .unwrap();

        Self {
            github_download_service,
            tool_agent_file_client,
            installed_tools_service,
            tool_kill_service,
            tool_run_manager,
            directory_manager,
            config_service,
            installed_agent_publisher,
        }
    }

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

        self.tool_run_manager.mark_updating(tool_agent_id).await;

        let result = self.do_update(tool_agent_id, new_version, &message, &mut installed_tool).await;

        self.tool_run_manager.clear_updating(tool_agent_id).await;

        result
    }

    async fn do_update(
        &self,
        tool_agent_id: &str,
        new_version: &str,
        message: &ToolAgentUpdateMessage,
        installed_tool: &mut crate::models::installed_tool::InstalledTool,
    ) -> Result<()> {
        // Get tool directory path
        let agent_file_path = self.directory_manager.get_agent_path(tool_agent_id);
        let backup_file_path = agent_file_path.with_extension("backup");

        info!("Stopping tool process for update: {}", tool_agent_id);
        self.tool_kill_service.stop_tool(tool_agent_id).await
            .with_context(|| format!("Failed to stop tool process for: {}", tool_agent_id))?;

        if agent_file_path.exists() {
            info!("Backing up current agent binary for tool: {}", tool_agent_id);
            fs::copy(&agent_file_path, &backup_file_path)
                .await
                .with_context(|| format!("Failed to backup agent binary for tool: {}", tool_agent_id))?;
        }

        info!("Downloading new agent binary for tool: {} version: {}", tool_agent_id, new_version);
        let new_agent_bytes = if !message.download_configurations.is_empty() {
            // Use GithubDownloadService with download configurations
            info!("Using download configurations to update tool agent");
            let download_config = GithubDownloadService::find_config_for_current_os(&message.download_configurations)
                .with_context(|| format!("Failed to find download configuration for current OS for tool: {}", tool_agent_id))?;

            self.github_download_service
                .download_and_extract(download_config)
                .await
                .with_context(|| format!("Failed to download and extract tool agent update for: {}", tool_agent_id))?
        } else {
            // Fall back to legacy method (Artifactory)
            info!("Using legacy method to update tool agent");
            self.tool_agent_file_client
                .get_tool_agent_file(tool_agent_id.to_string())
                .await
                .with_context(|| format!("Failed to download new agent binary for tool: {}", tool_agent_id))?
        };

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

        info!("New agent binary written for tool: {}", tool_agent_id);

        installed_tool.version = new_version.to_string();
        self.installed_tools_service.save(installed_tool.clone()).await
            .with_context(|| format!("Failed to update installed tool record for: {}", tool_agent_id))?;

        if backup_file_path.exists() {
            fs::remove_file(&backup_file_path)
                .await
                .with_context(|| format!("Failed to remove backup file for tool: {}", tool_agent_id))?;
            debug!("Removed backup file for tool: {}", tool_agent_id);
        }

        info!("Tool agent update completed for tool: {} to version: {}", tool_agent_id, new_version);

        // Publish installed agent message
        info!("Publishing installed agent message for updated tool: {}", tool_agent_id);
        match self.config_service.get_machine_id().await {
            Ok(machine_id) => {
                if let Err(e) = self.installed_agent_publisher
                    .publish(machine_id, tool_agent_id.to_string(), new_version.to_string())
                    .await
                {
                    warn!("Failed to publish installed agent message for {}: {:#}", tool_agent_id, e);
                }
            }
            Err(e) => {
                warn!("Failed to get machine_id for installed agent message: {:#}", e);
            }
        }

        Ok(())
    }
}