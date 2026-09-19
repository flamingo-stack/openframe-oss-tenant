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

# 3. Build the Rust agent
cd clients/openframe-client
OPENFRAME_VERSION=0.0.0-dev cargo build

# 4. Return to root
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
│   └── openframe-client/      # Rust cross-platform agent
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
