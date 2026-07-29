/// Looks up the compile-time version associated with a tool key.
///
/// # Examples
///
/// ```
/// assert_eq!(lookup("unknown-tool"), None);
/// ```
///
/// # Returns
///
/// `Some` containing the tool version when the key identifies an enabled tool,
/// or `None` when no enabled tool matches the key.
#[allow(unused_variables)]
pub fn lookup(tool_key: &str) -> Option<&'static str> {
    match tool_key {
        #[cfg(feature = "openframe-chat-version")]
        "openframe-chat" => Some(env!("OPENFRAME_CHAT_VERSION")),

        #[cfg(feature = "meshcentral-agent-version")]
        "meshcentral-server" => Some(env!("MESHCENTRAL_AGENT_VERSION")),

        #[cfg(feature = "fleetmdm-agent-version")]
        "fleetmdm-server" => Some(env!("FLEETMDM_AGENT_VERSION")),

        #[cfg(feature = "osquery-version")]
        "osqueryd" => Some(env!("OSQUERY_VERSION")),

        #[cfg(feature = "openframe-client-updater-version")]
        "openframe-client-updater" => Some(env!("OPENFRAME_CLIENT_UPDATER_VERSION")),

        _ => None,
    }
}
