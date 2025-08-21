use tracing::debug;
use tracing::error;
use tracing::info;
use crate::platform::DirectoryManager;
use tokio::fs::File;
use bytes::Bytes;
use anyhow::Context;
use tokio::io::AsyncWriteExt;
use crate::models::ToolInstallationResult;
use crate::models::ToolInstallationMessage;
use crate::services::ToolInstallationCommandRunner;
use crate::services::ToolInstallationCommandParamsProcessor;
use tokio::fs; 
#[cfg(target_family = "unix")]
use std::os::unix::fs::PermissionsExt; 
use crate::platform::PermissionUtils;

pub struct ToolInstaller {
    pub directory_manager: DirectoryManager,
    // command_runner: ToolInstallationCommandRunner,
    command_params_processor: ToolInstallationCommandParamsProcessor,
}

impl ToolInstaller {
    pub fn new(directory_manager: DirectoryManager, command_runner: ToolInstallationCommandRunner) -> Self {
        directory_manager
            .ensure_directories()
            .with_context(|| "Failed to ensure secured directory exists")
            .unwrap();
        
        let command_params_processor = ToolInstallationCommandParamsProcessor::new(directory_manager.clone());
        
        Self { 
            directory_manager, 
            // command_runner,
            command_params_processor,
        }
    }

    pub async fn install(&self, message: ToolInstallationMessage, file_bytes: Bytes) -> anyhow::Result<ToolInstallationResult> {
        let tool_id = &message.tool_id;

        // save file to app support dir
        let tool_folder_path = self.directory_manager.app_support_dir();
        let file_path = tool_folder_path.join(format!("{}_agent", tool_id));
        File::create(&file_path).await?.write_all(&file_bytes).await?;

        // TODO: different oses
        // set file permissions to executable
        let mut perms = fs::metadata(&file_path).await?.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&file_path, perms)
            .await
            .with_context(|| format!("Failed to chmod +x {}", file_path.display()))?;

        // run installation command if provided
        if message.installation_command_args.is_some() {
            let installation_command_args = self.command_params_processor.process(tool_id, message.installation_command_args.unwrap())
                .context("Failed to process installation command params")?;
            debug!("Processed args: {:?}", installation_command_args);
            let installation_command_arg_refs: Vec<&str> = installation_command_args.iter()
                .map(|s| s.as_str())
                .collect();

            let file_path_str = file_path.to_string_lossy();
            PermissionUtils::run_as_admin(&file_path_str, &installation_command_arg_refs[..])
                .context("Failed to execute installation command for tool")?;
            
            info!("Successfully executed installation command for tool: {}", tool_id);
        } else {
            info!("No installation command args provided for tool: {} - skip installation", tool_id);
        }

        // return tool agent id
        // TODO: real
        let tool_agent_id = format!("{}_agent_id", tool_id);
        Ok(ToolInstallationResult { tool_agent_id })
    }
}
