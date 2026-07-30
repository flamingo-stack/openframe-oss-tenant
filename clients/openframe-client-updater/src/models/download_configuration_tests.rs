use super::*;

fn config(os: &str) -> DownloadConfiguration {
    DownloadConfiguration {
        os: os.to_string(),
        file_name: "archive.zip".to_string(),
        target_file_name: "binary".to_string(),
        link: "https://example.com/archive.zip".to_string(),
    }
}

#[test]
fn matches_current_os_case_insensitively() {
    let current = if cfg!(target_os = "windows") {
        "WINDOWS"
    } else if cfg!(target_os = "macos") {
        "MacOS"
    } else {
        "Linux"
    };
    assert!(config(current).matches_current_os());
    assert!(config(&current.to_lowercase()).matches_current_os());
}

#[test]
fn does_not_match_other_os() {
    assert!(!config("solaris").matches_current_os());
    let other = if cfg!(target_os = "windows") {
        "macos"
    } else {
        "windows"
    };
    assert!(!config(other).matches_current_os());
}

#[test]
fn accepts_legacy_target_file_name_aliases() {
    for key in ["targetFileName", "agentFileName", "assetFileName"] {
        let json = format!(
            r#"{{"os": "windows", "fileName": "a.zip", "{}": "client.exe", "link": "https://x"}}"#,
            key
        );
        let cfg: DownloadConfiguration = serde_json::from_str(&json).unwrap();
        assert_eq!(cfg.target_file_name, "client.exe", "alias {} failed", key);
    }
}
