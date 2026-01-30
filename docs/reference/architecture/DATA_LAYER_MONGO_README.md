# MongoDB Data Layer - OpenFrame Platform

[![OpenFrame](https://img.shields.io/badge/OpenFrame-Data%20Layer-blue)](https://openframe.ai)
[![MongoDB](https://img.shields.io/badge/MongoDB-5.0+-green)](https://www.mongodb.com/)
[![Spring Data](https://img.shields.io/badge/Spring%20Data-MongoDB-brightgreen)](https://spring.io/projects/spring-data-mongodb)

## 🎯 Overview

The **MongoDB Data Layer** is the foundational persistence module for the OpenFrame platform, providing a robust, scalable, and flexible data access layer for all core business entities. Built on Spring Data MongoDB, it supports both blocking and reactive programming models, enabling seamless integration across diverse service architectures.

### What is OpenFrame?

[OpenFrame](https://openframe.ai) is the unified AI-driven MSP platform that integrates multiple IT management tools into a single interface, automating IT support operations across the entire technology stack. Part of the [Flamingo](https://flamingo.run) ecosystem, OpenFrame replaces expensive proprietary software with open-source alternatives enhanced by intelligent automation.

## 🚀 Key Features

- **📦 Comprehensive Data Model**: Unified document schemas for Users, Organizations, Devices, Machines, Tools, and Events
- **🔄 Dual Programming Model**: Support for both blocking (Servlet) and reactive (WebFlux) repositories
- **🏢 Multi-Tenancy**: Built-in organization-scoped data isolation
- **⏱️ Automatic Auditing**: Timestamp tracking for all entity changes
- **🔍 Flexible Querying**: Technology-agnostic repository interfaces with custom query support
- **🛡️ Soft Delete**: Recoverable deletion pattern for critical entities
- **📊 Optimized Indexing**: Strategic indexes for high-performance queries
- **🔌 Conditional Activation**: Services can selectively enable MongoDB support

## 📋 Table of Contents

- [Architecture](#architecture)
- [Module Structure](#module-structure)
- [Quick Start](#quick-start)
- [Document Models](#document-models)
- [Repository Layer](#repository-layer)
- [Configuration](#configuration)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Integration](#integration)
- [Performance](#performance)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## 🏗️ Architecture

The MongoDB Data Layer follows a clean, layered architecture:

```mermaid
flowchart TD
    subgraph services["OpenFrame Services"]
        API["API Service<br/>(REST + GraphQL)"]
        Auth["Authorization Service<br/>(OAuth2)"]
        Mgmt["Management Service<br/>(Tools + CDC)"]
        Client["Client Service<br/>(Device Registration)"]
        External["External API<br/>(Public API)"]
    end

    subgraph data_layer["MongoDB Data Layer"]
        direction TB
        Config["Configuration Layer<br/>MongoConfig"]
        
        subgraph documents["Document Models"]
            User["User"]
            Org["Organization"]
            Machine["Machine"]
            Device["Device"]
            Tool["IntegratedTool"]
            Event["CoreEvent"]
        end
        
        subgraph repositories["Repository Layer"]
            BaseRepos["Base Interfaces<br/>(Technology-Agnostic)"]
            BlockingRepos["Blocking Repositories<br/>(Servlet)"]
            ReactiveRepos["Reactive Repositories<br/>(WebFlux)"]
        end
    end

    subgraph mongodb["MongoDB"]
        Collections[("Collections:<br/>users, organizations,<br/>machines, devices,<br/>integrated_tools, events")]
    end

    API -->|"CRUD operations"| repositories
    Auth -->|"User/Tenant queries"| repositories
    Mgmt -->|"Tool management"| repositories
    Client -->|"Device tracking"| repositories
    External -->|"Public API access"| repositories

    Config -->|"configures"| repositories
    repositories -->|"persist/query"| documents
    documents -->|"stored in"| Collections
```

### Design Principles

1. **Separation of Concerns**: Clear boundaries between configuration, models, and repositories
2. **Technology Agnostic**: Base interfaces abstract implementation details
3. **Flexibility**: Support for both blocking and reactive paradigms
4. **Consistency**: Unified patterns across all document types
5. **Extensibility**: Easy to add new document types and repositories

## 📦 Module Structure

The data_layer_mongo module is organized into three primary sub-modules:

### 1. Configuration (`data_layer_mongo_configuration`)

Handles MongoDB setup and Spring Data configuration:

- **MongoConfig**: Main configuration class with conditional activation
- **Blocking Mode**: Traditional Spring Data MongoDB repositories
- **Reactive Mode**: WebFlux-compatible reactive repositories
- **Custom Converters**: Special handling for complex data types
- **Auditing**: Automatic timestamp management

[📖 View Configuration Documentation](./data_layer_mongo_configuration.md)

### 2. Document Models (`data_layer_mongo_documents`)

Defines core business entity schemas:

| Document | Collection | Purpose |
|----------|------------|---------|
| **User** | `users` | User accounts with roles and authentication |
| **Organization** | `organizations` | Multi-tenant organization entities |
| **Machine** | `machines` | Physical/virtual machine inventory |
| **Device** | `devices` | Logical devices with health monitoring |
| **IntegratedTool** | `integrated_tools` | Third-party tool integrations |
| **CoreEvent** | `events` | Event sourcing and audit trails |

[📖 View Document Models Documentation](./data_layer_mongo_documents.md)

### 3. Repository Layer (`data_layer_mongo_repositories`)

Provides data access abstractions:

- **BaseUserRepository**: User-specific queries (by email, status)
- **BaseTenantRepository**: Tenant/organization queries (by domain)
- **Technology-Agnostic Design**: Support for both `Optional<T>` and `Mono<T>` return types
- **Custom Query Methods**: Extensible for service-specific needs

[📖 View Repository Documentation](./data_layer_mongo_repositories.md)

## 🚀 Quick Start

### Prerequisites

- Java 17+
- Spring Boot 3.x
- MongoDB 5.0+

### Add Dependency

Add the data_layer_mongo module to your service:

```xml
<dependency>
    <groupId>com.openframe</groupId>
    <artifactId>openframe-data-mongo</artifactId>
    <version>${openframe.version}</version>
</dependency>
```

### Configure MongoDB

Enable MongoDB in your `application.yml`:

```yaml
spring:
  data:
    mongodb:
      enabled: true
      uri: mongodb://localhost:27017/openframe
      database: openframe
```

### Use Repositories

Inject and use repositories in your service:

```java
@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    public Optional<User> findUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }
    
    public User createUser(User user) {
        return userRepository.save(user);
    }
}
```

## 📄 Document Models

### User Document

Represents user accounts with authentication and role information:

```java
@Document(collection = "users")
public class User {
    @Id
    private String id;
    
    @Indexed
    private String email;
    
    private String firstName;
    private String lastName;
    
    private List<UserRole> roles;
    private boolean emailVerified;
    
    @Indexed
    private UserStatus status; // ACTIVE, INACTIVE, SUSPENDED
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
```

**Key Features**:
- Email normalization (lowercase, trimmed)
- Role-based access control
- Email verification tracking
- Status management

### Organization Document

Multi-tenant organization entities with business metadata:

```java
@Document(collection = "organizations")
public class Organization {
    @Id
    private String id;
    
    @Indexed(unique = true)
    private String organizationId; // UUID, immutable
    
    @Indexed
    private String name;
    
    @Indexed
    private Boolean isDefault;
    
    private ContactInformation contactInformation;
    private BigDecimal monthlyRevenue;
    private LocalDate contractStartDate;
    private LocalDate contractEndDate;
    
    @Indexed
    private Boolean deleted; // Soft delete
    private Instant deletedAt;
}
```

**Key Features**:
- Unique organization identifier
- Default organization support
- Contract lifecycle management
- Soft delete pattern

### Machine Document

Physical/virtual machine inventory with security tracking:

```java
@Document(collection = "machines")
public class Machine {
    @Id
    private String id;
    
    @NotBlank
    private String machineId; // Primary identifier
    
    @Indexed
    private String organizationId; // Tenant isolation
    
    private String hostname;
    private String serialNumber;
    
    @Indexed
    private DeviceType type; // DESKTOP, LAPTOP, SERVER
    
    @Indexed
    private DeviceStatus status; // ONLINE, OFFLINE, MAINTENANCE
    
    private SecurityState securityState;
    private ComplianceState complianceState;
    
    @CreatedDate
    private Instant registeredAt;
    
    @LastModifiedDate
    private Instant updatedAt;
}
```

**Key Features**:
- Multi-tenant data isolation
- Security and compliance tracking
- Device type categorization
- Registration and update timestamps

### Device Document

Logical devices linked to machines:

```java
@Document(collection = "devices")
public class Device {
    @Id
    private String id;
    
    private String machineId; // Link to Machine
    private String serialNumber;
    private String model;
    private String osVersion;
    
    private String status; // ACTIVE, OFFLINE, MAINTENANCE
    private DeviceType type;
    
    private Instant lastCheckin;
    private DeviceConfiguration configuration;
    private DeviceHealth health;
}
```

**Key Features**:
- Machine relationship
- Health monitoring
- Configuration management
- Last checkin tracking

### IntegratedTool Document

Third-party tool integrations:

```java
@Document(collection = "integrated_tools")
public class IntegratedTool {
    @Id
    private String id;
    
    private String name;
    private String type;
    private String category;
    
    private List<ToolUrl> toolUrls;
    private ToolCredentials credentials;
    
    private boolean enabled;
    
    // Layer information
    private String layer;
    private Integer layerOrder;
    
    // Monitoring
    private String healthCheckEndpoint;
    private Integer healthCheckInterval;
    
    // CDC configuration
    private Object[] debeziumConnectors;
}
```

**Key Features**:
- Multi-URL support
- Encrypted credentials
- Health check configuration
- CDC connector management

### CoreEvent Document

Event sourcing and audit trails:

```java
@Document(collection = "events")
public class CoreEvent {
    @Id
    private String id;
    
    private String type;
    private String payload;
    private Instant timestamp;
    private String userId;
    
    private EventStatus status; // CREATED, PROCESSING, COMPLETED, FAILED
}
```

**Key Features**:
- Event type categorization
- JSON payload storage
- User attribution
- Status tracking

## 🗄️ Repository Layer

### Base Repository Interfaces

Technology-agnostic interfaces supporting both blocking and reactive patterns:

#### BaseUserRepository

```java
public interface BaseUserRepository<T, B, ID> {
    T findByEmail(String email);
    B existsByEmail(String email);
    B existsByEmailAndStatus(String email, UserStatus status);
}
```

**Implementations**:
- **Blocking**: `T = Optional<User>`, `B = boolean`
- **Reactive**: `T = Mono<User>`, `B = Mono<Boolean>`

#### BaseTenantRepository

```java
public interface BaseTenantRepository<T, B, ID> {
    T findByDomain(String domain);
    B existsByDomain(String domain);
}
```

### Concrete Implementations

#### Blocking Repository (Servlet)

```java
@Repository
public interface UserRepository 
    extends MongoRepository<User, String>, 
            BaseUserRepository<Optional<User>, Boolean, String> {
    
    // Spring Data MongoDB provides implementations
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);
    boolean existsByEmailAndStatus(String email, UserStatus status);
    
    // Custom queries
    List<User> findByStatus(UserStatus status);
    Page<User> findByRolesContaining(UserRole role, Pageable pageable);
}
```

#### Reactive Repository (WebFlux)

```java
@Repository
public interface ReactiveUserRepository 
    extends ReactiveMongoRepository<User, String>,
            BaseUserRepository<Mono<User>, Mono<Boolean>, String> {
    
    // Reactive implementations
    Mono<User> findByEmail(String email);
    Mono<Boolean> existsByEmail(String email);
    Mono<Boolean> existsByEmailAndStatus(String email, UserStatus status);
    
    // Custom reactive queries
    Flux<User> findByStatus(UserStatus status);
}
```

## ⚙️ Configuration

### Application Properties

Complete MongoDB configuration example:

```yaml
spring:
  data:
    mongodb:
      # Enable MongoDB repositories
      enabled: true
      
      # Connection URI
      uri: mongodb://username:password@localhost:27017/openframe?authSource=admin
      
      # Database name
      database: openframe
      
      # Connection pool settings
      # uri: mongodb://localhost:27017/openframe?maxPoolSize=50&minPoolSize=10
      
      # Write concern (for production)
      # uri: mongodb://localhost:27017/openframe?w=majority&journal=true
      
      # SSL/TLS (for production)
      # uri: mongodb://localhost:27017/openframe?ssl=true&sslInvalidHostNameAllowed=false

# Conditional activation
spring:
  data:
    mongodb:
      enabled: ${MONGODB_ENABLED:true}
```

### Environment Variables

Use environment variables for sensitive configuration:

```bash
export MONGODB_URI="mongodb://user:pass@mongo-host:27017/openframe"
export MONGODB_DATABASE="openframe"
export MONGODB_ENABLED="true"
```

### Docker Compose

MongoDB setup for local development:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:5.0
    container_name: openframe-mongodb
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
      MONGO_INITDB_DATABASE: openframe
    volumes:
      - mongodb_data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    networks:
      - openframe-network

volumes:
  mongodb_data:

networks:
  openframe-network:
    driver: bridge
```

## 💡 Usage Examples

### Creating a User

```java
@Service
public class UserService {
    
    @Autowired
    private UserRepository userRepository;
    
    public User createUser(String email, String firstName, String lastName) {
        User user = User.builder()
            .email(email)
            .firstName(firstName)
            .lastName(lastName)
            .roles(List.of(UserRole.USER))
            .status(UserStatus.ACTIVE)
            .emailVerified(false)
            .build();
        
        return userRepository.save(user);
    }
}
```

### Querying Organizations

```java
@Service
public class OrganizationService {
    
    @Autowired
    private OrganizationRepository organizationRepository;
    
    public Optional<Organization> findDefaultOrganization() {
        return organizationRepository.findByIsDefault(true);
    }
    
    public List<Organization> findActiveOrganizations() {
        return organizationRepository.findByDeleted(false);
    }
    
    public boolean isContractActive(String organizationId) {
        return organizationRepository.findByOrganizationId(organizationId)
            .map(Organization::isContractActive)
            .orElse(false);
    }
}
```

### Registering a Machine

```java
@Service
public class MachineService {
    
    @Autowired
    private MachineRepository machineRepository;
    
    public Machine registerMachine(String machineId, String organizationId, 
                                   String hostname, DeviceType type) {
        Machine machine = Machine.builder()
            .machineId(machineId)
            .organizationId(organizationId)
            .hostname(hostname)
            .type(type)
            .status(DeviceStatus.ONLINE)
            .build();
        
        return machineRepository.save(machine);
    }
    
    public void updateLastSeen(String machineId) {
        machineRepository.findByMachineId(machineId)
            .ifPresent(machine -> {
                machine.setLastSeen(Instant.now());
                machineRepository.save(machine);
            });
    }
}
```

### Reactive Example

```java
@Service
public class ReactiveUserService {
    
    @Autowired
    private ReactiveUserRepository reactiveUserRepository;
    
    public Mono<User> findUserByEmail(String email) {
        return reactiveUserRepository.findByEmail(email);
    }
    
    public Mono<Boolean> isEmailTaken(String email) {
        return reactiveUserRepository.existsByEmail(email);
    }
    
    public Flux<User> findActiveUsers() {
        return reactiveUserRepository.findByStatus(UserStatus.ACTIVE);
    }
}
```

## 🎯 Best Practices

### 1. Always Use Base Interfaces

Extend base repository interfaces for consistency:

```java
public interface UserRepository 
    extends MongoRepository<User, String>, 
            BaseUserRepository<Optional<User>, Boolean, String> {
    // Custom methods
}
```

### 2. Leverage Auditing

Use `@CreatedDate` and `@LastModifiedDate` instead of manual timestamps:

```java
@CreatedDate
private Instant createdAt;

@LastModifiedDate
private Instant updatedAt;
```

### 3. Implement Soft Deletes

For recoverable entities, use soft delete pattern:

```java
@Builder.Default
private Boolean deleted = false;
private Instant deletedAt;

public void softDelete() {
    this.deleted = true;
    this.deletedAt = Instant.now();
}
```

### 4. Index Tenant Fields

Always index `organizationId` for multi-tenant queries:

```java
@Indexed
private String organizationId;
```

### 5. Normalize Email Addresses

Ensure consistency in email handling:

```java
public void setEmail(String email) {
    this.email = email == null ? null : email.trim().toLowerCase(Locale.ROOT);
}
```

### 6. Use Projections for Large Documents

Fetch only required fields:

```java
public interface UserProjection {
    String getId();
    String getEmail();
    String getFirstName();
}

List<UserProjection> findByStatus(UserStatus status);
```

### 7. Implement Pagination

For large result sets:

```java
Page<User> findByStatus(UserStatus status, Pageable pageable);

// Usage
Pageable pageable = PageRequest.of(0, 20, Sort.by("createdAt").descending());
Page<User> users = userRepository.findByStatus(UserStatus.ACTIVE, pageable);
```

## 🔗 Integration

### Service Integration Matrix

| Service | Usage | Document Types | Repository Mode |
|---------|-------|----------------|-----------------|
| **API Service** | REST + GraphQL APIs | User, Organization, Device, Machine, Tool | Blocking |
| **Authorization Service** | OAuth2 authentication | User, Organization (Tenant) | Blocking |
| **Management Service** | Tool and CDC management | IntegratedTool, Organization | Blocking |
| **Client Service** | Device registration | Machine, Device | Blocking |
| **Gateway Service** | Request routing | User (for auth) | Reactive |
| **External API** | Public API | All document types | Blocking |

### Cross-Module Dependencies

```mermaid
flowchart LR
    subgraph data_layers["Data Layers"]
        Mongo["data_layer_mongo<br/>(Primary Storage)"]
        Kafka["data_layer_kafka<br/>(Event Streaming)"]
        Core["data_layer_core<br/>(Cassandra + Pinot)"]
    end

    subgraph services["Services"]
        API["API Service"]
        Auth["Authorization Service"]
        Stream["Stream Processing"]
    end

    API -->|"CRUD"| Mongo
    Auth -->|"User/Tenant"| Mongo
    
    Mongo -->|"CDC events"| Kafka
    Kafka -->|"consume"| Stream
    Stream -->|"analytics"| Core
```

## ⚡ Performance

### Query Optimization

1. **Use Indexed Fields**: Always query on indexed fields
2. **Projection**: Fetch only required fields
3. **Pagination**: Implement for large result sets
4. **Caching**: Cache frequently accessed entities

### Index Strategy

```javascript
// User collection indexes
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "status": 1 });

// Organization collection indexes
db.organizations.createIndex({ "organizationId": 1 }, { unique: true });
db.organizations.createIndex({ "isDefault": 1 });
db.organizations.createIndex({ "deleted": 1 });

// Machine collection indexes
db.machines.createIndex({ "machineId": 1 });
db.machines.createIndex({ "organizationId": 1 });
db.machines.createIndex({ "status": 1 });
db.machines.createIndex({ "type": 1 });
```

### Connection Pooling

Optimize connection pool settings:

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/openframe?maxPoolSize=50&minPoolSize=10&maxIdleTimeMS=60000
```

### Write Concerns

For critical data:

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/openframe?w=majority&journal=true
```

## 🔒 Security

### Data Encryption

1. **At Rest**: Enable MongoDB encryption at rest
2. **In Transit**: Use TLS/SSL for connections
3. **Credentials**: Store in secure vaults (HashiCorp Vault, AWS Secrets Manager)

### Access Control

```javascript
// Create service-specific user
use openframe;
db.createUser({
  user: "openframe_api",
  pwd: "secure_password",
  roles: [
    { role: "readWrite", db: "openframe" }
  ]
});
```

### Sensitive Data

- **Passwords**: Never store in User document (use separate auth system)
- **Tool Credentials**: Encrypt before storage
- **API Keys**: Encrypt and rotate regularly

## 🐛 Troubleshooting

### Common Issues

#### Issue: ConversionException for nested maps with dots

**Solution**: The module automatically handles dot replacement:
```java
converter.setMapKeyDotReplacement("__dot__");
```

#### Issue: Auditing timestamps not being set

**Solution**: Ensure `@EnableMongoAuditing` is active:
```java
@EnableMongoAuditing
public static class MongoConfiguration {
    // ...
}
```

#### Issue: Reactive repositories not working

**Solution**: Verify WebFlux is enabled:
```yaml
spring:
  webflux:
    enabled: true
```

#### Issue: Duplicate key error on email

**Solution**: Email normalization may not be applied. Ensure setter is called:
```java
user.setEmail(email); // Triggers normalization
```

### Debug Logging

Enable MongoDB query logging:

```yaml
logging:
  level:
    org.springframework.data.mongodb.core: DEBUG
    org.mongodb.driver: DEBUG
```

## 🤝 Contributing

We welcome contributions to the OpenFrame platform! Join our community:

- **Slack**: [OpenMSP Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Website**: [https://openframe.ai](https://openframe.ai)
- **Flamingo**: [https://flamingo.run](https://flamingo.run)

## 📚 Related Documentation

- [Data Layer MongoDB - Full Documentation](./data_layer_mongo.md)
- [Configuration Module](./data_layer_mongo_configuration.md)
- [Document Models](./data_layer_mongo_documents.md)
- [Repository Layer](./data_layer_mongo_repositories.md)
- [Data Layer Core (Cassandra + Pinot)](./data_layer_core.md)
- [Data Layer Kafka](./data_layer_kafka.md)
- [API Service](./api_service.md)
- [Authorization Service](./authorization_service.md)

## 📄 License

Part of the OpenFrame open-source platform. See LICENSE file for details.

---

**Built with ❤️ by the Flamingo team**

For questions or support, reach out on [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA).
