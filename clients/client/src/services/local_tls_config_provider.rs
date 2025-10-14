use anyhow::{anyhow, Context, Result};
use std::path::PathBuf;
use std::fs;
use std::io::Cursor;
use tracing::info;
use async_nats::rustls::{ClientConfig, RootCertStore};
use crate::services::InitialConfigurationService;

#[derive(Clone)]
pub struct LocalTlsConfigProvider {
    initial_configuration_service: InitialConfigurationService,
}

impl LocalTlsConfigProvider {
    pub fn new(initial_configuration_service: InitialConfigurationService) -> Self {
        Self { initial_configuration_service }
    }

    pub fn create_tls_config(&self) -> Result<ClientConfig> {
        info!("Creating development TLS configuration with mkcert certificate...");

        // Get certificate path
        let cert_path = self.get_certificate_path()?;
        
        info!("Using development certificate: {}", cert_path);
        
        let cert_data = fs::read(&cert_path)
            .with_context(|| format!("Failed to read CA certificate from {}", cert_path))?;
        
        let mut cursor = Cursor::new(cert_data);
        let certs = rustls_pemfile::certs(&mut cursor)
            .context("Failed to parse certificate")?;
        
        let mut root_store = RootCertStore::empty();
        for cert in certs {
            root_store.add(cert.into())
                .context("Failed to add CA certificate to root store")?;
        }
        
        let config = ClientConfig::builder()
            .with_root_certificates(root_store)
            .with_no_client_auth();
        
        Ok(config)
    }

    fn get_certificate_path(&self) -> Result<String> {
        info!("Resolving dev CA path from initial configuration...");

        let saved_path = self.initial_configuration_service
            .get_local_ca_cert_path()
            .context("Failed to read local CA cert path from initial configuration")?;

        if saved_path.is_empty() {
            return Err(anyhow!("local_ca_cert_path is not set in initial configuration"));
        }

        let path = PathBuf::from(&saved_path);
        if !path.exists() {
            return Err(anyhow!(
                "local_ca_cert_path points to non-existent file: {}",
                saved_path
            ));
        }

        info!("Using dev CA path from initial configuration: {}", saved_path);
        Ok(saved_path)
    }
}


