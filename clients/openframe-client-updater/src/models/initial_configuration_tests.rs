use super::*;

#[test]
fn optional_fields_default_when_absent() {
    let json = r#"{"server_host": "of.example.com", "initial_key": "k", "local_mode": false}"#;
    let cfg: InitialConfiguration = serde_json::from_str(json).unwrap();
    assert_eq!(cfg.server_host, "of.example.com");
    assert!(!cfg.local_mode);
    assert_eq!(cfg.org_id, "");
    assert_eq!(cfg.local_ca_cert_path, "");
}

#[test]
fn full_configuration_round_trips() {
    let cfg = InitialConfiguration {
        server_host: "localhost:8080".to_string(),
        initial_key: "secret".to_string(),
        local_mode: true,
        org_id: "org-1".to_string(),
        local_ca_cert_path: "/tmp/ca.pem".to_string(),
    };
    let json = serde_json::to_string(&cfg).unwrap();
    let restored: InitialConfiguration = serde_json::from_str(&json).unwrap();
    assert_eq!(restored.server_host, cfg.server_host);
    assert_eq!(restored.local_mode, cfg.local_mode);
    assert_eq!(restored.org_id, cfg.org_id);
    assert_eq!(restored.local_ca_cert_path, cfg.local_ca_cert_path);
}
