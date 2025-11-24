/// Configuration module for OpenFrame client
/// Contains constants and settings for various subsystems

use serde::{Deserialize, Serialize};

pub mod update_config;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Configuration {
    pub logging: LoggingConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoggingConfig {
    pub level: String,
    pub json: bool,
    pub rotation_size_mb: u64,
    pub max_files: u32,
}

impl Default for Configuration {
    fn default() -> Self {
        Self {
            logging: LoggingConfig {
                level: "info".to_string(),
                json: true,
                rotation_size_mb: 10,
                max_files: 5,
            },
        }
    }
}
