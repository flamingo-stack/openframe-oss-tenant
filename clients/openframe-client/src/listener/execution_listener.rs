use std::marker::PhantomData;
use std::sync::Arc;

use anyhow::{anyhow, Result};
use async_nats::Message;
use futures::StreamExt;
use tokio::sync::Semaphore;
use tokio::time::Duration;
use tracing::{error, info, warn};

use crate::config::update_config::RECONNECTION_DELAY_MS;
use crate::models::ExecutionMessage;
use crate::services::execution_service::ExecutionService;
use crate::services::nats_connection_manager::NatsConnectionManager;
use crate::services::nats_message_publisher::NatsMessagePublisher;
use crate::services::AgentConfigurationService;

pub struct ExecutionListener<M> {
    nats_connection_manager: NatsConnectionManager,
    nats_message_publisher: NatsMessagePublisher,
    execution_service: ExecutionService,
    config_service: AgentConfigurationService,
    semaphore: Arc<Semaphore>,
    _marker: PhantomData<fn() -> M>,
}

impl<M> Clone for ExecutionListener<M> {
    fn clone(&self) -> Self {
        Self {
            nats_connection_manager: self.nats_connection_manager.clone(),
            nats_message_publisher: self.nats_message_publisher.clone(),
            execution_service: self.execution_service.clone(),
            config_service: self.config_service.clone(),
            semaphore: self.semaphore.clone(),
            _marker: PhantomData,
        }
    }
}

impl<M: ExecutionMessage + 'static> ExecutionListener<M> {
    pub fn new(
        nats_connection_manager: NatsConnectionManager,
        nats_message_publisher: NatsMessagePublisher,
        execution_service: ExecutionService,
        config_service: AgentConfigurationService,
        semaphore: Arc<Semaphore>,
    ) -> Self {
        Self {
            nats_connection_manager,
            nats_message_publisher,
            execution_service,
            config_service,
            semaphore,
            _marker: PhantomData,
        }
    }

    pub async fn start(&self) -> Result<tokio::task::JoinHandle<()>> {
        let listener = self.clone();
        let handle = tokio::spawn(async move {
            loop {
                info!(kind = M::KIND, "Starting execution listener...");
                match listener.listen().await {
                    Ok(_) => warn!(
                        kind = M::KIND,
                        "Execution listener exited normally (unexpected)"
                    ),
                    Err(e) => error!(kind = M::KIND, "Execution listener error: {:#}", e),
                }
                info!(
                    kind = M::KIND,
                    delay_ms = RECONNECTION_DELAY_MS,
                    "Reconnecting execution listener..."
                );
                tokio::time::sleep(Duration::from_millis(RECONNECTION_DELAY_MS)).await;
            }
        });
        Ok(handle)
    }

    async fn listen(&self) -> Result<()> {
        let client = self.nats_connection_manager.get_client().await?;
        let machine_id = self.config_service.get_machine_id()?;

        let subject = format!("machine.{}.{}", machine_id, M::KIND);
        let subscriber = client
            .subscribe(subject.clone())
            .await
            .map_err(|e| anyhow!("failed to subscribe to {}: {}", subject, e))?;

        info!(subject = %subject, "Execution listener active");

        let listener = self.clone();
        run_bounded(subscriber, self.semaphore.clone(), move |message| {
            let listener = listener.clone();
            let machine_id = machine_id.clone();
            async move {
                if let Err(e) = listener.handle_message(message, &machine_id).await {
                    error!(kind = M::KIND, "Failed to handle execution message: {:#}", e);
                }
            }
        })
        .await;

        Ok(())
    }

    async fn handle_message(&self, message: Message, machine_id: &str) -> Result<()> {
        let payload = String::from_utf8_lossy(&message.payload);
        let parsed = match M::from_payload(&payload) {
            Ok(m) => m,
            Err(e) => {
                error!(kind = M::KIND, error = %e, "Failed to parse execution message, skipping");
                return Ok(());
            }
        };
        let execution_id = parsed.execution_id().to_string();
        let schedule_id = parsed.schedule_id().unwrap_or("-").to_string();
        info!(kind = M::KIND, execution_id = %execution_id, schedule_id = %schedule_id, "Execution request received");

        let request = parsed.to_request();
        let result = self.execution_service.execute(&request, machine_id).await;

        info!(
            kind = M::KIND,
            execution_id = %execution_id,
            schedule_id = %schedule_id,
            exit_code = result.exit_code,
            timed_out = result.timed_out,
            execution_time_ms = result.execution_time_ms,
            "Execution finished"
        );

        let result_subject = format!("machine.{}.{}.result", machine_id, M::KIND);
        if let Err(e) = self
            .nats_message_publisher
            .publish(&result_subject, &result)
            .await
        {
            error!(kind = M::KIND, execution_id = %execution_id, error = %e, "Failed to publish result");
        }

        Ok(())
    }
}

async fn run_bounded<T, F, Fut>(stream: impl futures::Stream<Item = T>, semaphore: Arc<Semaphore>, handler: F)
where
    T: Send + 'static,
    F: Fn(T) -> Fut + Clone + Send + 'static,
    Fut: std::future::Future<Output = ()> + Send + 'static,
{
    tokio::pin!(stream);
    while let Some(item) = stream.next().await {
        let permit = match semaphore.clone().acquire_owned().await {
            Ok(permit) => permit,
            Err(_) => break,
        };
        let handler = handler.clone();
        tokio::spawn(async move {
            let _permit = permit;
            handler(item).await;
        });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::time::{Duration as StdDuration, Instant};

    async fn wait_for(counter: &AtomicUsize, target: usize) {
        while counter.load(Ordering::SeqCst) < target {
            tokio::time::sleep(StdDuration::from_millis(5)).await;
        }
    }

    #[tokio::test]
    async fn runs_up_to_k_in_parallel() {
        let k = 4;
        let semaphore = Arc::new(Semaphore::new(k));
        let active = Arc::new(AtomicUsize::new(0));
        let max_active = Arc::new(AtomicUsize::new(0));
        let done = Arc::new(AtomicUsize::new(0));

        let (a, m, d) = (active.clone(), max_active.clone(), done.clone());
        let start = Instant::now();
        run_bounded(futures::stream::iter(0..k), semaphore, move |_| {
            let (a, m, d) = (a.clone(), m.clone(), d.clone());
            async move {
                let now = a.fetch_add(1, Ordering::SeqCst) + 1;
                m.fetch_max(now, Ordering::SeqCst);
                tokio::time::sleep(StdDuration::from_millis(200)).await;
                a.fetch_sub(1, Ordering::SeqCst);
                d.fetch_add(1, Ordering::SeqCst);
            }
        })
        .await;
        wait_for(&done, k).await;

        assert_eq!(max_active.load(Ordering::SeqCst), k, "all K should run at once");
        assert!(
            start.elapsed() < StdDuration::from_millis(600),
            "K parallel sleeps should take ~one duration, took {:?}",
            start.elapsed()
        );
    }

    #[tokio::test]
    async fn concurrency_never_exceeds_k() {
        let k = 2;
        let n = 10;
        let semaphore = Arc::new(Semaphore::new(k));
        let active = Arc::new(AtomicUsize::new(0));
        let max_active = Arc::new(AtomicUsize::new(0));
        let done = Arc::new(AtomicUsize::new(0));

        let (a, m, d) = (active.clone(), max_active.clone(), done.clone());
        run_bounded(futures::stream::iter(0..n), semaphore, move |_| {
            let (a, m, d) = (a.clone(), m.clone(), d.clone());
            async move {
                let now = a.fetch_add(1, Ordering::SeqCst) + 1;
                m.fetch_max(now, Ordering::SeqCst);
                tokio::time::sleep(StdDuration::from_millis(30)).await;
                a.fetch_sub(1, Ordering::SeqCst);
                d.fetch_add(1, Ordering::SeqCst);
            }
        })
        .await;
        wait_for(&done, n).await;

        assert!(
            max_active.load(Ordering::SeqCst) <= k,
            "observed {} concurrent, cap is {}",
            max_active.load(Ordering::SeqCst),
            k
        );
        assert_eq!(done.load(Ordering::SeqCst), n, "every item must complete");
    }

    #[tokio::test]
    async fn permit_released_on_panic() {
        let semaphore = Arc::new(Semaphore::new(1));
        let done = Arc::new(AtomicUsize::new(0));

        let d = done.clone();
        run_bounded(futures::stream::iter(0..3usize), semaphore, move |i| {
            let d = d.clone();
            async move {
                if i == 0 {
                    panic!("intentional panic in first task");
                }
                d.fetch_add(1, Ordering::SeqCst);
            }
        })
        .await;
        wait_for(&done, 2).await;

        assert_eq!(
            done.load(Ordering::SeqCst),
            2,
            "a panicking task must release its permit so the rest still run"
        );
    }
}
