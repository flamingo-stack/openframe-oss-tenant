# OpenFrame CLI - dev skaffold

Deploy development versions of services with live reloading using Skaffold.

## Overview

The `skaffold` command sets up a complete development environment by bootstrapping a cluster, installing required charts, and running Skaffold for live code reloading and development. This enables rapid development cycles with automatic rebuilding and redeployment on code changes.

## Syntax

```bash
openframe dev skaffold [cluster-name] [flags]
```

## Arguments

| Argument | Description |
|----------|-------------|
| `cluster-name` | Target cluster name (interactive selection if not provided) |

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--skip-bootstrap` | `false` | Skip cluster bootstrapping |
| `--helm-values` | - | Custom Helm values file for bootstrap |
| `--namespace` | Auto-detected | Kubernetes namespace to deploy to |
| `--port` | `8080` | Local development port |
| `--image` | - | Docker image to use for the service |
| `--sync-local` | - | Local directory to sync to the container |
| `--sync-remote` | - | Remote directory to sync files to |

## Examples

### Basic Development Setup

```bash
# Interactive setup - choose service and cluster
openframe dev skaffold

# Use specific cluster
openframe dev skaffold my-dev-cluster

# Skip cluster bootstrap (use existing setup)
openframe dev skaffold dev-cluster --skip-bootstrap
```

### Advanced Configuration

```bash
# Custom namespace and Helm values
openframe dev skaffold production \
  --namespace development \
  --helm-values ./custom-values.yaml

# Custom port and image
openframe dev skaffold dev \
  --port 3000 \
  --image my-service:dev
```

### File Sync Configuration

```bash
# Sync local source to container
openframe dev skaffold dev \
  --sync-local ./src \
  --sync-remote /app/src
```

## Prerequisites

### System Requirements

- **Docker**: Running and accessible
- **Kubernetes Cluster**: Created with `openframe cluster create`
- **Skaffold CLI**: Automatically installed if missing

### Automatic Installation

The CLI automatically checks and installs missing prerequisites:

```bash
# If Skaffold is missing, you'll see:
Missing Prerequisites: skaffold

Do you want to install Skaffold automatically? [Y/n]
[1/1] Installing skaffold... ✓
Successfully installed skaffold
```

### Project Structure

Your project needs a `skaffold.yaml` configuration file:

```yaml
# skaffold.yaml
apiVersion: skaffold/v4beta7
kind: Config
metadata:
  name: my-service
build:
  artifacts:
  - image: my-service
    docker:
      dockerfile: Dockerfile
deploy:
  helm:
    releases:
    - name: my-service
      chartPath: ./helm-chart
      valuesFiles:
      - values-dev.yaml
```

## Workflow Process

The `skaffold` command follows this workflow:

1. **Prerequisites Check** - Validates Skaffold installation
2. **Service Selection** - Interactive selection of Skaffold configuration
3. **Cluster Selection** - Choose target cluster (if not specified)
4. **Bootstrap** - Install ArgoCD and charts (unless `--skip-bootstrap`)
5. **Development** - Start Skaffold development session

### Step-by-Step Example

```bash
$ openframe dev skaffold

✓ Found 3 skaffold configuration file(s)
✓ openframe-api
ℹ Using skaffold configuration: ../services/openframe-api/skaffold.yaml

? Select cluster for development:
  > dev-cluster (Running)
    test-cluster (Running)  
    prod-cluster (Running)

✓ Using cluster: dev-cluster

ℹ Installing ArgoCD and applications...
⠋ Installing ArgoCD... (15s)
✓ ArgoCD installed
✓ ArgoCD Applications installed

ℹ Running Skaffold commands (service: openframe-api, namespace: microservices)...

Starting build...
Building [my-service]...
Tags used in deployment:
 - my-service -> my-service:latest
   
Starting deploy...
Helm release my-service not installed. Installing...
NAME: my-service
LAST DEPLOYED: Sun Sep 01 21:48:00 2024
NAMESPACE: microservices
STATUS: deployed

Watching for changes...
```

## Configuration Discovery

### Automatic Discovery

The CLI automatically discovers Skaffold configurations in your project:

```bash
# Searches for skaffold.yaml files in:
# - Current directory
# - Subdirectories (up to 3 levels deep)
# - Common service directories

Found skaffold configuration file(s):
✓ openframe-api (./services/openframe-api/skaffold.yaml)
✓ openframe-gateway (./services/openframe-gateway/skaffold.yaml)
✓ openframe-frontend (./services/openframe-frontend/skaffold.yaml)
```

### Service Selection

Interactive service selection when multiple configurations are found:

```bash
? Select service to develop:
  > openframe-api - GraphQL API service
    openframe-gateway - API Gateway service
    openframe-frontend - Next.js frontend
```

## Retry Logic

The Skaffold execution includes automatic retry logic:

- **Maximum Retries**: 3 attempts
- **Retry Delay**: 3 seconds between attempts
- **Failure Handling**: Continues with warnings on non-critical failures

```bash
# Example retry output:
⚠ Skaffold attempt 1 failed: build failed
⚠ Skaffold attempt 2/3 (retrying after error)...
⠋ Building [my-service]... (retry)
✓ SUCCESS  Skaffold development session completed
```

## Development Features

### Live Reload

Skaffold automatically detects changes and rebuilds:

```bash
# Make code changes
echo "console.log('updated');" >> src/index.js

# Skaffold detects and rebuilds
Syncing 1 files for my-service:latest
Watching for changes...
```

### Hot Sync

For faster development, configure file sync in `skaffold.yaml`:

```yaml
build:
  artifacts:
  - image: my-service
    sync:
      manual:
      - src: "src/**/*.js"
        dest: /app/src
        strip: src/
      - src: "static/**/*"
        dest: /app/static
        strip: static/
```

### Port Forwarding

Automatically set up port forwarding:

```yaml
portForward:
- resourceType: service
  resourceName: my-service
  port: 8080
  localPort: 8080
```

## Cluster Bootstrap

### Automatic Bootstrap

By default, the command bootstraps the cluster with ArgoCD:

```bash
# Installs:
# - ArgoCD with UI and CLI access
# - Application definitions
# - Required CRDs and operators
# - Monitoring stack (optional)

⠋ Installing ArgoCD... (30s)
✓ ArgoCD installed
✓ Applications synchronized
```

### Skip Bootstrap

Use existing cluster setup:

```bash
# Skip bootstrap for existing environments
openframe dev skaffold production --skip-bootstrap

ℹ Skipping chart install for cluster 'production' (--skip-bootstrap flag provided)
ℹ Running Skaffold commands (service: my-service, namespace: production)...
```

### Custom Bootstrap

Use custom Helm values for bootstrap:

```yaml
# custom-values.yaml
argocd:
  server:
    ingress:
      enabled: true
      hosts:
      - argocd.dev.local
      
monitoring:
  prometheus:
    enabled: true
  grafana:
    enabled: true
```

```bash
openframe dev skaffold dev --helm-values custom-values.yaml
```

## Advanced Usage

### Multiple Services

Develop multiple services simultaneously:

```bash
# Terminal 1: API service
openframe dev skaffold dev --namespace api

# Terminal 2: Frontend service  
openframe dev skaffold dev --namespace frontend

# Terminal 3: Worker service
openframe dev skaffold dev --namespace workers
```

### Custom Build Context

Configure custom build context and dockerfile:

```yaml
# skaffold.yaml
build:
  artifacts:
  - image: my-service
    context: ./backend
    docker:
      dockerfile: Dockerfile.dev
      buildArgs:
        BUILD_ENV: development
```

### Multi-Stage Builds

Optimize for development with multi-stage builds:

```dockerfile
# Dockerfile
FROM node:16 AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM base AS development
COPY . .
CMD ["npm", "run", "dev"]

FROM base AS production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

```yaml
# skaffold.yaml
build:
  artifacts:
  - image: my-service
    docker:
      dockerfile: Dockerfile
      target: development
```

## Monitoring and Debugging

### Verbose Output

Enable detailed logging for troubleshooting:

```bash
openframe dev skaffold dev --verbose

# Shows detailed Skaffold output:
# - Build steps and timing
# - Deployment progress
# - File sync operations
# - Error details
```

### Log Streaming

Skaffold automatically streams logs from deployed pods:

```bash
# Logs are automatically displayed:
[my-service] 2024/09/01 18:48:00 Starting server on :8080
[my-service] 2024/09/01 18:48:01 Connected to database
[my-service] 2024/09/01 18:48:01 Server ready
```

### Health Checks

Monitor deployment health:

```yaml
# skaffold.yaml
deploy:
  statusCheckDeadlineSeconds: 300
  helm:
    releases:
    - name: my-service
      chartPath: ./chart
      wait: true
```

## Integration Examples

### With Docker Compose

Use Skaffold alongside Docker Compose for hybrid development:

```bash
# Start local dependencies
docker-compose up postgres redis

# Start Kubernetes services
openframe dev skaffold dev
```

### With IDE Integration

#### VS Code

Configure VS Code for Skaffold development:

```json
{
  "kubernetes.kubectl-path": "/usr/local/bin/kubectl",
  "kubernetes.namespace": "development",
  "skaffold.path": "/usr/local/bin/skaffold"
}
```

#### IntelliJ

Set up remote debugging with Skaffold:

```yaml
# skaffold.yaml
build:
  artifacts:
  - image: my-service
    docker:
      dockerfile: Dockerfile.debug
      buildArgs:
        JAVA_TOOL_OPTIONS: >-
          -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005
```

### With Testing

Integrate testing into the development workflow:

```yaml
# skaffold.yaml  
test:
- image: my-service
  command: ["npm", "test"]
- image: my-service
  command: ["npm", "run", "e2e"]
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check Docker daemon
   docker info
   
   # Clear build cache
   skaffold build --cache-artifacts=false
   
   # Verbose build output
   openframe dev skaffold dev --verbose
   ```

2. **Deployment Issues**
   ```bash
   # Check cluster resources
   kubectl get pods -n development
   kubectl describe pod my-service-xxx
   
   # Check Helm release
   helm list -n development
   helm status my-service -n development
   ```

3. **File Sync Problems**
   ```bash
   # Verify sync configuration
   skaffold diagnose
   
   # Manual sync
   skaffold filesync
   ```

4. **Port Forwarding Issues**
   ```bash
   # Check port availability
   lsof -i :8080
   
   # Manual port forward
   kubectl port-forward service/my-service 8080:8080
   ```

### Debug Mode

Enable debug mode for detailed troubleshooting:

```bash
# Set debug environment variables
export SKAFFOLD_DEBUG=true
export SKAFFOLD_VERBOSITY=debug

# Run with maximum verbosity
openframe dev skaffold dev --verbose
```

### Performance Issues

1. **Slow Builds**
   ```yaml
   # Optimize Dockerfile
   FROM node:16-alpine  # Use smaller base images
   
   # Multi-stage builds
   COPY package*.json ./
   RUN npm ci --only=production
   ```

2. **Slow File Sync**
   ```yaml
   # Configure .skaffoldignore
   node_modules/
   .git/
   *.log
   .DS_Store
   ```

## Configuration Reference

### Complete skaffold.yaml Example

```yaml
apiVersion: skaffold/v4beta7
kind: Config
metadata:
  name: my-service

build:
  artifacts:
  - image: my-service
    context: .
    docker:
      dockerfile: Dockerfile.dev
      buildArgs:
        NODE_ENV: development
    sync:
      manual:
      - src: "src/**/*.js"
        dest: /app/src
        strip: src/

test:
- image: my-service
  command: ["npm", "test"]

deploy:
  statusCheckDeadlineSeconds: 300
  helm:
    releases:
    - name: my-service
      chartPath: ./helm-chart
      namespace: development
      valuesFiles:
      - values-dev.yaml
      setValues:
        image.tag: my-service
      wait: true

portForward:
- resourceType: service
  resourceName: my-service
  port: 8080
  localPort: 8080

profiles:
- name: debug
  build:
    artifacts:
    - image: my-service
      docker:
        dockerfile: Dockerfile.debug
        buildArgs:
          DEBUG_PORT: "5005"
```

## Best Practices

1. **Use Development Profiles**: Separate configs for dev/test/prod
2. **Optimize Dockerfiles**: Use multi-stage builds and .dockerignore
3. **Configure File Sync**: Enable for faster development cycles
4. **Set Resource Limits**: Prevent resource exhaustion
5. **Use Health Checks**: Ensure proper deployment validation
6. **Keep Configs Simple**: Start simple, add complexity as needed
7. **Version Control**: Keep skaffold.yaml in version control
8. **Clean Up**: Stop development sessions when done

## Performance Tips

1. **Use Local Registry**: Speed up builds with local Docker registry
2. **Enable Caching**: Use BuildKit and layer caching
3. **Minimize Context**: Use .skaffoldignore to reduce build context
4. **Parallel Builds**: Enable concurrent artifact building
5. **Resource Limits**: Set appropriate CPU/memory limits

## See Also

- [intercept Command](intercept.md) - Traffic interception for development
- [dev Overview](README.md) - Development tools overview  
- [cluster Commands](../cluster/) - Cluster management
- [bootstrap Command](../bootstrap/) - Complete environment setup
- [Troubleshooting](../troubleshooting.md) - Common issues and solutions