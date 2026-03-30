fn main() {
    println!("cargo:rerun-if-env-changed=OPENFRAME_VERSION");

    let version = std::env::var("OPENFRAME_VERSION")
        .expect("OPENFRAME_VERSION environment variable must be set at build time");
    println!("cargo:rustc-env=OPENFRAME_VERSION={}", version);
}
