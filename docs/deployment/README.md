# Deployment Guide

This guide covers the deployment of OpenFrame's microservices architecture on Kubernetes using Kind. OpenFrame consists of Spring Boot microservices and a Vue.js frontend, all orchestrated through Kubernetes.

## Deployment Architecture

OpenFrame on Kubernetes consists of:

1. Core Microservices
   - OpenFrame API (Spring Boot)
   - OpenFrame Gateway (Spring Cloud Gateway)
   - OpenFrame Stream (Spring Kafka)
   - OpenFrame Management (Spring Boot)
   - OpenFrame Config (Spring Cloud Config)
   - OpenFrame Stream Service (Data Pipeline)

2. Frontend Services
   - OpenFrame UI (Vue.js)
   - Kafka UI (Kafka Management)
   - Mongo Express (MongoDB Management)

3. Data Layer
   - Cassandra cluster (indexed storage)
   - MongoDB (document storage)
   - Redis cluster (caching)
   - Apache Kafka (event streaming)
   - Apache Pinot (real-time analytics)

4. Infrastructure
   - Ingress Nginx
   - Prometheus & Grafana (monitoring)
   - Loki & Promtail (logging)
   - Service mesh (Istio)

## Prerequisites

Before deploying OpenFrame, ensure you have the following tools installed:
- Docker
- Kind
- Helm
- kubectl

## Deployment Process

OpenFrame provides a convenient deployment script (`run.sh`) that handles the entire deployment process. Here are the available commands:

### Bootstrap Complete Cluster
To set up and deploy the entire cluster with all applications:
```bash
./run.sh bootstrap
```

### Step-by-Step Deployment

1. Set up the Kind cluster:
```bash
./run.sh up
```

2. Deploy all applications:
```bash
./run.sh app all
```

Or deploy specific applications:
```bash
./run.sh app redis    # Deploy only Redis
./run.sh app kafka    # Deploy only Kafka
./run.sh app cassandra # Deploy only Cassandra
```

### Cleanup and Maintenance

- Clean up unused images from Kind nodes:
```bash
./run.sh cleanup
```

- Remove the entire cluster:
```bash
./run.sh down
```

## Service Configuration

Each service is configured through its respective Kubernetes manifest in the `manifests/infrastructure/` directory. For example, the API service configuration includes:

```yaml
# Example from openframe-api/api.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openframe-api
spec:
  replicas: 1
  containers:
    - name: api
      image: ghcr.io/flamingo-stack/openframe-oss-tenant/openframe-api:latest
      ports:
        - containerPort: 8090
          name: http
        - containerPort: 8091
          name: management
      env:
        - name: SPRING_PROFILES_ACTIVE
          value: "dev"
        - name: SPRING_CONFIG_URL
          value: "http://openframe-config.microservices.svc.cluster.local:8888"
      resources:
        requests:
          memory: "512Mi"
          cpu: "0.5"
        limits:
          memory: "1Gi"
          cpu: "1"
```

## Monitoring and Maintenance

### Health Checks
- Spring Boot actuator endpoints
- Service mesh health checks
- Database connectivity
- Kafka cluster status
- API availability

### Logging
- Application logs (via Loki & Promtail)
- System logs
- Access logs
- Error logs

### Backup and Recovery
- Cassandra backups
- MongoDB backups
- Kafka topic backups
- Configuration backups
- State backups
- Recovery procedures

## Security Considerations

1. Network Security
   - Ingress Nginx configuration
   - TLS configuration
   - Service mesh security

2. Access Control
   - Spring Security configuration
   - OAuth 2.0 setup
   - RBAC configuration
   - Service accounts
   - Secret management

3. Data Security
   - Encryption at rest
   - Encryption in transit
   - Backup security

## Troubleshooting

Common issues and solutions:

1. Service Startup
   - Check Spring Boot logs
   - Verify configuration
   - Check dependencies
   - Validate service mesh

2. Performance Issues
   - Monitor JVM metrics
   - Check Kafka throughput
   - Review Cassandra performance
   - Monitor resource usage

3. Connectivity Issues
   - Ingress configuration
   - Network policies
   - Load balancing
   - DNS resolution

## Additional Resources

- [Kubernetes Deployment Guide](kubernetes.md)
- [Service Mesh Configuration](../architecture/service-mesh.md)
- [Monitoring Guide](../operations/monitoring.md)
- [Security Best Practices](../security/overview.md)  