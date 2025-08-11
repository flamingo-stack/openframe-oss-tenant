use crate::platform::DirectoryManager;
use tokio::fs::File;
use bytes::Bytes;
use anyhow::Context;
use tokio::io::AsyncWriteExt;
use crate::models::ToolInstallationResult;

pub struct ToolInstaller {
    pub directory_manager: DirectoryManager,
}

impl ToolInstaller {
    pub fn new(directory_manager: DirectoryManager) -> Self {
        directory_manager.ensure_directories()
            .with_context(|| "Failed to ensure secured directory exists").unwrap();
        Self { directory_manager }
    }

    pub async fn install(&self, tool_id: String, file_bytes: Bytes) -> anyhow::Result<ToolInstallationResult> {
        let tool_folder_path = self.directory_manager.app_support_dir();
        let file_path = tool_folder_path.join(tool_id.clone() + "_agent");
        File::create(file_path).await?
            .write_all(&file_bytes).await?;

        // Run command to install tool if needed
        let tool_agent_id = tool_id.clone() + "_agent_id";

        Ok(ToolInstallationResult { tool_agent_id })
    }
}
