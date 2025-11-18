use anyhow::{Context, Result, anyhow};
use tracing::{info, debug, warn};
use crate::models::download_configuration::DownloadConfiguration;
use crate::config::update_config::{
    MAX_DOWNLOAD_RETRIES,
    DOWNLOAD_TIMEOUT_SECS,
    MIN_BINARY_SIZE_BYTES,
};
use reqwest::Client;
use bytes::Bytes;
use std::io::Cursor;
use tokio::time::Duration;

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

        // Download the archive with retry
        let archive_bytes = self.download_with_retry(&config.link).await
            .with_context(|| format!("Failed to download from: {}", config.link))?;

        info!("Downloaded {} bytes", archive_bytes.len());

        // Validate archive size
        if archive_bytes.len() < MIN_BINARY_SIZE_BYTES as usize {
            return Err(anyhow!(
                "Downloaded file too small ({} bytes), minimum expected: {} bytes",
                archive_bytes.len(),
                MIN_BINARY_SIZE_BYTES
            ));
        }

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

        // Validate extracted binary size
        if binary_bytes.len() < MIN_BINARY_SIZE_BYTES as usize {
            return Err(anyhow!(
                "Extracted binary too small ({} bytes), minimum expected: {} bytes",
                binary_bytes.len(),
                MIN_BINARY_SIZE_BYTES
            ));
        }

        info!("Extracted binary: {} ({} bytes)", config.agent_file_name, binary_bytes.len());

        Ok(binary_bytes)
    }

    /// Download with retry logic and timeout
    /// Falls back to jsDelivr CDN if GitHub returns 429 (rate limit)
    async fn download_with_retry(&self, url: &str) -> Result<Bytes> {
        let mut last_error = None;

        for attempt in 1..=MAX_DOWNLOAD_RETRIES {
            info!("Download attempt {}/{} for: {}", attempt, MAX_DOWNLOAD_RETRIES, url);

            match tokio::time::timeout(
                Duration::from_secs(DOWNLOAD_TIMEOUT_SECS),
                self.download(url)
            ).await {
                Ok(Ok(bytes)) => {
                    info!("Download successful on attempt {}", attempt);
                    return Ok(bytes);
                }
                Ok(Err(e)) => {
                    // Check if this is a rate limit error (HTTP 429)
                    if e.to_string().contains("429") {
                        warn!("GitHub rate limit (429) detected on attempt {}", attempt);
                        warn!("Attempting fallback to jsDelivr CDN...");
                        
                        // Convert GitHub URL to jsDelivr CDN URL
                        let cdn_url = self.github_to_cdn_url(url);
                        info!("CDN URL: {}", cdn_url);
                        
                        // Try downloading from CDN
                        match tokio::time::timeout(
                            Duration::from_secs(DOWNLOAD_TIMEOUT_SECS),
                            self.download(&cdn_url)
                        ).await {
                            Ok(Ok(bytes)) => {
                                info!("Successfully downloaded from jsDelivr CDN");
                                return Ok(bytes);
                            }
                            Ok(Err(cdn_err)) => {
                                warn!("CDN fallback also failed: {:#}", cdn_err);
                                return Err(anyhow!(
                                    "GitHub rate limit (429) and CDN fallback failed. GitHub: {:#}, CDN: {:#}",
                                    e, cdn_err
                                ));
                            }
                            Err(_) => {
                                warn!("CDN fallback timed out");
                                return Err(anyhow!(
                                    "GitHub rate limit (429) and CDN fallback timed out"
                                ));
                            }
                        }
                    }
                    
                    warn!("Download attempt {} failed: {:#}", attempt, e);
                    last_error = Some(e);
                }
                Err(_) => {
                    let timeout_err = anyhow!("Download timeout after {} seconds", DOWNLOAD_TIMEOUT_SECS);
                    warn!("Download attempt {} timed out", attempt);
                    last_error = Some(timeout_err);
                }
            }

            // Wait before retry (except on last attempt)
            if attempt < MAX_DOWNLOAD_RETRIES {
                let delay_secs = attempt * 2; // 2, 4, 6 seconds
                info!("Retrying in {} seconds...", delay_secs);
                tokio::time::sleep(Duration::from_secs(delay_secs as u64)).await;
            }
        }

        Err(last_error.unwrap_or_else(|| anyhow!("Download failed after {} attempts", MAX_DOWNLOAD_RETRIES)))
    }

    /// Convert GitHub release URL to jsDelivr CDN URL
    /// Example:
    ///   GitHub:   https://github.com/owner/repo/releases/download/v1.0/file.zip
    ///   jsDelivr: https://cdn.jsdelivr.net/gh/owner/repo@v1.0/file.zip
    fn github_to_cdn_url(&self, github_url: &str) -> String {
        github_url
            .replace("github.com/", "cdn.jsdelivr.net/gh/")
            .replace("/releases/download/", "@")
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

