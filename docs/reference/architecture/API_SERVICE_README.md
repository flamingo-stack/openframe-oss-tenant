# API Service Documentation Guide

Welcome to the **OpenFrame API Service** documentation! This guide will help you navigate the comprehensive documentation for the API Service module.

---

## 📚 Documentation Structure

The API Service documentation is organized into the following files:

### 🏠 Main Documentation
- **[api_service.md](./api_service.md)** - Complete overview of the API Service module
  - Architecture and design patterns
  - Key features and capabilities
  - Integration points and data flow
  - Configuration and deployment
  - API endpoints reference
  - Troubleshooting guide

### 🔧 Sub-Module Documentation

#### 1. **[Configuration Layer](./api_service_configuration.md)**
Deep dive into Spring Security and application configuration:
- `ApiApplicationConfig` - Bean definitions and password encoding
- `AuthenticationConfig` - Custom authentication principal resolution
- `SecurityConfig` - OAuth2 Resource Server with JWT validation
- JWT provider caching with Caffeine
- Multi-tenant security architecture

#### 2. **[REST Controllers](./api_service_rest_controllers.md)**
Internal REST API endpoints for entity management:
- `DeviceController` - Device status updates
- `OrganizationController` - Organization CRUD operations
- `UserController` - User management and soft deletion
- Request/response DTOs and validation
- Error handling patterns

#### 3. **[GraphQL DataFetchers](./api_service_graphql_datafetchers.md)**
GraphQL query and mutation layer with Netflix DGS:
- `DeviceDataFetcher` - Device queries with filtering and relationships
- `EventDataFetcher` - Event tracking and mutations
- `LogDataFetcher` - Audit log queries with time-series data
- `OrganizationDataFetcher` - Organization queries
- `ToolsDataFetcher` - Integrated tool queries
- DataLoader batching for N+1 prevention
- Cursor-based pagination implementation

#### 4. **[Application Entry Point](./api_service_application.md)**
Bootstrap and component scanning configuration:
- `ApiApplication` - Spring Boot main class
- Component scanning setup
- Service integration points
- Deployment architecture

---

## 🚀 Quick Start

### For Developers

1. **Understanding the Architecture**
   - Start with [api_service.md](./api_service.md) - Architecture Overview section
   - Review the component interaction diagrams
   - Understand the data flow patterns

2. **Working with REST APIs**
   - Read [api_service_rest_controllers.md](./api_service_rest_controllers.md)
   - Check the API endpoints table
   - Review request/response examples

3. **Working with GraphQL**
   - Read [api_service_graphql_datafetchers.md](./api_service_graphql_datafetchers.md)
   - Study the GraphQL schema examples
   - Learn about DataLoader batching

4. **Configuring Security**
   - Read [api_service_configuration.md](./api_service_configuration.md)
   - Understand JWT validation flow
   - Configure multi-tenant security

### For DevOps/SRE

1. **Deployment**
   - Check [api_service.md](./api_service.md) - Deployment section
   - Review Docker and Kubernetes configurations
   - Set up environment variables

2. **Configuration**
   - Review [api_service.md](./api_service.md) - Configuration section
   - Configure data sources (MongoDB, Cassandra, Pinot)
   - Set up JWT issuer URIs

3. **Monitoring**
   - Check [api_service.md](./api_service.md) - Performance Considerations
   - Set up metrics collection
   - Configure logging

4. **Troubleshooting**
   - Review [api_service.md](./api_service.md) - Troubleshooting section
   - Common issues and solutions
   - Debug JWT validation problems

---

## 🔑 Key Concepts

### GraphQL with Netflix DGS
The API Service uses Netflix DGS framework for GraphQL implementation:
- **Type-safe schema-first development**
- **Automatic DataLoader batching** for efficient data loading
- **Custom scalar types** for complex data types
- **Input validation** with Jakarta Bean Validation

### Security Model
Multi-layered security approach:
- **Gateway-level authentication** - JWT validation and filtering
- **API-level authorization** - OAuth2 Resource Server
- **Multi-tenant isolation** - Tenant-scoped data access
- **JWT provider caching** - Performance optimization

### Data Access Patterns
Efficient data access across multiple data stores:
- **MongoDB** - Primary data store for entities
- **Cassandra** - Time-series data for logs
- **Apache Pinot** - Real-time analytics queries
- **DataLoader batching** - N+1 query prevention

### Pagination Strategy
Cursor-based pagination for all list queries:
- **Forward pagination** - `first` and `after` parameters
- **Backward pagination** - `last` and `before` parameters
- **Total count** - For UI pagination controls
- **Stable cursors** - Consistent across data mutations

---

## 📖 Related Documentation

### OpenFrame Platform Modules
- **[Gateway Service](./gateway_service.md)** - Request routing and authentication
- **[Authorization Service](./authorization_service.md)** - OAuth2 and JWT management
- **[Data Layer (MongoDB)](./data_layer_mongo.md)** - Entity models and repositories
- **[Data Layer (Core)](./data_layer_core.md)** - Cassandra and Pinot repositories
- **[External API](./external_api.md)** - Public-facing REST API
- **[Security Core](./security_core.md)** - Shared security components
- **[Stream Processing](./stream_processing.md)** - Event streaming with Kafka

### External Resources
- **Netflix DGS Documentation:** https://netflix.github.io/dgs/
- **Spring Security OAuth2:** https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/index.html
- **GraphQL Best Practices:** https://graphql.org/learn/best-practices/
- **OpenFrame Community:** https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA

---

## 🎯 Common Use Cases

### Use Case 1: Adding a New GraphQL Query
1. Define schema in `src/main/resources/schema/*.graphqls`
2. Create DataFetcher class with `@DgsQuery` annotation
3. Implement service layer for business logic
4. Add DataLoader if batching is needed
5. Write integration tests

**Reference:** [api_service_graphql_datafetchers.md](./api_service_graphql_datafetchers.md) - Adding New Queries section

### Use Case 2: Adding a New REST Endpoint
1. Create controller class with `@RestController`
2. Define request/response DTOs with validation
3. Implement service layer for business logic
4. Add mapper for DTO conversion
5. Write unit and integration tests

**Reference:** [api_service_rest_controllers.md](./api_service_rest_controllers.md) - Adding New Endpoints section

### Use Case 3: Implementing Multi-Tenant Security
1. Configure JWT issuer resolution
2. Set up tenant context extraction
3. Implement tenant-scoped repositories
4. Add tenant validation in services
5. Test cross-tenant data isolation

**Reference:** [api_service_configuration.md](./api_service_configuration.md) - Multi-Tenant Security section

### Use Case 4: Optimizing Query Performance
1. Identify N+1 query problems
2. Implement DataLoader batching
3. Add database indexes on filter fields
4. Configure JWT provider caching
5. Monitor query execution times

**Reference:** [api_service.md](./api_service.md) - Performance Considerations section

---

## 🛠️ Development Workflow

### Setting Up Development Environment

```bash
# Clone the repository
git clone https://github.com/openframe/openframe.git
cd openframe/services/openframe-api

# Install dependencies
mvn clean install

# Run tests
mvn test

# Start the service
mvn spring-boot:run
```

### Running with Docker

```bash
# Build Docker image
docker build -t openframe/api:latest .

# Run container
docker run -p 8080:8080 \
  -e MONGODB_URI=mongodb://localhost:27017 \
  -e JWT_ISSUER_URI=http://localhost:9000 \
  openframe/api:latest
```

### Testing GraphQL Queries

```bash
# Using curl
curl -X POST http://localhost:8080/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"query": "{ devices { edges { node { machineId hostname } } } }"}'

# Using GraphQL Playground
# Navigate to http://localhost:8080/graphiql
```

---

## 📊 Architecture Diagrams

### High-Level Architecture
See [api_service.md](./api_service.md#architecture-overview) for the complete architecture diagram showing:
- Client applications and API Gateway
- API Service layer components
- Configuration and security layers
- Data access layer (MongoDB, Cassandra, Pinot)
- External service integrations

### Security Flow
See [api_service_configuration.md](./api_service_configuration.md#security-architecture) for JWT validation flow:
- Client request with JWT
- Gateway validation
- API Service JWT provider caching
- Authorization Server JWKS fetching

### Data Flow Patterns
See [api_service.md](./api_service.md#data-flow-patterns) for:
- GraphQL query flow
- REST mutation flow
- DataLoader batching flow

---

## 🤝 Contributing

### Documentation Updates
When updating the API Service code, please also update the relevant documentation:

1. **Code Changes** → Update corresponding `.md` file
2. **New Features** → Add to main [api_service.md](./api_service.md)
3. **Configuration Changes** → Update [api_service_configuration.md](./api_service_configuration.md)
4. **API Changes** → Update endpoint tables and examples

### Documentation Standards
- Follow the Flamingo Markdown Formatting Guidelines
- Use Mermaid diagrams for architecture visualization
- Include code examples with proper syntax highlighting
- Add cross-references to related documentation
- Keep examples up-to-date with current code

---

## 📞 Support

### Getting Help
- **Slack Community:** https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
- **Documentation Issues:** File an issue in the documentation repository
- **Code Issues:** File an issue in the main OpenFrame repository

### Feedback
We welcome feedback on this documentation! Please let us know:
- What's missing or unclear
- What examples would be helpful
- What use cases should be covered

---

**Last Updated:** 2024-01-15  
**Documentation Version:** 1.0.0  
**Maintained by:** OpenFrame Platform Team
