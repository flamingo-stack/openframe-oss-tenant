use crate::clients::tool_agent_file_client::ToolAgentFileClient;
use crate::clients::tool_api_client::ToolApiClient;
use crate::services::tool_connection_message_publisher::ToolConnectionMessagePublisher;
use tracing::{info, debug};
use anyhow::{Context, Result};
use crate::models::ToolInstallationMessage;
use crate::models::tool_installation_message::AssetSource;
use crate::services::InstalledToolsService;
use crate::models::installed_tool::ToolStatus;
use crate::models::InstalledTool;
use crate::platform::DirectoryManager;
use crate::services::ToolInstallationCommandParamsProcessor;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use tokio::fs;
#[cfg(target_family = "unix")]
use std::os::unix::fs::PermissionsExt;
use crate::platform::PermissionUtils;

pub struct ToolInstallationService {
    tool_agent_file_client: ToolAgentFileClient,
    tool_api_client: ToolApiClient,
    tool_connection_message_publisher: ToolConnectionMessagePublisher,
    installed_tools_service: InstalledToolsService,
    directory_manager: DirectoryManager,
    command_params_processor: ToolInstallationCommandParamsProcessor,
}

impl ToolInstallationService {
    pub fn new(
        tool_agent_file_client: ToolAgentFileClient,
        tool_api_client: ToolApiClient,
        tool_connection_message_publisher: ToolConnectionMessagePublisher,
        installed_tools_service: InstalledToolsService,
        directory_manager: DirectoryManager,
    ) -> Self {
        // Ensure directories exist
        directory_manager
            .ensure_directories()
            .with_context(|| "Failed to ensure secured directory exists")
            .unwrap();

        let command_params_processor = ToolInstallationCommandParamsProcessor::new(directory_manager.clone());
        
        Self {
            tool_agent_file_client,
            tool_api_client,
            tool_connection_message_publisher,
            installed_tools_service,
            directory_manager,
            command_params_processor,
        }
    }

    pub async fn install(&self, tool_installation_message: ToolInstallationMessage) -> Result<()> {
        let tool_id = &tool_installation_message.tool_id;
        info!("Installing tool {} with version {}", tool_id, tool_installation_message.version);

        // TODO: process different version race conditions
        // TODO: mark as installing before installation
        // TODO: idempotency of each operation

        let version_clone = tool_installation_message.version.clone();
        let run_args_clone = tool_installation_message.run_command_args.clone();

        // Download and save main tool agent file
        let tool_agent_file_bytes = self
            .tool_agent_file_client
            .get_tool_agent_file(tool_id.clone())
            .await?;

        let tool_folder_path = self.directory_manager.app_support_dir();
        let file_path = tool_folder_path.join(format!("{}_agent", tool_id));
        
        File::create(&file_path).await?.write_all(&tool_agent_file_bytes).await?;

        // Set file permissions to executable
        let mut perms = fs::metadata(&file_path).await?.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&file_path, perms)
            .await
            .with_context(|| format!("Failed to chmod +x {}", file_path.display()))?;

        // Download and save assets
        for asset in &tool_installation_message.assets {
            let asset_bytes = match asset.source {
                AssetSource::Artifactory => {
                    info!("Downloading artifactory asset: {}", asset.id);
                    self.tool_agent_file_client
                        .get_tool_agent_file(asset.id.clone())
                        .await
                        .with_context(|| format!("Failed to download artifactory asset: {}", asset.id))?
                },
                AssetSource::ToolApi => {
                    let path = asset.path.as_deref().unwrap_or("");
                    info!("Downloading tool API asset: {} with path: {}", asset.id, path);
                    self.tool_api_client
                        .get_tool_asset(tool_id.clone(), asset.path.clone().unwrap_or_default())
                        .await
                        .with_context(|| format!("Failed to download tool API asset: {}", asset.id))?
                }
            };

            let asset_path = tool_folder_path.join(format!("{}_{}", tool_id, asset.id));
            
            File::create(&asset_path).await?.write_all(&asset_bytes).await?;
            
            // Set file permissions to executable for assets as well
            let mut asset_perms = fs::metadata(&asset_path).await?.permissions();
            asset_perms.set_mode(0o755);
            fs::set_permissions(&asset_path, asset_perms)
                .await
                .with_context(|| format!("Failed to chmod +x {}", asset_path.display()))?;
            
            info!("Asset {} saved to: {}", asset.id, asset_path.display());
        }

        // Run installation command if provided
        if tool_installation_message.installation_command_args.is_some() {
            let installation_command_args = self.command_params_processor.process(tool_id, tool_installation_message.installation_command_args.unwrap())
                .context("Failed to process installation command params")?;
            debug!("Processed args: {:?}", installation_command_args);
            let installation_command_arg_refs: Vec<&str> = installation_command_args.iter()
                .map(|s| s.as_str())
                .collect();

            let file_path_str = file_path.to_string_lossy();
            PermissionUtils::run_as_admin(&file_path_str, &installation_command_arg_refs[..])
                .context("Failed to execute installation command for tool")?;
        } else {
            info!("No installation command args provided for tool: {} - skip installation", tool_id);
        }

        // Generate tool agent id
        let tool_agent_id = format!("{}_agent_id", tool_id);

        // Publish connection message (ignore errors for now)
        // self
        //     .tool_connection_message_publisher
        //     .publish(tool_id.clone(), tool_agent_id)
        //     .await?;

        // Persist installed tool information
        let installed_tool = InstalledTool {
            tool_id: tool_id.clone(),
            version: version_clone,
            run_command_args: run_args_clone,
            status: ToolStatus::Installed,
        };

        self.installed_tools_service.save(installed_tool).await
            .context("Failed to save installed tool")?;

        Ok(())
    }
}