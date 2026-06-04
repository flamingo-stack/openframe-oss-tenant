# Quick Start

Get OpenFrame OSS Tenant running in under 5 minutes.

[![OpenFrame: 5-Minute MSP Platform Walkthrough](https://img.youtube.com/vi/er-z6IUnAps/maxresdefault.jpg)](https://www.youtube.com/watch?v=er-z6IUnAps)

---

## TL;DR — The Essentials

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-run/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Install Node.js dependencies (AI agent tooling)
npm install

# 3. Build all Java services
mvn clean install -DskipTests

# 4. Start infrastructure dependencies
# (MongoDB, Kafka, Redis, NATS, Debezium)
# Use your preferred method — see Infrastructure Setup below

# 5. Start individual services
# See "Starting Individual Services" below
```

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/flamingo-run/openframe-oss-tenant.git
cd openframe-oss-tenant
```

---

## Step 2: Install Node.js Dependencies

The root `package.json` manages AI agent tooling dependencies:

```bash
npm install
```

This installs:
- `@voltagent/core` — AI agent orchestration framework
- `@ai-sdk/anthropic` + `@anthropic-ai/sdk` — Claude AI SDK
- `zod` — Runtime schema validation

---

## Step 3: Build the Java Services

Build all backend modules from the Maven parent POM:

```bash
# Full build with tests
mvn clean install

# Faster build skipping tests (recommended for first setup)
mvn clean install -DskipTests
```

This builds all 9 Spring Boot services defined in the parent POM:
- `openframe-config`
- `openframe-api`
- `openframe-client`
- `openframe-stream`
- `openframe-management`
- `openframe-gateway`
- `openframe-external-api`
- `openframe-authorization-server`
- `openframe-test`

---

## Step 4: Set Up Infrastructure

OpenFrame requires MongoDB, Kafka, Redis, and NATS to run. Start these using your preferred method.

### Kubernetes / Manifests

The repository includes Kubernetes manifests for integrated tools under `manifests/integrated-tools/`. For MongoDB with MeshCentral:

```bash
# MongoDB initialization (includes MeshCentral integration)
bash manifests/integrated-tools/mongodb-meshcentral/scripts/meshcentral-mongodb-init.sh
```

### Manual / Docker

Alternatively, start each dependency manually. An example using Docker CLI:

```bash
# MongoDB
docker run -d --name openframe-mongo \
  -p 27017:27017 \
  mongo:7

# Redis
docker run -d --name openframe-redis \
  -p 6379:6379 \
  redis:7

# NATS with JetStream
docker run -d --name openframe-nats \
  -p 4222:4222 \
  nats:2 -js
```

For Kafka + Debezium, use the official Confluent images or a Kafka operator of your choice.

---

## Step 5: Configure Environment

Create environment configuration for the authorization server and API service. A minimal dev setup:

```bash
# Set up the client development configuration
bash clients/openframe-client/scripts/setup_dev_init_config.sh
```

This script fetches the active agent registration secret from the OpenFrame API and configures the local client agent for development.

---

## Step 6: Start Services

Start each service individually from its module directory:

```bash
# Start Config Server first
cd openframe/services/openframe-config
mvn spring-boot:run

# Then start Authorization Server
cd openframe/services/openframe-authorization-server
mvn spring-boot:run

# Then start API Service
cd openframe/services/openframe-api
mvn spring-boot:run

# Then start Gateway (entry point for all traffic)
cd openframe/services/openframe-gateway
mvn spring-boot:run
```

---

## Expected Results

Once all services are running, you should be able to:

**Check API Health:**
```bash
curl https://localhost/api/health
# Expected: HTTP 200 with health status
```

**Access the Authorization Endpoint:**
```bash
curl https://localhost/auth/.well-known/openid-configuration
# Expected: OIDC Discovery document (JSON)
```

**Access the GraphQL Playground** (if enabled in development mode):
```text
https://localhost/graphql/graphiql
```

---

## Service Port Reference

| Service | Default Port | Protocol |
|---------|-------------|---------|
| Gateway | 443 (HTTPS) | HTTP/WebSocket |
| API Service | 8080 | HTTP |
| Authorization Server | 8081 | HTTP |
| Management Service | 8082 | HTTP |
| Stream Service | 8083 | HTTP |
| External API | 8084 | HTTP |
| Config Server | 8888 | HTTP |

> Ports can vary by environment. The Gateway routes all external traffic and proxies to internal services.

---

## Next Steps

After completing the quick start:

- Review the [Prerequisites](prerequisites.md) to ensure your environment has everything needed
- Follow the [First Steps Guide](first-steps.md) to configure your tenant and explore key features
