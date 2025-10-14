use anyhow::Result;
use regex::Regex;
use std::sync::LazyLock;
use crate::platform::DirectoryManager;
use crate::services::InitialConfigurationService;

/// Regex for matching assets path placeholders like ${client.assetsPath.osquery}
static ASSETS_PATH_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\$\{client\.assetPath\.([^}]+)\}").unwrap()
});

#[derive(Clone)]
pub struct ToolCommandParamsResolver {
    pub directory_manager: DirectoryManager,
    pub initial_configuration_service: InitialConfigurationService,
}

impl ToolCommandParamsResolver {
    const SERVER_URL_PLACEHOLDER: &'static str = "${client.serverUrl}";
    const OPENFRAME_SECRET_PLACEHOLDER: &'static str = "${client.openframeSecret}";
    const OPENFRAME_TOKEN_PATH_PLACEHOLDER: &'static str = "${client.openframeTokenPath}";
    
    pub fn new(directory_manager: DirectoryManager, initial_configuration_service: InitialConfigurationService) -> Self {
        Self { 
            directory_manager,
            initial_configuration_service
        }
    }

    pub fn process(&self, tool_agent_id: &str, command_args: Vec<String>) -> Result<Vec<String>> {
        let server_url = format!("https://{}", self.initial_configuration_service.get_server_url()?);
        let token_path = self.build_token_path();

        Ok(command_args
            .into_iter()
            // Resolve standard placeholders
            .map(|arg| {
                arg.replace(Self::SERVER_URL_PLACEHOLDER, &server_url)
                    .replace(Self::OPENFRAME_SECRET_PLACEHOLDER, "12345678901234567890123456789012")
                    .replace(Self::OPENFRAME_TOKEN_PATH_PLACEHOLDER, &token_path)
            })
            // Resolve dynamic asset path placeholders
            .map(|arg| self.process_assets_placeholders(&arg, tool_agent_id))
            .collect())
    }

    fn build_token_path(&self) -> String {
        self.directory_manager
            .secured_dir()
            .join("shared_token.enc")
            .to_string_lossy()
            .to_string()
    }

    fn process_assets_placeholders(&self, arg: &str, tool_agent_id: &str) -> String {
        ASSETS_PATH_REGEX.replace_all(arg, |caps: &regex::Captures| {
            let asset_name = &caps[1];
            self.directory_manager
                .get_asset_path(tool_agent_id, asset_name, true) // Assets referenced in commands are typically executable
                .to_string_lossy()
                .into_owned()
        }).to_string()
    }
}
