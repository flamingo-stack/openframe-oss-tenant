//! Windows file lock detection using Restart Manager API.

#[cfg(target_os = "windows")]
use std::ffi::OsStr;
#[cfg(target_os = "windows")]
use std::os::windows::ffi::OsStrExt;
#[cfg(target_os = "windows")]
use windows::core::{PCWSTR, PWSTR};
#[cfg(target_os = "windows")]
use windows::Win32::Foundation::FILETIME;
#[cfg(target_os = "windows")]
use windows::Win32::System::RestartManager::{
    RmEndSession, RmGetList, RmRegisterResources, RmStartSession, RM_PROCESS_INFO,
    RM_UNIQUE_PROCESS,
};

#[cfg(target_os = "windows")]
#[derive(Debug, Clone)]
pub struct LockingProcess {
    pub pid: u32,
    pub name: String,
}

#[cfg(target_os = "windows")]
impl std::fmt::Display for LockingProcess {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{} (PID: {})", self.name, self.pid)
    }
}

/// Returns processes that have the file open.
#[cfg(target_os = "windows")]
pub fn get_locking_processes(file_path: &str) -> Result<Vec<LockingProcess>, String> {
    unsafe {
        let mut session_handle: u32 = 0;
        let mut session_key = [0u16; 33]; // CCH_RM_SESSION_KEY + 1

        RmStartSession(&mut session_handle, 0, PWSTR(session_key.as_mut_ptr()))
            .map_err(|e| format!("RmStartSession failed: {:?}", e))?;

        // RAII guard for session cleanup
        struct SessionGuard(u32);
        impl Drop for SessionGuard {
            fn drop(&mut self) {
                unsafe {
                    let _ = RmEndSession(self.0);
                }
            }
        }
        let _guard = SessionGuard(session_handle);

        let wide_path: Vec<u16> = OsStr::new(file_path)
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        let file_ptr = PCWSTR(wide_path.as_ptr());

        RmRegisterResources(session_handle, Some(&[file_ptr]), None, None)
            .map_err(|e| format!("RmRegisterResources failed: {:?}", e))?;

        let mut needed: u32 = 0;
        let mut count: u32 = 0;
        let mut reboot_reason: u32 = 0;

        // First call to get count (ERROR_MORE_DATA = 234 is expected)
        let first_result = RmGetList(
            session_handle,
            &mut needed,
            &mut count,
            None,
            &mut reboot_reason,
        );

        if let Err(ref e) = first_result {
            if e.code().0 as u32 != 234 {
                return Err(format!("RmGetList (count) failed: {:?}", e));
            }
        }

        if needed == 0 {
            return Ok(vec![]);
        }

        let mut processes: Vec<RM_PROCESS_INFO> = vec![
            RM_PROCESS_INFO {
                Process: RM_UNIQUE_PROCESS {
                    dwProcessId: 0,
                    ProcessStartTime: FILETIME {
                        dwLowDateTime: 0,
                        dwHighDateTime: 0,
                    },
                },
                strAppName: [0; 256],
                strServiceShortName: [0; 64],
                ApplicationType: Default::default(),
                AppStatus: 0,
                TSSessionId: 0,
                bRestartable: Default::default(),
            };
            needed as usize
        ];
        count = needed;

        RmGetList(
            session_handle,
            &mut needed,
            &mut count,
            Some(processes.as_mut_ptr()),
            &mut reboot_reason,
        )
        .map_err(|e| format!("RmGetList (data) failed: {:?}", e))?;

        let locking: Vec<LockingProcess> = processes
            .iter()
            .take(count as usize)
            .map(|p| {
                let name = String::from_utf16_lossy(&p.strAppName)
                    .trim_end_matches('\0')
                    .to_string();
                LockingProcess {
                    pid: p.Process.dwProcessId,
                    name,
                }
            })
            .collect();

        Ok(locking)
    }
}

#[cfg(target_os = "windows")]
pub fn format_locking_processes(processes: &[LockingProcess]) -> String {
    if processes.is_empty() {
        return String::from("No processes detected");
    }
    processes
        .iter()
        .map(|p| format!("{} (PID: {})", p.name, p.pid))
        .collect::<Vec<_>>()
        .join(", ")
}

#[cfg(target_os = "windows")]
pub fn is_file_in_use_error(error: &std::io::Error) -> bool {
    error.raw_os_error() == Some(32) // ERROR_SHARING_VIOLATION
}

/// Logs which processes are locking a file if error is "file in use". Returns true if it was.
#[cfg(target_os = "windows")]
pub fn log_file_lock_info(error: &std::io::Error, file_path: &str, operation: &str) -> bool {
    use tracing::error;

    if !is_file_in_use_error(error) {
        return false;
    }

    match get_locking_processes(file_path) {
        Ok(processes) if !processes.is_empty() => {
            error!(
                "Failed to {}: file '{}' is locked by: {}",
                operation,
                file_path,
                format_locking_processes(&processes)
            );
        }
        Ok(_) => {
            error!(
                "Failed to {}: file '{}' is locked, but could not identify locking process",
                operation, file_path
            );
        }
        Err(lock_err) => {
            error!(
                "Failed to {}: file '{}' is locked, failed to query locking processes: {}",
                operation, file_path, lock_err
            );
        }
    }

    true
}
