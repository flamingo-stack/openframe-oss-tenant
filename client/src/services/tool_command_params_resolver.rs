use anyhow::Result;
use crate::platform::DirectoryManager;

#[derive(Clone)]
pub struct ToolCommandParamsResolver {
    pub directory_manager: DirectoryManager,
}

impl ToolCommandParamsResolver {
    const SERVER_URL_PLACEHOLDER: &'static str = "${client.serverUrl}";
    const OPENFRAME_SECRET_PLACEHOLDER: &'static str = "${client.openframeSecret}";
    const OPENFRAME_TOKEN_PATH_PLACEHOLDER: &'static str = "${client.openframeTokenPath}";
    const OPENFRAME_OSQUERY_PATH_PLACEHOLDER: &'static str = "${client.openframeOsqueryPath}";
    
    pub fn new(directory_manager: DirectoryManager) -> Self {
        Self { 
            directory_manager,
        }
    }
    
    pub fn process(&self, tool_id: &str, command_args: Vec<String>) -> Result<Vec<String>> {
        let mut processed_args = Vec::new();
        
        // Build paths directly from directory manager
        let token_path = self.directory_manager.secured_dir().join("shared_token.enc").to_string_lossy().to_string();
        let osquery_path = self.directory_manager.app_support_dir().join(tool_id).join("osquery").to_string_lossy().to_string();
        
        for arg in command_args {
            let mut processed_arg = arg;
            
            // Replace placeholders with dynamic values
            processed_arg = processed_arg.replace(Self::SERVER_URL_PLACEHOLDER, "http://localhost:8100");
            processed_arg = processed_arg.replace(Self::OPENFRAME_SECRET_PLACEHOLDER, "12345678901234567890123456789012");
            processed_arg = processed_arg.replace(Self::OPENFRAME_TOKEN_PATH_PLACEHOLDER, &token_path);
            processed_arg = processed_arg.replace(Self::OPENFRAME_OSQUERY_PATH_PLACEHOLDER, &osquery_path);
            
            processed_args.push(processed_arg);
        }
        
        Ok(processed_args)
    }
}
