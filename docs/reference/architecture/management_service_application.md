# Management Service Application

## Overview

The **Management Service Application** is the Spring Boot entry point for OpenFrame's management service, responsible for orchestrating integrated tool lifecycle management, Change Data Capture (CDC) connector health monitoring, and agent initialization. This service acts as the administrative control plane for managing third-party tool integrations (RMM, MDM, PSA, etc.) and ensuring data synchronization pipelines remain operational.

**Key Responsibilities:**
- Bootstrap and configure the management service runtime
- Initialize integrated tool agent configurations from classpath resources
- Expose REST APIs for tool CRUD operations
- Monitor and auto-heal Debezium CDC connectors
- Coordinate with data layer (MongoDB) and stream processing infrastructure

**Related Modules:**
- [Management Service Configuration](management_service_configuration.md) - Configuration beans and properties
- [Management Service Tool Management](management_service_tool_management.md) - Tool lifecycle and hooks
- [Management Service Agent Management](management_service_agent_management.md) - Agent initialization logic
- [Management Service CDC Management](management_service_cdc_management.md) - Debezium health monitoring
- [Data Layer Mongo](data_layer_mongo.md) - Persistence layer for tools and agents
- [Stream Processing](stream_processing.md) - Kafka-based CDC event processing

---

## Architecture

### System Context

```mermaid
flowchart TD
    Gateway["Gateway Service"] -->|"REST API Calls"| ManagementApp["Management Application"]
    ManagementApp -->|"CRUD Operations"| MongoDB["MongoDB"]
    ManagementApp -->|"Connector Management"| DebeziumAPI["Debezium Connect API"]
    ManagementApp -->|"Publishes Updates"| Kafka["Kafka Topics"]
    
    DebeziumAPI -->|"CDC Events"| Kafka
    Kafka -->|"Consumed By"| StreamService["Stream Processing Service"]
    
    ManagementApp -->|"Reads Agent Configs"| Classpath["Classpath Resources"]
    
    subgraph ManagementService["Management Service"]
        ManagementApp
        ToolController["Tool Controller"]
        AgentInitializer["Agent Initializer"]
        HealthScheduler["Health Check Scheduler"]
    end
    
    subgraph DataLayer["Data Layer"]
        MongoDB
        IntegratedToolDoc["IntegratedTool Collection"]
        AgentDoc["IntegratedToolAgent Collection"]
    end
    
    style ManagementApp fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style ManagementService fill:#E8F4F8,stroke:#4A90E2
    style DataLayer fill:#F0F0F0,stroke:#999
```

### Component Architecture

```mermaid
flowchart TD
    ManagementApp["ManagementApplication<br/>(Spring Boot Entry Point)"]
    
    ManagementApp -->|"Scans & Loads"| CoreComponents["Core Components"]
    
    subgraph CoreComponents["Core Components"]
        Config["ManagementConfiguration<br/>(Bean Definitions)"]
        ToolController["IntegratedToolController<br/>(REST API)"]
        AgentInit["IntegratedToolAgentInitializer<br/>(@PostConstruct)"]
        HealthScheduler["DebeziumHealthCheckScheduler<br/>(@Scheduled)"]
    end
    
    subgraph DataLayer["Data Layer Components"]
        MongoConfig["MongoConfig"]
        ToolRepo["IntegratedToolRepository"]
        AgentRepo["IntegratedToolAgentRepository"]
    end
    
    subgraph ExternalSystems["External Systems"]
        DebeziumAPI["Debezium Connect REST API"]
        KafkaCluster["Kafka Cluster"]
    end
    
    ToolController -->|"Saves Tools"| ToolRepo
    ToolController -->|"Creates/Updates Connectors"| DebeziumAPI
    
    AgentInit -->|"Loads JSON Configs"| Classpath["Classpath Resources"]
    AgentInit -->|"Persists Agents"| AgentRepo
    AgentInit -->|"Publishes Updates"| KafkaCluster
    
    HealthScheduler -->|"Monitors & Restarts"| DebeziumAPI
    
    Config -->|"Provides"| PasswordEncoder["BCryptPasswordEncoder"]
    
    style ManagementApp fill:#FF6B6B,stroke:#C92A2A,color:#fff
    style CoreComponents fill:#FFE8E8,stroke:#FF6B6B
    style DataLayer fill:#E3F2FD,stroke:#2196F3
    style ExternalSystems fill:#FFF9C4,stroke:#FBC02D
```

---

## Core Components

### 1. ManagementApplication

**Location:** `openframe.services.openframe-management.src.main.java.com.openframe.management.ManagementApplication`

**Purpose:** Spring Boot application entry point that bootstraps the management service with component scanning and health indicator exclusions.

**Key Features:**

```java
@SpringBootApplication
@ComponentScan(
    basePackages = {
        "com.openframe.management",  // Management service components
        "com.openframe.data",         // Data layer (MongoDB, Kafka)
        "com.openframe.core"          // Core utilities
    },
    excludeFilters = {
        @ComponentScan.Filter(
            type = FilterType.ASSIGNABLE_TYPE,
            classes = CassandraHealthIndicator.class  // Exclude Cassandra health check
        )
    }
)
public class ManagementApplication {
    public static void main(String[] args) {
        SpringApplication.run(ManagementApplication.class, args);
    }
}
```

**Component Scanning Strategy:**

| Package | Purpose | Components Loaded |
|---------|---------|-------------------|
| `com.openframe.management` | Management service logic | Controllers, services, schedulers, initializers |
| `com.openframe.data` | Data access layer | MongoDB repositories, Kafka producers, configurations |
| `com.openframe.core` | Shared utilities | Common beans, utilities, base classes |

**Exclusions:**
- **CassandraHealthIndicator**: Excluded because management service uses MongoDB as primary datastore, not Cassandra (which is used by other services for time-series data)

---

## Application Lifecycle

### Startup Sequence

```mermaid
flowchart TD
    Start["Application Start"] --> SpringBoot["SpringApplication.run()"]
    SpringBoot --> ComponentScan["Component Scanning<br/>(management, data, core)"]
    
    ComponentScan --> LoadBeans["Load Configuration Beans"]
    LoadBeans --> ManagementConfig["ManagementConfiguration<br/>(PasswordEncoder)"]
    LoadBeans --> MongoConfig["MongoConfig<br/>(Database Connection)"]
    LoadBeans --> DataConfig["DataConfiguration<br/>(Repository Setup)"]
    
    DataConfig --> PostConstruct["@PostConstruct Methods"]
    
    PostConstruct --> AgentInit["IntegratedToolAgentInitializer<br/>.initializeToolAgents()"]
    AgentInit --> LoadAgentConfigs["Load Agent JSON from Classpath"]
    LoadAgentConfigs --> SaveAgents["Save/Update Agents in MongoDB"]
    SaveAgents --> PublishUpdates["Publish Version Updates to Kafka"]
    
    PublishUpdates --> SchedulerInit["DebeziumHealthCheckScheduler<br/>.init()"]
    SchedulerInit --> SchedulerReady["Scheduler Ready<br/>(Distributed Lock Configured)"]
    
    SchedulerReady --> ServerReady["Server Ready<br/>(REST API Available)"]
    
    ServerReady --> ScheduledTasks["Scheduled Tasks Start"]
    ScheduledTasks --> HealthCheck["Health Check Every 5 Minutes<br/>(Default)"]
    
    style Start fill:#4CAF50,stroke:#2E7D32,color:#fff
    style ServerReady fill:#4CAF50,stroke:#2E7D32,color:#fff
    style AgentInit fill:#FF9800,stroke:#E65100,color:#fff
    style HealthCheck fill:#2196F3,stroke:#0D47A1,color:#fff
```

### Runtime Operations

```mermaid
flowchart LR
    subgraph RuntimeOps["Runtime Operations"]
        direction TB
        
        API["REST API Requests<br/>(Tool CRUD)"]
        Scheduler["Scheduled Health Checks<br/>(Every 5 min)"]
        Events["Kafka Event Publishing<br/>(Agent Updates)"]
    end
    
    API -->|"POST /v1/tools/{id}"| SaveTool["Save Tool Configuration"]
    SaveTool --> UpdateDebezium["Create/Update CDC Connector"]
    SaveTool --> TriggerHooks["Execute Post-Save Hooks"]
    
    Scheduler -->|"@Scheduled"| AcquireLock["Acquire Distributed Lock<br/>(ShedLock)"]
    AcquireLock -->|"Lock Acquired"| CheckHealth["Check Connector Health"]
    CheckHealth -->|"Failed Tasks Found"| RestartTasks["Restart Failed Tasks"]
    AcquireLock -->|"Lock Not Acquired"| Skip["Skip (Another Instance Running)"]
    
    Events -->|"Version Changed"| PublishUpdate["Publish ToolAgentUpdate Event"]
    PublishUpdate --> KafkaTopic["Kafka Topic:<br/>tool-agent-updates"]
    
    style SaveTool fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style CheckHealth fill:#FF6B6B,stroke:#C92A2A,color:#fff
    style PublishUpdate fill:#9C27B0,stroke:#6A1B9A,color:#fff
```

---

## Integration Points

### 1. MongoDB Integration

**Purpose:** Persistent storage for integrated tools and agent configurations

**Collections Used:**

| Collection | Document Type | Purpose |
|------------|---------------|---------|
| `integrated_tools` | `IntegratedTool` | Tool metadata, credentials, CDC connector configs |
| `integrated_tool_agents` | `IntegratedToolAgent` | Agent definitions, versions, capabilities |

**Example Tool Document:**

```json
{
  "_id": "tactical-rmm",
  "name": "Tactical RMM",
  "description": "Open-source RMM platform",
  "type": "rmm",
  "enabled": true,
  "credentials": {
    "apiUrl": "https://rmm.example.com",
    "apiKey": "encrypted_key"
  },
  "debeziumConnectors": [
    {
      "name": "tactical-rmm-connector",
      "config": {
        "connector.class": "io.debezium.connector.mongodb.MongoDbConnector",
        "mongodb.connection.string": "mongodb://localhost:27017",
        "database.include.list": "tactical_rmm"
      }
    }
  ]
}
```

**Data Flow:**

```mermaid
flowchart LR
    Controller["IntegratedToolController"] -->|"saveTool()"| Service["IntegratedToolService"]
    Service -->|"save()"| Repository["IntegratedToolRepository<br/>(MongoRepository)"]
    Repository -->|"Insert/Update"| MongoDB["MongoDB<br/>integrated_tools"]
    
    Initializer["IntegratedToolAgentInitializer"] -->|"save()"| AgentService["IntegratedToolAgentService"]
    AgentService -->|"save()"| AgentRepo["IntegratedToolAgentRepository"]
    AgentRepo -->|"Insert/Update"| MongoDBAgent["MongoDB<br/>integrated_tool_agents"]
    
    style MongoDB fill:#4DB33D,stroke:#3D8B2F,color:#fff
    style MongoDBAgent fill:#4DB33D,stroke:#3D8B2F,color:#fff
```

### 2. Debezium CDC Integration

**Purpose:** Manage Change Data Capture connectors for real-time data synchronization

**Connector Lifecycle:**

```mermaid
flowchart TD
    ToolSaved["Tool Saved via API"] --> ExtractConfig["Extract debeziumConnectors Array"]
    ExtractConfig --> DebeziumService["DebeziumService<br/>.createOrUpdateDebeziumConnector()"]
    
    DebeziumService --> CheckExists{"Connector<br/>Exists?"}
    CheckExists -->|"Yes"| UpdateConnector["PUT /connectors/{name}/config"]
    CheckExists -->|"No"| CreateConnector["POST /connectors"]
    
    UpdateConnector --> RestartTasks["Restart Connector Tasks"]
    CreateConnector --> RestartTasks
    
    RestartTasks --> MonitorHealth["Health Check Scheduler<br/>Monitors Status"]
    
    MonitorHealth -->|"Every 5 min"| CheckStatus["GET /connectors/{name}/status"]
    CheckStatus -->|"FAILED Tasks"| RestartFailed["POST /connectors/{name}/tasks/{id}/restart"]
    CheckStatus -->|"All RUNNING"| Continue["Continue Monitoring"]
    
    style DebeziumService fill:#FF6B6B,stroke:#C92A2A,color:#fff
    style MonitorHealth fill:#2196F3,stroke:#0D47A1,color:#fff
```

**Health Check Configuration:**

```yaml
openframe:
  debezium:
    health-check:
      enabled: true
      interval: 300000  # 5 minutes
      lock-at-most-for: 5m
      lock-at-least-for: 1m
```

### 3. Kafka Event Publishing

**Purpose:** Notify other services of agent configuration updates

**Event Flow:**

```mermaid
flowchart LR
    AgentInit["Agent Initializer"] -->|"Version Changed"| Publisher["ToolAgentUpdatePublisher"]
    Publisher -->|"publish()"| KafkaProducer["Kafka Producer"]
    KafkaProducer -->|"Send Message"| Topic["Kafka Topic:<br/>tool-agent-updates"]
    
    Topic -->|"Consumed By"| Subscribers["Subscribing Services"]
    Subscribers --> ClientService["Client Service<br/>(Agent Deployment)"]
    Subscribers --> StreamService["Stream Service<br/>(Event Processing)"]
    
    style Publisher fill:#9C27B0,stroke:#6A1B9A,color:#fff
    style Topic fill:#FBC02D,stroke:#F57F17,color:#000
```

**Event Payload Example:**

```json
{
  "agentId": "tactical-rmm-agent",
  "version": "1.2.0",
  "previousVersion": "1.1.0",
  "timestamp": "2024-01-15T10:30:00Z",
  "changeType": "VERSION_UPDATE"
}
```

---

## REST API Endpoints

### Tool Management API

**Base Path:** `/v1/tools`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/v1/tools` | List all integrated tools | None | `{"status": "success", "tools": [...]}` |
| GET | `/v1/tools/{id}` | Get specific tool | None | `{"status": "success", "tool": {...}}` |
| POST | `/v1/tools/{id}` | Create/update tool | `{"tool": {...}}` | `{"status": "success", "tool": {...}}` |

**Example: Save Tool Configuration**

```bash
curl -X POST http://localhost:8080/v1/tools/tactical-rmm \
  -H "Content-Type: application/json" \
  -d '{
    "tool": {
      "name": "Tactical RMM",
      "type": "rmm",
      "enabled": true,
      "credentials": {
        "apiUrl": "https://rmm.example.com",
        "apiKey": "your-api-key"
      },
      "debeziumConnectors": [
        {
          "name": "tactical-rmm-connector",
          "config": {
            "connector.class": "io.debezium.connector.mongodb.MongoDbConnector",
            "mongodb.connection.string": "mongodb://localhost:27017"
          }
        }
      ]
    }
  }'
```

**Response:**

```json
{
  "status": "success",
  "tool": {
    "id": "tactical-rmm",
    "name": "Tactical RMM",
    "enabled": true,
    "credentials": {
      "apiUrl": "https://rmm.example.com"
    }
  }
}
```

---

## Configuration

### Application Properties

**File:** `application.yml` or `application.properties`

```yaml
# Server Configuration
server:
  port: 8080

# MongoDB Configuration
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/openframe
      database: openframe

# Agent Configuration
openframe:
  agent:
    configurations:
      - agents/tactical-rmm-agent.json
      - agents/fleet-mdm-agent.json
      - agents/syncro-agent.json

# Debezium Health Check
openframe:
  debezium:
    api:
      url: http://debezium-connect:8083
    health-check:
      enabled: true
      interval: 300000  # 5 minutes
      lock-at-most-for: 5m
      lock-at-least-for: 1m

# ShedLock (Distributed Scheduling)
shedlock:
  defaults:
    lock-at-most-for: 10m
    lock-at-least-for: 5m
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SPRING_DATA_MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/openframe` | Yes |
| `DEBEZIUM_API_URL` | Debezium Connect REST API URL | `http://localhost:8083` | Yes |
| `OPENFRAME_AGENT_CONFIGURATIONS` | Comma-separated agent config paths | See config | No |
| `DEBEZIUM_HEALTH_CHECK_ENABLED` | Enable health check scheduler | `true` | No |
| `DEBEZIUM_HEALTH_CHECK_INTERVAL` | Health check interval (ms) | `300000` | No |

---

## Agent Initialization Process

### Agent Configuration Loading

**Process Flow:**

```mermaid
flowchart TD
    Start["@PostConstruct Triggered"] --> ReadPaths["Read Agent Config Paths<br/>from Properties"]
    ReadPaths --> IteratePaths["Iterate Each Config Path"]
    
    IteratePaths --> LoadResource["Load ClassPathResource"]
    LoadResource --> CheckExists{"Resource<br/>Exists?"}
    
    CheckExists -->|"No"| LogWarn["Log Warning & Skip"]
    CheckExists -->|"Yes"| ParseJSON["Parse JSON to<br/>IntegratedToolAgent"]
    
    ParseJSON --> CheckDB{"Agent Exists<br/>in MongoDB?"}
    
    CheckDB -->|"Yes"| CheckRelease{"Is Release<br/>Version?"}
    CheckRelease -->|"Yes"| PreserveVersion["Preserve Existing Version"]
    CheckRelease -->|"No"| UpdateVersion["Update to New Version"]
    
    PreserveVersion --> SaveExisting["Update Agent in DB"]
    UpdateVersion --> SaveExisting
    
    CheckDB -->|"No"| SaveNew["Create New Agent in DB"]
    
    SaveExisting --> CheckVersionChange{"Version<br/>Changed?"}
    CheckVersionChange -->|"Yes"| PublishEvent["Publish Update Event to Kafka"]
    CheckVersionChange -->|"No"| SkipPublish["Skip Event Publishing"]
    
    SaveNew --> NextConfig["Process Next Config"]
    PublishEvent --> NextConfig
    SkipPublish --> NextConfig
    LogWarn --> NextConfig
    
    NextConfig --> IteratePaths
    NextConfig --> Complete["Initialization Complete"]
    
    style Start fill:#4CAF50,stroke:#2E7D32,color:#fff
    style PublishEvent fill:#9C27B0,stroke:#6A1B9A,color:#fff
    style Complete fill:#4CAF50,stroke:#2E7D32,color:#fff
```

### Agent Configuration Example

**File:** `src/main/resources/agents/tactical-rmm-agent.json`

```json
{
  "id": "tactical-rmm-agent",
  "name": "Tactical RMM Agent",
  "version": "1.2.0",
  "releaseVersion": false,
  "description": "Agent for Tactical RMM integration",
  "capabilities": [
    "device-management",
    "remote-control",
    "script-execution"
  ],
  "configuration": {
    "syncInterval": 300,
    "batchSize": 100
  }
}
```

**Version Management Rules:**

| Scenario | Behavior |
|----------|----------|
| New agent (not in DB) | Create with version from JSON |
| Existing agent, `releaseVersion: false` | Update version from JSON, publish event if changed |
| Existing agent, `releaseVersion: true` | Preserve existing version, skip event publishing |

---

## Health Monitoring

### Debezium Health Check Scheduler

**Purpose:** Automatically detect and restart failed Debezium connector tasks

**Scheduling Configuration:**

```java
@Scheduled(fixedDelayString = "${openframe.debezium.health-check.interval:300000}")
@SchedulerLock(
    name = "debeziumHealthCheck",
    lockAtMostFor = "${openframe.debezium.health-check.lock-at-most-for:5m}",
    lockAtLeastFor = "${openframe.debezium.health-check.lock-at-least-for:1m}"
)
public void checkAndRestartFailedTasks() {
    debeziumService.checkAndRestartFailedTasks();
}
```

**Distributed Lock Mechanism:**

```mermaid
flowchart TD
    Scheduler["Scheduler Triggered<br/>(Every 5 min)"] --> TryLock["Try Acquire Lock<br/>(ShedLock)"]
    
    TryLock -->|"Lock Acquired"| Instance1["Instance 1 Executes"]
    TryLock -->|"Lock Held by Another"| Instance2["Instance 2 Skips"]
    
    Instance1 --> GetConnectors["GET /connectors"]
    GetConnectors --> IterateConnectors["Iterate Each Connector"]
    
    IterateConnectors --> GetStatus["GET /connectors/{name}/status"]
    GetStatus --> CheckTasks{"Any Tasks<br/>FAILED?"}
    
    CheckTasks -->|"Yes"| RestartTask["POST /connectors/{name}/tasks/{id}/restart"]
    CheckTasks -->|"No"| NextConnector["Check Next Connector"]
    
    RestartTask --> LogRestart["Log Restart Action"]
    LogRestart --> NextConnector
    
    NextConnector --> IterateConnectors
    NextConnector --> ReleaseLock["Release Lock"]
    
    Instance2 --> WaitNext["Wait for Next Cycle"]
    
    style Instance1 fill:#4CAF50,stroke:#2E7D32,color:#fff
    style Instance2 fill:#FFC107,stroke:#F57F17,color:#000
    style RestartTask fill:#FF6B6B,stroke:#C92A2A,color:#fff
```

**Lock Configuration:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `lockAtMostFor` | 5 minutes | Maximum lock duration (prevents deadlock) |
| `lockAtLeastFor` | 1 minute | Minimum lock duration (prevents rapid re-execution) |
| `fixedDelay` | 5 minutes | Delay between executions |

---

## Deployment

### Docker Deployment

**Dockerfile:**

```dockerfile
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY target/openframe-management-*.jar app.jar

# Agent configuration files
COPY src/main/resources/agents /app/agents

ENV JAVA_OPTS="-Xmx512m -Xms256m"

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
```

**Docker Compose:**

```yaml
version: '3.8'

services:
  management-service:
    image: openframe/management-service:latest
    ports:
      - "8080:8080"
    environment:
      SPRING_DATA_MONGODB_URI: mongodb://mongodb:27017/openframe
      DEBEZIUM_API_URL: http://debezium-connect:8083
      OPENFRAME_AGENT_CONFIGURATIONS: agents/tactical-rmm-agent.json,agents/fleet-mdm-agent.json
      DEBEZIUM_HEALTH_CHECK_ENABLED: "true"
      DEBEZIUM_HEALTH_CHECK_INTERVAL: "300000"
    depends_on:
      - mongodb
      - debezium-connect
      - kafka
    volumes:
      - ./agents:/app/agents
    networks:
      - openframe-network

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongodb-data:/data/db
    networks:
      - openframe-network

  debezium-connect:
    image: debezium/connect:2.5
    ports:
      - "8083:8083"
    environment:
      BOOTSTRAP_SERVERS: kafka:9092
      GROUP_ID: debezium-cluster
      CONFIG_STORAGE_TOPIC: debezium_configs
      OFFSET_STORAGE_TOPIC: debezium_offsets
      STATUS_STORAGE_TOPIC: debezium_statuses
    depends_on:
      - kafka
    networks:
      - openframe-network

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
    depends_on:
      - zookeeper
    networks:
      - openframe-network

  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    ports:
      - "2181:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
    networks:
      - openframe-network

volumes:
  mongodb-data:

networks:
  openframe-network:
    driver: bridge
```

### Kubernetes Deployment

**Deployment Manifest:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: management-service
  namespace: openframe
spec:
  replicas: 2
  selector:
    matchLabels:
      app: management-service
  template:
    metadata:
      labels:
        app: management-service
    spec:
      containers:
      - name: management-service
        image: openframe/management-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: SPRING_DATA_MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-credentials
              key: connection-string
        - name: DEBEZIUM_API_URL
          value: "http://debezium-connect:8083"
        - name: DEBEZIUM_HEALTH_CHECK_ENABLED
          value: "true"
        - name: DEBEZIUM_HEALTH_CHECK_INTERVAL
          value: "300000"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 5
        volumeMounts:
        - name: agent-configs
          mountPath: /app/agents
          readOnly: true
      volumes:
      - name: agent-configs
        configMap:
          name: agent-configurations
---
apiVersion: v1
kind: Service
metadata:
  name: management-service
  namespace: openframe
spec:
  selector:
    app: management-service
  ports:
  - protocol: TCP
    port: 8080
    targetPort: 8080
  type: ClusterIP
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: agent-configurations
  namespace: openframe
data:
  tactical-rmm-agent.json: |
    {
      "id": "tactical-rmm-agent",
      "name": "Tactical RMM Agent",
      "version": "1.2.0",
      "releaseVersion": false
    }
  fleet-mdm-agent.json: |
    {
      "id": "fleet-mdm-agent",
      "name": "Fleet MDM Agent",
      "version": "1.0.0",
      "releaseVersion": false
    }
```

---

## Monitoring and Observability

### Health Checks

**Spring Boot Actuator Endpoints:**

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `/actuator/health` | Overall health status | `{"status": "UP"}` |
| `/actuator/health/readiness` | Readiness probe | `{"status": "UP"}` |
| `/actuator/health/liveness` | Liveness probe | `{"status": "UP"}` |
| `/actuator/info` | Application info | Version, build details |
| `/actuator/metrics` | Prometheus metrics | Micrometer metrics |

**Custom Health Indicators:**

```mermaid
flowchart LR
    HealthEndpoint["/actuator/health"] --> Aggregator["Health Aggregator"]
    
    Aggregator --> MongoHealth["MongoDB Health"]
    Aggregator --> DebeziumHealth["Debezium Health"]
    Aggregator --> KafkaHealth["Kafka Health"]
    
    MongoHealth -->|"UP/DOWN"| Status["Overall Status"]
    DebeziumHealth -->|"UP/DOWN"| Status
    KafkaHealth -->|"UP/DOWN"| Status
    
    Status --> Response["JSON Response"]
    
    style HealthEndpoint fill:#4CAF50,stroke:#2E7D32,color:#fff
    style Status fill:#2196F3,stroke:#0D47A1,color:#fff
```

### Logging

**Log Levels:**

```yaml
logging:
  level:
    com.openframe.management: INFO
    com.openframe.management.initializer: DEBUG
    com.openframe.management.scheduler: DEBUG
    org.springframework.data.mongodb: WARN
    org.apache.kafka: WARN
```

**Key Log Events:**

| Event | Log Level | Example |
|-------|-----------|---------|
| Agent initialization | INFO | `Initializing IntegratedToolAgent configurations from resources...` |
| Agent version update | INFO | `Detected version update for tactical-rmm-agent from 1.1.0 to 1.2.0` |
| Tool saved | INFO | `Successfully saved tool configuration for: tactical-rmm` |
| Debezium connector created | INFO | `Created Debezium connector: tactical-rmm-connector` |
| Health check execution | DEBUG | `Checking Debezium connector health...` |
| Failed task restart | WARN | `Restarting failed task for connector: tactical-rmm-connector` |
| Configuration error | ERROR | `Failed to load agent configuration from agents/invalid.json` |

### Metrics

**Prometheus Metrics:**

```text
# Tool management metrics
openframe_tools_total{type="rmm"} 5
openframe_tools_total{type="mdm"} 3
openframe_tools_enabled_total 7

# Agent metrics
openframe_agents_initialized_total 8
openframe_agents_version_updates_total 12

# Debezium health check metrics
openframe_debezium_health_checks_total 1440
openframe_debezium_connectors_failed_total 3
openframe_debezium_tasks_restarted_total 5

# Scheduler metrics
openframe_scheduler_executions_total{job="debeziumHealthCheck"} 288
openframe_scheduler_lock_acquired_total{job="debeziumHealthCheck"} 144
```

---

## Troubleshooting

### Common Issues

#### 1. Agent Configuration Not Loading

**Symptoms:**
- Log message: `Agent configuration file not found: agents/my-agent.json, skipping`
- Agent not appearing in database

**Causes:**
- File path incorrect in `openframe.agent.configurations`
- File not included in JAR/Docker image
- JSON parsing error

**Solutions:**

```bash
# Verify file exists in classpath
jar -tf target/openframe-management-*.jar | grep agents/

# Check file path configuration
grep -r "agent.configurations" src/main/resources/

# Validate JSON syntax
cat src/main/resources/agents/my-agent.json | jq .

# Enable debug logging
export LOGGING_LEVEL_COM_OPENFRAME_MANAGEMENT_INITIALIZER=DEBUG
```

#### 2. Debezium Connector Creation Fails

**Symptoms:**
- Log message: `Failed to save tool: tactical-rmm`
- HTTP 500 response from `/v1/tools/{id}`

**Causes:**
- Debezium Connect API unreachable
- Invalid connector configuration
- MongoDB connection string incorrect

**Solutions:**

```bash
# Test Debezium API connectivity
curl http://debezium-connect:8083/connectors

# Validate connector config
curl -X POST http://debezium-connect:8083/connector-plugins/MongoDbConnector/config/validate \
  -H "Content-Type: application/json" \
  -d @connector-config.json

# Check Debezium logs
docker logs debezium-connect

# Verify MongoDB connection
mongosh "mongodb://localhost:27017/openframe" --eval "db.adminCommand('ping')"
```

#### 3. Health Check Scheduler Not Running

**Symptoms:**
- No health check logs appearing
- Failed connectors not being restarted

**Causes:**
- `openframe.debezium.health-check.enabled` set to `false`
- ShedLock configuration missing
- All instances unable to acquire lock

**Solutions:**

```yaml
# Enable health check
openframe:
  debezium:
    health-check:
      enabled: true
      interval: 300000

# Verify ShedLock configuration
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/openframe

# Check lock collection
mongosh openframe --eval "db.shedLock.find().pretty()"

# Force lock release (if stuck)
mongosh openframe --eval "db.shedLock.deleteOne({_id: 'debeziumHealthCheck'})"
```

#### 4. MongoDB Connection Failures

**Symptoms:**
- Application fails to start
- Log message: `Error creating bean with name 'mongoTemplate'`

**Causes:**
- MongoDB not running
- Incorrect connection string
- Authentication failure

**Solutions:**

```bash
# Test MongoDB connectivity
mongosh "mongodb://localhost:27017/openframe"

# Check MongoDB status
docker ps | grep mongo
systemctl status mongod

# Verify credentials
export SPRING_DATA_MONGODB_URI="mongodb://user:pass@localhost:27017/openframe?authSource=admin"

# Enable MongoDB debug logging
logging:
  level:
    org.springframework.data.mongodb: DEBUG
```

---

## Security Considerations

### Password Encryption

**BCrypt Password Encoder:**

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
}
```

**Usage in Tool Credentials:**

```java
// Encrypt API key before saving
String encryptedKey = passwordEncoder.encode(apiKey);
tool.getCredentials().setApiKey(encryptedKey);

// Verify API key
boolean matches = passwordEncoder.matches(rawKey, encryptedKey);
```

### API Security

**Recommendations:**

1. **Enable Spring Security:**
   ```yaml
   spring:
     security:
       oauth2:
         resourceserver:
           jwt:
             issuer-uri: http://authorization-service:9000
   ```

2. **Secure Actuator Endpoints:**
   ```yaml
   management:
     endpoints:
       web:
         exposure:
           include: health,info,metrics
     endpoint:
       health:
         show-details: when-authorized
   ```

3. **Use HTTPS in Production:**
   ```yaml
   server:
     ssl:
       enabled: true
       key-store: classpath:keystore.p12
       key-store-password: ${KEYSTORE_PASSWORD}
   ```

### Secrets Management

**Environment Variables (Recommended):**

```bash
export SPRING_DATA_MONGODB_URI="mongodb://user:pass@localhost:27017/openframe"
export DEBEZIUM_API_URL="http://debezium-connect:8083"
```

**Kubernetes Secrets:**

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mongodb-credentials
type: Opaque
stringData:
  connection-string: mongodb://user:pass@mongodb:27017/openframe
```

---

## Performance Optimization

### JVM Tuning

**Recommended JVM Options:**

```bash
JAVA_OPTS="
  -Xmx1g
  -Xms512m
  -XX:+UseG1GC
  -XX:MaxGCPauseMillis=200
  -XX:+HeapDumpOnOutOfMemoryError
  -XX:HeapDumpPath=/var/log/openframe/heapdump.hprof
"
```

### MongoDB Connection Pooling

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/openframe?maxPoolSize=50&minPoolSize=10
```

### Scheduler Optimization

**Adjust Health Check Interval:**

```yaml
openframe:
  debezium:
    health-check:
      interval: 600000  # 10 minutes (reduce frequency)
```

---

## Related Documentation

- **[Management Service Configuration](management_service_configuration.md)** - Configuration beans and properties
- **[Management Service Tool Management](management_service_tool_management.md)** - Tool CRUD operations and hooks
- **[Management Service Agent Management](management_service_agent_management.md)** - Agent initialization and versioning
- **[Management Service CDC Management](management_service_cdc_management.md)** - Debezium connector management
- **[Data Layer Mongo](data_layer_mongo.md)** - MongoDB document models and repositories
- **[Stream Processing](stream_processing.md)** - Kafka-based CDC event processing
- **[Gateway Service](gateway_service.md)** - API gateway routing to management service

---

## Additional Resources

### Official Documentation
- **Spring Boot Documentation:** https://docs.spring.io/spring-boot/docs/current/reference/html/
- **Debezium Documentation:** https://debezium.io/documentation/
- **MongoDB Spring Data:** https://docs.spring.io/spring-data/mongodb/docs/current/reference/html/
- **ShedLock Documentation:** https://github.com/lukas-krecan/ShedLock

### OpenFrame Resources
- **OpenMSP Slack Community:** https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
- **Flamingo Platform:** https://flamingo.run
- **OpenFrame Platform:** https://openframe.ai

---

**Last Updated:** 2024-01-15  
**Version:** 1.0  
**Maintainer:** OpenFrame Team
