use crate::config::update_config::PROGRESS_ACK_INTERVAL_SECS;
use crate::services::tool_run_manager::ToolRunManager;
use async_nats::jetstream::{AckKind, Message};
use std::future::Future;
use tokio::time::Duration;
use tracing::{info, warn};

pub async fn park_or_dispatch<F, Fut>(
    manager: ToolRunManager,
    message: Message,
    label: String,
    dispatch: F,
) where
    F: FnOnce(Message) -> Fut + Send + 'static,
    Fut: Future<Output = ()> + Send + 'static,
{
    if !manager.is_client_update_pending().await {
        dispatch(message).await;
        return;
    }

    info!(
        "Client update pending: parking {} (keeping it alive with Progress acks every {}s)",
        label, PROGRESS_ACK_INTERVAL_SECS
    );

    tokio::spawn(async move {
        while manager.is_client_update_pending().await {
            if let Err(e) = message.ack_with(AckKind::Progress).await {
                warn!(
                    "Failed to send Progress ack for parked {}: {} — abandoning park, redelivery takes over",
                    label, e
                );
                return;
            }
            tokio::time::sleep(Duration::from_secs(PROGRESS_ACK_INTERVAL_SECS)).await;
        }

        info!(
            "Client update no longer pending: dispatching parked {}",
            label
        );
        dispatch(message).await;
    });
}
