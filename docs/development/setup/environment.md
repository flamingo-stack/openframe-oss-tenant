---

# Development Environment Setup

This guide covers how to set up a local development environment for **OpenFrame OSS Tenant** — the tenant-facing service and deployment repository for OpenFrame. The repository hosts Spring Boot microservices (Java 25), a Rust client binary, and the Kubernetes/Helm/Argo CD manifests that compose a running tenant environment.

For the broader platform and product context, see [Introduction](../../getting-started/introduction.md) and [Prerequisites](../../getting-started/prerequisites.md). This page focuses on tooling and editor configuration; day-to-day workflows (building, running services locally, port-forwarding) are covered in [Local Development](./local-development.md).

> OpenFrame does not use GitHub Issues or GitHub Discussions for coordination. Development questions and discussion happen in the [OpenMSP Slack community](https://www.openmsp.ai/) ([invite link](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)).

## Repository shape

This repository is **polyglot**: Java (Spring Boot services under Maven), Rust (the thin `openframe-client` binary), and Bash (datasource init scripts for Helm charts). Your editor and toolchain setup needs to cover all three.

```mermaid
flowchart LR
    Pom["Root pom.xml<br/>openframe-parent"] --> Api["openframe-api"]
    Pom --> Authz["openframe-authorization-server"]
    Pom --> Client["openframe-client (Java)"]
    Pom --> Config["openframe-config"]
    Pom --> External["openframe-external-api"]
    Pom --> Gateway["openframe-gateway"]
    Pom --> Mgmt["openframe-management"]
    Pom --> Stream["openframe-stream"]
    Pom --> Test["openframe-test"]
    Cargo["clients/openframe-client<br/>Cargo.toml"] --> Rust["openframe-client binary (Rust)"]
    Rust -->|git dependency| Lib["openframe-agent-lib<br/>flamingo-stack/openframe-oss-lib@v0.0.5"]
```

Note that there are two distinctly named "client" components: the Java Maven module `openframe/services/openframe-client` (a Spring Boot service) and the Rust binary under `clients/openframe-client` (a thin wrapper over `openframe-agent-lib`). Do not confuse the two when configuring your IDE.

## Required development tools

| Tool | Why it's required | Evidence in this repository |
|---|---|---|
| **JDK 25** | The root `pom.xml` sets `<java.version>25</java.version>` and all nine Maven service modules inherit it. | `pom.xml` |
| **Apache Maven** | All Java services build through the multi-module `pom.xml` (parent `spring-boot-starter-parent` 4.1.1). | `pom.xml`, `openframe/services/*/pom.xml` |
| **Rust toolchain (cargo, rustc)** | `clients/openframe-client/Cargo.toml` defines the `openframe-client` binary crate, edition 2021, depending on `openframe-agent-lib` as a git dependency. | `clients/openframe-client/Cargo.toml` |
| **rust-analyzer** (editor-side, see below) and **clippy** | `.vscode/settings.json` configures `rust-analyzer.checkOnSave.command` as `clippy`, and VS Code tasks run `cargo clippy` directly. | `.vscode/settings.json`, `.vscode/tasks.json` |
| **lldb debugger** | `.vscode/launch.json` uses the `lldb` request type for every Rust debug configuration (debug build, service mode, release, tests). | `.vscode/launch.json` |
| **Node.js / npm** | The frontend dev task (`start-vue`) and the "OpenFrame Frontend" launch configurations run `npm run dev` against `openframe/services/openframe-frontend`. | `.vscode/tasks.json`, `.vscode/launch.json` |
| **Git** (with access to private/pinned dependencies) | The Rust crate pulls `openframe-agent-lib` directly from the `flamingo-stack/openframe-oss-lib` git repository at tag `v0.0.5`; Java services pin `com.openframe.oss` artifacts at version `7.0.11` from the same upstream library repository. | `clients/openframe-client/Cargo.toml`, `pom.xml` |
| **kubectl / Helm / Argo CD CLI** (for manifest work) | The repository ships Argo CD app-of-apps definitions and Helm charts under `manifests/apps`, `manifests/platform`, `manifests/datasources`, and `manifests/tenant`. | `manifests/apps/values.yaml` and related chart files |
| **OpenFrame CLI** | Used for bootstrapping/operating an OpenFrame environment; it is a separate, externally maintained tool. | External: [openframe-cli](https://github.com/flamingo-stack/openframe-cli) |

> The OpenFrame CLI lives in its own repository, [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli), with installation instructions at [openframe-cli#installation](https://github.com/flamingo-stack/openframe-cli#installation) and docs under [openframe-cli/tree/main/docs](https://github.com/flamingo-stack/openframe-cli/tree/main/docs). It is not part of this repository and is not bundled here — install it separately if your workflow requires it.

### Java/Maven version pinning details

The root `pom.xml` centralizes dependency versions as Maven properties, notably:

- `openframe.libs.version` = `7.0.11` — the single source of truth for every `com.openframe.oss:*` artifact (openframe-core, openframe-api-lib, openframe-security-core, fleetmdm, and so on).
- `spring-boot.version` = `4.1.1`, `spring-cloud.version` = `2025.1.3`.
- `lombok.version` = `1.18.48` — required at the annotation-processor level; JDK 23+ no longer auto-discovers annotation processors on the classpath, so Lombok (and `spring-boot-configuration-processor`) must be explicitly listed in `maven-compiler-plugin` configuration, which the root POM already does.

When working on a module, build it with its dependents using Maven's reactor flags, for example from the repository root:

```bash
mvn -pl openframe/services/openframe-api -am compile
```

If you are simultaneously iterating on the upstream shared library (`openframe-oss-lib`), the repository's active review rules describe the expected local development handshake: install the library locally as `999-SNAPSHOT` and point `openframe.libs.version` at that coordinate temporarily, rather than publishing a new snapshot release or hand-editing dependency coordinates. Revert any such local-only version property change before committing.

### Rust toolchain details

`clients/openframe-client/Cargo.toml` declares:

```toml
[dependencies]
openframe-agent-lib = { git = "https://github.com/flamingo-stack/openframe-oss-lib.git", tag = "v0.0.5" }
anyhow = "1.0"
```

The actual agent logic lives in that external crate; `clients/openframe-client/src/main.rs` is a thin entry point that calls `openframe::run()`. A correct local build also requires setting `OPENFRAME_VERSION` at build time, since the library's build script consumes it:

```bash
OPENFRAME_VERSION=0.0.0-dev cargo build --release
```

## IDE recommendations and setup

The repository ships a `.vscode` directory with `settings.json`, `tasks.json`, and `launch.json`, which indicates **Visual Studio Code** as the primary supported editor for day-to-day development across both the Java and Rust codebases. Any Java IDE with Maven and Lombok support (for example IntelliJ IDEA) can also be used for the Java services, and any Rust-aware editor with `rust-analyzer` can be used for the client — but the checked-in launch/debug configurations target VS Code specifically.

### VS Code workspace settings

`.vscode/settings.json` applies these editor defaults across the repository:

- `files.eol`: `\n` — enforce LF line endings.
- `editor.tabSize`: `2`, `editor.insertSpaces`: `true` — two-space indentation by default.
- YAML schema associations for `**/*.yml` (Argo Workflows schema) and a `toc.yml` schema, useful when editing the many Helm/Argo CD manifest files under `manifests/`.
- Java tooling: `java.debug.settings.hotCodeReplace` set to `auto`, `java.configuration.updateBuildConfiguration` set to `automatic`, `java.autobuild.enabled` true, and `java.compile.nullAnalysis.mode` set to `automatic` — these keep the Java Language Server in sync with Maven module changes and enable hot code replace while debugging.
- Rust tooling: `rust-analyzer.checkOnSave.command` set to `clippy` (lints run on save instead of plain `cargo check`), plus `rust-analyzer.cargo.features: "all"` and `rust-analyzer.cargo.allFeatures: true` so rust-analyzer resolves the crate with every feature enabled. Inlay hints, code lenses, procedural macro expansion, and diagnostics are all explicitly enabled.
- A `[rust]` language-specific block sets `rust-lang.rust-analyzer` as the default formatter and enables `editor.formatOnSave`, with a 4-space tab size override for Rust files specifically (overriding the repository-wide 2-space default).

### Recommended editor extensions

Based on the languages and tooling actually configured in this repository:

| Extension | Purpose |
|---|---|
| **rust-analyzer** (`rust-lang.rust-analyzer`) | Required — explicitly referenced as the default formatter for Rust files in `.vscode/settings.json`, and all Rust settings (clippy-on-save, inlay hints, proc-macro expansion) target this extension. |
| **Language Support for Java(TM)** / Java Extension Pack | Required for Maven-aware Java editing, debugging, and the `java.*` settings configured in `.vscode/settings.json` (hot code replace, auto build config update, null analysis). |
| **CodeLLDB** (`vadimcn.vscode-lldb`) | Provides the `lldb` debug adapter type used by every Rust configuration in `.vscode/launch.json` ("OpenFrame Client Debug", "OpenFrame Client Debug (Service Mode)", "OpenFrame Client Release", "OpenFrame Client Tests"). |
| **YAML** (`redhat.vscode-yaml`) | Consumes the `yaml.schemas` mappings in `.vscode/settings.json` for Argo Workflows (`**/*.yml`) and `toc.yml` validation — directly relevant given the volume of Helm/Argo manifests in `manifests/`. |

## Environment variables for development

Environment variables in this repository fall into three groups: Rust client build/runtime variables, Java service launch variables, and frontend dev-server variables. All of the following are taken directly from `.vscode/launch.json` and `.vscode/tasks.json`.

### Rust client (debug/test launch configurations)

| Variable | Example value | Purpose |
|---|---|---|
| `RUST_LOG` | `debug` (debug builds) / `info` (release) | Controls log verbosity for the `openframe` binary. |
| `RUST_BACKTRACE` | `1` | Enables full backtraces on panic during debug and test runs. |
| `OPENFRAME_DEV_MODE` | `true` | Signals development mode to the agent library. |
| `OPENFRAME_LOG_DIR` | `${workspaceFolder}/client/logs` | Directory the client writes logs to locally. |
| `OPENFRAME_VERSION` | e.g. `0.0.0-dev` | Required at build time; consumed by `openframe-agent-lib`'s build script (set it on the command line, as shown above, not in `launch.json`). |

> The `.vscode/launch.json` and `.vscode/tasks.json` configurations reference a `${workspaceFolder}/client` directory for Rust build/test tasks (`rust-build`, `rust-test`, `deploy-client`), while the Rust source actually inlined in this repository lives under `clients/openframe-client`. If your checkout does not have a top-level `client/` directory, adjust the `cwd` in your local VS Code configuration to point at `clients/openframe-client` before using these tasks.

### Java services (VS Code launch configurations)

Every Java service launch configuration in `.vscode/launch.json` (Management, API, Client, Config Server, Stream, Gateway Applications) sets:

```json
"env": {
    "SPRING_PROFILES_ACTIVE": "k8s"
},
"vmArgs": "-Dspring.profiles.active=k8s"
```

This activates the `k8s` Spring profile when launching any service directly from the IDE, aligning local debug runs with the configuration shape used in the Kubernetes deployment. Each service's `mainClass` and `cwd` map onto its Maven module directory, for example `com.openframe.api.ApiApplication` under `openframe/services/openframe-api`.

All services additionally resolve centralized configuration at startup via Spring Cloud Config. Each service's `src/main/resources/application.yml` imports it optionally, for example in `openframe/services/openframe-api/src/main/resources/application.yml`:

```yaml
spring:
  application:
    name: openframe-api
  config:
    import: "optional:configserver:${SPRING_CONFIG_URL:http://openframe-config.microservices.svc.cluster.local:8888}"
```

| Variable | Default (if unset) | Purpose |
|---|---|---|
| `SPRING_CONFIG_URL` | `http://openframe-config.microservices.svc.cluster.local:8888` | Where each service's Spring Cloud Config client looks for the Config Server. Override this for a local/alternate Config Server location. |
| `SPRING_PROFILES_ACTIVE` | (none by default outside the IDE launch configs) | Set to `k8s` by the VS Code launch configurations described above. |

Shared, cross-service configuration (in `configs/base/application.yml`) layers in further environment-driven overrides consumed at runtime inside the cluster, including `REDIS_CLUSTER_NODES`, `OPENFRAME_CLUSTER_ID`, `ENCRYPTION_PASSWORD`, and `ENCRYPTION_SALT` — each has an inline default in that file but should be overridden per environment rather than relying on the checked-in defaults for anything beyond local experimentation.

### Frontend dev server (`openframe-frontend`)

The frontend launch configurations in `.vscode/launch.json` run `npm run dev` inside `openframe/services/openframe-frontend` with environment variables that vary by target backend:

- **Local K8s cluster** ("OpenFrame Frontend with Local K8s Cluster"): `NODE_ENV=development`, `PORT=4000`, `NEXT_PUBLIC_API_URL=https://localhost/api`, `NEXT_PUBLIC_GRAPHQL_ENDPOINT=https://localhost/api/graphql`, `NEXT_PUBLIC_WS_ENDPOINT=wss://localhost/api/ws`, `NEXT_PUBLIC_APP_TYPE=openframe`, `NEXT_PUBLIC_CLIENT_ID=openframe_web_dashboard`, `NEXT_PUBLIC_CLIENT_SECRET=prod_secret`.
- **Dev/Stage/Prod configuration variants** set `NEXT_PUBLIC_ENABLE_DEV_TICKET_OBSERVER`, `NEXT_PUBLIC_AUTH_CHECK_INTERVAL`, `NEXT_PUBLIC_APP_MODE=saas-tenant`, `NEXT_PUBLIC_TENANT_HOST_URL`, `NEXT_PUBLIC_SHARED_HOST_URL`, and `NEXT_PUBLIC_FEATURE_ORG_IMAGES`, pointed at different hosts (for example `https://michael.openframe.build` for dev, `https://test.openframe.miami` for stage, `https://test.openframe.ai` for prod-style testing).

The companion `start-vue` VS Code task (for the separate `openframe/services/openframe-ui`) sets `PORT=5177`, `VITE_API_URL=http://openframe-api.microservices:8090`, `VITE_GATEWAY_URL=http://openframe-gateway.microservices:8100`, `VITE_CLIENT_ID=openframe_web_dashboard`, `VITE_CLIENT_SECRET=prod_secret`, and `VITE_GRAFANA_URL=https://localhost:3000`.

> The values above (for example `prod_secret`) are the literal defaults checked into `.vscode/launch.json` and `.vscode/tasks.json` for local development convenience — refer to your own environment configuration before using these against anything beyond a local or disposable development cluster.

### Shared backend configuration (`configs/base/application.yml`)

This file — loaded by services that import it from the Config Server — defines connection targets for MongoDB, Redis Cluster, Cassandra, and Pinot used across the platform, plus logging and tenant-isolation settings. Key values a developer should know when pointing a locally-run service at a shared or local datasource stack:

```yaml
spring:
  mongodb:
    uri: mongodb://openframe:password123456789@mongodb-0.mongodb.datasources.svc.cluster.local:27017/openframe?authSource=admin...
```

and the explicit tenant-isolation flag that several services require to boot correctly:

```yaml
openframe:
  tenant-isolation:
    enabled: true
```

As the comments in `configs/base/application.yml` explain, this flag must stay `true` for OSS single-tenant deployments: the shared library (`openframe-oss-lib` >= 6.16) registers tenant-aware repositories that are only wired up when tenant-isolation mode is active; with it disabled, dependent services fail to start with unsatisfiable bean errors.

## Build, lint, and test tasks available in VS Code

`.vscode/tasks.json` defines the following tasks, runnable via the VS Code task runner, which double as a reference for the equivalent shell commands:

| Task label | Command | Notes |
|---|---|---|
| `rust-build` (default build task) | `cargo build` | Run with working directory `client` (adjust per the note above if your checkout uses `clients/openframe-client`). |
| `rust-build-release` | `cargo build --release` | |
| `rust-test` (default test task) | `cargo test` | |
| `rust-watch` | `cargo watch -x run` | Background task; requires `cargo-watch` installed. |
| `rust-check` | `cargo check` | |
| `rust-clippy` | `cargo clippy` | Matches the `rust-analyzer.checkOnSave.command` setting. |
| `deploy-client` | `./deploy.sh` (from `client/scripts`) | |
| `start-vue` | `npm run dev` (in `openframe/services/openframe-ui`) | Background task with `VITE_*` environment as listed above. |
| `kill-port-4000` / `frontend-with-port-cleanup` | Frees port 4000 before launching the frontend dev server | Platform-specific commands for Windows/Linux are both defined. |

## Active code-review expectations for local changes

Before sending a pull request, be aware of the Maven dependency-management rules enforced on this repository's `pom.xml` files:

- All `com.openframe.oss` library coordinates must reference the centralized `openframe.libs.version` property rather than a hardcoded version string.
- When iterating on the shared `openframe-oss-lib` library locally, the expected workflow is a local `999-SNAPSHOT` install plus a temporary `openframe.libs.version` override — not a published snapshot release or a hand-edited dependency string — and that override should not be committed.
- Services that depend on `pinot-java-client` must not override or remove the root POM's managed exclusions for log4j and server-side Pinot transitives.

See [Contributing Guidelines](../contributing/guidelines.md) for the full pull request process, and [Architecture](../architecture/README.md) for how these services fit together at a higher level.

## Where to go next

- [Local Development](./local-development.md) walks through actually running and iterating on services day to day.
- [Testing](../testing/README.md) covers how to run the Java and Rust test suites.
- [Security](../security/README.md) documents security-relevant configuration (encryption keys, OAuth2 settings) referenced above.
- The [Reference Architecture](../../reference/architecture/README.md) and its [ecosystem overview](../../reference/architecture/ecosystem.md) describe how `openframe-api`, `openframe-gateway`, `openframe-authorization-server`, and the other modules relate to each other and to the pinned `openframe-oss-lib` dependencies.
