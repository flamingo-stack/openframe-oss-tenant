
# First Steps

This page walks through what to do right after you have an OpenFrame OSS Tenant environment deployed. It assumes you have already completed [Prerequisites](./prerequisites.md) and worked through [Quick Start](./quick-start.md) to get the platform running on a cluster. If you have not deployed anything yet, start there first — this page picks up once the Argo CD `app-of-apps` has synced and the tenant chart is running.

> OpenFrame OSS Tenant is the deployable, tenant-oriented distribution of [OpenFrame](https://openframe.ai) ([www.flamingo.run/openframe](https://www.flamingo.run/openframe)), built by [Flamingo](https://flamingo.run). It assembles Spring Boot services, a Rust endpoint agent, shared configuration, Helm charts, and Argo CD application definitions into a single MSP operations platform.

[![Getting Started with OpenFrame - Organization Setup Basics](https://img.youtube.com/vi/-_56_qYvMWk/maxresdefault.jpg)](https://www.youtube.com/watch?v=-_56_qYvMWk)

## First 5 things to do after installation

### 1. Confirm every service came up healthy

OpenFrame OSS Tenant is a multi-service platform: `openframe-api`, `openframe-authorization-server`, `openframe-client`, `openframe-config`, `openframe-external-api`, `openframe-gateway`, `openframe-management`, and `openframe-stream` are all separate Spring Boot applications assembled from this repository's `openframe/services` directory, plus the Rust-based endpoint agent (`openframe_client` cargo crate under `clients/openframe-client`).

Check that the Argo CD applications defined in `manifests/apps/values.yaml` have synced in the expected order: the `platform` wave (namespace, ingress-nginx, dev-tools, openframe-config) and the `datasources` wave (Cassandra, Kafka, MongoDB, MongoDB for MeshCentral, MySQL for FleetMDM, NATS, Pinot, Redis Cluster, Zookeeper, Debezium Connect) both need to be healthy before the `manifests/tenant` chart's workloads can start cleanly, since every service depends on the config server and the datasources.

Each service exposes a health/metrics surface under its `management` base path, configured in `configs/base/application.yml` (`management.base-path: /management`, with `health`, `info`, `metrics`, and `prometheus` endpoints exposed). Use these to verify the services are actually serving traffic, not just that their pods are `Running`.

### 2. Verify the Config Server is reachable

`openframe-config` is the Spring Cloud Config Server at the center of configuration delivery — every other service imports configuration from it at startup (see the `spring.config.import` entries in each service's `application.yml`, which default to `http://openframe-config.microservices.svc.cluster.local:8888`). It is implemented by the `openframe-config-core` library and documented in [Config Core](../reference/architecture/config-core/config-core.md).

Confirm the Config Server can serve shared Logback configuration at `/logging/{filename}` — services point `logging.config` at `${SPRING_CONFIG_URL}/logging/shared-logback-spring-logfmt.xml` by default (see `configs/base/application.yml`). If this call fails, every dependent service will fail to apply shared logging configuration on boot.

### 3. Walk the gateway routes

The `openframe-gateway` service is the single public entry point. Its routes are defined in `configs/base/openframe-gateway.yml`:

| Path prefix | Destination service |
|---|---|
| `/sas/**` | `openframe-authorization-server` |
| `/api/**` | `openframe-api` |
| `/api-docs/**` | `openframe-external-api` |
| `/clients/**` | `openframe-client` |
| `/**` | frontend workload |

Hit each route once after deployment to confirm routing works end-to-end rather than checking each service in isolation — a gateway misconfiguration is otherwise easy to miss.

### 4. Review the shared datasource configuration

`configs/base/application.yml` centralizes MongoDB, Redis Cluster, Cassandra, and Pinot connection settings shared by every service, plus service-specific files (`configs/base/openframe-api.yml`, `openframe-client.yml`, `openframe-external-api.yml`, `openframe-management.yml`, `openframe-stream.yml`) that add Kafka and NATS endpoints. Confirm these datasource hostnames resolve inside your cluster — they are all namespaced to `datasources.svc.cluster.local` (for example `mongodb-0.mongodb.datasources.svc.cluster.local`, `kafka.datasources.svc.cluster.local`, `nats.datasources.svc.cluster.local`).

If you changed any datasource topology from the defaults shipped in `manifests/datasources`, update the corresponding values here before moving on, since nearly every service depends on these shared settings.

### 5. Install and register your first endpoint agent

The Rust-based `openframe-client` binary (cargo package `openframe_client`, defined in `clients/openframe-client/Cargo.toml`) is the agent that runs on managed endpoints. It talks to the `openframe-client` server-side service through the gateway's `/clients/**` route, authenticating and registering through the server controllers documented in [Client Core Server Controllers](../reference/architecture/client-core-server-controllers/client-core-server-controllers.md).

The agent's build and distribution are managed by the external [OpenFrame CLI](https://github.com/flamingo-stack/openframe-cli) tooling — see that repository's [installation instructions](https://github.com/flamingo-stack/openframe-cli#installation) and [documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs) for installing the agent on a target machine. Do not look for agent packaging inside this repository; the CLI is maintained separately.

Once an agent registers, you should see it emit connection, heartbeat, and inventory events consumed by the client-service listeners (`ClientConnectionListener`, `MachineHeartbeatListener`, `InstalledAgentListener`, and related NATS consumers described in [Client Core Server Controllers](../reference/architecture/client-core-server-controllers/client-core-server-controllers.md)).

## Common initial configuration

### Config Server and logging

Every service reads `spring.config.import` from its own `src/main/resources/application.yml` to pull centralized configuration from `openframe-config` (see for example `openframe/services/openframe-api/src/main/resources/application.yml` and the equivalent files for the authorization server and client service). If you run services outside the default in-cluster hostnames, override `SPRING_CONFIG_URL` per service.

Shared cross-cutting settings live in `configs/base/application.yml`:

- **Security defaults** — OAuth2 token expirations (`security.oauth2.token.access.expiration-seconds`, `.refresh.expiration-seconds`, `.refresh.max-refresh-count`) and encryption settings (`security.encryption.password`, `security.encryption.salt`). Replace the shipped defaults with values from your own environment configuration before running anything beyond local evaluation — never reuse the sample values checked into the repository.
- **Tenant isolation** — `openframe.tenant-isolation.enabled: true` is required; the shared libraries this platform depends on (`openframe-data-mongo-sync` and related modules, version `7.0.11`) register tenant-aware repositories only when this flag is on, and every Java service will fail to start without it.
- **Delivery engine defaults** — `openframe.delivery.*` controls dispatch batching, retry backoff, offline behavior, and TTL for the machine delivery engine. The sweep job is disabled by default (`openframe.delivery.sweep.enabled: false`); enable it explicitly if your deployment needs the periodic redelivery sweep.
- **Feature toggles** — `openframe.client.update.feature.enabled` and `openframe.tool-agent.update.feature.enabled` gate forced client and tool-agent update flows.

### Datasource and messaging endpoints

Confirm the per-service datasource wiring matches your cluster:

- `openframe-api`, `openframe-client`, `openframe-external-api`, `openframe-management`, and `openframe-stream` each read Kafka bootstrap servers from `spring.oss-tenant.kafka.bootstrap-servers` and NATS from `nats.spring.server`, both defaulting to the in-cluster `datasources.svc.cluster.local` services.
- Pinot controller/broker URLs and the Debezium connector endpoint are also defined in `configs/base/application.yml`.

### Helm chart values

The tenant chart at `manifests/tenant` deploys the OpenFrame services together with Fleet MDM and MeshCentral, referencing images such as `ghcr.io/flamingo-stack/openframe-oss-tenant/openframe-api`, `openframe-gateway`, `openframe-client`, and the separately published `ghcr.io/flamingo-stack/openframe-oss-frontend/openframe-oss-frontend`. Review `manifests/tenant/values.yaml` for image tags and per-service resource settings before promoting a deployment beyond initial evaluation — the shipped values default to `latest`, which is not suitable for a pinned, repeatable deployment.

The platform-level `openframe-config` chart (`manifests/platform/openframe-config/values.yaml`) and the datasource charts under `manifests/datasources` (Cassandra, Kafka, MongoDB, MySQL for FleetMDM, NATS, Pinot, Redis Cluster, Zookeeper) each carry their own `values.yaml` worth reviewing for storage sizing and credentials appropriate to your environment.

## Exploring key features

### GraphQL and REST APIs

`openframe-api` exposes the primary application API for devices, organizations, tickets, knowledge base, automation, and remote-management workflows, built from the `openframe-api-service-core` and `openframe-api-lib` libraries. Its resolvers are organized by domain:

- Core resource fetchers (devices, users, organizations, knowledge base, tags, notifications) — see [Api Service Fetchers](../reference/architecture/api-service-fetchers/api-service-fetchers.md).
- Remote-management fetchers for commands, scripts, schedules, and software inventory, gated behind `openframe.rmm.software.enabled`.
- REST controllers for API keys, organizations, users, invitations, SSO, agent configuration, and knowledge-base images — see [Api Service Config Controllers](../reference/architecture/api-service-config-controllers/api-service-config-controllers.md).

`openframe-external-api` provides integration-oriented REST endpoints (customers, devices, tickets, tools, logs, knowledge base) for API-key-authenticated third-party access — see [External Api Service Core](../reference/architecture/external-api-service-core/external-api-service-core.md).

### Endpoint management and remote monitoring

Once an agent is registered, explore the RMM surfaces: command and script execution, scheduled script runs, and software inventory/bundle dispatch, documented in [Api Service Backend](../reference/architecture/api-service-backend/api-service-backend.md) (dispatch, catalog status) and [Client Core Server Controllers](../reference/architecture/client-core-server-controllers/client-core-server-controllers.md) (agent-side listeners, package-update tracking, scheduled jobs such as `ScheduleScriptScheduler` and `SoftwareScheduleScheduler`).

### Identity and access

`openframe-authorization-server` provides tenant-aware OAuth 2.1 / OpenID Connect, password login, invitations, SSO, and password reset — see [Authorization Service Core](../reference/architecture/authorization-service-core/authorization-service-core.md). Explore SSO provider configuration through the `/sso` REST endpoints exposed by `openframe-api` before connecting an external identity provider.

### Event and data pipeline

`openframe-stream` processes Kafka and CDC events into operational logs (Cassandra/Loki), RMM history, software inventory, and Pinot analytics projections. The overall data flow — agent events through NATS and Kafka, through to Cassandra and Pinot — is diagrammed in [OpenFrame OSS Tenant architecture](../reference/architecture/README.md).

### Explore the full architecture reference

For a complete map of every module this tenant assembles from the OpenFrame OSS Library (gateway core, data repositories, notification mail, security OAuth, and more), see [Reference Architecture](../reference/architecture/README.md) and the per-module pages linked from it, such as [Gateway Core](../reference/architecture/gateway-core/gateway-core.md), [Data Mongo Sync Repositories](../reference/architecture/data-mongo-sync-repositories/data-mongo-sync-repositories.md), and [Openframe Client Core](../reference/architecture/openframe-client-core/openframe-client-core.md).

[![OpenFrame Product Walkthrough (Beta Access)](https://img.youtube.com/vi/awc-yAnkhIo/maxresdefault.jpg)](https://www.youtube.com/watch?v=awc-yAnkhIo)

## Where to get help

OpenFrame OSS Tenant does not use GitHub Issues or GitHub Discussions for support. All community support, questions, and discussion happen on the **OpenMSP Slack community**:

- Community hub: [openmsp.ai](https://www.openmsp.ai/)
- Slack invite: [join.slack.com/t/openmsp](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

For the endpoint agent's own installation and CLI issues, consult the external [OpenFrame CLI repository](https://github.com/flamingo-stack/openframe-cli) and its [documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs) directly — that tooling is maintained separately from this repository.

If you are debugging an issue in the deployed platform itself, these are useful starting points within this repository:

- [`docs/reference/architecture/README.md`](../reference/architecture/README.md) for the end-to-end architecture and gateway routing table.
- `configs/base/application.yml` and the per-service `configs/base/*.yml` files for shared and per-service runtime configuration.
- `manifests/apps/values.yaml` for the Argo CD application wave ordering, and `manifests/tenant/values.yaml` for tenant-chart image and service configuration.
- `.github/workflows/release.yml` for how service images and the `app-of-apps` Helm chart are built and published.

## Next steps for development

If you plan to build or modify this repository rather than only operate a deployment, continue with [Development overview](../development/README.md), the [environment setup guide](../development/setup/environment.md), and [local development](../development/setup/local-development.md). For contribution conventions and testing expectations, see [Contributing guidelines](../development/contributing/guidelines.md) and [Testing](../development/testing/README.md). Security-relevant configuration (encryption keys, tenant isolation, OAuth settings) is covered further in [Security](../development/security/README.md).
