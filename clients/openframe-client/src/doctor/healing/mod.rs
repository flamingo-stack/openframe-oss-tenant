pub mod webview2_installer;

use tracing::{info, warn};

use super::{CheckResult, Remediation};

/// Outcome of a single healing action.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum HealOutcome {
    Healed,
    Failed(String),
}

/// One remediation attempt and how it ended.
#[derive(Debug)]
pub struct HealResult {
    pub remediation: Remediation,
    pub outcome: HealOutcome,
}

/// Checks whose failures healing can fix automatically; cheap and local only.
pub fn healable_checks() -> Vec<CheckResult> {
    super::checks::check_webview2_runtime().into_iter().collect()
}

/// Remediations flagged in `results`, deduplicated in first-seen order.
pub fn pending(results: &[CheckResult]) -> Vec<Remediation> {
    let mut remediations = Vec::new();
    for result in results {
        if let Some(remediation) = result.remediation {
            if !remediations.contains(&remediation) {
                remediations.push(remediation);
            }
        }
    }
    remediations
}

/// Runs every remediation flagged in `results`; each action verifies its own fix.
pub async fn heal(results: &[CheckResult]) -> Vec<HealResult> {
    let mut heals = Vec::new();
    for remediation in pending(results) {
        info!("Doctor healing: running {:?}", remediation);
        let outcome = run_action(remediation).await;
        match &outcome {
            HealOutcome::Healed => info!("Doctor healing: {:?} healed", remediation),
            HealOutcome::Failed(e) => warn!("Doctor healing: {:?} failed: {}", remediation, e),
        }
        heals.push(HealResult { remediation, outcome });
    }
    heals
}

async fn run_action(remediation: Remediation) -> HealOutcome {
    match remediation {
        Remediation::InstallWebview2 => webview2_installer::install().await,
    }
}

#[cfg(test)]
#[path = "healing_tests.rs"]
mod tests;
