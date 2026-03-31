use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DeviceTag {
    pub key: String,
    pub values: Vec<String>,
}

impl DeviceTag {
    pub fn parse_from_cli(raw_tags: Vec<String>) -> Vec<Self> {
        let mut map: HashMap<String, Vec<String>> = HashMap::new();

        for tag in raw_tags {
            if let Some((key, value)) = tag.split_once('=') {
                let key = key.trim();
                let value = value.trim();

                // Skip if key or value is empty
                if key.is_empty() || value.is_empty() {
                    continue;
                }

                map.entry(key.to_string())
                    .or_default()
                    .push(value.to_string());
            }
        }

        map.into_iter()
            .map(|(key, values)| Self { key, values })
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_parse_multiple_values_same_key() {
        let raw = vec![
            "site=CHICAGO".to_string(),
            "site=NEW YORK".to_string(),
            "site=LA".to_string(),
        ];
        let tags = DeviceTag::parse_from_cli(raw);

        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].key, "site");
        assert!(tags[0].values.contains(&"CHICAGO".to_string()));
        assert!(tags[0].values.contains(&"NEW YORK".to_string()));
        assert!(tags[0].values.contains(&"LA".to_string()));
    }

    #[test]
    fn test_parse_multiple_keys() {
        let raw = vec![
            "site=CHICAGO".to_string(),
            "env=production".to_string(),
        ];
        let tags = DeviceTag::parse_from_cli(raw);

        assert_eq!(tags.len(), 2);
    }

    #[test]
    fn test_parse_empty() {
        let raw: Vec<String> = vec![];
        let tags = DeviceTag::parse_from_cli(raw);

        assert!(tags.is_empty());
    }

    #[test]
    fn test_parse_invalid_format_ignored() {
        let raw = vec![
            "site=CHICAGO".to_string(),
            "invalid_no_equals".to_string(),
        ];
        let tags = DeviceTag::parse_from_cli(raw);

        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].key, "site");
    }

    #[test]
    fn test_parse_empty_value_skipped() {
        let raw = vec![
            "site=CHICAGO".to_string(),
            "empty=".to_string(),
            "env=production".to_string(),
        ];
        let tags = DeviceTag::parse_from_cli(raw);

        assert_eq!(tags.len(), 2);
        assert!(tags.iter().all(|t| t.key != "empty"));
    }

    #[test]
    fn test_parse_empty_key_skipped() {
        let raw = vec![
            "site=CHICAGO".to_string(),
            "=nokey".to_string(),
        ];
        let tags = DeviceTag::parse_from_cli(raw);

        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].key, "site");
    }

    #[test]
    fn test_parse_whitespace_only_value_skipped() {
        let raw = vec![
            "site=CHICAGO".to_string(),
            "empty=   ".to_string(),
        ];
        let tags = DeviceTag::parse_from_cli(raw);

        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0].key, "site");
    }
}
