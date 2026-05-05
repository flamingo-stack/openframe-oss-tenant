use anyhow::Result;
use clap::{Parser, Subcommand};
use openframe_updater::platform::permissions::PermissionUtils;
use openframe_updater::service::UpdaterService;
use std::process;
use tokio::runtime::Runtime;
use tracing::{error, info};

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

fn init_logging() {
    let subscriber = tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .finish();

    tracing::subscriber::set_global_default(subscriber)
        .expect("Failed to set tracing subscriber");
}

fn main() -> Result<()> {
    ensure_admin_privileges();
    init_logging();

    info!(
        "OpenFrame Client Updater v{}",
        openframe_updater::config::updater_config::UPDATER_VERSION
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
