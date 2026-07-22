use anyhow::{anyhow, Context, Result};
use bytes::Bytes;
use reqwest::Client;
use std::io::Cursor;
use tokio::time::Duration;
use tracing::{info, warn};

use crate::config::updater_config::{
    DOWNLOAD_TIMEOUT_SECS, MAX_DOWNLOAD_RETRIES, MIN_BINARY_SIZE_BYTES,
};
use crate::models::DownloadConfiguration;

#[derive(Clone)]
pub struct GithubDownloadService {
    http_client: Client,
}

impl GithubDownloadService {
    pub fn new(http_client: Client) -> Self {
        Self { http_client }
    }

    /// Downloads the archive for `config` and extracts the client binary from it.
    /// Returns raw binary bytes ready to be written to disk.
    pub async fn download_and_extract(&self, config: &DownloadConfiguration) -> Result<Bytes> {
        info!("Downloading from: {}", config.link);

        let archive_bytes = self
            .download_with_retry(&config.link)
            .await
            .with_context(|| format!("Failed to download from: {}", config.link))?;

        info!("Downloaded {} bytes", archive_bytes.len());

        if archive_bytes.len() < MIN_BINARY_SIZE_BYTES as usize {
            return Err(anyhow!(
                "Downloaded archive too small ({} bytes, minimum {})",
                archive_bytes.len(),
                MIN_BINARY_SIZE_BYTES
            ));
        }

        let binary_bytes = if config.file_name.ends_with(".zip") {
            info!("Extracting from ZIP: target={}", config.target_file_name);
            self.extract_from_zip(archive_bytes, &config.target_file_name)
                .context("Failed to extract from ZIP archive")?
        } else if config.file_name.ends_with(".tar.gz") || config.file_name.ends_with(".tgz") {
            info!("Extracting from tar.gz: target={}", config.target_file_name);
            self.extract_from_tar_gz(archive_bytes, &config.target_file_name)
                .context("Failed to extract from tar.gz archive")?
        } else {
            return Err(anyhow!("Unsupported archive format: {}", config.file_name));
        };

        if binary_bytes.len() < MIN_BINARY_SIZE_BYTES as usize {
            return Err(anyhow!(
                "Extracted binary too small ({} bytes, minimum {})",
                binary_bytes.len(),
                MIN_BINARY_SIZE_BYTES
            ));
        }

        info!(
            "Extracted binary: {} ({} bytes)",
            config.target_file_name,
            binary_bytes.len()
        );
        Ok(binary_bytes)
    }

    /// Returns the `DownloadConfiguration` matching the current OS.
    pub fn find_for_current_os<'a>(
        &self,
        configs: &'a [DownloadConfiguration],
    ) -> Result<&'a DownloadConfiguration> {
        configs
            .iter()
            .find(|c| c.matches_current_os())
            .ok_or_else(|| anyhow!("No download configuration for current OS"))
    }

    // ── internals ──────────────────────────────────────────────────────────

    async fn download_with_retry(&self, url: &str) -> Result<Bytes> {
        let mut last_error = None;

        for attempt in 1..=MAX_DOWNLOAD_RETRIES {
            info!("Download attempt {}/{}: {}", attempt, MAX_DOWNLOAD_RETRIES, url);

            match tokio::time::timeout(
                Duration::from_secs(DOWNLOAD_TIMEOUT_SECS),
                self.download(url),
            )
            .await
            {
                Ok(Ok(bytes)) => {
                    info!("Download succeeded on attempt {}", attempt);
                    return Ok(bytes);
                }
                Ok(Err(e)) => {
                    if e.to_string().contains("429") {
                        warn!("GitHub rate limit (429) — trying jsDelivr CDN fallback");
                        let cdn_url = Self::github_to_cdn_url(url);
                        info!("CDN URL: {}", cdn_url);

                        match tokio::time::timeout(
                            Duration::from_secs(DOWNLOAD_TIMEOUT_SECS),
                            self.download(&cdn_url),
                        )
                        .await
                        {
                            Ok(Ok(bytes)) => {
                                info!("Downloaded from jsDelivr CDN");
                                return Ok(bytes);
                            }
                            Ok(Err(cdn_err)) => {
                                return Err(anyhow!(
                                    "GitHub rate limited and CDN also failed. GitHub: {:#} CDN: {:#}",
                                    e, cdn_err
                                ));
                            }
                            Err(_) => {
                                return Err(anyhow!("GitHub rate limited and CDN timed out"));
                            }
                        }
                    }
                    warn!("Attempt {} failed: {:#}", attempt, e);
                    last_error = Some(e);
                }
                Err(_) => {
                    warn!("Attempt {} timed out after {}s", attempt, DOWNLOAD_TIMEOUT_SECS);
                    last_error = Some(anyhow!("Timeout after {}s", DOWNLOAD_TIMEOUT_SECS));
                }
            }

            if attempt < MAX_DOWNLOAD_RETRIES {
                let delay = attempt * 2;
                info!("Retrying in {}s", delay);
                tokio::time::sleep(Duration::from_secs(delay as u64)).await;
            }
        }

        Err(last_error.unwrap_or_else(|| anyhow!("Download failed after {} attempts", MAX_DOWNLOAD_RETRIES)))
    }

    async fn download(&self, url: &str) -> Result<Bytes> {
        let response = self
            .http_client
            .get(url)
            .send()
            .await
            .context("Failed to send request")?;

        if !response.status().is_success() {
            return Err(anyhow!("HTTP {} — {}", response.status(), url));
        }

        response.bytes().await.context("Failed to read response bytes")
    }

    fn github_to_cdn_url(github_url: &str) -> String {
        github_url
            .replace("github.com/", "cdn.jsdelivr.net/gh/")
            .replace("/releases/download/", "@")
    }

    #[cfg(target_os = "windows")]
    fn extract_from_zip(&self, archive_bytes: Bytes, target_filename: &str) -> Result<Bytes> {
        use zip::ZipArchive;

        let cursor = Cursor::new(archive_bytes);
        let mut archive = ZipArchive::new(cursor).context("Failed to open ZIP")?;

        for i in 0..archive.len() {
            let mut entry = archive.by_index(i).context("Failed to read ZIP entry")?;
            let name = entry.name().to_string();

            if name.to_lowercase().ends_with(&target_filename.to_lowercase()) {
                info!("Found in ZIP: {}", name);
                let mut buf = Vec::new();
                std::io::copy(&mut entry, &mut buf).context("Failed to read ZIP entry bytes")?;
                return Ok(Bytes::from(buf));
            }
        }

        Err(anyhow!("'{}' not found in ZIP", target_filename))
    }

    #[cfg(not(target_os = "windows"))]
    fn extract_from_zip(&self, _bytes: Bytes, target: &str) -> Result<Bytes> {
        Err(anyhow!("ZIP extraction not supported on this platform for '{}'", target))
    }

    #[cfg(not(target_os = "windows"))]
    fn extract_from_tar_gz(&self, archive_bytes: Bytes, target_filename: &str) -> Result<Bytes> {
        use flate2::read::GzDecoder;
        use tar::Archive;

        let cursor = Cursor::new(archive_bytes);
        let mut archive = Archive::new(GzDecoder::new(cursor));

        for entry_result in archive.entries().context("Failed to read tar entries")? {
            let mut entry = entry_result.context("Failed to read tar entry")?;
            let path = entry.path().context("Failed to get entry path")?;

            let basename = path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            if basename.eq_ignore_ascii_case(target_filename) && !basename.starts_with("._") {
                info!("Found in tar.gz: {}", path.display());
                let mut buf = Vec::new();
                std::io::copy(&mut entry, &mut buf)
                    .context("Failed to read tar entry bytes")?;
                return Ok(Bytes::from(buf));
            }
        }

        Err(anyhow!("'{}' not found in tar.gz", target_filename))
    }

    #[cfg(target_os = "windows")]
    fn extract_from_tar_gz(&self, _bytes: Bytes, target: &str) -> Result<Bytes> {
        Err(anyhow!("tar.gz extraction not supported on Windows for '{}'", target))
    }
}
