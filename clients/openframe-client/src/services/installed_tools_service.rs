use crate::models::{InstalledTool, ToolRecordState};
use crate::platform::directories::DirectoryManager;
use anyhow::{Context, Result};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Clone)]
pub struct InstalledToolsService {
    file_path: PathBuf,
    writer: Arc<Mutex<()>>,
}

impl InstalledToolsService {
    pub fn new(directory_manager: DirectoryManager) -> Result<Self> {
        let path = directory_manager.secured_dir().join("installed_tools.json");
        directory_manager
            .ensure_directories()
            .with_context(|| "Failed to ensure secured directory exists")?;
        Ok(Self {
            file_path: path,
            writer: Arc::new(Mutex::new(())),
        })
    }

    pub async fn save(&self, tool: InstalledTool) -> Result<()> {
        let _guard = self.writer.lock().await;
        let mut tools = self.get_all().await?;

        if let Some(existing) = tools
            .iter_mut()
            .find(|t| t.tool_agent_id == tool.tool_agent_id)
        {
            *existing = tool;
        } else {
            tools.push(tool);
        }

        self.persist(&tools).await
    }

    pub async fn set_state(&self, tool_agent_id: &str, state: ToolRecordState) -> Result<bool> {
        let _guard = self.writer.lock().await;
        let mut tools = self.get_all().await?;
        if let Some(existing) = tools.iter_mut().find(|t| t.tool_agent_id == tool_agent_id) {
            existing.state = state;
            self.persist(&tools).await?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    pub async fn get_by_tool_agent_id(&self, tool_id: &str) -> Result<Option<InstalledTool>> {
        let tools = self.get_all().await?;
        Ok(tools.into_iter().find(|t| t.tool_agent_id == tool_id))
    }

    pub async fn get_all(&self) -> Result<Vec<InstalledTool>> {
        if !self.file_path.exists() {
            return Ok(Vec::new());
        }

        let json = fs::read_to_string(&self.file_path).with_context(|| {
            format!("Failed to read installed tools file: {:?}", self.file_path)
        })?;
        let tools: Vec<InstalledTool> = serde_json::from_str(&json)
            .context("Failed to deserialize installed tools from JSON")?;
        Ok(tools)
    }

    /// Delete an installed tool by its tool_agent_id
    pub async fn delete_by_tool_agent_id(&self, tool_agent_id: &str) -> Result<bool> {
        let _guard = self.writer.lock().await;
        let mut tools = self.get_all().await?;
        let initial_len = tools.len();
        tools.retain(|t| t.tool_agent_id != tool_agent_id);

        if tools.len() != initial_len {
            self.persist(&tools).await?;
            Ok(true)
        } else {
            Ok(false)
        }
    }

    async fn persist(&self, tools: &[InstalledTool]) -> Result<()> {
        let json = serde_json::to_string_pretty(tools)
            .context("Failed to serialize installed tools to JSON")?;

        let tmp_path = self.file_path.with_extension("json.tmp");
        {
            let mut file = fs::File::create(&tmp_path)
                .with_context(|| format!("Failed to create temp tools file: {:?}", tmp_path))?;
            file.write_all(json.as_bytes())
                .with_context(|| format!("Failed to write temp tools file: {:?}", tmp_path))?;
            file.sync_all()
                .with_context(|| format!("Failed to fsync temp tools file: {:?}", tmp_path))?;
        }
        fs::rename(&tmp_path, &self.file_path).with_context(|| {
            format!(
                "Failed to atomically replace tools file: {:?}",
                self.file_path
            )
        })?;
        Ok(())
    }
}
