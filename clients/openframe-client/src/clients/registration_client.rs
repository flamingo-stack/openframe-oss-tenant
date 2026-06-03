use anyhow::{Context, Result};
use reqwest::{
    header::{HeaderMap, HeaderValue},
    Client, StatusCode,
};
use serde::Deserialize;

use crate::{
    models::{AgentRegistrationRequest, AgentRegistrationResponse},
    platform::machine_info_persistence::PersistedMachineInfo,
};

/// Prefix of the `/reinstall` error codes (`CLIENT_SECRET_EMPTY`, `CLIENT_SECRET_INVALID`)
const CLIENT_SECRET_ERROR_PREFIX: &str = "CLIENT_SECRET_";

/// Outcome of a registration attempt that the caller needs to branch on.
#[derive(Debug, thiserror::Error)]
pub enum RegistrationError {
    /// The server rejected the saved machine credentials on `/reinstall`
    #[error("server rejected the machine credentials")]
    ClientSecretInvalid,
    /// Any other failure (network, validation, server error, ...).
    #[error(transparent)]
    Other(#[from] anyhow::Error),
}

#[derive(Debug, Deserialize)]
struct ApiError {
    code: String,
}

#[derive(Clone)]
pub struct RegistrationClient {
    http_client: Client,
    base_url: String,
}

impl RegistrationClient {
    pub fn new(base_url: String, http_client: Client) -> Result<Self> {
        Ok(Self { http_client, base_url })
    }

    pub async fn register(
        &self,
        initial_key: &str,
        machine_info: Option<PersistedMachineInfo>,
        request: AgentRegistrationRequest,
    ) -> Result<AgentRegistrationResponse, RegistrationError> {
        let url = if machine_info.is_some() {
            format!("{}/clients/api/agents/reinstall", self.base_url)
        } else {
            format!("{}/clients/api/agents/register", self.base_url)
        };

        let mut headers = HeaderMap::new();
        headers.insert("X-Initial-Key", initial_key.parse()
            .context("Failed to parse initial key header")?);
        if let Some(machine_info) = machine_info {
            let parsed_client_secret = machine_info
                .client_secret
                .parse()
                .context("Failed to parse client secret header")?;
            let parsed_machine_id = machine_info
                .machine_id
                .parse()
                .context("Failed to parse machine id header")?;
            headers.insert("X-Client-Secret", parsed_client_secret);
            headers.insert("X-Machine-Id", parsed_machine_id);
        }
        headers.insert("Content-Type", HeaderValue::from_static("application/json"));

        let response = self.http_client
            .post(&url)
            .headers(headers)
            .json(&request)
            .send()
            .await
            .context("Failed to send registration request")?;

        let status = response.status();

        if !status.is_success() {
            let body = response.text().await.unwrap_or_default();
            if is_client_secret_error(status, &body) {
                return Err(RegistrationError::ClientSecretInvalid);
            }
            return Err(
                anyhow::anyhow!("Failed to register agent with status {} and body {}", status, &body)
                .into());
        }

        let registration_response: AgentRegistrationResponse = response
            .json()
            .await
            .context("Failed to parse registration response")?;

        Ok(registration_response)
    }
}

/// Detects the HTTP 401 with a CLIENT_SECRET_* code.
fn is_client_secret_error(status: StatusCode, body: &str) -> bool {
    status == StatusCode::UNAUTHORIZED
        && serde_json::from_str::<ApiError>(body)
            .map(|error| error.code.starts_with(CLIENT_SECRET_ERROR_PREFIX))
            .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_client_secret_invalid() {
        let body = r#"{"code":"CLIENT_SECRET_INVALID","message":"Invalid client secret"}"#;
        assert!(is_client_secret_error(StatusCode::UNAUTHORIZED, body));
    }

    #[test]
    fn detects_client_secret_empty() {
        let body = r#"{"code":"CLIENT_SECRET_EMPTY","message":"Client secret is empty"}"#;
        assert!(is_client_secret_error(StatusCode::UNAUTHORIZED, body));
    }

    #[test]
    fn ignores_other_401_error_codes() {
        let body = r#"{"code":"INITIAL_KEY_INVALID","message":"..."}"#;
        assert!(!is_client_secret_error(StatusCode::UNAUTHORIZED, body));
    }

    #[test]
    fn ignores_client_secret_error_on_non_401() {
        let body = r#"{"code":"CLIENT_SECRET_INVALID"}"#;
        assert!(!is_client_secret_error(StatusCode::BAD_REQUEST, body));
    }

    #[test]
    fn handles_non_json_body() {
        assert!(!is_client_secret_error(
            StatusCode::UNAUTHORIZED,
            "gateway timeout"
        ));
    }
}
