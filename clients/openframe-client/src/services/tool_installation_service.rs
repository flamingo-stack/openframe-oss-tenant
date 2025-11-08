use crate::clients::tool_agent_file_client::ToolAgentFileClient;
use crate::clients::tool_api_client::ToolApiClient;
use tracing::{info, debug, warn};
use anyhow::{Context, Result};
use crate::models::ToolInstallationMessage;
use crate::models::tool_installation_message::AssetSource;
use crate::services::InstalledToolsService;
use crate::services::GithubDownloadService;
use crate::services::InstalledAgentMessagePublisher;
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::models::installed_tool::ToolStatus;
use crate::models::InstalledTool;
use crate::platform::DirectoryManager;
use crate::services::ToolCommandParamsResolver;
use crate::services::ToolUrlParamsResolver;
use crate::services::tool_run_manager::ToolRunManager;
use crate::services::tool_connection_processing_manager::ToolConnectionProcessingManager;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use tokio::fs;
use tokio::process::Command;
use std::path::Path;
#[cfg(target_family = "unix")]
use std::os::unix::fs::PermissionsExt;

#[derive(Clone)]
pub struct ToolInstallationService {
    github_download_service: GithubDownloadService,
    tool_agent_file_client: ToolAgentFileClient,
    tool_api_client: ToolApiClient,
    command_params_resolver: ToolCommandParamsResolver,
    url_params_resolver: ToolUrlParamsResolver,
    installed_tools_service: InstalledToolsService,
    directory_manager: DirectoryManager,
    tool_run_manager: ToolRunManager,
    tool_connection_processing_manager: ToolConnectionProcessingManager,
    config_service: AgentConfigurationService,
    installed_agent_publisher: InstalledAgentMessagePublisher,
}

impl ToolInstallationService {
    pub fn new(
        github_download_service: GithubDownloadService,
        tool_agent_file_client: ToolAgentFileClient,
        tool_api_client: ToolApiClient,
        command_params_resolver: ToolCommandParamsResolver,
        url_params_resolver: ToolUrlParamsResolver,
        installed_tools_service: InstalledToolsService,
        directory_manager: DirectoryManager,
        tool_run_manager: ToolRunManager,
        tool_connection_processing_manager: ToolConnectionProcessingManager,
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
            tool_api_client,
            command_params_resolver,
            url_params_resolver,
            installed_tools_service,
            directory_manager,
            tool_run_manager,
            tool_connection_processing_manager,
            config_service,
            installed_agent_publisher,
        }
    }

    pub async fn install(&self, tool_installation_message: ToolInstallationMessage) -> Result<()> {
        let tool_agent_id = &tool_installation_message.tool_agent_id;
        info!("Installing tool {} with version {}", tool_agent_id, tool_installation_message.version);

        // Check if tool is already installed
        if let Some(installed_tool) = self.installed_tools_service.get_by_tool_agent_id(tool_agent_id).await? {
            info!("Tool {} is already installed with version {}, skipping installation", 
                  tool_agent_id, installed_tool.version);
            return Ok(());
        }

        let version_clone = tool_installation_message.version.clone();
        let run_args_clone = tool_installation_message.run_command_args.clone();

        // Create tool-specific directory
        let base_folder_path = self.directory_manager.app_support_dir();
        let tool_folder_path = base_folder_path.join(tool_agent_id);
        
        // Ensure tool-specific directory exists
        fs::create_dir_all(&tool_folder_path)
            .await
            .with_context(|| format!("Failed to create tool directory: {}", tool_folder_path.display()))?;

        let file_path = self.directory_manager.get_agent_path(tool_agent_id);
        
        // Check if agent file already exists
        if file_path.exists() {
            info!("Agent file for tool {} already exists at {}, skipping download", 
                  tool_agent_id, file_path.display());
        } else {
            // Download main tool agent file
            let tool_agent_file_bytes = if let Some(ref download_configs) = tool_installation_message.download_configurations {
                // Use GithubDownloadService with download configurations
                info!("Using download configurations to download tool agent");
                let download_config = GithubDownloadService::find_config_for_current_os(download_configs)
                    .with_context(|| format!("Failed to find download configuration for current OS for tool: {}", tool_agent_id))?;
                
                self.github_download_service
                    .download_and_extract(download_config)
                    .await
                    .with_context(|| format!("Failed to download and extract tool agent for: {}", tool_agent_id))?
            } else {
                // Fall back to legacy method (Artifactory)
                info!("Using legacy method to download tool agent");
                self.tool_agent_file_client
                    .get_tool_agent_file(tool_agent_id.clone())
                    .await
                    .with_context(|| format!("Failed to download tool agent file for: {}", tool_agent_id))?
            };

            // Save directly and set permissions (always executable)
            File::create(&file_path).await?.write_all(&tool_agent_file_bytes).await?;

            // Set file permissions to executable
            self.set_executable_permissions(&file_path).await
                .with_context(|| format!("Failed to set executable permissions for {}", file_path.display()))?;
            
            info!("Agent file for tool {} downloaded and saved to {}", tool_agent_id, file_path.display());
        }

        // Download and save assets
        if let Some(ref assets) = tool_installation_message.assets {
            for asset in assets {
                // Use the executable field from the asset
                let is_executable = asset.executable;
                let asset_path = self.directory_manager.get_asset_path(tool_agent_id, &asset.local_filename, is_executable);
                
                // Check if asset file already exists
                if asset_path.exists() {
                    info!("Asset {} for tool {} already exists at {}, skipping download", 
                          asset.id, tool_agent_id, asset_path.display());
                    continue;
                }

                let asset_bytes = match asset.source {
                    AssetSource::Artifactory => {
                        info!("Downloading artifactory asset: {}", asset.id);
                        self.tool_agent_file_client
                            .get_tool_agent_file(asset.id.clone())
                            .await
                            .with_context(|| format!("Failed to download artifactory asset: {}", asset.id))?
                    },
                    AssetSource::ToolApi => {
                        let path = asset.path.as_deref()
                            .with_context(|| format!("No uri path for tool {} asset {}", tool_agent_id, asset.id))?;
                        info!("Downloading tool API asset: {} with original path: {}", asset.id, path);
                        
                        // Resolve URL parameters in the path
                        let resolved_path = self.url_params_resolver.process(path)
                            .with_context(|| format!("Failed to resolve URL parameters for asset: {}", asset.id))?;
                        info!("Resolved path: {}", resolved_path);
                        
                        let tool_id = tool_installation_message.tool_id.clone();
                        self.tool_api_client
                            .get_tool_asset(tool_id, resolved_path)
                            .await
                            .with_context(|| format!("Failed to download tool API asset: {}", asset.id))?
                    }
                };
                
                File::create(&asset_path).await?.write_all(&asset_bytes).await?;
                
                // Set file permissions to executable only for executable assets
                if is_executable {
                    self.set_executable_permissions(&asset_path).await
                        .with_context(|| format!("Failed to set executable permissions for asset {}", asset_path.display()))?;
                }
                
                info!("Asset {} saved to: {}", asset.id, asset_path.display());
            }
        } else {
            info!("No assets to download for tool: {}", tool_agent_id);
        }

        // TODO: there's risk that tool have been installed but data haven't been sent 
        //  there should be mechanism of pre check if tool have been installed(some command)
        //  Also, logic should prevent race conditions if installation stuck
        // Run installation command if provided
        if tool_installation_message.installation_command_args.is_some() {
            info!("Start run tool installation command for tool {}", tool_agent_id);
            let installation_command_args = self.command_params_resolver.process(tool_agent_id, tool_installation_message.installation_command_args.unwrap())
                .context("Failed to process installation command params")?;
            debug!("Processed args: {:?}", installation_command_args);

            let mut cmd = Command::new(&file_path);
            cmd.args(&installation_command_args);
            
            let output = cmd.output().await
                .context("Failed to execute installation command for tool")?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                let stdout = String::from_utf8_lossy(&output.stdout);
                return Err(anyhow::anyhow!(
                    "Installation command failed with status: {}\nstdout: {}\nstderr: {}",
                    output.status, 
                    stdout, 
                    stderr
                ));
            }

            let stdout = String::from_utf8_lossy(&output.stdout);
            info!("Installation command executed successfully for tool {}\nstdout: {}", tool_agent_id, stdout);
        } else {
            info!("No installation command args provided for tool: {} - skip installation", tool_agent_id);
        }

        // Persist installed tool information
        let installed_tool = InstalledTool {
            tool_agent_id: tool_agent_id.clone(),
            tool_id: tool_installation_message.tool_id.clone(),
            tool_type: tool_installation_message.tool_type.clone(),
            version: version_clone.clone(),
            session_type: tool_installation_message.session_type.clone().unwrap_or(crate::models::SessionType::Service),
            run_command_args: run_args_clone,
            tool_agent_id_command_args: tool_installation_message.tool_agent_id_command_args.unwrap_or_default(),
            uninstallation_command_args: tool_installation_message.uninstallation_command_args,
            status: ToolStatus::Installed,
        };

        self.installed_tools_service.save(installed_tool.clone()).await
            .context("Failed to save installed tool")?;

        // Run the tool after successful installation
        info!("Running tool {} after successful installation", tool_agent_id);
        self.tool_run_manager.run_new_tool(installed_tool.clone()).await
            .context("Failed to run tool after installation")?;

        // Start tool connection processing for newly installed tool
        info!("Processing connection for tool {} after installation", tool_agent_id);
        self.tool_connection_processing_manager.run_new_tool(installed_tool.clone())
            .await
            .context("Failed to process tool connection after installation")?;

        // Publish installed agent message
        info!("Publishing installed agent message for tool: {}", tool_agent_id);
        match self.config_service.get_machine_id().await {
            Ok(machine_id) => {
                if let Err(e) = self.installed_agent_publisher
                    .publish(machine_id, tool_agent_id.clone(), version_clone.clone())
                    .await
                {
                    warn!("Failed to publish installed agent message for {}: {:#}", tool_agent_id, e);
                    // Don't fail installation if publishing fails
                }
            }
            Err(e) => {
                warn!("Failed to get machine_id for installed agent message: {:#}", e);
                // Don't fail installation if publishing fails
            }
        }

        Ok(())
    }

    /// Sets executable permissions for a file on both Unix and Windows platforms
    async fn set_executable_permissions(&self, file_path: &Path) -> Result<()> {
        #[cfg(target_family = "unix")]
        {
            let mut perms = fs::metadata(file_path).await?.permissions();
            perms.set_mode(0o755);
            fs::set_permissions(file_path, perms).await?;
        }

        Ok(())
    }
}