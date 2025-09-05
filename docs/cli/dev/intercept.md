# OpenFrame CLI - dev intercept

Intercept cluster traffic and redirect it to your local development environment using Telepresence.

## Overview

The `intercept` command allows you to intercept traffic from services running in your Kubernetes cluster and redirect it to your local development environment. This enables you to develop and debug services locally while they remain integrated with the rest of your cluster.

## Syntax

```bash
openframe dev intercept <service-name> [flags]
```

## Arguments

| Argument | Description |
|----------|-------------|
| `service-name` | Name of the Kubernetes service to intercept |

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--port` | `8080` | Local port to redirect traffic to |
| `--namespace` | Auto-detected | Kubernetes namespace containing the service |
| `--method` | `auto` | Interception method (auto, personal, global) |
| `--headers` | - | HTTP headers to match for interception |

## Examples

### Basic Intercept

Intercept all traffic from a service to your local development server:

```bash
# Intercept api-service traffic to localhost:8080
openframe dev intercept api-service

# Intercept with custom local port
openframe dev intercept api-service --port 3000
```

### Namespace-Specific Intercept

```bash
# Intercept service in specific namespace
openframe dev intercept user-service --namespace production
```

### Header-Based Intercept

Intercept only traffic with specific headers (personal intercepts):

```bash
# Intercept traffic with specific header
openframe dev intercept api-service --headers "x-dev-user=alice"

# Multiple headers
openframe dev intercept api-service --headers "x-env=dev,x-user-id=123"
```

### Method Selection

```bash
# Personal intercept (only your traffic)
openframe dev intercept api-service --method personal

# Global intercept (all traffic)
openframe dev intercept api-service --method global
```

## Intercept Types

### Personal Intercept

Intercepts only traffic that matches specific criteria (headers, etc.):

- **Use case**: Multiple developers working on the same cluster
- **Traffic**: Only requests with matching headers are intercepted
- **Safety**: Other team members' traffic is unaffected

```bash
# Personal intercept with automatic header injection
openframe dev intercept api-service --method personal
```

### Global Intercept

Intercepts all traffic to the service:

- **Use case**: Full service replacement during development
- **Traffic**: All requests to the service are intercepted
- **Safety**: Affects all users of the cluster

```bash
# Global intercept (use with caution)
openframe dev intercept api-service --method global
```

## Prerequisites

Before using intercept, ensure:

1. **Telepresence CLI** is installed (auto-installed if missing)
2. **Kubernetes cluster** is running and accessible
3. **Target service** is deployed in the cluster
4. **Local service** is running on the specified port

### Automatic Prerequisites Check

The CLI automatically checks and installs missing prerequisites:

```bash
# If Telepresence is missing, you'll see:
Missing Prerequisites: telepresence

Do you want to install Telepresence automatically? [Y/n]
```

## Workflow Integration

### Development Workflow

```bash
# 1. Start your local development server
npm start  # or go run main.go, mvn spring-boot:run, etc.

# 2. Intercept the cluster service
openframe dev intercept api-service --port 3000

# 3. Make requests to the cluster
curl https://your-cluster.com/api/users
# Traffic flows to your local server on port 3000

# 4. Stop intercept when done
telepresence leave api-service
```

### With Skaffold

Combine intercepts with Skaffold for powerful development workflows:

```bash
# Terminal 1: Start Skaffold development
openframe dev skaffold

# Terminal 2: Intercept specific service
openframe dev intercept user-service --port 8001

# Now user-service requests go to localhost:8001
# while other services use the cluster versions
```

## Managing Intercepts

### List Active Intercepts

```bash
# List all active intercepts
telepresence list

# Example output:
# user-service: intercepted
#   Intercept name: user-service
#   State         : ACTIVE
#   Workload kind : Deployment
#   Destination   : 127.0.0.1:8001
```

### Stop Intercepts

```bash
# Stop specific intercept
telepresence leave user-service

# Stop all intercepts
telepresence quit
```

### Check Status

```bash
# Check Telepresence connection status
telepresence status

# Example output:
# Root Daemon: Running
# User Daemon: Running
# Name       : default
# Namespace  : ambassador
# Status     : Connected
```

## Configuration

### Global Configuration

Create `~/.telepresence/config.yml` for global settings:

```yaml
timeouts:
  agentInstall: 120s
  intercept: 30s
  proxyDial: 5s
  trafficManagerConnect: 60s

logLevels:
  userDaemon: info
  rootDaemon: info

images:
  registry: docker.io/telepresence
  tag: 2.15.1

intercept:
  defaultPort: 8080
  useFtp: false

grpc:
  maxReceiveSize: 4Mi
```

### Service-Specific Configuration

Configure intercepts per service in your project:

```yaml
# .openframe/intercept.yml
services:
  api-service:
    port: 8080
    headers:
      - "x-dev-user={{ .Env.USER }}"
      - "x-intercept-id={{ .Random }}"
  
  user-service:
    port: 8001
    method: personal
    
  payment-service:
    port: 8002
    namespace: payments
```

## Advanced Usage

### Environment Variable Injection

Telepresence automatically injects cluster environment variables:

```bash
# Your local process receives environment variables from the cluster
echo $DATABASE_URL  # Set from cluster ConfigMap/Secret
echo $REDIS_HOST    # Set from cluster Service
```

### Volume Mounting

Access cluster volumes locally:

```bash
# Mount cluster volumes to local filesystem
telepresence mount /tmp/telepresence-mounts

# Access cluster files locally
ls /tmp/telepresence-mounts/var/lib/myapp/
```

### Multi-Service Intercept

Intercept multiple services simultaneously:

```bash
# Terminal 1
openframe dev intercept api-service --port 8080

# Terminal 2  
openframe dev intercept user-service --port 8081

# Terminal 3
openframe dev intercept auth-service --port 8082
```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :8080
   
   # Use different port
   openframe dev intercept api-service --port 8081
   ```

2. **Service Not Found**
   ```bash
   # List available services
   kubectl get services
   
   # Check correct namespace
   kubectl get services -n production
   ```

3. **Connection Issues**
   ```bash
   # Check cluster connectivity
   kubectl get nodes
   
   # Restart Telepresence
   telepresence quit
   telepresence connect
   ```

4. **Permission Denied**
   ```bash
   # Check RBAC permissions
   kubectl auth can-i create deployments
   
   # Check Telepresence permissions
   telepresence status
   ```

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
# Enable debug logging
export TELEPRESENCE_LOG_LEVEL=debug

# Run intercept with verbose output
openframe dev intercept api-service --verbose
```

### Network Diagnostics

```bash
# Test cluster connectivity
telepresence test-connection

# Check DNS resolution
nslookup api-service.default.svc.cluster.local

# Test service endpoints
kubectl get endpoints api-service
```

## Security Considerations

### Personal Intercepts

- Use personal intercepts in shared environments
- Include user identification in headers
- Avoid intercepting production traffic

```bash
# Safe personal intercept
openframe dev intercept api-service \
  --method personal \
  --headers "x-dev-user=${USER}"
```

### Network Security

- Telepresence creates VPN-like connection to cluster
- Local processes have access to cluster network
- Use appropriate firewall rules

### Credentials

- Local processes inherit cluster service account permissions
- Be cautious with sensitive operations
- Use separate namespaces for development

## Performance Considerations

### Network Latency

- Intercepts add network latency for intercepted traffic
- Keep intercepts minimal for better performance
- Use personal intercepts when possible

### Resource Usage

- Monitor local resource usage during intercepts
- Telepresence agent runs in the cluster
- Clean up unused intercepts

```bash
# Monitor resource usage
kubectl top pods -n ambassador
kubectl describe pod telepresence-agent
```

## Integration Examples

### With Docker Compose

```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "8080:8080"
    environment:
      # These come from the intercepted cluster service
      - DATABASE_URL
      - REDIS_URL
```

```bash
# Start local services
docker-compose -f docker-compose.dev.yml up

# Intercept cluster service
openframe dev intercept api-service --port 8080
```

### With Hot Reloading

```bash
# Node.js with nodemon
npm install -g nodemon
nodemon --port 8080 server.js &

# Intercept traffic
openframe dev intercept api-service --port 8080

# Changes are automatically reloaded
```

## Best Practices

1. **Use Personal Intercepts**: Safer in shared environments
2. **Keep Ports Organized**: Use consistent port ranges per service
3. **Clean Up**: Stop intercepts when done developing
4. **Monitor Performance**: Watch for increased latency
5. **Use Headers**: Include identifying headers for debugging
6. **Test Locally**: Verify local service works before intercepting

## See Also

- [skaffold Command](skaffold.md) - Live development with Skaffold
- [dev Overview](README.md) - Development tools overview
- [cluster Commands](../cluster/) - Cluster management
- [Troubleshooting](../troubleshooting.md) - Common issues and solutions