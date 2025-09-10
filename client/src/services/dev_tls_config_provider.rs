use anyhow::{anyhow, Context, Result};
use std::env;
use std::path::PathBuf;
use std::fs;
use std::io::Cursor;
use tracing::info;
use async_nats::rustls::{ClientConfig, RootCertStore};

#[derive(Clone)]
pub struct DevTlsConfigProvider;

impl DevTlsConfigProvider {
    pub fn new() -> Self {
        Self
    }

    pub fn create_tls_config(&self) -> Result<ClientConfig> {
        // Check if we're in development mode
        if env::var("OPENFRAME_DEV_MODE").is_err() {
            return Err(anyhow!(
                "DevTlsConfigProvider should only be used in development mode. \
                 Set OPENFRAME_DEV_MODE environment variable."
            ));
        }

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
        info!("Looking for mkcert certificate in development mode...");
        
        // Only check standard macOS mkcert path
        if let Ok(home) = env::var("HOME") {
            let cert_path = PathBuf::from(home).join("Library/Application Support/mkcert/rootCA.pem");
            if cert_path.exists() {
                let path_str = cert_path.to_string_lossy().to_string();
                info!("Found mkcert certificate at: {}", path_str);
                return Ok(path_str);
            }
        }

        Err(anyhow!(
            "mkcert certificate not found at ~/Library/Application Support/mkcert/rootCA.pem\n\
             Please install mkcert and generate certificates with 'mkcert -install'"
        ))
    }
}
