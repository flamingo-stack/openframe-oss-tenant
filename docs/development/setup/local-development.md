# Local Development Guide

This guide covers how to clone, set up, and run OpenFrame OSS Tenant services locally for development.

---

## Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

---

## Repository Structure

```text
openframe-oss-tenant/
├── openframe/
│   └── services/
│       ├── openframe-api/              # GraphQL + REST API (port 8080)
│       ├── openframe-gateway/          # Spring Cloud Gateway (port 8081)
│       ├── openframe-authorization-server/ # OAuth2 (port 8082)
│       ├── openframe-external-api/     # Public API (port 8083)
│       ├── openframe-client/           # Agent service (port 8084)
│       ├── openframe-stream/           # Kafka Streams (port 8085)
│       ├── openframe-management/       # Management tasks
│       ├── openframe-config/           # Config Server
│       └── openframe-test/             # E2E test runner
├── clients/
│   ├── openframe-client/               # Rust endpoint agent
│   └── openframe-chat/                 # Tauri + React desktop app
├── manifests/                          # Kubernetes + datasource configs
└── pom.xml                             # Root Maven POM
```

---

## Running Spring Boot Services Locally

### Build All Services

```bash
# Build all modules, skip tests
mvn clean install -DskipTests

# Build with tests
mvn clean install
```

### Build a Single Service

```bash
# Build only the API service and its dependencies
mvn clean install -pl openframe/services/openframe-api -am -DskipTests
```

### Run a Service

Each Spring Boot service can be run from its module directory:

```bash
# Start the API service
cd openframe/services/openframe-api
mvn spring-boot:run
```

Or from the root using the module flag:

```bash
mvn spring-boot:run -pl openframe/services/openframe-api
```

### Typical Service Startup Order

To run the full stack locally, start services in this order (infrastructure first):

1. MongoDB, Redis, Kafka, NATS, Cassandra, Pinot (via your container setup)
2. `openframe-config` (Spring Cloud Config Server)
3. `openframe-authorization-server`
4. `openframe-api`
5. `openframe-client` (Spring Boot agent service)
6. `openframe-stream`
7. `openframe-management`
8. `openframe-gateway`
9. `openframe-external-api`

---

## Running the Rust Agent (openframe-client)

```bash
cd clients/openframe-client

# Development build
OPENFRAME_VERSION=0.0.0-dev cargo build

# Enable dev mode for local directories and relaxed TLS
export OPENFRAME_DEV_MODE=1

# Run the agent directly (no system service)
./target/debug/openframe-client run

# Run health checks
./target/debug/openframe-client doctor
```

### Hot Reload for Rust

Rust does not have built-in hot reload, but `cargo-watch` provides file-watching:

```bash
# Install cargo-watch
cargo install cargo-watch

# Watch and rebuild on changes
OPENFRAME_VERSION=0.0.0-dev cargo watch -x build
```

---

## Running the Desktop App (openframe-chat)

```bash
cd clients/openframe-chat

# Install dependencies
npm install

# Start in development mode with hot reload
npm run tauri dev
```

### Vite Dev Server Only (No Tauri Shell)

To iterate on the React UI without launching the native window:

```bash
npm run dev
```

The Vite dev server starts at `http://localhost:3003`.

### TypeScript Type Checking

```bash
npx tsc --noEmit
```

### Linting and Formatting (Biome)

```bash
# Check
npx biome check .

# Fix
npx biome check --write .
```

---

## Setting Up the Rust Agent Dev Config

The setup script moved to openframe-oss-lib with the agent sources; run it from a side-by-side checkout:

```bash
bash <openframe-oss-lib>/clients/openframe-client/scripts/setup_dev_init_config.sh
```

This script creates the necessary configuration files in the development directory layout used when `OPENFRAME_DEV_MODE=1` is set.

---

## Debug Configuration

### Spring Boot — IntelliJ IDEA

1. Open the project in IntelliJ IDEA
2. Navigate to the application entry point (e.g., `ApiApplication.java`)
3. Click the debug icon (🐛) next to `main()` or use **Run → Debug**
4. Set breakpoints as needed

**Remote Debug (attach to running process):**

```bash
# Start the service with JVM debug options
mvn spring-boot:run \
  -pl openframe/services/openframe-api \
  -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
```

Then attach IntelliJ to port 5005 via **Run → Attach to Process**.

### Rust — VS Code / RustRover

For `openframe-client`, use the `CodeLLDB` extension in VS Code:

**`.vscode/launch.json`:**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "lldb",
      "request": "launch",
      "name": "Debug openframe-client",
      "cargo": {
        "args": ["build", "--manifest-path", "clients/openframe-client/Cargo.toml"]
      },
      "args": ["run"],
      "env": {
        "OPENFRAME_DEV_MODE": "1"
      }
    }
  ]
}
```

### openframe-chat — Browser DevTools

When running `npm run tauri dev`, the Tauri WebView exposes browser-style DevTools:

- **macOS/Linux:** Right-click → Inspect Element
- **Windows:** Right-click → Inspect

For the Rust Tauri backend, use standard Rust debugging via RustRover or LLDB.

---

## Useful Local Development Tips

### Watch Maven Build Output

```bash
# Build and tail output
mvn clean install -DskipTests 2>&1 | tee build.log
```

### Clear Rust Build Cache

```bash
cd clients/openframe-client
cargo clean
```

### Clear Node Modules

```bash
cd clients/openframe-chat
rm -rf node_modules
npm install
```

### Check Service Health

Each Spring Boot service exposes a Spring Actuator health endpoint:

```bash
# API service health check
curl http://localhost:8080/actuator/health

# Gateway health check
curl http://localhost:8081/actuator/health
```

---

## Summary: Common Commands

| Task | Command |
|---|---|
| Build all backend services | `mvn clean install -DskipTests` |
| Run API service | `mvn spring-boot:run -pl openframe/services/openframe-api` |
| Build Rust agent | `cd clients/openframe-client && OPENFRAME_VERSION=0.0.0-dev cargo build` |
| Run Rust agent (dev) | `OPENFRAME_DEV_MODE=1 ./target/debug/openframe-client run` |
| Run desktop app | `cd clients/openframe-chat && npm run tauri dev` |
| Frontend-only dev | `cd clients/openframe-chat && npm run dev` |
| Lint TypeScript | `cd clients/openframe-chat && npx biome check .` |
