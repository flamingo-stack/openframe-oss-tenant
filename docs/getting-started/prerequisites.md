# Prerequisites

This page lists what you need installed, configured, and accessible before working with **OpenFrame OSS Tenant** — the Spring Boot microservices (API, Gateway, Authorization Server, External API, Client, Stream, Management, Config) and the Rust agent (`openframe-client`) that make up the open-source foundation of the OpenFrame platform. Read this before [Quick Start](./quick-start.md).

> **Scope note:** This repository publishes nine Maven artifacts under `com.openframe` (all `1.0.0-SNAPSHOT`) and one Cargo crate, `openframe_client` (`0.1.0`). Per the organization's code graph (coverage: full), no other repository currently depends on these artifacts — this is the top of its own dependency chain, consuming only the external [OpenFrame OSS Library](https://github.com/flamingo-stack/openframe-oss-lib).

## Required software and versions

| Tool | Required Version | Why it's needed | Verify |
|---|---|---|---|
| Java (JDK) | 25 | Builds and runs all nine Spring Boot services (`java.version` in `pom.xml`) | `java -version` |
| Apache Maven | Compatible with the Spring Boot 4.1 parent POM | Builds the multi-module Java project (`pom.xml`) | `mvn -version` |
| Rust toolchain (`cargo`) | Edition 2021 | Builds the `openframe-client` agent (`clients/openframe-client/Cargo.toml`) | `cargo --version` |
| Git | Any recent version | Clones the repository and the pinned `openframe-agent-lib` dependency | `git --version` |
| Docker | Any recent version supporting BuildKit secrets | Builds the per-service container images (each service's `Dockerfile` uses `--mount=type=secret,id=GITHUB_TOKEN`) | `docker --version` |
| kubectl | Compatible with your target cluster | Interacts with the Kubernetes manifests under `manifests/` | `kubectl version --client` |
| Helm | 3.x (OCI registry support) | Installs/inspects the charts under `manifests/` (e.g. `manifests/datasources/cassandra`, `manifests/tenant`) | `helm version` |
| Argo CD CLI (optional) | Compatible with your cluster's Argo CD version | Operates the app-of-apps deployment model described in `manifests/apps/values.yaml` | `argocd version --client` |

> **JDK 23+ annotation processor note:** the root `pom.xml` configures `maven-compiler-plugin` to list Lombok (`1.18.48`) and `spring-boot-configuration-processor` explicitly as `annotationProcessorPaths`, because JDK 23+ no longer auto-discovers annotation processors from the classpath. If you use an IDE, make sure annotation processing is enabled or compilation will silently skip Lombok-generated code.

### Rust agent toolchain detail

The Rust agent build is driven by `clients/openframe-client/Makefile`, which wraps `cargo build`, `cargo test`, `cargo fmt`, and `cargo clippy`. It requires the `OPENFRAME_VERSION` environment variable (consumed by the `openframe-agent-lib` build script) and supports an optional `TARGET` variable for cross-compilation:

```bash
cd clients/openframe-client
OPENFRAME_VERSION=0.0.0-dev cargo build
```

Install `clippy` and `rustfmt` components if you intend to run `make lint` (`cargo fmt --all -- --check` and `cargo clippy --all-targets -- -D warnings`).

## System requirements

| Resource | Minimum guidance |
|---|---|
| OS | Linux or macOS recommended for building the Java services and the Rust agent; Docker image builds target `eclipse-temurin:25-jdk-alpine-3.23` / `eclipse-temurin:25-jre-alpine-3.23` (Alpine-based) |
| CPU / Memory | A full local stack (9 Java services + MongoDB, Cassandra, Kafka, NATS, Pinot, Redis Cluster, ZooKeeper, Debezium Connect, MySQL for FleetMDM) is resource-intensive; a workstation with multiple cores and substantial RAM is recommended when running the complete datasources tier from `manifests/datasources/` |
| Disk | Maven local repository (`~/.m2`), Docker image layers, and Cargo build artifacts each consume multiple gigabytes |
| Kubernetes cluster | Required to run the full platform as deployed — the `manifests/` tree is the real deployment target (Argo CD app-of-apps with `platform` and `datasources` waves, then the `tenant` chart) |
| Network egress | Access to `ghcr.io` (GitHub Container Registry) is required to pull published images, e.g. `ghcr.io/flamingo-stack/openframe-oss-tenant/openframe-api` and the third-party/base images referenced throughout `manifests/*/values.yaml` |

## Account / access requirements

| Requirement | Purpose |
|---|---|
| GitHub account with access to `flamingo-stack/openframe-oss-tenant` | Clone the repository and open pull requests |
| GitHub personal access token (`GITHUB_TOKEN`) | Every service `Dockerfile` (e.g. `openframe/services/openframe-api/Dockerfile`) mounts this as a BuildKit secret (`--mount=type=secret,id=GITHUB_TOKEN`) to authenticate Maven against private/GitHub-hosted dependencies during the image build |
| Access to the pinned `openframe-oss-lib` repository | The Rust agent's `Cargo.toml` pulls `openframe-agent-lib` directly via `git = "https://github.com/flamingo-stack/openframe-oss-lib.git", tag = "v0.0.5"` — `cargo build` needs Git access to this repository |
| `ghcr.io/flamingo-stack` registry read access | Pull the pre-built service images and the third-party/registry-mirrored images referenced in the Helm chart `values.yaml` files under `manifests/` |
| Kubernetes cluster credentials (kubeconfig) | Required to apply the Argo CD app-of-apps and chart manifests under `manifests/` |
| OpenMSP Slack membership | This project does not use GitHub Issues or GitHub Discussions — all support and development discussion happens on the [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) |

> This project tracks releases, not issues, on GitHub: see [Releases](https://github.com/flamingo-stack/openframe-oss-tenant/releases) and [Pull Requests](https://github.com/flamingo-stack/openframe-oss-tenant/pulls).

## Environment variables

The following variables appear directly in build scripts, Dockerfiles, and shared service configuration in this repository:

| Variable | Used by | Purpose |
|---|---|---|
| `OPENFRAME_VERSION` | `clients/openframe-client/Makefile`, `cargo build` | Required at Rust build time; consumed by the `openframe-agent-lib` build script, which panics if unset |
| `GITHUB_TOKEN` | Every service `Dockerfile` (via `--mount=type=secret,id=GITHUB_TOKEN`) | Authenticates the Maven build stage against GitHub-hosted Maven resources |
| `GITHUB_ACTOR` | Every service `Dockerfile` (`ARG GITHUB_ACTOR`) | Build argument for GitHub authentication during image builds |
| `SPRING_CONFIG_URL` | Each service's `application.yml` (e.g. `openframe/services/openframe-api/src/main/resources/application.yml`) | Overrides the default Config Server URL (`http://openframe-config.microservices.svc.cluster.local:8888`); also referenced by `configs/base/application.yml` for the shared logback config endpoint |
| `REDIS_CLUSTER_NODES` | `configs/base/application.yml` | Overrides the default Redis Cluster node list (defaults to the three `redis-cluster-N.redis-cluster-headless.datasources.svc.cluster.local:6379` endpoints) |
| `ENCRYPTION_PASSWORD` / `ENCRYPTION_SALT` | `configs/base/application.yml` | Shared encryption settings under `security.encryption`; defaults are present in the shared config but should be overridden per environment |
| `OPENFRAME_CLUSTER_ID` | `configs/base/application.yml` | Identifies the cluster under `openframe.cluster-id` |
| `RELEASE_VERSION` | `configs/base/application.yml` | Used in the Actuator management base path (`management.endpoints.web.base-path`) |
| `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` | `manifests/datasources/mongodb/scripts/mongo-init.sh`, `manifests/datasources/mongodb-meshcentral/scripts/*.sh` | Required MongoDB root credentials for datastore initialization; the init scripts fail fast (`: "${VAR:?Required}"`) if unset |
| `MONGO_INITDB_DATABASE` | Same MongoDB init scripts | Target application database name |
| `MONGO_APP_USERNAME` / `MONGO_APP_PASSWORD` | `manifests/datasources/mongodb/scripts/mongo-init.sh`, `manifests/datasources/mongodb/scripts/readiness-command.sh` | Application-level MongoDB credentials created during first-time initialization |
| `MONGODB_PORT` | `manifests/datasources/mongodb-meshcentral/scripts/*.sh` | MongoDB port override (defaults to `27017`) |
| `KUBERNETES_SERVICE_HOST`, `SERVICE_NAME`, `NAMESPACE` | `manifests/datasources/mongodb-meshcentral/scripts/meshcentral-mongodb-init.sh` | Detects in-cluster execution and builds the replica-set member's fully qualified host name |

> For the full list of application-level settings (Kafka bootstrap servers, NATS server URLs, Pinot controller/broker URLs, Cassandra contact points, gateway routes), see `configs/base/application.yml` and the per-service files under `configs/base/`.

## Verification commands

Run these after installing the tools above to confirm your environment is ready:

```bash
# Core toolchain
java -version
mvn -version
cargo --version
git --version
docker --version
kubectl version --client
helm version

# Confirm the JDK matches the required version (25)
java -version 2>&1 | grep "25"
```

```bash
# Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Validate the Maven multi-module project resolves (does not compile)
mvn validate

# Build all backend services without running tests
mvn clean install -DskipTests
```

```bash
# Verify the Rust agent toolchain and build it
cd clients/openframe-client
OPENFRAME_VERSION=0.0.0-dev cargo build
cd ../..
```

```bash
# Confirm Docker can see the BuildKit secret mechanism used by every service Dockerfile
docker buildx version
```

Once these commands succeed, continue to the [Quick Start](./quick-start.md) guide to bring up the services, or read [First Steps](./first-steps.md) for a guided first run. For local development workflow details, see [Development](../development/README.md) and [Environment Setup](../development/setup/environment.md).

[![Getting Started with OpenFrame - Organization Setup Basics](https://img.youtube.com/vi/-_56_qYvMWk/maxresdefault.jpg)](https://www.youtube.com/watch?v=-_56_qYvMWk)
