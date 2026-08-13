# Quick Start

Get OpenFrame OSS Tenant running locally in a few steps. This guide focuses on getting the codebase cloned, built, and introduced to the key components.

[![OpenFrame Product Walkthrough (Beta Access)](https://img.youtube.com/vi/awc-yAnkhIo/maxresdefault.jpg)](https://www.youtube.com/watch?v=awc-yAnkhIo)

---

## TL;DR — 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Build all backend services (Java / Spring Boot)
mvn clean install -DskipTests

# 3. Install frontend dependencies (openframe-chat desktop app)
cd clients/openframe-chat
npm install

# 4. Build the Rust agent
cd ../openframe-client
OPENFRAME_VERSION=0.0.0-dev cargo build

# 5. Return to root
cd ../..
```

---

## Step 1 — Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

The repository has the following top-level structure:

```text
openframe-oss-tenant/
├── openframe/
│   └── services/              # Spring Boot microservices
│       ├── openframe-api/     # Core REST + GraphQL API
│       ├── openframe-gateway/ # Spring Cloud Gateway
│       ├── openframe-authorization-server/
│       ├── openframe-client/  # Agent lifecycle service (Java)
│       ├── openframe-stream/  # Kafka Streams service
│       ├── openframe-management/
│       └── openframe-external-api/
├── clients/
│   ├── openframe-client/      # Rust cross-platform agent
│   └── openframe-chat/        # Tauri + React desktop app (Fae)
├── manifests/                 # Kubernetes manifests & data service configs
└── pom.xml                    # Parent Maven POM
```

---

## Step 2 — Build the Backend (Spring Boot Services)

The backend is a Maven multi-module project. Build all services from the root:

```bash
mvn clean install -DskipTests
```

To run tests during the build:

```bash
mvn clean install
```

To build a single service (for example, the API service):

```bash
mvn clean install -pl openframe/services/openframe-api -am -DskipTests
```

> **Java 21 is required.** Verify with `java -version` before building.

---

## Step 3 — Build the Rust Agent (openframe-client)

```bash
cd clients/openframe-client
OPENFRAME_VERSION=0.0.0-dev cargo build
```

For a release build:

```bash
OPENFRAME_VERSION=0.0.0-dev cargo build --release
```

The compiled binary will be at `target/debug/openframe-client` (or `target/release/openframe-client` for release builds).

---

## Step 4 — Install and Run the Desktop App (openframe-chat)

The `openframe-chat` desktop app uses React 19 + Vite for the frontend and Tauri 2 with a Rust backend.

```bash
cd clients/openframe-chat

# Install Node.js dependencies
npm install

# Start in development mode (hot reload)
npm run tauri dev
```

> **Tauri prerequisites** (system libraries for WebView) must be installed first. See [Prerequisites](prerequisites.md) for platform-specific instructions.

---

## Expected Output

When the Tauri development server starts successfully, you should see output similar to:

```text
   VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3003/
  ➜  Network: use --host to expose

[tauri] Running application...
```

The OpenFrame Chat desktop window will launch automatically.

---

## Frontend Build Only (No Tauri)

If you only need to work on the React frontend without running the Tauri shell:

```bash
cd clients/openframe-chat
npm run dev
```

This starts the Vite dev server at `http://localhost:3003`.

---

## Verify the Rust Agent CLI

After building the agent, check its available commands:

```bash
./clients/openframe-client/target/debug/openframe-client --help
```

You should see:

```text
Usage: openframe-client <COMMAND>

Commands:
  install    Install the agent as a system service
  uninstall  Remove the installed system service
  run        Run the client directly
  doctor     Run environment health checks
  help       Print this message or help for subcommands
```

---

## Development Environment Variable

When running the Rust agent locally, set `OPENFRAME_DEV_MODE` to use local directories and disable TLS certificate verification:

```bash
OPENFRAME_DEV_MODE=1 ./target/debug/openframe-client run
```

---

## Next Steps

With the codebase built, you can now:

- Review [First Steps](first-steps.md) to explore key platform features
- Read the [Architecture Overview](../development/architecture/README.md) to understand how services communicate
- Set up your [Development Environment](../development/setup/environment.md) for a full IDE-based workflow
