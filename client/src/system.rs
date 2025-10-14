use anyhow::Result;
use serde::Serialize;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use sysinfo::{CpuRefreshKind, MemoryRefreshKind, RefreshKind, System};

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

        Ok(SystemMetrics {
            timestamp: SystemTime::now().duration_since(UNIX_EPOCH)?.as_secs(),
            cpu_usage,
            memory_total,
            memory_used,
            disk_total,
            disk_used,
            uptime: 0, // TODO: remove as deprecated class
        })
    }
}
