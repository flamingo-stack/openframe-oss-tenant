use super::ClientUpdatePendingFlag;
use std::time::Duration;

const LONG_TTL: Duration = Duration::from_secs(3600);

#[tokio::test]
async fn not_pending_before_first_mark() {
    let flag = ClientUpdatePendingFlag::default();
    assert!(!flag.is_pending(LONG_TTL).await);
}

#[tokio::test]
async fn pending_after_mark_within_ttl() {
    let flag = ClientUpdatePendingFlag::default();
    flag.mark().await;
    assert!(flag.is_pending(LONG_TTL).await);
}

#[tokio::test]
async fn expired_when_ttl_elapsed() {
    let flag = ClientUpdatePendingFlag::default();
    flag.mark().await;
    assert!(!flag.is_pending(Duration::ZERO).await);
}

#[tokio::test]
async fn remark_refreshes_the_ttl() {
    let flag = ClientUpdatePendingFlag::default();
    flag.mark().await;
    tokio::time::sleep(Duration::from_millis(30)).await;
    assert!(!flag.is_pending(Duration::from_millis(10)).await);
    flag.mark().await;
    assert!(flag.is_pending(Duration::from_millis(10)).await);
}

#[tokio::test]
async fn clones_share_state() {
    let flag = ClientUpdatePendingFlag::default();
    let clone = flag.clone();
    clone.mark().await;
    assert!(flag.is_pending(LONG_TTL).await);
}

#[tokio::test]
async fn clear_releases_the_flag() {
    let flag = ClientUpdatePendingFlag::default();
    flag.mark().await;
    assert!(flag.is_pending(LONG_TTL).await);
    flag.clear().await;
    assert!(!flag.is_pending(LONG_TTL).await);
}
