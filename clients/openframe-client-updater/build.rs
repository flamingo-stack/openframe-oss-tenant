/// Configures the build-time updater version from the environment.
///
/// Uses `OPENFRAME_UPDATER_VERSION` when available and falls back to `0.1.0`.
///
/// # Examples
///
/// ```
/// // Cargo invokes this build script automatically.
/// # fn main() {
/// #     println!("cargo:rustc-env=OPENFRAME_UPDATER_VERSION=0.1.0");
/// #     println!("cargo:rerun-if-env-changed=OPENFRAME_UPDATER_VERSION");
/// # }
/// ```
fn main() {
    let version =
        std::env::var("OPENFRAME_UPDATER_VERSION").unwrap_or_else(|_| "0.1.0".to_string());
    println!("cargo:rustc-env=OPENFRAME_UPDATER_VERSION={version}");
    println!("cargo:rerun-if-env-changed=OPENFRAME_UPDATER_VERSION");
}
