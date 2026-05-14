pub mod agent_configuration_service;
pub mod client_update_service;
pub mod encryption_service;
pub mod github_download_service;
pub mod initial_configuration_service;
pub mod local_tls_config_provider;
pub mod nats_connection_manager;
pub mod nats_message_publisher;
pub mod service_manager_service;
pub mod token_watcher;
pub mod update_progress_publisher;
pub mod updater_orchestrator;
pub mod updater_state_service;

// Kept but no longer wired into the main flow — available for future use.
pub mod agent_auth_service;
pub mod shared_token_service;

pub use agent_configuration_service::AgentConfigurationService;
pub use client_update_service::ClientUpdateService;
pub use encryption_service::EncryptionService;
pub use github_download_service::GithubDownloadService;
pub use initial_configuration_service::InitialConfigurationService;
pub use local_tls_config_provider::LocalTlsConfigProvider;
pub use nats_connection_manager::NatsConnectionManager;
pub use nats_message_publisher::NatsMessagePublisher;
pub use service_manager_service::ServiceManagerService;
pub use update_progress_publisher::UpdateProgressPublisher;
pub use updater_state_service::UpdaterStateService;
