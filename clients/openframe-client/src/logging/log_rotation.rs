use std::fs::{self, File};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use flate2::write::GzEncoder;
use flate2::Compression;
use tracing::{error, info};

const MAX_LOG_FILE_SIZE: u64 = 10 * 1024 * 1024; // 10 MB
const ARCHIVED_LOG_NAME: &str = "openframe.log.gz";

pub struct LogRotationManager {
    log_file_path: PathBuf,
    offset_file_path: PathBuf,
}

impl LogRotationManager {
    pub fn new(log_file_path: PathBuf, offset_file_path: PathBuf) -> Self {
        Self {
            log_file_path,
            offset_file_path,
        }
    }

    /// Rotate if all logs streamed and file exceeds size limit
    pub fn rotate_if_ready(&self, current_offset: &mut u64) {
        let file_size = match fs::metadata(&self.log_file_path) {
            Ok(m) => m.len(),
            Err(_) => return,
        };

        if *current_offset >= file_size && file_size >= MAX_LOG_FILE_SIZE {
            info!("All logs streamed, rotating log file (size: {} bytes)", file_size);
            if let Err(e) = self.rotate() {
                error!("Failed to rotate log file: {:#}", e);
            } else {
                *current_offset = 0;
                self.save_offset(0);
                info!("Log rotation completed, offset reset");
            }
        }
    }

    pub fn load_offset(&self) -> u64 {
        fs::read_to_string(&self.offset_file_path)
            .ok()
            .and_then(|s| s.trim().parse().ok())
            .unwrap_or(0)
    }

    pub fn save_offset(&self, offset: u64) {
        if let Err(e) = fs::write(&self.offset_file_path, offset.to_string()) {
            error!("Failed to save log offset: {:#}", e);
        }
    }

    fn rotate(&self) -> io::Result<()> {
        let log_dir = self.log_file_path.parent().unwrap_or(Path::new("."));
        let archive_path = log_dir.join(ARCHIVED_LOG_NAME);

        if archive_path.exists() {
            let _ = fs::remove_file(&archive_path);
        }

        let contents = fs::read(&self.log_file_path)?;

        let output = File::create(&archive_path)?;
        let mut encoder = GzEncoder::new(output, Compression::default());
        encoder.write_all(&contents)?;
        encoder.finish()?;

        // Truncate original file
        File::create(&self.log_file_path)?;

        Ok(())
    }
}
