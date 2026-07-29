use std::path::PathBuf;

pub(crate) struct TempFileGuard {
    pub path: PathBuf,
}

impl Drop for TempFileGuard {
    fn drop(&mut self) {
        if let Err(e) = std::fs::remove_file(&self.path) {
            tracing::warn!(path = %self.path.display(), error = %e, "failed to remove temp script");
        }
    }
}

pub(crate) fn temp_script_name(ext: &str) -> String {
    format!("ofcmd_{}.{}", uuid::Uuid::new_v4().simple(), ext)
}

#[cfg(test)]
#[path = "tempfile_tests.rs"]
mod tests;
