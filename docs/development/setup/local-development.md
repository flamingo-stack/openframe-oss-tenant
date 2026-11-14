## Local Development

This guide walks through cloning the OpenFrame OSS Tenant repository, building its services, running them locally, enabling hot reload / watch workflows, and configuring debuggers for both the Java services and the Rust endpoint agent.

> OpenFrame OSS Tenant assembles runnable Spring Boot services and a Rust endpoint agent on top of the [OpenFrame OSS Library](https://github.com/flamingo-stack/openframe-oss-lib) (pinned at `7.0.11` for Maven artifacts and `v0.0.5` for the Cargo agent library). Most domain logic (controllers, repositories, listeners) lives in that upstream library; this repository owns the executable entry points, configuration, Docker images, and Kubernetes/Helm deployment topology. See [Architecture Overview](../architecture/README.md) and [Ecosystem](../../reference/architecture/ecosystem.md) for how the services fit together.

### Repository shape

| Area | Purpose |
|---|---|
| `openframe/services/*` | The nine Maven modules — `openframe-api`, `openframe-authorization-server`, `openframe-client`, `openframe-config`, `openframe-external-api`, `openframe-gateway`, `openframe-management`, `openframe-stream`, `openframe-test` — each with its own `pom.xml` and `Dockerfile`. |
| `clients/openframe-client` | The Rust endpoint-agent binary (`openframe-client` Cargo package), a thin wrapper around `openframe-agent-lib`. |
| `configs/base` | Shared service configuration: datasource endpoints, gateway routes, logging. |
| `manifests` | Helm charts and Argo CD application definitions for platform, datasource, and tenant workloads. |
| `pom.xml` | The Maven parent/reactor POM that declares all nine service modules and centralizes dependency versions. |
| `.vscode/launch.json`, `.vscode/tasks.json`, `.vscode/settings.json` | Pre-built VS Code debug configurations and build/watch tasks for both the Java services and the Rust client. |

## Prerequisites

Before cloning, confirm you have the toolchain versions this repository builds against. See [Prerequisites](../../getting-started/prerequisites.md) for the full environment checklist. At minimum you need:

- **JDK 25** — the parent `pom.xml` sets `<java.version>25</java.version>` and builds on `spring-boot-starter-parent` `4.1.1`.
- **Maven** — the reactor POM governs all nine service modules; Docker builds install Maven inside `eclipse-temurin:25-jdk-alpine-3.23`.
- **Rust toolchain with Cargo** — required to build `clients/openframe-client` (edition 2021).
- **Node.js and npm** — only needed if you also run the OpenFrame frontend alongside this tenant repository (see the `start-vue` and frontend debug tasks below); this repository itself has no `package.json`.
- **Access to the OpenFrame OSS Library** — builds resolve `com.openframe.oss:*` artifacts at `7.0.11` and the `openframe-agent-lib` Cargo crate at tag `v0.0.5` from `https://github.com/flamingo-stack/openframe-oss-lib.git`. A GitHub token is required for Maven Docker builds (`GITHUB_TOKEN` secret, consumed via `.mvn/settings.xml`).

For the broader platform context (what each service does and how the gateway routes requests), read [Architecture Overview](../architecture/README.md) and the main-applications reference docs linked from [Reference Architecture](../../reference/architecture/README.md).

## Clone and setup

Clone the repository:

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### Build the Java services

The Maven reactor at the repository root builds all nine service modules declared under `<modules>` in `pom.xml`:

```bash
mvn clean install -DskipTests
```

To build a single service and its dependency chain (the same pattern the Dockerfiles use), use the `-pl`/`-am` flags, for example for `openframe-api`:

```bash
mvn clean package -pl openframe/services/openframe-api -am -DskipTests
```

Each service module's own `pom.xml` (for example [`openframe/services/openframe-api/pom.xml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-api/pom.xml)) pulls in its corresponding `*-service-core` artifact from the OpenFrame OSS Library (`openframe-api-service-core`, `openframe-authorization-service-core`, `openframe-client-core`, `openframe-config-core`, `openframe-external-api-service-core`) plus `spring-cloud-starter-config` and `openframe-data-redis` where applicable.

> If Maven cannot resolve `com.openframe.oss:*` artifacts, confirm your Maven settings expose the required GitHub credentials the same way the service Dockerfiles do (`COPY .mvn/settings.xml /root/.m2/settings.xml` combined with a `GITHUB_TOKEN`).

### Build the Rust endpoint agent

The Rust client lives at `clients/openframe-client` and ships a `Makefile` that wraps Cargo:

```bash
cd clients/openframe-client
make build
```

`make build` runs `cargo build --release --locked`, passing `OPENFRAME_VERSION` through to `openframe-agent-lib`'s build script (which panics if the variable is unset). Override it explicitly when needed:

```bash
OPENFRAME_VERSION=0.0.0-dev cargo build --release
```

Other targets defined in [`clients/openframe-client/Makefile`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/clients/openframe-client/Makefile):

```bash
make fmt         # cargo fmt --all
make fmt-check   # cargo fmt --all -- --check
make clippy      # cargo clippy --all-targets -- -D warnings
make lint        # fmt-check + clippy
make test        # build, then cargo test --release --locked
make clean       # cargo clean
```

Cross-compilation is supported through the `TARGET` variable, for example `make build TARGET=x86_64-unknown-linux-musl`.

The agent's dependency on the shared library is declared in [`clients/openframe-client/Cargo.toml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/clients/openframe-client/Cargo.toml):

```toml
[dependencies]
openframe-agent-lib = { git = "https://github.com/flamingo-stack/openframe-oss-lib.git", tag = "v0.0.5" }
anyhow = "1.0"
```

The binary's entry point, [`clients/openframe-client/src/main.rs`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/clients/openframe-client/src/main.rs), is intentionally thin — it only calls `openframe::run()` from the shared library crate.

## Running locally

### Java services

Each Spring Boot service has a standard `main` class under its module. All services are configured to pull shared and service-specific settings from the Config Server at startup (see each module's `application.yml`, for example [`openframe/services/openframe-api/src/main/resources/application.yml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-api/src/main/resources/application.yml)), which imports configuration optionally from `${SPRING_CONFIG_URL:http://openframe-config.microservices.svc.cluster.local:8888}`.

To run a service directly with Maven once it is built:

```bash
mvn spring-boot:run -pl openframe/services/openframe-api
```

Or run the packaged jar, the same way the service Dockerfiles do in their runtime stage:

```bash
java -jar openframe/services/openframe-api/target/*.jar
```

Entry-point classes for each service:

| Service | Main class |
|---|---|
| `openframe-api` | `com.openframe.api.ApiApplication` ([source](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-api/src/main/java/com/openframe/api/ApiApplication.java)) |
| `openframe-authorization-server` | `com.openframe.authz.OpenFrameAuthorizationServerApplication` ([source](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-authorization-server/src/main/java/com/openframe/authz/OpenFrameAuthorizationServerApplication.java)) |
| `openframe-client` | `com.openframe.client.ClientApplication` ([source](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-client/src/main/java/com/openframe/client/ClientApplication.java)) |
| `openframe-config` | `com.openframe.config.ConfigServerApplication` ([source](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-config/src/main/java/com/openframe/config/ConfigServerApplication.java)) |
| `openframe-external-api` | `com.openframe.external.ExternalApiApplication` ([source](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-external-api/src/main/java/com/openframe/external/ExternalApiApplication.java)) |
| `openframe-gateway` | `com.openframe.gateway.GatewayApplication` ([source](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-gateway/src/main/java/com/openframe/gateway/GatewayApplication.java)) |
| `openframe-management` | `com.openframe.management.ManagementApplication` ([source](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-management/src/main/java/com/openframe/management/ManagementApplication.java)) |
| `openframe-stream` | `com.openframe.stream.StreamApplication` ([source](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-stream/src/main/java/com/openframe/stream/StreamApplication.java)) |

Because the services depend on MongoDB, Redis, Kafka, NATS, Cassandra, and Pinot (declared as datasources in [`configs/base/application.yml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/configs/base/application.yml)), running a full stack locally typically means pointing these services at a local or shared Kubernetes cluster rather than standing up every datastore by hand. The repository does not ship a Docker Compose file for local datastores; the datasource charts under `manifests/datasources` (MongoDB, Redis Cluster, Kafka, NATS, Cassandra, Pinot, Zookeeper, Debezium Connect, MySQL for Fleet MDM) are deployed through Argo CD as described in [Architecture Overview](../architecture/README.md). For local iteration against a cluster, see the `dev-tools` platform chart (`manifests/platform/dev-tools`), which bundles Telepresence and a Kafka UI.

Gateway routing, once the gateway is running, follows [`configs/base/openframe-gateway.yml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/configs/base/openframe-gateway.yml): `/sas/**` to the authorization server, `/api-docs/**` to the external API, `/api/**` to `openframe-api`, `/clients/**` to `openframe-client`, and everything else (`/**`) to the frontend workload.

### Rust endpoint agent

Run the built agent binary directly, for example in debug mode:

```bash
cd clients/openframe-client
cargo build
./target/debug/openframe-client
```

The VS Code debug configurations (below) demonstrate the expected run arguments, such as `run-as-service` for the service-mode debug profile and `run` for the release profile.

## Hot reload / watch mode

### Rust: `cargo watch`

The `.vscode/tasks.json` file defines a `rust-watch` task that uses `cargo watch` to rebuild and rerun the agent automatically on file changes:

```bash
cd client
cargo watch -x run
```

> Note: the `rust-watch` task's working directory is configured as `${workspaceFolder}/client`. Confirm the path matches `clients/openframe-client` in your checkout, or run `cargo watch -x run` directly from `clients/openframe-client` if the task's configured path does not resolve.

Related Rust tasks also defined in `.vscode/tasks.json`:

```bash
cargo build           # rust-build task (default build task)
cargo build --release # rust-build-release task
cargo test             # rust-test task (default test task)
cargo check             # rust-check task
cargo clippy            # rust-clippy task
```

### Java: IDE incremental compilation

`.vscode/settings.json` enables hot code replace and automatic build updates for the Java services:

```json
"java.debug.settings.hotCodeReplace": "auto",
"java.configuration.updateBuildConfiguration": "automatic",
"java.autobuild.enabled": true
```

With these settings, a Java/VS Code workspace recompiles affected classes as you save and, when a debug session is attached, hot-swaps compatible method bodies without a full restart (see Debug configuration below for how to attach).

### Frontend dev server (if running alongside this repository)

If you are also running the OpenFrame frontend service against this tenant's backend, `.vscode/tasks.json` defines a `start-vue` task that starts its dev server with environment variables pointed at the local gateway/API:

```bash
cd openframe/services/openframe-ui
npm run dev
```

with environment:

```text
PORT=5177
VITE_API_URL=http://openframe-api.microservices:8090
VITE_GATEWAY_URL=http://openframe-gateway.microservices:8100
VITE_CLIENT_ID=openframe_web_dashboard
VITE_CLIENT_SECRET=prod_secret
VITE_GRAFANA_URL=https://localhost:3000
```

> The `start-vue` task and the `.vscode/launch.json` frontend debug configurations reference `openframe/services/openframe-frontend` and `openframe/services/openframe-ui` paths and a Next.js-style dev server (`npm run dev` on port `4000`). These paths and the frontend dev server itself belong to a separate frontend codebase; they are referenced here only because the checked-in `.vscode` configuration targets them from this workspace. Adjust the `cwd` to match wherever your frontend checkout actually lives.

## Debug configuration

This repository ships a ready-to-use VS Code debug configuration at [`.vscode/launch.json`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/.vscode/launch.json), covering both the Rust agent and the Java services.

### Rust debug configurations (LLDB)

Four LLDB-based launch configurations are defined, each with a `preLaunchTask` that builds first:

| Configuration | Pre-launch task | Program | Args |
|---|---|---|---|
| OpenFrame Client Debug | `rust-build` | `${workspaceFolder}/client/target/debug/openframe` | `run-as-service` |
| OpenFrame Client Debug (Service Mode) | `rust-build` | `${workspaceFolder}/client/target/debug/openframe` | `run-as-service` |
| OpenFrame Client Release | `rust-build-release` | `${workspaceFolder}/client/target/release/openframe` | `run` |
| OpenFrame Client Tests | `rust-test` | `${workspaceFolder}/client/target/debug/openframe-test` | — |

Each sets `cwd` to `${workspaceFolder}/client` and exports:

```json
"env": {
    "RUST_LOG": "debug",
    "RUST_BACKTRACE": "1",
    "OPENFRAME_DEV_MODE": "true",
    "OPENFRAME_LOG_DIR": "${workspaceFolder}/client/logs"
}
```

(the release configuration uses `RUST_LOG=info` instead of `debug`). As with the watch task, confirm the `client` path in these configurations resolves to `clients/openframe-client` in your checkout, adjusting `program`/`cwd` if your editor does not already alias it.

### Java debug configurations

Six Java launch configurations attach the standard `java` debugger type to each service's main class, all passing `SPRING_PROFILES_ACTIVE=k8s`:

| Configuration | Main class | Project / cwd |
|---|---|---|
| Management Application | `com.openframe.management.ManagementApplication` | `openframe/services/openframe-management` |
| API Application | `com.openframe.api.ApiApplication` | `openframe/services/openframe-api` |
| Client Application | `com.openframe.client.ClientApplication` | `openframe/services/openframe-client` |
| Config Server Application | `com.openframe.config.ConfigServerApplication` | `openframe/services/openframe-config` |
| Stream Application | `com.openframe.stream.StreamApplication` | `openframe/services/openframe-stream` |
| Gateway Application | `com.openframe.gateway.GatewayApplication` | `openframe/services/openframe-gateway` |

Each configuration sets `vmArgs: "-Dspring.profiles.active=k8s"` so the service resolves configuration the same way it does in the deployed cluster. Open the relevant service module in your IDE and start the matching launch configuration to attach a debugger with breakpoints, step-through, and (combined with the hot-swap settings above) incremental hot reload of method bodies.

> `openframe-authorization-server` and `openframe-external-api` do not have a dedicated entry in `.vscode/launch.json`. You can debug them by attaching your IDE's standard Spring Boot run/debug configuration to `com.openframe.authz.OpenFrameAuthorizationServerApplication` or `com.openframe.external.ExternalApiApplication` directly, following the same `-Dspring.profiles.active=k8s` pattern.

### VS Code editor and Rust-analyzer settings

[`.vscode/settings.json`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/.vscode/settings.json) also configures `rust-analyzer` for this workspace:

```json
"rust-analyzer.checkOnSave.command": "clippy",
"rust-analyzer.cargo.features": "all",
"rust-analyzer.cargo.allFeatures": true,
"rust-analyzer.procMacro.enable": true,
"rust-analyzer.diagnostics.enable": true,
"rust-analyzer.inlayHints.enable": true,
"rust-analyzer.lens.enable": true
```

and formats Rust files on save using `rust-lang.rust-analyzer` with a 4-space tab size, while the rest of the workspace defaults to 2-space indentation and `LF` line endings.

## Where to go next

For the shared and per-service configuration values referenced during local runs (datasource URIs, Kafka/NATS topics, security tokens, gateway routes), see [Environment Configuration](./environment.md). For how these services fit into the broader platform and how requests flow end-to-end, see [Architecture Overview](../architecture/README.md) and the generated [Reference Architecture](../../reference/architecture/README.md) documentation. Contribution conventions for changes to this repository are covered in [Contributing Guidelines](../contributing/guidelines.md).

If you also need the `openframe-client` CLI used to bootstrap or manage an OpenFrame deployment from the command line, note that it lives in a separate, externally maintained repository: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli), with installation instructions at its [installation guide](https://github.com/flamingo-stack/openframe-cli#installation) and documentation under [its docs folder](https://github.com/flamingo-stack/openframe-cli/tree/main/docs). It is not part of this repository's source tree.
