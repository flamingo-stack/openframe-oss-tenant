use anyhow::{Context, Result};
use tracing::{info, warn, error, debug};
use std::process::Stdio;
use tokio::process::Command;
use tokio::time::sleep;
use std::time::Duration;
use std::collections::HashSet;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::io::{AsyncBufReadExt, BufReader};
use crate::models::installed_tool::{InstalledTool, ToolStatus};
use crate::services::installed_tools_service::InstalledToolsService;
use crate::services::tool_command_params_resolver::ToolCommandParamsResolver;
use crate::services::tool_kill_service::ToolKillService;

#[cfg(windows)]
use std::ffi::OsStr;
#[cfg(windows)]
use std::os::windows::ffi::OsStrExt;
#[cfg(windows)]
use windows::{
    core::{PCWSTR, PWSTR},
    Win32::Foundation::*,
    Win32::System::Threading::*,
    Win32::System::RemoteDesktop::*,
    Win32::UI::WindowsAndMessaging::SW_SHOW,
    Win32::Security::*,
};

const RETRY_DELAY_SECONDS: u64 = 5;

#[cfg(windows)]
fn to_wide(s: &str) -> Vec<u16> {
    use std::iter::once;
    OsStr::new(s).encode_wide().chain(once(0)).collect()
}

#[cfg(windows)]
fn launch_process_in_user_session(command_path: &str, args: &[String]) -> Result<(u32, HANDLE)> {
    unsafe {
        let session_id = WTSGetActiveConsoleSessionId();
        info!("Active console session ID: {}", session_id);
        
        if session_id == u32::MAX {
            anyhow::bail!("No active user session found");
        }

        let mut user_token = HANDLE(0);
        if let Err(e) = WTSQueryUserToken(session_id, &mut user_token) {
            anyhow::bail!("Failed to get user token for session {}: {:?}", session_id, e);
        }
        
        info!("Successfully obtained user token for session {}", session_id);

        // Build command line with arguments
        let mut cmdline = command_path.to_string();
        for arg in args {
            cmdline.push(' ');
            // Quote argument if it contains spaces
            if arg.contains(' ') {
                cmdline.push('"');
                cmdline.push_str(arg);
                cmdline.push('"');
            } else {
                cmdline.push_str(arg);
            }
        }

        let mut si = STARTUPINFOW::default();
        si.cb = std::mem::size_of::<STARTUPINFOW>() as u32;
        
        // For GUI applications, set the desktop to winsta0\default
        let desktop = to_wide("winsta0\\default");
        si.lpDesktop = PWSTR(desktop.as_ptr() as *mut u16);
        si.dwFlags = windows::Win32::System::Threading::STARTF_USESHOWWINDOW;
        si.wShowWindow = SW_SHOW.0 as u16;
        
        let mut pi = PROCESS_INFORMATION::default();

        let mut cmdline_wide = to_wide(&cmdline);
        
        info!("Launching process with command line: {}", cmdline);
        info!("Desktop: winsta0\\default, Show window: SW_SHOW");
        
        // For GUI applications, use CREATE_NEW_PROCESS_GROUP for proper process isolation
        use windows::Win32::System::Threading::CREATE_NEW_PROCESS_GROUP;
        
        let result = CreateProcessAsUserW(
            user_token,
            PCWSTR(to_wide(command_path).as_ptr()),
            PWSTR(cmdline_wide.as_mut_ptr()),
            None,
            None,
            false,
            CREATE_NEW_PROCESS_GROUP,
            None,
            None,
            &si,
            &mut pi,
        );

        let _ = CloseHandle(user_token);

        if let Err(e) = result {
            error!("CreateProcessAsUserW failed: {:?}", e);
            anyhow::bail!("Failed to launch process in user session: {:?}", e);
        }

        let pid = pi.dwProcessId;
        let process_handle = pi.hProcess;
        
        // Close thread handle as we don't need it
        let _ = CloseHandle(pi.hThread);

        info!("✓ Process launched successfully in user session {}, PID: {}", session_id, pid);
        Ok((pid, process_handle))
    }
}

#[derive(Clone)]
pub struct ToolRunManager {
    installed_tools_service: InstalledToolsService,
    params_processor: ToolCommandParamsResolver,
    tool_kill_service: ToolKillService,
    running_tools: Arc<RwLock<HashSet<String>>>,
}

impl ToolRunManager {
    pub fn new(
        installed_tools_service: InstalledToolsService,
        params_processor: ToolCommandParamsResolver,
        tool_kill_service: ToolKillService,
    ) -> Self {
        Self {
            installed_tools_service,
            params_processor,
            tool_kill_service,
            running_tools: Arc::new(RwLock::new(HashSet::new())),
        }
    }

    pub async fn run(&self) -> Result<()> {
        info!("Starting tool run manager");

        let tools = self
            .installed_tools_service
            .get_all()
            .await
            .context("Failed to retrieve installed tools list")?;

        if tools.is_empty() {
            info!("No installed tools found – nothing to run");
            return Ok(());
        }

        for tool in tools {
            if self.try_mark_running(&tool.tool_agent_id).await {
                info!("Running tool {}", tool.tool_agent_id);
                self.run_tool(tool).await?;
            } else {
                warn!("Tool {} is already running - skipping", tool.tool_agent_id);
            }
        }
 
        Ok(())
    }

    pub async fn run_new_tool(&self, installed_tool: InstalledTool) -> Result<()> {
        if !self.try_mark_running(&installed_tool.tool_agent_id).await {
            warn!("Tool {} is already running - skipping", installed_tool.tool_agent_id);
            return Ok(());
        }

        info!("Running new single tool {}", installed_tool.tool_agent_id);
        self.run_tool(installed_tool).await
    }

    async fn try_mark_running(&self, tool_id: &str) -> bool {
        let mut set = self.running_tools.write().await;
        if set.contains(tool_id) {
            false
        } else {
            set.insert(tool_id.to_string());
            true
        }
    }

    async fn run_tool(&self, tool: InstalledTool) -> Result<()> {
        self.tool_kill_service.stop_tool(&tool.tool_agent_id).await?;

        let params_processor = self.params_processor.clone();
        tokio::spawn(async move {
            loop {
                // exchange args placeholders to real values
                let processed_args = match params_processor.process(&tool.tool_agent_id, tool.run_command_args.clone()) {
                    Ok(args) => args,
                    Err(e) => {
                        error!("Failed to resolve tool {} run command args: {:#}", tool.tool_agent_id, e);
                        sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                        continue;
                    }
                };

                debug!("Run tool {} with args: {:?}", tool.tool_agent_id, processed_args);

                // Build executable path based on file type
                use crate::models::MainFileType;
                let mut command_path = match tool.file_type {
                    MainFileType::Application => {
                        // For APPLICATION type, use applications directory
                        #[cfg(target_os = "macos")]
                        {
                            params_processor.directory_manager
                                .applications_dir()
                                .join(format!("{}.app", tool.tool_agent_id))
                        }
                        
                        #[cfg(not(target_os = "macos"))]
                        {
                            // Fallback to regular path for non-macOS
                            params_processor.directory_manager
                                .get_agent_path(&tool.tool_agent_id)
                        }
                    },
                    MainFileType::Executable => {
                        // For EXECUTABLE type, use app support directory
                        params_processor.directory_manager
                            .get_agent_path(&tool.tool_agent_id)
                    }
                }.to_string_lossy().to_string();

                // For .app bundles on macOS, find the actual executable inside
                #[cfg(target_os = "macos")]
                if command_path.ends_with(".app") {
                    use std::path::PathBuf;
                    let app_bundle = PathBuf::from(&command_path);
                    
                    // Try to find the executable inside Contents/MacOS
                    let macos_dir = app_bundle.join("Contents").join("MacOS");
                    if macos_dir.exists() {
                        // Look for an executable file in the MacOS directory
                        if let Ok(mut entries) = std::fs::read_dir(&macos_dir) {
                            if let Some(Ok(entry)) = entries.next() {
                                let executable_path = entry.path();
                                debug!("Found executable for .app bundle: {}", executable_path.display());
                                command_path = executable_path.to_string_lossy().to_string();
                            } else {
                                error!("No executable found in .app bundle MacOS directory: {}", macos_dir.display());
                            }
                        }
                    } else {
                        error!(".app bundle MacOS directory does not exist: {}", macos_dir.display());
                    }
                }

                // Check if this is MeshCentral or openframe-chat on Windows - launch in user session
                #[cfg(windows)]
                let needs_user_session = tool.tool_agent_id.to_lowercase().contains("meshcentral") 
                    || tool.tool_agent_id.to_lowercase().contains("openframe-chat");
                
                #[cfg(windows)]
                if needs_user_session {
                    info!("Launching {} in user session", tool.tool_agent_id);
                    match launch_process_in_user_session(&command_path, &processed_args) {
                        Ok((pid, process_handle)) => {
                            info!("{} launched successfully with PID: {}", tool.tool_agent_id, pid);
                            
                            // Wait for process to exit in blocking thread to avoid blocking async runtime
                            let exit_code = tokio::task::spawn_blocking(move || {
                                use windows::Win32::System::Threading::{WaitForSingleObject, INFINITE};
                                
                                unsafe {
                                    let _ = WaitForSingleObject(process_handle, INFINITE);
                                    
                                    // Get exit code
                                    let mut exit_code: u32 = 0;
                                    let _ = GetExitCodeProcess(process_handle, &mut exit_code);
                                    let _ = CloseHandle(process_handle);
                                    
                                    exit_code
                                }
                            }).await.unwrap_or(1);
                            
                            warn!(tool_id = %tool.tool_agent_id,
                                  "{} process exited with code {} - restarting in {} seconds",
                                  tool.tool_agent_id, exit_code, RETRY_DELAY_SECONDS);
                            
                            sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                            continue;
                        }
                        Err(e) => {
                            error!(tool_id = %tool.tool_agent_id, error = %e,
                                   "Failed to launch {} in user session - retrying in {} seconds", 
                                   tool.tool_agent_id, RETRY_DELAY_SECONDS);
                            sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                            continue;
                        }
                    }
                }

                // For all other tools (or non-Windows), use standard spawn
                let mut child = match Command::new(&command_path)
                    .args(&processed_args)
                    .stdout(Stdio::piped())
                    .stderr(Stdio::piped())
                    .spawn()
                {
                    Ok(child) => child,
                    Err(e) => {
                        error!(tool_id = %tool.tool_agent_id, error = %e,
                               "Failed to start tool process - retrying in {} seconds", RETRY_DELAY_SECONDS);
                        sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                        continue;
                    }
                };

                // Capture stdout
                if let Some(stdout) = child.stdout.take() {
                    let tool_id_clone = tool.tool_agent_id.clone();
                    tokio::spawn(async move {
                        let reader = BufReader::new(stdout);
                        let mut lines = reader.lines();
                        while let Ok(Some(line)) = lines.next_line().await {
                            info!(tool_id = %tool_id_clone, "[STDOUT] {}", line);
                        }
                    });
                }

                // Capture stderr
                if let Some(stderr) = child.stderr.take() {
                    let tool_id_clone = tool.tool_agent_id.clone();
                    tokio::spawn(async move {
                        let reader = BufReader::new(stderr);
                        let mut lines = reader.lines();
                        while let Ok(Some(line)) = lines.next_line().await {
                            warn!(tool_id = %tool_id_clone, "[STDERR] {}", line);
                        }
                    });
                }

                match child.wait().await {
                    Ok(status) => {
                        if status.success() {
                            warn!(tool_id = %tool.tool_agent_id,
                                  "Tool completed successfully but should keep running - restarting in {} seconds", 
                                  RETRY_DELAY_SECONDS);
                            sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                        } else {
                            error!(tool_id = %tool.tool_agent_id, exit_status = %status,
                                   "Tool failed with exit status - restarting in {} seconds", RETRY_DELAY_SECONDS);
                            sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                        }
                    }
                    Err(e) => {
                        error!(tool_id = %tool.tool_agent_id, error = %e,
                               "Failed to wait for tool process - restarting in {} seconds: {:#}", RETRY_DELAY_SECONDS, e);
                        sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                    }
                }
            }
        });

        Ok(())
    }
}
