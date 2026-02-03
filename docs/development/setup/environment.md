# Development Environment Setup

This guide helps you configure an optimal development environment for working with OpenFrame. We'll cover IDE setup, essential tools, extensions, and productivity tips.

## IDE Recommendations

### IntelliJ IDEA (Recommended for Java)

IntelliJ IDEA provides excellent support for Spring Boot, GraphQL, and the full OpenFrame stack.

#### Installation
```bash
# macOS with Homebrew
brew install --cask intellij-idea

# Or download from JetBrains website
# https://www.jetbrains.com/idea/
```

#### Essential Plugins

| Plugin | Purpose | Installation |
|--------|---------|--------------|
| **Spring Boot** | Spring Boot development support | Built-in |
| **GraphQL** | GraphQL schema validation and completion | Marketplace |
| **Docker** | Container management | Built-in |
| **Kubernetes** | K8s manifests and deployment | Marketplace |
| **Database Tools** | MongoDB, Redis, Postgres support | Built-in |
| **Lombok** | Reduce Java boilerplate | Marketplace |

#### IntelliJ Configuration

1. **Import Project**
   ```bash
   # Open IntelliJ IDEA
   # File > Open > Select openframe-oss-tenant directory
   # Choose "Import as Maven project"
   ```

2. **Configure JDK**
   - File > Project Structure > Project Settings > Project
   - Set Project SDK to Java 21
   - Set Project Language Level to 21

3. **Enable Annotation Processing**
   - Settings > Build > Compiler > Annotation Processors  
   - Check "Enable annotation processing"
   - Required for Lombok

4. **Configure Code Style**
   ```bash
   # Download OpenFrame code style
   wget https://github.com/flamingo-stack/openframe-oss-tenant/raw/main/.idea/codeStyles/OpenFrame.xml
   
   # Import: Settings > Editor > Code Style > Import Scheme
   ```

#### Run Configurations

Create run configurations for each service:

```xml
<!-- API Service Run Configuration -->
<configuration name="OpenFrame API" type="SpringBootApplicationConfigurationType">
  <option name="SPRING_BOOT_MAIN_CLASS" value="com.openframe.api.ApiApplication" />
  <option name="ACTIVE_PROFILES" value="dev" />
  <option name="PROGRAM_PARAMETERS" value="" />
  <option name="VM_PARAMETERS" value="-Xmx2048m -Dspring.profiles.active=dev" />
</configuration>
```

### VS Code (Recommended for Frontend)

VS Code provides excellent TypeScript and Vue.js support.

#### Essential Extensions

```bash
# Install VS Code extensions
code --install-extension ms-vscode.vscode-java-pack
code --install-extension Vue.volar
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-azuretools.vscode-docker
code --install-extension GraphQL.vscode-graphql
code --install-extension esbenp.prettier-vscode
```

#### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll": true,
    "source.organizeImports": true
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact", 
    "typescript",
    "typescriptreact",
    "vue"
  ],
  "[vue]": {
    "editor.defaultFormatter": "Vue.volar"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

#### Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Frontend",
      "type": "node", 
      "request": "launch",
      "cwd": "${workspaceFolder}/openframe/services/openframe-frontend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"]
    },
    {
      "name": "Debug API Service",
      "type": "java",
      "request": "attach",
      "hostName": "localhost",
      "port": 5005
    }
  ]
}
```

## Development Tools Setup

### Database Tools

#### MongoDB Compass
```bash
# Install MongoDB Compass for database inspection
brew install --cask mongodb-compass

# Connect to local MongoDB
# Connection string: mongodb://localhost:27017/openframe
```

#### Redis Desktop Manager
```bash
# Install Redis GUI client
brew install --cask redis-pro

# Or use command line
redis-cli -h localhost -p 6379
```

### API Development Tools

#### GraphQL Playground
Access at `http://localhost:8080/graphql` when API service is running.

#### Postman/Insomnia
```bash
# Install API testing client
brew install --cask postman
# or
brew install --cask insomnia
```

Import OpenFrame API collection:
```bash
# Download Postman collection
wget https://github.com/flamingo-stack/openframe-oss-tenant/raw/main/postman/OpenFrame-API.postman_collection.json
```

### Container Management

#### Docker Desktop
```bash
# macOS installation
brew install --cask docker

# Start Docker Desktop and verify
docker --version
docker compose --version
```

#### Portainer (Optional)
```bash
# Container management web UI
docker run -d -p 8000:8000 -p 9000:9000 \
  --name=portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce
```

## Environment Variables

### Development Configuration

Create `.env.development`:

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/openframe-dev
REDIS_URL=redis://localhost:6379/0
KAFKA_BOOTSTRAP_SERVERS=localhost:9092

# Service Configuration
SPRING_PROFILES_ACTIVE=dev
LOG_LEVEL=DEBUG

# Security Configuration
JWT_SECRET=dev-secret-key-change-in-production
ENCRYPTION_KEY=dev-encryption-key-32-characters

# External Services
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USERNAME=
SMTP_PASSWORD=

# Feature Flags
FEATURE_AI_ENABLED=true
FEATURE_ANALYTICS_ENABLED=true
FEATURE_EXTERNAL_INTEGRATIONS=true
```

### IDE Environment Setup

#### IntelliJ IDEA
1. Run/Debug Configurations > Environment Variables
2. Add variables from `.env.development`
3. Or use EnvFile plugin for automatic loading

#### VS Code
Install `dotenv` extension:
```bash
code --install-extension mikestead.dotenv
```

## Build Tools Configuration

### Maven Settings

Configure Maven with optimal settings in `~/.m2/settings.xml`:

```xml
<settings>
  <profiles>
    <profile>
      <id>dev</id>
      <properties>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
        <skipTests>false</skipTests>
      </properties>
    </profile>
  </profiles>
  
  <activeProfiles>
    <activeProfile>dev</activeProfile>
  </activeProfiles>
  
  <servers>
    <!-- Add any private repositories here -->
  </servers>
</settings>
```

### Node.js Configuration

Configure npm for frontend development:

```bash
# Set npm registry (if using private registry)
npm config set registry https://registry.npmjs.org/

# Configure development settings  
cd openframe/services/openframe-frontend
npm config set @openframe:registry https://npm.pkg.github.com/

# Install development dependencies
npm install
```

## Code Quality Tools

### Java - Checkstyle & PMD

Add to your Maven `pom.xml`:

```xml
<plugin>
  <groupId>com.github.spotbugs</groupId>
  <artifactId>spotbugs-maven-plugin</artifactId>
  <version>4.7.3.0</version>
</plugin>

<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-checkstyle-plugin</artifactId>
  <version>3.2.0</version>
  <configuration>
    <configLocation>checkstyle.xml</configLocation>
  </configuration>
</plugin>
```

### TypeScript - ESLint & Prettier

Frontend projects include pre-configured ESLint and Prettier:

```bash
# Run linting
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format code
npm run format
```

### Git Hooks

Set up pre-commit hooks:

```bash
# Install husky for git hooks
npm install --save-dev husky

# Set up pre-commit hook
npx husky add .husky/pre-commit "npm run lint-staged"
```

## Debugging Setup

### Java Services Debug

#### IntelliJ IDEA Remote Debug
1. Edit Run Configuration
2. Add Remote JVM Debug configuration
3. Set port 5005
4. Start service with debug parameters:

```bash
# Start with debug port
mvn spring-boot:run -Dspring-boot.run.jvmArguments="-Xdebug -Xrunjdwp:transport=dt_socket,server=y,suspend=n,address=5005"
```

#### Command Line Debug
```bash
# Java remote debugging
export JAVA_OPTS="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
java $JAVA_OPTS -jar target/openframe-api-1.0.0.jar
```

### Frontend Debug

#### Chrome DevTools
1. Start frontend with source maps: `npm run dev`
2. Open Chrome DevTools
3. Sources tab shows TypeScript files
4. Set breakpoints directly in TypeScript

#### VS Code Debug  
```bash
# Start debug server
npm run dev

# In VS Code: Run and Debug > Debug Frontend
# Sets breakpoints in .vue and .ts files
```

## Performance Monitoring

### Application Performance

#### JVM Monitoring
```bash
# Add to JVM arguments for monitoring
-XX:+UseG1GC 
-XX:MaxGCPauseMillis=200
-XX:+PrintGC 
-XX:+PrintGCDetails

# Enable JMX for monitoring
-Dcom.sun.management.jmxremote
-Dcom.sun.management.jmxremote.port=9999
-Dcom.sun.management.jmxremote.authenticate=false
-Dcom.sun.management.jmxremote.ssl=false
```

#### Frontend Performance
```typescript
// Performance monitoring in Vue components
import { performance } from 'perf_hooks';

export default {
  async mounted() {
    const start = performance.now();
    await this.loadData();
    const end = performance.now();
    console.log(`Load time: ${end - start}ms`);
  }
}
```

### Database Monitoring

#### MongoDB Profiling
```bash
# Enable profiling in development
mongosh --eval "db.setProfilingLevel(2)"

# View slow queries
mongosh --eval "db.system.profile.find().limit(5).sort({ts:-1}).pretty()"
```

#### Redis Monitoring
```bash
# Monitor Redis operations
redis-cli monitor

# Check Redis stats
redis-cli info stats
```

## Development Scripts

Create useful development scripts in `scripts/dev/`:

### Service Management
```bash
#!/bin/bash
# scripts/dev/start-services.sh

echo "🚀 Starting OpenFrame development services..."

# Start infrastructure
docker compose -f integrated-tools/docker-compose.infrastructure.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Start backend services
echo "🔧 Starting backend services..."
mvn clean compile -DskipTests

# Start API service
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring-boot.run.profiles=dev &

# Start gateway
cd ../openframe-gateway  
mvn spring-boot:run -Dspring-boot.run.profiles=dev &

# Start frontend
cd ../openframe-frontend
npm run dev &

echo "✅ All services starting... Check logs for status"
```

### Environment Reset
```bash
#!/bin/bash
# scripts/dev/reset-environment.sh

echo "🔄 Resetting development environment..."

# Stop all Java processes
pkill -f "openframe"

# Reset databases
docker compose -f integrated-tools/docker-compose.infrastructure.yml down -v
docker compose -f integrated-tools/docker-compose.infrastructure.yml up -d

# Clean Maven cache
mvn clean
rm -rf ~/.m2/repository/com/openframe

echo "✅ Environment reset complete"
```

## Common Development Issues

### Port Conflicts
```bash
# Find process using port
lsof -i :8080

# Kill process
kill -9 $(lsof -t -i:8080)
```

### Java Version Issues  
```bash
# Check active Java version
java --version

# Switch Java version (macOS)
export JAVA_HOME=$(/usr/libexec/java_home -v 21)

# Or use jenv for version management
jenv versions
jenv global 21.0
```

### Node.js Version Issues
```bash
# Use nvm for Node version management
nvm install 18
nvm use 18

# Verify versions
node --version
npm --version
```

### Database Connection Issues
```bash
# Check MongoDB connection
mongosh mongodb://localhost:27017/openframe --eval "db.adminCommand('hello')"

# Check Redis connection  
redis-cli ping
```

## Next Steps

With your development environment configured:

1. **[Local Development Guide](local-development.md)** - Run OpenFrame locally
2. **[Architecture Overview](../architecture/overview.md)** - Understand the system design
3. **[Contributing Guidelines](../contributing/guidelines.md)** - Learn the development workflow

## Productivity Tips

### Keyboard Shortcuts

#### IntelliJ IDEA
- `Ctrl+Shift+N`: Navigate to file
- `Ctrl+Alt+L`: Reformat code  
- `Ctrl+Shift+T`: Create/navigate to test
- `Alt+Enter`: Show intention actions

#### VS Code
- `Cmd+P`: Quick open file
- `Cmd+Shift+P`: Command palette
- `F12`: Go to definition
- `Alt+Shift+F`: Format document

### Code Snippets

Create custom snippets for common OpenFrame patterns:

#### GraphQL DataFetcher (IntelliJ Live Template)
```java
@DgsQuery
public $RETURN_TYPE$ $METHOD_NAME$(@InputArgument $INPUT_TYPE$ input) {
    return $SERVICE$.$METHOD_NAME$(input);
}
```

#### Vue Component Template (VS Code Snippet)
```vue
<template>
  <div class="$1">
    $2
  </div>
</template>

<script setup lang="ts">
$3
</script>

<style scoped>
$4
</style>
```

---

Your development environment is now ready! Continue with [Local Development](local-development.md) to start building with OpenFrame.