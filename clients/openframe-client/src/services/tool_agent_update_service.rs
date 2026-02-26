use crate::clients::tool_agent_file_client::ToolAgentFileClient;
use tracing::{info, warn};
use anyhow::{Context, Result};
use crate::models::tool_agent_update_message::ToolAgentUpdateMessage;
use crate::models::Installation;
use crate::services::InstalledToolsService;
use crate::services::ToolKillService;
use crate::services::GithubDownloadService;
use crate::services::InstalledAgentMessagePublisher;
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::services::tool_run_manager::ToolRunManager;
use crate::services::ToolCommandParamsResolver;
use crate::platform::{DirectoryManager, ToolUpdaterDeps, needs_migration, detect_actual_installation, run_update, run_migration};

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
    command_params_resolver: ToolCommandParamsResolver,
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
        command_params_resolver: ToolCommandParamsResolver,
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
            command_params_resolver,
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

        let result = self.do_update(new_version, &message, &mut installed_tool).await;

        self.tool_run_manager.clear_updating(tool_agent_id).await;

        result
    }

    async fn do_update(
        &self,
        new_version: &str,
        message: &ToolAgentUpdateMessage,
        installed_tool: &mut crate::models::installed_tool::InstalledTool,
    ) -> Result<()> {
        let tool_agent_id = &installed_tool.tool_agent_id;

        let download_config = if !message.download_configurations.is_empty() {
            self.github_download_service
                .find_config_for_current_os(&message.download_configurations)
                .with_context(|| format!("No download config for current OS: {}", tool_agent_id))?
        } else {
            return self.do_legacy_update(new_version, installed_tool).await;
        };

        let deps = ToolUpdaterDeps {
            github_download_service: self.github_download_service.clone(),
            tool_kill_service: self.tool_kill_service.clone(),
            tool_run_manager: self.tool_run_manager.clone(),
            directory_manager: self.directory_manager.clone(),
            command_params_resolver: self.command_params_resolver.clone(),
        };

        // Check if migration is needed (installation type change)
        let target_type = download_config.installation_type;
        if needs_migration(&installed_tool.installation, target_type) {
            // Check if tool is already installed as target type (metadata might be stale)
            if let Some(actual) = detect_actual_installation(tool_agent_id, download_config, &self.directory_manager) {
                info!(tool_id = %tool_agent_id, "Detected actual installation: {:?}", actual);
                installed_tool.installation = actual;
                self.installed_tools_service.save(installed_tool.clone()).await
                    .with_context(|| format!("Failed to save installation: {}", tool_agent_id))?;
            } else {
                // Migration required
                info!(tool_id = %tool_agent_id, "Migration required: {:?} -> {:?}",
                      installed_tool.installation, target_type);

                let new_installation = run_migration(installed_tool, download_config, target_type, deps).await?;

                installed_tool.version = new_version.to_string();
                installed_tool.installation = new_installation;
                self.installed_tools_service.save(installed_tool.clone()).await
                    .with_context(|| format!("Failed to save migrated tool: {}", tool_agent_id))?;

                info!(tool_id = %tool_agent_id, version = %new_version, "Migration completed successfully");
                self.publish_installed_agent_message(tool_agent_id, new_version).await;
                return Ok(());
            }
        }

        // Same-type update
        run_update(installed_tool, download_config, deps).await?;

        installed_tool.version = new_version.to_string();
        self.installed_tools_service.save(installed_tool.clone()).await
            .with_context(|| format!("Failed to save updated tool: {}", tool_agent_id))?;

        info!(tool_id = %tool_agent_id, version = %new_version, "Update completed successfully");
        self.publish_installed_agent_message(tool_agent_id, new_version).await;

        Ok(())
    }

    async fn do_legacy_update(
        &self,
        new_version: &str,
        installed_tool: &mut crate::models::installed_tool::InstalledTool,
    ) -> Result<()> {
        use tokio::fs::{self, File};
        use tokio::io::AsyncWriteExt;
        #[cfg(target_family = "unix")]
        use std::os::unix::fs::PermissionsExt;

        let tool_agent_id = &installed_tool.tool_agent_id;

        if !matches!(installed_tool.installation, Installation::Standard { .. }) {
            anyhow::bail!(
                "Legacy update (without download_configurations) only supports Standard installation type. \
                Tool {} has {:?}",
                tool_agent_id,
                installed_tool.installation
            );
        }

        let agent_file_path = self.directory_manager.get_agent_path(tool_agent_id);
        let backup_file_path = agent_file_path.with_extension("backup");

        info!(tool_id = %tool_agent_id, "Using legacy update method (Artifactory)");

        self.tool_kill_service.stop_tool(tool_agent_id).await
            .with_context(|| format!("Failed to stop tool: {}", tool_agent_id))?;

        if agent_file_path.exists() {
            fs::copy(&agent_file_path, &backup_file_path).await
                .with_context(|| "Failed to backup")?;
        }

        let new_agent_bytes = self.tool_agent_file_client
            .get_tool_agent_file(tool_agent_id.to_string())
            .await
            .with_context(|| "Failed to download from Artifactory")?;

        File::create(&agent_file_path)
            .await?
            .write_all(&new_agent_bytes)
            .await?;

        #[cfg(target_family = "unix")]
        {
            let mut perms = fs::metadata(&agent_file_path).await?.permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&agent_file_path, perms).await?;
        }

        installed_tool.version = new_version.to_string();
        self.installed_tools_service.save(installed_tool.clone()).await?;

        if backup_file_path.exists() {
            let _ = fs::remove_file(&backup_file_path).await;
        }

        info!(tool_id = %tool_agent_id, version = %new_version, "Legacy update completed");

        self.publish_installed_agent_message(tool_agent_id, new_version).await;

        Ok(())
    }

    async fn publish_installed_agent_message(&self, tool_agent_id: &str, version: &str) {
        info!(tool_id = %tool_agent_id, "Publishing installed agent message");
        match self.config_service.get_machine_id().await {
            Ok(machine_id) => {
                if let Err(e) = self.installed_agent_publisher
                    .publish(machine_id, tool_agent_id.to_string(), version.to_string())
                    .await
                {
                    warn!(tool_id = %tool_agent_id, error = %e, "Failed to publish installed agent message");
                }
            }
            Err(e) => {
                warn!(tool_id = %tool_agent_id, error = %e, "Failed to get machine_id");
            }
        }
    }
}
