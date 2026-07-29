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
        Self {
            failures: 0,
            first_failure: None,
            last_logged: None,
        }
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
        let streak = self
            .first_failure
            .map(|first| (self.failures, first.elapsed()));
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
#[path = "failure_log_backoff_tests.rs"]
mod tests;
