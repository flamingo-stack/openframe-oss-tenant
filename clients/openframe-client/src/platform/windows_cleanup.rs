use anyhow::{anyhow, Context, Result};
use std::path::PathBuf;
use tracing::info;

#[cfg(windows)]
use super::get_powershell_path;

/// Generate a PowerShell script to cleanup the OpenFrame binary after process exit
///
/// This script will:
/// 1. Wait for the current process to exit
/// 2. Force delete the binary file
/// 3. Remove empty parent directories (bin, then OpenFrame)
/// 4. Remove from system PATH
pub fn generate_binary_cleanup_script(
    install_path: &PathBuf,
    current_pid: u32,
    bin_dir: Option<&PathBuf>,
) -> String {
    let install_path_str = install_path.to_string_lossy().replace("\\", "\\\\");
    let bin_dir_str = bin_dir
        .map(|p| p.to_string_lossy().replace("\\", "\\\\"))
        .unwrap_or_default();

    format!(
        r#"
# OpenFrame Binary Cleanup Script
# This script cleans up the OpenFrame binary after the main process exits

$ErrorActionPreference = "SilentlyContinue"
$ProcessId = {current_pid}
$BinaryPath = "{install_path_str}"
$BinDir = "{bin_dir_str}"

# Wait for main process to exit (max 30 seconds with verification)
$waited = 0
$maxWaitSeconds = 30

while ($waited -lt $maxWaitSeconds) {{
    try {{
        $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
        if ($null -eq $process) {{
            break
        }}
        Start-Sleep -Milliseconds 500
        $waited += 0.5
    }} catch {{
        break
    }}
}}

# Verify process is really gone
if ($waited -ge $maxWaitSeconds) {{
    try {{
        Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }} catch {{
        # Process likely already gone
    }}
}}

# Final verification
try {{
    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($null -ne $process) {{
        exit 1
    }}
}} catch {{
    # Process is gone, which is what we want
}}

# Force delete the binary with retry logic
if (Test-Path $BinaryPath) {{
    $removed = $false
    $maxRetries = 5

    for ($attempt = 1; $attempt -le $maxRetries; $attempt++) {{
        try {{
            Remove-Item -Path $BinaryPath -Force -ErrorAction Stop
            $removed = $true
            break
        }} catch {{
            if ($attempt -lt $maxRetries) {{
                $waitSeconds = [math]::Min([math]::Pow(2, $attempt - 1), 8)
                Start-Sleep -Seconds $waitSeconds
            }}
        }}
    }}

    # If standard removal failed, try with takeown and icacls
    if (-not $removed -and (Test-Path $BinaryPath)) {{
        try {{
            takeown /F $BinaryPath /A 2>&1 | Out-Null
            icacls $BinaryPath /grant Everyone:F /T /C /Q 2>&1 | Out-Null
            Start-Sleep -Milliseconds 500
            Remove-Item -Path $BinaryPath -Force -ErrorAction Stop
            $removed = $true
        }} catch {{
            # Silent fail
        }}
    }}
}}

# Remove empty bin directory with retry
if (($BinDir -ne "") -and (Test-Path $BinDir)) {{
    try {{
        $items = Get-ChildItem $BinDir -ErrorAction SilentlyContinue
        if ($items.Count -eq 0) {{
            $binRemoved = $false

            for ($attempt = 1; $attempt -le 3; $attempt++) {{
                try {{
                    Remove-Item -Path $BinDir -Force -ErrorAction Stop
                    $binRemoved = $true
                    break
                }} catch {{
                    if ($attempt -lt 3) {{
                        Start-Sleep -Seconds 1
                    }}
                }}
            }}

            # Try to remove OpenFrame parent directory if also empty
            if ($binRemoved) {{
                $parentDir = Split-Path -Parent $BinDir
                if (Test-Path $parentDir) {{
                    $items = Get-ChildItem $parentDir -ErrorAction SilentlyContinue
                    if ($items.Count -eq 0) {{
                        for ($attempt = 1; $attempt -le 3; $attempt++) {{
                            try {{
                                Remove-Item -Path $parentDir -Force -ErrorAction Stop
                                break
                            }} catch {{
                                if ($attempt -lt 3) {{
                                    Start-Sleep -Seconds 1
                                }}
                            }}
                        }}
                    }}
                }}
            }}
        }}
    }} catch {{
        # Silent fail
    }}
}}

# Remove from PATH
if ($BinDir -ne "") {{
    try {{
        $regPath = "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Environment"
        $currentPath = (Get-ItemProperty -Path $regPath -Name "Path").Path
        $pathEntries = $currentPath -split ";"
        $newPath = ($pathEntries | Where-Object {{ $_ -ne $BinDir }}) -join ";"

        if ($currentPath -ne $newPath) {{
            Set-ItemProperty -Path $regPath -Name "Path" -Value $newPath -ErrorAction Stop

            # Broadcast environment change
            Add-Type -TypeDefinition @"
                using System;
                using System.Runtime.InteropServices;
                public class Win32 {{
                    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
                    public static extern IntPtr SendMessageTimeout(
                        IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam,
                        uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
                }}
"@
            $HWND_BROADCAST = [IntPtr]0xffff
            $WM_SETTINGCHANGE = 0x1a
            $result = [UIntPtr]::Zero
            [Win32]::SendMessageTimeout($HWND_BROADCAST, $WM_SETTINGCHANGE, [UIntPtr]::Zero, "Environment", 2, 5000, [ref]$result) | Out-Null
        }}
    }} catch {{
        # Silent fail
    }}
}}
exit 0
"#,
        current_pid = current_pid,
        install_path_str = install_path_str,
        bin_dir_str = bin_dir_str
    )
}

/// Create and execute the binary cleanup script
///
/// This will create a temporary PowerShell script and execute it in the background.
/// The script will wait for the current process to exit and then clean up the binary.
pub fn execute_binary_cleanup_script(
    install_path: &PathBuf,
    bin_dir: Option<&PathBuf>,
) -> Result<()> {
    use std::fs;
    use std::io::Write;
    use std::process::Command;

    // Get current process ID
    let current_pid = std::process::id();

    info!("Creating binary cleanup script for PID: {}", current_pid);

    // Generate unique script name
    let script_name = format!("openframe_binary_cleanup_{}.ps1", uuid::Uuid::new_v4());
    let temp_dir = std::env::temp_dir();
    let script_path = temp_dir.join(&script_name);

    info!("Cleanup script path: {}", script_path.display());

    // Generate script content
    let script_content = generate_binary_cleanup_script(install_path, current_pid, bin_dir);

    // Write script to file
    let mut file = fs::File::create(&script_path)
        .context("Failed to create binary cleanup script file")?;

    file.write_all(script_content.as_bytes())
        .context("Failed to write binary cleanup script content")?;

    info!("Starting binary cleanup script in background...");

    // Execute PowerShell script in the background (detached, no window, no output)
    use std::process::Stdio;

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let ps_path = get_powershell_path().map_err(|e| anyhow!(e))?;
        info!("Using PowerShell: {}", ps_path);

        Command::new(&ps_path)
            .args(&[
                "-NoProfile",
                "-WindowStyle",
                "Hidden",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                &script_path.to_string_lossy(),
            ])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .context("Failed to spawn binary cleanup script")?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        Command::new("powershell.exe")
            .args(&[
                "-NoProfile",
                "-WindowStyle",
                "Hidden",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                &script_path.to_string_lossy(),
            ])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .context("Failed to spawn binary cleanup script")?;
    }

    info!("Binary cleanup script started successfully");
    Ok(())
}
