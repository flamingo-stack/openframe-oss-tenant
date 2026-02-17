use std::path::PathBuf;
use std::process::{Command, Stdio};

/// Get PowerShell path - tries PATH first, then known locations
/// Returns ready-to-use path string
#[cfg(windows)]
pub fn get_powershell_path() -> Result<String, &'static str> {
    // Try powershell.exe from PATH first
    if let Ok(mut child) = Command::new("powershell.exe")
        .arg("-NoProfile")
        .arg("-Command")
        .arg("exit 0")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
    {
        let _ = child.wait();
        return Ok("powershell.exe".to_string());
    }

    // Fallback to known locations
    find_powershell_path()
        .map(|p| p.to_string_lossy().to_string())
        .ok_or("PowerShell not found")
}

/// Find an existing PowerShell path on the system
#[cfg(windows)]
fn find_powershell_path() -> Option<PathBuf> {
    let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());
    let program_files = std::env::var("ProgramFiles").unwrap_or_else(|_| "C:\\Program Files".to_string());
    let program_files_x86 = std::env::var("ProgramFiles(x86)").unwrap_or_else(|_| "C:\\Program Files (x86)".to_string());

    let paths = [
        // Windows PowerShell
        format!("{}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", system_root),
        format!("{}\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe", system_root),
        "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe".to_string(),
        "C:\\Windows\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe".to_string(),
        // PowerShell 7
        format!("{}\\PowerShell\\7\\pwsh.exe", program_files),
        format!("{}\\PowerShell\\7\\pwsh.exe", program_files_x86),
    ];

    for path in paths {
        let p = PathBuf::from(&path);
        if p.exists() {
            return Some(p);
        }
    }

    None
}
