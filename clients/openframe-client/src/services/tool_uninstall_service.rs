use anyhow::{Context, Result};
use tracing::{info, warn, debug};
use tokio::process::Command;
use tokio::fs;
use std::path::PathBuf;
use crate::models::download_configuration::InstallationType;
use crate::services::InstalledToolsService;
use crate::services::ToolCommandParamsResolver;
use crate::services::ToolKillService;
use crate::platform::DirectoryManager;
#[cfg(target_os = "windows")]
use crate::platform::file_lock::log_file_lock_info;
#[allow(unused_imports)]
use crate::models::InstalledTool;

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
    /// 
    /// This method will fail immediately if any tool fails to uninstall.
    /// No partial success - either all tools are uninstalled or the operation fails.
    pub async fn uninstall_all(&self) -> Result<()> {
        info!("Starting uninstallation of all installed tools");

        let installed_tools = self.installed_tools_service.get_all().await
            .context("Failed to retrieve installed tools")?;

        if installed_tools.is_empty() {
            info!("No installed tools found to uninstall");
            return Ok(());
        }

        info!("Found {} installed tools to uninstall", installed_tools.len());

        for tool in installed_tools {
            info!("Processing uninstallation for tool: {}", tool.tool_agent_id);

            // Fail immediately if uninstallation fails
            self.uninstall_tool(&tool).await
                .with_context(|| format!("Failed to uninstall tool: {}", tool.tool_agent_id))?;

            info!("Successfully uninstalled tool: {}", tool.tool_agent_id);
        }

        info!("All tools uninstalled successfully");
        Ok(())
    }

    /// Uninstall a single tool by running its uninstallation command
    /// 
    /// Fails immediately if any step fails (stop process, run uninstall command, remove files)
    async fn uninstall_tool(&self, tool: &crate::models::InstalledTool) -> Result<()> {
        let tool_agent_id = &tool.tool_agent_id;

        // Stop the tool process before uninstalling - fail if we can't stop it
        info!("Stopping tool process before uninstallation: {}", tool_agent_id);
        self.stop_tool_process(tool).await
            .with_context(|| format!("Failed to stop tool process for: {}", tool_agent_id))?;

        // TODO: make this stop from fleet orbit side or using asset path
        // Now it's dirty solution to stop osquery manually
        if (tool.tool_agent_id.to_lowercase().contains("fleet")) {
            info!("Stopping osqueryd for tool: {}", tool_agent_id);
            self.tool_kill_service.stop_asset("osqueryd", tool_agent_id).await
                .with_context(|| format!("Failed to stop tool process for: {}", tool_agent_id))?;
            info!("Successfully stopped osqueryd for tool: {}", tool_agent_id);
        } else {
            info!("Not stopping osqueryd for tool: {}", tool_agent_id);
        }

        // Check if uninstallation command is provided
        let uninstall_args = match &tool.uninstallation_command_args {
            Some(args) if !args.is_empty() => args,
            _ => {
                info!("No uninstallation command provided for tool: {}", tool_agent_id);
                self.cleanup_gui_app_bundle(tool).await;
                return Ok(());
            }
        };

        // Process command parameters (replace placeholders)
        let processed_args = self.command_params_resolver
            .process(tool_agent_id, uninstall_args.clone())
            .context("Failed to process uninstallation command parameters")?;

        debug!("Processed uninstallation args for {}: {:?}", tool_agent_id, processed_args);

        let agent_path = self.directory_manager
            .get_tool_executable_path(tool_agent_id, tool.executable_path.as_deref());

        if !agent_path.exists() {
            warn!("Tool agent executable not found at {}, skipping uninstallation command", agent_path.display());
            return Ok(());
        }

        info!("Running uninstallation command for tool: {}", tool_agent_id);

        // Execute uninstallation command
        let mut cmd = Command::new(&agent_path);
        cmd.args(&processed_args);

        let output = cmd.output().await
            .map_err(|e| {
                #[cfg(target_os = "windows")]
                log_file_lock_info(&e, &agent_path.to_string_lossy(), "execute uninstallation command");
                e
            })
            .context("Failed to execute uninstallation command")?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            
            // Fail immediately if uninstall command returns non-zero exit code
            return Err(anyhow::anyhow!(
                "Uninstallation command for {} exited with status: {}\nstdout: {}\nstderr: {}",
                tool_agent_id,
                output.status,
                stdout,
                stderr
            ));
        }
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        info!("Uninstallation command executed successfully for tool: {}\nstdout: {}", tool_agent_id, stdout);

        // Cleanup GUI app bundle if applicable
        self.cleanup_gui_app_bundle(tool).await;

        Ok(())
    }

    async fn stop_tool_process(&self, tool: &InstalledTool) -> Result<()> {
        self.tool_kill_service.stop_installed_tool(tool).await
    }

    async fn cleanup_gui_app_bundle(&self, tool: &crate::models::InstalledTool) {
        if tool.installation_type != InstallationType::GuiApp {
            return;
        }

        #[cfg(target_os = "macos")]
        {
            let Some(exec_path) = &tool.executable_path else { return };
            self.remove_macos_app_bundle(exec_path).await;
        }

        #[cfg(not(target_os = "macos"))]
        {
            let _ = tool;
        }
    }

    #[cfg(target_os = "macos")]
    async fn remove_macos_app_bundle(&self, executable_path: &str) {
        let path = PathBuf::from(executable_path);
        let Some(app_bundle) = path.ancestors()
            .find(|p| p.extension().map_or(false, |ext| ext == "app"))
        else {
            warn!("Could not find .app bundle in path: {}", executable_path);
            return;
        };

        if !app_bundle.exists() {
            info!("App bundle already removed: {}", app_bundle.display());
            return;
        }

        info!("Removing .app bundle: {}", app_bundle.display());
        if let Err(e) = fs::remove_dir_all(app_bundle).await {
            warn!("Failed to remove .app bundle {}: {:#}", app_bundle.display(), e);
        } else {
            info!("Successfully removed .app bundle: {}", app_bundle.display());
        }
    }
}

