# Deployment Guide

This guide covers the deployment of OpenFrame's microservices architecture on Kubernetes. OpenFrame consists of Spring Boot microservices and a Vue.js frontend, all orchestrated through Kubernetes.

## Deployment Architecture

OpenFrame on Kubernetes consists of:

1. Core Microservices
   - OpenFrame API (Spring Boot)
   - OpenFrame Gateway (Spring Cloud Gateway)
   - OpenFrame Stream (Spring Kafka)
   - OpenFrame Management (Spring Boot)
   - OpenFrame Config (Spring Cloud Config)

2. Frontend Services
   - OpenFrame UI (Vue.js)
   - Grafana Dashboards
   - Loki Log Viewer

3. Data Layer
   - Cassandra cluster (indexed storage)
   - Apache Pinot (real-time analytics)
   - Redis cluster (caching)
   - Apache Kafka (event streaming)

4. Infrastructure
   - Istio Service Mesh
   - Prometheus & Grafana (monitoring)
   - Loki (logging)
   - Ingress Controller

## Deployment Checklist

### Pre-deployment
- [ ] Review system requirements
- [ ] Prepare Kubernetes cluster (v1.20+)
- [ ] Configure Istio service mesh
- [ ] Set up monitoring stack
- [ ] Prepare backup strategy

### Deployment
- [ ] Deploy core infrastructure
- [ ] Configure Spring Boot services
- [ ] Deploy Vue.js frontend
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Test connectivity

### Post-deployment
- [ ] Verify all services
- [ ] Test monitoring
- [ ] Configure alerts
- [ ] Document configuration
- [ ] Set up maintenance schedule

## Environment Configuration

```yaml
# values.yaml
global:
  environment: production
  domain: your-domain.com
  storageClass: standard

spring:
  cloud:
    gateway:
      routes:
        - id: api-service
          uri: lb://openframe-api
        - id: stream-service
          uri: lb://openframe-stream
        - id: management-service
          uri: lb://openframe-management

services:
  api:
    replicas: 2
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
    env:
      - name: SPRING_PROFILES_ACTIVE
        value: "prod"
      - name: JAVA_OPTS
        value: "-Xmx1g -Xms512m"

  gateway:
    replicas: 2
    resources:
      requests:
        cpu: 500m
        memory: 512Mi

  stream:
    replicas: 3
    resources:
      requests:
        cpu: 1000m
        memory: 2Gi

  ui:
    replicas: 2
    resources:
      requests:
        cpu: 200m
        memory: 256Mi
```

## Monitoring and Maintenance

### Health Checks
- Spring Boot actuator endpoints
- Service mesh health checks
- Database connectivity
- Kafka cluster status
- API availability

### Logging
- Application logs (via Loki)
- System logs
- Access logs
- Error logs

### Backup and Recovery
- Cassandra backups
- Kafka topic backups
- Configuration backups
- State backups
- Recovery procedures

## Security Considerations

1. Network Security
   - Istio security policies
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
   - Service mesh configuration
   - Network policies
   - Load balancing
   - DNS resolution

## Additional Resources

- [Kubernetes Deployment Guide](kubernetes.md)
- [Service Mesh Configuration](../architecture/service-mesh.md)
- [Monitoring Guide](../operations/monitoring.md)
- [Security Best Practices](../security/overview.md)  