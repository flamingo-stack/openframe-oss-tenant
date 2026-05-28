# Development Environment Setup

This guide covers IDE recommendations, required developer tools, and editor configuration for working with the OpenFrame OSS Tenant platform.

---

## IDE Recommendations

### IntelliJ IDEA (Strongly Recommended)

**IntelliJ IDEA Ultimate** (2024.1+) provides the best experience for this project due to its native support for:

- Spring Boot & Spring Cloud
- Maven multi-module projects
- Java 21 features (records, sealed classes, virtual threads)
- Netflix DGS GraphQL
- Kotlin (used in some test utilities)
- Lombok annotation processing

**Setup Steps:**

1. Open IntelliJ IDEA → **File → Open** → select the repo root `pom.xml`
2. Choose **"Open as Project"** — IntelliJ will import all Maven modules
3. Set Project SDK to **Java 21** under **File → Project Structure → Project SDK**
4. Enable Annotation Processing: **Settings → Build → Compiler → Annotation Processors → Enable annotation processing** (required for Lombok)

**Recommended Plugins:**

| Plugin | Purpose |
|--------|---------|
| **Lombok** | Required for `@Data`, `@Builder`, `@Slf4j` annotations |
| **SonarLint** | Real-time code quality checks |
| **EnvFile** | Load `.env` files for local run configurations |
| **HTTP Client** | Test REST endpoints directly from IDE |
| **MongoDB Plugin** | Connect to local MongoDB from IDE |
| **GraphQL** | Syntax highlighting for `.graphqls` schema files |

### VS Code (Frontend / Rust Agent)

For working on the Next.js frontend (`openframe/services/openframe-frontend`) or the Rust-based agent (`clients/openframe-client`), VS Code is recommended.

**Required Extensions:**

| Extension | Purpose |
|-----------|---------|
| **ESLint** | TypeScript/JavaScript linting |
| **Prettier** | Code formatting |
| **Tailwind CSS IntelliSense** | Tailwind class completion |
| **rust-analyzer** | Rust language server for agent development |
| **GraphQL: Language Feature Support** | GraphQL schema intellisense |
| **Docker** | Docker container management |

---

## Required Development Tools

### Java Development

```bash
# Verify Java 21 is installed and active
java -version

# If using SDKMAN (recommended for version management)
sdk install java 21.0.3-tem
sdk use java 21.0.3-tem

# Verify Maven
mvn -version
```

### Node.js Tooling

The repository root `package.json` contains dependencies for documentation tooling (`@voltagent/core`, `@ai-sdk/anthropic`). This is **tooling only** — not the application runtime.

```bash
# Install Node dependencies for documentation tooling
npm install

# Verify Node.js version
node --version  # Should be 18+
```

### Rust (Agent Client Only)

If working on `clients/openframe-client` (the device agent written in Rust):

```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Verify
rustc --version
cargo --version
```

---

## Environment Variables for Development

Create a `.env` file in the service directory you're working on, or configure them in your IDE run configuration.

### Core Variables

```bash
# MongoDB
SPRING_DATA_MONGODB_URI=mongodb://localhost:27017/openframe_dev

# Redis
SPRING_REDIS_HOST=localhost
SPRING_REDIS_PORT=6379

# Kafka
SPRING_KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# NATS
NATS_URL=nats://localhost:4222

# Cassandra
SPRING_CASSANDRA_CONTACT_POINTS=localhost
SPRING_CASSANDRA_PORT=9042
SPRING_CASSANDRA_KEYSPACE_NAME=openframe_dev

# Pinot
PINOT_BROKER_URL=http://localhost:8099

# OAuth2 (Authorization Server)
OPENFRAME_AUTH_SERVER_URL=http://localhost:9000
SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI=http://localhost:9000

# Active Spring Profile
SPRING_PROFILES_ACTIVE=dev
```

### Service-Specific Variables

**openframe-gateway:**

```bash
# CORS allowed origins
OPENFRAME_GATEWAY_CORS_ALLOWED_ORIGINS=http://localhost:3000

# Rate limiting
OPENFRAME_RATE_LIMIT_ENABLED=false
```

**openframe-authorization-server:**

```bash
# JWT signing key paths
OPENFRAME_SECURITY_JWT_PRIVATE_KEY_PATH=classpath:keys/private.pem
OPENFRAME_SECURITY_JWT_PUBLIC_KEY_PATH=classpath:keys/public.pem

# SSO (optional)
OPENFRAME_SSO_GOOGLE_CLIENT_ID=your-google-client-id
OPENFRAME_SSO_GOOGLE_CLIENT_SECRET=your-google-client-secret
```

---

## Git Configuration

```bash
# Set up your identity
git config user.name "Your Name"
git config user.email "you@example.com"

# Recommended: enable useful Git features
git config pull.rebase true
git config core.autocrlf input  # Linux/macOS
```

### Recommended `.gitconfig` Aliases

```bash
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.lg "log --oneline --graph --decorate --all"
```

---

## Docker for Local Infrastructure

While the full platform runs on Kubernetes, you can run infrastructure dependencies locally with Docker for development:

```bash
# Start MongoDB
docker run -d --name mongo-dev \
  -p 27017:27017 \
  -e MONGO_INITDB_DATABASE=openframe_dev \
  mongo:6.0

# Start Redis
docker run -d --name redis-dev \
  -p 6379:6379 \
  redis:7.0-alpine

# Start NATS
docker run -d --name nats-dev \
  -p 4222:4222 \
  -p 8222:8222 \
  nats:2.10-alpine --http_port 8222
```

> For a complete local stack including Kafka and Cassandra, use the Kubernetes manifests with a local cluster tool like `kind` or `minikube`.

---

## Editor Settings

### `.editorconfig`

The project follows standard Java/Spring formatting conventions:

```text
root = true

[*]
charset = utf-8
indent_style = space
indent_size = 4
end_of_line = lf
trim_trailing_whitespace = true
insert_final_newline = true

[*.{yml,yaml,json}]
indent_size = 2

[*.{ts,tsx,js,jsx}]
indent_size = 2
```

---

## Verifying Your Setup

Run this checklist to confirm your environment is ready:

```bash
# 1. Java 21
java -version

# 2. Maven build succeeds
mvn clean compile -pl openframe/services/openframe-api -am -DskipTests

# 3. Node.js tooling
npm install && node --version

# 4. Docker services running
docker ps

# 5. Kubernetes access (if using cluster)
kubectl cluster-info
```
