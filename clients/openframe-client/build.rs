fn main() {
    let version = std::env::var("BUILD_VERSION")
        .unwrap_or_else(|_| std::env::var("CARGO_PKG_VERSION").unwrap_or_else(|_| "dev".into()));

    println!("cargo:rustc-env=APP_VERSION={}", version);

    #[cfg(windows)]
    embed_resource::compile("resources.rc", embed_resource::NONE);
}
