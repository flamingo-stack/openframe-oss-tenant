use super::*;
use crate::doctor::CheckCategory;

fn warn_with_remediation(name: &str) -> CheckResult {
    CheckResult::warn(CheckCategory::Runtime, name, "hint")
        .with_remediation(Remediation::InstallWebview2)
}

#[test]
fn pending_collects_flagged_remediations() {
    let results = vec![
        CheckResult::pass(CheckCategory::Admin, "admin"),
        warn_with_remediation("webview2"),
    ];

    assert_eq!(pending(&results), vec![Remediation::InstallWebview2]);
}

#[test]
fn pending_deduplicates() {
    let results = vec![warn_with_remediation("a"), warn_with_remediation("b")];

    assert_eq!(pending(&results), vec![Remediation::InstallWebview2]);
}

#[test]
fn pending_is_empty_without_flags() {
    let results = vec![
        CheckResult::pass(CheckCategory::Admin, "admin"),
        CheckResult::warn(CheckCategory::Network, "tcp", "hint"),
        CheckResult::fail(CheckCategory::Disk, "disk", "hint"),
    ];

    assert!(pending(&results).is_empty());
}

#[test]
fn constructors_leave_remediation_unset() {
    assert_eq!(CheckResult::pass(CheckCategory::Admin, "x").remediation, None);
    assert_eq!(CheckResult::info(CheckCategory::Network, "x").remediation, None);
    assert_eq!(
        warn_with_remediation("x").remediation,
        Some(Remediation::InstallWebview2)
    );
}
