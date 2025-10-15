use anyhow::Result;
use openframe::platform::permissions::{Capability, PermissionUtils};
use std::process;
use tracing::{info, warn};

fn main() -> Result<()> {
    // Initialize basic logging
    openframe::logging::init(None, None)?;

    // Check if we're running with admin/root privileges
    let is_admin = PermissionUtils::is_admin();
    println!("Running with admin/root privileges: {}", is_admin);

    // Check all capabilities
    println!("\nCapability checks:");
    println!(
        "- Manage services: {}",
        PermissionUtils::has_capability(Capability::ManageServices)
    );
    println!(
        "- Write system directories: {}",
        PermissionUtils::has_capability(Capability::WriteSystemDirectories)
    );
    println!(
        "- Read system logs: {}",
        PermissionUtils::has_capability(Capability::ReadSystemLogs)
    );
    println!(
        "- Write system logs: {}",
        PermissionUtils::has_capability(Capability::WriteSystemLogs)
    );

    // Test running an elevated command
    if !is_admin {
        println!("\nNot running as admin/root. Will try to execute a command with elevation.");
        println!("You may be prompted for credentials.");

        // On macOS/Linux, we'll try to run a harmless command with sudo
        // On Windows, this will trigger a UAC prompt
        match PermissionUtils::run_as_admin("echo", &["Hello from elevated privileges!"]) {
            Ok(_) => println!("Successfully executed elevated command"),
            Err(e) => println!("Failed to execute elevated command: {}", e),
        }
    } else {
        // If we're already running as admin, we can try executing a privileged system command
        println!("\nAlready running as admin/root. Will execute a system command.");

        #[cfg(target_os = "macos")]
        {
            // On macOS, let's try to get the system profiler info (requires admin)
            // Using run_as_admin since run_command is not accessible from the binary
            match PermissionUtils::run_as_admin(
                "system_profiler",
                &["SPSoftwareDataType", "-detailLevel", "mini"],
            ) {
                Ok(_) => println!("Successfully executed system command"),
                Err(e) => println!("Failed to execute system command: {}", e),
            }
        }

        #[cfg(target_os = "linux")]
        {
            // On Linux, let's try to get basic system info
            // Using run_as_admin since run_command is not accessible from the binary
            match PermissionUtils::run_as_admin("lsb_release", &["-a"]) {
                Ok(_) => println!("Successfully executed system command"),
                Err(e) => println!("Failed to execute system command: {}", e),
            }
        }

        #[cfg(target_os = "windows")]
        {
            // On Windows, try to get system info
            // Using run_as_admin since run_command is not accessible from the binary
            match PermissionUtils::run_as_admin("systeminfo", &["/fo", "list", "/nh"]) {
                Ok(_) => println!("Successfully executed system command"),
                Err(e) => println!("Failed to execute system command: {}", e),
            }
        }
    }

    println!("\nTest completed. Press Enter to exit.");
    let mut buffer = String::new();
    let _ = std::io::stdin().read_line(&mut buffer);

    Ok(())
}
