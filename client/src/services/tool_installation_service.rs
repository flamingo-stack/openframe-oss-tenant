use crate::clients::tool_agent_file_client::ToolAgentFileClient;
use crate::clients::tool_api_client::ToolApiClient;
use tracing::{info, debug};
use anyhow::{Context, Result};
use crate::models::ToolInstallationMessage;
use crate::models::tool_installation_message::AssetSource;
use crate::models::MainFileType;
use crate::services::InstalledToolsService;
use crate::models::installed_tool::ToolStatus;
use crate::models::InstalledTool;
use crate::platform::DirectoryManager;
use crate::services::ToolCommandParamsResolver;
use crate::services::tool_run_manager::ToolRunManager;
use crate::services::tool_connection_processing_manager::ToolConnectionProcessingManager;
use tokio::fs::File;
use tokio::io::AsyncWriteExt;
use tokio::fs;
use tokio::process::Command;
use std::path::{Path, PathBuf};
#[cfg(target_family = "unix")]
use std::os::unix::fs::PermissionsExt;
#[cfg(target_os = "windows")]
use crate::platform::permissions::Permissions;

#[derive(Clone)]
pub struct ToolInstallationService {
    tool_agent_file_client: ToolAgentFileClient,
    tool_api_client: ToolApiClient,
    command_params_resolver: ToolCommandParamsResolver,
    installed_tools_service: InstalledToolsService,
    directory_manager: DirectoryManager,
    tool_run_manager: ToolRunManager,
    tool_connection_processing_manager: ToolConnectionProcessingManager,
}

impl ToolInstallationService {
    pub fn new(
        tool_agent_file_client: ToolAgentFileClient,
        tool_api_client: ToolApiClient,
        command_params_resolver: ToolCommandParamsResolver,
        installed_tools_service: InstalledToolsService,
        directory_manager: DirectoryManager,
        tool_run_manager: ToolRunManager,
        tool_connection_processing_manager: ToolConnectionProcessingManager,
    ) -> Self {
        // Ensure directories exist
        directory_manager
            .ensure_directories()
            .with_context(|| "Failed to ensure secured directory exists")
            .unwrap();

        Self {
            tool_agent_file_client,
            tool_api_client,
            command_params_resolver,
            installed_tools_service,
            directory_manager,
            tool_run_manager,
            tool_connection_processing_manager,
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

        // Determine if this is an APPLICATION type (e.g., .app bundle on macOS)
        let is_application = tool_installation_message.file_type == Some(MainFileType::Application);

        // For APPLICATION type, use applications directory, otherwise use app support directory
        let file_path = if is_application {
            self.get_application_install_path(tool_agent_id)?
        } else {
            // Create tool-specific directory in app support
            let base_folder_path = self.directory_manager.app_support_dir();
            let tool_folder_path = base_folder_path.join(tool_agent_id);
            
            // Ensure tool-specific directory exists
            fs::create_dir_all(&tool_folder_path)
                .await
                .with_context(|| format!("Failed to create tool directory: {}", tool_folder_path.display()))?;

            self.directory_manager.get_agent_path(tool_agent_id)
        };
        
        // Check if agent file already exists
        if file_path.exists() {
            info!("Agent file for tool {} already exists at {}, skipping download", 
                  tool_agent_id, file_path.display());
        } else {
            // Download and save main tool agent file
            let tool_agent_file_bytes = self
                .tool_agent_file_client
                .get_tool_agent_file(tool_agent_id.clone())
                .await?;

            if is_application {
                // For APPLICATION type (e.g., .app bundle), install using platform-specific method
                self.install_application(&file_path, tool_agent_file_bytes, tool_agent_id).await?;
            } else {
                // For EXECUTABLE type, save directly and set permissions
                File::create(&file_path).await?.write_all(&tool_agent_file_bytes).await?;

                // Set file permissions to executable
                self.set_executable_permissions(&file_path).await
                    .with_context(|| format!("Failed to set executable permissions for {}", file_path.display()))?;
            }
            
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
                        info!("Downloading tool API asset: {} with path: {}", asset.id, path);
                        let tool_id = tool_installation_message.tool_id.clone();
                        self.tool_api_client
                            .get_tool_asset(tool_id, asset.path.clone().unwrap_or_default())
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
            version: version_clone,
            run_command_args: run_args_clone,
            tool_agent_id_command_args: tool_installation_message.tool_agent_id_command_args,
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

    /// Gets the installation path for an APPLICATION type tool
    fn get_application_install_path(&self, tool_agent_id: &str) -> Result<PathBuf> {
        #[cfg(target_os = "macos")]
        {
            // On macOS, APPLICATION files are .app bundles
            let app_name = format!("{}.app", tool_agent_id);
            Ok(self.directory_manager.applications_dir().join(app_name))
        }

        #[cfg(not(target_os = "macos"))]
        {
            // For non-macOS platforms, fall back to regular path
            // This shouldn't normally happen as APPLICATION type is only for macOS currently
            Ok(self.directory_manager.get_agent_path(tool_agent_id))
        }
    }

    /// Installs an APPLICATION type tool (e.g., .app bundle on macOS)
    async fn install_application(&self, dest_path: &Path, app_bytes: Vec<u8>, tool_agent_id: &str) -> Result<()> {
        #[cfg(target_os = "macos")]
        {
            // Create a temporary directory to extract the .app bundle
            let temp_dir = std::env::temp_dir().join(format!("openframe-install-{}", tool_agent_id));
            fs::create_dir_all(&temp_dir).await
                .context("Failed to create temporary directory")?;

            let temp_app_path = temp_dir.join(dest_path.file_name().unwrap());
            
            // Write the downloaded bytes to temporary location
            File::create(&temp_app_path).await?.write_all(&app_bytes).await?;
            
            info!("Installing .app bundle from {} to {}", temp_app_path.display(), dest_path.display());

            // Use ditto to copy the .app bundle to /Applications
            let status = std::process::Command::new("ditto")
                .arg(&temp_app_path)
                .arg(dest_path)
                .status()
                .context("Failed to execute ditto command")?;

            if !status.success() {
                anyhow::bail!("Failed to copy application bundle using ditto");
            }

            // Set executable permissions on the main executable inside the bundle
            let exe_path = dest_path.join("Contents").join("MacOS").join(tool_agent_id);
            if exe_path.exists() {
                self.set_executable_permissions(&exe_path).await
                    .context("Failed to set executable permissions on app binary")?;
            }

            // Clean up temporary directory
            let _ = fs::remove_dir_all(&temp_dir).await;

            info!("Successfully installed .app bundle to {}", dest_path.display());
            Ok(())
        }

        #[cfg(not(target_os = "macos"))]
        {
            // For non-macOS platforms, just write the bytes directly
            // This is a fallback and shouldn't normally be used for APPLICATION type
            File::create(dest_path).await?.write_all(&app_bytes).await?;
            self.set_executable_permissions(dest_path).await?;
            Ok(())
        }
    }
}