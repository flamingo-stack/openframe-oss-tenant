use super::*;
use std::thread;

#[tokio::test]
async fn returns_the_closure_result() {
    let pool = TimedPermitPool::new(1);
    let v = pool.call("op", Duration::from_secs(5), || 42).await.unwrap();
    assert_eq!(v, 42);
}

#[tokio::test]
async fn timeout_fires_on_a_blocked_call() {
    let pool = TimedPermitPool::new(1);
    let err = pool
        .call("op", Duration::from_millis(50), || {
            thread::sleep(Duration::from_millis(400))
        })
        .await
        .unwrap_err();
    assert!(err.to_string().contains("timed out"), "got: {err}");
}

#[tokio::test]
async fn permit_is_held_past_timeout_and_freed_when_the_call_returns() {
    let pool = TimedPermitPool::new(1);
    let err = pool
        .call("op", Duration::from_millis(50), || {
            thread::sleep(Duration::from_millis(400))
        })
        .await
        .unwrap_err();
    assert!(err.to_string().contains("timed out"), "got: {err}");

    // The abandoned call still holds the only permit, so the next call must fail fast.
    let err = pool
        .call("op", Duration::from_millis(50), || ())
        .await
        .unwrap_err();
    assert!(err.to_string().contains("call slots busy"), "got: {err}");

    // Once the blocked closure finishes, the permit frees and the pool recovers.
    tokio::time::sleep(Duration::from_millis(600)).await;
    pool.call("op", Duration::from_secs(5), || ()).await.unwrap();
}

#[tokio::test]
async fn call_over_capacity_fails_fast_while_slots_are_busy() {
    let pool = Arc::new(TimedPermitPool::new(4));
    let (tx, rx) = std::sync::mpsc::channel::<()>();
    let rx = Arc::new(std::sync::Mutex::new(rx));

    let mut holders = Vec::new();
    for _ in 0..4 {
        let pool = pool.clone();
        let rx = rx.clone();
        holders.push(tokio::spawn(async move {
            pool.call("holder", Duration::from_secs(10), move || {
                let _ = rx.lock().unwrap().recv();
            })
            .await
        }));
    }
    // Give the four holders time to occupy every slot.
    tokio::time::sleep(Duration::from_millis(200)).await;

    let err = pool
        .call("fifth", Duration::from_millis(50), || ())
        .await
        .unwrap_err();
    assert!(err.to_string().contains("all 4 call slots busy"), "got: {err}");

    // Release the holders; every call must complete and the pool must be usable again.
    for _ in 0..4 {
        tx.send(()).unwrap();
    }
    for h in holders {
        h.await.unwrap().unwrap();
    }
    pool.call("after", Duration::from_secs(5), || ()).await.unwrap();
}
