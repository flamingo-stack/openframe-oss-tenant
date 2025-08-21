use std::collections::HashMap;
use std::path::Path;
use anyhow::Result;
use tracing::{debug, info};
use crate::platform::DirectoryManager;

pub struct ToolInstallationCommandParamsProcessor {
    directory_manager: DirectoryManager,
}

impl ToolInstallationCommandParamsProcessor {

    const SERVER_URL_PLACEHOLDER: &'static str = "${serverUrl}";
    const OPENFRAME_SECRET_PLACEHOLDER: &'static str = "${openframeSecret}";
    const OPENFRAME_TOKEN_PATH_PLACEHOLDER: &'static str = "${openframeTokenPath}";
    
    pub fn new(directory_manager: DirectoryManager) -> Self {
        Self { directory_manager }
    }
    
    // TODO: not hardcoded
    pub fn process(&self, tool_id: &str, command_args: Vec<String>) -> Result<Vec<String>> {
        let mut processed_args = Vec::new();
        for arg in command_args {
            let processed_arg = arg.replace(Self::SERVER_URL_PLACEHOLDER, "https://localhost");
            let processed_arg = processed_arg.replace(Self::OPENFRAME_SECRET_PLACEHOLDER, "12345678901234567890123456789012");
            let processed_arg = processed_arg.replace(Self::OPENFRAME_TOKEN_PATH_PLACEHOLDER, "/Users/kirillgontar/Library/Logs/OpenFrame/shared_token.enc");
            processed_args.push(processed_arg);
        }
        Ok(processed_args)
    }
}
