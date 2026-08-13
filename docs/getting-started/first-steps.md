# First Steps

After cloning and building OpenFrame OSS Tenant, here are the first 5 things to do to understand and work with the platform.

---

## 1. Understand the Project Structure

OpenFrame OSS Tenant is a polyglot monorepo. Familiarize yourself with the key directories:

```text
openframe-oss-tenant/
├── openframe/services/          # Java/Spring Boot microservices
│   ├── openframe-api/           # GraphQL + REST API (port 8080)
│   ├── openframe-gateway/       # Spring Cloud Gateway (port 8081)
│   ├── openframe-authorization-server/  # OAuth2/OIDC (port 8082)
│   ├── openframe-external-api/  # Public REST API (port 8083)
│   ├── openframe-client/        # Agent lifecycle service (port 8084)
│   ├── openframe-stream/        # Kafka Streams (port 8085)
│   └── openframe-management/    # Platform management service
├── clients/
│   ├── openframe-client/        # Rust endpoint agent
│   └── openframe-chat/          # Tauri + React desktop app (Fae)
├── manifests/                   # Kubernetes manifests for infrastructure
└── pom.xml                      # Root Maven POM
```

Each Spring Boot service has its own `src/main/resources/application.yml` for configuration.

---

## 2. Explore the Reference Architecture

The platform architecture documentation describes how all components interconnect. Read it to understand the request lifecycle:

- All client traffic flows through the **Gateway Service** (port 8081)
- The **API Service** (port 8080) handles GraphQL queries and REST endpoints, powered by Netflix DGS
- The **Authorization Server** (port 8082) issues multi-tenant OAuth2 JWT tokens
- The **openframe-client** Rust agent communicates via NATS JetStream — never directly via HTTP
- The **Stream Service** consumes Kafka events and writes to Cassandra and Apache Pinot

See the [Architecture Overview](../development/architecture/README.md) for diagrams.

---

## 3. Run the Rust Agent Doctor

After building the `openframe-client` Rust agent, run the built-in diagnostics to verify your local environment:

```bash
cd clients/openframe-client
OPENFRAME_VERSION=0.0.0-dev cargo build
./target/debug/openframe-client doctor
```

The `doctor` command runs environment health checks against the agent configuration and reports any missing dependencies or configuration issues.

---

## 4. Explore the openframe-chat Desktop App

The `openframe-chat` Tauri application is the end-client AI interface (Fae). To run it in development mode:

```bash
cd clients/openframe-chat
npm install
npm run tauri dev
```

Key areas to explore in the codebase:

| Path | Purpose |
|---|---|
| `src/App.tsx` | Root React component — provider tree setup |
| `src/views/ChatView.tsx` | Main chat interface |
| `src/hooks/` | React Query hooks for API interactions |
| `src/services/` | GraphQL and REST API service clients |
| `src-tauri/src/nats_bridge/` | Rust NATS bridge for streaming AI responses |
| `src-tauri/src/token_decryption_service.rs` | AES-256-GCM token decryption |

---

## 5. Review the Configuration Scripts

The repository includes initialization scripts for development infrastructure:

| Script | Purpose |
|---|---|
| `setup_dev_init_config.sh` (in openframe-oss-lib, under `clients/openframe-client/scripts/`) | Sets up development initialization config for the Rust agent |
| `manifests/datasources/mongodb/scripts/readiness-command.sh` | MongoDB readiness probe |
| `manifests/datasources/mongodb-meshcentral/scripts/meshcentral-mongodb-init.sh` | Initializes MongoDB for MeshCentral integration |

To set up the Rust agent for local development (the script moved to openframe-oss-lib with the agent sources):

```bash
bash <openframe-oss-lib>/clients/openframe-client/scripts/setup_dev_init_config.sh
```

---

## Common Initial Configuration

### Spring Boot Services

Each Spring Boot service reads configuration from `src/main/resources/application.yml`. Key properties to configure for local development:

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/openframe
  kafka:
    bootstrap-servers: localhost:9092

# Service-specific NATS configuration (Client Service)
nats:
  url: nats://localhost:4222
```

### Rust Agent (openframe-client)

The Rust agent reads its configuration from a platform-specific directory. For local development, set `OPENFRAME_DEV_MODE=1` to use a user-local config directory:

```bash
export OPENFRAME_DEV_MODE=1
```

The agent can be installed as a system service (requires admin/root):

```bash
sudo ./target/release/openframe-client install \
  --serverUrl https://your-openframe-instance.example.com \
  --initialKey YOUR_INITIAL_KEY \
  --orgId YOUR_ORG_ID
```

> **Note:** Replace the server URL, initial key, and org ID values with those from your running OpenFrame instance. Refer to your environment configuration for these values.

---

## Where to Get Help

OpenFrame OSS Tenant is community-supported through the **OpenMSP Slack workspace**. This is the primary place for questions, feature requests, and announcements.

- **Join OpenMSP Slack:** [https://www.openmsp.ai/](https://www.openmsp.ai/)
- **Direct invite:** [Join Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **OpenFrame Website:** [https://openframe.ai](https://openframe.ai)
- **Flamingo Platform:** [https://flamingo.run](https://flamingo.run)

---

## Exploring Key Features

Once running, key features to explore:

| Feature | How to Access |
|---|---|
| **GraphQL API** | API Service at port 8080 — use a GraphQL client like GraphiQL or Insomnia |
| **AI Chat (Fae)** | Run `openframe-chat` via `npm run tauri dev` |
| **Agent Registration** | Use `openframe-client install` with a valid initial key |
| **OAuth2 Login** | Authorization Server at port 8082 handles tenant-scoped login |
| **Multi-Tenant Isolation** | All API queries are automatically scoped by JWT `tenant_id` claim |
| **Script Execution (RMM)** | GraphQL mutations on the API Service dispatch scripts via NATS |
