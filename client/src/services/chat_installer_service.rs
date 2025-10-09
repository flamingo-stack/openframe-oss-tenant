use std::path::{Path, PathBuf};
use std::process::Command;
use anyhow::{Context, Result};
use tracing::{debug, error, info, warn};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

/// Service responsible for installing and managing the chat application
pub struct ChatInstallerService {
    install_dir: PathBuf,
    app_name: String,
}

impl ChatInstallerService {
    /// Creates a new ChatInstallerService instance
    pub fn new() -> Result<Self> {
        let install_dir = Self::get_install_directory()?;
        let app_name = if cfg!(target_os = "windows") {
            "openframe-chat.exe".to_string()
        } else if cfg!(target_os = "macos") {
            "OpenFrame Chat.app".to_string()
        } else {
            "openframe-chat".to_string()
        };

        Ok(Self {
            install_dir,
            app_name,
        })
    }

    /// Get the installation directory based on the platform
    fn get_install_directory() -> Result<PathBuf> {
        #[cfg(target_os = "windows")]
        {
            let program_files = std::env::var("ProgramFiles")
                .unwrap_or_else(|_| "C:\\Program Files".to_string());
            Ok(PathBuf::from(program_files).join("OpenFrame").join("Chat"))
        }

        #[cfg(target_os = "macos")]
        {
            Ok(PathBuf::from("/Applications"))
        }

        #[cfg(target_os = "linux")]
        {
            Ok(PathBuf::from("/opt/openframe/chat"))
        }
    }

    /// Get the path to the bundled chat application
    fn get_bundled_app_path() -> Result<PathBuf> {
        // Try multiple potential locations for the Tauri chat client
        let potential_locations = vec![
            // Development mode: relative to workspace root
            std::env::current_dir()
                .ok()
                .map(|p| p.join("client").join("chat-client").join("src-tauri").join("target").join("release").join("bundle")),
            // Development mode: relative to client directory
            std::env::current_dir()
                .ok()
                .map(|p| p.join("chat-client").join("src-tauri").join("target").join("release").join("bundle")),
            // Production mode: next to executable
            std::env::current_exe()
                .ok()
                .and_then(|exe| exe.parent().map(|p| p.join("chat-client").join("bundle"))),
            // Production mode: in resources directory
            std::env::current_exe()
                .ok()
                .and_then(|exe| exe.parent().and_then(|p| p.parent()).map(|p| p.join("Resources").join("chat-client"))),
        ];

        #[cfg(target_os = "windows")]
        let app_relative_path = PathBuf::from("windows").join("openframe-chat.exe");
        
        #[cfg(target_os = "macos")]
        let app_relative_path = PathBuf::from("macos").join("OpenFrame Chat.app");
        
        #[cfg(target_os = "linux")]
        let app_relative_path = PathBuf::from("linux").join("openframe-chat");

        // Try each location
        for base_location in potential_locations.iter().flatten() {
            let app_path = base_location.join(&app_relative_path);
            if app_path.exists() {
                debug!("Found bundled chat application at: {:?}", app_path);
                return Ok(app_path);
            }
        }

        // If not found, provide helpful error message
        let searched_paths: Vec<String> = potential_locations
            .iter()
            .flatten()
            .map(|p| p.join(&app_relative_path).display().to_string())
            .collect();

        anyhow::bail!(
            "Bundled chat application not found. Searched locations:\n{}",
            searched_paths.join("\n")
        );
    }

    /// Check if the chat application is already installed
    pub fn is_installed(&self) -> bool {
        let app_path = self.install_dir.join(&self.app_name);
        app_path.exists()
    }

    /// Install the chat application
    pub fn install(&self) -> Result<()> {
        info!("Starting chat application installation");

        if self.is_installed() {
            warn!("Chat application is already installed");
            return Ok(());
        }

        let bundled_app = Self::get_bundled_app_path()
            .context("Failed to get bundled app path")?;

        if !bundled_app.exists() {
            anyhow::bail!("Bundled chat application not found at: {:?}", bundled_app);
        }

        // Create installation directory
        std::fs::create_dir_all(&self.install_dir)
            .context("Failed to create installation directory")?;

        debug!("Copying chat application from {:?} to {:?}", bundled_app, self.install_dir);

        #[cfg(target_os = "windows")]
        {
            self.install_windows(&bundled_app)?;
        }

        #[cfg(target_os = "macos")]
        {
            self.install_macos(&bundled_app)?;
        }

        #[cfg(target_os = "linux")]
        {
            self.install_linux(&bundled_app)?;
        }

        info!("Chat application installed successfully");
        Ok(())
    }

    #[cfg(target_os = "windows")]
    fn install_windows(&self, bundled_app: &Path) -> Result<()> {
        // Copy the executable
        let dest = self.install_dir.join(&self.app_name);
        std::fs::copy(bundled_app, &dest)
            .context("Failed to copy chat application")?;

        // Copy any additional resources
        if let Some(parent) = bundled_app.parent() {
            for entry in std::fs::read_dir(parent)? {
                let entry = entry?;
                let path = entry.path();
                if path.is_file() && path != bundled_app {
                    if let Some(file_name) = path.file_name() {
                        let dest_file = self.install_dir.join(file_name);
                        std::fs::copy(&path, &dest_file)
                            .context(format!("Failed to copy resource: {:?}", file_name))?;
                    }
                }
            }
        }

        Ok(())
    }

    #[cfg(target_os = "macos")]
    fn install_macos(&self, bundled_app: &Path) -> Result<()> {
        // Use ditto to copy the .app bundle
        let dest = self.install_dir.join(&self.app_name);
        
        let status = Command::new("ditto")
            .arg(bundled_app)
            .arg(&dest)
            .status()
            .context("Failed to execute ditto command")?;

        if !status.success() {
            anyhow::bail!("Failed to copy chat application bundle");
        }

        // Set executable permissions
        let exe_path = dest.join("Contents").join("MacOS").join("openframe-chat");
        if exe_path.exists() {
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let mut perms = std::fs::metadata(&exe_path)?.permissions();
                perms.set_mode(0o755);
                std::fs::set_permissions(&exe_path, perms)?;
            }
        }

        Ok(())
    }

    #[cfg(target_os = "linux")]
    fn install_linux(&self, bundled_app: &Path) -> Result<()> {
        // Copy the executable
        let dest = self.install_dir.join(&self.app_name);
        std::fs::copy(bundled_app, &dest)
            .context("Failed to copy chat application")?;

        // Set executable permissions
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = std::fs::metadata(&dest)?.permissions();
            perms.set_mode(0o755);
            std::fs::set_permissions(&dest, perms)?;
        }

        // Copy any additional resources
        if let Some(parent) = bundled_app.parent() {
            for entry in std::fs::read_dir(parent)? {
                let entry = entry?;
                let path = entry.path();
                if path.is_file() && path != bundled_app {
                    if let Some(file_name) = path.file_name() {
                        let dest_file = self.install_dir.join(file_name);
                        std::fs::copy(&path, &dest_file)
                            .context(format!("Failed to copy resource: {:?}", file_name))?;
                    }
                }
            }
        }

        // Create desktop entry
        self.create_desktop_entry()?;

        Ok(())
    }

    #[cfg(target_os = "linux")]
    fn create_desktop_entry(&self) -> Result<()> {
        let desktop_file = format!(
            "[Desktop Entry]\n\
            Type=Application\n\
            Name=OpenFrame Chat\n\
            Exec={}\n\
            Icon=openframe-chat\n\
            Categories=Network;InstantMessaging;\n\
            Terminal=false\n",
            self.install_dir.join(&self.app_name).display()
        );

        let desktop_dir = dirs::data_local_dir()
            .context("Failed to get local data directory")?
            .join("applications");

        std::fs::create_dir_all(&desktop_dir)
            .context("Failed to create desktop directory")?;

        let desktop_file_path = desktop_dir.join("openframe-chat.desktop");
        std::fs::write(desktop_file_path, desktop_file)
            .context("Failed to write desktop entry")?;

        Ok(())
    }

    /// Launch the chat application
    pub fn launch(&self) -> Result<()> {
        self.launch_with_options(false)
    }

    /// Launch the chat application in background (minimized to tray)
    pub fn launch_minimized(&self) -> Result<()> {
        self.launch_with_options(true)
    }

    /// Launch the chat application with options
    fn launch_with_options(&self, minimize_to_tray: bool) -> Result<()> {
        info!("Launching chat application (minimized: {})", minimize_to_tray);

        if !self.is_installed() {
            anyhow::bail!("Chat application is not installed");
        }

        let app_path = self.install_dir.join(&self.app_name);

        #[cfg(target_os = "windows")]
        {
            let mut cmd = Command::new(&app_path);
            cmd.creation_flags(0x00000008); // DETACHED_PROCESS
            
            if minimize_to_tray {
                // Add flag to start minimized to tray
                cmd.arg("--minimized");
            }
            
            // Add openframe-token-path parameter
            cmd.arg("--openframe-token-path");
            cmd.arg("test-path");
            
            // Inherit stdout/stderr to see logs in parent process
            cmd.stdout(std::process::Stdio::inherit());
            cmd.stderr(std::process::Stdio::inherit());
            
            cmd.spawn()
                .context("Failed to launch chat application")?;
        }

        #[cfg(target_os = "macos")]
        {
            // On macOS, we need to run the executable directly to inherit stdout/stderr
            // Using "open" command doesn't allow stdout/stderr inheritance
            let executable_path = app_path.join("Contents").join("MacOS").join("openframe-chat");
            
            let mut cmd = Command::new(&executable_path);
            
            if minimize_to_tray {
                // Add flag to start minimized to tray (app should handle this)
                cmd.arg("--minimized");
            }
            
            // Add openframe-token-path parameter
            cmd.arg("--openframe-token-path");
            cmd.arg("test-path");
            
            // Inherit stdout/stderr to see logs in parent process
            cmd.stdout(std::process::Stdio::inherit());
            cmd.stderr(std::process::Stdio::inherit());
            
            info!("Launching chat executable with token path: {:?}", executable_path);
            
            cmd.spawn()
                .context("Failed to launch chat application")?;
        }

        #[cfg(target_os = "linux")]
        {
            let mut cmd = Command::new(&app_path);
            
            if minimize_to_tray {
                // Add flag to start minimized to tray
                cmd.arg("--minimized");
            }
            
            // Add openframe-token-path parameter
            cmd.arg("--openframe-token-path");
            cmd.arg("test-path");
            
            // Inherit stdout/stderr to see logs in parent process
            cmd.stdout(std::process::Stdio::inherit());
            cmd.stderr(std::process::Stdio::inherit());
            
            cmd.spawn()
                .context("Failed to launch chat application")?;
        }

        if minimize_to_tray {
            info!("Chat application launched in background (minimized to tray)");
        } else {
            info!("Chat application launched successfully");
        }
        Ok(())
    }

    /// Uninstall the chat application
    pub fn uninstall(&self) -> Result<()> {
        info!("Uninstalling chat application");

        if !self.is_installed() {
            warn!("Chat application is not installed");
            return Ok(());
        }

        let app_path = self.install_dir.join(&self.app_name);

        #[cfg(target_os = "macos")]
        {
            // Remove the entire .app bundle
            std::fs::remove_dir_all(&app_path)
                .context("Failed to remove chat application bundle")?;
        }

        #[cfg(not(target_os = "macos"))]
        {
            // Remove the executable and resources
            if app_path.is_dir() {
                std::fs::remove_dir_all(&app_path)
                    .context("Failed to remove chat application directory")?;
            } else {
                std::fs::remove_file(&app_path)
                    .context("Failed to remove chat application")?;
            }

            // Remove additional resources
            if self.install_dir.exists() {
                for entry in std::fs::read_dir(&self.install_dir)? {
                    let entry = entry?;
                    let path = entry.path();
                    if path.is_file() {
                        std::fs::remove_file(&path)
                            .context(format!("Failed to remove resource: {:?}", path))?;
                    }
                }

                // Remove the directory if empty
                if std::fs::read_dir(&self.install_dir)?.next().is_none() {
                    std::fs::remove_dir(&self.install_dir)
                        .context("Failed to remove installation directory")?;
                }
            }
        }

        #[cfg(target_os = "linux")]
        {
            // Remove desktop entry
            if let Ok(desktop_dir) = dirs::data_local_dir() {
                let desktop_file = desktop_dir
                    .join("applications")
                    .join("openframe-chat.desktop");
                if desktop_file.exists() {
                    std::fs::remove_file(desktop_file)
                        .context("Failed to remove desktop entry")?;
                }
            }
        }

        info!("Chat application uninstalled successfully");
        Ok(())
    }

    /// Get the installation path of the chat application
    pub fn get_install_path(&self) -> PathBuf {
        self.install_dir.join(&self.app_name)
    }
}

impl Default for ChatInstallerService {
    fn default() -> Self {
        Self::new().expect("Failed to create ChatInstallerService")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_install_directory() {
        let result = ChatInstallerService::get_install_directory();
        assert!(result.is_ok());
        let path = result.unwrap();
        assert!(path.is_absolute());
    }

    #[test]
    fn test_is_installed() {
        let service = ChatInstallerService::new().unwrap();
        // This will vary based on actual installation state
        let _ = service.is_installed();
    }
}

