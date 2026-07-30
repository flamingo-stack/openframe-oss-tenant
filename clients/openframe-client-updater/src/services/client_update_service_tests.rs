use super::*;

// Boot-marker versions come from the client build, requested versions from the
// backend — cosmetic differences must never read as a wrong-binary boot.
#[test]
fn versions_match_is_semver_aware() {
    assert!(ClientUpdateService::versions_match("1.2.3", "1.2.3"));
    assert!(ClientUpdateService::versions_match("v1.2.3", "1.2.3"));
    assert!(ClientUpdateService::versions_match("1.2.3", "v1.2.3"));
    assert!(ClientUpdateService::versions_match(
        "1.2.3-beta.1",
        "v1.2.3-beta.1"
    ));
}

#[test]
fn versions_match_rejects_different_versions() {
    assert!(!ClientUpdateService::versions_match("1.2.3", "1.2.4"));
    assert!(!ClientUpdateService::versions_match("2.0.0", "1.0.0"));
    assert!(!ClientUpdateService::versions_match("1.2.3-beta.1", "1.2.3"));
}

#[test]
fn versions_match_falls_back_to_string_equality_for_non_semver() {
    assert!(ClientUpdateService::versions_match("2024.1", "2024.1"));
    assert!(!ClientUpdateService::versions_match("2024.1", "2024.2"));
    assert!(!ClientUpdateService::versions_match("dev", "1.0.0"));
}
