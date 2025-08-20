use anyhow::Context;
use tokio::process::Command;

pub struct ToolInstallationCommandRunner;

impl ToolInstallationCommandRunner {

    pub fn new() -> Self {
        Self
    }

    pub async fn run_command(&self, command: &str, args: &[&str]) -> anyhow::Result<()> {
        Self::run(command, args).await
    }

    pub async fn run(command: &str, args: &[&str]) -> anyhow::Result<()> {
        let output = Command::new(command)
            .args(args)
            .output()
            .await
            .with_context(|| format!("Failed to spawn command `{}`", command))?;

        println!("Command `{}` exited with status: {}", command, output.status);

        if !output.stdout.is_empty() {
            println!("----- stdout -----\n{}", String::from_utf8_lossy(&output.stdout));
        }

        if !output.stderr.is_empty() {
            eprintln!("----- stderr -----\n{}", String::from_utf8_lossy(&output.stderr));
        }

        Ok(())
    }
}
