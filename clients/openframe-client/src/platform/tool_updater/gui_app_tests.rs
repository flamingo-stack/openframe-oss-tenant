use super::*;
use std::path::Path;
use crate::platform::DirectoryManager;

#[test]
fn test_find_app_bundle_path() {
    assert_eq!(
        DirectoryManager::find_app_bundle_path(Path::new("/Applications/FAE Chat.app")),
        Some(PathBuf::from("/Applications/FAE Chat.app"))
    );

    assert_eq!(
        DirectoryManager::find_app_bundle_path(Path::new("/Applications/FAE Chat.app/Contents/MacOS/FAE Chat")),
        Some(PathBuf::from("/Applications/FAE Chat.app"))
    );

    assert_eq!(
        DirectoryManager::find_app_bundle_path(Path::new("/usr/bin/some-binary")),
        None
    );
}
