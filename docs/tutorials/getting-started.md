# Getting Started

Welcome to OpenFrame! This guide will help you set up and run the OpenFrame platform locally for development and testing.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software

- **Java 17 or higher** - For running the core services
- **Node.js 18+ and npm** - For the frontend application
- **Rust** (latest stable) - For the client tools
- **Maven 3.8+** - For building Java services
- **Docker and Docker Compose** - For running integrated services
- **Git** - For cloning the repository

### System Requirements

- **Memory**: 8GB RAM minimum (16GB recommended)
- **Disk Space**: 10GB free space
- **Network**: Internet connection for downloading dependencies

### Verify Installation

```bash
# Check Java version
java -version

# Check Node.js and npm
node --version
npm --version

# Check Rust
rustc --version
cargo --version

# Check Maven
mvn --version

# Check Docker
docker --version
docker-compose --version
```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### 2. Build Core Services

Build all Java services and libraries:

```bash
mvn clean install
```

To skip tests during development:

```bash
mvn clean install -DskipTests
```

### 3. Install Frontend Dependencies

```bash
cd openframe/services/openframe-frontend
npm install
cd ../../..
```

### 4. Build Rust Client

```bash
cd client
cargo build
cd ..
```

## Basic Configuration

### Environment Setup

OpenFrame uses sensible defaults for local development, but you may want to customize certain settings:

1. **Create a local configuration file** (optional):
```bash
cp config/application.properties.example config/application.properties
```

2. **Set environment variables** (optional):
```bash
export OPENFRAME_ENV=development
export OPENFRAME_LOG_LEVEL=DEBUG
```

### Database Configuration

For local development, OpenFrame will automatically configure embedded databases. No additional setup is required for your first run.

## Running the Project Locally

### Option 1: Quick Start Scripts (Recommended)

OpenFrame provides platform-specific startup scripts that handle service orchestration:

**macOS:**
```bash
./scripts/run-mac.sh
```

**Linux:**
```bash
./scripts/run-linux.sh
```

**Windows (PowerShell):**
```bash
./scripts/run-windows.ps1
```

**Silent mode** (no interactive prompts):
```bash
./scripts/run-mac.sh --silent
```

### Option 2: Manual Service Startup

If you prefer to start services individually:

1. **Start the API Gateway:**
```bash
cd openframe/services/openframe-gateway
mvn spring-boot:run
```

2. **Start the GraphQL API** (in a new terminal):
```bash
cd openframe/services/openframe-api
mvn spring-boot:run
```

3. **Start the Frontend** (in a new terminal):
```bash
cd openframe/services/openframe-frontend
npm run dev
```

## First Steps

### 1. Access the Dashboard

Once all services are running, open your browser and navigate to:

```
http://localhost:3000
```

You should see the OpenFrame dashboard login screen.

### 2. Default Credentials

For local development, use these default credentials:

- **Username**: `admin`
- **Password**: `admin123`

### 3. Your First "Hello World"

Let's create a simple automation workflow:

1. **Log in** to the dashboard
2. **Navigate** to "Workflows" in the left sidebar
3. **Click** "Create New Workflow"
4. **Add** a simple task:
   ```json
   {
     "name": "Hello World",
     "type": "log",
     "message": "Hello from OpenFrame!"
   }
   ```
5. **Save and Run** the workflow

You should see the message appear in the logs.

### 4. API Access

Test the GraphQL API directly:

```bash
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ health { status version } }"
  }'
```

Expected response:
```json
{
  "data": {
    "health": {
      "status": "OK",
      "version": "1.0.0"
    }
  }
}
```

### 5. Using the Rust Client

Test the Rust client tools:

```bash
cd client
cargo run -- --help
```

This will show available client commands for interacting with your OpenFrame instance.

## Common Issues and Solutions

### Issue: Port Already in Use

**Error**: `Port 8080 is already in use`

**Solution**:
```bash
# Find and kill the process using the port
lsof -ti:8080 | xargs kill -9

# Or use a different port
export SERVER_PORT=8081
```

### Issue: Build Failures

**Error**: Maven build fails with dependency issues

**Solution**:
```bash
# Clear Maven cache and rebuild
mvn dependency:purge-local-repository
mvn clean install -U
```

### Issue: Frontend Won't Start

**Error**: `npm run dev` fails

**Solution**:
```bash
# Clear npm cache and reinstall
cd openframe/services/openframe-frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Issue: Docker Services Won't Start

**Error**: Docker compose fails in integrated tools

**Solution**:
```bash
# Check Docker daemon is running
docker ps

# Restart Docker service
sudo systemctl restart docker

# Check available disk space
df -h
```

### Issue: Memory Issues

**Error**: Services crash with OutOfMemoryError

**Solution**:
```bash
# Increase JVM heap size
export MAVEN_OPTS="-Xmx4g -Xms2g"

# Or modify individual service startup scripts
export JAVA_OPTS="-Xmx2g"
```

### Issue: Database Connection Problems

**Error**: Cannot connect to embedded database

**Solution**:
```bash
# Clear database files and restart
rm -rf data/
./scripts/run-mac.sh --clean
```

## Next Steps

Now that you have OpenFrame running locally:

1. **Explore the Documentation**: Visit [flamingo.run/knowledge-base](https://www.flamingo.run/knowledge-base) for detailed guides
2. **Join the Community**: Connect with other developers at [openmsp.ai](https://www.openmsp.ai/)
3. **Try Advanced Features**: Experiment with AI-powered insights and automation workflows
4. **Contribute**: Check out our contribution guidelines in the repository

## Getting Help

If you encounter issues not covered here:

- **Check the logs**: Look for error messages in the console output
- **Review documentation**: Visit our comprehensive docs
- **Ask the community**: Post questions in our community forums
- **Report bugs**: Create an issue in the GitHub repository

Happy coding with OpenFrame! 🚀