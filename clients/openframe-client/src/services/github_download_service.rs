use anyhow::{Context, Result, anyhow};
use tracing::{info, debug};
use crate::models::download_configuration::DownloadConfiguration;
use reqwest::Client;
use bytes::Bytes;
use std::io::Cursor;

#[derive(Clone)]
pub struct GithubDownloadService {
    http_client: Client,
}

impl GithubDownloadService {
    pub fn new(http_client: Client) -> Self {
        Self { http_client }
    }

    /// Downloads and extracts agent binary from the given download configuration
    /// Returns the binary bytes ready to be written to disk
    pub async fn download_and_extract(&self, config: &DownloadConfiguration) -> Result<Bytes> {
        info!("Downloading from: {}", config.link);
        
        // Download the archive
        let archive_bytes = self.download(&config.link).await
            .with_context(|| format!("Failed to download from: {}", config.link))?;
        
        info!("Downloaded {} bytes", archive_bytes.len());
        
        // Extract based on file extension
        let binary_bytes = if config.file_name.ends_with(".zip") {
            self.extract_from_zip(archive_bytes, &config.agent_file_name)
                .with_context(|| "Failed to extract from ZIP archive")?
        } else if config.file_name.ends_with(".tar.gz") || config.file_name.ends_with(".tgz") {
            self.extract_from_tar_gz(archive_bytes, &config.agent_file_name)
                .with_context(|| "Failed to extract from tar.gz archive")?
        } else {
            return Err(anyhow!("Unsupported archive format: {}", config.file_name));
        };
        
        info!("Extracted binary: {} ({} bytes)", config.agent_file_name, binary_bytes.len());
        
        Ok(binary_bytes)
    }

    /// Downloads file from URL and returns bytes
    async fn download(&self, url: &str) -> Result<Bytes> {
        let response = self.http_client
            .get(url)
            .send()
            .await
            .context("Failed to send download request")?;
        
        if !response.status().is_success() {
            return Err(anyhow!(
                "Download failed with status: {} - URL: {}",
                response.status(),
                url
            ));
        }
        
        let bytes = response.bytes().await
            .context("Failed to read response bytes")?;
        
        Ok(bytes)
    }

    /// Extracts a file from ZIP archive
    #[cfg(target_os = "windows")]
    fn extract_from_zip(&self, archive_bytes: Bytes, target_filename: &str) -> Result<Bytes> {
        use zip::ZipArchive;
        
        debug!("Extracting {} from ZIP archive", target_filename);
        
        let cursor = Cursor::new(archive_bytes);
        let mut archive = ZipArchive::new(cursor)
            .context("Failed to read ZIP archive")?;
        
        // Search for the target file in the archive
        for i in 0..archive.len() {
            let mut file = archive.by_index(i)
                .context("Failed to read ZIP entry")?;
            
            let file_name = file.name().to_string();
            debug!("Found file in ZIP: {}", file_name);
            
            // Check if this is the target file (case-insensitive, check basename)
            if file_name.to_lowercase().ends_with(&target_filename.to_lowercase()) {
                info!("Found target file: {}", file_name);
                
                let mut buffer = Vec::new();
                std::io::copy(&mut file, &mut buffer)
                    .context("Failed to read file from ZIP")?;
                
                return Ok(Bytes::from(buffer));
            }
        }
        
        Err(anyhow!("File '{}' not found in ZIP archive", target_filename))
    }

    /// Placeholder for non-Windows platforms
    #[cfg(not(target_os = "windows"))]
    fn extract_from_zip(&self, _archive_bytes: Bytes, target_filename: &str) -> Result<Bytes> {
        Err(anyhow!("ZIP extraction not supported on this platform. Expected tar.gz for {}", target_filename))
    }

    /// Extracts a file from tar.gz archive
    #[cfg(not(target_os = "windows"))]
    fn extract_from_tar_gz(&self, archive_bytes: Bytes, target_filename: &str) -> Result<Bytes> {
        use flate2::read::GzDecoder;
        use tar::Archive;
        
        debug!("Extracting {} from tar.gz archive", target_filename);
        
        let cursor = Cursor::new(archive_bytes);
        let decoder = GzDecoder::new(cursor);
        let mut archive = Archive::new(decoder);
        
        // Search for the target file in the archive
        for entry_result in archive.entries().context("Failed to read tar entries")? {
            let mut entry = entry_result.context("Failed to read tar entry")?;
            
            let path = entry.path().context("Failed to get entry path")?;
            let file_name = path.to_string_lossy().to_string();
            debug!("Found file in tar.gz: {}", file_name);
            
            // Check if this is the target file (case-insensitive, check basename)
            if file_name.to_lowercase().ends_with(&target_filename.to_lowercase()) {
                info!("Found target file: {}", file_name);
                
                let mut buffer = Vec::new();
                std::io::copy(&mut entry, &mut buffer)
                    .context("Failed to read file from tar.gz")?;
                
                return Ok(Bytes::from(buffer));
            }
        }
        
        Err(anyhow!("File '{}' not found in tar.gz archive", target_filename))
    }

    /// Placeholder for Windows platform
    #[cfg(target_os = "windows")]
    fn extract_from_tar_gz(&self, _archive_bytes: Bytes, target_filename: &str) -> Result<Bytes> {
        Err(anyhow!("tar.gz extraction not supported on Windows. Expected ZIP for {}", target_filename))
    }

    /// Finds the appropriate download configuration for the current OS
    pub fn find_config_for_current_os(configs: &[DownloadConfiguration]) -> Result<&DownloadConfiguration> {
        configs.iter()
            .find(|c| c.matches_current_os())
            .ok_or_else(|| anyhow!("No download configuration found for current OS"))
    }
}

