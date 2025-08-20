use tracing::error;
use tracing::info;
use crate::platform::DirectoryManager;
use tokio::fs::File;
use bytes::Bytes;
use anyhow::Context;
use tokio::io::AsyncWriteExt;
use crate::models::ToolInstallationResult;
use crate::services::ToolInstallationCommandRunner;
use tokio::fs; 
#[cfg(target_family = "unix")]
use std::os::unix::fs::PermissionsExt; 
use crate::platform::PermissionUtils;

pub struct ToolInstaller {
    pub directory_manager: DirectoryManager,
    command_runner: ToolInstallationCommandRunner,
}

impl ToolInstaller {
    pub fn new(directory_manager: DirectoryManager, command_runner: ToolInstallationCommandRunner) -> Self {
        directory_manager
            .ensure_directories()
            .with_context(|| "Failed to ensure secured directory exists")
            .unwrap();
        Self { directory_manager, command_runner }
    }

    pub async fn install(&self, tool_id: String, file_bytes: Bytes) -> anyhow::Result<ToolInstallationResult> {
        let tool_folder_path = self.directory_manager.app_support_dir();
        let file_path = tool_folder_path.join(format!("{}_agent", tool_id));
        File::create(&file_path).await?.write_all(&file_bytes).await?;

        // TODO: different oses
        let mut perms = fs::metadata(&file_path).await?.permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&file_path, perms)
            .await
            .with_context(|| format!("Failed to chmod +x {}", file_path.display()))?;

        let token_path = tool_folder_path.join("shared_token.enc").to_string_lossy().to_string();
        let args = [
            // &file_path_str,
            "-m", "install",
            "-api", "https://localhost",
            "-auth", "69f13676d6ce8f3dc393164f30f2341d1fc7c77efd196821d51a7668daeb0504",
            "-client-id", "1",
            "-site-id", "1",
            "-agent-type", "workstation",
            "-log", "DEBUG",
            "-logto", "stdout",
            "--openframe-mode",
            "-nomesh",
            "-openframe-secret", "12345678901234567890123456789012",
            "--insecure",
            // tool folder + shared_token.enc
            "--openframe-token-path", &token_path
        ];

        info!("Running command: sudo {}", args.join(" "));

        let file_path_str = file_path.to_string_lossy();

        match PermissionUtils::run_as_admin(
            &file_path_str,
            &args
        ) {
            Ok(_) => info!("Successfully executed elevated command"),
            Err(e) => error!("Failed to execute elevated command: {}", e),
        }

        // let output = self.command_runner
        //     .run_command(
        //         // "sudo",
        //         &file_path_str,
        //         &args
        //     )
        //     .await?;

        let tool_agent_id = format!("{}_agent_id", tool_id);
        Ok(ToolInstallationResult { tool_agent_id })
    }
}
