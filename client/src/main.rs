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
}

fn main() -> Result<()> {
    // Initialize logging first
    if let Err(e) = openframe::logging::init(None, None) {
        eprintln!("Failed to initialize logging: {}", e);
        process::exit(1);
    }

    let cli = Cli::parse();
    let rt = Runtime::new()?;

    match cli.command {
        Some(Commands::Install) => {
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
        None => {
            // Run as service by default
            if let Err(e) = rt.block_on(Service::run()) {
                error!("Service failed: {}", e);
                process::exit(1);
            }
        }
    }

    Ok(())
}
