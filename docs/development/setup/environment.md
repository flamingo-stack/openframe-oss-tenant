
# Development Environment Setup

This guide covers the tools, IDE configuration, and environment variables needed to work on **OpenFrame OSS Tenant** (`flamingo-stack/openframe-oss-tenant`) — the deployable, tenant-oriented OpenFrame platform distribution. The repository assembles nine Spring Boot/Maven services, a Rust endpoint-agent client, shared configuration, and Helm/Argo CD manifests into one deployable platform. Most domain logic comes from the pinned [OpenFrame OSS Library](https://github.com/flamingo-stack/openframe-oss-lib) (Maven artifacts at version `7.0.11`, and the `openframe_agent_lib` Cargo crate at `v0.0.5`); this repository owns the runnable applications, configuration, container delivery, and Kubernetes deployment topology.

> For the broader system layout, read the [architecture reference](../../reference/architecture/README.md) first. This page is specifically about getting a local toolchain working.

## What you need before you start

Before configuring an IDE, make sure you have cloned the repository and can see its two main codebases:

- **Java/Maven services** under [`openframe/services`](https://github.com/flamingo-stack/openframe-oss-tenant/tree/main/openframe/services) (`openframe-config`, `openframe-api`, `openframe-client`, `openframe-stream`, `openframe-management`, `openframe-gateway`, `openframe-external-api`, `openframe-authorization-server`, `openframe-test`), built from the root [`pom.xml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/pom.xml).
- **The Rust endpoint agent** under `clients/openframe-client`, a thin binary (`clients/openframe-client/src/main.rs`) over the `openframe-agent-lib` crate pulled from [openframe-cli](https://github.com/flamingo-stack/openframe-cli) via Cargo's git dependency mechanism (see `clients/openframe-client/Cargo.toml`).

If you have not yet cloned the repository or installed prerequisites, see [Prerequisites](../../getting-started/prerequisites.md) and [Quick Start](../../getting-started/quick-start.md). For day-to-day local workflows (running services, port-forwarding, Telepresence), see [Local Development](./local-development.md).

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

## Required development tools

| Tool | Why it's needed | Where it's used |
|---|---|---|
| **JDK 25** | Compiles and runs every Spring Boot service | `<java.version>25</java.version>` in [`pom.xml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/pom.xml) |
| **Maven** (or the Maven Wrapper via your IDE) | Builds the multi-module Java project rooted at `pom.xml`, which inherits from `spring-boot-starter-parent` `4.1.1` | Root `pom.xml` and each service's `pom.xml` under `openframe/services/*` |
| **Rust toolchain (`cargo`, `rustc`)** | Builds and tests the endpoint-agent client | `clients/openframe-client/Cargo.toml`, VS Code tasks `rust-build`, `rust-test`, `rust-check`, `rust-clippy` |
| **`cargo-watch`** (optional) | Enables the `rust-watch` auto-rebuild task | `.vscode/tasks.json` task `rust-watch` |
| **Node.js and npm** | Runs the OpenFrame frontend/UI dev server referenced by VS Code launch configurations | `.vscode/launch.json` ("OpenFrame Frontend..." configurations), `.vscode/tasks.json` task `start-vue` |
| **`lldb`** debugger support | Backs the Rust debug configurations in VS Code | `.vscode/launch.json` (`"type": "lldb"` entries) |
| **Docker / container runtime** | Needed to build and run the service container images published by the release workflow | `.github/workflows/release.yml` (image publishing to `ghcr.io/flamingo-stack/openframe-oss-tenant/*`) |
| **`kubectl` and Helm** | Needed to work with the Argo CD application definitions and Helm charts under `manifests/` | `manifests/apps/values.yaml`, `manifests/tenant/Chart.yaml`, `manifests/datasources/*`, `manifests/platform/*` |
| **`lsof` / `fuser`** (Unix) or Windows `netstat`/`taskkill` | Frees port `4000` before starting the frontend dev server | `.vscode/tasks.json` task `kill-port-4000` |

> **Note on the OpenFrame CLI:** This repository does not bundle a CLI tool. For CLI-based workflows, use the externally maintained [`openframe-cli`](https://github.com/flamingo-stack/openframe-cli) repository — see its [installation guide](https://github.com/flamingo-stack/openframe-cli#installation) and [documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs). Do not expect an in-repo CLI directory here.

### Datasources used during development

OpenFrame OSS Tenant depends on several datasources, each deployed through its own Helm chart under `manifests/datasources/`: MongoDB, MongoDB (MeshCentral), Redis Cluster, Cassandra, Kafka, Zookeeper, NATS, Pinot, and Debezium Connect. You do not need to install these locally by hand — they are deployed through the Argo CD app-of-apps defined in [`manifests/apps/values.yaml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/manifests/apps/values.yaml), in the `datasources` namespace. The shared connection details each service reads are defined in [`configs/base/application.yml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/configs/base/application.yml).

## IDE recommendations and setup

The repository ships a `.vscode` folder with working launch configurations, tasks, and settings, which makes **Visual Studio Code** the most immediately productive editor for this codebase. An IntelliJ-based IDE also works well for the Java modules (standard Maven multi-module import), but the preconfigured debug/run experience described below is VS Code-specific.

### Opening the project

Open the repository root in VS Code so that `.vscode/launch.json`, `.vscode/tasks.json`, and `.vscode/settings.json` are picked up automatically.

### Editor settings already configured

[``.vscode/settings.json``](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/.vscode/settings.json) pre-configures:

- Line endings (`files.eol: \n`) and 2-space indentation as the default editor behavior.
- YAML schema associations for workflow files (`**/*.yml` matched against the Argo Workflows schema) and a `toc.yml` schema, useful when editing manifests and CI configuration.
- Java tooling behavior: automatic build configuration updates (`java.configuration.updateBuildConfiguration: automatic`), hot code replace on debug (`java.debug.settings.hotCodeReplace: auto`), automatic builds, logical structure and static variables shown in the debugger, and automatic null analysis (`java.compile.nullAnalysis.mode: automatic`).
- Rust tooling behavior through `rust-analyzer`: Clippy as the check-on-save command, all Cargo features enabled, procedural macro support, inlay hints, and code lenses enabled. Rust files are formatted on save using `rust-lang.rust-analyzer` with 4-space indentation.

### Editor extensions/plugins

Based on the settings and launch configurations present in the repository, install:

| Extension area | Purpose |
|---|---|
| **Java extension pack** (providing `java.debug.*` and `java.configuration.*` / `java.autobuild.*` support) | Required for the Java debug configurations in `.vscode/launch.json` and the Java-specific settings in `.vscode/settings.json` to function |
| **`rust-analyzer`** | Required by the `[rust]` language settings in `.vscode/settings.json` — provides Clippy-on-save, inlay hints, code lenses, and format-on-save for the Rust client |
| **CodeLLDB** (or another `lldb`-backed debugger extension) | Required by the `"type": "lldb"` debug configurations used to debug the Rust client binary |
| **A YAML extension** supporting `yaml.schemas` | Needed to get schema validation/autocomplete for workflow and `toc.yml` files per the `yaml.schemas` setting |
| **A Node.js debugger** (bundled with VS Code) | Backs the `"type": "node"` frontend launch configurations |

### Debugging with VS Code launch configurations

[``.vscode/launch.json``](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/.vscode/launch.json) defines ready-to-use debug targets:

**Rust client (`lldb`)**
- `OpenFrame Client Debug` — runs `client/target/debug/openframe run-as-service` after the `rust-build` task, with `RUST_LOG=debug`, `RUST_BACKTRACE=1`, `OPENFRAME_DEV_MODE=true`, and `OPENFRAME_LOG_DIR` set to `${workspaceFolder}/client/logs`.
- `OpenFrame Client Debug (Service Mode)` — identical to the above, explicitly in service mode.
- `OpenFrame Client Release` — runs the release binary (`client/target/release/openframe run`) after `rust-build-release`, with `RUST_LOG=info`.
- `OpenFrame Client Tests` — runs `client/target/debug/openframe-test` after the `rust-test` task.

**Java services (debugger type `java`)** — each attaches to a `main` class, sets `SPRING_PROFILES_ACTIVE=k8s`, and scopes the working directory to the service module:

| Configuration name | Main class | Working directory |
|---|---|---|
| Management Application | `com.openframe.management.ManagementApplication` | `openframe/services/openframe-management` |
| API Application | `com.openframe.api.ApiApplication` | `openframe/services/openframe-api` |
| Client Application | `com.openframe.client.ClientApplication` | `openframe/services/openframe-client` |
| Config Server Application | `com.openframe.config.ConfigServerApplication` | `openframe/services/openframe-config` |
| Stream Application | `com.openframe.stream.StreamApplication` | `openframe/services/openframe-stream` |
| Gateway Application | `com.openframe.gateway.GatewayApplication` | `openframe/services/openframe-gateway` |

**Frontend (debugger type `node`)** — each runs `npm run dev` from `openframe/services/openframe-frontend` after the `frontend-with-port-cleanup` task (which frees port `4000` first):

- `OpenFrame Frontend with Local K8s Cluster`
- `OpenFrame Frontend with Dev Configuration`
- `OpenFrame Frontend with Stage Configuration`
- `OpenFrame Frontend with Prod Configuration`

Each frontend configuration sets a distinct block of `NEXT_PUBLIC_*` environment variables — see the [Environment variables](#environment-variables-for-development) section below for the full list.

### Tasks available out of the box

[`.vscode/tasks.json`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/.vscode/tasks.json) wires up these tasks, several of which back the launch configurations above:

| Task | Command | Notes |
|---|---|---|
| `deploy-client` | `./deploy.sh` from `client/scripts` | Build-group task |
| `rust-build` | `cargo build` in `client/` | Default build task |
| `rust-build-release` | `cargo build --release` in `client/` | |
| `rust-test` | `cargo test` in `client/` | Default test task |
| `rust-watch` | `cargo watch -x run` in `client/` | Background task; requires `cargo-watch` |
| `rust-check` | `cargo check` in `client/` | |
| `rust-clippy` | `cargo clippy` in `client/` | |
| `start-vue` | `npm run dev` in `openframe/services/openframe-ui` | Background task; sets `PORT`, `VITE_API_URL`, `VITE_GATEWAY_URL`, `VITE_CLIENT_ID`, `VITE_CLIENT_SECRET`, `VITE_GRAFANA_URL` |
| `kill-port-4000` | Platform-specific port-killer (`lsof`/`fuser` on Unix, `netstat`/`taskkill` on Windows) | Frees port `4000` before the frontend starts |
| `frontend-with-port-cleanup` | Depends on `kill-port-4000`, then echoes readiness | Used as the `preLaunchTask` for frontend debug configurations |

> These `client/` paths in `.vscode/tasks.json` and `.vscode/launch.json` refer to the Rust client working directories as configured in the repository's VS Code setup; confirm the current Rust client location in your checkout if it has moved.

## Environment variables for development

### Rust client runtime variables

Set by the VS Code launch configurations for the Rust client (`.vscode/launch.json`):

| Variable | Example value | Purpose |
|---|---|---|
| `RUST_LOG` | `debug` (debug configs) / `info` (release config) | Controls log verbosity for the Rust client |
| `RUST_BACKTRACE` | `1` | Enables backtraces on panic, set for debug and test configurations |
| `OPENFRAME_DEV_MODE` | `true` | Enables development-mode behavior in the client |
| `OPENFRAME_LOG_DIR` | `${workspaceFolder}/client/logs` | Directory the client writes logs to |

The Rust client is built with `OPENFRAME_VERSION` supplied at build time, consumed by the agent library's build script, as noted in `clients/openframe-client/src/main.rs`:

```bash
OPENFRAME_VERSION=0.0.0-dev cargo build --release
```

### Frontend runtime variables

The four frontend launch configurations in `.vscode/launch.json` each target a different backend environment. Common to all is `NODE_ENV`/`PORT` in the "Local K8s Cluster" configuration; the other three share a `NEXT_PUBLIC_APP_MODE=saas-tenant` and ticket-observer/auth-check settings, differing by target host:

| Variable | Local K8s Cluster config | Dev config | Stage config | Prod config |
|---|---|---|---|---|
| `NODE_ENV` | `development` | — | — | — |
| `PORT` | `4000` | — | — | — |
| `NEXT_PUBLIC_API_URL` | `https://localhost/api` | — | — | — |
| `NEXT_PUBLIC_GRAPHQL_ENDPOINT` | `https://localhost/api/graphql` | — | — | — |
| `NEXT_PUBLIC_WS_ENDPOINT` | `wss://localhost/api/ws` | — | — | — |
| `NEXT_PUBLIC_APP_TYPE` | `openframe` | — | — | — |
| `NEXT_PUBLIC_CLIENT_ID` | `openframe_web_dashboard` | — | — | — |
| `NEXT_PUBLIC_CLIENT_SECRET` | `prod_secret` | — | — | — |
| `NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER` | — | `true` | `true` | `true` |
| `NEXT_PUBLIC_AUTH_CHECK_INTERVAL` | — | `60000` | `60000` | `60000` |
| `NEXT_PUBLIC_APP_MODE` | — | `saas-tenant` | `saas-tenant` | `saas-tenant` |
| `NEXT_PUBLIC_TENANT_HOST_URL` | — | `https://michael.openframe.build` | `https://test.openframe.miami` | `https://test.openframe.ai` |
| `NEXT_PUBLIC_SHARED_HOST_URL` | — | `https://openframe.build` | `https://openframe.miami` | `https://openframe.ai` |
| `NEXT_PUBLIC_FEATURE_ORG_IMAGES` | — | `true` | `true` | `true` |

> The secret values shown above (such as `NEXT_PUBLIC_CLIENT_SECRET: prod_secret`) are the literal values committed in `.vscode/launch.json` for local development convenience. Refer to your environment configuration for any value that should differ in your setup.

The `start-vue` task (`.vscode/tasks.json`) sets its own variable set for the Vue-based `openframe-ui` dev server: `PORT=5177`, `VITE_API_URL=http://openframe-api.microservices:8090`, `VITE_GATEWAY_URL=http://openframe-gateway.microservices:8100`, `VITE_CLIENT_ID=openframe_web_dashboard`, `VITE_CLIENT_SECRET=prod_secret`, and `VITE_GRAFANA_URL=https://localhost:3000`.

### Shared backend configuration variables

Services read environment-overridable settings from [`configs/base/application.yml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/configs/base/application.yml). The notable ones for local development:

| Variable | Default (if unset) | Consumed by |
|---|---|---|
| `REDIS_CLUSTER_NODES` | the three in-cluster Redis Cluster hostnames | `spring.data.redis.cluster.nodes` |
| `SPRING_CONFIG_URL` | `http://openframe-config.platform.svc.cluster.local:8888` | `logging.config` (shared Logback XML location) and each service's `spring.config.import` (see each service's `application.yml`, e.g. `openframe/services/openframe-api/src/main/resources/application.yml`) |
| `OPENFRAME_CLUSTER_ID` | `cluster-id` | `openframe.cluster-id` |
| `RELEASE_VERSION` | `v1` | Actuator base path versioning (`management.endpoints.web.base-path`) |
| `ENCRYPTION_PASSWORD` | a baked-in development default | `security.encryption.password` |
| `ENCRYPTION_SALT` | a baked-in development default | `security.encryption.salt` |

> Treat `ENCRYPTION_PASSWORD`, `ENCRYPTION_SALT`, and any client secret as sensitive. The defaults present in `configs/base/application.yml` are suitable only for local/dev use — refer to your environment configuration for anything resembling a production credential.

Each service also imports its own configuration from the Config Server, for example [`openframe/services/openframe-api/src/main/resources/application.yml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-api/src/main/resources/application.yml):

```yaml
spring:
  config:
    import: "optional:configserver:${SPRING_CONFIG_URL:http://openframe-config.microservices.svc.cluster.local:8888}"
```

The same pattern appears in `openframe-authorization-server` and `openframe-client`'s `application.yml` files.

### Test-profile variables

The `openframe-api` module's test configuration (`openframe/services/openframe-api/src/test/resources/application-test.yml`) disables several autoconfigurations and datasources for fast unit/integration testing, and sets:

```yaml
jwt:
  secret: test-secret-key
  expiration: 3600000
```

This is a test-only value — never reuse it outside the `openframe-api` test profile.

## Building and running services locally

### Java services

From the repository root, Maven resolves the multi-module project declared in `pom.xml` (modules under `openframe/services/*`). Each service's own `pom.xml` (for example `openframe/services/openframe-api/pom.xml`) declares its dependencies on OpenFrame OSS Library artifacts such as `openframe-api-service-core`, pinned at `${openframe.libs.version}` (`7.0.11`), plus `spring-cloud-starter-config` for centralized configuration.

The project targets **Java 25** and inherits from `spring-boot-starter-parent` **4.1.1**. Annotation processing (Lombok, `spring-boot-configuration-processor`) is explicitly configured in the root `pom.xml`'s `maven-compiler-plugin` block, since JDK 23+ no longer auto-discovers annotation processors on the classpath — make sure your IDE's annotation processing setting is enabled for Lombok to work.

### Rust client

From `clients/openframe-client`, `cargo build` (or the `rust-build` VS Code task) compiles the thin entry-point binary that delegates to the `openframe-agent-lib` crate. The `Cargo.toml` declares this as a git dependency tagged `v0.0.5` from the `openframe-oss-lib` repository.

### Frontend

The frontend (`openframe/services/openframe-frontend`) and the alternate Vue-based UI (`openframe/services/openframe-ui`) are started with `npm run dev`, using the launch configurations or the `start-vue` task described above.

## Next steps

Once your environment is set up, continue to [Local Development](./local-development.md) for day-to-day workflows such as running the full stack, and to [Contributing Guidelines](../contributing/guidelines.md) before submitting changes. For questions, use the [OpenMSP Slack community](https://www.openmsp.ai/) rather than GitHub Issues or Discussions — this project does not use those features.
