# Kubernetes Deployment Guide

This guide covers deploying OpenFrame on Kubernetes. OpenFrame is designed to run as a collection of microservices in a Kubernetes environment.

## Prerequisites

Before deploying OpenFrame on Kubernetes, ensure you have:

- Kubernetes cluster (version 1.20 or later)
- Helm 3.x installed
- `kubectl` configured to access your cluster
- Sufficient resources in your cluster:
  - Minimum 4 nodes
  - 16GB RAM per node
  - 100GB storage per node

## Quick Deployment

1. Add the OpenFrame Helm repository:
   ```bash
   helm repo add openframe https://your-org.github.io/openframe/charts
   helm repo update
   ```

2. Create a namespace for OpenFrame:
   ```bash
   kubectl create namespace openframe
   ```

3. Deploy OpenFrame using Helm:
   ```bash
   helm install openframe openframe/openframe \
     --namespace openframe \
     --set global.domain=your-domain.com \
     --set global.storageClass=standard
   ```

## Architecture Overview

OpenFrame consists of the following main components in Kubernetes:

### Core Services
- API Gateway
- Authentication Service
- Device Management Service
- Monitoring Service
- Reporting Service

### Data Storage
- Cassandra cluster
- Redis cluster
- PostgreSQL database

### Infrastructure
- Ingress controller
- Service mesh
- Monitoring stack

## Configuration

### Basic Configuration

Create a `values.yaml` file with your configuration:

```yaml
global:
  domain: your-domain.com
  storageClass: standard
  environment: production

apiGateway:
  replicas: 2
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi

cassandra:
  enabled: true
  replicas: 3
  storage:
    size: 100Gi
    storageClass: standard

redis:
  enabled: true
  replicas: 3
  storage:
    size: 50Gi
    storageClass: standard
```

### Advanced Configuration

For production deployments, consider:

1. Setting up proper ingress with TLS
2. Configuring persistent storage
3. Setting up monitoring and logging
4. Configuring backup solutions

## Scaling

### Horizontal Scaling

To scale OpenFrame horizontally:

```bash
helm upgrade openframe openframe/openframe \
  --namespace openframe \
  --set apiGateway.replicas=3 \
  --set monitoringService.replicas=2
```

### Vertical Scaling

To adjust resource limits:

```bash
helm upgrade openframe openframe/openframe \
  --namespace openframe \
  --set apiGateway.resources.limits.cpu=2000m \
  --set apiGateway.resources.limits.memory=2Gi
```

## Monitoring and Maintenance

### Health Checks

Monitor the health of your deployment:

```bash
kubectl get pods -n openframe
kubectl get services -n openframe
kubectl get ingress -n openframe
```

### Logs

Access logs for troubleshooting:

```bash
kubectl logs -f deployment/api-gateway -n openframe
kubectl logs -f deployment/monitoring-service -n openframe
```

### Backup and Recovery

1. Regular backups of persistent volumes
2. Database backups
3. Configuration backups

## Troubleshooting

Common issues and solutions:

1. Pod startup issues
   - Check resource limits
   - Verify persistent volume claims
   - Check logs for errors

2. Service connectivity
   - Verify service mesh configuration
   - Check ingress rules
   - Validate network policies

3. Storage issues
   - Verify storage class configuration
   - Check persistent volume claims
   - Validate storage quotas

## Security Considerations

1. Network Policies
2. Pod Security Policies
3. Secret Management
4. RBAC Configuration

## Upgrading

To upgrade OpenFrame:

```bash
helm upgrade openframe openframe/openframe \
  --namespace openframe \
  --version <new-version>
```

## Rollback

If issues occur after upgrade:

```bash
helm rollback openframe <previous-revision> \
  --namespace openframe
```

## Additional Resources

- [Infrastructure Setup](infrastructure.md)
- [Scaling Guide](scaling.md)
- [Monitoring Guide](monitoring.md)
- [Security Best Practices](../security/overview.md) 