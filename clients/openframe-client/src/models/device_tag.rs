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
#[path = "device_tag_tests.rs"]
mod tests;
