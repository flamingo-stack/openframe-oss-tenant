use anyhow::{Context, Result};
use std::process::Stdio;
use std::time::Instant;
use tracing::{info, warn, debug};
use tokio::io::AsyncReadExt;
use tokio::process::Command;
use crate::models::{InstalledTool, Installation};
use crate::services::InstalledToolsService;
use crate::services::ToolCommandParamsResolver;
use crate::services::ToolKillService;
use crate::platform::DirectoryManager;
#[cfg(target_os = "macos")]
use crate::platform::remove_app_bundle;
#[cfg(target_os = "windows")]
use crate::platform::file_lock::log_file_lock_info;

const UNINSTALL_COMMAND_TIMEOUT_SECS: u64 = 90;
const OUTPUT_DRAIN_TIMEOUT_SECS: u64 = 5;

type OutputReader = Option<tokio::task::JoinHandle<()>>;

async fn drain_command_output(stdout: OutputReader, stderr: OutputReader, tool_agent_id: &str) {
    for (handle, stream) in [(stdout, "stdout"), (stderr, "stderr")] {
        let Some(mut handle) = handle else { continue };
        if tokio::time::timeout(
            tokio::time::Duration::from_secs(OUTPUT_DRAIN_TIMEOUT_SECS),
            &mut handle,
        ).await.is_err() {
            warn!(
                "{} of uninstall command for {} still open after {}s (child likely left a process holding the pipe); abandoning it",
                stream, tool_agent_id, OUTPUT_DRAIN_TIMEOUT_SECS
            );
            handle.abort();
        }
    }
}

async fn stream_command_output<R>(pipe: R, tool_agent_id: String, stream: &'static str)
where
    R: AsyncReadExt + Unpin,
{
    let mut pipe = pipe;
    let mut chunk = [0u8; 1024];
    let mut line: Vec<u8> = Vec::new();

    loop {
        match pipe.read(&mut chunk).await {
            Ok(0) => break,
            Ok(read) => {
                for &byte in &chunk[..read] {
                    if byte == b'\n' || byte == b'\r' {
                        emit_command_line(&mut line, &tool_agent_id, stream);
                    } else {
                        line.push(byte);
                    }
                }
            }
            Err(e) => {
                warn!("Failed reading {} of uninstall command for {}: {}", stream, tool_agent_id, e);
                break;
            }
        }
    }

    emit_command_line(&mut line, &tool_agent_id, stream);
}

fn emit_command_line(line: &mut Vec<u8>, tool_agent_id: &str, stream: &'static str) {
    if line.is_empty() {
        return;
    }
    let text = String::from_utf8_lossy(line);
    let text = text.trim();
    if !text.is_empty() {
        info!("[uninstall {} {}] {}", tool_agent_id, stream, text);
    }
    line.clear();
}

pub enum UninstallOutcome {
    Removed,
    NotInstalled,
}

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

    pub async fn uninstall_by_tool_agent_id(&self, tool_agent_id: &str) -> Result<UninstallOutcome> {
        match self.installed_tools_service.get_by_tool_agent_id(tool_agent_id).await? {
            None => {
                info!("Tool {} not present in registry, nothing to uninstall", tool_agent_id);
                Ok(UninstallOutcome::NotInstalled)
            }
            Some(tool) => {
                self.uninstall_tool(&tool).await
                    .with_context(|| format!("Failed to uninstall tool: {}", tool_agent_id))?;

                let tool_dir = self.directory_manager.app_support_dir().join(tool_agent_id);
                if tool_dir.exists() {
                    std::fs::remove_dir_all(&tool_dir)
                        .with_context(|| format!("Failed to remove tool directory: {}", tool_dir.display()))?;
                    info!("Removed tool directory: {}", tool_dir.display());
                }

                self.installed_tools_service.delete_by_tool_agent_id(tool_agent_id).await
                    .with_context(|| format!("Failed to remove registry record for: {}", tool_agent_id))?;
                info!("Tool {} uninstalled and removed from registry", tool_agent_id);
                Ok(UninstallOutcome::Removed)
            }
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

        for tool in installed_tools {
            info!("Processing uninstallation for tool: {}", tool.tool_agent_id);

            if let Err(e) = self.uninstall_tool(&tool).await {
                warn!("Failed to uninstall tool {} (continuing with remaining tools): {:#}", tool.tool_agent_id, e);
                continue;
            }

            info!("Successfully uninstalled tool: {}", tool.tool_agent_id);
        }

        info!("All tools uninstalled successfully");
        Ok(())
    }

    /// Uninstall a single tool by running its uninstallation command
    ///
    /// Fails immediately if any step fails (stop process, run uninstall command, remove files)
    #[tracing::instrument(skip_all, fields(tool_id = %tool.tool_agent_id))]
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
                self.cleanup_gui_app_autorun(tool);
                return Ok(());
            }
        };

        // Process command parameters (replace placeholders)
        let processed_args = self.command_params_resolver
            .process(tool_agent_id, uninstall_args.clone())
            .context("Failed to process uninstallation command parameters")?;

        debug!("Processed uninstallation args for {}: {:?}", tool_agent_id, processed_args);

        let agent_path = self.directory_manager
            .get_tool_executable_path(tool_agent_id, tool.installation.executable_path());

        if !agent_path.exists() {
            warn!("Tool agent executable not found at {}, skipping uninstallation command", agent_path.display());
            self.cleanup_gui_app_bundle(tool).await;
            self.cleanup_gui_app_autorun(tool);
            return Ok(());
        }

        info!(
            "Running uninstallation command for tool: {}: {} {:?}",
            tool_agent_id,
            agent_path.display(),
            processed_args
        );

        // Execute uninstallation command
        let mut cmd = Command::new(&agent_path);
        cmd.args(&processed_args);
        cmd.kill_on_drop(true);
        cmd.stdout(Stdio::piped());
        cmd.stderr(Stdio::piped());

        let started = Instant::now();
        let mut child = cmd
            .spawn()
            .map_err(|e| {
                #[cfg(target_os = "windows")]
                log_file_lock_info(&e, &agent_path.to_string_lossy(), "execute uninstallation command");
                e
            })
            .context("Failed to execute uninstallation command")?;

        let stdout_reader = child.stdout.take().map(|pipe| {
            tokio::spawn(stream_command_output(pipe, tool_agent_id.to_string(), "stdout"))
        });
        let stderr_reader = child.stderr.take().map(|pipe| {
            tokio::spawn(stream_command_output(pipe, tool_agent_id.to_string(), "stderr"))
        });

        let wait_result = tokio::time::timeout(
            tokio::time::Duration::from_secs(UNINSTALL_COMMAND_TIMEOUT_SECS),
            child.wait(),
        ).await;

        let status = match wait_result {
            Ok(Ok(status)) => {
                drain_command_output(stdout_reader, stderr_reader, tool_agent_id).await;
                status
            }
            Ok(Err(e)) => {
                drain_command_output(stdout_reader, stderr_reader, tool_agent_id).await;
                return Err(e).context("Failed to wait for uninstallation command");
            }
            Err(_) => {
                let _ = child.kill().await;
                drain_command_output(stdout_reader, stderr_reader, tool_agent_id).await;
                return Err(anyhow::anyhow!(
                    "Uninstallation command for {} timed out after {}s (last output above)",
                    tool_agent_id, UNINSTALL_COMMAND_TIMEOUT_SECS
                ));
            }
        };

        if !status.success() {
            // Fail immediately if uninstall command returns non-zero exit code
            return Err(anyhow::anyhow!(
                "Uninstallation command for {} exited with status: {} after {:?} (output above)",
                tool_agent_id,
                status,
                started.elapsed()
            ));
        }

        info!(
            "Uninstallation command executed successfully for tool: {} in {:?}",
            tool_agent_id,
            started.elapsed()
        );

        // Cleanup any remaining processes after uninstall command (some tools spawn detached processes)
        self.cleanup_tool_processes(tool).await;

        // Cleanup GUI app bundle if applicable
        self.cleanup_gui_app_bundle(tool).await;

        // Remove the GuiApp from autorun if applicable
        self.cleanup_gui_app_autorun(tool);

        Ok(())
    }

    async fn stop_tool_process(&self, tool: &InstalledTool) -> Result<()> {
        self.tool_kill_service.stop_installed_tool(tool, true).await
    }

    async fn cleanup_tool_processes(&self, tool: &InstalledTool) {
        let agent_path = self.directory_manager
            .get_tool_executable_path(&tool.tool_agent_id, tool.installation.executable_path())
            .to_string_lossy()
            .to_string();

        info!("Cleaning up processes for tool {} by path: {}", tool.tool_agent_id, agent_path);

        if let Err(e) = self.tool_kill_service.stop_tool_by_path(&agent_path).await {
            warn!("Failed to cleanup processes for {}: {:#}", tool.tool_agent_id, e);
        }
    }

    async fn cleanup_gui_app_bundle(&self, tool: &InstalledTool) {
        let Installation::GuiApp { executable_path, .. } = &tool.installation else {
            return;
        };

        #[cfg(target_os = "macos")]
        {
            if let Err(e) = remove_app_bundle(executable_path).await {
                warn!("Failed to remove .app bundle: {:#}", e);
            }
        }

        #[cfg(not(target_os = "macos"))]
        {
            let _ = executable_path;
        }
    }

    fn cleanup_gui_app_autorun(&self, tool: &InstalledTool) {
        let Installation::GuiApp { .. } = &tool.installation else {
            return;
        };

        #[cfg(target_os = "windows")]
        {
            crate::utils::windows_helpers::unregister_autorun(&tool.tool_agent_id);
        }
    }
}

