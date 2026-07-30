use super::*;

#[test]
fn deserializes_backend_camel_case() {
    let json = r#"{
        "version": "1.2.3",
        "downloadConfigurations": [{
            "os": "WINDOWS",
            "fileName": "openframe-client_windows.zip",
            "targetFileName": "openframe-client.exe",
            "link": "https://github.com/flamingo-stack/openframe-oss-tenant/releases/download/1.2.3/openframe-client_windows.zip"
        }]
    }"#;

    let msg: ClientUpdateMessage = serde_json::from_str(json).unwrap();
    assert_eq!(msg.version, "1.2.3");
    assert_eq!(msg.download_configurations.len(), 1);
    assert_eq!(
        msg.download_configurations[0].target_file_name,
        "openframe-client.exe"
    );
}

#[test]
fn rollback_defaults_to_false_when_absent() {
    let json = r#"{"version": "1.0.0", "downloadConfigurations": []}"#;
    let msg: ClientUpdateMessage = serde_json::from_str(json).unwrap();
    assert!(!msg.rollback);
}

#[test]
fn rollback_true_is_parsed() {
    let json = r#"{"version": "1.0.0", "downloadConfigurations": [], "rollback": true}"#;
    let msg: ClientUpdateMessage = serde_json::from_str(json).unwrap();
    assert!(msg.rollback);
}
