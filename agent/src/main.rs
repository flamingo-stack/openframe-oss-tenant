use anyhow::Result;
use clap::{Parser, Subcommand};
use tracing::{error, info};

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    Install,
    Uninstall,
    Service,
    #[command(arg_required_else_help = true)]
    Run {
        /// Optional log shipping endpoint
        #[arg(long, env = "OPENFRAME_LOG_ENDPOINT")]
        log_endpoint: Option<String>,

        /// Agent ID for log shipping
        #[arg(long, env = "openframe_ID")]
        agent_id: Option<String>,
    },
}

#[tokio::main(flavor = "multi_thread")]
async fn main() -> Result<()> {
    // Parse command line arguments
    let cli = Cli::parse();

    // Check if running from app bundle and no explicit command is provided
    let exe_path = std::env::current_exe()?;
    let is_app_bundle = exe_path
        .to_string_lossy()
        .contains("/Applications/OpenFrame.app");

    // If running from app bundle and no explicit command, run as service
    if is_app_bundle && cli.command.is_none() {
        // Initialize logging without shipping for service mode
        openframe::logging::init(None, None)?;
        info!("Running from app bundle, starting as service...");
        return openframe::service::ServiceManager::run_as_service();
    }

    // Get the command, defaulting to Run if none provided
    let command = cli.command.unwrap_or(Commands::Run {
        log_endpoint: None,
        agent_id: None,
    });

    // Initialize logging based on command
    match &command {
        Commands::Run {
            log_endpoint,
            agent_id,
        } => {
            openframe::logging::init(log_endpoint.clone(), agent_id.clone())?;
        }
        _ => {
            openframe::logging::init(None, None)?;
        }
    }

    // Handle commands
    match command {
        Commands::Install => {
            info!("Installing OpenFrame service...");
            openframe::service::ServiceManager::install()?;
            info!("Service installation completed successfully");
            return Ok(());
        }
        Commands::Uninstall => {
            info!("Uninstalling OpenFrame service...");
            openframe::service::ServiceManager::uninstall()?;
            info!("Service uninstallation completed successfully");
            return Ok(());
        }
        Commands::Service => {
            info!("Starting OpenFrame as a service...");
            openframe::service::ServiceManager::run_as_service()?;
            return Ok(());
        }
        Commands::Run { .. } => {
            info!("Starting OpenFrame in foreground mode...");
            // Continue with normal agent initialization
        }
    }

    // Initialize the agent
    match openframe::Agent::new().await {
        Ok(agent) => {
            if let Err(e) = agent.start().await {
                error!("Agent error: {}", e);
                std::process::exit(1);
            }
        }
        Err(e) => {
            error!("Failed to initialize agent: {}", e);
            std::process::exit(1);
        }
    }

    Ok(())
}
