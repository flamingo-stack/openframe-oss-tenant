# Reference Documentation

This section provides comprehensive reference documentation for OpenFrame components, configurations, and technical specifications.

## Quick Reference

### Core Services
- **[OpenFrame API](services/openframe-api.md)** - Core backend service with GraphQL API
- **[OpenFrame Gateway](services/openframe-gateway.md)** - Authentication proxy and routing
- **[OpenFrame Client](services/openframe-client.md)** - Agent management and authentication
- **[OpenFrame Stream](services/openframe-stream.md)** - Real-time data processing
- **[OpenFrame Management](services/openframe-management.md)** - Administrative functions
- **[OpenFrame Config](services/openframe-config.md)** - Configuration management
- **[OpenFrame UI](services/openframe-ui.md)** - Vue.js frontend application

### Shared Libraries
- **[OpenFrame Data](libraries/openframe-data.md)** - Data access layer
- **[OpenFrame JWT](libraries/openframe-jwt.md)** - JWT security implementation
- **[API Library](libraries/api-library.md)** - Common API services and DTOs

### Integrated Tools
- **[Tactical RMM](tools/tactical-rmm.md)** - IT management suite integration
- **[MeshCentral](tools/meshcentral.md)** - Remote management platform
- **[Fleet MDM](tools/fleet-mdm.md)** - Mobile device management
- **[Authentik](tools/authentik.md)** - Identity provider integration

## Reference Sections

### ⚙️ Configuration Reference
- **[Configuration Overview](configuration/overview.md)** - Configuration management principles
- **[Service Configuration](configuration/services.md)** - Individual service configuration
- **[Environment Variables](configuration/environment.md)** - Environment variable reference
- **[Secret Management](configuration/secrets.md)** - Secret configuration and management

### 📚 Library Documentation
<!-- Core Library moved to openframe-oss-lib -->
- **[Data Access Library](libraries/openframe-data.md)** - Database and messaging abstractions
- **[JWT Library](libraries/openframe-jwt.md)** - Authentication and authorization
- **[API Library](libraries/api-library.md)** - Shared API components and DTOs

### 🔧 Service Reference
- **[API Service](services/openframe-api.md)** - GraphQL API and OAuth 2.0 implementation
- **[Gateway Service](services/openframe-gateway.md)** - Reverse proxy and authentication
- **[Client Service](services/openframe-client.md)** - Agent management and JWT issuance
- **[Stream Service](services/openframe-stream.md)** - Kafka-based stream processing and data pipeline
- **[Management Service](services/openframe-management.md)** - Scheduled tasks and administration
- **[Config Service](services/openframe-config.md)** - Spring Cloud Config Server
- **[UI Service](services/openframe-ui.md)** - Vue.js frontend with PrimeVue

### 💾 Data Reference  
- **[MongoDB Schemas](data/mongodb.md)** - Document structures and indexes
- **[Cassandra Schemas](data/cassandra.md)** - Table definitions and queries
- **[Redis Usage](data/redis.md)** - Caching strategies and key patterns
- **[Kafka Topics](data/kafka.md)** - Message formats and topic organization

### 🔌 Tool Integration Reference
- **[Tactical RMM Integration](tools/tactical-rmm.md)** - API endpoints and data flows
- **[MeshCentral Integration](tools/meshcentral.md)** - Remote management capabilities
- **[Fleet MDM Integration](tools/fleet-mdm.md)** - Mobile device management
- **[Authentik Integration](tools/authentik.md)** - Identity and access management

## Technical Specifications

### System Requirements

#### Minimum Requirements
- **CPU**: 4 cores @ 2.4 GHz
- **RAM**: 8 GB
- **Storage**: 50 GB available space
- **Network**: 1 Gbps connection

#### Recommended Production
- **CPU**: 8+ cores @ 3.0 GHz  
- **RAM**: 32 GB
- **Storage**: 200 GB SSD
- **Network**: 10 Gbps connection

### Performance Characteristics

#### API Performance
- **Response Time**: < 200ms average
- **Throughput**: 100,000 events/second
- **Concurrent Users**: 10,000+ supported
- **Availability**: 99.9% uptime SLA

#### Data Storage
- **MongoDB**: Sub-millisecond reads, automatic sharding
- **Cassandra**: Linear scalability, multi-datacenter replication
- **Apache Pinot**: Sub-second OLAP queries, real-time ingestion
- **Redis**: In-memory caching, microsecond response times

### Network Architecture

#### Port Allocation
```
8080  - Gateway service (main entry point)
8888  - Configuration server
8081  - API service (internal)
8082  - Client service (internal)
8083  - Management service (internal)  
8084  - Stream service (internal)
3000  - UI development server
27017 - MongoDB
9042  - Cassandra
6379  - Redis
9092  - Kafka
```

#### Service Communication
- **Internal**: Service mesh with mTLS
- **External**: HTTPS with JWT authentication
- **Database**: Encrypted connections
- **Message Queue**: SASL authentication

### Security Specifications

#### Authentication
- **OAuth 2.0**: Authorization Code, Client Credentials flows
- **JWT**: RS256 algorithm, 1-hour expiration
- **API Keys**: SHA-256 hashed, rate limited
- **Session Management**: HTTP-only cookies, CSRF protection

#### Encryption
- **Data at Rest**: AES-256 encryption
- **Data in Transit**: TLS 1.3
- **Database**: Transparent data encryption
- **Secrets**: Kubernetes secrets with encryption at rest

#### Access Control
- **Role-Based**: Administrator, Operator, Viewer roles
- **Resource-Based**: Fine-grained permissions
- **API Rate Limiting**: Per-client limits
- **Network Policies**: Microsegmentation

## API Reference Quick Links

### GraphQL API
```graphql
# System information query
query SystemInfo {
  systemInfo {
    version
    status
    uptime
    services {
      name
      status
      version
    }
  }
}

# Event query with filtering
query Events($filter: EventFilter) {
  events(filter: $filter) {
    id
    timestamp
    source
    type
    data
  }
}
```

### REST API Endpoints
```bash
# Authentication
POST /oauth/token
GET  /.well-known/openid-configuration

# Health checks
GET  /actuator/health
GET  /actuator/info
GET  /actuator/metrics

# Agent management
GET    /api/agents
POST   /api/agents
PUT    /api/agents/{id}
DELETE /api/agents/{id}
```

### WebSocket API
```javascript
// Connect to real-time updates
const ws = new WebSocket('ws://localhost:8080/ws');

// Subscribe to events
ws.send(JSON.stringify({
  type: 'subscribe',
  topics: ['system.events', 'agent.metrics']
}));
```

## Configuration Examples

### Application Configuration
```yaml
# application.yml
spring:
  profiles:
    active: production
  datasource:
    mongodb:
      uri: mongodb://mongodb:27017/openframe
    cassandra:
      keyspace: openframe
      contact-points: cassandra:9042

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
```

### Environment Variables
```bash
# Core configuration
SPRING_PROFILES_ACTIVE=production
SERVER_PORT=8080
MANAGEMENT_SERVER_PORT=8081

# Database configuration
MONGODB_URI=mongodb://mongodb:27017/openframe
CASSANDRA_KEYSPACE=openframe
REDIS_HOST=redis
REDIS_PORT=6379

# Security configuration
JWT_SECRET=your-jwt-secret-key
OAUTH2_CLIENT_ID=openframe-client
OAUTH2_CLIENT_SECRET=client-secret
```

## Troubleshooting Quick Reference

### Common Issues
- **Service startup failures**: Check configuration and dependencies
- **Database connection errors**: Verify connection strings and credentials
- **Authentication issues**: Check JWT secret and OAuth2 configuration
- **Performance problems**: Monitor resource usage and scale accordingly

### Diagnostic Commands
```bash
# Service health
curl http://localhost:8080/actuator/health

# Service metrics
curl http://localhost:8080/actuator/metrics

# Container logs
kubectl logs deployment/openframe-api -f

# Resource usage
kubectl top pods --sort-by=memory
```

## Version Information

### Current Versions
- **OpenFrame Platform**: 2.0.0
- **Spring Boot**: 3.3.0
- **Vue.js**: 3.4.0
- **Java**: 21
- **Node.js**: 18+

### Compatibility Matrix
| Component | Version | Compatible With |
|-----------|---------|-----------------|
| OpenFrame API | 2.0.0 | Spring Boot 3.3.0+ |
| OpenFrame UI | 2.0.0 | Node.js 18+ |
| Client Agent | 2.0.0 | Rust 1.70+ |
| MongoDB | 7.x | Driver 4.10+ |
| Cassandra | 4.x | Driver 4.15+ |

For detailed implementation information, see the specific reference documents in each section.