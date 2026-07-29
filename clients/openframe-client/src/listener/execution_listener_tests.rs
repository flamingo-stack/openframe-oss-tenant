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

    assert_eq!(
        max_active.load(Ordering::SeqCst),
        k,
        "all K should run at once"
    );
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
