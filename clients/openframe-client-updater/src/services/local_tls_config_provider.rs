use anyhow::{anyhow, Context, Result};
use std::fs;
use std::io::Cursor;
use std::path::PathBuf;
use tracing::info;

use async_nats::rustls::{ClientConfig, RootCertStore};

use crate::services::InitialConfigurationService;

#[derive(Clone)]
pub struct LocalTlsConfigProvider {
    initial_configuration_service: InitialConfigurationService,
}

impl LocalTlsConfigProvider {
    /// Creates a local TLS configuration provider from the initial configuration service.
    ///
    /// # Examples
    ///
    /// ```
    /// let initial_configuration_service: InitialConfigurationService = todo!();
    /// let provider = LocalTlsConfigProvider::new(initial_configuration_service);
    /// ```
    pub fn new(initial_configuration_service: InitialConfigurationService) -> Self {
        Self {
            initial_configuration_service,
        }
    }

    /// Creates a local-mode TLS client configuration using the configured CA certificate.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # let provider: LocalTlsConfigProvider = todo!();
    /// let config = provider.create_tls_config()?;
    /// # let _: async_nats::rustls::ClientConfig = config;
    /// # Ok::<(), anyhow::Error>(())
    /// ```
    ///
    /// # Returns
    ///
    /// The TLS client configuration containing the configured CA certificates and no client authentication.
    pub fn create_tls_config(&self) -> Result<ClientConfig> {
        info!("Creating local-mode TLS configuration");

        let cert_path = self.get_certificate_path()?;
        info!("Using CA certificate: {}", cert_path);

        let cert_data = fs::read(&cert_path)
            .with_context(|| format!("Failed to read CA certificate from {}", cert_path))?;

        let mut cursor = Cursor::new(cert_data);
        let certs = rustls_pemfile::certs(&mut cursor).context("Failed to parse certificate")?;

        let mut root_store = RootCertStore::empty();
        for cert in certs {
            root_store
                .add(cert.into())
                .context("Failed to add CA certificate to root store")?;
        }

        let config = ClientConfig::builder()
            .with_root_certificates(root_store)
            .with_no_client_auth();

        Ok(config)
    }

    /// Resolves and validates the local CA certificate path from the initial configuration.
    ///
    /// # Errors
    ///
    /// Returns an error if the path cannot be read, is empty, or does not point to an existing file.
    ///
    /// # Examples
    ///
    /// ```
    /// # use std::path::PathBuf;
    /// # let certificate_path = PathBuf::from("/path/to/ca.pem");
    /// assert!(certificate_path.exists() || !certificate_path.as_os_str().is_empty());
    /// ```
    fn get_certificate_path(&self) -> Result<String> {
        let saved_path = self
            .initial_configuration_service
            .get_local_ca_cert_path()
            .context("Failed to read local_ca_cert_path from initial configuration")?;

        if saved_path.is_empty() {
            return Err(anyhow!(
                "local_ca_cert_path is not set in initial_config.json"
            ));
        }

        let path = PathBuf::from(&saved_path);
        if !path.exists() {
            return Err(anyhow!(
                "local_ca_cert_path points to non-existent file: {}",
                saved_path
            ));
        }

        Ok(saved_path)
    }
}
