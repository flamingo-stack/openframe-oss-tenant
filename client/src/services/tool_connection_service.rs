use anyhow::{Context, Result};
use std::fs;
use std::path::{PathBuf, Path};

use crate::models::tool_connection::ToolConnection;
use crate::platform::directories::DirectoryManager;

#[derive(Clone)]
pub struct ToolConnectionService {
    file_path: PathBuf,
}

impl ToolConnectionService {
    /// Creates new service storing data in secured directory file `tool_connections.json`
    pub fn new(directory_manager: DirectoryManager) -> Result<Self> {
        let path = directory_manager.secured_dir().join("tool_connections.json");
        directory_manager
            .ensure_directories()
            .with_context(|| "Failed to ensure secured directory exists")?;
        Ok(Self { file_path: path })
    }

    /// Save (upsert) connection
    pub async fn save(&self, connection: ToolConnection) -> Result<()> {
        let mut list = self.get_all().await?;

        if let Some(existing) = list.iter_mut().find(|c| c.tool_agent_id == connection.tool_agent_id) {
            *existing = connection;
        } else {
            list.push(connection);
        }

        self.persist(&list).await
    }

    /// Check if a connection exists for given tool_agent_id
    pub async fn exists_by_tool_agent_id(&self, id: &str) -> Result<bool> {
        let list = self.get_all().await?;
        Ok(list.iter().any(|c| c.tool_agent_id == id))
    }

    pub async fn get_all(&self) -> Result<Vec<ToolConnection>> {
        if !self.file_path.exists() {
            return Ok(Vec::new());
        }
        let json = fs::read_to_string(&self.file_path)
            .with_context(|| format!("Failed to read tool connections file: {:?}", self.file_path))?;
        let list: Vec<ToolConnection> = serde_json::from_str(&json)
            .context("Failed to deserialize tool connections from JSON")?;
        Ok(list)
    }

    async fn persist(&self, list: &[ToolConnection]) -> Result<()> {
        let json = serde_json::to_string_pretty(list)
            .context("Failed to serialize tool connections to JSON")?;
        fs::write(&self.file_path, json)
            .with_context(|| format!("Failed to write tool connections file: {:?}", self.file_path))?;
        Ok(())
    }
}
