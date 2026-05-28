# Local Development Guide

This guide walks you through cloning the repository, running services locally, setting up hot-reload, and configuring debug mode.

---

## Clone and Initial Setup

```bash
# Clone the repository
git clone https://github.com/openframehq/openframe-oss-tenant.git
cd openframe-oss-tenant

# Install Node.js tooling dependencies (documentation tooling only)
npm install

# Build the entire Maven project
mvn clean install -DskipTests
```

### First Build Time

The first Maven build downloads ~200MB of dependencies. Subsequent builds are faster due to local caching. The project uses the `openframe-oss-lib` shared library at version `5.64.0`.

---

## Running Infrastructure Locally

Before starting services, ensure your infrastructure is running. The fastest approach for local development is Docker:

```bash
# MongoDB (required)
docker run -d --name openframe-mongo \
  -p 27017:27017 \
  mongo:6.0

# Redis (required for gateway and management)
docker run -d --name openframe-redis \
  -p 6379:6379 \
  redis:7.0-alpine

# NATS (required for agent communication)
docker run -d --name openframe-nats \
  -p 4222:4222 -p 8222:8222 \
  nats:2.10-alpine --http_port 8222

# Kafka (required for stream processing)
# Kafka requires Zookeeper or KRaft mode; use a compose-equivalent setup for your cluster
```

> For a complete production-like setup, deploy to a local Kubernetes cluster using `kind` and the manifests in `manifests/`.

---

## Service Startup Order

Services have dependency relationships. Start them in this order:

### 1. Config Server

```bash
cd openframe/services/openframe-config
SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run
```

The config server serves configuration to all other services. Default port: `8888`.

### 2. Authorization Server

```bash
cd openframe/services/openframe-authorization-server
SPRING_PROFILES_ACTIVE=dev \
SPRING_DATA_MONGODB_URI=mongodb://localhost:27017/openframe_dev \
mvn spring-boot:run
```

Default port: `9000`. Exposes the OIDC discovery at:

```text
http://localhost:9000/.well-known/openid-configuration
```

### 3. API Service

```bash
cd openframe/services/openframe-api
SPRING_PROFILES_ACTIVE=dev \
SPRING_DATA_MONGODB_URI=mongodb://localhost:27017/openframe_dev \
SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI=http://localhost:9000 \
mvn spring-boot:run
```

Default port: `8081`. GraphQL playground at `http://localhost:8081/graphiql`.

### 4. Management Service

```bash
cd openframe/services/openframe-management
SPRING_PROFILES_ACTIVE=dev \
SPRING_DATA_MONGODB_URI=mongodb://localhost:27017/openframe_dev \
SPRING_REDIS_HOST=localhost \
SPRING_KAFKA_BOOTSTRAP_SERVERS=localhost:9092 \
mvn spring-boot:run
```

### 5. Gateway (Last — Entry Point)

```bash
cd openframe/services/openframe-gateway
SPRING_PROFILES_ACTIVE=dev \
SPRING_REDIS_HOST=localhost \
OPENFRAME_GATEWAY_API_SERVICE_URL=http://localhost:8081 \
OPENFRAME_GATEWAY_AUTH_SERVER_URL=http://localhost:9000 \
mvn spring-boot:run
```

Default port: `8080`. All client traffic routes through here.

---

## Hot Reload / Watch Mode

### Java Services (Spring Boot DevTools)

Spring Boot DevTools enables automatic restart on class changes. It's included in the `dev` profile:

```bash
# Run with DevTools enabled (requires dev profile)
SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run
```

With DevTools active:
- Classpath changes trigger automatic restart
- Static resource changes reload without restart
- LiveReload is available on port `35729`

For IntelliJ IDEA: enable **Build project automatically** in Settings → Build, Execution, Deployment → Compiler.

### Frontend Hot Reload

The Next.js frontend (`openframe/services/openframe-frontend`) supports hot module replacement:

```bash
cd openframe/services/openframe-frontend
npm install
npm run dev
```

The frontend dev server runs on `http://localhost:3000` with automatic hot reload on file changes.

### Agent Client (Rust)

The Rust-based `openframe-client` uses `cargo watch` for auto-rebuild:

```bash
cd clients/openframe-client

# Initialize development config
bash scripts/setup_dev_init_config.sh

# Build
cargo build

# Watch mode (requires cargo-watch)
cargo install cargo-watch
cargo watch -x run
```

---

## Debug Configuration

### IntelliJ IDEA — Remote Debug

Add a Remote JVM Debug run configuration:

```text
Host: localhost
Port: 5005
Debugger mode: Attach to remote JVM
```

Start the service with debug port exposed:

```bash
MAVEN_OPTS="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005" \
mvn spring-boot:run
```

### VS Code — Java Debug

`.vscode/launch.json` example for attaching to a running service:

```json
{
  "type": "java",
  "name": "Attach to openframe-api",
  "request": "attach",
  "hostName": "localhost",
  "port": 5005
}
```

### Logging Configuration

Increase log verbosity for debugging:

```bash
# Enable DEBUG logging for OpenFrame packages
LOGGING_LEVEL_COM_OPENFRAME=DEBUG mvn spring-boot:run

# Enable trace for security
LOGGING_LEVEL_ORG_SPRINGFRAMEWORK_SECURITY=TRACE mvn spring-boot:run
```

---

## Working with GraphQL Locally

The API service exposes a GraphQL playground at:

```text
http://localhost:8081/graphiql
```

Example development query to test device listing:

```text
query DeviceList {
  devices(first: 10) {
    edges {
      node {
        id
        hostname
        status
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

For mutations, include your JWT Bearer token in the request headers:

```text
Authorization: Bearer <your-jwt-token>
```

---

## Working with the Agent Client (Dev Init)

The agent client initialization script sets up local development configuration:

```bash
cd clients/openframe-client
bash scripts/setup_dev_init_config.sh
```

This script configures:
- Local API endpoint
- Development registration secret
- Agent identity for local testing

---

## Common Development Tasks

### Rebuild a Single Module

```bash
# Rebuild only the API service
mvn clean install -pl openframe/services/openframe-api -am -DskipTests
```

### Run Tests for a Module

```bash
# Run unit tests for the API service
mvn test -pl openframe/services/openframe-api
```

### Check for Dependency Updates

```bash
# Check for outdated dependencies
mvn versions:display-dependency-updates
```

### MongoDB Shell for Local Data

```bash
# Connect to local MongoDB
docker exec -it openframe-mongo mongosh openframe_dev

# Example: list tenants
db.tenants.find().pretty()

# Example: list users
db.users.find().pretty()
```

---

## Troubleshooting Common Issues

| Issue | Solution |
|-------|---------|
| Port already in use | Check `lsof -i :<port>` and stop conflicting processes |
| MongoDB connection refused | Ensure Docker container is running: `docker ps` |
| JWT validation fails | Confirm Authorization Server is running on port `9000` |
| Kafka consumer lag | Ensure Kafka is running and topics are created |
| Lombok annotations not resolving | Enable annotation processing in IDE settings |
| NATS connection refused | Start NATS container on port `4222` |
