use anyhow::{Context, Result};
use std::path::Path;
use tracing::{info, warn};

use crate::platform::DirectoryManager;
use crate::service_adapter::{CrossPlatformServiceManager, ServiceConfig};
use crate::services::{
    InitialConfigurationService, InstalledToolsService, ToolCommandParamsResolver,
    ToolKillService, ToolUninstallService,
};

const SERVICE_NAME: &str = "client";
const DISPLAY_NAME: &str = "OpenFrame Client Service";
const DESCRIPTION: &str = "OpenFrame client service for remote management and monitoring";

/// Remove a directory with retry logic for locked files
pub async fn remove_directory_with_retry(path: &Path, max_retries: u32) -> Result<()> {
    if !path.exists() {
        info!("Directory does not exist: {}", path.display());
        return Ok(());
    }

    for attempt in 1..=max_retries {
        if !path.exists() {
            info!("Directory no longer exists: {}", path.display());
            return Ok(());
        }

        if attempt == max_retries - 1 {
            info!("Attempting to unlock files in directory: {}", path.display());
            if let Err(e) = unlock_directory_files(path).await {
                warn!("Failed to unlock files: {}", e);
            }
        }

        match std::fs::remove_dir_all(path) {
            Ok(_) => {
                info!("Successfully removed directory: {}", path.display());
                return Ok(());
            }
            Err(e) => {
                if attempt < max_retries {
                    let wait_secs = std::cmp::min(2_u64.pow(attempt - 1), 8); // Exponential backoff, max 8 seconds
                    warn!(
                        "Failed to remove directory {} (attempt {}/{}): {}. Retrying in {} seconds...",
                        path.display(),
                        attempt,
                        max_retries,
                        e,
                        wait_secs
                    );
                    tokio::time::sleep(std::time::Duration::from_secs(wait_secs)).await;
                } else {
                    // Last attempt - try force deletion with system commands
                    warn!(
                        "Standard removal failed after {} attempts for {}. Attempting force deletion...",
                        max_retries,
                        path.display()
                    );

                    match force_remove_directory(path).await {
                        Ok(_) => {
                            info!("Successfully force-removed directory: {}", path.display());
                            return Ok(());
                        }
                        Err(force_err) => {
                            return Err(anyhow::anyhow!(
                                "Failed to remove directory {} after {} attempts. Last error: {}. Force removal error: {}",
                                path.display(),
                                max_retries,
                                e,
                                force_err
                            ));
                        }
                    }
                }
            }
        }
    }

    Ok(())
}

/// Attempt to unlock files in a directory by removing read-only attributes
#[cfg(target_os = "windows")]
async fn unlock_directory_files(path: &Path) -> Result<()> {
    use tokio::process::Command;

    // Use attrib command to remove read-only, system, and hidden attributes recursively
    let output = Command::new("attrib")
        .args(&["-R", "-S", "-H", "/S", "/D"])
        .arg(path)
        .output()
        .await
        .context("Failed to execute attrib command")?;

    if output.status.success() {
        info!("Successfully unlocked files in: {}", path.display());
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(anyhow::anyhow!("attrib command failed: {}", stderr))
    }
}

#[cfg(not(target_os = "windows"))]
async fn unlock_directory_files(path: &Path) -> Result<()> {
    use tokio::process::Command;

    // Use chmod to make everything writable
    let output = Command::new("chmod")
        .args(&["-R", "777"])
        .arg(path)
        .output()
        .await
        .context("Failed to execute chmod command")?;

    if output.status.success() {
        info!("Successfully unlocked files in: {}", path.display());
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(anyhow::anyhow!("chmod command failed: {}", stderr))
    }
}

/// Force remove a directory using system commands
#[cfg(target_os = "windows")]
async fn force_remove_directory(path: &Path) -> Result<()> {
    use tokio::process::Command;

    info!("Attempting force removal using Windows rd command for: {}", path.display());

    // First, try to take ownership and grant permissions
    let takeown_output = Command::new("takeown")
        .args(&["/F", &path.to_string_lossy(), "/R", "/D", "Y"])
        .output()
        .await;

    if let Ok(output) = takeown_output {
        if output.status.success() {
            info!("Successfully took ownership of: {}", path.display());
        } else {
            warn!("Failed to take ownership, continuing anyway...");
        }
    }

    // Grant full permissions
    let icacls_output = Command::new("icacls")
        .args(&[&path.to_string_lossy(), "/grant", "Everyone:F", "/T", "/C", "/Q"])
        .output()
        .await;

    if let Ok(output) = icacls_output {
        if output.status.success() {
            info!("Successfully granted permissions for: {}", path.display());
        } else {
            warn!("Failed to grant permissions, continuing anyway...");
        }
    }

    // Wait for permissions to take effect
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;

    // Use rd (rmdir) command with force and recursive flags
    let output = Command::new("cmd")
        .args(&["/C", "rd", "/S", "/Q"])
        .arg(path)
        .output()
        .await
        .context("Failed to execute rd command")?;

    // Verify directory was removed
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;

    if !path.exists() {
        info!("Force removal successful: {}", path.display());
        Ok(())
    } else if output.status.success() {
        // Command succeeded but directory still exists - might be a timing issue
        warn!("rd command succeeded but directory still exists, waiting and rechecking...");
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;

        if !path.exists() {
            info!("Directory removed after delay: {}", path.display());
            Ok(())
        } else {
            Err(anyhow::anyhow!("Directory still exists after force removal"))
        }
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        Err(anyhow::anyhow!(
            "rd command failed\nstdout: {}\nstderr: {}",
            stdout,
            stderr
        ))
    }
}

#[cfg(not(target_os = "windows"))]
async fn force_remove_directory(path: &Path) -> Result<()> {
    use tokio::process::Command;

    info!("Attempting force removal using rm command for: {}", path.display());

    // Use rm -rf for force removal
    let output = Command::new("rm")
        .args(&["-rf"])
        .arg(path)
        .output()
        .await
        .context("Failed to execute rm command")?;

    // Verify directory was removed
    tokio::time::sleep(std::time::Duration::from_millis(500)).await;

    if !path.exists() {
        info!("Force removal successful: {}", path.display());
        Ok(())
    } else if output.status.success() {
        // Command succeeded but directory still exists - might be a timing issue
        warn!("rm command succeeded but directory still exists, waiting and rechecking...");
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;

        if !path.exists() {
            info!("Directory removed after delay: {}", path.display());
            Ok(())
        } else {
            Err(anyhow::anyhow!("Directory still exists after force removal"))
        }
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(anyhow::anyhow!("rm command failed: {}", stderr))
    }
}

/// Uninstall all integrated tools
pub async fn uninstall_integrated_tools(dir_manager: &DirectoryManager) -> Result<()> {
    // Initialize services needed for tool uninstallation
    let installed_tools_service = InstalledToolsService::new(dir_manager.clone())
        .context("Failed to initialize InstalledToolsService")?;

    let initial_config_service = InitialConfigurationService::new(dir_manager.clone())
        .context("Failed to initialize InitialConfigurationService")?;

    let command_params_resolver =
        ToolCommandParamsResolver::new(dir_manager.clone(), initial_config_service);

    let tool_kill_service = ToolKillService::new();

    let tool_uninstall_service = ToolUninstallService::new(
        installed_tools_service,
        command_params_resolver,
        tool_kill_service,
        dir_manager.clone(),
    );

    // Run tool uninstallation
    tool_uninstall_service
        .uninstall_all()
        .await
        .context("Failed to uninstall integrated tools")?;

    Ok(())
}

/// Windows-specific uninstall implementation
#[cfg(target_os = "windows")]
pub async fn uninstall_windows(
    dir_manager: &DirectoryManager,
    install_path: &Path,
) -> Result<()> {
    info!("========================================");
    info!("OpenFrame Uninstallation");
    info!("========================================");
    info!("");

    info!("Step 1: Stopping and uninstalling Windows service...");
    let exec_path = std::env::current_exe().context("Failed to get current executable path")?;
    let config = ServiceConfig {
        name: SERVICE_NAME.to_string(),
        display_name: DISPLAY_NAME.to_string(),
        description: DESCRIPTION.to_string(),
        exec_path,
        ..ServiceConfig::default()
    };
    let service = CrossPlatformServiceManager::with_config(config);

    match service.uninstall() {
        Ok(_) => info!("Service uninstalled successfully"),
        Err(e) => warn!(
            "Service uninstall warning: {} (may not be installed)",
            e
        ),
    }

    info!("Step 2: Gracefully uninstalling integrated tools...");
    match uninstall_integrated_tools(dir_manager).await {
        Ok(_) => info!("Tools uninstalled successfully"),
        Err(e) => warn!("Tools uninstall warning: {} (continuing with cleanup)", e),
    }

    info!("Step 3: Cleaning up directories and files...");

    if dir_manager.logs_dir().exists()
        && dir_manager.logs_dir() != dir_manager.app_support_dir()
    {
        info!(
            "Cleaning up logs directory: {}",
            dir_manager.logs_dir().display()
        );
        if let Err(e) = remove_directory_with_retry(dir_manager.logs_dir(), 5).await {
            warn!("Failed to remove logs directory: {}", e);
        }
    }

    if dir_manager.app_support_dir().exists() {
        info!(
            "Cleaning up app support directory: {}",
            dir_manager.app_support_dir().display()
        );
        if let Err(e) = remove_directory_with_retry(dir_manager.app_support_dir(), 5).await {
            warn!("Failed to remove app support directory: {}", e);
        }
    }

    // Launch cleanup script to remove binary after process exit
    if install_path.exists() {
        info!("Launching binary cleanup script...");

        let install_path_buf = install_path.to_path_buf();
        let bin_dir = install_path.parent().map(|p| p.to_path_buf());

        use crate::platform::windows_cleanup::execute_binary_cleanup_script;

        match execute_binary_cleanup_script(
            &install_path_buf,
            bin_dir.as_ref(),
        ) {
            Ok(_) => info!("Binary cleanup script launched successfully"),
            Err(e) => warn!("Failed to launch binary cleanup script: {}", e),
        }
    }

    info!("");
    info!("========================================");
    info!("OpenFrame service uninstalled successfully");
    info!("========================================");

    Ok(())
}

/// macOS-specific uninstall implementation
#[cfg(target_os = "macos")]
pub async fn uninstall_macos(dir_manager: &DirectoryManager, install_path: &Path) -> Result<()> {
    info!("========================================");
    info!("OpenFrame Uninstallation");
    info!("========================================");
    info!("");

    info!("Step 1: Stopping and uninstalling macOS service...");
    let exec_path = std::env::current_exe().context("Failed to get current executable path")?;
    let config = ServiceConfig {
        name: SERVICE_NAME.to_string(),
        display_name: DISPLAY_NAME.to_string(),
        description: DESCRIPTION.to_string(),
        exec_path,
        ..ServiceConfig::default()
    };
    let service = CrossPlatformServiceManager::with_config(config);

    match service.uninstall() {
        Ok(_) => info!("Service uninstalled successfully"),
        Err(e) => warn!(
            "Service uninstall warning: {} (may not be installed)",
            e
        ),
    }

    info!("Step 2: Gracefully uninstalling integrated tools...");
    match uninstall_integrated_tools(dir_manager).await {
        Ok(_) => info!("✓ Tools uninstalled successfully"),
        Err(e) => warn!("Tools uninstall warning: {} (continuing with cleanup)", e),
    }

    info!("Step 3: Cleaning up directories and files...");

    // Clean up directories with retry logic
    if dir_manager.logs_dir().exists()
        && dir_manager.logs_dir() != dir_manager.app_support_dir()
    {
        info!(
            "Cleaning up logs directory: {}",
            dir_manager.logs_dir().display()
        );
        if let Err(e) = remove_directory_with_retry(dir_manager.logs_dir(), 5).await {
            warn!("Failed to remove logs directory: {}", e);
        }
    }

    if dir_manager.app_support_dir().exists() {
        info!(
            "Cleaning up app support directory: {}",
            dir_manager.app_support_dir().display()
        );
        if let Err(e) = remove_directory_with_retry(dir_manager.app_support_dir(), 5).await {
            warn!("Failed to remove app support directory: {}", e);
        }
    }

    if install_path.exists() {
        info!("Removing installed binary: {}", install_path.display());

        let mut removed = false;
        for attempt in 1..=3 {
            match std::fs::remove_file(install_path) {
                Ok(_) => {
                    info!("Successfully removed binary");
                    removed = true;
                    break;
                }
                Err(e) => {
                    if attempt < 3 {
                        warn!(
                            "Failed to remove binary (attempt {}/3): {}. Retrying in 1 second...",
                            attempt, e
                        );
                        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
                    } else {
                        warn!("Failed to remove binary after 3 attempts: {}", e);
                    }
                }
            }
        }

        if !removed {
            warn!("Binary could not be removed, may require manual cleanup");
        }
    }

    info!("");
    info!("========================================");
    info!("OpenFrame service uninstalled successfully");
    info!("========================================");

    Ok(())
}

