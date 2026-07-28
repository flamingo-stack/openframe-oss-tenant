use std::time::{Duration, Instant};

/// Consecutive failures that are all logged before throttling kicks in.
const LOG_EVERY_FAILURES: u64 = 5;
/// Failure-log interval once throttled.
const THROTTLED_INTERVAL: Duration = Duration::from_secs(2 * 60);
/// After failing this long, failure logs slow down to SLOW_INTERVAL.
const SLOW_AFTER: Duration = Duration::from_secs(60 * 60);
/// Failure-log interval for a long-standing failure.
const SLOW_INTERVAL: Duration = Duration::from_secs(60 * 60);

/// Backs off repeated failure logging (every failure → every 2 min → hourly) without touching the caller's retry cadence; recovery is always reported immediately.
pub struct FailureLogBackoff {
    failures: u64,
    first_failure: Option<Instant>,
    last_logged: Option<Instant>,
}

impl FailureLogBackoff {
    pub fn new() -> Self {
        Self { failures: 0, first_failure: None, last_logged: None }
    }

    /// None = log every failure; Some(interval) = log only this often.
    fn log_interval(failures: u64, failing_for: Duration) -> Option<Duration> {
        if failures < LOG_EVERY_FAILURES {
            None
        } else if failing_for < SLOW_AFTER {
            Some(THROTTLED_INTERVAL)
        } else {
            Some(SLOW_INTERVAL)
        }
    }

    /// Whether this attempt's logs should be emitted; decide before attempting.
    pub fn should_log(&self) -> bool {
        let (Some(first), Some(last)) = (self.first_failure, self.last_logged) else {
            return true;
        };
        match Self::log_interval(self.failures, first.elapsed()) {
            None => true,
            Some(interval) => last.elapsed() >= interval,
        }
    }

    /// Counts a failure; pass whether the caller actually emitted a log for it. Returns the streak length.
    pub fn record_failure(&mut self, logged: bool) -> u64 {
        self.failures += 1;
        self.first_failure.get_or_insert_with(Instant::now);
        if logged {
            self.last_logged = Some(Instant::now());
        }
        self.failures
    }

    /// Some((failures, total failing time)) when a success ends a failure streak; resets state.
    pub fn record_success(&mut self) -> Option<(u64, Duration)> {
        let streak = self.first_failure.map(|first| (self.failures, first.elapsed()));
        *self = Self::new();
        streak
    }
}

impl Default for FailureLogBackoff {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
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
        assert!(b.should_log(), "suppressed failure must not re-arm the throttle");
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
}
