fn main() {
    let version = std::env::var("OPENFRAME_UPDATER_VERSION").unwrap_or_else(|_| "0.1.0".to_string());
    println!("cargo:rustc-env=OPENFRAME_UPDATER_VERSION={version}");
    println!("cargo:rerun-if-env-changed=OPENFRAME_UPDATER_VERSION");
}
