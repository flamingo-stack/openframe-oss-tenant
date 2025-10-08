use anyhow::{Context, Result};
use tracing::{info, warn, error, debug};
use tokio::process::Command;
use crate::services::InstalledToolsService;
use crate::services::ToolCommandParamsResolver;
use crate::services::ToolKillService;
use crate::platform::DirectoryManager;

#[derive(Clone)]
pub struct ToolUninstallService {
    installed_tools_service: InstalledToolsService,
    command_params_resolver: ToolCommandParamsResolver,
    tool_kill_service: ToolKillService,
    directory_manager: DirectoryManager,
}

impl ToolUninstallService {
    pub fn new(
        installed_tools_service: InstalledToolsService,
        command_params_resolver: ToolCommandParamsResolver,
        tool_kill_service: ToolKillService,
        directory_manager: DirectoryManager,
    ) -> Self {
        Self {
            installed_tools_service,
            command_params_resolver,
            tool_kill_service,
            directory_manager,
        }
    }

    /// Uninstall all installed tools by running their uninstallation commands
    pub async fn uninstall_all(&self) -> Result<()> {
        info!("Starting uninstallation of all installed tools");

        let installed_tools = self.installed_tools_service.get_all().await
            .context("Failed to retrieve installed tools")?;

        if installed_tools.is_empty() {
            info!("No installed tools found to uninstall");
            return Ok(());
        }

        info!("Found {} installed tools to uninstall", installed_tools.len());

        let mut uninstall_errors = Vec::new();

        for tool in installed_tools {
            info!("Processing uninstallation for tool: {}", tool.tool_agent_id);

            match self.uninstall_tool(&tool).await {
                Ok(_) => {
                    info!("Successfully uninstalled tool: {}", tool.tool_agent_id);
                }
                Err(e) => {
                    error!("Failed to uninstall tool {}: {:#}", tool.tool_agent_id, e);
                    uninstall_errors.push((tool.tool_agent_id.clone(), e));
                }
            }
        }

        // Report summary
        if uninstall_errors.is_empty() {
            info!("All tools uninstalled successfully");
            Ok(())
        } else {
            warn!("Some tools failed to uninstall: {} errors", uninstall_errors.len());
            for (tool_id, error) in &uninstall_errors {
                warn!("  - {}: {:#}", tool_id, error);
            }
            
            // Continue with agent uninstallation even if some tools failed
            // This ensures we don't leave the agent installed if tool uninstallation fails
            Ok(())
        }
    }

    /// Uninstall a single tool by running its uninstallation command
    async fn uninstall_tool(&self, tool: &crate::models::InstalledTool) -> Result<()> {
        let tool_agent_id = &tool.tool_agent_id;

        // Stop the tool process before uninstalling
        info!("Stopping tool process before uninstallation: {}", tool_agent_id);
        if let Err(e) = self.tool_kill_service.stop_tool(tool_agent_id).await {
            warn!("Failed to stop tool process for {}: {:#}. Continuing with uninstallation...", tool_agent_id, e);
        }

        // Check if uninstallation command is provided
        if tool.uninstallation_command_args.is_none() {
            info!("No uninstallation command provided for tool: {}, skipping", tool_agent_id);
            return Ok(());
        }

        let uninstall_args = tool.uninstallation_command_args.as_ref().unwrap();
        
        if uninstall_args.is_empty() {
            info!("Empty uninstallation command for tool: {}, skipping", tool_agent_id);
            return Ok(());
        }

        // Process command parameters (replace placeholders)
        let processed_args = self.command_params_resolver
            .process(tool_agent_id, uninstall_args.clone())
            .context("Failed to process uninstallation command parameters")?;

        debug!("Processed uninstallation args for {}: {:?}", tool_agent_id, processed_args);

        // Get the tool agent executable path
        let agent_path = self.directory_manager.get_agent_path(tool_agent_id);

        if !agent_path.exists() {
            warn!("Tool agent executable not found at {}, skipping uninstallation command", agent_path.display());
            return Ok(());
        }

        info!("Running uninstallation command for tool: {}", tool_agent_id);

        // Execute uninstallation command
        let mut cmd = Command::new(&agent_path);
        cmd.args(&processed_args);

        let output = cmd.output().await
            .context("Failed to execute uninstallation command")?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            
            warn!(
                "Uninstallation command for {} exited with status: {}\nstdout: {}\nstderr: {}",
                tool_agent_id,
                output.status,
                stdout,
                stderr
            );

            // Don't fail completely, just log the error
            // We still want to clean up files even if the uninstall command fails
        } else {
            let stdout = String::from_utf8_lossy(&output.stdout);
            info!("Uninstallation command executed successfully for tool: {}\nstdout: {}", tool_agent_id, stdout);
        }

        // Clean up tool-specific directory
        let tool_dir = self.directory_manager.app_support_dir().join(tool_agent_id);
        if tool_dir.exists() {
            info!("Removing tool directory: {}", tool_dir.display());
            if let Err(e) = tokio::fs::remove_dir_all(&tool_dir).await {
                warn!("Failed to remove tool directory {}: {}", tool_dir.display(), e);
            }
        }

        Ok(())
    }
}

