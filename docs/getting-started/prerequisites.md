:# Prerequisites

This page lists what you need installed, accessible, and configured before you build, run, or deploy any part of **OpenFrame OSS Tenant** (`flamingo-stack/openframe-oss-tenant`). The repository is a polyglot service distribution: nine Spring Boot Maven modules under `openframe/services`, a Rust endpoint agent under `clients/openframe-client`, Helm charts under `manifests`, and shared configuration under `configs/base`. Most of its domain logic is supplied by pinned `com.openframe.oss` libraries (version `7.0.11`) and the `openframe_agent_lib` crate (`v0.0.5`) from the separate [OpenFrame OSS Library](https://github.com/flamingo-stack/openframe-oss-lib) repository — this repository owns the runnable applications, container images, configuration, and Kubernetes/Argo CD deployment topology.

If you are new to the project, read [Introduction](./introduction.md) first; after satisfying the items below, continue to [Quick Start](./quick-start.md).

> OpenFrame is part of the broader [Flamingo](https://flamingo.run) platform. Community support, questions, and planning happen on the [OpenMSP Slack community](https://www.openmsp.ai/) ([join link](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)) rather than GitHub Issues or Discussions.

[![Getting Started with OpenFrame - Organization Setup Basics](https://img.youtube.com/vi/-_56_qYvMWk/maxresdefault.jpg)](https://www.youtube.com/watch?v=-_56_qYvMWk)

## Required software and versions

The build is driven by the root [`pom.xml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/pom.xml) (Java/Maven multi-module build) and [`clients/openframe-client/Cargo.toml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/clients/openframe-client/Cargo.toml) (Rust agent). Deployment is driven by the Helm charts under `manifests/` and the Argo CD application definitions in `manifests/apps/values.yaml`.

| Software | Required version | Why it is needed | Source of truth |
|---|---|---|---|
| Java (JDK) | 25 | Compiles and runs all nine `openframe/services/*` Spring Boot modules. | `<java.version>25</java.version>` in `pom.xml` |
| Maven | Compatible with the Spring Boot 4.1.1 parent | Builds the multi-module Java project (`mvn clean package`). | `pom.xml` parent `spring-boot-starter-parent` 4.1.1 |
| Rust toolchain (`cargo`) | Edition 2021 toolchain | Builds the `openframe-client` Rust agent binary. | `clients/openframe-client/Cargo.toml` |
| Docker | Recent stable release | Builds the multi-stage container images (Maven build stage plus `eclipse-temurin:25-jre-alpine-3.23` runtime stage) and runs local containers. | `openframe/services/*/Dockerfile` (e.g. `openframe/services/openframe-api/Dockerfile`) |
| kubectl / a Kubernetes cluster | Any cluster able to run the Helm charts | Runs the platform, datasource, and tenant workloads deployed by Argo CD. | `manifests/apps/values.yaml`, `manifests/platform`, `manifests/datasources`, `manifests/tenant` |
| Helm | Compatible with OCI chart references | Installs/renders the charts referenced from `manifests/*/Chart.yaml` (several are `oci://ghcr.io/flamingo-stack/registry/helm-charts/...`). | `manifests/datasources/*/Chart.yaml`, `manifests/platform/*/Chart.yaml` |
| Argo CD | Any recent version supporting app-of-apps | Deploys the published `oci://ghcr.io/flamingo-stack/openframe-oss-tenant/app-of-apps` chart and reconciles the `argocd_app` entries in `manifests/apps/values.yaml`. | `.github/workflows/release.yml` delivery chain |
| `mongosh` (MongoDB Shell) | Compatible with MongoDB 7.x/8.x | Used by the datasource init/readiness scripts for MongoDB and MeshCentral's MongoDB. | `manifests/datasources/mongodb/scripts/mongo-init.sh`, `manifests/datasources/mongodb-meshcentral/scripts/*.sh` |
| OpenFrame CLI | Latest release | External bootstrap/management tooling for OpenFrame deployments (see note below). | External repository |

> **OpenFrame CLI is maintained in a separate repository.** It is not a subdirectory of this project. Install and read usage instructions from [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli#installation) and its [docs](https://github.com/flamingo-stack/openframe-cli/tree/main/docs).

### Key dependency/runtime versions pinned by this repository

These are not tools you install yourself, but fixed versions the build and deployment depend on — useful when diagnosing a mismatch:

| Dependency | Pinned version | Where it is declared |
|---|---|---|
| Spring Boot (parent) | 4.1.1 | `pom.xml` |
| Spring Cloud | 2025.1.3 | `pom.xml` (`spring-cloud.version`) |
| `com.openframe.oss:*` libraries | 7.0.11 | `pom.xml` (`openframe.libs.version`), consumed from [OpenFrame OSS Library](https://github.com/flamingo-stack/openframe-oss-lib) |
| `openframe_agent_lib` (Rust crate) | `v0.0.5` (git tag) | `clients/openframe-client/Cargo.toml` |
| Apache Pinot client | 1.5.1 | `pom.xml` (`pinot.version`) |
| Apache NiFi API | 1.22.0 | `pom.xml` (`nifi.version`) |
| MongoDB server image | 7.0.40 (datasources) / 8.0.29 (MeshCentral) | `manifests/datasources/mongodb/values.yaml`, `manifests/datasources/mongodb-meshcentral/values.yaml` |
| Kafka (chart) | ~32.4.3 | `manifests/datasources/kafka/Chart.yaml` |
| NATS (chart) | ~2.12.2 | `manifests/datasources/nats/Chart.yaml` |
| Cassandra (chart) | ~12.3.9 | `manifests/datasources/cassandra/Chart.yaml` |
| Redis Cluster (chart) | ~11.5.0 | `manifests/datasources/redis-cluster/Chart.yaml` |
| Pinot (chart) | ~0.3.5 | `manifests/datasources/pinot/Chart.yaml` |
| Ingress NGINX (chart) | ~4.13.0 | `manifests/platform/ingress-nginx/Chart.yaml` |

## System requirements

The nine Spring Boot services, the Rust agent, and the datasource workloads (MongoDB, Redis Cluster, Kafka, Cassandra, Pinot, NATS, Zookeeper, Debezium Connect, MySQL for Fleet MDM) are designed to run as containerized workloads in Kubernetes, not as a single local process:

- **Container runtime:** required for building and running the per-service Docker images (each Dockerfile uses a `--platform=$BUILDPLATFORM eclipse-temurin:25-jdk-alpine-3.23` build stage and an `eclipse-temurin:25-jre-alpine-3.23` runtime stage).
- **Kubernetes cluster:** required to run the full ecosystem — the platform namespace (`manifests/platform`), the datasource namespace (`manifests/datasources`), and the tenant chart (`manifests/tenant`) all deploy as Kubernetes workloads reconciled through Argo CD app-of-apps definitions in `manifests/apps/values.yaml`.
- **Memory and storage headroom for datasources:** the datasource tier alone brings up Cassandra, Kafka plus Zookeeper, MongoDB (two separate deployments — one for OpenFrame data, one for MeshCentral), MySQL (Fleet MDM), NATS, Pinot, and Debezium Connect. Provision a cluster or local Kubernetes environment (for example `kind` or a cloud dev cluster) with enough CPU, memory, and persistent storage for all of these components running concurrently.
- **Non-root container execution:** workloads in this repository run as non-root with a locked-down `securityContext` (`runAsNonRoot: true`, dropped capabilities, `readOnlyRootFilesystem: true`). Any writable path a process needs (for example `/tmp`, log directories, the Config Server's Git cache) must be backed by an `emptyDir` volume — keep this in mind when extending manifests locally.
- **GitHub Container Registry (GHCR) access:** container images are published to `ghcr.io/flamingo-stack/openframe-oss-tenant/*` and the charts pull several base images from `ghcr.io/flamingo-stack/registry/*` mirrors (see `docs/reference/architecture/ecosystem.md` for the full delivery chain). Your cluster's image-pull configuration must be able to reach GHCR.

## Account / access requirements

| Requirement | Purpose |
|---|---|
| GitHub account with access to `flamingo-stack/openframe-oss-tenant` | Clone the repository and open pull requests. |
| GitHub account with access to `flamingo-stack/openframe-oss-lib` | Review or trace the upstream library source that most service behavior is implemented in (pinned at `7.0.11` for Java, `v0.0.5` for the Rust agent). |
| `GITHUB_TOKEN` with package/registry read access | Every service `Dockerfile` mounts a build secret named `GITHUB_TOKEN` (`--mount=type=secret,id=GITHUB_TOKEN`) used by Maven during the image build, and an `ARG GITHUB_ACTOR` is passed for GitHub authentication. Both are required to resolve private dependencies during the build. |
| GHCR pull access | Required to pull published images such as `ghcr.io/flamingo-stack/openframe-oss-tenant/openframe-api` and the chart-referenced `ghcr.io/flamingo-stack/registry/...` base images. |
| Kubernetes cluster admin/operator access | Required to install Argo CD, apply the app-of-apps chart, and manage namespaces (`platform`, `datasources`, `tenant`). |
| Argo CD access | Required to observe and manage the reconciled applications listed in `manifests/apps/values.yaml` (platform, datasource, and tenant waves). |
| OpenMSP Slack membership | Required for community support and discussion — this project does not use GitHub Issues or Discussions for that purpose. Join via [openmsp.ai](https://www.openmsp.ai/) or the [direct invite link](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA). |

> Default credentials, usernames, or passwords are not documented here. Refer to your environment configuration (Helm values, secrets, or your deployment pipeline) for actual datastore and service credentials.

## Environment variables

These variables surface directly in the repository's Dockerfiles, shared application configuration, and datasource init scripts. Set only those relevant to the component you are working on.

### Build-time (Docker image build)

| Variable | Used by | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | All `openframe/services/*/Dockerfile` (via `--mount=type=secret,id=GITHUB_TOKEN`) | Authenticates Maven dependency resolution during the image build stage. |
| `GITHUB_ACTOR` | All `openframe/services/*/Dockerfile` (`ARG GITHUB_ACTOR`) | Passed as a build argument for GitHub authentication context. |
| `OPENFRAME_VERSION` | `clients/openframe-client/Makefile`, `clients/openframe-client/Cargo.toml` build script | Required at Rust build time; the `openframe-agent-lib` build script panics if it is unset. The Makefile defaults it to `0.0.0-dev` for local builds. |

### Runtime (shared service configuration)

These are read from [`configs/base/application.yml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/configs/base/application.yml) and related service configs, with defaults shown in `${VAR:default}` form in the source:

| Variable | Default (if set) | Purpose |
|---|---|---|
| `REDIS_CLUSTER_NODES` | the in-cluster `redis-cluster-0/1/2...redis-cluster-headless.datasources.svc.cluster.local:6379` node list | Redis Cluster node addresses for `spring.data.redis.cluster.nodes`. |
| `OPENFRAME_CLUSTER_ID` | `cluster-id` | Identifies the OpenFrame cluster instance (`openframe.cluster-id`). |
| `ENCRYPTION_PASSWORD` | a baked-in development default | Password used for `security.encryption.password`; override per environment. |
| `ENCRYPTION_SALT` | a baked-in development default | Salt used for `security.encryption.salt`; override per environment. |
| `SPRING_CONFIG_URL` | `http://openframe-config.microservices.svc.cluster.local:8888` (service-level) / `http://openframe-config.platform.svc.cluster.local:8888` (shared logging) | Points each service at the OpenFrame Config Server for configuration import and shared Logback XML. |
| `RELEASE_VERSION` | `v1` | Used in the management endpoint base path (`management.endpoints.web.base-path`). |

### Datasource initialization scripts

Required by `manifests/datasources/mongodb/scripts/mongo-init.sh` and `manifests/datasources/mongodb-meshcentral/scripts/*.sh`:

| Variable | Required | Purpose |
|---|---|---|
| `MONGO_INITDB_ROOT_USERNAME` | Yes | Root username for MongoDB replica-set initialization. |
| `MONGO_INITDB_ROOT_PASSWORD` | Yes | Root password for MongoDB replica-set initialization. |
| `MONGO_INITDB_DATABASE` | Yes | Target application database name. |
| `MONGO_APP_USERNAME` | Yes | Application-level MongoDB user created during init. |
| `MONGO_APP_PASSWORD` | Yes | Password for the application-level MongoDB user. |
| `MONGODB_PORT` | No (defaults to `27017`) | Port used by readiness and init scripts. |
| `KUBERNETES_SERVICE_HOST` | Set automatically inside a cluster | Detected by the MeshCentral MongoDB init script to compute the pod's fully-qualified replica-set hostname. |
| `SERVICE_NAME` / `NAMESPACE` | No (default to `meshcentral-mongodb` / `datasources`) | Used with `KUBERNETES_SERVICE_HOST` to build the replica-set member FQDN. |

> Treat `ENCRYPTION_PASSWORD`, `ENCRYPTION_SALT`, `GITHUB_TOKEN`, and all `MONGO_*` credential variables as secrets. Do not commit real values; manage them through your deployment pipeline's secret storage.

## Verification commands

Run these after installing prerequisites to confirm your toolchain is ready, before attempting a build or deployment.

```bash
# Java: confirm JDK 25 is available (required by pom.xml java.version)
java -version

# Maven: confirm it can see the project and resolve the multi-module build
mvn -version

# Build the full multi-module Java project (skip tests for a fast sanity check)
mvn clean package -Dmaven.test.skip=true

# Rust/Cargo: confirm the toolchain is installed
cargo --version

# Build the OpenFrame client agent (requires OPENFRAME_VERSION; Makefile defaults to 0.0.0-dev)
cd clients/openframe-client
OPENFRAME_VERSION=0.0.0-dev cargo build --release

# Docker: confirm the engine is running
docker info

# Build one service image locally (mirrors the release pipeline's build args and secret mount)
docker build \
  --secret id=GITHUB_TOKEN,env=GITHUB_TOKEN \
  --build-arg GITHUB_ACTOR=<your-github-actor> \
  -f openframe/services/openframe-api/Dockerfile .

# kubectl: confirm cluster connectivity
kubectl cluster-info

# Helm: confirm the client is installed and can reach OCI registries
helm version

# mongosh: confirm the MongoDB shell used by datasource init/readiness scripts is available
mongosh --version
```

If every command above succeeds, you are ready to continue with [Quick Start](./quick-start.md) and then [First Steps](./first-steps.md). For a deeper look at how the services, datasources, and Rust agent fit together, see the [architecture reference](../reference/architecture/README.md) and the generated [ecosystem overview](../reference/architecture/ecosystem.md). Local development workflows and environment setup are covered in [Development Setup — Environment](../development/setup/environment.md) and [Local Development](../development/setup/local-development.md).
