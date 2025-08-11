use crate::platform::DirectoryManager;

pub struct ToolInstaller {
    directory_manager: DirectoryManager,
}

impl ToolInstaller {
    pub fn new(directory_manager: DirectoryManager) -> Self {
        let tool_folder_path = directory_manager.secured_dir().join("tool_agent");
        directory_manager.ensure_directories()
            .with_context(|| "Failed to ensure secured directory exists")?;

        Ok(Self { tool_folder_path })
    }

    pub async fn install(&self, tool_id: String, fileBytes: bytes::Bytes) -> Result<ToolInstallationResult> {
        let tool_folder_path = self.tool_folder_path.join(tool_id);
        let file_path = tool_folder_path.join("tool_agent");
        let mut file = File::create(file_path).await?;
        file.write_all(&fileBytes).await?;

        // Run command to install tool if needed

        Ok(ToolInstallationResult { tool_agent_id: tool_id + "_agent_id" })
    }
}
