# Management Service Configuration Module

## Overview

The **Management Service Configuration** module provides the foundational Spring Boot configuration layer for the OpenFrame Management Service. This module establishes the application context, component scanning rules, security configurations, and external integration settings required for managing integrated tools, CDC (Change Data Capture) connectors, and agent deployments across the OpenFrame platform.

As the configuration backbone of the management service, this module orchestrates the initialization of critical infrastructure components including password encoding, agent configuration loading, MongoDB integration, and Debezium connector management.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Core Components](#core-components)
- [Configuration Architecture](#configuration-architecture)
- [Component Scanning Strategy](#component-scanning-strategy)
- [Agent Configuration Management](#agent-configuration-management)
- [Integration Points](#integration-points)
- [Configuration Properties](#configuration-properties)
- [Security Configuration](#security-configuration)
- [Startup Sequence](#startup-sequence)
- [Best Practices](#best-practices)
- [Related Modules](#related-modules)

---

## Architecture Overview

The Management Service Configuration module serves as the central configuration hub that:

1. **Bootstraps Application Context**: Initializes Spring Boot application with proper component scanning
2. **Configures Security**: Provides password encoding and authentication infrastructure
3. **Manages Agent Configurations**: Loads and initializes integrated tool agent configurations from classpath resources
4. **Excludes Conditional Components**: Filters out Cassandra health indicators when not needed
5. **Enables Data Layer Integration**: Activates MongoDB repositories and auditing capabilities

```mermaid
flowchart TD
    ManagementApp["ManagementApplication<br/>@SpringBootApplication"] -->|"initializes"| ManagementConfig["ManagementConfiguration<br/>@Configuration"]
    ManagementConfig -->|"scans packages"| ComponentScan["Component Scanning<br/>com.openframe.*"]
    ManagementConfig -->|"provides"| PasswordEncoder["PasswordEncoder<br/>BCrypt"]
    
    ManagementConfig -->|"excludes"| CassandraHealth["CassandraHealthIndicator<br/>(excluded)"]
    
    AgentConfigProps["AgentConfigurationProperties<br/>@ConfigurationProperties"] -->|"loads from"| YamlConfig["application.yml<br/>openframe.management"]
    AgentConfigProps -->|"provides paths to"| AgentInitializer["IntegratedToolAgentInitializer<br/>@PostConstruct"]
    
    ComponentScan -->|"discovers"| DataLayer["Data Layer<br/>MongoDB Config"]
    ComponentScan -->|"discovers"| Services["Management Services<br/>DebeziumService, etc."]
    ComponentScan -->|"discovers"| Controllers["REST Controllers<br/>IntegratedToolController"]
    
    AgentInitializer -->|"reads JSON from"| ClasspathResources["Classpath Resources<br/>agent-configs/*.json"]
    AgentInitializer -->|"persists to"| MongoDB["MongoDB<br/>integrated_tool_agents"]
    
    style ManagementConfig fill:#4A90E2,stroke:#2E5C8A,stroke-width:3px,color:#fff
    style AgentConfigProps fill:#50C878,stroke:#2E7D4E,stroke-width:2px,color:#fff
    style PasswordEncoder fill:#F39C12,stroke:#C87F0A,stroke-width:2px,color:#fff
    style AgentInitializer fill:#9B59B6,stroke:#6C3483,stroke-width:2px,color:#fff
```

---

## Core Components

### 1. ManagementConfiguration

**Location**: `com.openframe.management.config.ManagementConfiguration`

**Purpose**: Primary Spring configuration class that establishes the application context for the Management Service.

**Key Responsibilities**:
- Component scanning across OpenFrame packages
- Password encoder bean provisioning
- Conditional component exclusion (Cassandra health checks)
- Integration with data layer configurations

**Configuration Details**:

```java
@Configuration
@ComponentScan(
    basePackages = "com.openframe",
    excludeFilters = {
        @ComponentScan.Filter(
            type = FilterType.ASSIGNABLE_TYPE,
            classes = CassandraHealthIndicator.class
        )
    }
)
public class ManagementConfiguration {
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

**Bean Definitions**:

| Bean | Type | Scope | Purpose |
|------|------|-------|---------|
| `passwordEncoder` | `BCryptPasswordEncoder` | Singleton | Secure password hashing for user credentials and API keys |

**Component Scanning Rules**:

```mermaid
flowchart LR
    BasePackage["com.openframe"] -->|"includes"| Management["com.openframe.management.*"]
    BasePackage -->|"includes"| Data["com.openframe.data.*"]
    BasePackage -->|"includes"| Core["com.openframe.core.*"]
    BasePackage -->|"includes"| Security["com.openframe.security.*"]
    
    BasePackage -->|"excludes"| CassandraHealth["CassandraHealthIndicator"]
    
    style BasePackage fill:#4A90E2,stroke:#2E5C8A,stroke-width:3px,color:#fff
    style CassandraHealth fill:#E74C3C,stroke:#C0392B,stroke-width:2px,color:#fff
```

---

### 2. AgentConfigurationProperties

**Location**: `com.openframe.management.config.AgentConfigurationProperties`

**Purpose**: Externalized configuration properties for loading integrated tool agent definitions from classpath resources.

**Configuration Binding**:

```yaml
openframe:
  management:
    agentConfigurations:
      - "agents/fleetmdm-agent.json"
      - "agents/tactical-rmm-agent.json"
      - "agents/meshcentral-agent.json"
```

**Properties Structure**:

```java
@Data
@Component
@ConfigurationProperties(prefix = "openframe.management")
public class AgentConfigurationProperties {
    private List<String> agentConfigurations = new ArrayList<>();
}
```

**Property Details**:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `openframe.management.agentConfigurations` | `List<String>` | `[]` | Classpath resource paths to agent JSON configuration files |

**Usage Pattern**:

```mermaid
flowchart TD
    YamlFile["application.yml"] -->|"binds to"| ConfigProps["AgentConfigurationProperties"]
    ConfigProps -->|"provides paths"| Initializer["IntegratedToolAgentInitializer"]
    Initializer -->|"reads files"| ClasspathResource["ClassPathResource"]
    ClasspathResource -->|"deserializes"| ObjectMapper["ObjectMapper"]
    ObjectMapper -->|"creates"| AgentEntity["IntegratedToolAgent"]
    AgentEntity -->|"persists to"| MongoDB["MongoDB Collection"]
    
    style ConfigProps fill:#50C878,stroke:#2E7D4E,stroke-width:2px,color:#fff
    style Initializer fill:#9B59B6,stroke:#6C3483,stroke-width:2px,color:#fff
```

---

## Configuration Architecture

### Layered Configuration Model

The Management Service Configuration follows a layered architecture pattern:

```mermaid
flowchart TD
    subgraph ApplicationLayer["Application Layer"]
        ManagementApp["ManagementApplication<br/>Entry Point"]
    end
    
    subgraph ConfigurationLayer["Configuration Layer"]
        ManagementConfig["ManagementConfiguration<br/>Core Config"]
        AgentConfigProps["AgentConfigurationProperties<br/>External Config"]
    end
    
    subgraph IntegrationLayer["Integration Layer"]
        MongoConfig["MongoConfig<br/>Data Layer"]
        SecurityConfig["JwtSecurityConfig<br/>Security Layer"]
        KafkaConfig["KafkaConfig<br/>Messaging Layer"]
    end
    
    subgraph ServiceLayer["Service Layer"]
        DebeziumService["DebeziumService<br/>CDC Management"]
        AgentService["IntegratedToolAgentService<br/>Agent Management"]
        ToolService["IntegratedToolService<br/>Tool Management"]
    end
    
    ManagementApp -->|"loads"| ManagementConfig
    ManagementApp -->|"loads"| AgentConfigProps
    
    ManagementConfig -->|"enables"| MongoConfig
    ManagementConfig -->|"enables"| SecurityConfig
    ManagementConfig -->|"enables"| KafkaConfig
    
    MongoConfig -->|"provides repositories"| ServiceLayer
    SecurityConfig -->|"provides security"| ServiceLayer
    KafkaConfig -->|"provides messaging"| ServiceLayer
    
    style ConfigurationLayer fill:#4A90E2,stroke:#2E5C8A,stroke-width:3px,color:#fff
    style IntegrationLayer fill:#50C878,stroke:#2E7D4E,stroke-width:2px,color:#fff
    style ServiceLayer fill:#F39C12,stroke:#C87F0A,stroke-width:2px,color:#fff
```

### Configuration Precedence

Configuration values are resolved in the following order (highest to lowest priority):

1. **Environment Variables**: `OPENFRAME_MANAGEMENT_AGENTCONFIGURATIONS`
2. **System Properties**: `-Dopenframe.management.agentConfigurations=...`
3. **Application YAML**: `application.yml` / `application-{profile}.yml`
4. **Default Values**: Hardcoded in `@ConfigurationProperties` classes

---

## Component Scanning Strategy

### Included Packages

The `@ComponentScan` annotation in `ManagementConfiguration` includes:

```text
com.openframe
├── com.openframe.management.*     (Management service components)
├── com.openframe.data.*           (Data layer repositories and entities)
├── com.openframe.core.*           (Core utilities and shared components)
├── com.openframe.security.*       (Security configurations)
└── com.openframe.kafka.*          (Kafka messaging components)
```

### Excluded Components

**CassandraHealthIndicator Exclusion**:

The Management Service explicitly excludes `CassandraHealthIndicator` because:

1. **Database Choice**: Management service uses MongoDB, not Cassandra
2. **Health Check Conflicts**: Prevents unnecessary health check failures
3. **Startup Performance**: Avoids attempting connections to non-existent Cassandra clusters

```java
@ComponentScan(
    basePackages = "com.openframe",
    excludeFilters = {
        @ComponentScan.Filter(
            type = FilterType.ASSIGNABLE_TYPE,
            classes = CassandraHealthIndicator.class
        )
    }
)
```

### Component Discovery Flow

```mermaid
flowchart TD
    SpringBoot["Spring Boot Startup"] -->|"scans"| BasePackage["com.openframe"]
    
    BasePackage -->|"discovers"| Controllers["@RestController<br/>IntegratedToolController"]
    BasePackage -->|"discovers"| Services["@Service<br/>DebeziumService"]
    BasePackage -->|"discovers"| Repositories["@Repository<br/>IntegratedToolRepository"]
    BasePackage -->|"discovers"| Configs["@Configuration<br/>MongoConfig"]
    BasePackage -->|"discovers"| Components["@Component<br/>AgentInitializer"]
    
    BasePackage -->|"filters out"| Excluded["CassandraHealthIndicator"]
    
    Controllers -->|"registered in"| ApplicationContext["Application Context"]
    Services -->|"registered in"| ApplicationContext
    Repositories -->|"registered in"| ApplicationContext
    Configs -->|"registered in"| ApplicationContext
    Components -->|"registered in"| ApplicationContext
    
    style BasePackage fill:#4A90E2,stroke:#2E5C8A,stroke-width:3px,color:#fff
    style Excluded fill:#E74C3C,stroke:#C0392B,stroke-width:2px,color:#fff
    style ApplicationContext fill:#50C878,stroke:#2E7D4E,stroke-width:2px,color:#fff
```

---

## Agent Configuration Management

### Agent Configuration Loading Process

The `AgentConfigurationProperties` works in conjunction with `IntegratedToolAgentInitializer` to load agent definitions at startup:

```mermaid
sequenceDiagram
    participant SpringBoot
    participant AgentConfigProps
    participant AgentInitializer
    participant ClassPathResource
    participant ObjectMapper
    participant AgentService
    participant MongoDB
    
    SpringBoot->>AgentConfigProps: Bind YAML properties
    AgentConfigProps->>AgentConfigProps: Load agentConfigurations list
    
    SpringBoot->>AgentInitializer: @PostConstruct trigger
    AgentInitializer->>AgentConfigProps: Get agentConfigurations
    
    loop For each configuration path
        AgentInitializer->>ClassPathResource: Load resource(path)
        ClassPathResource-->>AgentInitializer: InputStream
        
        AgentInitializer->>ObjectMapper: Deserialize JSON
        ObjectMapper-->>AgentInitializer: IntegratedToolAgent
        
        AgentInitializer->>AgentService: findById(agentId)
        
        alt Agent exists
            AgentService-->>AgentInitializer: Existing agent
            AgentInitializer->>AgentInitializer: Check version update
            AgentInitializer->>AgentService: save(updatedAgent)
            AgentService->>MongoDB: Update document
        else Agent not found
            AgentService-->>AgentInitializer: Empty
            AgentInitializer->>AgentService: save(newAgent)
            AgentService->>MongoDB: Insert document
        end
    end
    
    AgentInitializer-->>SpringBoot: Initialization complete
```

### Agent Configuration File Structure

Agent configuration files are JSON documents stored in classpath resources:

**Example**: `agents/fleetmdm-agent.json`

```json
{
  "id": "fleetmdm-device-sync",
  "name": "FleetDM Device Synchronization Agent",
  "version": "1.0.0",
  "releaseVersion": false,
  "toolType": "FLEETMDM",
  "agentType": "DEVICE_SYNC",
  "schedule": "0 */5 * * * *",
  "enabled": true,
  "configuration": {
    "batchSize": 100,
    "syncInterval": 300
  }
}
```

### Version Management Strategy

The agent initializer implements intelligent version management:

```mermaid
flowchart TD
    LoadAgent["Load Agent from JSON"] --> CheckExists{"Agent exists<br/>in database?"}
    
    CheckExists -->|"No"| CreateNew["Create new agent<br/>with version from JSON"]
    CreateNew --> SaveNew["Save to MongoDB"]
    
    CheckExists -->|"Yes"| CheckRelease{"Is release<br/>version?"}
    
    CheckRelease -->|"Yes"| PreserveVersion["Preserve existing version<br/>(prevent override)"]
    PreserveVersion --> UpdateAgent["Update agent metadata"]
    UpdateAgent --> SaveExisting["Save to MongoDB"]
    
    CheckRelease -->|"No"| CompareVersion{"Version<br/>changed?"}
    
    CompareVersion -->|"No"| UpdateAgent
    
    CompareVersion -->|"Yes"| PublishUpdate["Publish version update event"]
    PublishUpdate --> UpdateAgent
    
    style CheckRelease fill:#F39C12,stroke:#C87F0A,stroke-width:2px,color:#fff
    style PublishUpdate fill:#9B59B6,stroke:#6C3483,stroke-width:2px,color:#fff
    style PreserveVersion fill:#E74C3C,stroke:#C0392B,stroke-width:2px,color:#fff
```

**Version Management Rules**:

1. **New Agents**: Use version from JSON configuration file
2. **Release Versions** (`releaseVersion: true`): Preserve existing version, never override
3. **Development Versions** (`releaseVersion: false`): Update version and publish update event
4. **Version Change Detection**: Triggers agent update notifications to connected clients

---

## Integration Points

### Data Layer Integration

The Management Service Configuration integrates with the MongoDB data layer:

```mermaid
flowchart LR
    ManagementConfig["ManagementConfiguration"] -->|"enables"| MongoConfig["MongoConfig<br/>@EnableMongoRepositories"]
    
    MongoConfig -->|"scans"| RepoPackage["com.openframe.data.repository"]
    
    RepoPackage -->|"discovers"| IntegratedToolRepo["IntegratedToolRepository"]
    RepoPackage -->|"discovers"| AgentRepo["IntegratedToolAgentRepository"]
    RepoPackage -->|"discovers"| TenantRepo["TenantRepository"]
    
    IntegratedToolRepo -->|"provides CRUD"| ToolService["IntegratedToolService"]
    AgentRepo -->|"provides CRUD"| AgentService["IntegratedToolAgentService"]
    TenantRepo -->|"provides CRUD"| TenantService["TenantService"]
    
    style MongoConfig fill:#50C878,stroke:#2E7D4E,stroke-width:2px,color:#fff
    style ManagementConfig fill:#4A90E2,stroke:#2E5C8A,stroke-width:3px,color:#fff
```

**MongoDB Configuration Details**:

- **Repository Base Package**: `com.openframe.data.repository`
- **Auditing**: Enabled via `@EnableMongoAuditing`
- **Custom Conversions**: Dot replacement in map keys (`__dot__`)
- **Conditional Activation**: `spring.data.mongodb.enabled=true`

See [data_layer_mongo.md](data_layer_mongo.md) for detailed MongoDB configuration.

### Security Integration

Password encoding is provided for:

1. **User Authentication**: Hashing user passwords during registration
2. **API Key Management**: Securing API keys for integrated tools
3. **Service Credentials**: Protecting service-to-service authentication tokens

```mermaid
flowchart TD
    PasswordEncoder["PasswordEncoder Bean<br/>BCryptPasswordEncoder"] -->|"used by"| UserService["UserService<br/>Password hashing"]
    PasswordEncoder -->|"used by"| AuthController["AuthController<br/>Login validation"]
    PasswordEncoder -->|"used by"| ToolController["IntegratedToolController<br/>API key encryption"]
    
    UserService -->|"stores hashed"| MongoDB["MongoDB<br/>users collection"]
    ToolController -->|"stores encrypted"| MongoDBTools["MongoDB<br/>integrated_tools collection"]
    
    style PasswordEncoder fill:#F39C12,stroke:#C87F0A,stroke-width:2px,color:#fff
```

**BCrypt Configuration**:

- **Algorithm**: BCrypt with default strength (10 rounds)
- **Salt**: Automatically generated per password
- **Thread-Safe**: Singleton bean safe for concurrent use

---

## Configuration Properties

### Application Properties Structure

**File**: `application.yml` (Management Service)

```yaml
openframe:
  management:
    # Agent configuration file paths (classpath resources)
    agentConfigurations:
      - "agents/fleetmdm-device-sync.json"
      - "agents/tactical-rmm-device-sync.json"
      - "agents/meshcentral-session-monitor.json"
  
  debezium:
    # Debezium Connect REST API base URL
    base-url: "http://debezium-connect:8083/connectors"

spring:
  data:
    mongodb:
      enabled: true
      uri: "mongodb://mongodb:27017/openframe"
      database: openframe
  
  application:
    name: openframe-management-service
  
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:dev}

server:
  port: 8085
```

### Environment-Specific Overrides

**Development** (`application-dev.yml`):

```yaml
openframe:
  management:
    agentConfigurations:
      - "agents/dev/fleetmdm-agent-dev.json"
  
  debezium:
    base-url: "http://localhost:8083/connectors"

logging:
  level:
    com.openframe.management: DEBUG
```

**Production** (`application-prod.yml`):

```yaml
openframe:
  management:
    agentConfigurations:
      - "agents/prod/fleetmdm-agent.json"
      - "agents/prod/tactical-rmm-agent.json"
  
  debezium:
    base-url: "${DEBEZIUM_CONNECT_URL}/connectors"

logging:
  level:
    com.openframe.management: INFO
```

### Property Validation

The configuration properties are validated at startup:

```mermaid
flowchart TD
    SpringBoot["Spring Boot Startup"] -->|"binds"| ConfigProps["AgentConfigurationProperties"]
    
    ConfigProps -->|"validates"| NotNull["@NotNull checks"]
    ConfigProps -->|"validates"| NotEmpty["@NotEmpty checks"]
    
    NotNull -->|"passes"| InitContext["Initialize Context"]
    NotEmpty -->|"passes"| InitContext
    
    NotNull -->|"fails"| FailStartup["Startup Failure<br/>BindException"]
    NotEmpty -->|"fails"| FailStartup
    
    style FailStartup fill:#E74C3C,stroke:#C0392B,stroke-width:2px,color:#fff
    style InitContext fill:#50C878,stroke:#2E7D4E,stroke-width:2px,color:#fff
```

---

## Security Configuration

### Password Encoding Strategy

The `BCryptPasswordEncoder` bean provides secure password hashing:

**Encoding Process**:

```mermaid
flowchart LR
    PlainPassword["Plain Text Password"] -->|"input"| BCrypt["BCryptPasswordEncoder"]
    BCrypt -->|"generates"| Salt["Random Salt"]
    BCrypt -->|"applies"| HashFunction["BCrypt Hash Function<br/>10 rounds"]
    HashFunction -->|"produces"| HashedPassword["Hashed Password<br/>$2a$10$..."]
    
    HashedPassword -->|"stored in"| Database["MongoDB"]
    
    style BCrypt fill:#F39C12,stroke:#C87F0A,stroke-width:2px,color:#fff
    style HashedPassword fill:#50C878,stroke:#2E7D4E,stroke-width:2px,color:#fff
```

**Verification Process**:

```mermaid
flowchart LR
    LoginAttempt["Login Attempt<br/>Plain Password"] -->|"input"| BCrypt["BCryptPasswordEncoder"]
    Database["MongoDB"] -->|"retrieves"| StoredHash["Stored Hash"]
    
    BCrypt -->|"matches()"| Comparison["Hash Comparison"]
    StoredHash -->|"input"| Comparison
    
    Comparison -->|"match"| Success["Authentication Success"]
    Comparison -->|"no match"| Failure["Authentication Failure"]
    
    style Success fill:#50C878,stroke:#2E7D4E,stroke-width:2px,color:#fff
    style Failure fill:#E74C3C,stroke:#C0392B,stroke-width:2px,color:#fff
```

### Security Best Practices

1. **Never Log Passwords**: Plain text passwords are never logged or stored
2. **Salt Per Password**: Each password gets a unique salt
3. **Constant-Time Comparison**: BCrypt uses constant-time comparison to prevent timing attacks
4. **Configurable Strength**: Default 10 rounds, can be increased for higher security

---

## Startup Sequence

### Application Initialization Flow

```mermaid
sequenceDiagram
    participant JVM
    participant SpringBoot
    participant ManagementApp
    participant ManagementConfig
    participant AgentConfigProps
    participant MongoConfig
    participant AgentInitializer
    participant MongoDB
    
    JVM->>SpringBoot: java -jar management-service.jar
    SpringBoot->>ManagementApp: main()
    ManagementApp->>SpringBoot: SpringApplication.run()
    
    SpringBoot->>SpringBoot: Load application.yml
    SpringBoot->>AgentConfigProps: Bind properties
    
    SpringBoot->>ManagementConfig: Initialize @Configuration
    ManagementConfig->>ManagementConfig: Create PasswordEncoder bean
    
    SpringBoot->>ManagementConfig: Component scanning
    ManagementConfig->>SpringBoot: Discover components
    
    SpringBoot->>MongoConfig: Initialize MongoDB
    MongoConfig->>MongoDB: Establish connection
    MongoDB-->>MongoConfig: Connection established
    
    SpringBoot->>AgentInitializer: @PostConstruct trigger
    AgentInitializer->>AgentConfigProps: Get agentConfigurations
    
    loop For each agent config
        AgentInitializer->>AgentInitializer: Load JSON from classpath
        AgentInitializer->>MongoDB: Save/Update agent
    end
    
    AgentInitializer-->>SpringBoot: Initialization complete
    SpringBoot-->>ManagementApp: Application ready
    ManagementApp-->>JVM: Service running on port 8085
```

### Startup Phases

| Phase | Duration | Activities | Failure Impact |
|-------|----------|------------|----------------|
| **1. Property Binding** | < 1s | Load YAML, bind to `@ConfigurationProperties` | Fatal - startup fails |
| **2. Configuration Loading** | < 1s | Initialize `@Configuration` classes, create beans | Fatal - startup fails |
| **3. Component Scanning** | 1-3s | Discover and register `@Component`, `@Service`, `@Repository` | Fatal - missing components |
| **4. Database Connection** | 1-5s | Connect to MongoDB, verify connectivity | Fatal - cannot proceed without DB |
| **5. Agent Initialization** | 2-10s | Load agent configs, persist to database | Non-fatal - logs warnings, continues |
| **6. Service Ready** | < 1s | Start embedded Tomcat, expose REST endpoints | Fatal - cannot serve requests |

### Startup Health Checks

```mermaid
flowchart TD
    StartupComplete["Startup Complete"] --> HealthCheck["Health Check Endpoint<br/>/actuator/health"]
    
    HealthCheck --> MongoHealth{"MongoDB<br/>Healthy?"}
    HealthCheck --> DiskHealth{"Disk Space<br/>Healthy?"}
    HealthCheck --> DebeziumHealth{"Debezium<br/>Reachable?"}
    
    MongoHealth -->|"Yes"| AllHealthy["Overall Status: UP"]
    DiskHealth -->|"Yes"| AllHealthy
    DebeziumHealth -->|"Yes"| AllHealthy
    
    MongoHealth -->|"No"| Degraded["Overall Status: DOWN"]
    DiskHealth -->|"No"| Degraded
    DebeziumHealth -->|"No"| Warning["Overall Status: UP<br/>(Debezium optional)"]
    
    style AllHealthy fill:#50C878,stroke:#2E7D4E,stroke-width:2px,color:#fff
    style Degraded fill:#E74C3C,stroke:#C0392B,stroke-width:2px,color:#fff
    style Warning fill:#F39C12,stroke:#C87F0A,stroke-width:2px,color:#fff
```

---

## Best Practices

### Configuration Management

1. **Externalize Sensitive Data**:
   ```yaml
   openframe:
     debezium:
       base-url: "${DEBEZIUM_CONNECT_URL}"
   ```

2. **Use Profile-Specific Configs**:
   - `application-dev.yml` for development
   - `application-prod.yml` for production
   - `application-test.yml` for testing

3. **Validate Configuration Properties**:
   ```java
   @NotNull
   @NotEmpty
   private List<String> agentConfigurations;
   ```

4. **Document Configuration Options**:
   - Provide clear comments in YAML files
   - Include example values
   - Document required vs. optional properties

### Agent Configuration

1. **Version Control Agent Configs**:
   - Store agent JSON files in version control
   - Use semantic versioning
   - Tag releases with agent versions

2. **Separate Dev and Prod Configs**:
   ```text
   resources/
   ├── agents/
   │   ├── dev/
   │   │   └── fleetmdm-agent-dev.json
   │   └── prod/
   │       └── fleetmdm-agent.json
   ```

3. **Use Release Versions for Stability**:
   ```json
   {
     "version": "1.0.0",
     "releaseVersion": true
   }
   ```

4. **Monitor Agent Initialization**:
   - Check logs for agent loading errors
   - Verify agents are created in MongoDB
   - Test agent execution after deployment

### Security

1. **Never Hardcode Credentials**:
   ```yaml
   # ❌ BAD
   spring:
     data:
       mongodb:
         uri: "mongodb://admin:password123@mongodb:27017"
   
   # ✅ GOOD
   spring:
     data:
       mongodb:
         uri: "${MONGODB_URI}"
   ```

2. **Use Strong Password Encoding**:
   - BCrypt with at least 10 rounds
   - Consider increasing to 12 rounds for high-security environments

3. **Rotate Secrets Regularly**:
   - Database credentials
   - API keys
   - JWT signing keys

### Performance

1. **Optimize Component Scanning**:
   - Limit base packages to necessary paths
   - Exclude unused components
   - Use `@Lazy` for expensive beans

2. **Lazy-Load Agent Configurations**:
   - Consider lazy loading for large agent configs
   - Use caching for frequently accessed agents

3. **Monitor Startup Time**:
   - Track startup duration in logs
   - Identify slow initialization steps
   - Optimize database connection pooling

---

## Related Modules

### Parent Module
- **[management_service](management_service.md)**: Complete Management Service documentation

### Sibling Modules
- **[management_service_tool_management](management_service_tool_management.md)**: Integrated tool CRUD operations and lifecycle management
- **[management_service_agent_management](management_service_agent_management.md)**: Agent initialization, scheduling, and execution
- **[management_service_cdc_management](management_service_cdc_management.md)**: Debezium connector management and health monitoring
- **[management_service_application](management_service_application.md)**: Application entry point and runtime configuration

### Dependency Modules
- **[data_layer_mongo](data_layer_mongo.md)**: MongoDB configuration, repositories, and document models
- **[security_core](security_core.md)**: JWT security configuration and authentication infrastructure
- **[data_layer_kafka](data_layer_kafka.md)**: Kafka messaging configuration for agent update events

### Integration Modules
- **[stream_processing_configuration](stream_processing_configuration.md)**: Kafka Streams configuration for CDC event processing
- **[api_service_configuration](api_service_configuration.md)**: API service configuration patterns and best practices

---

## Configuration Examples

### Complete Application Configuration

**File**: `application.yml`

```yaml
# OpenFrame Management Service Configuration
openframe:
  management:
    # Agent configuration files (classpath resources)
    agentConfigurations:
      - "agents/fleetmdm-device-sync.json"
      - "agents/tactical-rmm-device-sync.json"
      - "agents/meshcentral-session-monitor.json"
      - "agents/authentik-user-sync.json"
  
  debezium:
    # Debezium Connect REST API
    base-url: "${DEBEZIUM_CONNECT_URL:http://debezium-connect:8083}/connectors"

# Spring Boot Configuration
spring:
  application:
    name: openframe-management-service
  
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:dev}
  
  # MongoDB Configuration
  data:
    mongodb:
      enabled: true
      uri: "${MONGODB_URI:mongodb://mongodb:27017/openframe}"
      database: openframe
      auto-index-creation: true
  
  # Jackson Configuration
  jackson:
    default-property-inclusion: non_null
    serialization:
      write-dates-as-timestamps: false

# Server Configuration
server:
  port: ${SERVER_PORT:8085}
  compression:
    enabled: true
  error:
    include-message: always
    include-binding-errors: always

# Actuator Configuration
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when-authorized
  health:
    mongo:
      enabled: true

# Logging Configuration
logging:
  level:
    root: INFO
    com.openframe.management: ${LOG_LEVEL:INFO}
    org.springframework.data.mongodb: WARN
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} - %msg%n"
```

### Docker Compose Environment Variables

```yaml
version: '3.8'

services:
  management-service:
    image: openframe/management-service:latest
    environment:
      # Spring Configuration
      SPRING_PROFILES_ACTIVE: prod
      SERVER_PORT: 8085
      
      # MongoDB Configuration
      MONGODB_URI: mongodb://mongodb:27017/openframe
      
      # Debezium Configuration
      DEBEZIUM_CONNECT_URL: http://debezium-connect:8083
      
      # Logging
      LOG_LEVEL: INFO
      
      # Agent Configurations
      OPENFRAME_MANAGEMENT_AGENTCONFIGURATIONS_0: agents/prod/fleetmdm-agent.json
      OPENFRAME_MANAGEMENT_AGENTCONFIGURATIONS_1: agents/prod/tactical-rmm-agent.json
    ports:
      - "8085:8085"
    depends_on:
      - mongodb
      - debezium-connect
```

### Kubernetes ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: management-service-config
  namespace: openframe
data:
  application.yml: |
    openframe:
      management:
        agentConfigurations:
          - "agents/fleetmdm-device-sync.json"
          - "agents/tactical-rmm-device-sync.json"
      debezium:
        base-url: "http://debezium-connect.openframe.svc.cluster.local:8083/connectors"
    
    spring:
      data:
        mongodb:
          enabled: true
          uri: "mongodb://mongodb.openframe.svc.cluster.local:27017/openframe"
    
    logging:
      level:
        com.openframe.management: INFO
```

---

## Troubleshooting

### Common Issues

#### 1. Agent Configuration Not Loading

**Symptom**: Agents not appearing in database after startup

**Possible Causes**:
- Incorrect classpath resource path
- JSON parsing errors
- Missing agent configuration files

**Solution**:
```bash
# Check logs for agent initialization errors
kubectl logs -n openframe deployment/management-service | grep "IntegratedToolAgentInitializer"

# Verify agent configuration files exist
kubectl exec -n openframe deployment/management-service -- ls -la /app/resources/agents/

# Validate JSON syntax
cat agents/fleetmdm-agent.json | jq .
```

#### 2. MongoDB Connection Failure

**Symptom**: Application fails to start with MongoDB connection errors

**Possible Causes**:
- MongoDB not running
- Incorrect connection URI
- Network connectivity issues

**Solution**:
```bash
# Test MongoDB connectivity
kubectl exec -n openframe deployment/management-service -- nc -zv mongodb 27017

# Check MongoDB logs
kubectl logs -n openframe deployment/mongodb

# Verify connection string
kubectl get configmap management-service-config -n openframe -o yaml | grep mongodb
```

#### 3. Debezium Service Unreachable

**Symptom**: Warnings about Debezium connector creation failures

**Possible Causes**:
- Debezium Connect not running
- Incorrect base URL
- Network policy blocking access

**Solution**:
```bash
# Test Debezium connectivity
kubectl exec -n openframe deployment/management-service -- curl -v http://debezium-connect:8083/

# Check Debezium Connect status
kubectl get pods -n openframe -l app=debezium-connect

# Verify configuration
kubectl get configmap management-service-config -n openframe -o yaml | grep debezium
```

---

## Summary

The **Management Service Configuration** module provides the foundational configuration layer for the OpenFrame Management Service, establishing:

- **Application Context**: Spring Boot configuration with component scanning
- **Security Infrastructure**: Password encoding for secure credential management
- **Agent Configuration**: Dynamic loading of integrated tool agent definitions
- **Data Layer Integration**: MongoDB repository activation and auditing
- **External Service Integration**: Debezium connector management configuration

This module serves as the entry point for all management service functionality, orchestrating the initialization of critical infrastructure components and ensuring proper integration with the OpenFrame platform's data, security, and messaging layers.

For operational details on tool management, agent execution, and CDC connector management, refer to the related sibling modules listed above.

---

**Last Updated**: 2024  
**Module Version**: 1.0.0  
**Maintained By**: OpenFrame Platform Team
