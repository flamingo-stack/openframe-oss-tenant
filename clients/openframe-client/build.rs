fn main() {
    forward_required("OPENFRAME_VERSION");

    #[cfg(feature = "openframe-chat-version")]
    forward_required("OPENFRAME_CHAT_VERSION");
    #[cfg(feature = "meshcentral-agent-version")]
    forward_required("MESHCENTRAL_AGENT_VERSION");
    #[cfg(feature = "fleetmdm-agent-version")]
    forward_required("FLEETMDM_AGENT_VERSION");
    #[cfg(feature = "tacticalrmm-agent-version")]
    forward_required("TACTICALRMM_AGENT_VERSION");
    #[cfg(feature = "osquery-version")]
    forward_required("OSQUERY_VERSION");
}

#[allow(dead_code)]
fn forward_required(var: &str) {
    println!("cargo:rerun-if-env-changed={var}");
    let value = std::env::var(var).unwrap_or_else(|_| {
        panic!("{var} environment variable must be set at build time")
    });
    println!("cargo:rustc-env={var}={value}");
}
