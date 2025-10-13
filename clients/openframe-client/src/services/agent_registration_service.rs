use std::env;
use anyhow::{Context, Result};
use reqwest::Client;
use tracing::{info, error, debug, warn};

use crate::clients::RegistrationClient;
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::models::{AgentRegistrationRequest, AgentRegistrationResponse, AgentConfiguration, InitialConfiguration};
use crate::services::device_data_fetcher::DeviceDataFetcher;
use crate::services::InitialConfigurationService;

#[derive(Clone)]
pub struct AgentRegistrationService {
    registration_client: RegistrationClient,
    device_data_fetcher: DeviceDataFetcher,
    config_service: AgentConfigurationService,
    initial_configuration_service: InitialConfigurationService,
}

impl AgentRegistrationService {

    pub fn new(
        registration_client: RegistrationClient,
        device_data_fetcher: DeviceDataFetcher,
        config_service: AgentConfigurationService,
        initial_configuration_service: InitialConfigurationService
    ) -> Self {
        Self {
            registration_client,
            device_data_fetcher,
            config_service,
            initial_configuration_service,
        }
    }

    pub async fn register_agent(&self) -> Result<AgentRegistrationResponse> {
        let initial_key = self.initial_configuration_service.get_initial_key()?;
        let registration_request = self.build_registration_request()?;
        
        let response = self.registration_client
            .register(&initial_key, registration_request)
            .await
            .context("Failed to register agent")?;

        self.config_service.save_registration_data(
            response.machine_id.clone(),
            response.client_id.clone(),
            response.client_secret.clone()
        ).await
        .context("Failed to save registration data")?;

        // TODO: make job for retry perspective
        if env::var("OPENFRAME_DEV_MODE").is_err() {
            self.initial_configuration_service.clear_initial_key()
                .context("Failed to clear initial key")?;   
        }

        Ok(response)
    }

    fn build_registration_request(&self) -> Result<AgentRegistrationRequest> {
        let hostname = self.device_data_fetcher.get_hostname()
            .unwrap_or_else(|| String::new());
        let agent_version = self.device_data_fetcher.get_agent_version()
            .unwrap_or_else(|| String::new());
        let os_type = self.device_data_fetcher.get_os_type();
        let organization_id = self.initial_configuration_service.get_org_id().unwrap_or_default();

        let request = AgentRegistrationRequest {
            hostname,
            agent_version,
            organization_id,
            os_type,
        };

        Ok(request)
    }
} 