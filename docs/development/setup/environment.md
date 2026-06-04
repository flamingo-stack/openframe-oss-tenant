# Development Environment Setup

This guide walks you through setting up a complete development environment for OpenFrame OSS Tenant.

---

## IDE Recommendations

### IntelliJ IDEA (Recommended for Backend)

IntelliJ IDEA Ultimate or Community is the recommended IDE for Java/Spring Boot development.

**Required Plugins:**
- **Lombok** — Required for `@Data`, `@Builder`, `@Slf4j` annotations used throughout the codebase
- **Spring Boot** — Enhanced Spring support, run configurations, property completion
- **Checkstyle-IDEA** — Code style enforcement
- **SonarLint** — Local code quality analysis
- **GraphQL** — Schema visualization and query assistance
- **Kubernetes** — For working with manifests

**Optional but Helpful:**
- **Docker** — Docker integration for infrastructure
- **Database Navigator** — MongoDB, Redis connection management
- **Rainbow Brackets** — Easier code navigation

**IntelliJ Setup Steps:**

```text
1. Open IntelliJ IDEA
2. File → Open → select the root pom.xml
3. Choose "Open as Project"
4. Wait for Maven indexing to complete
5. File → Settings → Build Tools → Maven
   → Set Maven home: your Maven installation path
6. File → Project Structure → Project SDK → select Java 21
```

### VS Code (Recommended for Frontend)

VS Code is recommended for the Next.js frontend (`openframe-frontend`).

**Required Extensions:**
- **TypeScript + JavaScript** (built-in or via extension pack)
- **Tailwind CSS IntelliSense** — Class completion for TailwindCSS
- **ESLint** — JavaScript/TypeScript linting
- **Prettier** — Code formatting
- **GraphQL** — Schema and query support
- **REST Client** — API testing from `.http` files

---

## Required Development Tools

### Java Development Kit (JDK 21)

```bash
# Using SDKMAN (recommended)
sdk install java 21.0.3-tem
sdk use java 21.0.3-tem

# Verify
java --version
# Expected: openjdk 21.x.x

javac --version
# Expected: javac 21.x.x
```

### Apache Maven 3.9+

```bash
# Using SDKMAN
sdk install maven 3.9.9

# Verify
mvn --version
# Expected: Apache Maven 3.9.x
```

### Node.js 18+

```bash
# Using nvm (recommended)
nvm install 20
nvm use 20

# Verify
node --version
# Expected: v20.x.x

npm --version
# Expected: 10.x.x
```

### Rust (for openframe-client agent development)

```bash
# Install via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Verify
rustc --version
# Expected: rustc 1.75.0 or higher

cargo --version
```

---

## Environment Variables for Development

Create a `.env` file or configure environment variables for local development. These override Config Server defaults.

### Backend Service Variables

```bash
# MongoDB
SPRING_DATA_MONGODB_URI=mongodb://localhost:27017
SPRING_DATA_MONGODB_DATABASE=openframe_dev

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

# Security (development only — use strong keys in production)
JWT_PUBLIC_KEY=<path-to-dev-public-key>

# Spring Profile
SPRING_PROFILES_ACTIVE=dev
```

### Frontend Variables

Create `openframe/services/openframe-frontend/.env.local`:

```bash
# API Gateway URL
NEXT_PUBLIC_API_URL=http://localhost:8080

# Authorization Server
NEXT_PUBLIC_AUTH_URL=http://localhost:9000

# Feature Flags (optional)
NEXT_PUBLIC_ENV=development
```

---

## Infrastructure Setup for Development

### Option 1: Manual Setup

Install and run each infrastructure component natively:

```bash
# Start MongoDB
mongod --dbpath /usr/local/var/mongodb --logpath /usr/local/var/log/mongodb/mongo.log --fork

# Start Redis
redis-server

# Start NATS with JetStream
nats-server -js

# Start Zookeeper (for Kafka)
zookeeper-server-start.sh config/zookeeper.properties

# Start Kafka
kafka-server-start.sh config/server.properties
```

### Option 2: Using Kubernetes Manifests

The `manifests/` directory contains Kubernetes configurations for infrastructure components. Use these with a local cluster (kind, k3s):

```bash
# Apply MongoDB
kubectl apply -f manifests/datasources/mongodb/

# Apply MeshCentral with MongoDB
kubectl apply -f manifests/integrated-tools/mongodb-meshcentral/
```

---

## Maven Settings

Ensure your `~/.m2/settings.xml` includes the OpenFrame OSS library repository:

```xml
<settings>
  <profiles>
    <profile>
      <id>openframe</id>
      <repositories>
        <repository>
          <id>openframe-oss</id>
          <url><!-- OpenFrame Maven repository URL --></url>
          <releases><enabled>true</enabled></releases>
          <snapshots><enabled>true</enabled></snapshots>
        </repository>
      </repositories>
    </profile>
  </profiles>
  <activeProfiles>
    <activeProfile>openframe</activeProfile>
  </activeProfiles>
</settings>
```

> Contact the OpenFrame team via [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for repository access credentials.

---

## Lombok Configuration

Lombok is used extensively for boilerplate reduction. Configure annotation processing:

**IntelliJ IDEA:**
```text
Settings → Build, Execution, Deployment → Compiler → Annotation Processors
→ Check "Enable annotation processing"
```

---

## Code Style

The project uses standard Java formatting conventions. Configure IntelliJ:

```text
Settings → Editor → Code Style → Java
→ Import scheme from: [project root]/code-style.xml (if present)
```

For the frontend, Prettier handles formatting automatically:

```bash
# Format frontend code
cd openframe/services/openframe-frontend
npx prettier --write .
```

---

## Verification

After completing setup, verify everything works:

```bash
# Compile all modules (no tests)
mvn compile -q

# Compile frontend dependencies
cd openframe/services/openframe-frontend
npm install
npm run build
```

If compilation succeeds with no errors, your development environment is ready.
