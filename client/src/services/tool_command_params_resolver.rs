use anyhow::Result;
use crate::platform::DirectoryManager;

#[derive(Clone)]
pub struct ToolCommandParamsResolver {
    directory_manager: DirectoryManager,
}

// TODO: rename to generic one 
impl ToolCommandParamsResolver {

    const SERVER_URL_PLACEHOLDER: &'static str = "${client.serverUrl}";
    const OPENFRAME_SECRET_PLACEHOLDER: &'static str = "${client.openframeSecret}";
    const OPENFRAME_TOKEN_PATH_PLACEHOLDER: &'static str = "${client.openframeTokenPath}";
    const OPENFRAME_OSQUERY_PATH_PLACEHOLDER: &'static str = "${client.openframeOsqueryPath}";
    
    pub fn new(directory_manager: DirectoryManager) -> Self {
        Self { directory_manager }
    }
    
    // TODO: not hardcoded
    pub fn process(&self, tool_id: &str, command_args: Vec<String>) -> Result<Vec<String>> {
        let mut processed_args = Vec::new();
        for arg in command_args {
            let processed_arg = arg.replace(Self::SERVER_URL_PLACEHOLDER, "http://localhost:8100");
            let processed_arg = processed_arg.replace(Self::OPENFRAME_SECRET_PLACEHOLDER, "12345678901234567890123456789012");
            let processed_arg = processed_arg.replace(Self::OPENFRAME_TOKEN_PATH_PLACEHOLDER, "/Users/kirillgontar/Library/Logs/OpenFrame/shared_token.enc");
            let processed_arg = processed_arg.replace(Self::OPENFRAME_OSQUERY_PATH_PLACEHOLDER, "/Users/kirillgontar/Library/Logs/OpenFrame/fleetmdm-server/osquery");
            processed_args.push(processed_arg);
        }
        Ok(processed_args)
    }
}
