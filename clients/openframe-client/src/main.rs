use anyhow::Result;
use clap::{Args, Parser, Subcommand};
use openframe_agent::{run, AgentCommand, InstallConfigParams};

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Args, Debug, Clone)]
struct InstallArgs {
    #[arg(long = "serverUrl")]
    server_url: Option<String>,

    #[arg(long = "initialKey")]
    initial_key: Option<String>,

    #[arg(long = "localMode", default_value_t = false)]
    local_mode: bool,

    #[arg(long = "orgId")]
    org_id: Option<String>,
}

#[derive(Subcommand)]
enum Commands {
    /// Install the OpenFrame client as a system service
    Install(InstallArgs),
    /// Uninstall the OpenFrame client service
    Uninstall,
    /// Run the OpenFrame client directly (not as a service)
    Run,
    /// Run as a service (used by service manager)
    #[command(hide = true)]
    RunAsService,
    /// Check if the current process has the required permissions
    #[command(hide = true)]
    CheckPermissions,
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    let command = match cli.command {
        Some(Commands::Install(args)) => Some(AgentCommand::Install(InstallConfigParams {
            server_url: args.server_url,
            initial_key: args.initial_key,
            org_id: args.org_id,
            local_mode: args.local_mode,
        })),
        Some(Commands::Uninstall) => Some(AgentCommand::Uninstall),
        Some(Commands::Run) => Some(AgentCommand::Run),
        Some(Commands::RunAsService) => Some(AgentCommand::RunAsService),
        Some(Commands::CheckPermissions) => Some(AgentCommand::CheckPermissions),
        None => None,
    };

    run(command)
}
