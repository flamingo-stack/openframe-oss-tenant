# Development Environment Setup

This guide covers IDE recommendations, required tools, editor plugins, and environment configuration for working with OpenFrame OSS Tenant.

---

## IDE Recommendations

### IntelliJ IDEA (Recommended for Java/Backend)

[IntelliJ IDEA](https://www.jetbrains.com/idea/) is the recommended IDE for working with the Spring Boot microservices. The **Community Edition** is free and sufficient for most development tasks.

**Required Plugins:**
- **Lombok Plugin** — The codebase uses Project Lombok extensively (`@Data`, `@Builder`, `@Slf4j`, etc.)
- **Spring Boot** — Spring support is built into IntelliJ IDEA Ultimate; Community Edition users should install the Spring Assistant plugin

**Recommended Plugins:**
- **GraphQL** — For editing `.graphqls` schema files
- **Kubernetes** — For editing manifests in the `manifests/` directory
- **MongoDB** — For browsing MongoDB collections during development
- **Checkstyle-IDEA** — For code style enforcement

**Import the Project:**

```bash
# Open IntelliJ IDEA and import as Maven project
# File → Open → select the root pom.xml
```

IntelliJ will automatically detect all Maven modules.

---

### RustRover / VS Code (Recommended for Rust)

For working on the Rust components (`clients/openframe-client` and `clients/openframe-chat` Tauri backend):

- **[RustRover](https://www.jetbrains.com/rust/)** (JetBrains) — Dedicated Rust IDE, excellent for large Rust projects
- **VS Code** with the `rust-analyzer` extension

**VS Code Extensions for Rust:**
- `rust-analyzer` — Language server for Rust
- `Even Better TOML` — For editing `Cargo.toml` files
- `Tauri` — Tauri-specific tooling

---

### VS Code (Recommended for TypeScript/Frontend)

For working on `clients/openframe-chat` (React + Vite):

**Required Extensions:**
- `Biome` — The project uses [Biome](https://biomejs.dev/) (`@biomejs/biome`) for formatting and linting (replaces ESLint + Prettier)
- `TypeScript` (built-in)
- `Tailwind CSS IntelliSense` — The project uses Tailwind CSS 3

**Recommended Extensions:**
- `GraphQL: Language Feature Support` — For editing GraphQL queries in TypeScript files
- `Tauri` — For Tauri-specific IPC commands

---

## Toolchain Installation

### Java 21

```bash
# Using SDKMAN (recommended for version management)
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk install java 21.0.3-ms

# Verify
java -version
```

### Maven

```bash
# With SDKMAN
sdk install maven

# Or download from https://maven.apache.org/download.cgi
mvn -version
```

### Rust

```bash
# Install rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Verify
rustc --version
cargo --version
```

### Node.js (for openframe-chat)

```bash
# Using nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
nvm use 20

# Verify
node --version
npm --version
```

---

## Environment Variables for Development

Configure these variables in your shell profile (`~/.bashrc`, `~/.zshrc`, etc.) or in your IDE's run configurations.

### Rust Agent

```bash
# Enable development mode (local directories, relaxed TLS)
export OPENFRAME_DEV_MODE=1
```

### Spring Boot Services

These are typically set in each service's `application-local.yml` or passed as JVM arguments in your IDE:

```bash
# MongoDB
export SPRING_DATA_MONGODB_URI="mongodb://localhost:27017/openframe"

# Kafka
export SPRING_KAFKA_BOOTSTRAP_SERVERS="localhost:9092"

# Redis
export SPRING_DATA_REDIS_HOST="localhost"
export SPRING_DATA_REDIS_PORT="6379"

# NATS (Client Service)
export NATS_URL="nats://localhost:4222"
```

### IntelliJ Run Configuration

To set environment variables for a Spring Boot run configuration in IntelliJ:

1. Open **Run → Edit Configurations**
2. Select the Spring Boot application
3. Click **Modify options → Environment variables**
4. Add the required variables

---

## Biome (Linting & Formatting for TypeScript)

The `openframe-chat` project uses [Biome](https://biomejs.dev/) instead of ESLint/Prettier.

```bash
cd clients/openframe-chat

# Check linting issues
npx biome check .

# Fix auto-fixable issues
npx biome check --write .

# Format only
npx biome format --write .
```

Configure your editor to use Biome for format-on-save:

**VS Code settings (`.vscode/settings.json`):**

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "biomejs.biome"
  }
}
```

---

## Git Configuration

The repository uses standard Git with no special hooks pre-configured. Recommended settings:

```bash
# Set your identity
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

# Recommended: use main as the default branch name
git config --global init.defaultBranch main
```

---

## Summary Checklist

| Tool | Status |
|---|---|
| JDK 21 installed and `JAVA_HOME` set | ✅ / ❌ |
| Maven 3.9+ installed | ✅ / ❌ |
| Rust stable toolchain installed | ✅ / ❌ |
| Node.js 20 LTS installed | ✅ / ❌ |
| Tauri system dependencies installed | ✅ / ❌ |
| IDE configured with recommended plugins | ✅ / ❌ |
| Biome extension installed (VS Code) | ✅ / ❌ |
