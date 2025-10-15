use anyhow::Result;
use tracing::info;

pub fn init() -> Result<()> {
    info!("Initializing metrics collection");
    Ok(())
}
