use anyhow::Result;
use clap::{Parser, Subcommand};
use openframe_updater::platform::directories::DirectoryManager;
use openframe_updater::platform::permissions::PermissionUtils;
use openframe_updater::service::UpdaterService;
use std::path::PathBuf;
use std::process;
use tokio::runtime::Runtime;
use tracing::{error, info};
use tracing_appender::non_blocking::WorkerGuard;
use tracing_subscriber::layer::SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

const TOOL_AGENT_ID: &str = "openframe-client-updater";

#[cfg(unix)]
fn ensure_admin_privileges() {
    if unsafe { libc::geteuid() } != 0 {
        eprintln!("Please run with administrator/root privileges");
        process::exit(1);
    }
}

#[cfg(windows)]
fn ensure_admin_privileges() {
    if !PermissionUtils::is_admin() {
        eprintln!("Please run with administrator privileges");
        process::exit(1);
    }
}

#[derive(Parser)]
#[command(author, version, about = "OpenFrame Client Updater Service")]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Install the updater as an OS service (main client must be installed first)
    Install,
    /// Uninstall the updater service
    Uninstall,
    /// Run the updater directly (foreground / dev mode)
    Run,
    /// Run as a service (called by the OS service manager)
    #[command(hide = true)]
    RunAsService,
}

/// Resolves the log file path:
/// {app_support_dir}/openframe-client-updater/openframe-client-updater.log
/// This mirrors the mesh pattern: {app_support_dir}/meshcentral-agent/meshcentral-agent.log
fn log_file_path(dir_manager: &DirectoryManager) -> PathBuf {
    dir_manager
        .app_support_dir()
        .join(TOOL_AGENT_ID)
        .join(format!("{}.log", TOOL_AGENT_ID))
}

/// Initialises tracing with two layers:
///   - stdout  (compact, for service manager capture)
///   - file    (non-blocking, same path openframe-client will tail)
///
/// Returns the `WorkerGuard` — drop it only when the process exits.
fn init_logging(dir_manager: &DirectoryManager) -> WorkerGuard {
    let log_path = log_file_path(dir_manager);

    // Ensure the tool folder exists before opening the file.
    if let Some(parent) = log_path.parent() {
        if let Err(e) = std::fs::create_dir_all(parent) {
            eprintln!("Failed to create log directory {}: {}", parent.display(), e);
        }
    }

    let file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
        .unwrap_or_else(|e| {
            eprintln!("Failed to open log file {}: {}", log_path.display(), e);
            process::exit(1);
        });

    let (file_writer, guard) = tracing_appender::non_blocking::NonBlockingBuilder::default()
        .lossy(false)
        .thread_name("updater-log-writer")
        .finish(file);

    let env_filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"));

    let stdout_layer = tracing_subscriber::fmt::layer()
        .with_target(true)
        .with_level(true)
        .compact()
        .with_ansi(false);

    let file_layer = tracing_subscriber::fmt::layer()
        .with_target(true)
        .with_level(true)
        .compact()
        .with_ansi(false)
        .with_writer(file_writer);

    tracing_subscriber::registry()
        .with(env_filter)
        .with(stdout_layer)
        .with(file_layer)
        .init();

    guard
}

fn main() -> Result<()> {
    ensure_admin_privileges();

    let dir_manager = if std::env::var("OPENFRAME_DEV_MODE").is_ok() {
        DirectoryManager::for_development()
    } else {
        DirectoryManager::new()
    };

    // Guard must be held for the entire process lifetime — dropping it flushes
    // and closes the file writer thread.
    let _log_guard = init_logging(&dir_manager);

    info!(
        "OpenFrame Client Updater v{}",
        openframe_updater::config::updater_config::UPDATER_VERSION
    );
    info!(
        "Log file: {}",
        log_file_path(&dir_manager).display()
    );

    let cli = Cli::parse();
    let rt = Runtime::new()?;

    match cli.command {
        Some(Commands::Install) => {
            if !PermissionUtils::is_admin() {
                error!("Admin privileges required for installation");
                process::exit(1);
            }
            rt.block_on(async {
                match UpdaterService::install().await {
                    Ok(_) => {
                        info!("OpenFrame Client Updater installed successfully");
                        process::exit(0);
                    }
                    Err(e) => {
                        error!("Installation failed: {:#}", e);
                        process::exit(1);
                    }
                }
            });
        }

        Some(Commands::Uninstall) => {
            if !PermissionUtils::is_admin() {
                error!("Admin privileges required for uninstallation");
                process::exit(1);
            }
            rt.block_on(async {
                match UpdaterService::uninstall().await {
                    Ok(_) => {
                        info!("OpenFrame Client Updater uninstalled successfully");
                        process::exit(0);
                    }
                    Err(e) => {
                        error!("Uninstallation failed: {:#}", e);
                        process::exit(1);
                    }
                }
            });
        }

        Some(Commands::Run) => {
            info!("Running in foreground mode");
            if let Err(e) = rt.block_on(UpdaterService::run()) {
                error!("Updater failed: {:#}", e);
                process::exit(1);
            }
        }

        Some(Commands::RunAsService) => {
            info!("Starting as OS service");
            if let Err(e) = UpdaterService::run_as_service() {
                error!("Service failed: {:#}", e);
                process::exit(1);
            }
        }

        None => {
            info!("No command specified, running as service (legacy mode)");
            if let Err(e) = rt.block_on(UpdaterService::run()) {
                error!("Updater failed: {:#}", e);
                process::exit(1);
            }
        }
    }

    info!("OpenFrame Client Updater shutting down");
    Ok(())
}
