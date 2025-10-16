use anyhow::Result;
use crate::services::InitialConfigurationService;

#[derive(Clone)]
pub struct ToolUrlParamsResolver {
    pub initial_configuration_service: InitialConfigurationService,
}

impl ToolUrlParamsResolver {
    const SERVER_URL_PLACEHOLDER: &'static str = "${client.serverUrl}";

    pub fn new(initial_configuration_service: InitialConfigurationService) -> Self {
        Self { 
            initial_configuration_service
        }
    }

    pub fn process(&self, url_path: &str) -> Result<String> {
        let server_url = self.initial_configuration_service.get_server_url()?;

        Ok(url_path
            .replace(Self::SERVER_URL_PLACEHOLDER, &server_url))
    }
}

