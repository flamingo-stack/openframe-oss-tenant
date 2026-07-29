use anyhow::{Context, Result};
use reqwest::{
    header::{HeaderMap, HeaderValue},
    Client,
};
use std::collections::HashMap;

use crate::models::AgentTokenResponse;

#[derive(Clone)]
pub struct AuthClient {
    http_client: Client,
    base_url: String,
}

impl AuthClient {
    /// Creates an authentication client for the specified base URL.
    ///
    /// # Examples
    ///
    /// ```
    /// let auth_client = AuthClient::new(
    ///     "https://example.com".to_owned(),
    ///     reqwest::Client::new(),
    /// );
    /// ```
    pub fn new(base_url: String, http_client: Client) -> Self {
        Self {
            http_client,
            base_url,
        }
    }

    /// Authenticates a client using its credentials and obtains an agent token.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # async fn example() -> anyhow::Result<()> {
    /// let client = AuthClient::new(
    ///     "https://example.com".to_string(),
    ///     reqwest::Client::new(),
    /// );
    /// let token = client
    ///     .authenticate_with_secret("client-id".to_string(), "client-secret".to_string())
    ///     .await?;
    /// # let _ = token;
    /// # Ok(())
    /// # }
    /// ```
    ///
    /// # Parameters
    ///
    /// * `client_id` - The OAuth client identifier.
    /// * `client_secret` - The OAuth client secret.
    ///
    /// # Returns
    ///
    /// The authenticated agent token response.
    pub async fn authenticate_with_secret(
        &self,
        client_id: String,
        client_secret: String,
    ) -> Result<AgentTokenResponse> {
        let url = format!("{}/clients/oauth/token", self.base_url);

        let mut headers = HeaderMap::new();
        headers.insert(
            "Content-Type",
            HeaderValue::from_static("application/x-www-form-urlencoded"),
        );

        let mut form_data = HashMap::new();
        form_data.insert("grant_type", "client_credentials".to_string());
        form_data.insert("client_id", client_id);
        form_data.insert("client_secret", client_secret);

        let response = self
            .http_client
            .post(&url)
            .headers(headers)
            .form(&form_data)
            .send()
            .await
            .context("Failed to send token request")?;

        let status = response.status();
        if !status.is_success() {
            return Err(anyhow::anyhow!(
                "Failed to obtain access token: status {} body {}",
                status,
                response.text().await?
            ));
        }

        response
            .json::<AgentTokenResponse>()
            .await
            .context("Failed to parse token response")
    }
}
