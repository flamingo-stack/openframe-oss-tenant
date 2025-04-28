use anyhow::Result;
use clap::{Parser, Subcommand};
use openframe::{service::Service, Client};
use std::process;
use tokio::runtime::Runtime;
use tracing::{error, info};

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Install the OpenFrame client as a system service
    Install,
    /// Uninstall the OpenFrame client service
    Uninstall,
    /// Run the OpenFrame client directly (not as a service)
    Run,
    /// Run as a service (used by service manager)
    #[command(hide = true)] // Hide from help text as this is only for internal use
    RunAsService,
}

fn main() -> Result<()> {
    // Initialize logging first
    if let Err(e) = openframe::logging::init(None, None) {
        eprintln!("Failed to initialize logging: {}", e);
        process::exit(1);
    }

    // Add explicit startup log entry to verify logging is working
    info!("OpenFrame agent starting up");

    let cli = Cli::parse();
    let rt = Runtime::new()?;

    match cli.command {
        Some(Commands::Install) => {
            info!("Running install command");
            rt.block_on(async {
                match Service::install().await {
                    Ok(_) => {
                        info!("OpenFrame client service installed successfully");
                        process::exit(0);
                    }
                    Err(e) => {
                        error!("Failed to install OpenFrame client service: {}", e);
                        process::exit(1);
                    }
                }
            });
        }
        Some(Commands::Uninstall) => {
            info!("Running uninstall command");
            rt.block_on(async {
                match Service::uninstall().await {
                    Ok(_) => {
                        info!("OpenFrame client service uninstalled successfully");
                        process::exit(0);
                    }
                    Err(e) => {
                        error!("Failed to uninstall OpenFrame client service: {}", e);
                        process::exit(1);
                    }
                }
            });
        }
        Some(Commands::Run) => {
            info!("Running in direct mode (without service wrapper)");
            // Run directly without service wrapper
            match Client::new() {
                Ok(client) => {
                    info!("Starting OpenFrame client in direct mode");
                    if let Err(e) = rt.block_on(client.start()) {
                        error!("Client failed: {}", e);
                        process::exit(1);
                    }
                }
                Err(e) => {
                    error!("Failed to initialize client: {}", e);
                    process::exit(1);
                }
            }
        }
        Some(Commands::RunAsService) => {
            info!("Running as service (called by service manager)");
            // This command is used when started by the service manager
            if let Err(e) = rt.block_on(Service::run_as_service()) {
                error!("Service failed: {}", e);
                process::exit(1);
            }
        }
        None => {
            info!("No command specified, running as service (legacy mode)");
            // Run as service by default for backward compatibility
            if let Err(e) = rt.block_on(Service::run_as_service()) {
                error!("Service failed: {}", e);
                process::exit(1);
            }
        }
    }

    // Add explicit shutdown log entry to verify logging is still working
    info!("OpenFrame agent shutting down");

    Ok(())
}
