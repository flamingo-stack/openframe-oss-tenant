use anyhow::Result;
use clap::{Args, Parser, Subcommand};
use openframe::platform::permissions::{Capability, PermissionUtils};
use openframe::{service::Service, Client};
use openframe::installation_initial_config_service::InstallConfigParams;
use std::process;

use tokio::runtime::Runtime;
use tracing::{error, info};

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

    #[arg(long = "tag")]
    tags: Vec<String>,
}

impl InstallArgs {
    fn to_params(&self) -> InstallConfigParams {
        InstallConfigParams {
            server_url: self.server_url.clone(),
            initial_key: self.initial_key.clone(),
            org_id: self.org_id.clone(),
            local_mode: self.local_mode,
            tags: self.tags.clone(),
        }
    }
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
    /// Run environment health check (reads config from installed agent)
    Doctor,
}

fn main() -> Result<()> {
    openframe::platform::configure_console();

    let cli = Cli::parse();
    let rt = Runtime::new()?;

    match cli.command {
        Some(Commands::Install(args)) => {
            openframe::banner::print();
            let params = args.to_params();

            let report = rt.block_on(openframe::doctor::run_preinstall(&params));
            report.print();

            if report.has_failures() {
                println!(
                    "\n{} check(s) failed. Please fix the issues above and try again.",
                    report.failure_count()
                );
                process::exit(1);
            }

            let warns = report.warn_count();
            if warns > 0 {
                println!("\n{} warning(s). Installation will proceed, but the agent may have connectivity issues.", warns);
            }

            if let Err(e) = openframe::logging::init_file_only(None, None) {
                eprintln!("Failed to initialize logging: {}", e);
                process::exit(1);
            }

            // Healing runs only on a fresh install; a reinstall (existing client present) skips it.
            if !Service::is_installed() && !openframe::doctor::healing::pending(&report.results).is_empty() {
                println!("\nAttempting automatic fixes (this may take a few minutes)...");
                let heals = rt.block_on(openframe::doctor::healing::heal(&report.results));
                print_heal_outcomes(&heals);
            }

            println!("\nStarting installation...\n");

            rt.block_on(async {
                match Service::install(params).await {
                    Ok(_) => {
                        println!("OpenFrame agent installed successfully.");
                        process::exit(0);
                    }
                    Err(e) => {
                        error!("Install failed: {:#}", e);
                        println!("Installation failed. Check logs for details.");
                        process::exit(1);
                    }
                }
            });
        }
        Some(Commands::Doctor) => {
            let report = rt.block_on(openframe::doctor::run_healthcheck());
            report.print();

            if report.has_failures() {
                println!(
                    "\n{} check(s) failed. Please fix the issues above and try again.",
                    report.failure_count()
                );
                process::exit(1);
            }

            let warns = report.warn_count();
            if warns > 0 {
                println!("\n{} warning(s). The agent may have connectivity issues.", warns);
                process::exit(1);
            }

            println!("\nAll checks passed.");
            process::exit(0);
        }
        Some(Commands::Uninstall) => {
            PermissionUtils::require_admin();
            init_logging();
            info!("Running uninstall command");

            rt.block_on(async {
                match Service::uninstall().await {
                    Ok(_) => {
                        info!("OpenFrame client service uninstalled successfully");
                        process::exit(0);
                    }
                    Err(e) => {
                        error!("Failed to uninstall OpenFrame client service: {:#}", e);
                        process::exit(1);
                    }
                }
            });
        }
        Some(Commands::Run) => {
            PermissionUtils::require_admin();
            init_logging();
            info!("Running in direct mode (without service wrapper)");
            PermissionUtils::warn_missing_capabilities();

            // Run directly without service wrapper
            match Client::new() {
                Ok(client) => {
                    info!("Starting OpenFrame client in direct mode");
                    if let Err(e) = rt.block_on(client.start()) {
                        error!("Client failed: {:#}", e);
                        process::exit(1);
                    }
                }
                Err(e) => {
                    error!("Failed to initialize client: {:#}", e);
                    process::exit(1);
                }
            }
        }
        Some(Commands::RunAsService) => {
            PermissionUtils::require_admin();
            init_logging();
            info!("Running as service (called by service manager)");
            PermissionUtils::warn_missing_capabilities();

            if let Err(e) = Service::run_as_service() {
                error!("Service failed: {:#}", e);
                process::exit(1);
            }
        }
        Some(Commands::CheckPermissions) => {
            let is_admin = PermissionUtils::is_admin();
            println!("Admin privileges: {}", is_admin);
            for cap in [
                Capability::ManageServices,
                Capability::WriteSystemDirectories,
                Capability::ReadSystemLogs,
                Capability::WriteSystemLogs,
            ] {
                println!("{:?}: {}", cap, PermissionUtils::has_capability(cap));
            }
            process::exit(if is_admin { 0 } else { 1 });
        }
        None => {
            PermissionUtils::require_admin();
            init_logging();
            info!("No command specified, running as service (legacy mode)");

            if let Err(e) = rt.block_on(Service::run()) {
                error!("Service failed: {:#}", e);
                process::exit(1);
            }
        }
    }

    Ok(())
}

fn init_logging() {
    if let Err(e) = openframe::logging::init(None, None) {
        eprintln!("Failed to initialize logging: {}", e);
        process::exit(1);
    }
}

fn print_heal_outcomes(heals: &[openframe::doctor::healing::HealResult]) {
    use openframe::doctor::healing::HealOutcome;
    use openframe::doctor::Remediation;
    for heal in heals {
        let label = match heal.remediation {
            Remediation::InstallWebview2 => "WebView2 Runtime install",
        };
        match &heal.outcome {
            HealOutcome::Healed => println!("  [+] {} fixed", label),
            HealOutcome::Failed(e) => println!("  [x] {} failed: {}", label, e),
        }
    }
}
