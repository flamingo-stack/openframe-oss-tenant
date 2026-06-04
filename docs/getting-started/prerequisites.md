# Prerequisites

Before setting up OpenFrame OSS Tenant, ensure your environment meets the following requirements.

---

## Required Software

| Tool | Minimum Version | Purpose |
|------|-----------------|---------|
| **Java (JDK)** | 21 | Backend microservices (Spring Boot) |
| **Apache Maven** | 3.9+ | Build system for Java services |
| **Node.js** | 18+ | AI agent tooling (`package.json` scripts) |
| **npm** or **pnpm** | npm 9+ / pnpm 8+ | JavaScript package management |
| **Docker** | 24+ | Running infrastructure dependencies |
| **Docker Compose** | 2.x | Orchestrating local infrastructure containers |
| **Git** | 2.x | Source code management |
| **curl** | any recent | API testing and setup scripts |

---

## Infrastructure Dependencies

The platform requires the following infrastructure services. These are typically run via Docker in development:

| Service | Version | Purpose |
|---------|---------|---------|
| **MongoDB** | 6.x or 7.x | Primary datastore for all domain entities |
| **Apache Kafka** | 3.6+ | Event streaming between services |
| **Redis** | 7.x | Caching, rate limiting, distributed locks (ShedLock) |
| **Debezium Connect** | 2.x | Change Data Capture from MongoDB to Kafka |
| **NATS Server** | 2.x | Messaging for device agents |
| **Apache Cassandra** (optional) | 4.x | Unified log event storage |
| **Apache Pinot** (optional) | 1.2 | Real-time analytics queries |
| **Spring Cloud Config** | (included) | Centralized service configuration |

---

## System Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 16 GB |
| **Disk** | 20 GB | 50 GB (for data + Docker images) |
| **OS** | Linux / macOS / Windows (WSL2) | Linux / macOS |

> **Note:** Running all services simultaneously in development requires at least 8 GB of RAM. Consider running only the services you need during development.

---

## Account and Access Requirements

| Requirement | Details |
|-------------|---------|
| **GitHub account** | Required to clone the repository and contribute |
| **OpenMSP Slack** | Community support: [join here](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) |
| **Anthropic API key** | Required if using AI agent features (`@ai-sdk/anthropic`) |

---

## Environment Variables

The following environment variables are needed across services. Refer to each service's configuration files for the full list.

### Core Platform Variables

```bash
# Tenant identifier (defaults to 'oss' for OSS deployments)
TENANT_ID=oss

# MongoDB connection
SPRING_DATA_MONGODB_URI=mongodb://localhost:27017/openframe

# Redis connection
SPRING_REDIS_HOST=localhost
SPRING_REDIS_PORT=6379

# Kafka bootstrap servers
SPRING_KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# NATS server
NATS_SERVER_URL=nats://localhost:4222
```

### Authorization Server Variables

```bash
# Base URL for the authorization server
AUTH_SERVER_BASE_URL=https://localhost/auth

# Encryption key for tenant private keys
ENCRYPTION_KEY=<your-secure-key>

# OAuth2 client configuration
OAUTH2_CLIENT_ID=openframe-client
OAUTH2_CLIENT_SECRET=<your-secret>
```

### AI Agent Variables

```bash
# Anthropic Claude API key (required for AI agent features)
ANTHROPIC_API_KEY=sk-ant-...
```

### Frontend Variables

```bash
# Public API URL
NEXT_PUBLIC_APP_URL=https://openframe.ai

# GraphQL endpoint
NEXT_PUBLIC_GRAPHQL_URL=https://localhost/graphql
```

> **Security Note:** Never commit real secrets to version control. Use `.env.local` files for local development and a secrets manager (e.g., HashiCorp Vault, AWS Secrets Manager) in production.

---

## Verification Commands

Run these commands to verify your environment is correctly set up:

### Java

```bash
java -version
# Expected: openjdk 21.x.x or similar
```

### Maven

```bash
mvn -version
# Expected: Apache Maven 3.9.x
```

### Node.js

```bash
node --version
# Expected: v18.x.x or higher
```

### Docker

```bash
docker --version
# Expected: Docker version 24.x.x

docker compose version
# Expected: Docker Compose version v2.x.x
```

### Git

```bash
git --version
# Expected: git version 2.x.x
```

### MongoDB (if running locally)

```bash
mongosh --version
# Expected: 2.x.x
```

---

## Platform Support Notes

> **macOS users:** Install Java via [SDKMAN](https://sdkman.io/) or [Homebrew](https://brew.sh/). For ARM (M1/M2/M3), ensure you install the `aarch64` variant of the JDK.

> **Windows users:** The platform is fully supported on Windows using [WSL2](https://docs.microsoft.com/en-us/windows/wsl/install). Docker Desktop with WSL2 backend is recommended.

> **Linux users:** Ensure Docker is configured to run without `sudo` for the current user:
> ```bash
> sudo usermod -aG docker $USER
> ```
> Log out and back in to apply the change.
