use super::*;

#[test]
fn logs_first_failures_every_time() {
    let mut b = FailureLogBackoff::new();
    for _ in 0..LOG_EVERY_FAILURES {
        assert!(b.should_log());
        b.record_failure(true);
    }
}

#[test]
fn throttles_after_initial_failures() {
    let mut b = FailureLogBackoff::new();
    for _ in 0..LOG_EVERY_FAILURES {
        b.record_failure(true);
    }
    assert!(!b.should_log());
    b.record_failure(false);
    assert!(!b.should_log());
}

#[test]
fn interval_widens_with_failure_age() {
    assert_eq!(FailureLogBackoff::log_interval(0, Duration::ZERO), None);
    assert_eq!(
        FailureLogBackoff::log_interval(LOG_EVERY_FAILURES - 1, SLOW_AFTER * 2),
        None
    );
    assert_eq!(
        FailureLogBackoff::log_interval(LOG_EVERY_FAILURES, Duration::from_secs(600)),
        Some(THROTTLED_INTERVAL)
    );
    assert_eq!(
        FailureLogBackoff::log_interval(LOG_EVERY_FAILURES, SLOW_AFTER),
        Some(SLOW_INTERVAL)
    );
}

#[test]
fn suppressed_failure_does_not_defer_next_log() {
    // Backdated state: mid-streak, last log older than the throttle interval.
    let (Some(first), Some(last)) = (
        Instant::now().checked_sub(Duration::from_secs(600)),
        Instant::now().checked_sub(THROTTLED_INTERVAL + Duration::from_secs(60)),
    ) else {
        return;
    };
    let mut b = FailureLogBackoff {
        failures: LOG_EVERY_FAILURES,
        first_failure: Some(first),
        last_logged: Some(last),
    };
    assert!(b.should_log());
    b.record_failure(false);
    assert!(
        b.should_log(),
        "suppressed failure must not re-arm the throttle"
    );
    b.record_failure(true);
    assert!(!b.should_log(), "emitted log must re-arm the throttle");
}

#[test]
fn success_reports_streak_and_resets() {
    let mut b = FailureLogBackoff::new();
    assert_eq!(b.record_success(), None);
    for _ in 0..3 {
        b.record_failure(true);
    }
    let (failures, _failing_for) = b.record_success().expect("streak expected");
    assert_eq!(failures, 3);
    assert!(b.should_log());
    assert_eq!(b.record_success(), None);
}
