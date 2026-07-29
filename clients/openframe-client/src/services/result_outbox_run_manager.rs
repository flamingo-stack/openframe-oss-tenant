use std::sync::Arc;

use tokio::sync::Notify;
use tokio::time::{interval, timeout, Duration};
use tracing::{error, info, warn};

use crate::config::update_config::{
    FLUSH_PUBLISH_TIMEOUT_SECS, OUTBOX_FLUSH_INTERVAL_SECS, OUTBOX_MAX_PAYLOAD_BYTES,
};
use crate::services::result_store::{ResultPublisher, ResultStore};

pub struct ResultOutboxRunManager<P: ResultPublisher> {
    store: Arc<ResultStore>,
    publisher: Arc<P>,
    notify: Arc<Notify>,
}

impl<P: ResultPublisher + 'static> ResultOutboxRunManager<P> {
    pub fn new(store: Arc<ResultStore>, publisher: Arc<P>, notify: Arc<Notify>) -> Self {
        Self {
            store,
            publisher,
            notify,
        }
    }

    pub fn start(&self) {
        if !self.store.enabled() {
            info!("Result store not durable, outbox flusher disabled");
            return;
        }
        let store = self.store.clone();
        let publisher = self.publisher.clone();
        let notify = self.notify.clone();

        info!("Starting result outbox run manager");

        tokio::spawn(async move {
            let mut interval = interval(Duration::from_secs(OUTBOX_FLUSH_INTERVAL_SECS));
            let publish_timeout = Duration::from_secs(FLUSH_PUBLISH_TIMEOUT_SECS);

            loop {
                tokio::select! {
                    _ = interval.tick() => {}
                    _ = notify.notified() => {}
                }

                let keys = match store.pending_keys().await {
                    Ok(keys) => keys,
                    Err(e) => {
                        error!(error = %e, "Failed to read outbox pending keys");
                        continue;
                    }
                };

                for (key, subject) in keys {
                    let bytes = match store.load_payload(key.clone()).await {
                        Ok(Some(bytes)) => bytes,
                        Ok(None) => {
                            let _ = store.remove(key).await;
                            continue;
                        }
                        Err(e) => {
                            warn!(error = %e, "Failed to load outbox payload, retrying next tick");
                            break;
                        }
                    };

                    if bytes.len() > OUTBOX_MAX_PAYLOAD_BYTES {
                        warn!(
                            key = %key,
                            size = bytes.len(),
                            "Outbox entry exceeds max payload and cannot be delivered, skipping so it does not block healthy results"
                        );
                        continue;
                    }

                    match timeout(publish_timeout, publisher.publish_raw(&subject, &bytes)).await {
                        Ok(Ok(())) => {
                            if let Err(e) = store.remove(key).await {
                                warn!(error = %e, "Delivered result but failed to remove from outbox");
                            }
                        }
                        Ok(Err(e)) => {
                            warn!(error = %e, "Outbox publish failed, retrying next tick");
                            break;
                        }
                        Err(_) => {
                            warn!("Outbox publish timed out, retrying next tick");
                            break;
                        }
                    }
                }
            }
        });
    }
}
