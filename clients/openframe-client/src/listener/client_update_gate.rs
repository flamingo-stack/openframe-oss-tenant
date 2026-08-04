use crate::config::update_config::PROGRESS_ACK_INTERVAL_SECS;
use crate::platform::in_flight_client_update_phase;
use async_nats::jetstream::{AckKind, Message};
use std::future::Future;
use tokio::time::Duration;
use tracing::{info, warn};

/// Parks any tool operation while openframe-client-updater is mid-swap (the
/// swap stops the client without a quiescence check), keeping the message
/// alive with Progress acks so the park never burns the max_deliver budget.
/// The probe's staleness cutoff unparks a wedged updater; a failed Progress
/// ack abandons the park and redelivery takes over.
pub async fn park_or_dispatch<F, Fut>(message: Message, label: String, dispatch: F)
where
    F: FnOnce(Message) -> Fut + Send + 'static,
    Fut: Future<Output = ()> + Send + 'static,
{
    let Some(phase) = in_flight_client_update_phase() else {
        dispatch(message).await;
        return;
    };

    info!(
        "Client update in flight (updater phase: {phase}): parking {label} (keeping it alive with Progress acks every {PROGRESS_ACK_INTERVAL_SECS}s)"
    );

    tokio::spawn(async move {
        while in_flight_client_update_phase().is_some() {
            if let Err(e) = message.ack_with(AckKind::Progress).await {
                warn!(
                    "Failed to send Progress ack for parked {}: {} — abandoning park, redelivery takes over",
                    label, e
                );
                return;
            }
            tokio::time::sleep(Duration::from_secs(PROGRESS_ACK_INTERVAL_SECS)).await;
        }

        info!("Client update no longer in flight: dispatching parked {label}");
        dispatch(message).await;
    });
}
