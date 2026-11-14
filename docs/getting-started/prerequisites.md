---
title: Prerequisites
---

# Prerequisites

Before you build, run, or deploy OpenFrame OSS Tenant, confirm your workstation and cluster meet the requirements below. OpenFrame OSS Tenant is a **service** repository (bash, java, rust) that assembles the Spring Boot backend services, a Rust agent client, Kubernetes/Helm manifests, and release automation for the OpenFrame platform. It has no recorded downstream consumers in the organization's dependency graph — it is the deployable tenant layer, not a library other repositories build on.

> For the broader picture of how this repository's services, config, and datastores fit together, see [`../reference/architecture/README.md`](../reference/architecture/README.md) and [`../reference/architecture/ecosystem.md`](../reference/architecture/ecosystem.md).

## Required Software and Versions

The repository builds a multi-module Maven project (Java services) plus a separate Rust agent crate, and it is deployed as Helm charts into Kubernetes. Match versions in the table below to what the project's build files actually declare — the Maven parent POM (`pom.xml`) and the Rust crate (`clients/openframe-client/Cargo.toml`) are the ground truth.

| Software | Required Version | Why it's needed | Source |
|---|---|---|---|
| Java (JDK) | 25 | Compiles and runs every Spring Boot service module (`<java.version>25</java.version>`) | `pom.xml` |
| Maven | 3.9+ (any recent Maven compatible with the `spring-boot-starter-parent` 4.1.1 parent) | Builds the multi-module reactor (`openframe-config`, `openframe-api`, `openframe-client`, `openframe-stream`, `openframe-management`, `openframe-gateway`, `openframe-external-api`, `openframe-authorization-server`, `openframe-test`) | `pom.xml` |
| Rust toolchain (`cargo`, `rustc`) | Edition 2021 toolchain | Builds the `openframe-client` agent binary in `clients/openframe-client` | `clients/openframe-client/Cargo.toml` |
| Docker | Recent stable release with BuildKit | Builds the per-service container images (two-stage builds using `eclipse-temurin:25-jdk-alpine-3.23` and `eclipse-temurin:25-jre-alpine-3.23`) | `openframe/services/openframe-api/Dockerfile` (same pattern repeated per service) |
| kubectl | Version matching your target cluster | Interacts with the Kubernetes cluster that runs the platform, datasource, and tenant workloads | `manifests/apps/values.yaml` |
| Helm | 3.x (OCI-registry support required) | Installs/upgrades charts under `manifests/platform`, `manifests/datasources`, and `manifests/tenant`, several of which are pulled from `oci://ghcr.io/...` registries | `manifests/datasources/cassandra/Chart.yaml`, `manifests/datasources/kafka/Chart.yaml`, `manifests/datasources/redis-cluster/Chart.yaml`, `manifests/datasources/zookeeper/Chart.yaml` |
| Argo CD | Compatible with app-of-apps pattern | Reconciles the `manifests/apps` app-of-apps tree (platform, datasources, tenant waves) | `manifests/apps/values.yaml` |
| MongoDB tooling (`mongosh`) | Compatible with MongoDB 7.0 / 8.0 | Used by the init and readiness scripts for the `mongodb` and `mongodb-meshcentral` datasources | `manifests/datasources/mongodb/scripts/mongo-init.sh`, `manifests/datasources/mongodb-meshcentral/scripts/meshcentral-mongodb-init.sh` |
| GitHub account with a Personal Access Token | N/A | Required at image-build time: Dockerfiles mount a `GITHUB_TOKEN` secret to authenticate Maven dependency resolution against `.mvn/settings.xml` | `openframe/services/openframe-api/Dockerfile` (same pattern for every service Dockerfile) |

> The organization's dependency graph shows this repository pins `com.openframe.oss:*` artifacts and `openframe_agent_lib` at version `7.0.11` / `v0.0.5` from the [OpenFrame OSS Library](https://github.com/flamingo-stack/openframe-oss-lib) repository. You do not build that repository yourself for a normal tenant setup — Maven and Cargo resolve it from the configured registries at build time. (Source: `get_repo_ecosystem` tool.)

### CLI tooling (external repository)

Operational workflows that wrap this repository's services may rely on the **OpenFrame CLI**, which is maintained in a separate repository and is not part of this codebase:

- Repository: [flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)
- Installation: [flamingo-stack/openframe-cli#installation](https://github.com/flamingo-stack/openframe-cli#installation)
- Documentation: [flamingo-stack/openframe-cli/tree/main/docs](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)

Follow that repository's own installation instructions; do not expect its binary or source to be present inside `openframe-oss-tenant`.

## System Requirements

OpenFrame OSS Tenant is deployed as a set of Spring Boot services plus a full datasource stack (MongoDB, MongoDB for MeshCentral, Redis Cluster, Cassandra, Kafka, Zookeeper, NATS, Pinot, MySQL for Fleet, Debezium Connect) under Kubernetes. Plan capacity accordingly:

| Resource | Minimum for local/dev cluster | Notes |
|---|---|---|
| CPU | 4+ cores | Each service Deployment (for example the Config Server) requests 250 millicores and limits to 500 millicores; multiply across eight Java services plus datasources |
| Memory | 16 GB+ available to the cluster | The Config Server alone requests 512 MiB and limits to 1 GiB; MongoDB, Cassandra, Kafka, Redis Cluster, Pinot, and MySQL each add further memory needs |
| Disk | Sufficient persistent storage for MongoDB, Cassandra, Kafka/Zookeeper, Pinot, and MySQL data volumes | Datasource charts (`manifests/datasources/*`) provision their own persistent volumes |
| Container runtime | Docker with BuildKit (`--mount=type=secret`) | Required because every service Dockerfile uses BuildKit secret mounts for `GITHUB_TOKEN` |
| Network egress | Access to `ghcr.io` (container and chart registries), the NATS Helm repo, the ingress-nginx Helm repo, and the Apache Pinot Helm repo | See the delivery chain in [`../reference/architecture/ecosystem.md`](../reference/architecture/ecosystem.md) |
| Kubernetes namespaces | At minimum `platform`, `datasources`, and a tenant namespace | The app-of-apps structure deploys `namespace-platform` and `namespace-datasources` as dedicated wave `-1` applications before everything else |

> **Note:** This repository does not define a local `docker-compose` file — verified facts show no `dockerComposeFiles`. Local iteration is expected to go through the same Kubernetes/Helm manifests that production uses, not a standalone compose stack.

## Account / Access Requirements

- **GitHub access to `flamingo-stack/openframe-oss-tenant`** — to clone the repository and open pull requests.
- **GitHub Personal Access Token (`GITHUB_TOKEN`)** with permission to read Maven packages — every service Dockerfile (for example `openframe/services/openframe-api/Dockerfile`) resolves dependencies from `.mvn/settings.xml` using a mounted `GITHUB_TOKEN` secret during `mvn clean package`.
- **Container registry access (`ghcr.io/flamingo-stack/...`)** — pulling datasource images (MongoDB, Kafka, Cassandra, Redis Cluster, Zookeeper, NATS, Pinot, MySQL, Debezium Connect, etc., all mirrored under `ghcr.io/flamingo-stack/registry/...`) and pulling/pushing the service images this repository's release workflow publishes.
- **Kubernetes cluster access** (`kubeconfig` with sufficient RBAC) — to apply the app-of-apps tree and the individual Helm charts under `manifests/platform`, `manifests/datasources`, and `manifests/tenant`.
- **Argo CD access**, if you manage deployment through the app-of-apps pattern described in `manifests/apps/values.yaml`.
- **OpenMSP Slack community membership** — this project does not use GitHub Issues or GitHub Discussions for questions, coordination, or support; join via [openmsp.ai](https://www.openmsp.ai/) or the [Slack invite link](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA).
- **No default application credentials are published in this repository.** Datasource init scripts (for example `manifests/datasources/mongodb/scripts/mongo-init.sh`) require operators to supply `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD`, `MONGO_INITDB_DATABASE`, `MONGO_APP_USERNAME`, and `MONGO_APP_PASSWORD` through your own environment/secret configuration — refer to your environment configuration rather than any hard-coded value.

## Environment Variables

The shared application configuration in `configs/base/application.yml` and the datasource init scripts define the environment variables services and scripts expect at runtime. Set these through your Kubernetes secrets/ConfigMaps or local shell before running the affected component.

| Variable | Used by | Purpose | Default (if any) |
|---|---|---|---|
| `SPRING_CONFIG_URL` | All services (via `application.yml`'s `logging.config`, and each service's own `application.yml`, e.g. `openframe/services/openframe-api/src/main/resources/application.yml`) | Points services at the Config Server for shared logging config and `optional:configserver:` import | `http://openframe-config.microservices.svc.cluster.local:8888` (service-level) / `http://openframe-config.platform.svc.cluster.local:8888` (shared logging) |
| `REDIS_CLUSTER_NODES` | Shared config (`configs/base/application.yml`) | Overrides the three default Redis Cluster node addresses | `redis-cluster-0.redis-cluster-headless.datasources.svc.cluster.local:6379,redis-cluster-1...,redis-cluster-2...` |
| `OPENFRAME_CLUSTER_ID` | Shared config (`configs/base/application.yml`) | Identifies the cluster for the `openframe.cluster-id` property | `cluster-id` |
| `ENCRYPTION_PASSWORD` | Shared config (`configs/base/application.yml`) | Password used for `security.encryption.password` | A development placeholder is defined in the base config — replace it in your own environment configuration for anything beyond local experimentation |
| `ENCRYPTION_SALT` | Shared config (`configs/base/application.yml`) | Salt used for `security.encryption.salt` | A development placeholder is defined in the base config — replace it in your own environment configuration |
| `RELEASE_VERSION` | Shared config (`configs/base/application.yml`), management/Prometheus paths | Versions the management base path (`/management/{version}`) and the image tag supplied to pods | `v1` |
| `GITHUB_TOKEN` | Docker build (`openframe/services/*/Dockerfile`), mounted as a BuildKit secret | Authenticates Maven dependency resolution during image build | none — must be supplied |
| `GITHUB_ACTOR` | Docker build (`openframe/services/*/Dockerfile`), build argument | Passed to the build stage alongside the token | none — must be supplied |
| `MONGO_INITDB_ROOT_USERNAME` / `MONGO_INITDB_ROOT_PASSWORD` | `manifests/datasources/mongodb/scripts/mongo-init.sh`, `manifests/datasources/mongodb-meshcentral/scripts/meshcentral-mongodb-init.sh` | Root credentials used to initialize MongoDB and the MongoDB replica set | none — required, scripts fail fast if unset |
| `MONGO_INITDB_DATABASE` | Same MongoDB init scripts | Target application database name | `meshcentral` (MeshCentral MongoDB script default) |
| `MONGO_APP_USERNAME` / `MONGO_APP_PASSWORD` | `manifests/datasources/mongodb/scripts/mongo-init.sh`, `manifests/datasources/mongodb/scripts/readiness-command.sh` | Application-level MongoDB user created during initialization and used for readiness checks | none — required |
| `MONGODB_PORT` | MongoDB init/readiness scripts | Port MongoDB listens on | `27017` |
| `MONGODB_HOST` | `manifests/datasources/mongodb-meshcentral/scripts/meshcentral-readiness-command.sh` | Host used for the readiness probe | `127.0.0.1` |
| `KUBERNETES_SERVICE_HOST`, `SERVICE_NAME`, `NAMESPACE` | `manifests/datasources/mongodb-meshcentral/scripts/meshcentral-mongodb-init.sh` | Detected automatically inside Kubernetes to build the replica-set member FQDN (`${POD_NAME}.${SERVICE_NAME}.${NAMESPACE}.svc.cluster.local`) | `SERVICE_NAME` defaults to `meshcentral-mongodb`, `NAMESPACE` defaults to `datasources` |
| `OPENFRAME_VERSION` | Rust agent build (`clients/openframe-client/Makefile`, `clients/openframe-client/src/main.rs`) | Consumed by the `openframe-agent-lib` build script at compile time; the build panics if unset | `0.0.0-dev` (Makefile default) |

> Never invent or reuse example credentials such as `admin@example.com` / `admin123` for these variables. Where no default is shown above, refer to your own environment configuration (Kubernetes Secret, local `.env`, or CI secret store).

## Verification Commands

Run these checks before attempting a build or deployment. Each targets a tool or version actually required by the project's build files.

```bash
# Java 25 toolchain, matching <java.version>25</java.version> in pom.xml
java -version

# Maven, used to build the multi-module reactor defined in pom.xml
mvn -version

# Rust toolchain, used to build clients/openframe-client (edition 2021)
rustc --version
cargo --version

# Docker with BuildKit, required by every service Dockerfile's
# "RUN --mount=type=secret,id=GITHUB_TOKEN" instruction
docker version
docker buildx version

# kubectl, for interacting with the target Kubernetes cluster
kubectl version --client

# Helm, including OCI support used by charts such as
# manifests/datasources/cassandra/Chart.yaml (oci://ghcr.io/...)
helm version

# Confirm the GitHub token is exported before a local image build
echo "GITHUB_TOKEN is set: ${GITHUB_TOKEN:+yes}"
```

Validate the Maven reactor resolves and compiles without running the full test suite (mirrors the flags used in the service Dockerfiles, e.g. `openframe/services/openframe-api/Dockerfile`):

```bash
mvn clean package \
  -U \
  -pl openframe/services/openframe-api \
  -am \
  --batch-mode \
  --no-transfer-progress \
  -Dmaven.javadoc.skip=true \
  -Dmaven.test.skip=true
```

Validate the Rust agent crate builds (requires `OPENFRAME_VERSION`, consumed by `openframe-agent-lib`'s build script per `clients/openframe-client/Makefile`):

```bash
cd clients/openframe-client
OPENFRAME_VERSION=0.0.0-dev cargo build --release
```

Confirm cluster access and the expected namespaces/datasource workloads are reachable before applying the app-of-apps tree:

```bash
kubectl get namespaces
kubectl get pods -n datasources
kubectl get pods -n platform
```

Once your prerequisites check out, continue with [`./quick-start.md`](./quick-start.md) to stand up the platform, or [`./introduction.md`](./introduction.md) for an overview of what OpenFrame OSS Tenant provides. Deeper environment and local-development guidance lives in [`../development/setup/environment.md`](../development/setup/environment.md) and [`../development/setup/local-development.md`](../development/setup/local-development.md).

[![Getting Started with OpenFrame - Organization Setup Basics](https://img.youtube.com/vi/-_56_qYvMWk/maxresdefault.jpg)](https://www.youtube.com/watch?v=-_56_qYvMWk)
