use super::*;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::Duration as StdDuration;

async fn wait_for(counter: &AtomicUsize, target: usize) {
    while counter.load(Ordering::SeqCst) < target {
        tokio::time::sleep(StdDuration::from_millis(5)).await;
    }
}

#[tokio::test]
async fn runs_all_concurrently_without_a_cap() {
    let n = 64;
    let active = Arc::new(AtomicUsize::new(0));
    let done = Arc::new(AtomicUsize::new(0));

    let (a, d) = (active.clone(), done.clone());
    run_unbounded(futures::stream::iter(0..n), move |_| {
        let (a, d) = (a.clone(), d.clone());
        async move {
            a.fetch_add(1, Ordering::SeqCst);
            while a.load(Ordering::SeqCst) < n {
                tokio::task::yield_now().await;
            }
            d.fetch_add(1, Ordering::SeqCst);
        }
    })
    .await;

    let drained = tokio::time::timeout(StdDuration::from_secs(5), wait_for(&done, n)).await;
    assert!(
        drained.is_ok(),
        "all {n} tasks must be concurrently active to pass the barrier; a cap would deadlock"
    );
    assert_eq!(active.load(Ordering::SeqCst), n);
}

// A task that never finishes must not hold up any other dispatched message
// (the old bounded loop with a small cap would have blocked here).
#[tokio::test]
async fn a_stuck_task_does_not_block_the_rest() {
    let n = 10;
    let gate = Arc::new(Notify::new());
    let started_stuck = Arc::new(AtomicUsize::new(0));
    let done = Arc::new(AtomicUsize::new(0));

    let (g, s, d) = (gate.clone(), started_stuck.clone(), done.clone());
    run_unbounded(futures::stream::iter(0..n), move |i| {
        let (g, s, d) = (g.clone(), s.clone(), d.clone());
        async move {
            if i == 0 {
                s.fetch_add(1, Ordering::SeqCst);
                g.notified().await;
            }
            d.fetch_add(1, Ordering::SeqCst);
        }
    })
    .await;

    // The 9 fast tasks finish while task 0 is parked on the gate.
    let fast = tokio::time::timeout(StdDuration::from_secs(5), wait_for(&done, n - 1)).await;
    assert!(fast.is_ok(), "fast tasks must not wait behind the stuck one");
    assert_eq!(started_stuck.load(Ordering::SeqCst), 1, "the stuck task did start");
    assert_eq!(done.load(Ordering::SeqCst), n - 1, "the stuck task is still parked");

    // Releasing the gate lets the last task complete.
    gate.notify_one();
    let all = tokio::time::timeout(StdDuration::from_secs(5), wait_for(&done, n)).await;
    assert!(all.is_ok(), "the released task completes");
}

// A panic in one task is isolated by the runtime and must not stop the loop
// from dispatching or the sibling tasks from running.
#[tokio::test]
async fn a_panicking_task_does_not_stop_the_rest() {
    let done = Arc::new(AtomicUsize::new(0));

    let d = done.clone();
    run_unbounded(futures::stream::iter(0..3usize), move |i| {
        let d = d.clone();
        async move {
            if i == 1 {
                panic!("intentional panic in one task");
            }
            d.fetch_add(1, Ordering::SeqCst);
        }
    })
    .await;

    let ok = tokio::time::timeout(StdDuration::from_secs(5), wait_for(&done, 2)).await;
    assert!(ok.is_ok(), "the two non-panicking tasks must still run");
}

// A large fan-out completes without leaking or wedging.
#[tokio::test]
async fn high_fan_out_all_complete() {
    let n = 1000;
    let done = Arc::new(AtomicUsize::new(0));

    let d = done.clone();
    run_unbounded(futures::stream::iter(0..n), move |_| {
        let d = d.clone();
        async move {
            d.fetch_add(1, Ordering::SeqCst);
        }
    })
    .await;

    let ok = tokio::time::timeout(StdDuration::from_secs(10), wait_for(&done, n)).await;
    assert!(ok.is_ok(), "all {n} dispatched tasks must complete");
}
