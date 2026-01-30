# Management Service - Tool Management Module

## Overview

The **Tool Management Module** is a critical component of the OpenFrame Management Service responsible for managing integrated third-party tools and their configurations. This module provides REST API endpoints for CRUD operations on integrated tools, orchestrates Change Data Capture (CDC) connector lifecycle management via Debezium, and implements an extensible hook system for post-save operations.

**Key Responsibilities:**
- Manage integrated tool configurations (create, read, update)
- Orchestrate Debezium CDC connector provisioning and updates
- Execute post-save hooks for tool-specific side effects
- Provide RESTful API for tool management operations

**Related Modules:**
- [Management Service Configuration](management_service_configuration.md) - Configuration and properties
- [Management Service CDC Management](management_service_cdc_management.md) - Debezium health monitoring
- [Management Service Agent Management](management_service_agent_management.md) - Tool agent initialization
- [Data Layer MongoDB](data_layer_mongo.md) - IntegratedTool document model and repository

---

## Architecture

### Component Overview

```mermaid
flowchart TD
    Client["External Client"] -->|"HTTP REST"| Controller["IntegratedToolController"]
    
    Controller -->|"CRUD Operations"| ToolService["IntegratedToolService"]
    Controller -->|"CDC Management"| DebeziumService["DebeziumService"]
    Controller -->|"Execute Hooks"| HookRegistry["Post-Save Hook Registry"]
    
    ToolService -->|"MongoDB Operations"| ToolRepo["IntegratedToolRepository"]
    ToolRepo -->|"Persist"| MongoDB[("MongoDB<br/>integrated_tools")]
    
    DebeziumService -->|"HTTP API"| DebeziumConnect["Debezium Connect<br/>REST API"]
    DebeziumConnect -->|"Manage"| Connectors["CDC Connectors"]
    
    HookRegistry -->|"Invoke"| Hook1["IntegratedToolPostSaveHook<br/>Implementation 1"]
    HookRegistry -->|"Invoke"| Hook2["IntegratedToolPostSaveHook<br/>Implementation 2"]
    HookRegistry -->|"Invoke"| HookN["IntegratedToolPostSaveHook<br/>Implementation N"]
    
    Hook1 -.->|"Side Effects"| ExternalSystem1["External System 1"]
    Hook2 -.->|"Side Effects"| ExternalSystem2["External System 2"]
    
    style Controller fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style ToolService fill:#50C878,stroke:#2E7D4E,color:#fff
    style DebeziumService fill:#F39C12,stroke:#C87F0A,color:#fff
    style HookRegistry fill:#9B59B6,stroke:#6C3483,color:#fff
```

### Data Flow

```mermaid
flowchart LR
    subgraph Request["Tool Save Request Flow"]
        A["Client"] -->|"POST /v1/tools/{id}"| B["IntegratedToolController"]
        B -->|"1. Validate & Set ID"| C["Request Processing"]
        C -->|"2. Save Tool"| D["IntegratedToolService"]
        D -->|"3. Persist"| E[("MongoDB")]
        E -->|"4. Return Saved Tool"| D
        D -->|"5. Saved Tool"| B
        B -->|"6. Create/Update CDC"| F["DebeziumService"]
        F -->|"7. HTTP API Calls"| G["Debezium Connect"]
        G -->|"8. Connector Status"| F
        F -->|"9. CDC Complete"| B
        B -->|"10. Execute Hooks"| H["Post-Save Hooks"]
        H -->|"11. Hook Results"| B
        B -->|"12. Success Response"| A
    end
    
    style A fill:#E8F4F8,stroke:#4A90E2
    style B fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style D fill:#50C878,stroke:#2E7D4E,color:#fff
    style F fill:#F39C12,stroke:#C87F0A,color:#fff
    style H fill:#9B59B6,stroke:#6C3483,color:#fff
```

### Hook Execution Pattern

```mermaid
flowchart TD
    SaveComplete["Tool Save Complete"] -->|"Iterate Hooks"| HookLoop["For Each Hook"]
    
    HookLoop -->|"Try Execute"| Hook["hook.onToolSaved()"]
    Hook -->|"Success"| LogSuccess["Log Success"]
    Hook -->|"Exception"| CatchError["Catch Exception"]
    
    CatchError -->|"Log Warning"| LogError["Log Hook Failure"]
    LogError -->|"Continue"| NextHook["Next Hook"]
    LogSuccess -->|"Continue"| NextHook
    
    NextHook -->|"More Hooks"| HookLoop
    NextHook -->|"All Complete"| ReturnResponse["Return Response to Client"]
    
    style SaveComplete fill:#50C878,stroke:#2E7D4E,color:#fff
    style Hook fill:#9B59B6,stroke:#6C3483,color:#fff
    style CatchError fill:#E74C3C,stroke:#C0392B,color:#fff
    style ReturnResponse fill:#4A90E2,stroke:#2E5C8A,color:#fff
```

---

## Core Components

### 1. IntegratedToolController

**Location:** `com.openframe.management.controller.IntegratedToolController`

**Purpose:** REST controller providing HTTP endpoints for integrated tool management operations.

**Key Features:**
- RESTful CRUD operations for integrated tools
- Automatic CDC connector provisioning on tool save
- Post-save hook execution with error isolation
- Structured JSON response format

**Endpoints:**

| Method | Path | Description | Request Body | Response |
|--------|------|-------------|--------------|----------|
| `GET` | `/v1/tools` | List all integrated tools | None | `{"status": "success", "tools": [...]}` |
| `GET` | `/v1/tools/{id}` | Get specific tool by ID | None | `{"status": "success", "tool": {...}}` |
| `POST` | `/v1/tools/{id}` | Create or update tool | `SaveToolRequest` | `{"status": "success", "tool": {...}}` |

**Request/Response Models:**

```java
// Request DTO
public static class SaveToolRequest {
    private IntegratedTool tool;
}

// Success Response
{
    "status": "success",
    "tool": {
        "id": "tactical-rmm",
        "name": "Tactical RMM",
        "enabled": true,
        // ... other fields
    }
}

// Error Response
{
    "status": "error",
    "message": "Error details..."
}
```

**Dependencies:**
- `IntegratedToolService` - Tool persistence operations
- `DebeziumService` - CDC connector management
- `List<IntegratedToolPostSaveHook>` - Extensible hook registry

**Error Handling:**
- Hook failures are logged but don't fail the request
- Service exceptions return HTTP 500 with error details
- Missing tools return error status in response body

**Code Example:**

```java
@PostMapping("/{id}")
public ResponseEntity<Map<String, Object>> saveTool(
        @PathVariable String id,
        @RequestBody SaveToolRequest request) {
    try {
        IntegratedTool tool = request.getTool();
        tool.setId(id);
        tool.setEnabled(true);

        // 1. Save tool to MongoDB
        IntegratedTool savedTool = toolService.saveTool(tool);
        log.info("Successfully saved tool configuration for: {}", id);
        
        // 2. Provision CDC connectors
        debeziumService.createOrUpdateDebeziumConnector(
            savedTool.getDebeziumConnectors()
        );
        
        // 3. Execute post-save hooks (non-blocking)
        for (IntegratedToolPostSaveHook hook : postSaveHooks) {
            try {
                hook.onToolSaved(id, savedTool);
            } catch (Exception hookEx) {
                log.warn("Post-save hook failed for toolId={}: {}", 
                    id, hookEx.getMessage(), hookEx);
            }
        }
        
        return ResponseEntity.ok(Map.of("status", "success", "tool", savedTool));
    } catch (Exception e) {
        log.error("Failed to save tool: {}", id, e);
        return ResponseEntity.status(INTERNAL_SERVER_ERROR)
                .body(Map.of("status", "error", "message", e.getMessage()));
    }
}
```

---

### 2. IntegratedToolPostSaveHook

**Location:** `com.openframe.management.hook.IntegratedToolPostSaveHook`

**Purpose:** Lightweight extension point for executing service-specific side effects after tool save operations.

**Design Pattern:** Strategy Pattern / Observer Pattern

**Interface Definition:**

```java
public interface IntegratedToolPostSaveHook {
    void onToolSaved(String toolId, IntegratedTool tool);
}
```

**Key Characteristics:**
- **Lightweight:** No Spring event infrastructure overhead
- **Synchronous:** Executed in request thread (use async internally if needed)
- **Fault-Tolerant:** Exceptions don't fail the save operation
- **Extensible:** Multiple implementations auto-discovered via Spring

**Use Cases:**
1. **Agent Initialization:** Trigger agent deployment after tool configuration
2. **Cache Invalidation:** Clear cached tool metadata
3. **Notification:** Send alerts to monitoring systems
4. **Audit Logging:** Record tool configuration changes
5. **Webhook Triggers:** Notify external systems of tool updates

**Implementation Example:**

```java
@Component
@Slf4j
public class ToolAgentDeploymentHook implements IntegratedToolPostSaveHook {
    
    private final IntegratedToolAgentService agentService;
    
    @Override
    public void onToolSaved(String toolId, IntegratedTool tool) {
        log.info("Deploying agents for tool: {}", toolId);
        
        // Trigger agent initialization
        agentService.deployAgentsForTool(toolId);
        
        log.info("Agent deployment triggered for: {}", toolId);
    }
}
```

**Hook Execution Guarantees:**
- ✅ Hooks execute **after** successful MongoDB save
- ✅ Hooks execute **after** Debezium connector provisioning
- ✅ Hook failures are logged but isolated (don't affect other hooks)
- ✅ All registered hooks execute (no short-circuit on failure)
- ❌ No transaction rollback on hook failure
- ❌ No guaranteed execution order between hooks

---

## Integration Points

### MongoDB Integration

**Document Model:** `IntegratedTool`

```java
@Document(collection = "integrated_tools")
public class IntegratedTool {
    @Id
    private String id;                          // Unique tool identifier
    private String name;                        // Display name
    private String description;                 // Tool description
    private String icon;                        // Icon URL/path
    private List<ToolUrl> toolUrls;            // Access URLs
    private String type;                        // Tool type identifier
    private String toolType;                    // Tool category
    private String category;                    // Business category
    private String platformCategory;            // Platform classification
    private boolean enabled;                    // Activation status
    private ToolCredentials credentials;        // Authentication config
    
    // Layer information
    private String layer;                       // Architecture layer
    private Integer layerOrder;                 // Display order
    private String layerColor;                  // UI color code
    
    // Monitoring configuration
    private String metricsPath;                 // Metrics endpoint
    private String healthCheckEndpoint;         // Health check URL
    private Integer healthCheckInterval;        // Check frequency (seconds)
    private Integer connectionTimeout;          // Connection timeout (ms)
    private Integer readTimeout;                // Read timeout (ms)
    private String[] allowedEndpoints;          // Whitelisted endpoints
    private Object[] debeziumConnectors;        // CDC connector configs
}
```

**Repository Operations:**

```java
// Service layer operations
public List<IntegratedTool> getAllTools() {
    return toolRepository.findAll();
}

public Optional<IntegratedTool> getTool(String toolType) {
    return toolRepository.findByType(toolType);
}

public IntegratedTool saveTool(IntegratedTool tool) {
    return toolRepository.save(tool);
}
```

**See:** [Data Layer MongoDB](data_layer_mongo.md) for complete repository documentation.

---

### Debezium CDC Integration

**Service:** `DebeziumService`

**Purpose:** Manages Debezium Connect REST API interactions for CDC connector lifecycle.

**Connector Provisioning Flow:**

```mermaid
flowchart TD
    Start["createOrUpdateDebeziumConnector()"] -->|"Iterate Connectors"| Loop["For Each Connector"]
    
    Loop -->|"Extract Name"| GetName["Get Connector Name"]
    GetName -->|"Check Existence"| CheckExists["GET /connectors/{name}"]
    
    CheckExists -->|"200 OK"| Exists["Connector Exists"]
    CheckExists -->|"404 Not Found"| NotExists["Connector Missing"]
    
    Exists -->|"Update Config"| Update["PUT /connectors/{name}/config"]
    Update -->|"Success"| LogUpdate["Log Update Success"]
    LogUpdate -->|"Next"| Loop
    
    NotExists -->|"Create New"| Create["POST /connectors"]
    Create -->|"Success"| LogCreate["Log Create Success"]
    Create -->|"Error"| LogError["Log Error"]
    LogCreate -->|"Next"| Loop
    LogError -->|"Next"| Loop
    
    Loop -->|"All Complete"| End["Return"]
    
    style Start fill:#4A90E2,stroke:#2E5C8A,color:#fff
    style Exists fill:#F39C12,stroke:#C87F0A,color:#fff
    style NotExists fill:#E74C3C,stroke:#C0392B,color:#fff
    style Update fill:#50C878,stroke:#2E7D4E,color:#fff
    style Create fill:#50C878,stroke:#2E7D4E,color:#fff
```

**Connector Configuration Format:**

```json
{
    "name": "mongodb-integrated-tools-connector",
    "config": {
        "connector.class": "io.debezium.connector.mongodb.MongoDbConnector",
        "mongodb.connection.string": "mongodb://localhost:27017",
        "mongodb.connection.mode": "replica_set",
        "topic.prefix": "openframe",
        "collection.include.list": "openframe.integrated_tools",
        "transforms": "unwrap",
        "transforms.unwrap.type": "io.debezium.transforms.ExtractNewRecordState"
    }
}
```

**API Operations:**

| Operation | Method | Endpoint | Purpose |
|-----------|--------|----------|---------|
| List Connectors | `GET` | `/connectors` | Get all connector names |
| Get Status | `GET` | `/connectors/{name}/status` | Check connector health |
| Create | `POST` | `/connectors` | Create new connector |
| Update Config | `PUT` | `/connectors/{name}/config` | Update existing connector |
| Restart Task | `POST` | `/connectors/{name}/tasks/{id}/restart` | Restart failed task |

**Configuration:**

```yaml
openframe:
  debezium:
    base-url: http://debezium-connect:8083
```

**See:** [Management Service CDC Management](management_service_cdc_management.md) for health monitoring details.

---

## Process Flows

### Tool Save Operation

```mermaid
sequenceDiagram
    participant Client
    participant Controller as IntegratedToolController
    participant Service as IntegratedToolService
    participant MongoDB
    participant Debezium as DebeziumService
    participant Connect as Debezium Connect
    participant Hooks as Post-Save Hooks
    
    Client->>Controller: POST /v1/tools/{id}
    activate Controller
    
    Controller->>Controller: Validate Request
    Controller->>Controller: Set tool.id = {id}
    Controller->>Controller: Set tool.enabled = true
    
    Controller->>Service: saveTool(tool)
    activate Service
    Service->>MongoDB: save(tool)
    MongoDB-->>Service: savedTool
    Service-->>Controller: savedTool
    deactivate Service
    
    Controller->>Controller: Log success
    
    Controller->>Debezium: createOrUpdateDebeziumConnector(connectors)
    activate Debezium
    
    loop For Each Connector
        Debezium->>Connect: GET /connectors/{name}
        alt Connector Exists
            Connect-->>Debezium: 200 OK
            Debezium->>Connect: PUT /connectors/{name}/config
            Connect-->>Debezium: Updated
        else Connector Missing
            Connect-->>Debezium: 404 Not Found
            Debezium->>Connect: POST /connectors
            Connect-->>Debezium: Created
        end
    end
    
    Debezium-->>Controller: Complete
    deactivate Debezium
    
    loop For Each Hook
        Controller->>Hooks: onToolSaved(id, savedTool)
        activate Hooks
        alt Hook Success
            Hooks-->>Controller: Success
        else Hook Failure
            Hooks-->>Controller: Exception
            Controller->>Controller: Log warning (continue)
        end
        deactivate Hooks
    end
    
    Controller-->>Client: 200 OK {"status": "success", "tool": {...}}
    deactivate Controller
```

### Tool Retrieval Operations

```mermaid
sequenceDiagram
    participant Client
    participant Controller as IntegratedToolController
    participant Service as IntegratedToolService
    participant Repository as IntegratedToolRepository
    participant MongoDB
    
    Note over Client,MongoDB: Get All Tools
    Client->>Controller: GET /v1/tools
    activate Controller
    Controller->>Service: getAllTools()
    activate Service
    Service->>Repository: findAll()
    activate Repository
    Repository->>MongoDB: db.integrated_tools.find({})
    MongoDB-->>Repository: List<IntegratedTool>
    Repository-->>Service: List<IntegratedTool>
    deactivate Repository
    Service-->>Controller: List<IntegratedTool>
    deactivate Service
    Controller-->>Client: {"status": "success", "tools": [...]}
    deactivate Controller
    
    Note over Client,MongoDB: Get Specific Tool
    Client->>Controller: GET /v1/tools/{id}
    activate Controller
    Controller->>Service: getTool(id)
    activate Service
    Service->>Repository: findByType(id)
    activate Repository
    Repository->>MongoDB: db.integrated_tools.findOne({type: id})
    alt Tool Found
        MongoDB-->>Repository: IntegratedTool
        Repository-->>Service: Optional<IntegratedTool>
        Service-->>Controller: Optional<IntegratedTool>
        Controller-->>Client: {"status": "success", "tool": {...}}
    else Tool Not Found
        MongoDB-->>Repository: null
        Repository-->>Service: Optional.empty()
        Service-->>Controller: Optional.empty()
        Controller-->>Client: {"status": "error", "message": "Tool not found"}
    end
    deactivate Repository
    deactivate Service
    deactivate Controller
```

---

## Configuration

### Application Properties

```yaml
# Tool Integration Feature Toggle
openframe:
  integration:
    tool:
      enabled: true  # Enable IntegratedToolService

# Debezium Connect Configuration
openframe:
  debezium:
    base-url: http://debezium-connect:8083
    health-check:
      enabled: true
      interval: 300000  # 5 minutes

# MongoDB Configuration
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/openframe
      database: openframe
```

### Component Activation

**IntegratedToolService Conditions:**

```java
@Service
@ConditionalOnProperty(
    name = "openframe.integration.tool.enabled", 
    havingValue = "true"
)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class IntegratedToolService {
    // Service implementation
}
```

**Requirements:**
- Property `openframe.integration.tool.enabled=true`
- Servlet-based web application context
- MongoDB connection available

---

## Extension Points

### Implementing Custom Post-Save Hooks

**Step 1: Create Hook Implementation**

```java
package com.openframe.management.hook.impl;

import com.openframe.data.document.tool.IntegratedTool;
import com.openframe.management.hook.IntegratedToolPostSaveHook;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class CustomToolHook implements IntegratedToolPostSaveHook {
    
    private final CustomService customService;
    
    @Override
    public void onToolSaved(String toolId, IntegratedTool tool) {
        log.info("Custom hook executing for tool: {}", toolId);
        
        try {
            // Perform custom logic
            customService.handleToolUpdate(tool);
            
            log.info("Custom hook completed for: {}", toolId);
        } catch (Exception e) {
            log.error("Custom hook failed for: {}", toolId, e);
            throw e; // Will be caught by controller
        }
    }
}
```

**Step 2: Register as Spring Bean**

The hook is automatically discovered via Spring component scanning when annotated with `@Component`.

**Step 3: Verify Registration**

```bash
# Check application logs on startup
grep "IntegratedToolPostSaveHook" application.log

# Expected output:
# Found 3 IntegratedToolPostSaveHook implementations:
#   - ToolAgentDeploymentHook
#   - CacheInvalidationHook
#   - CustomToolHook
```

### Async Hook Execution Pattern

For long-running operations, use async execution:

```java
@Slf4j
@Component
@RequiredArgsConstructor
public class AsyncToolHook implements IntegratedToolPostSaveHook {
    
    private final AsyncService asyncService;
    
    @Override
    public void onToolSaved(String toolId, IntegratedTool tool) {
        log.info("Triggering async processing for: {}", toolId);
        
        // Trigger async operation (returns immediately)
        asyncService.processToolUpdateAsync(toolId, tool);
        
        log.info("Async processing triggered for: {}", toolId);
    }
}

@Service
public class AsyncService {
    
    @Async("toolHookExecutor")
    public void processToolUpdateAsync(String toolId, IntegratedTool tool) {
        // Long-running operation executes in separate thread
        // ...
    }
}
```

**Async Configuration:**

```java
@Configuration
@EnableAsync
public class AsyncConfig {
    
    @Bean(name = "toolHookExecutor")
    public Executor toolHookExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(5);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("tool-hook-");
        executor.initialize();
        return executor;
    }
}
```

---

## API Reference

### REST Endpoints

#### List All Tools

```http
GET /v1/tools HTTP/1.1
Host: management-service:8080
Accept: application/json
```

**Response:**

```json
{
    "status": "success",
    "tools": [
        {
            "id": "tactical-rmm",
            "name": "Tactical RMM",
            "description": "Remote Monitoring and Management",
            "type": "tactical-rmm",
            "enabled": true,
            "toolUrls": [
                {
                    "url": "https://rmm.example.com",
                    "type": "web"
                }
            ],
            "credentials": {
                "apiKey": "***",
                "apiUrl": "https://rmm.example.com/api"
            },
            "debeziumConnectors": [
                {
                    "name": "tactical-rmm-connector",
                    "config": { /* ... */ }
                }
            ]
        }
    ]
}
```

#### Get Specific Tool

```http
GET /v1/tools/tactical-rmm HTTP/1.1
Host: management-service:8080
Accept: application/json
```

**Response (Success):**

```json
{
    "status": "success",
    "tool": {
        "id": "tactical-rmm",
        "name": "Tactical RMM",
        "enabled": true
        // ... other fields
    }
}
```

**Response (Not Found):**

```json
{
    "status": "error",
    "message": "Tool not found"
}
```

#### Create or Update Tool

```http
POST /v1/tools/tactical-rmm HTTP/1.1
Host: management-service:8080
Content-Type: application/json

{
    "tool": {
        "name": "Tactical RMM",
        "description": "Remote Monitoring and Management Platform",
        "type": "tactical-rmm",
        "toolUrls": [
            {
                "url": "https://rmm.example.com",
                "type": "web"
            }
        ],
        "credentials": {
            "apiKey": "your-api-key",
            "apiUrl": "https://rmm.example.com/api"
        },
        "debeziumConnectors": [
            {
                "name": "tactical-rmm-connector",
                "config": {
                    "connector.class": "io.debezium.connector.mongodb.MongoDbConnector",
                    "mongodb.connection.string": "mongodb://localhost:27017",
                    "topic.prefix": "tactical-rmm",
                    "collection.include.list": "tactical.agents"
                }
            }
        ],
        "healthCheckEndpoint": "/api/health",
        "healthCheckInterval": 60
    }
}
```

**Response (Success):**

```json
{
    "status": "success",
    "tool": {
        "id": "tactical-rmm",
        "name": "Tactical RMM",
        "enabled": true,
        // ... complete saved tool
    }
}
```

**Response (Error):**

```json
{
    "status": "error",
    "message": "Failed to create Debezium connector: Connection refused"
}
```

---

## Error Handling

### Error Categories

```mermaid
flowchart TD
    Error["Error Occurs"] --> Category{Error Category}
    
    Category -->|"Validation Error"| Validation["Request Validation"]
    Category -->|"Persistence Error"| Persistence["MongoDB Error"]
    Category -->|"CDC Error"| CDC["Debezium Error"]
    Category -->|"Hook Error"| Hook["Post-Save Hook Error"]
    
    Validation -->|"400 Bad Request"| ClientError["Return Error Response"]
    Persistence -->|"500 Internal Error"| ServerError["Return Error Response"]
    CDC -->|"500 Internal Error"| ServerError
    Hook -->|"Log Warning"| Continue["Continue Processing"]
    
    Continue -->|"Return Success"| Success["200 OK with Tool"]
    
    style Error fill:#E74C3C,stroke:#C0392B,color:#fff
    style Validation fill:#F39C12,stroke:#C87F0A,color:#fff
    style Hook fill:#9B59B6,stroke:#6C3483,color:#fff
    style Success fill:#50C878,stroke:#2E7D4E,color:#fff
```

### Error Response Format

**Standard Error Response:**

```json
{
    "status": "error",
    "message": "Detailed error message",
    "timestamp": "2024-01-15T10:30:00Z",
    "path": "/v1/tools/tactical-rmm"
}
```

### Common Error Scenarios

| Scenario | HTTP Status | Response | Resolution |
|----------|-------------|----------|------------|
| Tool not found | 200 OK | `{"status": "error", "message": "Tool not found"}` | Verify tool ID exists |
| Invalid request body | 400 Bad Request | Validation error details | Check request format |
| MongoDB connection failure | 500 Internal Error | `{"status": "error", "message": "Database error"}` | Check MongoDB connectivity |
| Debezium Connect unavailable | 500 Internal Error | `{"status": "error", "message": "CDC service unavailable"}` | Verify Debezium Connect is running |
| Hook execution failure | 200 OK | Success (hook error logged) | Check application logs for hook details |

### Logging Strategy

**Log Levels:**

```java
// Success operations
log.info("Successfully saved tool configuration for: {}", id);

// Hook failures (non-critical)
log.warn("Post-save hook failed for toolId={}: {}", id, ex.getMessage(), ex);

// Service failures (critical)
log.error("Failed to save tool: {}", id, e);

// Debezium operations
log.info("Connector '{}' created. Response: {}", name, response.getStatusCode());
log.error("Failed to create connector '{}'", name, e);
```

**Log Correlation:**

All operations include the `toolId` for traceability:

```text
2024-01-15 10:30:00 INFO  [http-nio-8080-exec-1] IntegratedToolController - Successfully saved tool configuration for: tactical-rmm
2024-01-15 10:30:01 INFO  [http-nio-8080-exec-1] DebeziumService - Connector 'tactical-rmm-connector' created. Response: 201
2024-01-15 10:30:02 WARN  [http-nio-8080-exec-1] IntegratedToolController - Post-save hook failed for toolId=tactical-rmm: Connection timeout
```

---

## Monitoring and Observability

### Key Metrics

**Application Metrics:**

```yaml
# Prometheus metrics exposed at /actuator/prometheus

# Request metrics
http_server_requests_seconds_count{uri="/v1/tools",method="GET"}
http_server_requests_seconds_count{uri="/v1/tools/{id}",method="POST"}

# Tool operation metrics
tool_save_operations_total{status="success"}
tool_save_operations_total{status="error"}

# Hook execution metrics
tool_hook_executions_total{hook="ToolAgentDeploymentHook",status="success"}
tool_hook_executions_total{hook="ToolAgentDeploymentHook",status="failure"}

# Debezium connector metrics
debezium_connector_operations_total{operation="create",status="success"}
debezium_connector_operations_total{operation="update",status="success"}
```

### Health Checks

**Endpoint:** `/actuator/health`

```json
{
    "status": "UP",
    "components": {
        "mongo": {
            "status": "UP",
            "details": {
                "version": "6.0.3"
            }
        },
        "debezium": {
            "status": "UP",
            "details": {
                "connectors": 3,
                "healthy": 3,
                "failed": 0
            }
        }
    }
}
```

### Logging Best Practices

**Structured Logging:**

```java
// Use structured logging with context
log.info("Tool operation completed", 
    kv("toolId", toolId),
    kv("operation", "save"),
    kv("duration", duration),
    kv("hookCount", postSaveHooks.size())
);
```

**Correlation IDs:**

```java
// Add correlation ID to MDC for request tracing
MDC.put("correlationId", UUID.randomUUID().toString());
MDC.put("toolId", toolId);

try {
    // Perform operations
} finally {
    MDC.clear();
}
```

---

## Testing

### Unit Testing

**Controller Test Example:**

```java
@WebMvcTest(IntegratedToolController.class)
class IntegratedToolControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private IntegratedToolService toolService;
    
    @MockBean
    private DebeziumService debeziumService;
    
    @MockBean
    private List<IntegratedToolPostSaveHook> postSaveHooks;
    
    @Test
    void saveTool_Success() throws Exception {
        // Given
        IntegratedTool tool = IntegratedTool.builder()
            .id("test-tool")
            .name("Test Tool")
            .enabled(true)
            .build();
        
        when(toolService.saveTool(any())).thenReturn(tool);
        
        // When & Then
        mockMvc.perform(post("/v1/tools/test-tool")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"tool\": {\"name\": \"Test Tool\"}}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("success"))
            .andExpect(jsonPath("$.tool.id").value("test-tool"));
        
        verify(toolService).saveTool(any());
        verify(debeziumService).createOrUpdateDebeziumConnector(any());
    }
    
    @Test
    void saveTool_HookFailure_StillSucceeds() throws Exception {
        // Given
        IntegratedTool tool = IntegratedTool.builder()
            .id("test-tool")
            .build();
        
        when(toolService.saveTool(any())).thenReturn(tool);
        
        IntegratedToolPostSaveHook failingHook = mock(IntegratedToolPostSaveHook.class);
        doThrow(new RuntimeException("Hook failed"))
            .when(failingHook).onToolSaved(anyString(), any());
        
        when(postSaveHooks.iterator())
            .thenReturn(List.of(failingHook).iterator());
        
        // When & Then
        mockMvc.perform(post("/v1/tools/test-tool")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"tool\": {}}"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("success"));
    }
}
```

### Integration Testing

**Full Flow Test:**

```java
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class IntegratedToolIntegrationTest {
    
    @Container
    static MongoDBContainer mongodb = new MongoDBContainer("mongo:6.0");
    
    @Container
    static GenericContainer<?> debezium = new GenericContainer<>("debezium/connect:2.4")
        .withExposedPorts(8083);
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private IntegratedToolRepository toolRepository;
    
    @DynamicPropertySource
    static void setProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", mongodb::getReplicaSetUrl);
        registry.add("openframe.debezium.base-url", 
            () -> "http://localhost:" + debezium.getMappedPort(8083));
    }
    
    @Test
    void fullToolSaveFlow() throws Exception {
        // When
        mockMvc.perform(post("/v1/tools/integration-test-tool")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "tool": {
                            "name": "Integration Test Tool",
                            "type": "test",
                            "debeziumConnectors": [
                                {
                                    "name": "test-connector",
                                    "config": {
                                        "connector.class": "io.debezium.connector.mongodb.MongoDbConnector"
                                    }
                                }
                            ]
                        }
                    }
                    """))
            .andExpect(status().isOk());
        
        // Then - Verify MongoDB persistence
        Optional<IntegratedTool> saved = toolRepository.findById("integration-test-tool");
        assertThat(saved).isPresent();
        assertThat(saved.get().getName()).isEqualTo("Integration Test Tool");
        assertThat(saved.get().isEnabled()).isTrue();
    }
}
```

---

## Troubleshooting

### Common Issues

#### Issue: Tool Save Returns 500 Error

**Symptoms:**
```json
{
    "status": "error",
    "message": "Failed to save tool: Connection refused"
}
```

**Possible Causes:**
1. MongoDB connection failure
2. Debezium Connect unavailable
3. Invalid connector configuration

**Resolution Steps:**

```bash
# 1. Check MongoDB connectivity
mongosh --host localhost:27017 --eval "db.adminCommand('ping')"

# 2. Verify Debezium Connect is running
curl http://localhost:8083/connectors

# 3. Check application logs
kubectl logs -f deployment/management-service | grep "Failed to save tool"

# 4. Validate connector configuration
curl -X GET http://localhost:8083/connector-plugins
```

#### Issue: Post-Save Hook Not Executing

**Symptoms:**
- Tool saves successfully
- Expected hook side effects don't occur
- No hook execution logs

**Possible Causes:**
1. Hook not registered as Spring bean
2. Component scanning not including hook package
3. Hook implementation has wrong method signature

**Resolution Steps:**

```bash
# 1. Verify hook is registered
curl http://localhost:8080/actuator/beans | jq '.contexts[].beans | keys[]' | grep Hook

# 2. Check component scanning configuration
# In @SpringBootApplication or @Configuration:
@ComponentScan(basePackages = {
    "com.openframe.management",
    "com.custom.hooks"  // Add custom hook package
})

# 3. Verify hook implements correct interface
public class MyHook implements IntegratedToolPostSaveHook {
    @Override
    public void onToolSaved(String toolId, IntegratedTool tool) {
        // Implementation
    }
}
```

#### Issue: Debezium Connector Creation Fails

**Symptoms:**
```text
ERROR DebeziumService - Failed to create connector 'my-connector'
```

**Possible Causes:**
1. Invalid connector configuration
2. Debezium Connect not ready
3. Source database not accessible

**Resolution Steps:**

```bash
# 1. Validate connector config manually
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d @connector-config.json

# 2. Check Debezium Connect logs
kubectl logs -f deployment/debezium-connect

# 3. Verify source database connectivity from Debezium
kubectl exec -it deployment/debezium-connect -- \
  curl -v mongodb://source-db:27017

# 4. Check connector status
curl http://localhost:8083/connectors/my-connector/status
```

### Debug Mode

**Enable Debug Logging:**

```yaml
logging:
  level:
    com.openframe.management.controller: DEBUG
    com.openframe.management.hook: DEBUG
    com.openframe.management.service: DEBUG
    com.openframe.data.service: DEBUG
```

**Debug Output Example:**

```text
DEBUG IntegratedToolController - Received save request for tool: tactical-rmm
DEBUG IntegratedToolController - Tool configuration: IntegratedTool(id=tactical-rmm, name=Tactical RMM, ...)
DEBUG IntegratedToolService - Saving tool to MongoDB: tactical-rmm
DEBUG IntegratedToolService - Tool saved successfully: tactical-rmm
DEBUG DebeziumService - Processing 2 Debezium connectors
DEBUG DebeziumService - Checking connector: tactical-rmm-agents
DEBUG DebeziumService - Connector tactical-rmm-agents exists, updating config
DEBUG IntegratedToolController - Executing 3 post-save hooks
DEBUG ToolAgentDeploymentHook - Deploying agents for tool: tactical-rmm
```

---

## Security Considerations

### Authentication & Authorization

**Controller Security:**

```java
@RestController
@RequestMapping("/v1/tools")
@PreAuthorize("hasRole('ADMIN')")  // Require ADMIN role
public class IntegratedToolController {
    // Endpoints
}
```

**Method-Level Security:**

```java
@GetMapping
@PreAuthorize("hasAnyRole('ADMIN', 'VIEWER')")
public Map<String, Object> getTools() {
    // Read-only operation
}

@PostMapping("/{id}")
@PreAuthorize("hasRole('ADMIN')")
public ResponseEntity<Map<String, Object>> saveTool(...) {
    // Write operation - admin only
}
```

### Credential Management

**Sensitive Data Handling:**

```java
// Never log credentials
log.info("Saving tool: {}", tool.getId());  // ✅ Safe
log.info("Tool config: {}", tool);          // ❌ May expose credentials

// Mask credentials in responses
public IntegratedTool sanitize(IntegratedTool tool) {
    if (tool.getCredentials() != null) {
        tool.getCredentials().setApiKey("***");
        tool.getCredentials().setPassword("***");
    }
    return tool;
}
```

**Environment-Based Secrets:**

```yaml
# Use environment variables for sensitive config
openframe:
  debezium:
    base-url: ${DEBEZIUM_URL:http://localhost:8083}
    auth:
      username: ${DEBEZIUM_USERNAME}
      password: ${DEBEZIUM_PASSWORD}
```

### Input Validation

**Request Validation:**

```java
@PostMapping("/{id}")
public ResponseEntity<Map<String, Object>> saveTool(
        @PathVariable @Pattern(regexp = "[a-z0-9-]+") String id,
        @RequestBody @Valid SaveToolRequest request) {
    // Validated input
}

@Data
public static class SaveToolRequest {
    @NotNull(message = "Tool configuration is required")
    @Valid
    private IntegratedTool tool;
}
```

---

## Performance Considerations

### Optimization Strategies

**1. Async Hook Execution:**

```java
// Execute long-running hooks asynchronously
@Async("toolHookExecutor")
public void onToolSaved(String toolId, IntegratedTool tool) {
    // Long-running operation
}
```

**2. Debezium Connector Batching:**

```java
// Process connectors in parallel
public void createOrUpdateDebeziumConnector(Object[] connectors) {
    if (connectors == null) return;
    
    Arrays.stream(connectors)
        .parallel()
        .forEach(this::processConnector);
}
```

**3. Caching Tool Configurations:**

```java
@Service
public class CachedIntegratedToolService {
    
    @Cacheable(value = "tools", key = "#toolId")
    public Optional<IntegratedTool> getTool(String toolId) {
        return toolRepository.findById(toolId);
    }
    
    @CacheEvict(value = "tools", key = "#tool.id")
    public IntegratedTool saveTool(IntegratedTool tool) {
        return toolRepository.save(tool);
    }
}
```

### Performance Metrics

**Expected Response Times:**

| Operation | Target | Acceptable | Notes |
|-----------|--------|------------|-------|
| GET /v1/tools | < 100ms | < 500ms | Depends on tool count |
| GET /v1/tools/{id} | < 50ms | < 200ms | Single document query |
| POST /v1/tools/{id} | < 2s | < 5s | Includes CDC provisioning |

**Bottleneck Analysis:**

```mermaid
flowchart LR
    Request["Request"] -->|"~10ms"| Validation["Validation"]
    Validation -->|"~50ms"| MongoDB["MongoDB Save"]
    MongoDB -->|"~1-2s"| Debezium["Debezium CDC"]
    Debezium -->|"~100ms"| Hooks["Post-Save Hooks"]
    Hooks -->|"~10ms"| Response["Response"]
    
    style Debezium fill:#E74C3C,stroke:#C0392B,color:#fff
    style MongoDB fill:#F39C12,stroke:#C87F0A,color:#fff
```

**Optimization Priority:**
1. **Debezium CDC** (1-2s) - Consider async processing
2. **Post-Save Hooks** (variable) - Use async execution
3. **MongoDB Save** (50ms) - Optimize indexes

---

## Related Documentation

- **[Management Service Configuration](management_service_configuration.md)** - Service configuration and properties
- **[Management Service CDC Management](management_service_cdc_management.md)** - Debezium health monitoring and connector management
- **[Management Service Agent Management](management_service_agent_management.md)** - Tool agent initialization and deployment
- **[Data Layer MongoDB](data_layer_mongo.md)** - IntegratedTool document model and repository
- **[API Service](api_service.md)** - External API for tool queries
- **[Stream Processing](stream_processing.md)** - CDC event processing

---

## Summary

The **Tool Management Module** provides a robust, extensible system for managing integrated third-party tools within the OpenFrame platform. Key capabilities include:

✅ **RESTful API** for tool CRUD operations  
✅ **Automatic CDC provisioning** via Debezium Connect  
✅ **Extensible hook system** for custom post-save logic  
✅ **Fault-tolerant design** with isolated error handling  
✅ **MongoDB persistence** with structured document model  
✅ **Comprehensive logging** and observability  

**Architecture Highlights:**
- Clean separation of concerns (Controller → Service → Repository)
- Non-blocking hook execution with error isolation
- Idempotent CDC connector provisioning
- Flexible extension points for custom integrations

**Next Steps:**
- Review [Management Service Agent Management](management_service_agent_management.md) for agent deployment workflows
- Explore [Management Service CDC Management](management_service_cdc_management.md) for connector health monitoring
- See [Data Layer MongoDB](data_layer_mongo.md) for complete data model documentation

---

**Version:** 1.0  
**Last Updated:** 2024-01-15  
**Maintained By:** OpenFrame Platform Team
