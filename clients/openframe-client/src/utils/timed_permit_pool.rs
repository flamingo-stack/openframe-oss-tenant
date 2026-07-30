use std::sync::Arc;
use std::time::Duration;

use anyhow::Result;
use tokio::sync::Semaphore;

/// Runs blocking closures off-runtime under a timeout, with a permit pool bounding how many threads timed-out (abandoned) calls can leave parked.
pub struct TimedPermitPool {
    permits: Arc<Semaphore>,
    max: usize,
}

impl TimedPermitPool {
    pub fn new(max: usize) -> Self {
        Self {
            permits: Arc::new(Semaphore::new(max)),
            max,
        }
    }

    /// Fails fast when no permit frees within the timeout; the permit rides inside the closure so it releases only when the blocking call actually returns.
    pub async fn call<T, F>(&self, what: &str, timeout: Duration, f: F) -> Result<T>
    where
        F: FnOnce() -> T + Send + 'static,
        T: Send + 'static,
    {
        let permit = match tokio::time::timeout(timeout, self.permits.clone().acquire_owned()).await {
            Err(_elapsed) => {
                return Err(anyhow::anyhow!(
                    "{} not attempted: all {} call slots busy",
                    what, self.max
                ))
            }
            Ok(Err(closed)) => {
                return Err(anyhow::anyhow!(
                    "{} not attempted: permit pool closed: {}",
                    what, closed
                ))
            }
            Ok(Ok(permit)) => permit,
        };
        match tokio::time::timeout(
            timeout,
            tokio::task::spawn_blocking(move || {
                let _permit = permit;
                f()
            }),
        )
        .await
        {
            Err(_elapsed) => Err(anyhow::anyhow!(
                "{} timed out after {}ms",
                what,
                timeout.as_millis()
            )),
            Ok(Err(join_err)) => Err(anyhow::anyhow!("{} task failed: {}", what, join_err)),
            Ok(Ok(v)) => Ok(v),
        }
    }
}

#[cfg(test)]
#[path = "timed_permit_pool_tests.rs"]
mod tests;

