# OpenFrame CLI - dev Command

Development tools for local Kubernetes workflows with Telepresence and Skaffold.

## Overview

The `dev` command group provides development workflow functionality for local Kubernetes development:

- **intercept** - Intercept traffic from cluster services to local development
- **skaffold** - Deploy development versions of services with live reloading

These tools support modern cloud-native development patterns using Telepresence for traffic interception and Skaffold for continuous development workflows.

## Subcommands

### [intercept](intercept.md) - Traffic Interception

Intercept cluster traffic and redirect it to your local development environment using Telepresence.

```bash
openframe dev intercept my-service
```

### [skaffold](skaffold.md) - Live Development

Deploy development versions of services with hot reloading using Skaffold.

```bash
openframe dev skaffold
```

## Quick Examples

### Intercept Service Traffic

```bash
# Intercept traffic for a specific service
openframe dev intercept api-service

# Intercept with custom local port
openframe dev intercept api-service --port 8080

# List active intercepts
telepresence list
```

### Start Skaffold Development

```bash
# Interactive setup - choose service and cluster
openframe dev skaffold

# Target specific cluster
openframe dev skaffold my-dev-cluster

# Skip bootstrap and use existing cluster
openframe dev skaffold --skip-bootstrap
```

## Development Workflow

### Complete Development Setup

1. **Create Development Cluster**
   ```bash
   openframe cluster create dev
   ```

2. **Start Skaffold Development**
   ```bash
   openframe dev skaffold dev
   ```

3. **Intercept Specific Services** (optional)
   ```bash
   openframe dev intercept api-service --port 8080
   ```

4. **Develop Locally**
   - Make code changes
   - Skaffold automatically rebuilds and redeploys
   - Intercepted traffic routes to your local environment

### Morning Development Routine

```bash
# Start development environment
openframe dev skaffold

# In another terminal, intercept services as needed
openframe dev intercept user-service --port 3001
openframe dev intercept auth-service --port 3002
```

## Global Flags

Available across all dev subcommands:

| Flag | Description |
|------|-------------|
| `--dry-run` | Show what would be done without executing |
| `--silent` | Suppress all output except errors |
| `--verbose` | Enable detailed output |

## Prerequisites

### For Skaffold
- Docker installed and running
- Kubernetes cluster (created with `openframe cluster create`)
- Skaffold CLI (automatically installed if missing)

### For Intercept
- Telepresence CLI (automatically installed if missing)
- Active Kubernetes cluster connection
- Services deployed in the cluster

## Configuration

### Skaffold Configuration

The CLI automatically discovers `skaffold.yaml` files in your project:

```yaml
# Example skaffold.yaml
apiVersion: skaffold/v4beta7
kind: Config
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
```

### Telepresence Configuration

Telepresence uses its default configuration, but you can customize:

```yaml
# ~/.telepresence/config.yml
timeouts:
  agentInstall: 120s
  intercept: 30s
```

## Common Patterns

### Service Mesh Development

```bash
# Start with full environment
openframe dev skaffold production

# Intercept specific services for local development
openframe dev intercept user-service --port 8001
openframe dev intercept payment-service --port 8002

# Keep other services running in cluster
```

### Frontend + Backend Development

```bash
# Backend development with Skaffold
openframe dev skaffold backend-cluster

# In another terminal, intercept API calls
openframe dev intercept api-gateway --port 3000

# Run frontend locally pointing to localhost:3000
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `KUBECONFIG` | Kubernetes config file | `~/.kube/config` |
| `TELEPRESENCE_LOGIN_DOMAIN` | Telepresence login domain | - |
| `SKAFFOLD_FILENAME` | Skaffold config file | `skaffold.yaml` |

## Troubleshooting

### Skaffold Issues

```bash
# Check Skaffold configuration
skaffold diagnose

# Force rebuild without cache
openframe dev skaffold --no-cache

# Verbose output for debugging
openframe dev skaffold --verbose
```

### Intercept Issues

```bash
# Check Telepresence status
telepresence status

# List active intercepts
telepresence list

# Quit and restart Telepresence
telepresence quit
```

### Common Solutions

1. **Port conflicts**: Use different `--port` values for intercepts
2. **Permission issues**: Ensure Docker and Kubernetes permissions
3. **Network issues**: Check cluster connectivity with `kubectl get nodes`
4. **Resource constraints**: Monitor cluster resources with `kubectl top nodes`

## Integration with IDE

### VS Code

Use the Kubernetes extension for cluster management and debugging:

```json
{
  "kubernetes.kubectl-path": "/usr/local/bin/kubectl",
  "kubernetes.namespace": "development"
}
```

### IntelliJ/GoLand

Configure remote debugging when using intercepts:

```yaml
# Debug configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: debug-config
data:
  JAVA_OPTS: "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=5005"
```

## Best Practices

1. **Use Specific Cluster Names**: Create dedicated dev clusters
2. **Keep Intercepts Minimal**: Only intercept services you're actively developing
3. **Monitor Resource Usage**: Watch cluster resources during development
4. **Clean Up Regularly**: Stop intercepts and clean up unused resources
5. **Version Control**: Keep skaffold.yaml files in version control

## See Also

- [intercept Command](intercept.md) - Detailed intercept documentation
- [skaffold Command](skaffold.md) - Detailed skaffold documentation
- [cluster Commands](../cluster/) - Cluster management for development
- [Troubleshooting](../troubleshooting.md) - Common issues and solutions