use super::*;

#[test]
fn progress_message_omits_failure_fields() {
    let msg = UpdateProgressMessage::new("downloading", "1.2.3");
    let json = serde_json::to_value(&msg).unwrap();
    assert_eq!(json["phase"], "downloading");
    assert_eq!(json["version"], "1.2.3");
    assert!(json.get("reason").is_none());
    assert!(json.get("rolledBack").is_none());
}

#[test]
fn failure_message_carries_reason_and_rolled_back_in_camel_case() {
    let msg = UpdateProgressMessage::with_failure("failed", "1.2.3", "boot not verified", true);
    let json = serde_json::to_value(&msg).unwrap();
    assert_eq!(json["phase"], "failed");
    assert_eq!(json["reason"], "boot not verified");
    assert_eq!(json["rolledBack"], true);
}
