use anyhow::Result;
use serde::Serialize;
use sysinfo::{System, SystemExt, CpuExt};
use std::time::{SystemTime, UNIX_EPOCH};

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
    sys: System,
}

impl SystemInfo {
    pub fn new() -> Result<Self> {
        Ok(Self {
            sys: System::new_all(),
        })
    }

    pub fn collect_metrics(&self) -> Result<SystemMetrics> {
        self.sys.refresh_all();

        let cpu_usage = self.sys.global_cpu_info().cpu_usage();
        let memory_total = self.sys.total_memory();
        let memory_used = self.sys.used_memory();
        
        // Calculate disk space (total of all disks)
        let mut disk_total = 0;
        let mut disk_used = 0;
        for disk in self.sys.disks() {
            disk_total += disk.total_space();
            disk_used += disk.total_space() - disk.available_space();
        }

        Ok(SystemMetrics {
            timestamp: SystemTime::now()
                .duration_since(UNIX_EPOCH)?
                .as_secs(),
            cpu_usage,
            memory_total,
            memory_used,
            disk_total,
            disk_used,
            uptime: self.sys.uptime(),
        })
    }
} 