// Thin entry point for the OpenFrame client.
// All logic lives in the openframe-agent-lib library (crate name `openframe`),
// shared from https://github.com/flamingo-stack/openframe-oss-lib.
//
// Build requires OPENFRAME_VERSION at build time (consumed by the library's build script):
//   OPENFRAME_VERSION=0.0.0-dev cargo build --release
fn main() -> anyhow::Result<()> {
    openframe::run()
}
