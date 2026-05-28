# Prerequisites

Before running or developing the OpenFrame OSS Tenant platform, ensure your environment meets the following requirements.

---

## Required Software

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| **Java (JDK)** | 21 | Backend service runtime |
| **Maven** | 3.8+ | Build & dependency management |
| **Node.js** | 18+ | Documentation tooling (`@voltagent/core`, Anthropic SDK) |
| **npm** | 9+ | Node package management |
| **Docker** | 24+ | Running infrastructure services |
| **kubectl** | 1.28+ | Kubernetes deployment management |
| **Git** | 2.40+ | Source control |

---

## Infrastructure Services

OpenFrame OSS Tenant depends on the following infrastructure services. These are typically deployed via the Kubernetes manifests in the `manifests/` directory:

| Service | Version | Role |
|---------|---------|------|
| **MongoDB** | 6.0+ | Primary persistence layer (documents, users, tenants, devices) |
| **Redis** | 7.0+ | Caching, rate limiting, distributed locks (ShedLock) |
| **Apache Kafka** | 3.6+ | Event streaming, CDC ingestion |
| **NATS** | 2.10+ | Real-time device messaging & agent communication |
| **Apache Cassandra** | 4.1+ | Unified log event storage |
| **Apache Pinot** | 1.2+ | Analytics and device query engine |

> MongoDB and MeshCentral are also used together in the integrated tools setup. See `manifests/integrated-tools/mongodb-meshcentral/` for the init scripts.

---

## System Requirements

### Minimum (Development)

| Resource | Minimum |
|----------|---------|
| CPU | 4 cores |
| RAM | 16 GB |
| Disk | 50 GB SSD |
| OS | Linux (Ubuntu 20.04+), macOS (12+), or Windows 11 with WSL2 |

### Recommended (Production)

| Resource | Recommended |
|----------|------------|
| CPU | 8+ cores |
| RAM | 32 GB+ |
| Disk | 200 GB+ SSD |
| OS | Linux (Ubuntu 22.04 LTS) |

---

## Account & Access Requirements

| Requirement | Details |
|------------|---------|
| **GitHub Access** | Read access to the `openframe-oss-tenant` repository |
| **Container Registry** | Access to pull OpenFrame Docker images |
| **Kubernetes Cluster** | A running cluster (local like kind/minikube or cloud-managed) |
| **SMTP / Email Service** | Required for invitation and password reset emails (optional for development) |
| **Google/Microsoft OAuth** | Optional — only needed for SSO configuration |

---

## Environment Variables

The following environment variables are used across the platform services. Refer to your deployment configuration for the actual values:

| Variable | Service | Description |
|---------|---------|-------------|
| `SPRING_DATA_MONGODB_URI` | All backend services | MongoDB connection URI |
| `SPRING_KAFKA_BOOTSTRAP_SERVERS` | Stream, Management | Kafka broker addresses |
| `SPRING_REDIS_HOST` | Gateway, Management | Redis host |
| `NATS_URL` | Client, Management, Stream | NATS server URL |
| `SPRING_SECURITY_OAUTH2_ISSUER_URI` | API, Gateway | OAuth2 issuer base URL |
| `OPENFRAME_TENANT_DOMAIN` | Authorization Server | Platform tenant domain |
| `PINOT_BROKER_URL` | Stream, API | Apache Pinot broker URL |

> These values are populated from your cluster configuration. Never hardcode secrets — use Kubernetes Secrets or a secrets management solution.

---

## Development Tool Recommendations

| Tool | Recommended Version | Notes |
|------|--------------------|----|
| **IntelliJ IDEA** | 2024.1+ | Best Java Spring support |
| **VS Code** | 1.85+ | Good for frontend/TypeScript |
| **Lens / OpenLens** | Latest | Kubernetes cluster management |
| **MongoDB Compass** | Latest | MongoDB GUI |
| **Offset Explorer** | Latest | Kafka topic browser |

---

## Verification Commands

Run these commands to verify your environment is ready:

```bash
# Java version (must be 21+)
java -version

# Maven version (must be 3.8+)
mvn -version

# Node.js version (must be 18+)
node --version

# npm version (must be 9+)
npm --version

# Docker version
docker --version

# kubectl connectivity
kubectl cluster-info

# Git version
git --version
```

**Expected output examples:**

```text
openjdk version "21.0.x" 2024-xx-xx
Apache Maven 3.9.x
v20.x.x
10.x.x
Docker version 24.x.x
Kubernetes control plane is running at https://...
git version 2.xx.x
```

---

## MongoDB + MeshCentral Integration Setup

If you're setting up the integrated MeshCentral tool, the initialization scripts are available at:

```text
manifests/integrated-tools/mongodb-meshcentral/scripts/
  ├── mongodb-entrypoint.sh          # MongoDB container entrypoint
  ├── meshcentral-readiness-command.sh  # Readiness probe
  └── meshcentral-mongodb-init.sh    # MongoDB init for MeshCentral
```

And for the base MongoDB datasource:

```text
manifests/datasources/mongodb/scripts/
  └── readiness-command.sh           # MongoDB readiness probe
```

---

## OpenFrame Client Development Setup

When working with the Rust-based `openframe-client` agent, an additional initialization script is available:

```bash
clients/openframe-client/scripts/setup_dev_init_config.sh
```

This script sets up the initial development configuration for the agent client. Refer to the client-specific documentation for usage details.

---

## OpenMSP Community Support

If you run into environment setup issues, reach out to the community:

- 💬 **OpenMSP Slack**: [Join here](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- 🌐 **Community Hub**: [https://www.openmsp.ai/](https://www.openmsp.ai/)
