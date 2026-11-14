#  Prerequisites

This page lists what you need installed, configured, and accessible before you build, run, or deploy any part of **OpenFrame OSS Tenant** (`flamingo-stack/openframe-oss-tenant`). OpenFrame OSS Tenant is the deployable, self-hosted tenant distribution for [OpenFrame](https://openframe.ai) — the AI-driven MSP platform from [Flamingo](https://flamingo.run). It assembles nine Spring Boot services, a Rust endpoint agent, shared configuration, and Kubernetes manifests into one running tenant.

> If you only want to read about what the platform does, start with [Introduction](./introduction.md). This page is for anyone about to build the services, run the Rust client, or deploy the Kubernetes manifests.

## Who needs what

| You want to... | You need |
|---|---|
| Build and run the Java services (`openframe-api`, `openframe-gateway`, etc.) | JDK 25, Maven, access to GitHub Packages for `com.openframe.oss` artifacts |
| Build the Rust endpoint client (`openframe-client` under `clients/openframe-client`) | Rust toolchain, Cargo, Git access to `flamingo-stack/openframe-oss-lib` |
| Build container images | Docker (BuildKit, for the `--mount=type=secret` syntax used in the Dockerfiles) |
| Deploy the platform | A Kubernetes cluster, Argo CD, Helm-compatible OCI registry access |
| Run the datastores locally | MongoDB, Redis, Cassandra, Kafka, NATS, Pinot (via the Helm charts under `manifests/datasources`) |

## Required software and versions

| Software | Version | Why it is required | Verified in |
|---|---|---|---|
| Java (JDK) | 25 | Compiles and runs all nine Maven service modules; set as `<java.version>` in the parent POM | `pom.xml` |
| Maven | Project-managed via `spring-boot-starter-parent` 4.1.1 | Builds the multi-module reactor (`mvn clean package -pl ... -am`) | `pom.xml`, `openframe/services/*/Dockerfile` |
| Spring Boot | 4.1.1 | Parent framework for every Java service | `pom.xml` |
| Spring Cloud | 2025.1.3 | Config client, service discovery dependencies imported via `spring-cloud-dependencies` BOM | `pom.xml` |
| Rust toolchain (`cargo`) | Edition 2021 | Builds the `openframe-client` binary that links `openframe-agent-lib` | `clients/openframe-client/Cargo.toml`, `clients/openframe-client/Makefile` |
| Docker (BuildKit-enabled) | Any recent version supporting `--mount=type=secret` | Builds service images; `GITHUB_TOKEN` is passed as a BuildKit secret during `mvn` dependency resolution | `openframe/services/openframe-api/Dockerfile` (and sibling Dockerfiles) |
| `eclipse-temurin:25-jdk-alpine-3.23` / `25-jre-alpine-3.23` | 25 | Base images used in every service Dockerfile's build and runtime stages | `openframe/services/*/Dockerfile` |
| Kubernetes | Any version compatible with the Helm charts listed below | Target runtime for `manifests/` | `manifests/apps/values.yaml` |
| Argo CD | Compatible with `oci://ghcr.io/flamingo-stack/openframe-oss-tenant/app-of-apps` chart | Drives the GitOps deployment described in the delivery chain | `.github/workflows/release.yml` |
| Helm (OCI support) | 3.8+ (any Helm able to pull `oci://` chart references) | Pulls datastore and platform charts (Cassandra, Kafka, Redis Cluster, ZooKeeper, NATS, Pinot, ingress-nginx, dev-tools) | `manifests/datasources/*/Chart.yaml`, `manifests/platform/*/Chart.yaml` |
| MongoDB | 7.0.40 (primary) / 8.0.29 (MeshCentral) | Primary document store for tenant data and MeshCentral state | `manifests/datasources/mongodb/values.yaml`, `manifests/datasources/mongodb-meshcentral/values.yaml` |
| Redis (Cluster) | 7.4.2 (Bitnami legacy image) | Caching and session data via `openframe-data-redis` | `manifests/datasources/redis-cluster/values.yaml` |
| Cassandra | 5.0.5 | Event storage for the stream pipeline | `manifests/datasources/cassandra/values.yaml` |
| Kafka | 4.0.0 | Event bus consumed by `openframe-stream` and the Kafka Streams activity-enrichment topology | `manifests/datasources/kafka/values.yaml` |
| NATS | 2.10-alpine | Messaging transport between the platform and managed endpoints | `manifests/datasources/nats/values.yaml` |
| Apache Pinot | 1.4.0 (chart ~0.3.5) | OLAP store queried by the API service | `manifests/datasources/pinot/values.yaml`, `pom.xml` (`pinot.version` 1.5.1 client) |
| ZooKeeper | 3.9.3 | Coordination service required by Kafka | `manifests/datasources/zookeeper/values.yaml` |
| Debezium Connect | 3.3.2 | Change-data-capture connector feeding Kafka | `manifests/datasources/debezium-connect/values.yaml` |
| MySQL (Fleet MDM) | 8.0.46 | Backing store for Fleet MDM | `manifests/datasources/mysql-fleetmdm/values.yaml` |
| ingress-nginx | chart ~4.13.0 | Cluster ingress for the gateway and frontend | `manifests/platform/ingress-nginx/Chart.yaml` |

> Exact patch versions for datastore images and Helm charts are pinned in their respective `values.yaml` / `Chart.yaml` files above — treat the table as a guide, and the cited files as the source of truth before upgrading anything.

## System requirements

- **Build machine (Java services):** a JDK 25-capable machine with enough memory to run a multi-module Maven reactor build (`mvn clean package -pl openframe/services/<service> -am`) plus Docker if you are producing images. Each service Dockerfile runs a two-stage build (`eclipse-temurin:25-jdk-alpine-3.23` for compilation, `eclipse-temurin:25-jre-alpine-3.23` for the runtime image), so a Docker build host needs enough disk space to hold both stages' layers.
- **Build machine (Rust client):** a machine with `cargo`/`rustc` able to target Windows, macOS, and Linux as needed; `clients/openframe-client/Makefile` supports cross-compilation via a `TARGET` variable. The library dependency `openframe-agent-lib` is pulled from `https://github.com/flamingo-stack/openframe-oss-lib.git` at tag `v0.0.5`, so outbound Git access over HTTPS is required.
- **Deployment target:** a Kubernetes cluster able to run the namespaces implied by the Argo CD application set in `manifests/apps/values.yaml` — at minimum a `platform` namespace (ingress, dev tools, config server) and a `datasources` namespace (Cassandra, Kafka, MongoDB, MongoDB for MeshCentral, MySQL for Fleet MDM, NATS, Pinot, Redis Cluster, ZooKeeper), plus a tenant namespace for the OpenFrame services, Fleet MDM, and MeshCentral (`manifests/tenant`).
- **Network egress:** build and deploy hosts need to reach `ghcr.io` (container images and OCI Helm charts under `ghcr.io/flamingo-stack/...`), GitHub (source and Maven dependency resolution), and any mirrors configured in `.mvn/settings.xml`.

## Account and access requirements

- **GitHub access to `flamingo-stack/openframe-oss-tenant`** to clone this repository and open pull requests (code review, not GitHub Issues — see below).
- **GitHub token (`GITHUB_TOKEN`)** with permission to read GitHub Packages, passed as a Docker BuildKit secret (`--mount=type=secret,id=GITHUB_TOKEN`) during every service's Maven build stage, and used by `COPY .mvn/settings.xml /root/.m2/settings.xml` to authenticate Maven against the private `com.openframe.oss` artifacts published from [OpenFrame OSS Library](https://github.com/flamingo-stack/openframe-oss-lib).
- **Read access to `flamingo-stack/openframe-oss-lib`** (directly, via Git) for the Rust client build, since `Cargo.toml` pulls `openframe-agent-lib` straight from that Git repository at tag `v0.0.5`.
- **`ghcr.io/flamingo-stack` registry access** to pull/push the container images and OCI Helm charts referenced throughout `manifests/` and `.github/workflows/release.yml` (for example `ghcr.io/flamingo-stack/openframe-oss-tenant/openframe-api`, `oci://ghcr.io/flamingo-stack/registry/helm-charts/kafka`).
- **Kubernetes cluster credentials** (a working `kubeconfig`) for anyone applying the Argo CD app-of-apps chart or the Helm charts directly.
- **Argo CD access** if you manage the GitOps rollout described by the `argocd_app` entries in the ecosystem delivery chain.
- **Community support, not GitHub Issues:** this project does not use GitHub Issues or GitHub Discussions. Questions and discussion happen on the [OpenMSP Slack community](https://www.openmsp.ai/) ([join link](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)). Code changes still go through pull requests at `https://github.com/flamingo-stack/openframe-oss-tenant/pulls`.

> OpenFrame OSS Tenant has no recorded downstream consumers in the organization's dependency graph (coverage is `full`, meaning this is confirmed, not just unobserved). You are consuming it as the deployable tenant itself, not as a library for another service.

## Environment variables

These variables appear directly in the repository's configuration and build files. Set them according to your environment before building or running services.

| Variable | Used by | Purpose | Default (if any) |
|---|---|---|---|
| `GITHUB_TOKEN` | Every service `Dockerfile` (`openframe-api`, `openframe-authorization-server`, `openframe-client`, `openframe-config`, `openframe-external-api`, `openframe-gateway`) | Authenticates Maven against GitHub Packages during the Docker build stage | none — must be supplied as a BuildKit secret |
| `GITHUB_ACTOR` | Same Dockerfiles (`ARG GITHUB_ACTOR`) | Build argument identifying the acting GitHub user/workflow for authenticated package pulls | none |
| `OPENFRAME_VERSION` | `clients/openframe-client/Makefile`, `clients/openframe-client/src/main.rs` (consumed by `openframe-agent-lib`'s build script) | Required at Rust build time; the library's `build.rs` panics if unset | `0.0.0-dev` (Makefile default) |
| `TARGET` | `clients/openframe-client/Makefile` | Optional Cargo cross-compilation target triple | empty (native build) |
| `SPRING_CONFIG_URL` | Each service's `src/main/resources/application.yml` (e.g. `openframe-api`, `openframe-authorization-server`, `openframe-client`), and `configs/base/application.yml` for logging | Points the service at the Spring Cloud Config server | `http://openframe-config.microservices.svc.cluster.local:8888` (service configs) / `http://openframe-config.platform.svc.cluster.local:8888` (shared logging config) |
| `CONFIG_GIT_BRANCH` | `openframe-config` service configuration (documented in `openframe-config-core`) | Selects the Git branch/label the Config Server serves configuration from | `main` |
| `REDIS_CLUSTER_NODES` | `configs/base/application.yml` | Overrides the Redis Cluster node list | `redis-cluster-0.redis-cluster-headless.datasources.svc.cluster.local:6379,redis-cluster-1...,redis-cluster-2...` |
| `ENCRYPTION_PASSWORD` | `configs/base/application.yml` | Password used for platform-level encryption | placeholder value present in shared config — replace for real deployments |
| `ENCRYPTION_SALT` | `configs/base/application.yml` | Salt used alongside `ENCRYPTION_PASSWORD` | placeholder value present in shared config — replace for real deployments |
| `OPENFRAME_CLUSTER_ID` | `configs/base/application.yml` | Identifies the cluster for presence/delivery bookkeeping | `cluster-id` |
| `RELEASE_VERSION` | `configs/base/application.yml` (management endpoint base path) | Versions the actuator management endpoint path | `v1` |
| `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD` | `manifests/datasources/mongodb/scripts/mongo-init.sh`, `manifests/datasources/mongodb-meshcentral/scripts/meshcentral-mongodb-init.sh` | Required root credentials for MongoDB initialization (script fails fast if unset) | none — required |
| `MONGO_INITDB_DATABASE` | Same MongoDB init scripts, plus `manifests/datasources/mongodb/scripts/readiness-command.sh` | Target database created/initialized on first boot | `meshcentral` (MeshCentral init script default) |
| `MONGO_APP_USERNAME`, `MONGO_APP_PASSWORD` | `manifests/datasources/mongodb/scripts/mongo-init.sh`, `readiness-command.sh` | Application-level MongoDB user created during initialization and used for readiness checks | none — required |
| `MONGODB_PORT` | MongoDB init/readiness scripts | Port MongoDB listens on | `27017` |
| `MONGODB_HOST` | `manifests/datasources/mongodb-meshcentral/scripts/meshcentral-readiness-command.sh` | Host used for the readiness probe | `127.0.0.1` |
| `KUBERNETES_SERVICE_HOST`, `SERVICE_NAME`, `NAMESPACE` | `manifests/datasources/mongodb-meshcentral/scripts/meshcentral-mongodb-init.sh` | Detects in-cluster execution and builds the MongoDB replica-set FQDN | `SERVICE_NAME` defaults to `meshcentral-mongodb`, `NAMESPACE` defaults to `datasources` |

> The `ENCRYPTION_PASSWORD` and `ENCRYPTION_SALT` defaults visible in `configs/base/application.yml` are placeholders baked into shared configuration, not production secrets. Refer to your environment configuration to supply real values through your secret-management process before deploying anything beyond local testing.

## Verification commands

Run these checks before starting work, substituting your own values where a variable is required.

```bash
# Java and Maven toolchain (JDK 25 required by pom.xml)
java -version
mvn -version

# Rust toolchain for the endpoint client
cargo --version
rustc --version

# Docker with BuildKit (needed for --mount=type=secret in service Dockerfiles)
docker version
docker buildx version

# Kubernetes and Helm access for deployment
kubectl version --client
helm version

# Confirm you can resolve the parent POM and module list
mvn -q -pl openframe/services/openframe-api -am help:evaluate -Dexpression=project.version -DforceStdout

# Build one service module locally (mirrors the Dockerfile's RUN step)
mvn clean package -U -pl openframe/services/openframe-api -am \
  --batch-mode --no-transfer-progress \
  -Dmaven.javadoc.skip=true -Dmaven.test.skip=true

# Build the Rust client (requires OPENFRAME_VERSION; see clients/openframe-client/Makefile)
cd clients/openframe-client
OPENFRAME_VERSION=0.0.0-dev cargo build --release --locked
cd -

# Verify GITHUB_TOKEN works for a Docker build that needs GitHub Packages
echo "$GITHUB_TOKEN" | docker build \
  --secret id=GITHUB_TOKEN \
  --build-arg GITHUB_ACTOR="$GITHUB_ACTOR" \
  -f openframe/services/openframe-api/Dockerfile .
```

```bash
# Sanity-check MongoDB readiness once a local/dev instance is up
bash manifests/datasources/mongodb/scripts/readiness-command.sh
```

If every command above succeeds (or, for the Docker build, completes without authentication errors), your machine is ready to build and run OpenFrame OSS Tenant services.

## Next: how the pieces fit together

For the end-to-end architecture — the gateway's routing rules, the Kafka/NATS event flow, and which Argo CD waves deploy which manifests — see [Ecosystem](../reference/architecture/ecosystem.md) and the [architecture reference](../reference/architecture/README.md). Once your toolchain is verified, continue to [Quick Start](./quick-start.md) to bring up the stack, or [First Steps](./first-steps.md) for your first changes. Developers planning ongoing contributions should also review the [development setup environment guide](../development/setup/environment.md) and the [contribution guidelines](../development/contributing/guidelines.md).

If you intend to work on the endpoint agent packaging or CLI tooling, note that the `openframe-cli` tools live in a separate, externally maintained repository: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli), with its own [installation instructions](https://github.com/flamingo-stack/openframe-cli#installation) and [documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs).

[![Getting Started with OpenFrame - Organization Setup Basics](https://img.youtube.com/vi/-_56_qYvMWk/maxresdefault.jpg)](https://www.youtube.com/watch?v=-_56_qYvMWk)
