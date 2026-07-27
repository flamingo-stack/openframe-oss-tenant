# Prerequisites

Before working with OpenFrame OSS Tenant, ensure your development environment meets the following requirements.

---

## Required Software

### Backend (Java / Maven)

| Tool | Minimum Version | Notes |
|---|---|---|
| **JDK (Java Development Kit)** | 21 | OpenJDK 21 recommended (matches `<java.version>21</java.version>` in pom.xml) |
| **Apache Maven** | 3.9+ | Used for building all Spring Boot services |

### Frontend / Desktop Client

| Tool | Minimum Version | Notes |
|---|---|---|
| **Node.js** | 20 LTS | Required for the `openframe-chat` React app |
| **npm** | 9+ | Comes bundled with Node.js |
| **Rust** | 1.78+ (stable) | Required for `openframe-client` (Rust agent) and `openframe-chat` (Tauri backend) |
| **Tauri CLI** | 2.x | Bundled via `@tauri-apps/cli` devDependency in `openframe-chat` |

### Infrastructure / Data Services

| Service | Notes |
|---|---|
| **MongoDB** | Primary transactional datastore for all services |
| **Apache Kafka** | Event streaming for the Stream Service |
| **NATS / JetStream** | Agent-to-platform messaging (used by openframe-client and Client Service) |
| **Redis** | Session cache and rate limiting |
| **Apache Cassandra** | Time-series log and command result storage |
| **Apache Pinot** | Real-time analytics queries |

> **Note:** For local development, the manifests directory contains Kubernetes manifests and initialization scripts for these data services. See the [Local Development](../development/setup/local-development.md) guide for environment setup details.

---

## System Requirements

| Requirement | Minimum | Recommended |
|---|---|---|
| **CPU** | 4 cores | 8+ cores |
| **RAM** | 8 GB | 16+ GB |
| **Disk** | 20 GB free | 40+ GB SSD |
| **OS** | Linux / macOS / Windows 10+ | Linux (Ubuntu 22.04) or macOS 14+ |

> Running all services locally is resource-intensive. For development, it is common to run infrastructure services (Kafka, MongoDB, NATS, Redis, Cassandra, Pinot) via container orchestration and only run the specific Spring Boot service you are working on locally.

---

## Rust Toolchain Setup

The `openframe-client` (Rust agent) and `openframe-chat` (Tauri) require a working Rust toolchain.

```bash
# Install rustup (Rust toolchain installer)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install the stable toolchain
rustup toolchain install stable
rustup default stable

# Verify
rustc --version
cargo --version
```

For cross-compilation targets (building the agent for other platforms):

```bash
# macOS ARM → macOS Intel
rustup target add x86_64-apple-darwin

# Linux x86_64
rustup target add x86_64-unknown-linux-gnu

# Windows x86_64
rustup target add x86_64-pc-windows-msvc
```

---

## Tauri Prerequisites (openframe-chat)

Tauri requires native system libraries for the WebView. Follow the [official Tauri prerequisites guide](https://tauri.app/start/prerequisites/) for your OS.

### Linux (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

### macOS

```bash
xcode-select --install
```

### Windows

Install the [Microsoft Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

---

## Account and Access Requirements

| Requirement | Details |
|---|---|
| **GitHub Account** | To clone the repository and access releases |
| **OpenMSP Community (Slack)** | For support, announcements, and discussion — [join here](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) |

---

## Key Environment Variables

The following environment variables are commonly used across the platform. Specific values depend on your deployment configuration.

| Variable | Used By | Purpose |
|---|---|---|
| `OPENFRAME_DEV_MODE` | openframe-client | Set to `1` to use user-local directories and disable TLS cert verification for local dev |
| `SPRING_DATA_MONGODB_URI` | All Spring Boot services | MongoDB connection string |
| `SPRING_KAFKA_BOOTSTRAP_SERVERS` | API, Stream services | Kafka broker addresses |
| `SPRING_DATA_REDIS_HOST` | Gateway, Management | Redis host |
| `NATS_URL` | Client Service | NATS server connection URL |

> Refer to each service's `application.yml` for the full list of supported properties.

---

## Verification Commands

Run these to confirm your environment is ready:

```bash
# Java
java -version
# Expected: openjdk version "21.x.x"

# Maven
mvn -version
# Expected: Apache Maven 3.x.x

# Node.js
node -version
# Expected: v20.x.x or higher

# Rust
rustc --version
# Expected: rustc 1.78.x (stable)

# Cargo
cargo --version
# Expected: cargo 1.78.x

# Tauri CLI (install first if missing)
npx @tauri-apps/cli --version
# Expected: tauri-cli x.x.x
```

---

## Next Steps

Once your environment is ready, continue with:

- [Quick Start](quick-start.md) — Clone the repository and run your first build
- [First Steps](first-steps.md) — Configure and explore the platform after setup
