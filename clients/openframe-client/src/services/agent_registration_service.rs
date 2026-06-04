use std::time::Duration;

use anyhow::{Context, Result};
use tracing::{error, info, warn};

use crate::clients::{RegistrationClient, RegistrationError};
use crate::models::{AgentRegistrationRequest, AgentRegistrationResponse};
use crate::platform::machine_info_persistence::{self, PersistedMachineInfo};
use crate::services::agent_configuration_service::AgentConfigurationService;
use crate::services::device_data_fetcher::DeviceDataFetcher;
use crate::services::InitialConfigurationService;

/// Backoff between persisted-read retries before falling back to a fresh install.
const READ_RETRY_DELAYS: [Duration; 3] =
    [Duration::from_secs(1), Duration::from_secs(3), Duration::from_secs(5)];

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

        let credentials = Self::read_persisted_credentials().await?;

        let response = match credentials {
            Some(credentials) => {
                info!(
                    "Found saved credentials from a previous install; reinstalling with machine_id: {}",
                    credentials.machine_id
                );
                self.reinstall(&initial_key, credentials).await?
            }
            None => {
                info!("No saved credentials found; performing a fresh registration");
                self.fresh_install(&initial_key).await?
            }
        };

        let machine_info = PersistedMachineInfo {
            machine_id: response.machine_id.clone(),
            client_secret: response.client_secret.clone(),
        };
        if let Err(e) = machine_info_persistence::write(&machine_info) {
            error!("Failed to persist machine info: {}", e);
        }

        self.config_service.save_registration_data(
            response.machine_id.clone(),
            response.client_id.clone(),
            response.client_secret.clone()
        ).await?;

        Ok(response)
    }

    async fn read_persisted_credentials() -> Result<Option<PersistedMachineInfo>> {
        let mut attempt = 0;
        loop {
            match machine_info_persistence::read() {
                Ok(credentials) => return Ok(credentials),
                Err(e) => match READ_RETRY_DELAYS.get(attempt) {
                    Some(&delay) => {
                        warn!(
                            "Failed to read persisted machine info (attempt {}): {:#}; retrying in {:?}",
                            attempt + 1,
                            e,
                            delay
                        );
                        tokio::time::sleep(delay).await;
                        attempt += 1;
                    }
                    None => {
                        error!(
                            "Failed to read persisted machine info after {} attempts: {:#}; performing a fresh registration",
                            attempt + 1,
                            e
                        );
                        return Ok(None);
                    }
                },
            }
        }
    }

    /// First install: the server generates machineId, clientSecret
    async fn fresh_install(&self, initial_key: &str) -> Result<AgentRegistrationResponse> {
        let request = self.build_registration_request()?;
        self.registration_client
            .register(initial_key, None, request)
            .await
            .context("Failed to register agent")
    }

    /// Reinstall: send the saved machineId + clientSecret.
    /// If the server rejects the secret, register cleanly.
    async fn reinstall(
        &self,
        initial_key: &str,
        machine_info: PersistedMachineInfo,
    ) -> Result<AgentRegistrationResponse> {
        let request = self.build_registration_request()?;

        match self
            .registration_client
            .register(initial_key, Some(machine_info), request)
            .await
        {
            Ok(response) => Ok(response),
            Err(RegistrationError::ClientSecretInvalid) => {
                warn!(
                    "Server rejected the saved machine credentials; registering as a new machine"
                );
                self.fresh_install(initial_key).await
            }
            Err(RegistrationError::Other(e)) => Err(e).context("Failed to reinstall agent"),
        }
    }

    fn build_registration_request(&self) -> Result<AgentRegistrationRequest> {
        let hostname = self.device_data_fetcher.get_hostname()
            .unwrap_or_default();
        let agent_version = self.device_data_fetcher.get_agent_version()
            .unwrap_or_default();
        let os_type = self.device_data_fetcher.get_os_type();
        let organization_id = self.initial_configuration_service.get_org_id().unwrap_or_default();
        let tags = self.initial_configuration_service.get_tags().unwrap_or_default();

        let request = AgentRegistrationRequest {
            hostname,
            agent_version,
            organization_id,
            os_type,
            tags,
        };

        Ok(request)
    }
}
