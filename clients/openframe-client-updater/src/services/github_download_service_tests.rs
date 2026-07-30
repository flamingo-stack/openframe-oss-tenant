use super::*;

fn service() -> GithubDownloadService {
    GithubDownloadService::new(Client::new())
}

fn config(os: &str) -> DownloadConfiguration {
    DownloadConfiguration {
        os: os.to_string(),
        file_name: "archive".to_string(),
        target_file_name: "openframe-client".to_string(),
        link: "https://example.com/archive".to_string(),
    }
}

#[test]
fn cdn_fallback_rewrites_github_release_urls() {
    let github = "https://github.com/flamingo-stack/openframe-oss-tenant/releases/download/1.2.3/openframe-client_windows.zip";
    assert_eq!(
        GithubDownloadService::github_to_cdn_url(github),
        "https://cdn.jsdelivr.net/gh/flamingo-stack/openframe-oss-tenant@1.2.3/openframe-client_windows.zip"
    );
}

#[test]
fn cdn_fallback_leaves_non_github_urls_alone() {
    let url = "https://downloads.example.com/openframe-client.zip";
    assert_eq!(GithubDownloadService::github_to_cdn_url(url), url);
}

#[test]
fn find_for_current_os_picks_the_matching_config() {
    let current = if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "linux"
    };
    let configs = vec![config("solaris"), config(current)];
    let found = service().find_for_current_os(&configs).unwrap();
    assert_eq!(found.os, current);
}

#[test]
fn find_for_current_os_errors_when_nothing_matches() {
    assert!(service().find_for_current_os(&[config("solaris")]).is_err());
}

#[cfg(target_os = "windows")]
#[test]
fn extracts_target_from_zip_by_suffix() {
    use std::io::Write;
    use zip::write::FileOptions;

    let mut writer = zip::ZipWriter::new(Cursor::new(Vec::new()));
    writer
        .start_file("release/OpenFrame-Client.exe", FileOptions::default())
        .unwrap();
    writer.write_all(b"exe-bytes").unwrap();
    writer.start_file("README.md", FileOptions::default()).unwrap();
    writer.write_all(b"docs").unwrap();
    let archive = Bytes::from(writer.finish().unwrap().into_inner());

    let extracted = service()
        .extract_from_zip(archive, "openframe-client.exe")
        .unwrap();
    assert_eq!(extracted.as_ref(), b"exe-bytes");
}

#[cfg(target_os = "windows")]
#[test]
fn zip_extraction_errors_when_target_absent() {
    use std::io::Write;
    use zip::write::FileOptions;

    let mut writer = zip::ZipWriter::new(Cursor::new(Vec::new()));
    writer.start_file("other.bin", FileOptions::default()).unwrap();
    writer.write_all(b"x").unwrap();
    let archive = Bytes::from(writer.finish().unwrap().into_inner());

    assert!(service()
        .extract_from_zip(archive, "openframe-client.exe")
        .is_err());
}

#[cfg(not(target_os = "windows"))]
#[test]
fn extracts_target_from_tar_gz_by_basename() {
    use flate2::write::GzEncoder;
    use flate2::Compression;

    let gz = GzEncoder::new(Vec::new(), Compression::default());
    let mut builder = tar::Builder::new(gz);

    // AppleDouble sidecar (._name) comes first and must be skipped.
    let mut sidecar = tar::Header::new_gnu();
    sidecar.set_size(4);
    sidecar.set_mode(0o644);
    sidecar.set_cksum();
    builder
        .append_data(&mut sidecar, "release/._openframe-client", &b"meta"[..])
        .unwrap();

    let payload = b"elf-bytes";
    let mut header = tar::Header::new_gnu();
    header.set_size(payload.len() as u64);
    header.set_mode(0o755);
    header.set_cksum();
    builder
        .append_data(&mut header, "release/OpenFrame-Client", &payload[..])
        .unwrap();

    let archive = Bytes::from(builder.into_inner().unwrap().finish().unwrap());

    let extracted = service()
        .extract_from_tar_gz(archive, "openframe-client")
        .unwrap();
    assert_eq!(extracted.as_ref(), b"elf-bytes");
}

#[cfg(not(target_os = "windows"))]
#[test]
fn tar_gz_extraction_errors_when_target_absent() {
    use flate2::write::GzEncoder;
    use flate2::Compression;

    let gz = GzEncoder::new(Vec::new(), Compression::default());
    let mut builder = tar::Builder::new(gz);
    let mut header = tar::Header::new_gnu();
    header.set_size(1);
    header.set_cksum();
    builder.append_data(&mut header, "other", &b"x"[..]).unwrap();
    let archive = Bytes::from(builder.into_inner().unwrap().finish().unwrap());

    assert!(service().extract_from_tar_gz(archive, "openframe-client").is_err());
}
