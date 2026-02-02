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
use crate::models::installed_tool::InstalledTool;
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
fn get_active_user_session() -> Option<u32> {
    unsafe {
        info!("=== Starting active user session detection ===");
        
        // 1. Try to get Session Id of current process
        let current_pid = GetCurrentProcessId();
        info!("Current process PID: {}", current_pid);
        
        let mut session_id = 0;
        if ProcessIdToSessionId(current_pid, &mut session_id).is_ok() {
            info!("Current process session ID: {}", session_id);
            if session_id != 0 {
                info!("Not running as service - using current process session ID: {}", session_id);
                return Some(session_id);
            }
            info!("Session ID is 0 - running as service, need to find active user session");
        } else {
            warn!("Failed to get current process session ID");
        }

        // 2. If session_id == 0 (service), enumerate all sessions to find active user
        info!("Enumerating all Windows Terminal Services sessions...");
        let mut pp_session_info: *mut WTS_SESSION_INFOW = std::ptr::null_mut();
        let mut count: u32 = 0;

        if WTSEnumerateSessionsW(
            WTS_CURRENT_SERVER_HANDLE,
            0,
            1,
            &mut pp_session_info,
            &mut count,
        ).is_ok()
        {
            info!("Found {} total sessions", count);
            let sessions = std::slice::from_raw_parts(pp_session_info, count as usize);

            // First, log ALL sessions for visibility
            let mut active_sessions = Vec::new();
            
            for (idx, session) in sessions.iter().enumerate() {
                let session_name = if session.pWinStationName.is_null() {
                    String::from("(null)")
                } else {
                    String::from_utf16_lossy(
                        std::slice::from_raw_parts(
                            session.pWinStationName.0,
                            wcslen(session.pWinStationName.0)
                        )
                    )
                };
                
                info!("  Session {}: ID={}, Name='{}', State={:?}", 
                      idx, session.SessionId, session_name, session.State);

                // Collect all active sessions (State == 0 = WTSActive)
                if session.State == WTSActive {
                    active_sessions.push((session.SessionId, session_name.clone()));
                    info!("    → Active session detected");
                }
            }

            // Choose the best active session
            if !active_sessions.is_empty() {
                info!("Found {} active session(s)", active_sessions.len());
                
                // Strategy: Prefer RDP sessions over Console, or use the highest session ID (most recent)
                let best_session = active_sessions.iter()
                    .filter(|(id, name)| {
                        // Filter out session 0 (Services) and listen sessions
                        *id > 0 && !name.to_lowercase().contains("listen")
                    })
                    .max_by_key(|(id, name)| {
                        // Prefer RDP sessions (rdp-tcp) over Console, then by highest ID
                        let is_rdp = name.to_lowercase().contains("rdp-tcp");
                        let is_console = name.to_lowercase().contains("console");
                        
                        // Priority: RDP > Console, then by session ID
                        if is_rdp && !name.to_lowercase().contains("listen") {
                            (2, *id) // Highest priority for active RDP sessions
                        } else if is_console {
                            (1, *id) // Medium priority for console
                        } else {
                            (0, *id) // Lowest priority for others
                        }
                    });

                if let Some((id, name)) = best_session {
                    info!("Selected active user session: ID={}, Name='{}'", id, name);
                    WTSFreeMemory(pp_session_info as _);
                    return Some(*id);
                } else {
                    warn!("Active sessions found but none suitable (filtered out session 0 and listen sessions)");
                }
            } else {
                warn!("No active (WTSActive) session found among {} sessions", count);
            }

            WTSFreeMemory(pp_session_info as _);
        } else {
            error!("Failed to enumerate Windows Terminal Services sessions");
        }

        error!("=== Failed to find any active user session ===");
        None
    }
}

#[cfg(windows)]
fn wcslen(ptr: *const u16) -> usize {
    let mut len = 0;
    unsafe {
        while *ptr.add(len) != 0 {
            len += 1;
        }
    }
    len
}

#[cfg(windows)]
fn launch_process_in_console_session(command_path: &str, args: &[String]) -> Result<(u32, HANDLE)> {
    unsafe {
        let session_id = WTSGetActiveConsoleSessionId();
        info!("Physical console session ID: {}", session_id);
        if session_id == u32::MAX {
            anyhow::bail!("No active user session found");
        }

        let mut user_token = HANDLE(0);
        if let Err(e) = WTSQueryUserToken(session_id, &mut user_token) {
            anyhow::bail!("Failed to get user token for session {}: {:?}", session_id, e);
        }

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
        let mut pi = PROCESS_INFORMATION::default();

        let mut cmdline_wide = to_wide(&cmdline);

        // Use DETACHED_PROCESS | CREATE_NO_WINDOW to run without visible console
        use windows::Win32::System::Threading::{DETACHED_PROCESS, CREATE_NO_WINDOW};

        let result = CreateProcessAsUserW(
            user_token,
            PCWSTR(to_wide(command_path).as_ptr()),
            PWSTR(cmdline_wide.as_mut_ptr()),
            None,
            None,
            false,
            DETACHED_PROCESS | CREATE_NO_WINDOW,
            None,
            None,
            &si,
            &mut pi,
        );

        let _ = CloseHandle(user_token);

        if let Err(e) = result {
            anyhow::bail!("Failed to launch process in user session: {:?}", e);
        }

        let pid = pi.dwProcessId;
        let process_handle = pi.hProcess;

        // Close thread handle as we don't need it
        let _ = CloseHandle(pi.hThread);

        info!("Process launched in user session, PID: {}", pid);
        Ok((pid, process_handle))
    }
}

#[cfg(windows)]
fn launch_process_in_user_session(command_path: &str, args: &[String]) -> Result<(u32, HANDLE)> {
    unsafe {
        let session_id = match get_active_user_session() {
            Some(id) => {
                info!("Successfully obtained active user session ID: {}", id);
                id
            }
            None => {
                anyhow::bail!("No active user session found");
            }
        };

        info!("Step 1: Querying user token for session {}", session_id);
        let mut user_token = HANDLE(0);
        if let Err(e) = WTSQueryUserToken(session_id, &mut user_token) {
            error!("Failed to get user token for session {}: {:?}", session_id, e);
            anyhow::bail!("Failed to get user token for session {}: {:?}", session_id, e);
        }
        
        info!("Successfully obtained user token for session {} (handle: {:?})", session_id, user_token);

        // Duplicate token to get primary token (required for CreateProcessAsUserW)
        info!("Step 2: Duplicating token to get primary token (required for CreateProcessAsUserW)");
        let mut primary_token = HANDLE(0);
        if let Err(e) = DuplicateTokenEx(
            user_token,
            TOKEN_ALL_ACCESS,
            None,
            SECURITY_IMPERSONATION_LEVEL(2), // SecurityImpersonation
            TokenPrimary,
            &mut primary_token,
        ) {
            error!("Failed to duplicate token: {:?}", e);
            let _ = CloseHandle(user_token);
            anyhow::bail!("Failed to duplicate token for session {}: {:?}", session_id, e);
        }
        
        let _ = CloseHandle(user_token);
        info!("Successfully duplicated token to primary token (handle: {:?})", primary_token);

        // Build command line with full path in quotes + arguments
        info!("Step 3: Building command line");
        let mut cmdline = format!("\"{}\"", command_path);
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
        info!("Command line: {}", cmdline);

        info!("Step 4: Setting up STARTUPINFOW structure");
        let mut si = STARTUPINFOW::default();
        si.cb = std::mem::size_of::<STARTUPINFOW>() as u32;
        
        // For GUI applications, set the desktop to winsta0\default
        let desktop = to_wide("winsta0\\default");
        si.lpDesktop = PWSTR(desktop.as_ptr() as *mut u16);
        si.dwFlags = windows::Win32::System::Threading::STARTF_USESHOWWINDOW;
        si.wShowWindow = SW_SHOW.0 as u16;
        info!("  Desktop: winsta0\\default");
        info!("  Show window: SW_SHOW");
        info!("  STARTUPINFOW size: {} bytes", si.cb);
        
        let mut pi = PROCESS_INFORMATION::default();

        let mut cmdline_wide = to_wide(&cmdline);
        
        info!("Step 5: Calling CreateProcessAsUserW");
        info!("  lpApplicationName: NULL (using command line parsing)");
        info!("  lpCommandLine: {}", cmdline);
        info!("  Creation flags: CREATE_NEW_PROCESS_GROUP");
        
        // For GUI applications, use CREATE_NEW_PROCESS_GROUP for proper process isolation
        use windows::Win32::System::Threading::CREATE_NEW_PROCESS_GROUP;
        
        // Try with lpApplicationName = NULL and full command line
        let result = CreateProcessAsUserW(
            primary_token,
            PCWSTR::null(), // lpApplicationName = NULL
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

        if let Err(e) = result {
            // Fallback: try without desktop specification
            error!("✗ CreateProcessAsUserW failed with desktop specification: {:?}", e);
            warn!("Attempting fallback: retrying without desktop specification");
            
            info!("Step 6: Fallback attempt - removing desktop specification");
            si.lpDesktop = PWSTR::null();
            info!("  Desktop: NULL (removed)");
            let mut cmdline_wide_retry = to_wide(&cmdline);
            
            let result_retry = CreateProcessAsUserW(
                primary_token,
                PCWSTR::null(),
                PWSTR(cmdline_wide_retry.as_mut_ptr()),
                None,
                None,
                false,
                CREATE_NEW_PROCESS_GROUP,
                None,
                None,
                &si,
                &mut pi,
            );
            
            let _ = CloseHandle(primary_token);
            
            if let Err(e2) = result_retry {
                error!("✗ CreateProcessAsUserW failed again without desktop specification: {:?}", e2);
                error!("Both attempts to launch process failed");
                anyhow::bail!("Failed to launch process in user session: {:?}", e2);
            }
            
            info!("Fallback successful - process launched without desktop specification");
        } else {
            info!("CreateProcessAsUserW succeeded on first attempt");
            let _ = CloseHandle(primary_token);
        }

        let pid = pi.dwProcessId;
        let process_handle = pi.hProcess;
        
        info!("Step 7: Process created successfully");
        info!("  Process ID (PID): {}", pid);
        info!("  Process handle: {:?}", process_handle);
        info!("  Thread ID: {}", pi.dwThreadId);
        info!("  Thread handle: {:?}", pi.hThread);
        
        // Close thread handle as we don't need it
        let _ = CloseHandle(pi.hThread);
        info!("  Closed thread handle (not needed for monitoring)");

        info!("=== Process launched successfully in user session {} with PID {} ===", session_id, pid);
        Ok((pid, process_handle))
    }
}

#[derive(Clone)]
pub struct ToolRunManager {
    installed_tools_service: InstalledToolsService,
    params_processor: ToolCommandParamsResolver,
    tool_kill_service: ToolKillService,
    running_tools: Arc<RwLock<HashSet<String>>>,
    updating_tools: Arc<RwLock<HashSet<String>>>,
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
            updating_tools: Arc::new(RwLock::new(HashSet::new())),
        }
    }

    pub async fn mark_updating(&self, tool_id: &str) {
        self.updating_tools.write().await.insert(tool_id.to_string());
        info!("Tool {} marked as updating", tool_id);
    }

    pub async fn clear_updating(&self, tool_id: &str) {
        self.updating_tools.write().await.remove(tool_id);
        info!("Tool {} update flag cleared", tool_id);
    }

    pub async fn is_updating(&self, tool_id: &str) -> bool {
        self.updating_tools.read().await.contains(tool_id)
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

    pub async fn clear_running_tool(&self, tool_id: &str) {
        let mut set = self.running_tools.write().await;
        set.remove(tool_id);
    }

    async fn run_tool(&self, tool: InstalledTool) -> Result<()> {
        self.tool_kill_service.stop_tool(&tool.tool_agent_id).await?;

        #[cfg(windows)]
        let running_tools = self.running_tools.clone();

        let updating_tools = self.updating_tools.clone();
        let params_processor = self.params_processor.clone();
        tokio::spawn({

            async move {
                loop {
                    while updating_tools.read().await.contains(&tool.tool_agent_id) {
                        info!(tool_id = %tool.tool_agent_id, "Tool is being updated, waiting...");
                        sleep(Duration::from_secs(1)).await;
                    }

                    // exchange args placeholders to real values
                    let processed_args = match params_processor.process(&tool.tool_agent_id, tool.run_command_args.clone()) {
                        Ok(args) => args,
                        Err(e) => {
                        error!("Failed to resolve tool {} run command args: {:#}", tool.tool_agent_id, e);
                        sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                        continue;
                    }
                };

                debug!("Running tool {} with args: {:?}", tool.tool_agent_id, processed_args);

                let command_path = params_processor.directory_manager
                    .get_tool_executable_path(&tool.tool_agent_id, tool.executable_path.as_deref())
                    .to_string_lossy()
                    .to_string();

                if !std::path::Path::new(&command_path).exists() {
                    warn!("Executable not found at: {}", command_path);
                }

                // On Windows, check session type to determine launch method
                #[cfg(windows)]
                {
                    use crate::models::SessionType;
                    
                    match tool.session_type {
                        SessionType::User => {
                            info!("Launching {} in USER session (GUI application)", tool.tool_agent_id);
                            match launch_process_in_user_session(&command_path, &processed_args) {
                                Ok((pid, process_handle)) => {
                                    info!("{} launched successfully in USER session with PID: {}", tool.tool_agent_id, pid);
                                    
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
                                           "Failed to launch {} in USER session - retrying in {} seconds", 
                                           tool.tool_agent_id, RETRY_DELAY_SECONDS);
                                    sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                                    continue;
                                }
                            }
                        }
                        SessionType::Console => {
                            // Temporarily skipping console mode since in this mode only the mesh agent runs,
                            // which is now installed separately as a service.
                            info!(tool_id = %tool.tool_agent_id, "SessionType::Console - skipping launch");
                            let mut set = running_tools.write().await;
                            set.remove(&tool.tool_agent_id);
                            return;
                        }
                        SessionType::Service => {
                            info!("Launching {} as SERVICE (standard spawn)", tool.tool_agent_id);
                            // Continue to standard spawn below
                        }
                    }
                    
                    // If we reached here and session_type is Service, continue to standard spawn
                    if tool.session_type != SessionType::Service {
                        // User or Console sessions are handled above and continue the loop
                        // This should never be reached, but just in case
                        continue;
                    }
                }

                // For non-Windows platforms, skip Console session type tools
                #[cfg(not(windows))]
                {
                    use crate::models::SessionType;
                    if tool.session_type == SessionType::Console {
                        info!(tool_id = %tool.tool_agent_id, "SessionType::Console - skipping launch");
                        return;
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
            }
        });

        Ok(())
    }
}
