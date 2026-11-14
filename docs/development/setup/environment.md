# Development Environment Setup

OpenFrame OSS Tenant (`flamingo-stack/openframe-oss-tenant`) is a polyglot service repository: Spring Boot/Java services under `openframe/services`, a Rust endpoint-agent client under `clients/openframe-client`, Kubernetes/Helm manifests under `manifests`, and shared runtime configuration under `configs/base`. This guide covers the local tooling, IDE configuration, and environment variables needed to build and debug these components. For a system-wide view of how the services and datastores fit together, see the [architecture overview](../architecture/README.md); for first-run instructions, see [local development](./local-development.md).

> This repository does not commit a Compose file or a bootstrap CLI: the checked-in automation is the `.vscode/` workspace configuration, the Maven reactor (`pom.xml`), and the Rust client crate (`clients/openframe-client/Cargo.toml`). Everything below is grounded in those files.

## 1. Required development tools

| Tool | Why it is needed | Where it is used |
|---|---|---|
| **JDK 25** | The parent POM pins `<java.version>25</java.version>` and inherits from `spring-boot-starter-parent` 4.1.1. All nine Maven modules compile against this JDK. | `pom.xml` |
| **Apache Maven** | The repository is a multi-module Maven reactor rooted at `pom.xml`, with modules under `openframe/services/*`. | `pom.xml`, `openframe/services/*/pom.xml` |
| **Rust toolchain (cargo, rustc)** | The OpenFrame client agent (`openframe-client` binary) is a Cargo package that depends on `openframe-agent-lib` (git dependency, tag `v0.0.5`) from `flamingo-stack/openframe-oss-lib`. | `clients/openframe-client/Cargo.toml`, `clients/openframe-client/src/main.rs` |
| **rust-analyzer** (via `rustup component`) | The workspace settings enable `rust-analyzer` with Clippy-on-save and all-features checking. | `.vscode/settings.json` |
| **lldb** (or an LLDB-compatible debugger, e.g. CodeLLDB) | The VS Code launch configurations use the `lldb` debugger type for every Rust target. | `.vscode/launch.json` |
| **Node.js and npm** | A launch configuration starts the OpenFrame frontend with `npm run dev`, and a workspace task starts a Vue dev server with `npm run dev` on port `5177`. | `.vscode/launch.json`, `.vscode/tasks.json` |
| **kubectl / Helm / Argo CD CLI** | The platform deploys through Helm charts and an Argo CD app-of-apps structure under `manifests/`. Required only when working against a live or local cluster rather than a single service in isolation. | `manifests/apps/values.yaml`, `manifests/tenant`, `manifests/platform`, `manifests/datasources` |
| **Telepresence** | `manifests/platform/dev-tools` packages the `telepresence-oss` Helm chart (`~2.30.1`) for intercepting cluster traffic during local development. | `manifests/platform/dev-tools/Chart.yaml` |
| **lsof / fuser (macOS/Linux) or netstat (Windows)** | The `kill-port-4000` VS Code task uses these to free port `4000` before relaunching the frontend. | `.vscode/tasks.json` |

> The repository has no `docker-compose.yml` and no CLI bootstrap script checked in; the Kubernetes manifests under `manifests/datasources` and `manifests/platform` are the authoritative description of the datastores (MongoDB, Redis Cluster, Cassandra, Kafka, NATS, Pinot, MySQL for Fleet MDM, ZooKeeper) and platform services a full environment needs. Refer to your environment configuration for how your team provisions a cluster.

### Java and Spring Boot specifics

Every service module (`openframe-api`, `openframe-authorization-server`, `openframe-client`, `openframe-config`, `openframe-external-api`, `openframe-gateway`, `openframe-management`, `openframe-stream`, `openframe-test`) inherits from the root `pom.xml`. Key properties declared there that affect your local build:

- `spring-boot.version` = `4.1.1`, `spring-cloud.version` = `2025.1.3`
- `openframe.libs.version` = `7.0.11` — this is the version of every `com.openframe.oss:*` artifact resolved from the [OpenFrame OSS Library](https://github.com/flamingo-stack/openframe-oss-lib) (e.g. `openframe-api-service-core`, `openframe-client-core`, `openframe-config-core`, `openframe-security-core`, `fleetmdm`)
- Lombok (`lombok.version` 1.18.48) and the Spring Boot configuration-processor are wired as annotation processor paths in `maven-compiler-plugin`, because JDK 23+ no longer auto-discovers annotation processors on the classpath

Each service module's own `pom.xml` (for example `openframe/services/openframe-api/pom.xml`, `openframe/services/openframe-client/pom.xml`, `openframe/services/openframe-config/pom.xml`) declares a `<parent>` pointing back at the root with `<relativePath>../../../pom.xml</relativePath>` — always build from the repository root so that relative path resolves.

> **Local shared-library development:** if you are also changing `openframe-oss-lib`, the organization's handshake is to build and `mvn install` it locally as `999-SNAPSHOT` and point this repository's `openframe.libs.version` at that value temporarily, rather than publishing a new snapshot release or rewriting dependency coordinates. Revert the version bump before opening a pull request.

### Rust client specifics

`clients/openframe-client/Cargo.toml` declares the `openframe-client` binary (`src/main.rs`) as a thin wrapper that calls `openframe::run()` — essentially all logic lives in the `openframe-agent-lib` crate, pulled as a git dependency at tag `v0.0.5` from `flamingo-stack/openframe-oss-lib`. The `main.rs` comment notes the build requires `OPENFRAME_VERSION` at build time, consumed by the library's build script:

```bash
OPENFRAME_VERSION=0.0.0-dev cargo build --release
```

Run this from inside the `clients/openframe-client` directory (the VS Code tasks below do this for you via `cwd`).

## 2. IDE recommendations and setup

The repository ships a `.vscode/` folder, which is the clearest signal of the supported editor: **Visual Studio Code**. It is pre-configured for three languages at once — Java, Rust, and Node/TypeScript (frontend) — through `.vscode/settings.json`, `.vscode/launch.json`, and `.vscode/tasks.json`.

### Opening the workspace

Open the repository root in VS Code so the `.vscode/` folder is picked up automatically. The workspace settings in `.vscode/settings.json` apply these conventions:

- `files.eol: "\n"` — always use Unix line endings
- `editor.tabSize: 2` and `editor.insertSpaces: true` as the general default
- Rust files override this to `editor.tabSize: 4` with `editor.formatOnSave: true` and `rust-lang.rust-analyzer` as the default formatter

### Java support

The settings enable:

- `java.debug.settings.hotCodeReplace: "auto"` — hot code replace during debugging
- `java.configuration.updateBuildConfiguration: "automatic"` and `java.autobuild.enabled: true` — the Java language server keeps the Maven project model in sync as you edit POMs
- `java.debug.settings.showLogicalStructure` and `showStaticVariables` — richer debugger variable views
- `java.compile.nullAnalysis.mode: "automatic"` — null-analysis diagnostics

Install the **Extension Pack for Java** (Red Hat / Microsoft) to get the language server, debugger, and Maven integration these settings target.

### Rust support

`rust-analyzer` is configured with:

- `rust-analyzer.checkOnSave.command: "clippy"` — Clippy runs instead of plain `cargo check` on save
- `rust-analyzer.cargo.features: "all"` and `rust-analyzer.cargo.allFeatures: true` — all Cargo features are analyzed
- `rust-analyzer.procMacro.enable: true`, `rust-analyzer.inlayHints.enable: true`, `rust-analyzer.lens.enable: true` — proc-macro expansion, inline type hints, and code lenses (run/debug above functions) are on

Install the **rust-analyzer** extension. For debugging, install **CodeLLDB** (the `vadimcn.vscode-lldb` extension), since `.vscode/launch.json` uses `"type": "lldb"` for every Rust configuration.

### YAML schema validation

`.vscode/settings.json` maps YAML schemas for editing in this repository:

- Argo Workflows JSON schema applied to every `**/*.yml` file
- A local `toc.schema.json` applied to any `toc.yml` file
- The `yamllint` schema as a catch-all

Install the **YAML** extension (Red Hat) to get inline validation and completion against these schemas while editing files under `manifests/` and `configs/base`.

### Recommended extensions summary

| Extension | Purpose |
|---|---|
| Extension Pack for Java | Java language server, Maven integration, debugging |
| rust-analyzer | Rust language server, Clippy-on-save, inlay hints |
| CodeLLDB (`vadimcn.vscode-lldb`) | Required debugger backend for the `lldb` launch configurations |
| YAML (Red Hat) | Schema-validated editing for Argo Workflows / Helm `*.yml` and `toc.yml` files |

## 3. Running and debugging services

### Java services via `.vscode/launch.json`

Six launch configurations target the Spring Boot service `mainClass` entries directly, each setting `cwd` to that service's module directory and activating the `k8s` Spring profile:

| Launch configuration | `mainClass` | `cwd` |
|---|---|---|
| Management Application | `com.openframe.management.ManagementApplication` | `openframe/services/openframe-management` |
| API Application | `com.openframe.api.ApiApplication` | `openframe/services/openframe-api` |
| Client Application | `com.openframe.client.ClientApplication` | `openframe/services/openframe-client` |
| Config Server Application | `com.openframe.config.ConfigServerApplication` | `openframe/services/openframe-config` |
| Stream Application | `com.openframe.stream.StreamApplication` | `openframe/services/openframe-stream` |
| Gateway Application | `com.openframe.gateway.GatewayApplication` | `openframe/services/openframe-gateway` |

Each passes `SPRING_PROFILES_ACTIVE=k8s` both as an environment variable and as a `-Dspring.profiles.active=k8s` VM argument. Every service's `application.yml` (for example `openframe/services/openframe-api/src/main/resources/application.yml`) imports configuration from `optional:configserver:${SPRING_CONFIG_URL:http://openframe-config.microservices.svc.cluster.local:8888}` — so a running `openframe-config` instance (or an equivalent `SPRING_CONFIG_URL` override) is expected for these services to fully initialize outside of tests.

### Rust client via `.vscode/launch.json`

Four Rust-side configurations drive the client binary with `cwd: ${workspaceFolder}/client` (note: this is the VS Code launch `cwd`; the Cargo package itself lives at `clients/openframe-client`, so confirm your checkout layout matches before relying on these verbatim):

- **OpenFrame Client Debug** — runs `preLaunchTask: "rust-build"`, then launches `target/debug/openframe` with args `["run-as-service"]`
- **OpenFrame Client Debug (Service Mode)** — identical debug launch, explicitly labeled for service mode
- **OpenFrame Client Release** — runs `preLaunchTask: "rust-build-release"`, then launches `target/release/openframe` with args `["run"]`
- **OpenFrame Client Tests** — runs `preLaunchTask: "rust-test"`, then launches `target/debug/openframe-test`

### Supporting Cargo tasks (`.vscode/tasks.json`)

| Task label | Command | Notes |
|---|---|---|
| `rust-build` | `cargo build` | Default build task |
| `rust-build-release` | `cargo build --release` | Release build |
| `rust-test` | `cargo test` | Default test task |
| `rust-watch` | `cargo watch -x run` | Background task; requires `cargo-watch` installed (`cargo install cargo-watch`) |
| `rust-check` | `cargo check` | Fast type-check without codegen |
| `rust-clippy` | `cargo clippy` | Lint pass matching the `rust-analyzer.checkOnSave.command` setting |
| `deploy-client` | `./deploy.sh` run from `client/scripts` | Invokes a deployment script relative to the client directory |

### Frontend via `.vscode/launch.json` and tasks

Three Node launch configurations start the OpenFrame frontend with `npm run dev` from `cwd: ${workspaceFolder}/openframe/services/openframe-frontend`, each via the `frontend-with-port-cleanup` compound task (which first runs `kill-port-4000` to free port `4000`, then proceeds). They differ only in the environment block supplied:

- **OpenFrame Frontend with Local K8s Cluster** — points at `https://localhost/api` and related local endpoints
- **OpenFrame Frontend with Dev Configuration** — points at `https://michael.openframe.build` / `https://openframe.build`
- **OpenFrame Frontend with Stage Configuration** — points at `https://test.openframe.miami` / `https://openframe.miami`
- (A fourth, Prod Configuration, points at `https://test.openframe.ai` / `https://openframe.ai`)

A separate workspace task, `start-vue`, runs `npm run dev` from `openframe/services/openframe-ui` with its own environment block (see the environment-variable tables below).

## 4. Environment variables for development

The tables below are drawn directly from `.vscode/launch.json`, `.vscode/tasks.json`, and the Spring configuration files under `configs/base`. Treat secret-looking values (client secrets, encryption keys) shown here as placeholders for local development only — refer to your environment configuration for anything used outside a local checkout.

### Rust client agent (debug/release launches)

| Variable | Example value | Purpose |
|---|---|---|
| `RUST_LOG` | `debug` (debug launches), `info` (release launch) | Controls the `tracing`/`log` verbosity of the client agent |
| `RUST_BACKTRACE` | `1` | Enables full backtraces on panic (debug and test launches) |
| `OPENFRAME_DEV_MODE` | `true` | Flags the agent as running in a development context |
| `OPENFRAME_LOG_DIR` | `${workspaceFolder}/client/logs` | Directory the agent writes its logs to |

### OpenFrame frontend (Next.js — "Local K8s Cluster" launch)

| Variable | Example value | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | Standard Node environment flag |
| `PORT` | `4000` | Dev-server port (matches the `kill-port-4000` task) |
| `NEXT_PUBLIC_API_URL` | `https://localhost/api` | REST API base URL |
| `NEXT_PUBLIC_GRAPHQL_ENDPOINT` | `https://localhost/api/graphql` | GraphQL endpoint used by the frontend |
| `NEXT_PUBLIC_WS_ENDPOINT` | `wss://localhost/api/ws` | WebSocket endpoint |
| `NEXT_PUBLIC_APP_TYPE` | `openframe` | Application mode flag |
| `NEXT_PUBLIC_CLIENT_ID` | `openframe_web_dashboard` | OAuth client ID used by the dashboard |
| `NEXT_PUBLIC_CLIENT_SECRET` | `prod_secret` | OAuth client secret paired with the above client ID for local testing |

### OpenFrame frontend (Dev/Stage/Prod configuration launches)

| Variable | Dev value | Stage value | Prod value |
|---|---|---|---|
| `NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER` | `true` | `true` | `true` |
| `NEXT_PUBLIC_AUTH_CHECK_INTERVAL` | `60000` | `60000` | `60000` |
| `NEXT_PUBLIC_APP_MODE` | `saas-tenant` | `saas-tenant` | `saas-tenant` |
| `NEXT_PUBLIC_TENANT_HOST_URL` | `https://michael.openframe.build` | `https://test.openframe.miami` | `https://test.openframe.ai` |
| `NEXT_PUBLIC_SHARED_HOST_URL` | `https://openframe.build` | `https://openframe.miami` | `https://openframe.ai` |
| `NEXT_PUBLIC_FEATURE_ORG_IMAGES` | `true` | `true` | `true` |

### Vue dashboard (`start-vue` task, `openframe-ui`)

| Variable | Value | Purpose |
|---|---|---|
| `PORT` | `5177` | Vite dev-server port |
| `VITE_API_URL` | `http://openframe-api.microservices:8090` | In-cluster API service address |
| `VITE_GATEWAY_URL` | `http://openframe-gateway.microservices:8100` | In-cluster gateway service address |
| `VITE_CLIENT_ID` | `openframe_web_dashboard` | OAuth client ID |
| `VITE_CLIENT_SECRET` | `prod_secret` | OAuth client secret for local testing |
| `VITE_GRAFANA_URL` | `https://localhost:3000` | Grafana dashboard URL |

### Shared Spring Boot configuration (`configs/base/application.yml`)

These are not VS Code launch variables but the properties every Java service resolves at startup, with override points you will use locally:

| Property / variable | Default | Purpose |
|---|---|---|
| `spring.mongodb.uri` (YAML anchor `&mongo-uri`) | `mongodb://openframe:password123456789@mongodb-0.mongodb.datasources.svc.cluster.local:27017/openframe?...` | MongoDB connection string shared via YAML anchor across Spring Boot 3 and 4 key names |
| `REDIS_CLUSTER_NODES` | `redis-cluster-0.redis-cluster-headless.datasources.svc.cluster.local:6379,...` (3 nodes) | Overridable Redis Cluster node list |
| `spring.data.cassandra.contact-points` | `cassandra.datasources.svc.cluster.local` | Cassandra contact point |
| `SPRING_CONFIG_URL` | `http://openframe-config.platform.svc.cluster.local:8888` | Base URL the shared logging config and service `application.yml` files resolve against |
| `RELEASE_VERSION` | `v1` | Suffix for the Actuator management base path (`/management/${RELEASE_VERSION:v1}`) |
| `OPENFRAME_CLUSTER_ID` | `cluster-id` | Logical cluster identifier used in delivery and presence features |
| `ENCRYPTION_PASSWORD` / `ENCRYPTION_SALT` | development defaults shown in `configs/base/application.yml` | Used by `security.encryption` for OAuth2-related encryption; override for any non-local environment |

Pinot (`pinot.controller.url`, `pinot.broker.url`), the Debezium connector endpoint (`debezium.connector.create`), and the Loki push endpoint (`loki.url`) are also defined in `configs/base/application.yml` and point at in-cluster service DNS names (`pinot-controller.datasources.svc.cluster.local`, `debezium-connect.datasources:8083/connectors`, `loki.platform.svc.cluster.local:3100`) — override these when testing against a differently-named environment.

> `openframe.tenant-isolation.enabled: true` is required in this single-tenant OSS deployment. The comment in `configs/base/application.yml` explains that OpenFrame OSS Library `7.0.11`+ registers tenant-aware repositories that are only wired in when this flag is on; disabling it causes services to crash-loop at startup with unsatisfiable bean dependencies.

### Test-only configuration

`openframe/services/openframe-api/src/test/resources/application-test.yml` disables MongoDB, Redis, Cassandra, Kafka, and Pinot auto-configuration for unit tests, and defines a fixed `jwt.secret: test-secret-key` with a 3600000ms expiration — this file is what runs when you execute the module's test suite locally, so no live datastore is required for those tests.

## 5. Working across the Maven reactor and the Rust crate together

Because this repository mixes a Maven reactor and an independent Cargo package, keep these points in mind:

- Build the Java reactor from the repository root (`pom.xml`) so every service's `<relativePath>../../../pom.xml</relativePath>` resolves correctly.
- Build or test the Rust client from inside `clients/openframe-client`, supplying `OPENFRAME_VERSION` as shown above; the VS Code Cargo tasks set this through their `cwd` and task definitions.
- Java modules resolve their business logic from `com.openframe.oss:*` artifacts (version `7.0.11`) published by [OpenFrame OSS Library](https://github.com/flamingo-stack/openframe-oss-lib); the Rust client resolves its logic from the `openframe-agent-lib` crate (tag `v0.0.5`) in the same upstream repository. Both pins live in this repository (`pom.xml` and `clients/openframe-client/Cargo.toml` respectively) and should be bumped together when upgrading to a new library release.
- The `com.openframe.oss:*` Maven coordinates must always resolve through the `${openframe.libs.version}` property defined once in the root `pom.xml` — never hardcode a version for these artifacts in a module POM.

## 6. CLI tooling

Command-line interaction with a running OpenFrame deployment (tenant provisioning, operational commands) is provided by the external [OpenFrame CLI](https://github.com/flamingo-stack/openframe-cli) project, maintained separately from this repository. See its [installation guide](https://github.com/flamingo-stack/openframe-cli#installation) and [documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs) rather than looking for a bundled CLI here.

## Next steps

Continue with the [local development](./local-development.md) guide for first-run startup steps, or review the [architecture overview](../architecture/README.md) to understand how the gateway, authorization server, API, client, stream, and management services relate to the datastores configured above. For contribution conventions, see the [contribution guidelines](../contributing/guidelines.md). For questions or help outside of this documentation, reach the team through the [OpenMSP Slack community](https://www.openmsp.ai/).

[![Getting Started with OpenFrame - Organization Setup Basics](https://img.youtube.com/vi/-_56_qYvMWk/maxresdefault.jpg)](https://www.youtube.com/watch?v=-_56_qYvMWk)
