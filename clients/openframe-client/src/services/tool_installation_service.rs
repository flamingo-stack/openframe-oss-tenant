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
#[cfg(target_os = "windows")]
use crate::platform::file_lock::log_file_lock_info;
use crate::services::ToolCommandParamsResolver;
use crate::services::ToolUrlParamsResolver;
use crate::services::tool_run_manager::ToolRunManager;
use crate::services::tool_connection_processing_manager::ToolConnectionProcessingManager;
use crate::services::tool_kill_service::ToolKillService;
use crate::services::tool_connection_service::ToolConnectionService;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use tokio::fs;
use tokio::process::Command;
use std::path::{Path, PathBuf};
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
    tool_kill_service: ToolKillService,
    tool_connection_service: ToolConnectionService,
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
        tool_connection_service: ToolConnectionService,
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
            tool_kill_service: ToolKillService::new(),
            tool_connection_service,
        }
    }

    pub async fn install(&self, tool_installation_message: ToolInstallationMessage) -> Result<()> {
        let tool_agent_id = &tool_installation_message.tool_agent_id;
        info!("Installing tool {} with version {}", tool_agent_id, tool_installation_message.version);

        let version_clone = tool_installation_message.version.clone();
        let run_args_clone = tool_installation_message.run_command_args.clone();
        let reinstall = tool_installation_message.reinstall.clone();
        // Create tool-specific directory
        let base_folder_path = self.directory_manager.app_support_dir();
        let tool_folder_path = base_folder_path.join(tool_agent_id);
        
        // Check if tool is already installed
        if let Some(installed_tool) = self.installed_tools_service.get_by_tool_agent_id(tool_agent_id).await? {
            if reinstall {
                info!("Reinstalling tool {} with version {}", tool_agent_id, version_clone);
        
                // Stop the tool process if it's running
                info!("Stopping existing tool process for {}", tool_agent_id);
                if let Err(e) = self.tool_kill_service.stop_tool(tool_agent_id).await {
                    warn!("Failed to stop tool process: {:#}", e);
                // Continue with uninstallation even if process kill fails
                }
        
                // Wait for process to fully terminate
                tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

                info!("Removing existing tool directory: {}", tool_folder_path.display());
                if tool_folder_path.exists() {
                    fs::remove_dir_all(&tool_folder_path)
                        .await
                        .with_context(|| format!("Failed to remove existing tool directory: {}", tool_folder_path.display()))?;
                }
                        
                tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;

                // Delete from both services
                info!("Removing tool {} from services", tool_agent_id);
                if let Err(e) = self.tool_connection_service.delete_by_tool_agent_id(tool_agent_id).await {
                    warn!("Failed to remove tool connection: {:#}", e);
                }
                if let Err(e) = self.installed_tools_service.delete_by_tool_agent_id(tool_agent_id).await {
                    warn!("Failed to remove from installed tools: {:#}", e);
                }
                
                // Clear from both manager tracking sets to allow tool restart after reinstall
                self.tool_connection_processing_manager.clear_running_tool(&installed_tool.tool_id).await;
                self.tool_run_manager.clear_running_tool(&installed_tool.tool_agent_id).await;
                
                info!("Previous installation of tool {} was uninstalled", tool_agent_id);
            } else {
                info!("Tool {} is already installed with version {}, skipping installation", tool_agent_id, installed_tool.version);
                return Ok(());
            }
        }

        // Ensure tool-specific directory exists
        fs::create_dir_all(&tool_folder_path)
            .await
            .with_context(|| format!("Failed to create tool directory: {}", tool_folder_path.display()))?;

        let default_agent_path = self.directory_manager.get_agent_path(tool_agent_id);
        let executable_path = match &tool_installation_message.download_configurations {
            Some(configs) => {
                let config = self.github_download_service.find_config_for_current_os(configs)
                    .with_context(|| format!("No download config for current OS: {}", tool_agent_id))?;
                self.github_download_service
                    .download_and_save(config, &tool_folder_path, &default_agent_path)
                    .await
                    .with_context(|| format!("Failed to download tool agent: {}", tool_agent_id))?
            }
            None => {
                self.download_from_artifactory(tool_agent_id, &default_agent_path).await?;
                None
            }
        };
        let file_path = self.directory_manager.get_tool_executable_path(tool_agent_id, executable_path.as_deref());

        // Download and save assets
        if let Some(ref assets) = tool_installation_message.assets {
            for asset in assets {
                // Use the executable field from the asset
                let is_executable = asset.executable;
                let local_filename_config = asset.local_filename_configuration.iter()
                    .find(|c| c.matches_current_os())
                    .with_context(|| format!("No local filename configuration for current OS for asset: {}", asset.id))?;
                let asset_path = self.directory_manager.get_asset_path(tool_agent_id, &local_filename_config.filename, is_executable);
                
                // Download and save asset if it doesn't already exist
                if !asset_path.exists() {
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
                        },
                        AssetSource::Github => {
                            let download_configs = asset.download_configurations.as_ref()
                                .with_context(|| format!("No download configurations for Github asset: {}", asset.id))?;
                            let config = self.github_download_service.find_config_for_current_os(download_configs)
                                .with_context(|| format!("Failed to find download configuration for current OS: {}", asset.id))?;
                            info!("Downloading Github asset: {} from {}", asset.id, config.link);

                            self.github_download_service
                                .download_and_extract(config)
                                .await
                                .with_context(|| format!("Failed to download and extract Github asset: {}", asset.id))?
                        }
                    };

                    File::create(&asset_path).await?.write_all(&asset_bytes).await?;

                    // Set file permissions to executable only for executable assets
                    if is_executable {
                        self.set_executable_permissions(&asset_path).await
                            .with_context(|| format!("Failed to set executable permissions for asset {}", asset_path.display()))?;
                    }

                    info!("Asset {} saved to: {}", asset.id, asset_path.display());
                } else {
                    info!("Asset {} for tool {} already exists at {}, skipping download",
                          asset.id, tool_agent_id, asset_path.display());
                }

                // Publish installed asset message only for executable assets with version (always, even if already downloaded)
                if is_executable {
                    if let Some(ref version) = asset.version {
                        info!("Publishing installed asset message for: {} v{}", asset.id, version);
                        let machine_id = self.config_service.get_machine_id().await
                            .with_context(|| format!("Failed to get machine_id for asset publish: {}", asset.id))?;
                        self.installed_agent_publisher
                            .publish(machine_id, asset.id.clone(), version.clone())
                            .await
                            .with_context(|| format!("Failed to publish installed asset message for {}", asset.id))?;
                    }
                }
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
                .map_err(|e| {
                    #[cfg(target_os = "windows")]
                    log_file_lock_info(&e, &file_path.to_string_lossy(), "execute installation command");
                    e
                })
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
            executable_path,
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

    async fn download_from_artifactory(&self, tool_agent_id: &str, path: &Path) -> Result<()> {
        if path.exists() {
            info!("Agent already exists at {}, skipping", path.display());
            return Ok(());
        }
        info!("Downloading from Artifactory: {}", tool_agent_id);
        let bytes = self.tool_agent_file_client
            .get_tool_agent_file(tool_agent_id.to_string())
            .await
            .with_context(|| format!("Failed to download: {}", tool_agent_id))?;
        File::create(path).await?.write_all(&bytes).await?;
        self.set_executable_permissions(path).await?;
        info!("Saved to {}", path.display());
        Ok(())
    }

    async fn set_executable_permissions(&self, path: &Path) -> Result<()> {
        #[cfg(target_family = "unix")]
        {
            let mut perms = fs::metadata(path).await?.permissions();
            perms.set_mode(0o755);
            fs::set_permissions(path, perms).await?;
        }
        Ok(())
    }
}