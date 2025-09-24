# Development Setup Guide

This guide will help you set up your development environment for OpenFrame's Java Spring Boot backend and Vue.js frontend.

## Prerequisites

### Backend Requirements
- OpenJDK 21.0.1+
- Maven 3.9.6+
- Docker 24.0+ and Docker Compose 2.23+
- Git 2.42+

### Frontend Requirements
- Node.js 18.0.0+
- npm 9.0.0+

### Rust Client Requirements
- Rust 1.70+ with Cargo
- Platform-specific dependencies (automatically handled)

## Backend Setup

### 1. Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe
```

### 2. Set Up Java Environment

```bash
# Install OpenJDK 21 (macOS)
brew install openjdk@21

# Set JAVA_HOME
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 21)' >> ~/.zshrc
source ~/.zshrc

# Verify Java installation
java -version
```

### 3. Build Backend Services

```bash
# Build all services
mvn clean install

# Build individual service
cd services/openframe-api
mvn clean install
```

### 4. Configure Backend Services

```yaml
# services/openframe-api/src/main/resources/application.yml
spring:
  application:
    name: openframe-api
  data:
    mongodb:
      uri: mongodb://localhost:27017/openframe
    cassandra:
      keyspace-name: openframe
      contact-points: localhost
  kafka:
    bootstrap-servers: localhost:9092
```

## Frontend Setup

### 1. Install Node.js Dependencies

```bash
# Navigate to UI service
cd services/openframe-frontend

# Install dependencies
npm install

# Install Vue CLI globally
npm install -g @vue/cli
```

### 2. Configure Frontend Environment

```env
# services/openframe-frontend/.env
VUE_APP_API_URL=http://localhost:8080
VUE_APP_WS_URL=ws://localhost:8080/ws
```

### 3. Start Development Server

```bash
# Use platform-specific startup script (recommended)
./scripts/run-mac.sh              # macOS
./scripts/run-linux.sh            # Linux
./scripts/run-windows.ps1         # Windows

# Or start services individually:
# Start backend services
cd openframe/services/openframe-api
mvn spring-boot:run

# Start frontend development server (separate terminal)
cd openframe/services/openframe-frontend
npm run dev

# Build Rust client agent
cd client
cargo build --release
```

## Development Tools

### 1. IDE Setup

#### IntelliJ IDEA (Recommended for Backend)
- Install IntelliJ IDEA Ultimate Edition
- Install plugins:
  - Spring Boot
  - Lombok
  - Maven
  - Git
  - Docker

#### VS Code (Recommended for Frontend and Rust)
- Install VS Code
- Install extensions:
  - Volar (Vue 3)
  - ESLint
  - Prettier
  - GitLens
  - Docker
  - rust-analyzer (for Rust client development)

### 2. Code Style

#### Backend
```xml
<!-- .idea/codeStyles/Project.xml -->
<component name="ProjectCodeStyleConfiguration">
    <code_scheme name="Project" version="173">
        <JavaCodeStyleSettings>
            <option name="CLASS_COUNT_TO_USE_IMPORT_ON_DEMAND" value="999" />
            <option name="NAMES_COUNT_TO_USE_IMPORT_ON_DEMAND" value="999" />
        </JavaCodeStyleSettings>
    </code_scheme>
</component>
```

#### Frontend
```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

## Local Development

### 1. Running Services Locally

```bash
# Start required infrastructure
docker-compose up -d

# Start backend services
cd services/openframe-api
mvn spring-boot:run

# Start frontend development server
cd openframe/services/openframe-frontend
npm run dev
```

### 2. Accessing Services

- **Frontend UI**: http://localhost:8080
- **GraphQL API**: http://localhost:8080/graphql
- **Configuration Server**: http://localhost:8888
- **GraphQL Playground**: http://localhost:8080/graphiql (if enabled)
- **Grafana Dashboard**: Available via integrated tools setup

### 3. Development Workflow

1. Create a new branch
```bash
git checkout -b feature/your-feature-name
```

2. Make changes and commit
```bash
git add .
git commit -m "feat: add new feature"
```

3. Push changes
```bash
git push origin feature/your-feature-name
```

4. Create pull request on GitHub

## Troubleshooting

### Common Issues

1. Port Conflicts
```bash
# Check for running processes
lsof -i :8080
lsof -i :3000

# Kill process if needed
kill -9 <PID>
```

2. Database Connection Issues
```bash
# Check MongoDB status
docker ps | grep mongo

# Check Cassandra status
docker ps | grep cassandra
```

3. Build Issues
```bash
# Clean and rebuild
mvn clean install -U

# Clear npm cache
npm cache clean --force
```

## Next Steps

- [Architecture Overview](architecture.md)
- [API Documentation](../api/overview.md)
- [Contributing Guidelines](contributing.md)
- [Testing Guide](testing.md)
- [Code Style Guide](code-style.md) 