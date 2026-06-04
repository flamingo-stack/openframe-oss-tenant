# Development Environment Setup

This guide covers IDE configuration, recommended editor extensions, and development tools for working with OpenFrame OSS Tenant.

---

## Recommended IDEs

### IntelliJ IDEA (Strongly Recommended for Backend)

[IntelliJ IDEA](https://www.jetbrains.com/idea/) is the recommended IDE for Java/Spring Boot development. The Community Edition is free and sufficient for most tasks; Ultimate provides enhanced Spring support.

**Setup steps:**

1. Open IntelliJ IDEA
2. Choose **Open** and select the project root directory (where `pom.xml` is located)
3. IntelliJ will auto-detect the Maven project and import all modules
4. Set the Project SDK to **Java 21**:
   - Navigate to **File → Project Structure → Project**
   - Set SDK to JDK 21

**Recommended IntelliJ Plugins:**

| Plugin | Purpose |
|--------|---------|
| **Lombok** | Enable annotation processing for Lombok (`@Data`, `@Builder`, etc.) |
| **Spring Boot** | Spring context navigation and live beans view |
| **GraphQL** | Schema syntax highlighting and introspection |
| **Kubernetes** | YAML support for manifests |
| **Docker** | Docker integration |
| **SonarLint** | Static analysis and code quality |
| **CheckStyle-IDEA** | Code style enforcement |

> **Important:** Enable annotation processing for Lombok:  
> **Settings → Build, Execution, Deployment → Compiler → Annotation Processors → Enable annotation processing**

### VS Code (Recommended for Frontend and AI Tooling)

[Visual Studio Code](https://code.visualstudio.com/) is the recommended editor for the Next.js frontend (`openframe/services/openframe-frontend`) and the AI agent tooling (`package.json`).

**Recommended Extensions:**

| Extension | Purpose |
|-----------|---------|
| **ESLint** | JavaScript/TypeScript linting |
| **Prettier** | Code formatting |
| **Tailwind CSS IntelliSense** | Autocomplete for Tailwind classes |
| **GraphQL: Language Feature Support** | GraphQL syntax in `.graphql` files |
| **TypeScript Nightly** | Enhanced TypeScript support |
| **Next.js Snippets** | Code snippets for Next.js patterns |
| **Docker** | Dockerfile support |
| **GitLens** | Enhanced Git history and blame |

---

## Java Development Setup

### Install Java 21

**Using SDKMAN (recommended):**

```bash
# Install SDKMAN
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"

# Install Java 21
sdk install java 21.0.5-tem

# Verify
java -version
```

**Using Homebrew (macOS):**

```bash
brew install openjdk@21
echo 'export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Configure Maven

Ensure Maven uses Java 21:

```bash
# Verify Maven picks up the right JDK
mvn -version
# Should show: Java version: 21.x.x
```

### Maven Wrapper

The project may include a Maven wrapper. Use `./mvnw` instead of `mvn` for consistent Maven version behavior:

```bash
./mvnw --version
```

---

## Node.js Development Setup

### Install Node.js

**Using nvm (recommended):**

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc  # or ~/.zshrc

# Install and use Node 18+
nvm install 18
nvm use 18

# Verify
node --version
npm --version
```

### Install Project Dependencies

From the root of the repository:

```bash
npm install
```

---

## Rust Development Setup (for OpenFrame Client Agent)

The device agent (`clients/openframe-client`) is written in Rust.

```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# Verify
rustc --version
cargo --version
```

**Recommended VS Code extensions for Rust:**

| Extension | Purpose |
|-----------|---------|
| **rust-analyzer** | Language server, autocompletion, diagnostics |
| **CodeLLDB** | Debugging |
| **Even Better TOML** | Cargo.toml support |

---

## Docker Setup

Docker is required to run infrastructure dependencies in development.

```bash
# Install Docker Desktop (macOS / Windows)
# https://docs.docker.com/desktop/

# Or Docker Engine (Linux)
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add current user to docker group (Linux)
sudo usermod -aG docker $USER
# Log out and back in to apply

# Verify
docker --version
docker compose version
```

---

## Environment Variable Configuration

### Backend Services

Create application-specific property files for local overrides. Spring Boot supports:

```text
openframe/services/openframe-api/src/main/resources/application-local.yml
```

Example `application-local.yml`:

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/openframe-dev
  redis:
    host: localhost
    port: 6379
  kafka:
    bootstrap-servers: localhost:9092
```

Activate the `local` profile when running:

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

### Frontend

Create `.env.local` in `openframe/services/openframe-frontend/`:

```bash
NEXT_PUBLIC_APP_URL=https://localhost
NEXT_PUBLIC_GRAPHQL_URL=https://localhost/graphql
# Add other environment variables as needed
```

---

## Code Quality Tools

### Checkstyle (Java)

The project uses Checkstyle for Java code style enforcement. Run before committing:

```bash
mvn checkstyle:check
```

### ESLint + Prettier (TypeScript/JavaScript)

For the frontend:

```bash
cd openframe/services/openframe-frontend
npm run lint
npm run format
```

---

## Debugging

### Spring Boot Remote Debug

Add JVM debug flags when starting a service:

```bash
mvn spring-boot:run \
  -Dspring-boot.run.jvmArguments="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
```

Then attach IntelliJ's remote debugger to port `5005`.

### Next.js Debug Mode

```bash
NODE_OPTIONS='--inspect' npm run dev
```

Then open `chrome://inspect` in Chrome and attach to the Node process.
