# Development Environment Setup

This guide helps you set up a complete development environment for contributing to OpenFrame. We'll configure IDEs, development tools, and extensions to ensure optimal productivity.

## IDE Recommendations and Setup

### IntelliJ IDEA (Recommended for Java Development)

#### Installation
1. **Download** IntelliJ IDEA Ultimate (or Community Edition)
2. **Install** with default settings
3. **Import** the OpenFrame project as a Maven project

#### Essential Plugins
Install these plugins for optimal OpenFrame development:

| Plugin | Purpose | Installation |
|--------|---------|-------------|
| **Spring Boot** | Spring Boot support | Pre-installed in Ultimate |
| **GraphQL** | GraphQL schema support | `Plugins → GraphQL` |
| **Docker** | Docker integration | `Plugins → Docker` |
| **Kubernetes** | K8s manifest support | `Plugins → Kubernetes` |
| **Lombok** | Java boilerplate reduction | `Plugins → Lombok` |

#### Configuration
```xml
<!-- .idea/runConfigurations/OpenFrame_API_Development.xml -->
<component name="ProjectRunConfigurationManager">
  <configuration name="OpenFrame API (Development)" type="SpringBootApplicationConfigurationType">
    <module name="openframe-api" />
    <option name="SPRING_BOOT_MAIN_CLASS" value="com.openframe.api.ApiApplication" />
    <option name="ACTIVE_PROFILES" value="dev,local" />
    <option name="PROGRAM_PARAMETERS" value="" />
    <option name="ALTERNATIVE_JRE_PATH_ENABLED" value="true" />
    <option name="ALTERNATIVE_JRE_PATH" value="21" />
    <envs>
      <env name="SPRING_PROFILES_ACTIVE" value="dev,local" />
      <env name="GITHUB_TOKEN" value="${GITHUB_TOKEN}" />
    </envs>
  </configuration>
</component>
```

### Visual Studio Code (Recommended for Frontend & Rust)

#### Installation
1. **Download** VS Code from https://code.visualstudio.com/
2. **Install** with default settings
3. **Open** the project folder

#### Essential Extensions
```bash
# Install via command line
code --install-extension Vue.volar
code --install-extension ms-vscode.vscode-typescript-next  
code --install-extension rust-lang.rust-analyzer
code --install-extension bradlc.vscode-tailwindcss
code --install-extension esbenp.prettier-vscode
code --install-extension ms-azuretools.vscode-docker
code --install-extension GraphQL.vscode-graphql
```

#### VS Code Settings
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "vue.server.hybridMode": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "rust-analyzer.checkOnSave.command": "clippy",
  "rust-analyzer.cargo.autoreload": true,
  "files.associations": {
    "*.vue": "vue"
  },
  "emmet.includeLanguages": {
    "vue": "html"
  }
}
```

#### VS Code Tasks Configuration
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Frontend Dev Server",
      "type": "shell",
      "command": "npm",
      "args": ["run", "dev"],
      "options": {
        "cwd": "${workspaceFolder}/openframe/services/openframe-frontend"
      },
      "group": "build",
      "presentation": {
        "echo": true,
        "reveal": "always",
        "focus": false,
        "panel": "new"
      }
    },
    {
      "label": "Build Rust Client",
      "type": "shell", 
      "command": "cargo",
      "args": ["build"],
      "options": {
        "cwd": "${workspaceFolder}/clients/openframe-client"
      },
      "group": "build"
    }
  ]
}
```

## Required Development Tools

### Java Development Kit (JDK) 21

#### Installation Options

**Option 1: Using SDKMAN (Recommended)**
```bash
# Install SDKMAN
curl -s "https://get.sdkman.io" | bash
source "$HOME/.sdkman/bin/sdkman-init.sh"

# Install and set Java 21
sdk install java 21.0.1-tem
sdk use java 21.0.1-tem
sdk default java 21.0.1-tem

# Verify installation
java --version
```

**Option 2: Direct Download**
- Download from [Adoptium](https://adoptium.net/)
- Choose OpenJDK 21 (LTS)
- Follow installer instructions for your OS

#### Environment Variables
```bash
# Add to ~/.bashrc or ~/.zshrc
export JAVA_HOME="$HOME/.sdkman/candidates/java/current"
export PATH="$JAVA_HOME/bin:$PATH"

# For Windows (PowerShell Profile)
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-21.0.1.12-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
```

### Maven Build System

#### Installation
```bash
# Using SDKMAN (Recommended)
sdk install maven 3.9.5
sdk use maven 3.9.5

# Using package managers
# Ubuntu/Debian
sudo apt update && sudo apt install maven

# macOS with Homebrew
brew install maven

# Windows with Chocolatey
choco install maven
```

#### Maven Settings
Create `~/.m2/settings.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings>
  <servers>
    <server>
      <id>github</id>
      <username>${env.GITHUB_USERNAME}</username>
      <password>${env.GITHUB_TOKEN}</password>
    </server>
  </servers>
  
  <profiles>
    <profile>
      <id>dev</id>
      <properties>
        <spring.profiles.active>dev,local</spring.profiles.active>
        <maven.compiler.source>21</maven.compiler.source>
        <maven.compiler.target>21</maven.compiler.target>
      </properties>
    </profile>
  </profiles>
  
  <activeProfiles>
    <activeProfile>dev</activeProfile>
  </activeProfiles>
</settings>
```

### Node.js and npm

#### Installation with Node Version Manager
```bash
# Install nvm (Linux/macOS)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install latest Node 18 LTS
nvm install 18
nvm use 18
nvm alias default 18

# Verify installation
node --version  # Should be v18.x.x
npm --version   # Should be 9.x.x or 10.x.x
```

#### Global Development Tools
```bash
# Install useful global packages
npm install -g @vue/cli@latest
npm install -g typescript@latest  
npm install -g vite@latest
npm install -g prettier@latest
npm install -g eslint@latest

# Verify installations
vue --version
tsc --version
vite --version
```

### Rust Development (For Client Development)

#### Installation
```bash
# Install Rust using rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install required components
rustup component add clippy rustfmt

# Install useful tools
cargo install cargo-watch    # File watching
cargo install cargo-edit     # Dependency management
cargo install cargo-audit    # Security auditing

# Verify installation
rustc --version    # Should be 1.70+
cargo --version    # Should be 1.70+
```

#### Rust Configuration
Create `~/.cargo/config.toml`:
```toml
[build]
jobs = 4                    # Parallel compilation

[cargo-new]
vcs = "git"

[registries.crates-io]
protocol = "sparse"         # Faster dependency resolution

[target.'cfg(windows)']
rustflags = ["-C", "link-arg=/SUBSYSTEM:CONSOLE"]
```

## Development Tool Configuration

### Git Configuration

#### Global Git Setup
```bash
# Configure user information
git config --global user.name "Your Name"
git config --global user.email "your.email@company.com"

# Configure useful aliases
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'

# Configure default branch
git config --global init.defaultBranch main

# Configure merge strategy
git config --global merge.ours.driver true
```

#### Git Hooks Setup
```bash
# Navigate to project root
cd openframe-oss-tenant

# Install git hooks (if available)
./scripts/install-git-hooks.sh

# Or manually create pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# Run tests before commit
mvn test -q
if [ $? -ne 0 ]; then
    echo "Tests failed. Commit aborted."
    exit 1
fi
EOF

chmod +x .git/hooks/pre-commit
```

### Docker Configuration

#### Docker Desktop Settings
For optimal development performance:

```json
{
  "builder": {
    "gc": {
      "defaultKeepStorage": "20GB",
      "enabled": true
    }
  },
  "experimental": false,
  "features": {
    "buildkit": true
  },
  "insecureRegistries": [],
  "memoryMiB": 8192,
  "swapMiB": 2048,
  "cpus": 4
}
```

#### Docker Development Aliases
```bash
# Add to ~/.bashrc or ~/.zshrc
alias dps='docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
alias dlogs='docker logs -f'
alias dexec='docker exec -it'
alias dclean='docker system prune -a'

# OpenFrame specific
alias of-restart='docker-compose -f docker-compose.yml restart'
alias of-logs='docker-compose logs -f'
alias of-down='docker-compose down && docker-compose up -d'
```

## Environment Variables Setup

### Development Environment Variables
Create `.env` file in project root:
```bash
# OpenFrame Development Configuration
SPRING_PROFILES_ACTIVE=dev,local
LOG_LEVEL=DEBUG

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/openframe_dev
REDIS_URL=redis://localhost:6379
CASSANDRA_CONTACT_POINTS=127.0.0.1:9042

# External Service URLs
TACTICAL_RMM_URL=http://localhost:8000
MESHCENTRAL_URL=http://localhost:4430
FLEET_MDM_URL=http://localhost:8080

# Security
JWT_SECRET=development-secret-change-in-production
ENCRYPTION_KEY=development-key-32-chars-long

# GitHub Integration
GITHUB_TOKEN=your_github_token_here
GITHUB_USERNAME=your_github_username

# Frontend Development
VITE_API_URL=http://localhost:8081
VITE_GRAPHQL_URL=http://localhost:8082/graphql
VITE_WS_URL=ws://localhost:8081/ws
```

### Shell Profile Configuration
Add to `~/.bashrc`, `~/.zshrc`, or PowerShell profile:

```bash
# OpenFrame Development
export OPENFRAME_HOME="$HOME/development/openframe-oss-tenant"
export PATH="$OPENFRAME_HOME/scripts:$PATH"

# Java Development
export MAVEN_OPTS="-Xmx2g -XX:+UseG1GC"

# Node.js Development  
export NODE_OPTIONS="--max-old-space-size=8192"

# Rust Development
export RUST_BACKTRACE=1

# Development shortcuts
alias of-start="cd $OPENFRAME_HOME && ./scripts/run-mac.sh"
alias of-build="cd $OPENFRAME_HOME && mvn clean install"
alias of-frontend="cd $OPENFRAME_HOME/openframe/services/openframe-frontend && npm run dev"
```

## Database Development Setup

### Local Database Configuration

#### MongoDB Development Instance
```bash
# Using Docker Compose
docker run -d \
  --name mongodb-dev \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=admin123 \
  -v mongodb_data:/data/db \
  mongo:7

# Connect and create development database
docker exec -it mongodb-dev mongosh
use openframe_dev
db.createUser({
  user: "openframe",
  pwd: "openframe123",
  roles: [{ role: "readWrite", db: "openframe_dev" }]
})
```

#### Redis Development Instance
```bash
docker run -d \
  --name redis-dev \
  -p 6379:6379 \
  redis:7-alpine \
  redis-server --requirepass redis123
```

### Database GUI Tools

#### MongoDB Compass
- Download from https://www.mongodb.com/try/download/compass
- Connection string: `mongodb://openframe:openframe123@localhost:27017/openframe_dev`

#### Redis Commander
```bash
npm install -g redis-commander
redis-commander --redis-password redis123
# Access at http://localhost:8081
```

## Troubleshooting Development Environment

### Java Issues

#### Version Conflicts
```bash
# List all Java versions
sdk list java

# Switch Java version
sdk use java 21.0.1-tem

# Check which Java Maven is using
mvn -version
```

#### Memory Issues
```bash
# Increase Maven memory
export MAVEN_OPTS="-Xmx4g -XX:+UseG1GC -XX:MaxMetaspaceSize=512m"

# Check Java memory usage
jps -v
```

### Node.js Issues

#### Package Resolution Problems
```bash
# Clear npm cache
npm cache clean --force

# Delete and reinstall node_modules
rm -rf node_modules package-lock.json
npm install

# Check for version conflicts
npm ls --depth=0
```

#### Memory Issues
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=8192"

# Monitor memory usage
node --trace-gc your-script.js
```

### Docker Issues

#### Container Startup Problems
```bash
# Check container logs
docker logs <container-name>

# Check resource usage
docker stats

# Clean up unused resources
docker system prune -a
```

#### Port Conflicts
```bash
# Find process using port
lsof -i :8080

# Kill process
kill -9 <PID>
```

## IDE Extensions and Plugins Summary

### IntelliJ IDEA Extensions
- Spring Boot Tools
- GraphQL Schema Support
- Docker Integration
- Kubernetes Support
- Lombok Plugin
- SonarLint (Code Quality)

### VS Code Extensions
- Vue Language Features (Volar)
- TypeScript Importer  
- Rust Analyzer
- Tailwind CSS IntelliSense
- Prettier Code Formatter
- Docker Extension
- GraphQL Syntax Highlighting
- GitLens (Git Integration)

### Browser Extensions for Development
- Vue.js DevTools
- Apollo Client DevTools  
- JSON Formatter
- CORS Unblock (development only)
- React Developer Tools (for any React components)

## Performance Optimization

### Development Machine Optimization

#### SSD Configuration
```bash
# Enable TRIM for SSD (Linux)
sudo fstrim -av

# Check SSD health
sudo smartctl -a /dev/sda
```

#### Memory Management
```bash
# Check available memory
free -h

# Clear page cache (if needed)
sudo sync && echo 3 | sudo tee /proc/sys/vm/drop_caches
```

#### Development-Specific Optimizations
```bash
# Increase file watch limits (Linux)
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Optimize Git performance
git config --global core.preloadindex true
git config --global core.fscache true
git config --global gc.auto 256
```

## Next Steps

With your development environment configured:

1. **[Local Development Setup](./local-development.md)** - Clone and run OpenFrame locally
2. **[Architecture Overview](../architecture/overview.md)** - Understand the system design  
3. **[Testing Overview](../testing/overview.md)** - Learn the testing strategy
4. **[Contributing Guidelines](../contributing/guidelines.md)** - Start contributing code

## Getting Help

If you encounter issues during setup:
- **Community Support**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Documentation**: Review specific tool documentation linked above  
- **Common Issues**: Check the troubleshooting sections in each setup guide

---

Your development environment is now ready for OpenFrame development! 🚀