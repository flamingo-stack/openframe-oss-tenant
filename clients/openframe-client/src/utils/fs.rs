use std::io::Write;
use std::path::Path;

use anyhow::{Context, Result};
use tempfile::NamedTempFile;

/// Write `contents` to `path` atomically via a same-dir temp file + rename, so a concurrent
/// writer or reader never observes a torn file.
pub fn atomic_write(path: &Path, contents: impl AsRef<[u8]>) -> Result<()> {
    let parent = path.parent().context("path has no parent directory")?;
    std::fs::create_dir_all(parent)?;

    let mut tmp = NamedTempFile::new_in(parent)
        .with_context(|| format!("failed to create temp file in {}", parent.display()))?;
    tmp.write_all(contents.as_ref())?;
    // NamedTempFile defaults to 0o600; restore fs::write's 0o644 so user processes can read.
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        tmp.as_file()
            .set_permissions(std::fs::Permissions::from_mode(0o644))?;
    }
    // persist() atomically replaces any existing file at `path` (MoveFileEx on Windows).
    tmp.persist(path)
        .with_context(|| format!("failed to persist temp file to {}", path.display()))?;
    Ok(())
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;
    use std::os::unix::fs::PermissionsExt;

    #[test]
    fn atomic_write_sets_644_and_self_heals() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("token.enc");

        atomic_write(&path, b"first").unwrap();
        assert_eq!(
            std::fs::metadata(&path).unwrap().permissions().mode() & 0o777,
            0o644
        );

        // A pre-existing owner-only file must be corrected on the next write, not preserved.
        std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600)).unwrap();
        atomic_write(&path, b"second").unwrap();
        assert_eq!(
            std::fs::metadata(&path).unwrap().permissions().mode() & 0o777,
            0o644
        );
        assert_eq!(std::fs::read(&path).unwrap(), b"second");
    }
}
