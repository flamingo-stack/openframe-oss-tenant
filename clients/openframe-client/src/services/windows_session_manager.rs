use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::Duration;

use tokio::sync::{mpsc, RwLock};
use tokio::time::sleep;
use tracing::{debug, error, info, warn};

use windows::core::PWSTR;
use windows::Win32::Foundation::{CloseHandle, HANDLE};
use windows::Win32::System::RemoteDesktop::{
    WTSActive, WTSEnumerateProcessesW, WTSEnumerateSessionsW, WTSFreeMemory,
    WTS_CURRENT_SERVER_HANDLE, WTS_PROCESS_INFOW, WTS_SESSION_INFOW,
};
use windows::Win32::System::Threading::{
    GetExitCodeProcess, OpenProcess, QueryFullProcessImageNameW, WaitForSingleObject, INFINITE,
    PROCESS_NAME_FORMAT, PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_SYNCHRONIZE,
};

use crate::services::tool_run_manager::launch_process_in_target_session;
use crate::utils::windows_helpers::wcslen;

const RETRY_DELAY_SECONDS: u64 = 5;
const SESSION_STARTUP_DELAY_SECONDS: u64 = 60 * 5;

/// Translated from `windows_service::service::ServiceControl::SessionChange`
#[derive(Debug)]
pub enum SessionEvent {
    Logon { session_id: u32 },
    Logoff { session_id: u32 },
    ConsoleConnect { session_id: u32 },
    ConsoleDisconnect { session_id: u32 },
    RemoteConnect { session_id: u32 },
    RemoteDisconnect { session_id: u32 },
}

#[derive(Clone)]
struct ToolRunInfo {
    command_path: String,
    launch_args: Vec<String>,
}

pub struct WindowsSessionManager {
    registered_tools: Arc<RwLock<HashMap<String, ToolRunInfo>>>,
    active_sessions: Arc<RwLock<HashSet<u32>>>,
    waiters: Arc<RwLock<HashSet<(String, u32)>>>,
}

impl WindowsSessionManager {
    /// Build the manager, seed `active_sessions` from a one-time WTS enumeration, and spawn
    /// the SCM event-dispatch task. Must be called from within a tokio runtime
    pub fn new(session_rx: mpsc::UnboundedReceiver<SessionEvent>) -> Arc<Self> {
        let initial: HashSet<u32> = enumerate_active_user_sessions().into_iter().collect();
        info!(sessions = ?initial, "Initial active sessions");

        let me = Arc::new(Self {
            registered_tools: Arc::new(RwLock::new(HashMap::new())),
            active_sessions: Arc::new(RwLock::new(initial)),
            waiters: Arc::new(RwLock::new(HashSet::new())),
        });

        let dispatcher = me.clone();
        tokio::spawn(async move { dispatcher.run_event_loop(session_rx).await });

        me
    }

    async fn run_event_loop(self: Arc<Self>, mut session_rx: mpsc::UnboundedReceiver<SessionEvent>) {
        while let Some(event) = session_rx.recv().await {
            self.handle_event(event).await;
        }
        info!("Session channel closed - exiting event loop");
    }

    async fn handle_event(self: &Arc<Self>, event: SessionEvent) {
        match event {
            SessionEvent::Logon { session_id }
            | SessionEvent::ConsoleConnect { session_id }
            | SessionEvent::RemoteConnect { session_id } => {
                self.activate_session(session_id).await;
            }
            SessionEvent::Logoff { session_id }
            | SessionEvent::ConsoleDisconnect { session_id }
            | SessionEvent::RemoteDisconnect { session_id } => {
                self.deactivate_session(session_id).await;
            }
        }
    }

    async fn activate_session(self: &Arc<Self>, session_id: u32) {
        let inserted = self.active_sessions.write().await.insert(session_id);
        if !inserted {
            debug!(session_id, "Session already tracked as active");
            return;
        }
        info!(session_id, "Session activated");
        let tool_ids: Vec<String> = self
            .registered_tools
            .read()
            .await
            .keys()
            .cloned()
            .collect();
        for tool_id in tool_ids {
            self.ensure_waiter(tool_id, session_id, true).await;
        }
    }

    async fn deactivate_session(self: &Arc<Self>, session_id: u32) {
        let removed = self.active_sessions.write().await.remove(&session_id);
        if removed {
            info!(session_id, "Session deactivated");
        }
    }

    /// Register a tool for per-session lifecycle management
    /// 
    /// if `new_tool` is false, waits SESSION_STARTUP_DELAY_SECONDS on Windows for AutoRun
    pub async fn register_tool(
        self: &Arc<Self>,
        tool_id: String,
        command_path: String,
        launch_args: Vec<String>,
        new_tool: bool,
    ) {
        let reg = ToolRunInfo {
            command_path,
            launch_args,
        };
        self.registered_tools
            .write()
            .await
            .insert(tool_id.clone(), reg);

        let sids: Vec<u32> = self.active_sessions.read().await.iter().copied().collect();
        info!(tool_id = %tool_id, sessions = ?sids, "Registered tool; ensuring waiters");
        for sid in sids {
            self.ensure_waiter(tool_id.clone(), sid, !new_tool).await;
        }
    }

    async fn ensure_waiter(self: &Arc<Self>, tool_id: String, session_id: u32, wait_for_autorun: bool) {
        let key = (tool_id.clone(), session_id);
        let mut waiters = self.waiters.write().await;
        if waiters.contains(&key) {
            debug!(tool_id = %tool_id, session_id, "Waiter already exists - skipping");
            return;
        }
        waiters.insert(key);
        drop(waiters);

        let active_sessions = self.active_sessions.clone();
        let registered_tools = self.registered_tools.clone();
        let waiters_set = self.waiters.clone();
        tokio::spawn(async move {
            if wait_for_autorun {
                // Wait for AutoRun to kick in
                sleep(Duration::from_secs(SESSION_STARTUP_DELAY_SECONDS)).await;
            }
            waiter_task(tool_id, session_id, active_sessions, registered_tools, waiters_set).await;
        });
    }
}

/// One spawned task per (tool_id, session_id). Runs `find pid → attach OR launch → wait → restart`
/// until either the session is no longer active or the tool is no longer registered
async fn waiter_task(
    tool_id: String,
    session_id: u32,
    active_sessions: Arc<RwLock<HashSet<u32>>>,
    registered_tools: Arc<RwLock<HashMap<String, ToolRunInfo>>>,
    waiters: Arc<RwLock<HashSet<(String, u32)>>>,
) {
    info!(tool_id = %tool_id, session_id, "Per-session process waiter starting");

    loop {
        // Exit if the session is no longer active (LOGOFF removed it)
        if !active_sessions.read().await.contains(&session_id) {
            info!(tool_id = %tool_id, session_id, "Session no longer active - waiter exiting");
            break;
        }
        // Exit if the tool is no longer registered (uninstall removed it)
        let reg = match registered_tools.read().await.get(&tool_id) {
            Some(r) => r.clone(),
            None => {
                info!(tool_id = %tool_id, session_id, "Tool unregistered - waiter exiting");
                break;
            }
        };

        // Attach if already running (e.g. by AutoRun), else launch
        let process_handle: Option<HANDLE> = match find_pid_in_target_session(&reg.command_path, session_id) {
            Some(pid) => {
                info!(tool_id = %tool_id, session_id, pid, "Process already running - attaching waiter");
                unsafe {
                    OpenProcess(
                        PROCESS_SYNCHRONIZE | PROCESS_QUERY_LIMITED_INFORMATION,
                        false,
                        pid,
                    )
                    .map_err(|e| {
                        warn!(tool_id = %tool_id, session_id, pid, error = ?e, "OpenProcess failed")
                    })
                    .ok()
                }
            }
            None => {
                info!(tool_id = %tool_id, session_id, "Process not running - launching");
                match launch_process_in_target_session(&reg.command_path, &reg.launch_args, session_id) {
                    Ok((pid, h)) => {
                        info!(tool_id = %tool_id, session_id, pid, "Process launched in session");
                        Some(h)
                    }
                    Err(e) => {
                        error!(tool_id = %tool_id, session_id, error = %e, "Failed to launch process");
                        None
                    }
                }
            }
        };

        let process_handle = match process_handle {
            Some(h) => h,
            None => {
                sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
                continue;
            }
        };

        // Wait for exit on a blocking thread. The self-checks at the top of the next iteration
        // observe whether we should keep going or exit
        let exit_code = tokio::task::spawn_blocking(move || unsafe {
            let _ = WaitForSingleObject(process_handle, INFINITE);
            let mut code: u32 = 0;
            let _ = GetExitCodeProcess(process_handle, &mut code);
            let _ = CloseHandle(process_handle);
            code
        })
        .await
        .unwrap_or(1);

        warn!(tool_id = %tool_id, session_id, exit_code,
              "Process exited - restarting in {}s (if still applicable)", RETRY_DELAY_SECONDS);
        sleep(Duration::from_secs(RETRY_DELAY_SECONDS)).await;
    }

    waiters.write().await.remove(&(tool_id.clone(), session_id));
    info!(tool_id = %tool_id, session_id, "Per-session process waiter exited");
}

pub(crate) fn enumerate_active_user_sessions() -> Vec<u32> {
    let mut result = Vec::new();
    unsafe {
        let mut pp_session_info: *mut WTS_SESSION_INFOW = std::ptr::null_mut();
        let mut count: u32 = 0;

        if WTSEnumerateSessionsW(
            WTS_CURRENT_SERVER_HANDLE,
            0,
            1,
            &mut pp_session_info,
            &mut count,
        )
        .is_err()
        {
            error!("WTSEnumerateSessionsW failed");
            return result;
        }

        let sessions = std::slice::from_raw_parts(pp_session_info, count as usize);
        for session in sessions {
            if session.State != WTSActive {
                continue;
            }
            if session.SessionId == 0 {
                continue;
            }

            let name = if session.pWinStationName.is_null() {
                String::new()
            } else {
                String::from_utf16_lossy(std::slice::from_raw_parts(
                    session.pWinStationName.0,
                    wcslen(session.pWinStationName.0),
                ))
            };
            if name.to_lowercase().contains("listen") {
                continue;
            }

            result.push(session.SessionId);
        }

        WTSFreeMemory(pp_session_info as _);
    }
    result
}

pub(crate) fn find_pid_in_target_session(exe_path: &str, target_session_id: u32) -> Option<u32> {
    use std::path::Path;

    let target = Path::new(exe_path);
    let target_canonical = std::fs::canonicalize(target).ok();
    let target_filename = target
        .file_name()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase());

    unsafe {
        let mut pp_process_info: *mut WTS_PROCESS_INFOW = std::ptr::null_mut();
        let mut count: u32 = 0;
        if WTSEnumerateProcessesW(
            WTS_CURRENT_SERVER_HANDLE,
            0,
            1,
            &mut pp_process_info,
            &mut count,
        )
        .is_err()
        {
            warn!("WTSEnumerateProcessesW failed");
            return None;
        }

        let processes = std::slice::from_raw_parts(pp_process_info, count as usize);
        let mut found_pid: Option<u32> = None;

        for proc in processes {
            if proc.ProcessId == 0 {
                continue;
            }
            if proc.SessionId != target_session_id {
                continue;
            }

            let proc_name = if proc.pProcessName.is_null() {
                String::new()
            } else {
                String::from_utf16_lossy(std::slice::from_raw_parts(
                    proc.pProcessName.0,
                    wcslen(proc.pProcessName.0),
                ))
            };
            if let Some(ref tname) = target_filename {
                if proc_name.to_lowercase() != *tname {
                    continue;
                }
            }

            // Confirm by full image path
            let h = match OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, proc.ProcessId) {
                Ok(h) => h,
                Err(_) => continue,
            };

            let mut buf: [u16; 1024] = [0; 1024];
            let mut size: u32 = buf.len() as u32;
            let qok = QueryFullProcessImageNameW(
                h,
                PROCESS_NAME_FORMAT(0), // PROCESS_NAME_WIN32
                PWSTR(buf.as_mut_ptr()),
                &mut size,
            )
            .is_ok();
            let _ = CloseHandle(h);
            if !qok {
                continue;
            }

            let full_path = String::from_utf16_lossy(&buf[..size as usize]);
            let matches = match (
                target_canonical.as_ref(),
                std::fs::canonicalize(&full_path).ok(),
            ) {
                (Some(a), Some(b)) => *a == b,
                _ => full_path.to_lowercase() == exe_path.to_lowercase(),
            };
            if matches {
                found_pid = Some(proc.ProcessId);
                break;
            }
        }

        WTSFreeMemory(pp_process_info as _);
        found_pid
    }
}
