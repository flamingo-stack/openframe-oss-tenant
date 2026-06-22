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
mod tests {
    use super::*;

    #[test]
    fn guard_removes_file_on_drop() {
        let path = std::env::temp_dir().join(temp_script_name("sh"));
        std::fs::write(&path, b"x").unwrap();
        assert!(path.exists());
        {
            let _guard = TempFileGuard { path: path.clone() };
        }
        assert!(!path.exists());
    }

    #[test]
    fn names_are_unique() {
        assert_ne!(temp_script_name("ps1"), temp_script_name("ps1"));
    }
}
