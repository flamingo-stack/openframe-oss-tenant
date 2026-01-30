# Client Service Registration & Authentication Module

## Overview

The **Client Service Registration & Authentication** module is a critical component of the OpenFrame platform that manages the secure onboarding and authentication of agent clients (desktop/server machines) into the system. This module provides REST endpoints for agent registration, OAuth 2.0-based authentication, and extensible post-registration processing hooks.

**Key Responsibilities:**
- **Agent Registration**: Secure onboarding of new machines with validation and credential generation
- **OAuth 2.0 Authentication**: Token issuance and refresh for registered agents using client credentials flow
- **Organization Assignment**: Automatic or explicit assignment of machines to organizations
- **Tool Integration**: Automatic installation of integrated tools (Fleet MDM, Tactical RMM, MeshCentral) on registered machines
- **Extensibility**: Plugin architecture for custom post-registration processing

**Related Modules:**
- [Authorization Service](authorization_service.md) - OAuth 2.0 server for user authentication
- [Data Layer MongoDB](data_layer_mongo.md) - Persistence layer for machines and OAuth clients
- [Security Core](security_core.md) - JWT token generation and validation

---

## Architecture

### High-Level Component Diagram

```mermaid
flowchart TD
    Agent["Agent Client<br/>(Desktop/Server)"] -->|"POST /api/agents/register"| AgentController["AgentController"]
    Agent -->|"POST /oauth/token"| AgentAuthController["AgentAuthController"]
    
    AgentController -->|"register()"| AgentRegistrationService["AgentRegistrationService"]
    AgentAuthController -->|"issueClientToken()"| AgentAuthService["AgentAuthService"]
    
    AgentRegistrationService -->|"validate()"| SecretValidator["AgentRegistrationSecretValidator"]
    AgentRegistrationService -->|"generate()"| MachineIdGenerator["MachineIdGenerator"]
    AgentRegistrationService -->|"generate()"| AgentSecretGenerator["AgentSecretGenerator"]
    AgentRegistrationService -->|"save()"| OAuthClientRepo["OAuthClientRepository"]
    AgentRegistrationService -->|"save()"| MachineRepo["MachineRepository"]
    AgentRegistrationService -->|"process()"| ToolInstallationService["AgentRegistrationToolInstallationService"]
    AgentRegistrationService -->|"postProcessAgentRegistration()"| AgentRegistrationProcessor["AgentRegistrationProcessor"]
    
    AgentAuthService -->|"handle()"| ClientCredentialsHandler["ClientCredentialsHandler"]
    AgentAuthService -->|"handle()"| RefreshTokenHandler["RefreshTokenHandler"]
    
    ClientCredentialsHandler -->|"generate()"| AccessTokenGenerator["AccessTokenGenerator"]
    ClientCredentialsHandler -->|"generate()"| RefreshTokenGenerator["RefreshTokenGenerator"]
    
    RefreshTokenHandler -->|"decodeToken()"| JwtService["JwtService"]
    RefreshTokenHandler -->|"generate()"| AccessTokenGenerator
    
    style AgentController fill:#e1f5ff
    style AgentAuthController fill:#e1f5ff
    style AgentRegistrationService fill:#fff4e1
    style AgentAuthService fill:#fff4e1
    style AgentRegistrationProcessor fill:#e8f5e9
```

### Registration Flow Sequence

```mermaid
sequenceDiagram
    participant Agent as Agent Client
    participant Controller as AgentController
    participant Service as AgentRegistrationService
    participant Validator as SecretValidator
    participant OAuthRepo as OAuthClientRepository
    participant MachineRepo as MachineRepository
    participant ToolService as ToolInstallationService
    participant Processor as AgentRegistrationProcessor
    
    Agent->>Controller: POST /api/agents/register<br/>X-Initial-Key: secret<br/>Body: AgentRegistrationRequest
    
    Controller->>Service: register(initialKey, request)
    
    Service->>Validator: validate(initialKey)
    Validator->>Validator: Check against active secret
    Validator-->>Service: ✓ Valid
    
    Service->>Service: generate machineId
    Service->>Service: generate clientId (agent_machineId)
    Service->>Service: generate clientSecret
    
    Service->>OAuthRepo: save(OAuthClient)
    OAuthRepo-->>Service: ✓ Saved
    
    Service->>MachineRepo: save(Machine)
    MachineRepo-->>Service: ✓ Saved
    
    Service->>ToolService: process(machineId)
    ToolService->>ToolService: Install Fleet MDM, Tactical RMM, etc.
    ToolService-->>Service: ✓ Tools installed
    
    Service->>Processor: postProcessAgentRegistration(machine, request)
    Processor->>Processor: Custom processing (optional)
    Processor-->>Service: ✓ Complete
    
    Service-->>Controller: AgentRegistrationResponse
    Controller-->>Agent: 200 OK<br/>{machineId, clientId, clientSecret}
```

### Authentication Flow Sequence

```mermaid
sequenceDiagram
    participant Agent as Agent Client
    participant Controller as AgentAuthController
    participant AuthService as AgentAuthService
    participant Handler as ClientCredentialsHandler
    participant OAuthRepo as OAuthClientRepository
    participant AccessGen as AccessTokenGenerator
    participant RefreshGen as RefreshTokenGenerator
    
    Agent->>Controller: POST /oauth/token<br/>grant_type=client_credentials<br/>client_id=agent_xxx<br/>client_secret=secret
    
    Controller->>AuthService: issueClientToken(grantType, ...)
    
    AuthService->>Handler: handle(clientId, clientSecret)
    
    Handler->>OAuthRepo: findByClientId(clientId)
    OAuthRepo-->>Handler: OAuthClient
    
    Handler->>Handler: validateClientSecret()
    Handler->>Handler: ✓ Password matches
    
    Handler->>AccessGen: generate(client, grantType)
    AccessGen-->>Handler: JWT access token
    
    Handler->>RefreshGen: generate(clientId)
    RefreshGen-->>Handler: JWT refresh token
    
    Handler-->>AuthService: AgentTokenResponse
    AuthService-->>Controller: AgentTokenResponse
    Controller-->>Agent: 200 OK<br/>{accessToken, refreshToken, tokenType, expiresIn}
```

### Token Refresh Flow

```mermaid
sequenceDiagram
    participant Agent as Agent Client
    participant Controller as AgentAuthController
    participant AuthService as AgentAuthService
    participant RefreshHandler as RefreshTokenHandler
    participant JwtService as JwtService
    participant OAuthRepo as OAuthClientRepository
    participant AccessGen as AccessTokenGenerator
    participant RefreshGen as RefreshTokenGenerator
    
    Agent->>Controller: POST /oauth/token<br/>grant_type=refresh_token<br/>refresh_token=xxx
    
    Controller->>AuthService: issueClientToken(grantType, refreshToken, ...)
    
    AuthService->>RefreshHandler: handle(refreshToken)
    
    RefreshHandler->>JwtService: decodeToken(refreshToken)
    JwtService-->>RefreshHandler: Jwt (decoded)
    
    RefreshHandler->>RefreshHandler: validateExpiration()
    RefreshHandler->>RefreshHandler: validateRefreshCount()
    
    RefreshHandler->>OAuthRepo: findByClientId(clientId)
    OAuthRepo-->>RefreshHandler: OAuthClient
    
    RefreshHandler->>AccessGen: generate(client, grantType)
    AccessGen-->>RefreshHandler: New access token
    
    RefreshHandler->>RefreshGen: generateNext(clientId, refreshCount)
    RefreshGen-->>RefreshHandler: New refresh token (count+1)
    
    RefreshHandler-->>AuthService: AgentTokenResponse
    AuthService-->>Controller: AgentTokenResponse
    Controller-->>Agent: 200 OK<br/>{accessToken, refreshToken, tokenType, expiresIn}
```

---

## Core Components

### 1. AgentController

**Purpose**: REST controller exposing agent registration endpoint.

**Location**: `com.openframe.client.controller.AgentController`

**Endpoints**:

| Method | Path | Description | Headers | Request Body | Response |
|--------|------|-------------|---------|--------------|----------|
| POST | `/api/agents/register` | Register new agent | `X-Initial-Key: <secret>` | `AgentRegistrationRequest` | `AgentRegistrationResponse` |

**Key Features**:
- Validates initial registration key via header
- Delegates registration logic to `AgentRegistrationService`
- Returns OAuth credentials for subsequent authentication

**Example Request**:

```bash
curl -X POST http://localhost:8080/api/agents/register \
  -H "X-Initial-Key: your-secret-key" \
  -H "Content-Type: application/json" \
  -d '{
    "hostname": "workstation-01",
    "ip": "192.168.1.100",
    "macAddress": "00:1B:63:84:45:E6",
    "osType": "Windows",
    "osVersion": "11",
    "agentVersion": "1.0.0",
    "organizationId": "org-123"
  }'
```

**Example Response**:

```json
{
  "machineId": "mch_a1b2c3d4e5f6",
  "clientId": "agent_mch_a1b2c3d4e5f6",
  "clientSecret": "secret_xyz789abc456"
}
```

---

### 2. AgentAuthController

**Purpose**: OAuth 2.0 token endpoint for agent authentication.

**Location**: `com.openframe.client.controller.AgentAuthController`

**Endpoints**:

| Method | Path | Description | Parameters | Response |
|--------|------|-------------|------------|----------|
| POST | `/oauth/token` | Issue or refresh access token | `grant_type`, `client_id`, `client_secret`, `refresh_token` | `AgentTokenResponse` |

**Supported Grant Types**:

1. **Client Credentials** (`grant_type=client_credentials`)
   - Used for initial authentication after registration
   - Requires `client_id` and `client_secret`

2. **Refresh Token** (`grant_type=refresh_token`)
   - Used to obtain new access token without re-authentication
   - Requires `refresh_token`

**Example Client Credentials Request**:

```bash
curl -X POST http://localhost:8080/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=agent_mch_a1b2c3d4e5f6" \
  -d "client_secret=secret_xyz789abc456"
```

**Example Refresh Token Request**:

```bash
curl -X POST http://localhost:8080/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Example Response**:

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

---

### 3. AgentRegistrationService

**Purpose**: Core business logic for agent registration orchestration.

**Location**: `com.openframe.client.service.agentregistration.AgentRegistrationService`

**Key Responsibilities**:
1. **Secret Validation**: Verify initial registration key
2. **ID Generation**: Generate unique machine ID and OAuth client ID
3. **Credential Creation**: Generate client secret for OAuth authentication
4. **Organization Resolution**: Assign machine to organization (explicit or default)
5. **OAuth Client Persistence**: Store OAuth credentials
6. **Machine Persistence**: Store machine metadata
7. **Tool Installation**: Trigger installation of integrated tools
8. **Post-Processing**: Execute custom registration hooks

**Registration Process**:

```mermaid
flowchart TD
    Start["register(initialKey, request)"] --> Validate["Validate initial key"]
    Validate --> GenMachineId["Generate machineId"]
    GenMachineId --> GenClientId["Generate clientId<br/>(agent_machineId)"]
    GenClientId --> GenSecret["Generate clientSecret"]
    GenSecret --> ResolveOrg["Resolve organizationId"]
    
    ResolveOrg --> CheckOrgId{"organizationId<br/>provided?"}
    CheckOrgId -->|Yes| OrgExists{"Organization<br/>exists?"}
    CheckOrgId -->|No| DefaultOrg["Use default organization"]
    OrgExists -->|Yes| UseProvided["Use provided organizationId"]
    OrgExists -->|No| DefaultOrg
    
    UseProvided --> SaveOAuth["Save OAuthClient"]
    DefaultOrg --> SaveOAuth
    
    SaveOAuth --> SaveMachine["Save Machine"]
    SaveMachine --> InstallTools["Install integrated tools"]
    InstallTools --> PostProcess["Execute post-processing hooks"]
    PostProcess --> Return["Return AgentRegistrationResponse"]
    
    style Validate fill:#fff4e1
    style SaveOAuth fill:#e1f5ff
    style SaveMachine fill:#e1f5ff
    style PostProcess fill:#e8f5e9
```

**Organization Resolution Logic**:

The service implements intelligent organization assignment:

1. **Explicit Assignment**: If `organizationId` is provided in the request and exists, use it
2. **Default Fallback**: If no `organizationId` provided or invalid, assign to default organization
3. **Error Handling**: Throws `IllegalStateException` if default organization doesn't exist

**Code Example**:

```java
@Transactional
public AgentRegistrationResponse register(String initialKey, AgentRegistrationRequest request) {
    // 1. Validate secret
    secretValidator.validate(initialKey);
    
    // 2. Generate IDs and credentials
    String machineId = machineIdGenerator.generate();
    String clientId = buildClientId(machineId);
    String clientSecret = agentSecretGenerator.generate();
    
    // 3. Resolve organization
    String resolvedOrganizationId = resolveOrganizationId(request.getOrganizationId());
    
    // 4. Persist OAuth client
    saveOAuthClient(machineId, clientId, clientSecret);
    
    // 5. Persist machine
    Machine machine = saveMachine(machineId, request, resolvedOrganizationId);
    
    // 6. Install tools
    agentRegistrationToolInstallationService.process(machineId);
    
    // 7. Post-process
    agentRegistrationProcessor.postProcessAgentRegistration(machine, request);
    
    return new AgentRegistrationResponse(machineId, clientId, clientSecret);
}
```

---

### 4. AgentAuthService

**Purpose**: Orchestrates OAuth 2.0 token issuance and refresh.

**Location**: `com.openframe.client.service.AgentAuthService`

**Grant Type Routing**:

```mermaid
flowchart LR
    Request["issueClientToken(grantType, ...)"] --> Switch{"Grant Type?"}
    
    Switch -->|"client_credentials"| ClientCreds["ClientCredentialsHandler"]
    Switch -->|"refresh_token"| RefreshToken["RefreshTokenHandler"]
    Switch -->|"other"| Error["IllegalArgumentException"]
    
    ClientCreds --> Response["AgentTokenResponse"]
    RefreshToken --> Response
    
    style ClientCreds fill:#e1f5ff
    style RefreshToken fill:#e1f5ff
    style Error fill:#ffebee
```

**Supported Constants**:
- `CLIENT_CREDENTIALS_GRANT_TYPE = "client_credentials"`
- `REFRESH_TOKEN_GRANT_TYPE = "refresh_token"`

---

### 5. ClientCredentialsHandler

**Purpose**: Handles client credentials grant type authentication.

**Location**: `com.openframe.client.service.auth.ClientCredentialsHandler`

**Authentication Flow**:

1. **Client Lookup**: Retrieve `OAuthClient` by `clientId`
2. **Secret Validation**: Verify `clientSecret` using BCrypt password encoder
3. **Token Generation**: Generate JWT access token and refresh token
4. **Response Construction**: Return tokens with expiration metadata

**Security Features**:
- BCrypt password hashing for client secrets
- JWT-based tokens with RSA-256 signing
- Refresh token rotation with count tracking

**Code Example**:

```java
public AgentTokenResponse handle(String clientId, String clientSecret) {
    // 1. Find client
    OAuthClient client = clientRepository.findByClientId(clientId)
        .orElseThrow(() -> new IllegalArgumentException("Client not found"));
    
    // 2. Validate secret
    validateClientSecret(client, clientSecret);
    
    // 3. Generate tokens
    String accessToken = accessTokenGenerator.generate(client, CLIENT_CREDENTIALS_GRANT_TYPE);
    String refreshToken = refreshTokenGenerator.generate(client.getClientId());
    long accessTokenExpirationSeconds = accessTokenGenerator.getExpirationSeconds();
    
    return new AgentTokenResponse(
        accessToken,
        refreshToken,
        TOKEN_TYPE,
        accessTokenExpirationSeconds
    );
}
```

---

### 6. RefreshTokenHandler

**Purpose**: Handles refresh token grant type for token renewal.

**Location**: `com.openframe.client.service.auth.RefreshTokenHandler`

**Refresh Flow**:

1. **Token Decoding**: Decode and validate JWT refresh token
2. **Expiration Check**: Ensure token hasn't expired
3. **Refresh Count Validation**: Verify refresh count within limits
4. **Client Lookup**: Retrieve `OAuthClient` from token subject
5. **Token Generation**: Generate new access token and incremented refresh token

**Refresh Token Claims**:

```json
{
  "sub": "agent_mch_a1b2c3d4e5f6",
  "iat": 1704067200,
  "exp": 1704153600,
  "refresh_count": 0
}
```

**Validation Rules**:
- **Expiration**: Token must not be expired
- **Refresh Count**: Must be less than `maxRefreshCount` (configurable)
- **Client Existence**: Client must still exist in database

**Code Example**:

```java
public AgentTokenResponse handle(String refreshToken) {
    // 1. Decode token
    Jwt jwt = jwtService.decodeToken(refreshToken);
    
    // 2. Validate
    validateExpiration(jwt);
    Long refreshCount = jwt.getClaim("refresh_count");
    validateRefreshCount(refreshCount);
    
    // 3. Find client
    String clientId = jwt.getSubject();
    OAuthClient client = clientRepository.findByClientId(clientId)
        .orElseThrow(() -> new IllegalArgumentException("Client not found"));
    
    // 4. Generate new tokens
    String accessToken = accessTokenGenerator.generate(client, REFRESH_TOKEN_GRANT_TYPE);
    String newRefreshToken = refreshTokenGenerator.generateNext(clientId, refreshCount);
    
    return new AgentTokenResponse(accessToken, newRefreshToken, TOKEN_TYPE, expirationSeconds);
}
```

---

### 7. AgentRegistrationSecretValidator

**Purpose**: Validates initial registration key against active secret.

**Location**: `com.openframe.client.service.validator.AgentRegistrationSecretValidator`

**Validation Process**:

```mermaid
flowchart TD
    Start["validate(initialKey)"] --> CheckBlank{"initialKey<br/>blank?"}
    CheckBlank -->|Yes| ErrorBlank["Throw AgentRegistrationSecretValidationException<br/>initial_key_empty"]
    CheckBlank -->|No| FindSecret["Find active secret from DB"]
    
    FindSecret --> SecretExists{"Active secret<br/>exists?"}
    SecretExists -->|No| ErrorNoSecret["Throw AgentRegistrationSecretValidationErrorException<br/>No active agent secret found"]
    SecretExists -->|Yes| Decrypt["Decrypt secret key"]
    
    Decrypt --> Compare{"Decrypted key<br/>== initialKey?"}
    Compare -->|No| ErrorInvalid["Throw AgentRegistrationSecretValidationException<br/>initial_key_invalid"]
    Compare -->|Yes| Success["✓ Validation passed"]
    
    style ErrorBlank fill:#ffebee
    style ErrorNoSecret fill:#ffebee
    style ErrorInvalid fill:#ffebee
    style Success fill:#e8f5e9
```

**Security Features**:
- Encrypted storage of registration secrets
- Single active secret at a time
- Descriptive error codes for troubleshooting

**Exception Types**:
- `AgentRegistrationSecretValidationException`: Client error (invalid key)
- `AgentRegistrationSecretValidationErrorException`: Server error (no active secret)

---

### 8. DefaultAgentRegistrationProcessor

**Purpose**: Default no-op implementation of post-registration processing hook.

**Location**: `com.openframe.client.service.agentregistration.processor.DefaultAgentRegistrationProcessor`

**Extensibility Pattern**:

This component implements the **Strategy Pattern** for extensibility:

```mermaid
flowchart TD
    Interface["AgentRegistrationProcessor<br/>(Interface)"] -.->|implements| Default["DefaultAgentRegistrationProcessor<br/>(Default no-op)"]
    Interface -.->|implements| Custom["CustomAgentRegistrationProcessor<br/>(User-defined)"]
    
    Service["AgentRegistrationService"] -->|"postProcessAgentRegistration()"| Interface
    
    Spring["Spring Container"] -->|"@ConditionalOnMissingBean"| Decision{"Custom bean<br/>exists?"}
    Decision -->|No| UseDefault["Use DefaultAgentRegistrationProcessor"]
    Decision -->|Yes| UseCustom["Use CustomAgentRegistrationProcessor"]
    
    style Default fill:#e1f5ff
    style Custom fill:#e8f5e9
    style UseCustom fill:#fff4e1
```

**Interface Definition**:

```java
public interface AgentRegistrationProcessor {
    /**
     * Post-process hook for agent registration.
     * Called after the agent has been successfully registered.
     *
     * @param machine The registered machine
     * @param request The original registration request
     */
    default void postProcessAgentRegistration(Machine machine, AgentRegistrationRequest request) {
        // Default no-op implementation
    }
}
```

**Custom Implementation Example**:

```java
@Component
public class CustomAgentRegistrationProcessor implements AgentRegistrationProcessor {
    
    @Override
    public void postProcessAgentRegistration(Machine machine, AgentRegistrationRequest request) {
        // Custom logic: Send notification
        notificationService.sendAgentRegisteredNotification(machine);
        
        // Custom logic: Trigger provisioning workflow
        provisioningService.startProvisioning(machine.getMachineId());
        
        // Custom logic: Log to external system
        auditService.logAgentRegistration(machine, request);
    }
}
```

**Spring Boot Auto-Configuration**:

The `@ConditionalOnMissingBean` annotation ensures:
- If no custom implementation exists, `DefaultAgentRegistrationProcessor` is used
- If a custom implementation is provided, it takes precedence
- No configuration changes required to extend functionality

---

## Data Models

### AgentRegistrationRequest

**Purpose**: Request payload for agent registration.

**Location**: `com.openframe.client.dto.agent.AgentRegistrationRequest`

**Fields**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `hostname` | String | Yes | Machine hostname |
| `organizationId` | String | No | Target organization (defaults to default org) |
| `ip` | String | No | IP address |
| `macAddress` | String | No | MAC address |
| `osUuid` | String | No | OS-specific unique identifier |
| `agentVersion` | String | No | Agent software version |
| `status` | DeviceStatus | No | Initial status |
| `displayName` | String | No | Human-readable name |
| `serialNumber` | String | No | Hardware serial number |
| `manufacturer` | String | No | Hardware manufacturer |
| `model` | String | No | Hardware model |
| `type` | DeviceType | No | Device type (DESKTOP, SERVER, etc.) |
| `osType` | String | No | Operating system type |
| `osVersion` | String | No | OS version |
| `osBuild` | String | No | OS build number |
| `timezone` | String | No | System timezone |

**Example**:

```json
{
  "hostname": "workstation-01",
  "organizationId": "org-123",
  "ip": "192.168.1.100",
  "macAddress": "00:1B:63:84:45:E6",
  "osUuid": "12345678-1234-1234-1234-123456789012",
  "agentVersion": "1.0.0",
  "displayName": "John's Workstation",
  "serialNumber": "SN123456789",
  "manufacturer": "Dell",
  "model": "OptiPlex 7090",
  "osType": "Windows",
  "osVersion": "11",
  "osBuild": "22000.1",
  "timezone": "America/New_York"
}
```

---

### AgentRegistrationResponse

**Purpose**: Response payload containing OAuth credentials.

**Location**: `com.openframe.client.dto.agent.AgentRegistrationResponse`

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `machineId` | String | Unique machine identifier |
| `clientId` | String | OAuth client ID (format: `agent_{machineId}`) |
| `clientSecret` | String | OAuth client secret (store securely!) |

**Example**:

```json
{
  "machineId": "mch_a1b2c3d4e5f6",
  "clientId": "agent_mch_a1b2c3d4e5f6",
  "clientSecret": "secret_xyz789abc456def"
}
```

**Security Note**: The `clientSecret` is only returned once during registration. Agents must store it securely (e.g., encrypted on disk).

---

### AgentTokenResponse

**Purpose**: OAuth 2.0 token response.

**Location**: `com.openframe.client.dto.AgentTokenResponse`

**Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `accessToken` | String | JWT access token for API authentication |
| `refreshToken` | String | JWT refresh token for token renewal |
| `tokenType` | String | Token type (always "Bearer") |
| `expiresIn` | long | Access token expiration in seconds |

**Example**:

```json
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZ2VudF9tY2hfYTFiMmMzZDRlNWY2IiwiaWF0IjoxNzA0MDY3MjAwLCJleHAiOjE3MDQwNzA4MDAsInJvbGVzIjpbIkFHRU5UIl0sImdyYW50X3R5cGUiOiJjbGllbnRfY3JlZGVudGlhbHMifQ...",
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZ2VudF9tY2hfYTFiMmMzZDRlNWY2IiwiaWF0IjoxNzA0MDY3MjAwLCJleHAiOjE3MDQxNTM2MDAsInJlZnJlc2hfY291bnQiOjB9...",
  "tokenType": "Bearer",
  "expiresIn": 3600
}
```

**Token Usage**:

```bash
# Use access token in API requests
curl -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \
  http://localhost:8080/api/devices
```

---

## Integration Points

### Dependencies

```mermaid
flowchart TD
    ClientService["Client Service<br/>Registration & Auth"] --> DataMongo["Data Layer MongoDB"]
    ClientService --> SecurityCore["Security Core"]
    ClientService --> CoreServices["Core Services"]
    
    DataMongo --> OAuthClientRepo["OAuthClientRepository"]
    DataMongo --> MachineRepo["MachineRepository"]
    DataMongo --> SecretRepo["AgentRegistrationSecretRepository"]
    DataMongo --> OrgService["OrganizationService"]
    
    SecurityCore --> JwtService["JwtService"]
    SecurityCore --> PasswordEncoder["PasswordEncoder"]
    
    CoreServices --> EncryptionService["EncryptionService"]
    CoreServices --> ToolInstallationService["ToolInstallationService"]
    
    style ClientService fill:#e1f5ff
    style DataMongo fill:#fff4e1
    style SecurityCore fill:#e8f5e9
    style CoreServices fill:#f3e5f5
```

**Key Dependencies**:

1. **Data Layer MongoDB** ([data_layer_mongo.md](data_layer_mongo.md))
   - `OAuthClientRepository`: OAuth client persistence
   - `MachineRepository`: Machine metadata persistence
   - `AgentRegistrationSecretRepository`: Registration secret storage
   - `OrganizationService`: Organization lookup and default resolution

2. **Security Core** ([security_core.md](security_core.md))
   - `JwtService`: JWT token encoding/decoding
   - `PasswordEncoder`: BCrypt password hashing

3. **Core Services**
   - `EncryptionService`: Encryption/decryption of registration secrets
   - `ToolInstallationService`: Integrated tool installation

---

### Downstream Consumers

```mermaid
flowchart LR
    Agent["Agent Client"] -->|"Uses credentials"| GatewayService["Gateway Service"]
    Agent -->|"Sends metrics"| ClientEventListeners["Client Event Listeners"]
    
    GatewayService -->|"Validates JWT"| ApiService["API Service"]
    GatewayService -->|"Routes requests"| ExternalApi["External API"]
    
    ClientEventListeners -->|"Processes events"| StreamProcessing["Stream Processing"]
    
    style Agent fill:#e1f5ff
    style GatewayService fill:#fff4e1
    style ClientEventListeners fill:#e8f5e9
```

**Consumer Modules**:

1. **Gateway Service** ([gateway_service.md](gateway_service.md))
   - Validates JWT access tokens from agents
   - Routes authenticated requests to backend services

2. **Client Event Listeners** ([client_service_event_listeners.md](client_service_event_listeners.md))
   - Processes heartbeat events from registered agents
   - Handles connection lifecycle events

3. **Stream Processing** ([stream_processing.md](stream_processing.md))
   - Consumes agent activity events
   - Enriches events with machine metadata

---

## Configuration

### Application Properties

```yaml
# Agent Registration Configuration
openframe:
  agent:
    registration:
      # Secret validation
      secret:
        encryption-key: ${AGENT_SECRET_ENCRYPTION_KEY}
      
      # Machine ID generation
      machine-id:
        prefix: "mch_"
        length: 16
      
      # Client secret generation
      client-secret:
        length: 32
        algorithm: "SHA256PRNG"
    
    # OAuth token configuration
    oauth:
      access-token:
        expiration-seconds: 3600  # 1 hour
        signing-algorithm: "RS256"
      
      refresh-token:
        expiration-seconds: 86400  # 24 hours
        max-refresh-count: 10
        signing-algorithm: "RS256"
    
    # Tool installation
    tools:
      auto-install: true
      enabled-tools:
        - fleet-mdm
        - tactical-rmm
        - meshcentral

# Spring Security
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${JWT_ISSUER_URI:http://localhost:8080}
          jwk-set-uri: ${JWT_JWK_SET_URI:http://localhost:8080/.well-known/jwks.json}

# MongoDB
spring:
  data:
    mongodb:
      uri: ${MONGODB_URI:mongodb://localhost:27017/openframe}
      database: ${MONGODB_DATABASE:openframe}
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AGENT_SECRET_ENCRYPTION_KEY` | Encryption key for registration secrets | - | Yes |
| `JWT_ISSUER_URI` | JWT issuer URI | `http://localhost:8080` | No |
| `JWT_JWK_SET_URI` | JWK Set URI for JWT validation | `http://localhost:8080/.well-known/jwks.json` | No |
| `MONGODB_URI` | MongoDB connection URI | `mongodb://localhost:27017/openframe` | No |
| `MONGODB_DATABASE` | MongoDB database name | `openframe` | No |

---

## Security Considerations

### 1. Registration Secret Protection

**Threat**: Unauthorized agent registration

**Mitigation**:
- Registration secrets stored encrypted in database
- Single active secret at a time (rotation supported)
- Secret transmitted via secure header (`X-Initial-Key`)
- Validation before any registration processing

**Best Practices**:
```bash
# Generate strong registration secret
openssl rand -base64 32

# Rotate secret periodically
curl -X POST http://localhost:8080/api/admin/agent-secrets/rotate \
  -H "Authorization: Bearer admin-token"
```

---

### 2. Client Credential Security

**Threat**: Credential theft or exposure

**Mitigation**:
- Client secrets hashed with BCrypt (cost factor 10)
- Secrets only returned once during registration
- No plaintext storage in database
- JWT tokens signed with RSA-256

**Agent Storage Recommendations**:
```python
# Python agent example: Secure credential storage
import keyring

# Store credentials securely
keyring.set_password("openframe", "client_id", client_id)
keyring.set_password("openframe", "client_secret", client_secret)

# Retrieve for authentication
client_id = keyring.get_password("openframe", "client_id")
client_secret = keyring.get_password("openframe", "client_secret")
```

---

### 3. Token Security

**Threat**: Token theft or replay attacks

**Mitigation**:
- Short-lived access tokens (1 hour default)
- Refresh token rotation with count tracking
- JWT signature validation on every request
- Token revocation support (via database lookup)

**Token Lifecycle**:

```mermaid
flowchart TD
    Register["Agent Registration"] --> GetTokens["Obtain access + refresh tokens"]
    GetTokens --> UseAccess["Use access token<br/>(valid 1 hour)"]
    
    UseAccess --> Expired{"Access token<br/>expired?"}
    Expired -->|No| UseAccess
    Expired -->|Yes| Refresh["Use refresh token<br/>to get new tokens"]
    
    Refresh --> CheckCount{"Refresh count<br/>< max?"}
    CheckCount -->|Yes| GetTokens
    CheckCount -->|No| ReAuth["Re-authenticate with<br/>client credentials"]
    
    ReAuth --> GetTokens
    
    style UseAccess fill:#e8f5e9
    style Refresh fill:#fff4e1
    style ReAuth fill:#ffebee
```

---

### 4. Rate Limiting

**Threat**: Brute force attacks on authentication endpoint

**Recommended Configuration**:

```yaml
# Spring Cloud Gateway rate limiting
spring:
  cloud:
    gateway:
      routes:
        - id: agent-auth
          uri: http://client-service:8080
          predicates:
            - Path=/oauth/token
          filters:
            - name: RequestRateLimiter
              args:
                redis-rate-limiter:
                  replenishRate: 10  # tokens per second
                  burstCapacity: 20  # max burst
                  requestedTokens: 1
```

---

## Error Handling

### Registration Errors

| Error Code | HTTP Status | Description | Resolution |
|------------|-------------|-------------|------------|
| `initial_key_empty` | 400 | Initial key not provided | Include `X-Initial-Key` header |
| `initial_key_invalid` | 400 | Initial key doesn't match active secret | Verify secret with administrator |
| `No active agent secret found` | 500 | No active registration secret in database | Administrator must create active secret |
| `Failed to register client` | 500 | Duplicate machine ID generated | Retry registration (rare collision) |
| `Default organization not found` | 500 | Default organization missing | Administrator must create default org |

**Example Error Response**:

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "initial_key_invalid",
  "path": "/api/agents/register"
}
```

---

### Authentication Errors

| Error | HTTP Status | Description | Resolution |
|-------|-------------|-------------|------------|
| `Client not found` | 401 | Invalid client ID | Verify client ID from registration |
| `Invalid client secret` | 401 | Client secret doesn't match | Verify client secret from registration |
| `Unsupported grant type` | 400 | Invalid grant type parameter | Use `client_credentials` or `refresh_token` |
| `Refresh token has expired` | 401 | Refresh token expired | Re-authenticate with client credentials |
| `Maximum refresh count reached` | 401 | Too many token refreshes | Re-authenticate with client credentials |

**Example Error Response**:

```json
{
  "message": "Invalid client secret"
}
```

---

## Testing

### Unit Testing

**Example: AgentRegistrationService Test**

```java
@ExtendWith(MockitoExtension.class)
class AgentRegistrationServiceTest {
    
    @Mock
    private AgentRegistrationSecretValidator secretValidator;
    
    @Mock
    private MachineIdGenerator machineIdGenerator;
    
    @Mock
    private AgentSecretGenerator agentSecretGenerator;
    
    @Mock
    private OAuthClientRepository oauthClientRepository;
    
    @Mock
    private MachineRepository machineRepository;
    
    @Mock
    private OrganizationService organizationService;
    
    @InjectMocks
    private AgentRegistrationService service;
    
    @Test
    void register_WithValidRequest_ReturnsCredentials() {
        // Given
        String initialKey = "valid-secret";
        AgentRegistrationRequest request = new AgentRegistrationRequest();
        request.setHostname("test-host");
        request.setOrganizationId("org-123");
        
        when(machineIdGenerator.generate()).thenReturn("mch_test123");
        when(agentSecretGenerator.generate()).thenReturn("secret_xyz");
        when(organizationService.getOrganizationByOrganizationId("org-123"))
            .thenReturn(Optional.of(new Organization()));
        
        // When
        AgentRegistrationResponse response = service.register(initialKey, request);
        
        // Then
        assertThat(response.getMachineId()).isEqualTo("mch_test123");
        assertThat(response.getClientId()).isEqualTo("agent_mch_test123");
        assertThat(response.getClientSecret()).isEqualTo("secret_xyz");
        
        verify(secretValidator).validate(initialKey);
        verify(oauthClientRepository).save(any(OAuthClient.class));
        verify(machineRepository).save(any(Machine.class));
    }
    
    @Test
    void register_WithInvalidSecret_ThrowsException() {
        // Given
        String invalidKey = "invalid-secret";
        AgentRegistrationRequest request = new AgentRegistrationRequest();
        
        doThrow(new AgentRegistrationSecretValidationException("initial_key_invalid", "Invalid key"))
            .when(secretValidator).validate(invalidKey);
        
        // When/Then
        assertThatThrownBy(() -> service.register(invalidKey, request))
            .isInstanceOf(AgentRegistrationSecretValidationException.class)
            .hasMessageContaining("Invalid key");
    }
}
```

---

### Integration Testing

**Example: Agent Registration Flow Test**

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class AgentRegistrationIntegrationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private AgentRegistrationSecretRepository secretRepository;
    
    @Autowired
    private EncryptionService encryptionService;
    
    @BeforeEach
    void setUp() {
        // Create active registration secret
        AgentRegistrationSecret secret = new AgentRegistrationSecret();
        secret.setSecretKey(encryptionService.encrypt("test-secret-key"));
        secret.setActive(true);
        secretRepository.save(secret);
    }
    
    @Test
    void registerAgent_EndToEnd_Success() throws Exception {
        // Given
        String requestBody = """
            {
                "hostname": "test-workstation",
                "ip": "192.168.1.100",
                "macAddress": "00:1B:63:84:45:E6",
                "osType": "Windows",
                "agentVersion": "1.0.0"
            }
            """;
        
        // When
        MvcResult result = mockMvc.perform(post("/api/agents/register")
                .header("X-Initial-Key", "test-secret-key")
                .contentType(MediaType.APPLICATION_JSON)
                .content(requestBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.machineId").exists())
            .andExpect(jsonPath("$.clientId").exists())
            .andExpect(jsonPath("$.clientSecret").exists())
            .andReturn();
        
        // Then
        String responseBody = result.getResponse().getContentAsString();
        AgentRegistrationResponse response = objectMapper.readValue(
            responseBody, AgentRegistrationResponse.class);
        
        // Verify OAuth client created
        Optional<OAuthClient> client = oauthClientRepository
            .findByClientId(response.getClientId());
        assertThat(client).isPresent();
        
        // Verify machine created
        Optional<Machine> machine = machineRepository
            .findByMachineId(response.getMachineId());
        assertThat(machine).isPresent();
        assertThat(machine.get().getHostname()).isEqualTo("test-workstation");
    }
    
    @Test
    void authenticateAgent_WithRegisteredCredentials_ReturnsTokens() throws Exception {
        // Given: Register agent first
        AgentRegistrationResponse registration = registerTestAgent();
        
        // When: Authenticate with credentials
        mockMvc.perform(post("/oauth/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .param("grant_type", "client_credentials")
                .param("client_id", registration.getClientId())
                .param("client_secret", registration.getClientSecret()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").exists())
            .andExpect(jsonPath("$.refreshToken").exists())
            .andExpect(jsonPath("$.tokenType").value("Bearer"))
            .andExpect(jsonPath("$.expiresIn").value(3600));
    }
}
```

---

## Monitoring & Observability

### Key Metrics

**Registration Metrics**:

```java
@Component
public class AgentRegistrationMetrics {
    
    private final Counter registrationAttempts;
    private final Counter registrationSuccesses;
    private final Counter registrationFailures;
    private final Timer registrationDuration;
    
    public AgentRegistrationMetrics(MeterRegistry registry) {
        this.registrationAttempts = Counter.builder("agent.registration.attempts")
            .description("Total agent registration attempts")
            .register(registry);
        
        this.registrationSuccesses = Counter.builder("agent.registration.successes")
            .description("Successful agent registrations")
            .register(registry);
        
        this.registrationFailures = Counter.builder("agent.registration.failures")
            .tag("reason", "unknown")
            .description("Failed agent registrations")
            .register(registry);
        
        this.registrationDuration = Timer.builder("agent.registration.duration")
            .description("Agent registration processing time")
            .register(registry);
    }
}
```

**Authentication Metrics**:

```java
@Component
public class AgentAuthMetrics {
    
    private final Counter authAttempts;
    private final Counter authSuccesses;
    private final Counter authFailures;
    private final Counter tokenRefreshes;
    
    public AgentAuthMetrics(MeterRegistry registry) {
        this.authAttempts = Counter.builder("agent.auth.attempts")
            .tag("grant_type", "unknown")
            .description("Total authentication attempts")
            .register(registry);
        
        this.authSuccesses = Counter.builder("agent.auth.successes")
            .tag("grant_type", "unknown")
            .description("Successful authentications")
            .register(registry);
        
        this.authFailures = Counter.builder("agent.auth.failures")
            .tag("grant_type", "unknown")
            .tag("reason", "unknown")
            .description("Failed authentications")
            .register(registry);
        
        this.tokenRefreshes = Counter.builder("agent.auth.token.refreshes")
            .description("Token refresh operations")
            .register(registry);
    }
}
```

---

### Logging

**Structured Logging Example**:

```java
@Slf4j
@Service
public class AgentRegistrationService {
    
    public AgentRegistrationResponse register(String initialKey, AgentRegistrationRequest request) {
        log.info("Agent registration started - hostname: {}, organizationId: {}", 
            request.getHostname(), request.getOrganizationId());
        
        try {
            // Registration logic...
            
            log.info("Agent registration successful - machineId: {}, clientId: {}, organizationId: {}", 
                machineId, clientId, resolvedOrganizationId);
            
            return response;
        } catch (AgentRegistrationSecretValidationException e) {
            log.warn("Agent registration failed - invalid secret - hostname: {}", 
                request.getHostname());
            throw e;
        } catch (Exception e) {
            log.error("Agent registration error - hostname: {}, error: {}", 
                request.getHostname(), e.getMessage(), e);
            throw e;
        }
    }
}
```

**Log Aggregation Query Examples** (ELK/Splunk):

```text
# Failed registrations by reason
source="client-service" "Agent registration failed" 
| stats count by reason

# Registration duration percentiles
source="client-service" "Agent registration successful" 
| stats p50(duration), p95(duration), p99(duration)

# Authentication failures by grant type
source="client-service" "Authentication failed" 
| stats count by grant_type, reason
```

---

## Deployment

### Docker Compose Example

```yaml
version: '3.8'

services:
  client-service:
    image: openframe/client-service:latest
    ports:
      - "8080:8080"
    environment:
      # MongoDB
      MONGODB_URI: mongodb://mongodb:27017/openframe
      MONGODB_DATABASE: openframe
      
      # Security
      AGENT_SECRET_ENCRYPTION_KEY: ${AGENT_SECRET_ENCRYPTION_KEY}
      JWT_ISSUER_URI: http://authorization-service:8080
      JWT_JWK_SET_URI: http://authorization-service:8080/.well-known/jwks.json
      
      # Agent configuration
      OPENFRAME_AGENT_REGISTRATION_MACHINE_ID_PREFIX: mch_
      OPENFRAME_AGENT_OAUTH_ACCESS_TOKEN_EXPIRATION_SECONDS: 3600
      OPENFRAME_AGENT_OAUTH_REFRESH_TOKEN_EXPIRATION_SECONDS: 86400
      OPENFRAME_AGENT_OAUTH_REFRESH_TOKEN_MAX_REFRESH_COUNT: 10
      
      # Tool installation
      OPENFRAME_AGENT_TOOLS_AUTO_INSTALL: true
      OPENFRAME_AGENT_TOOLS_ENABLED_TOOLS: fleet-mdm,tactical-rmm,meshcentral
    depends_on:
      - mongodb
      - authorization-service
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/actuator/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongodb-data:/data/db
    environment:
      MONGO_INITDB_DATABASE: openframe

  authorization-service:
    image: openframe/authorization-service:latest
    ports:
      - "8081:8080"
    environment:
      MONGODB_URI: mongodb://mongodb:27017/openframe
    depends_on:
      - mongodb

volumes:
  mongodb-data:
```

---

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: client-service
  namespace: openframe
spec:
  replicas: 3
  selector:
    matchLabels:
      app: client-service
  template:
    metadata:
      labels:
        app: client-service
    spec:
      containers:
      - name: client-service
        image: openframe/client-service:latest
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: mongodb-credentials
              key: uri
        - name: AGENT_SECRET_ENCRYPTION_KEY
          valueFrom:
            secretKeyRef:
              name: agent-secrets
              key: encryption-key
        - name: JWT_ISSUER_URI
          value: "http://authorization-service:8080"
        - name: JWT_JWK_SET_URI
          value: "http://authorization-service:8080/.well-known/jwks.json"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: client-service
  namespace: openframe
spec:
  selector:
    app: client-service
  ports:
  - protocol: TCP
    port: 8080
    targetPort: 8080
  type: ClusterIP
```

---

## Troubleshooting

### Common Issues

#### 1. Registration Fails with "No active agent secret found"

**Symptoms**:
```json
{
  "status": 500,
  "error": "Internal Server Error",
  "message": "No active agent secret found"
}
```

**Cause**: No active registration secret exists in database.

**Resolution**:

```bash
# Create active registration secret via admin API
curl -X POST http://localhost:8080/api/admin/agent-secrets \
  -H "Authorization: Bearer admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "secretKey": "your-secure-secret-key",
    "active": true
  }'
```

---

#### 2. Authentication Fails with "Invalid client secret"

**Symptoms**:
```json
{
  "message": "Invalid client secret"
}
```

**Cause**: Client secret doesn't match stored hash.

**Resolution**:

1. Verify client secret from registration response
2. Ensure no whitespace or encoding issues
3. If lost, re-register agent (old credentials cannot be recovered)

**Debug Query**:

```javascript
// MongoDB query to verify client exists
db.oauth_clients.findOne({ clientId: "agent_mch_xxx" })
```

---

#### 3. Token Refresh Fails with "Maximum refresh count reached"

**Symptoms**:
```json
{
  "message": "Maximum refresh count reached"
}
```

**Cause**: Refresh token used too many times (default: 10).

**Resolution**:

Re-authenticate with client credentials:

```bash
curl -X POST http://localhost:8080/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -d "client_id=agent_mch_xxx" \
  -d "client_secret=secret_xyz"
```

**Configuration**: Increase max refresh count if needed:

```yaml
openframe:
  agent:
    oauth:
      refresh-token:
        max-refresh-count: 20  # Increase limit
```

---

#### 4. Registration Fails with "Default organization not found"

**Symptoms**:
```json
{
  "status": 500,
  "error": "Internal Server Error",
  "message": "Default organization not found. Please ensure it was created during tenant registration."
}
```

**Cause**: Default organization missing from database.

**Resolution**:

```bash
# Create default organization
curl -X POST http://localhost:8080/api/organizations \
  -H "Authorization: Bearer admin-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Default",
    "organizationId": "default-org"
  }'
```

---

### Debug Logging

Enable debug logging for troubleshooting:

```yaml
logging:
  level:
    com.openframe.client.controller: DEBUG
    com.openframe.client.service: DEBUG
    com.openframe.client.service.auth: DEBUG
    com.openframe.client.service.agentregistration: DEBUG
    com.openframe.client.service.validator: DEBUG
```

**Example Debug Output**:

```text
2024-01-01 12:00:00.123 DEBUG [client-service] AgentRegistrationService - Agent registration started - hostname: workstation-01, organizationId: org-123
2024-01-01 12:00:00.234 DEBUG [client-service] AgentRegistrationSecretValidator - Validating initial key
2024-01-01 12:00:00.345 DEBUG [client-service] AgentRegistrationService - Using provided organizationId: org-123
2024-01-01 12:00:00.456 DEBUG [client-service] AgentRegistrationService - Saved machine mch_a1b2c3d4e5f6 with organizationId: org-123
2024-01-01 12:00:00.567 INFO  [client-service] AgentRegistrationService - Agent registration successful - machineId: mch_a1b2c3d4e5f6, clientId: agent_mch_a1b2c3d4e5f6, organizationId: org-123
```

---

## Best Practices

### 1. Secure Credential Storage

**Agent-Side Implementation**:

```python
# Python agent example
import keyring
import requests

class OpenFrameAgent:
    def __init__(self):
        self.client_id = keyring.get_password("openframe", "client_id")
        self.client_secret = keyring.get_password("openframe", "client_secret")
        self.access_token = None
        self.refresh_token = None
    
    def register(self, initial_key, hostname):
        """Register agent with OpenFrame"""
        response = requests.post(
            "http://openframe.example.com/api/agents/register",
            headers={"X-Initial-Key": initial_key},
            json={"hostname": hostname}
        )
        response.raise_for_status()
        
        data = response.json()
        
        # Store credentials securely
        keyring.set_password("openframe", "client_id", data["clientId"])
        keyring.set_password("openframe", "client_secret", data["clientSecret"])
        
        self.client_id = data["clientId"]
        self.client_secret = data["clientSecret"]
    
    def authenticate(self):
        """Authenticate and obtain tokens"""
        response = requests.post(
            "http://openframe.example.com/oauth/token",
            data={
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret
            }
        )
        response.raise_for_status()
        
        data = response.json()
        self.access_token = data["accessToken"]
        self.refresh_token = data["refreshToken"]
    
    def refresh_access_token(self):
        """Refresh access token using refresh token"""
        response = requests.post(
            "http://openframe.example.com/oauth/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": self.refresh_token
            }
        )
        response.raise_for_status()
        
        data = response.json()
        self.access_token = data["accessToken"]
        self.refresh_token = data["refreshToken"]
```

---

### 2. Token Lifecycle Management

**Proactive Token Refresh**:

```python
import time
from datetime import datetime, timedelta

class TokenManager:
    def __init__(self, agent):
        self.agent = agent
        self.token_expiry = None
    
    def ensure_valid_token(self):
        """Ensure access token is valid, refresh if needed"""
        if self.token_expiry is None or datetime.now() >= self.token_expiry:
            try:
                self.agent.refresh_access_token()
                # Refresh 5 minutes before actual expiry
                self.token_expiry = datetime.now() + timedelta(seconds=3600 - 300)
            except Exception as e:
                # Refresh failed, re-authenticate
                self.agent.authenticate()
                self.token_expiry = datetime.now() + timedelta(seconds=3600 - 300)
    
    def make_authenticated_request(self, url, **kwargs):
        """Make HTTP request with automatic token refresh"""
        self.ensure_valid_token()
        
        headers = kwargs.get("headers", {})
        headers["Authorization"] = f"Bearer {self.agent.access_token}"
        kwargs["headers"] = headers
        
        return requests.get(url, **kwargs)
```

---

### 3. Custom Post-Registration Processing

**Example: Notification Integration**:

```java
@Component
public class NotificationAgentRegistrationProcessor implements AgentRegistrationProcessor {
    
    private final NotificationService notificationService;
    private final SlackWebhookService slackService;
    
    @Override
    public void postProcessAgentRegistration(Machine machine, AgentRegistrationRequest request) {
        // Send email notification
        notificationService.sendEmail(
            "admin@example.com",
            "New Agent Registered",
            String.format("Machine %s (%s) has been registered", 
                machine.getHostname(), machine.getMachineId())
        );
        
        // Send Slack notification
        slackService.sendMessage(
            "#it-alerts",
            String.format(":computer: New agent registered: %s (IP: %s, OS: %s)", 
                machine.getHostname(), machine.getIp(), machine.getOsType())
        );
        
        // Log to audit system
        auditService.logEvent(
            AuditEventType.AGENT_REGISTERED,
            Map.of(
                "machineId", machine.getMachineId(),
                "hostname", machine.getHostname(),
                "organizationId", machine.getOrganizationId()
            )
        );
    }
}
```

---

### 4. Organization Assignment Strategy

**Multi-Tenant Deployment**:

```java
@Component
public class TenantAwareAgentRegistrationProcessor implements AgentRegistrationProcessor {
    
    private final TenantResolver tenantResolver;
    private final OrganizationService organizationService;
    
    @Override
    public void postProcessAgentRegistration(Machine machine, AgentRegistrationRequest request) {
        // Resolve tenant from request metadata
        String tenantId = tenantResolver.resolveFromRequest(request);
        
        // Ensure machine is in correct tenant organization
        if (tenantId != null) {
            Organization tenantOrg = organizationService
                .getOrganizationByTenantId(tenantId)
                .orElseThrow(() -> new IllegalStateException("Tenant organization not found"));
            
            // Update machine organization if needed
            if (!tenantOrg.getOrganizationId().equals(machine.getOrganizationId())) {
                machine.setOrganizationId(tenantOrg.getOrganizationId());
                machineRepository.save(machine);
            }
        }
    }
}
```

---

## Related Documentation

- [Authorization Service](authorization_service.md) - OAuth 2.0 server for user authentication
- [Client Service Event Listeners](client_service_event_listeners.md) - Agent lifecycle event processing
- [Data Layer MongoDB](data_layer_mongo.md) - Data persistence layer
- [Security Core](security_core.md) - JWT and security utilities
- [Gateway Service](gateway_service.md) - API gateway with JWT validation
- [API Service](api_service.md) - Backend API for authenticated agents

---

## Additional Resources

### OpenFrame Documentation
- [OpenFrame Platform Overview](https://www.flamingo.run/openframe)
- [Agent Installation Guide](https://docs.openframe.ai/agents/installation)
- [API Reference](https://docs.openframe.ai/api)

### Community & Support
- [OpenMSP Slack Community](https://www.openmsp.ai/)
- [Join Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

### Related Technologies
- [Spring Security OAuth 2.0](https://spring.io/projects/spring-security-oauth)
- [JWT.io](https://jwt.io/) - JWT debugger and documentation
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [BCrypt Password Hashing](https://en.wikipedia.org/wiki/Bcrypt)

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-01  
**Maintained By**: OpenFrame Documentation Team
