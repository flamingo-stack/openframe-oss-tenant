use std::path::PathBuf;

#[cfg(windows)]
pub fn find_powershell_path() -> Option<PathBuf> {
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
