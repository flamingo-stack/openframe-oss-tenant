# Startup Initialization

Startup Initialization reconciles management-owned baseline state through Spring Boot `ApplicationRunner` components. Each runner is safe to re-run: creation services ensure missing material exists, configuration services update fields from packaged resources, and recoverable initialization failures are logged.

## Initialization Responsibilities

| Initializer | Responsibility |
| --- | --- |
| [AgentLogKeyInitializer](https://github.com/flamingo-stack/openframe-oss-lib/blob/16e7c1cbd9664e7d10ec5ebca7d53c9bd314decf/openframe-management-service-core/src/main/java/com/openframe/management/initializer/AgentLogKeyInitializer.java) | Creates an agent log key if it does not exist. |
| [AgentRegistrationSecretInitializer](https://github.com/flamingo-stack/openframe-oss-lib/blob/16e7c1cbd9664e7d10ec5ebca7d53c9bd314decf/openframe-management-service-core/src/main/java/com/openframe/management/initializer/AgentRegistrationSecretInitializer.java) | Creates the initial agent-registration secret. |
| [NatsStreamConfigurationInitializer](https://github.com/flamingo-stack/openframe-oss-lib/blob/16e7c1cbd9664e7d10ec5ebca7d53c9bd314decf/openframe-management-service-core/src/main/java/com/openframe/management/initializer/NatsStreamConfigurationInitializer.java) | Saves required JetStream configurations and tries to remove obsolete streams. |
| [IntegratedToolAgentInitializer](https://github.com/flamingo-stack/openframe-oss-lib/blob/16e7c1cbd9664e7d10ec5ebca7d53c9bd314decf/openframe-management-service-core/src/main/java/com/openframe/management/initializer/IntegratedToolAgentInitializer.java) | Imports tool-agent configuration resources and applies configured Mesh, Fleet, and osquery version overrides. |
| [OpenFrameClientConfigurationInitializer](https://github.com/flamingo-stack/openframe-oss-lib/blob/16e7c1cbd9664e7d10ec5ebca7d53c9bd314decf/openframe-management-service-core/src/main/java/com/openframe/management/initializer/OpenFrameClientConfigurationInitializer.java) | Imports the packaged OpenFrame client configuration. |
| [OpenFrameClientVersionInitializer](https://github.com/flamingo-stack/openframe-oss-lib/blob/16e7c1cbd9664e7d10ec5ebca7d53c9bd314decf/openframe-management-service-core/src/main/java/com/openframe/management/initializer/OpenFrameClientVersionInitializer.java) | Processes the deployment-configured client version after agent and client documents exist. |
| [OpenFrameClientFeatureFlagsInitializer](https://github.com/flamingo-stack/openframe-oss-lib/blob/16e7c1cbd9664e7d10ec5ebca7d53c9bd314decf/openframe-management-service-core/src/main/java/com/openframe/management/initializer/OpenFrameClientFeatureFlagsInitializer.java) | Applies configured feature flags after client-version initialization. |

## NATS Stream Ownership

The initializer manages streams for tool connections, installed agents, hostname and timezone reports, execution acknowledgements, delivery results, package-manager reports, and package-update status. It also asks `AdditionalStreamConfigurationProvider` for extensions. This tenant application supplies `NoAdditionalStreamConfigurationProvider`, so no additional streams are added.

Removed legacy streams are deleted best-effort. An exception during deletion does not prevent startup; a later restart retries it.
