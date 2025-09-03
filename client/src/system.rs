use anyhow::Result;
use serde::Serialize;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, RefreshKind, System};

// Add Windows-specific imports for uptime calculation
#[cfg(target_os = "windows")]
use winapi::um::sysinfoapi::GetTickCount64;

#[derive(Debug, Serialize)]
pub struct SystemMetrics {
    timestamp: u64,
    cpu_usage: f32,
    memory_total: u64,
    memory_used: u64,
    disk_total: u64,
    disk_used: u64,
    uptime: u64,
}

pub struct SystemInfo {
    sys: Mutex<System>,
}

impl SystemInfo {
    pub fn new() -> Result<Self> {
        let sys = System::new_with_specifics(
            RefreshKind::new()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory(MemoryRefreshKind::everything()),
        );
        Ok(Self {
            sys: Mutex::new(sys),
        })
    }

    pub fn collect_metrics(&self) -> Result<SystemMetrics> {
        let mut sys = self.sys.lock().unwrap();
        sys.refresh_cpu();
        sys.refresh_memory();

        let cpu_usage = sys.global_cpu_info().cpu_usage();
        let memory_total = sys.total_memory();
        let memory_used = sys.used_memory();

        // For disk space, we'll use sys-info
        let mut disk_total = 0;
        let mut disk_used = 0;
        if let Ok(space) = sys_info::disk_info() {
            disk_total = space.total as u64 * 1024; // Convert to bytes
            disk_used = (space.total - space.free) as u64 * 1024;
        }

        // Fixed uptime calculation with platform-specific implementations
        let uptime = get_system_uptime()?;

        Ok(SystemMetrics {
            timestamp: SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs(),
            cpu_usage,
            memory_total,
            memory_used,
            disk_total,
            disk_used,
            uptime,
        })
    }
}

/// Get system uptime with platform-specific implementations
fn get_system_uptime() -> Result<u64> {
    #[cfg(target_os = "windows")]
    {
        // On Windows, use GetTickCount64 to get uptime in milliseconds
        unsafe {
            let uptime_ms = GetTickCount64();
            Ok(uptime_ms / 1000) // Convert milliseconds to seconds
        }
    }
    
    #[cfg(not(target_os = "windows"))]
    {
        // On Unix systems, try to get boot time
        match sys_info::boottime() {
            Ok(boot_time) => Ok(boot_time.tv_sec as u64),
            Err(_) => {
                // Fallback: try to read from /proc/uptime or use current time as approximation
                get_uptime_fallback()
            }
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn get_uptime_fallback() -> Result<u64> {
    use std::fs;
    
    // Try to read /proc/uptime on Linux
    if let Ok(uptime_str) = fs::read_to_string("/proc/uptime") {
        if let Some(uptime_part) = uptime_str.split_whitespace().next() {
            if let Ok(uptime_f64) = uptime_part.parse::<f64>() {
                return Ok(uptime_f64 as u64);
            }
        }
    }
    
    // Fallback: return 0 or attempt to calculate based on current time
    // This isn't ideal but prevents compilation errors
    Ok(0)
}