use anyhow::{Context, Result};
use async_trait::async_trait;
use std::path::PathBuf;
use tracing::{info, warn, error};

use super::{ToolUpdater, ToolUpdaterDeps, UpdateContext};
use crate::models::{InstalledTool, Installation, DownloadConfiguration};
use crate::platform::user_session::{get_console_user, launch_as_user};
use crate::platform::remove_app_bundle;
use crate::platform::preferences_writer::{write as write_preferences, args_to_pairs};

pub struct GuiAppToolUpdater {
    deps: ToolUpdaterDeps,
}

impl GuiAppToolUpdater {
    pub fn new(deps: ToolUpdaterDeps) -> Self {
        Self { deps }
    }
}

#[async_trait]
impl ToolUpdater for GuiAppToolUpdater {
    async fn prepare(&self, tool: &InstalledTool) -> Result<UpdateContext> {
        let tool_agent_id = &tool.tool_agent_id;
        info!(tool_id = %tool_agent_id, "Preparing GuiApp for update");

        info!(tool_id = %tool_agent_id, "Stopping GUI app process");
        self.deps.tool_kill_service.stop_installed_tool(tool).await
            .with_context(|| format!("Failed to stop GUI app: {}", tool_agent_id))?;

        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

        Ok(UpdateContext {
            backup_path: None,
            needs_restart: true,
        })
    }

    async fn apply(
        &self,
        tool: &InstalledTool,
        config: &DownloadConfiguration,
        _ctx: &UpdateContext,
    ) -> Result<()> {
        let tool_agent_id = &tool.tool_agent_id;
        info!(tool_id = %tool_agent_id, "Applying GuiApp update");

        let Installation::GuiApp { executable_path, .. } = &tool.installation else {
            anyhow::bail!("Expected GuiApp installation type for tool: {}", tool_agent_id);
        };

        info!(tool_id = %tool_agent_id, "Removing old app bundle");
        remove_app_bundle(executable_path).await?;

        let applications_dir = PathBuf::from("/Applications");

        info!(tool_id = %tool_agent_id, "Downloading and installing new version from: {}", config.link);
        self.deps.github_download_service
            .download_and_extract_all(config, &applications_dir)
            .await
            .with_context(|| format!("Failed to download and install GUI app: {}", tool_agent_id))?;

        let new_app_path = applications_dir.join(&config.target_file_name);
        if !new_app_path.exists() {
            anyhow::bail!(
                "New app bundle not found at expected path: {}",
                new_app_path.display()
            );
        }

        info!(tool_id = %tool_agent_id, "GuiApp updated successfully: {}", new_app_path.display());
        Ok(())
    }

    async fn finalize(
        &self,
        tool: &InstalledTool,
        ctx: &UpdateContext,
    ) -> Result<()> {
        let tool_agent_id = &tool.tool_agent_id;
        info!(tool_id = %tool_agent_id, "Finalizing GuiApp update");

        if !ctx.needs_restart {
            info!(tool_id = %tool_agent_id, "Restart not requested, skipping");
            return Ok(());
        }

        let Installation::GuiApp { executable_path, bundle_id } = &tool.installation else {
            anyhow::bail!("Expected GuiApp installation type");
        };

        let user = loop {
            if let Some(u) = get_console_user() {
                break u;
            }
            tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
        };

        if let Some(bid) = bundle_id {
            // Resolve placeholders (e.g., ${client.serverUrl}) before writing preferences
            let resolved_args = self.deps.command_params_resolver
                .process(tool_agent_id, tool.run_command_args.clone())
                .unwrap_or_else(|e| {
                    warn!(tool_id = %tool_agent_id, "Failed to resolve command args: {:#}", e);
                    tool.run_command_args.clone()
                });

            let prefs = args_to_pairs(&resolved_args);
            if let Err(e) = write_preferences(bid, prefs) {
                warn!(tool_id = %tool_agent_id, "Failed to write preferences: {:#}", e);
            }
        }

        info!(tool_id = %tool_agent_id, "Launching updated GUI app as user: {}", user.username);
        let launch_args = if bundle_id.is_some() {
            // Args passed via preferences, but openframe-chat needs --background flag
            if tool_agent_id == "openframe-chat" {
                vec!["--background".to_string()]
            } else {
                vec![]
            }
        } else {
            tool.run_command_args.clone()
        };

        match launch_as_user(executable_path, &launch_args, &user).await {
            Ok(child) => {
                info!(tool_id = %tool_agent_id, "GUI app launched, PID: {:?}", child.id());
            }
            Err(e) => {
                error!(tool_id = %tool_agent_id, "Failed to launch GUI app: {:#}", e);
            }
        }

        Ok(())
    }

    async fn rollback(&self, tool: &InstalledTool, _ctx: &UpdateContext) -> Result<()> {
        let tool_agent_id = &tool.tool_agent_id;
        warn!(tool_id = %tool_agent_id,
              "Rollback requested for GuiApp but no backup available. User should reinstall from server.");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;
    use crate::platform::DirectoryManager;

    #[test]
    fn test_find_app_bundle_path() {
        assert_eq!(
            DirectoryManager::find_app_bundle_path(Path::new("/Applications/FAE Chat.app")),
            Some(PathBuf::from("/Applications/FAE Chat.app"))
        );

        assert_eq!(
            DirectoryManager::find_app_bundle_path(Path::new("/Applications/FAE Chat.app/Contents/MacOS/FAE Chat")),
            Some(PathBuf::from("/Applications/FAE Chat.app"))
        );

        assert_eq!(
            DirectoryManager::find_app_bundle_path(Path::new("/usr/bin/some-binary")),
            None
        );
    }
}
