# API Keys Management

This document outlines the API Keys system in OpenFrame, providing secure programmatic access to the platform's services.

## Overview

OpenFrame API Keys enable secure, programmatic access to the platform without requiring user authentication. They are designed for:

- Third-party integrations
- Automation scripts
- And other programmatic access scenarios

## Architecture

### System Components

```mermaid
graph TB
    subgraph "Existing OpenFrame Services"
        GATEWAY[openframe-gateway ⭐]
        API[openframe-api ⭐]
        MGMT[openframe-management]
        CLIENT[openframe-client]
    end

    subgraph "API Key Components"
        direction TB
        
        subgraph "Gateway Layer (Enhanced)"
            AUTH_FILTER[JWT Auth Filter]
            API_KEY_FILTER[API Key Filter ⭐ NEW]
            RATE_FILTER[Rate Limit Filter ⭐ NEW]
            HEADERS_FILTER[Headers Filter]
        end
        
        subgraph "Data Layer"
            MONGO[(MongoDB)]
            REDIS[(Redis)]
            
            API_KEY_REPO[API Key Repository ⭐ NEW]
            RATE_SERVICE[Rate Limit Service ⭐ NEW]
        end
        
        subgraph "Management Layer"
            API_KEY_CONTROLLER[API Key Controller ⭐ NEW]
            API_KEY_SERVICE[API Key Service ⭐ NEW]
            PASSWORD_ENCODER[PasswordEncoder]
        end
    end
    
    subgraph "API Key Clients"
        MOBILE[Mobile App]
        THIRD_PARTY[Third-party Integration]
        POSTMAN[API Testing Tools]
        SCRIPTS[Automation Scripts]
        WEBHOOKS[Webhook Endpoints]
    end
    
    %% API Key Authentication Flow
    MOBILE --> |"X-API-Key: ak_xxx"| GATEWAY
    THIRD_PARTY --> |"X-API-Key: ak_xxx"| GATEWAY
    POSTMAN --> |"X-API-Key: ak_xxx"| GATEWAY
    SCRIPTS --> |"X-API-Key: ak_xxx"| GATEWAY
    WEBHOOKS --> |"X-API-Key: ak_xxx"| GATEWAY
    
    %% Filter Chain
    GATEWAY --> AUTH_FILTER
    AUTH_FILTER --> API_KEY_FILTER
    API_KEY_FILTER --> RATE_FILTER
    RATE_FILTER --> HEADERS_FILTER
    
    %% Service Routing
    HEADERS_FILTER --> |"/api/**<br/>+ X-User-Id headers"| API
    
    %% Other services unchanged
    GATEWAY -.-> |"JWT only"| CLIENT
    GATEWAY -.-> |"JWT only"| MGMT
    
    %% Data Flow
    API_KEY_FILTER <--> |"Validate Hashed Key"| API_KEY_SERVICE
    API_KEY_SERVICE <--> |"CRUD Operations"| API_KEY_REPO
    API_KEY_REPO <--> |"Store Hashed Keys"| MONGO
    
    RATE_FILTER <--> |"Check Limits"| RATE_SERVICE
    RATE_SERVICE <--> |"Counters & Limits"| REDIS
    
    %% Management
    API --> |"Admin Endpoints"| API_KEY_CONTROLLER
    API_KEY_CONTROLLER <--> API_KEY_SERVICE
    API_KEY_SERVICE <--> |"Hash API Keys"| PASSWORD_ENCODER
    
    %% Styling
    style GATEWAY fill:#e1f5fe
    style API fill:#4caf50
    style API_KEY_FILTER fill:#ffeb3b
    style RATE_FILTER fill:#ffeb3b
    style API_KEY_REPO fill:#ffeb3b
    style RATE_SERVICE fill:#ffeb3b
    style API_KEY_CONTROLLER fill:#ffeb3b
    style API_KEY_SERVICE fill:#ffeb3b
    style PASSWORD_ENCODER fill:#4caf50
```

## Authentication Flow

The API Key authentication process follows a secure validation chain:

```mermaid
sequenceDiagram
    participant Client
    participant Gateway
    participant ApiKeyFilter
    participant ApiKeyService
    participant PermissionService
    participant MongoDB
    participant Redis
    participant API_Service

    Client->>Gateway: Request with API Key
    Gateway->>ApiKeyFilter: Process Request
    
    ApiKeyFilter->>ApiKeyService: Validate Key
    ApiKeyService->>MongoDB: Find by keyId
    ApiKeyService->>ApiKeyService: Check BCrypt Hash
    
    alt Key Valid
        ApiKeyService->>PermissionService: Check Permissions
        PermissionService->>PermissionService: Validate Scopes & Roles
        
        alt Permission OK
            ApiKeyFilter->>Redis: Check Rate Limits
            
            alt Rate Limit OK
                ApiKeyFilter->>API_Service: Forward Request
                API_Service->>Client: Response
                ApiKeyFilter->>MongoDB: Update lastUsedAt
                ApiKeyFilter->>Redis: Increment Counters
            else Rate Limit Exceeded
                ApiKeyFilter->>Client: 429 Too Many Requests
            end
        else No Permission
            PermissionService->>Client: 403 Forbidden
        end
    else Key Invalid
        ApiKeyService->>Client: 401 Unauthorized
    end
```

## API Key Structure

### Key Format

API Keys follow a structured format for security and identification:

```
Format: ak_1a2b3c4d5e6f7890.sk_live_abcdefghijklmnopqrstuvwxyz123456
        ↑                   ↑
        Key ID              Secret Key
        (Public)            (Private)
```

### Data Model

```java
@Data
@Document(collection = "api_keys")
public class ApiKey {
    @Id
    private String id;
    
    @Indexed(unique = true)
    private String keyId;              // "ak_1a2b3c4d5e6f7890"
    
    private String hashedKey;          // BCrypt hash of secret
    private String name;               // "Mobile App Production"
    private String description;        // Key description
    private String userId;             // Owner user ID
    
    // Permissions & Scopes
    private List<String> scopes;       // ["devices:read", "alerts:write"]
    private List<String> roles;        // ["API_USER", "DEVICE_MANAGER"]
    
    // Rate Limiting
    private RateLimits rateLimits;
    
    // Metadata
    private String environment;        // "production", "staging", "development"
    private String clientApp;          // "mobile-app", "dashboard"
    private Set<String> allowedIps;    // IP whitelist (optional)
    
    // Lifecycle
    private LocalDateTime createdAt;
    private LocalDateTime lastUsedAt;
    private LocalDateTime expiresAt;   // Optional expiration
    private boolean active;
    private boolean revoked;
}
```

## Rate Limiting

### Rate Limit Structure

```java
@Data
public class RateLimits {
    private Integer requestsPerMinute;  // 60
    private Integer requestsPerHour;    // 1000
    private Integer requestsPerDay;     // 10000
    private Integer burstCapacity;      // 10 (additional burst requests)
    private Double burstRefillRate;     // 1.0 (burst refill speed)
}
```

### Rate Limiting Flow

```mermaid
sequenceDiagram
    participant Request
    participant RateFilter
    participant RateService
    participant Redis

    Request->>RateFilter: API Request with Key
    RateFilter->>RateService: Check Rate Limits
    
    RateService->>Redis: Get Current Counts
    Redis->>RateService: Return Counts
    
    RateService->>RateService: Calculate Remaining
    
    alt Limit Not Exceeded
        RateService->>Redis: Increment Counters
        RateService->>RateFilter: Allow Request
        RateFilter->>Request: Continue Processing
    else Limit Exceeded
        RateService->>RateFilter: Deny Request
        RateFilter->>Request: 429 Too Many Requests + Headers
    end
```

### Rate Limit Headers

All API responses include rate limit information:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1609459200
X-RateLimit-Window: 3600
```

## Scopes and Permissions

### Available Scopes

| Scope | Description | Example Endpoints |
|-------|-------------|-------------------|
| `devices:read` | Read device information | `GET /api/devices` |
| `devices:write` | Create/update devices | `POST /api/devices` |
| `alerts:read` | Read alerts | `GET /api/alerts` |
| `alerts:write` | Create/manage alerts | `POST /api/alerts` |
| `scripts:execute` | Execute scripts | `POST /api/scripts/execute` |
| `reports:read` | Access reports | `GET /api/reports` |
| `admin:read` | Read admin data | `GET /api/admin/users` |
| `admin:write` | Admin operations | `POST /api/admin/users` |

### Role-Based Access

API Keys can be assigned roles that group multiple scopes:

| Role | Included Scopes | Use Case |
|------|----------------|----------|
| `API_USER` | `devices:read`, `alerts:read` | Basic read access |
| `DEVICE_MANAGER` | `devices:*`, `alerts:*` | Device management |
| `SCRIPT_RUNNER` | `scripts:execute`, `devices:read` | Automation scripts |
| `ADMIN` | `*:*` | Full administrative access |

## API Endpoints

### Create API Key

```http
POST /api/api-keys
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "name": "Mobile App Production",
  "description": "API key for mobile application",
  "scopes": ["devices:read", "alerts:write"],
  "environment": "production",
  "rateLimits": {
    "requestsPerMinute": 60,
    "requestsPerHour": 1000,
    "requestsPerDay": 10000
  },
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "keyId": "ak_1a2b3c4d5e6f7890",
  "secret": "sk_live_abcdefghijklmnopqrstuvwxyz123456",
  "fullKey": "ak_1a2b3c4d5e6f7890.sk_live_abcdefghijklmnopqrstuvwxyz123456",
  "name": "Mobile App Production",
  "scopes": ["devices:read", "alerts:write"],
  "rateLimits": {
    "requestsPerMinute": 60,
    "requestsPerHour": 1000,
    "requestsPerDay": 10000
  },
  "createdAt": "2023-04-01T12:00:00Z"
}
```

### List API Keys

```http
GET /api/api-keys?page=0&size=20&active=true
Authorization: Bearer <jwt-token>
```

### Get API Key Details

```http
GET /api/api-keys/{keyId}
Authorization: Bearer <jwt-token>
```

### Update API Key

```http
PUT /api/api-keys/{keyId}
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "name": "Updated Mobile App Key",
  "scopes": ["devices:read", "devices:write", "alerts:read"],
  "active": true
}
```

### Regenerate API Key

```http
POST /api/api-keys/{keyId}/regenerate
Authorization: Bearer <jwt-token>
```

### Delete API Key

```http
DELETE /api/api-keys/{keyId}
Authorization: Bearer <jwt-token>
```

### Get Usage Statistics

```http
GET /api/api-keys/{keyId}/usage?period=day
Authorization: Bearer <jwt-token>
```

## Using API Keys

### Authentication Header

Include the API key in the `X-API-Key` header:

```http
GET /api/devices
X-API-Key: ak_1a2b3c4d5e6f7890.sk_live_abcdefghijklmnopqrstuvwxyz123456
```

### Example Requests

**Get Devices:**
```bash
curl -H "X-API-Key: ak_1a2b3c4d5e6f7890.sk_live_abcdefghijklmnopqrstuvwxyz123456" \
     https://api.openframe.com/api/devices
```

**Create Alert:**
```bash
curl -X POST \
     -H "X-API-Key: ak_1a2b3c4d5e6f7890.sk_live_abcdefghijklmnopqrstuvwxyz123456" \
     -H "Content-Type: application/json" \
     -d '{"type":"CPU_HIGH","severity":"WARNING","deviceId":"device123"}' \
     https://api.openframe.com/api/alerts
```

## Error Responses

### Authentication Errors

```json
{
  "error": "unauthorized",
  "message": "Invalid API key",
  "timestamp": "2023-04-01T12:00:00Z"
}
```

### Permission Errors

```json
{
  "error": "forbidden",
  "message": "Insufficient permissions for this operation",
  "requiredScope": "devices:write",
  "timestamp": "2023-04-01T12:00:00Z"
}
```

### Rate Limit Errors

```json
{
  "error": "rate_limit_exceeded",
  "message": "Rate limit exceeded",
  "retryAfter": 60,
  "timestamp": "2023-04-01T12:00:00Z"
}
```

## Security Best Practices

### Key Management

1. **Store Securely**: Never commit API keys to version control
2. **Rotate Regularly**: Regenerate keys periodically
3. **Use Environment Variables**: Store keys in environment variables
4. **Limit Scope**: Grant minimal required permissions
5. **Monitor Usage**: Track API key usage and anomalies

### Implementation Guidelines

1. **Use HTTPS**: Always use secure connections
2. **Validate Input**: Validate all request parameters
3. **Log Activity**: Log API key usage for auditing
4. **Handle Errors**: Implement proper error handling
5. **Rate Limiting**: Respect rate limits and implement backoff

### Example Environment Configuration

```bash
# .env
OPENFRAME_API_KEY=ak_1a2b3c4d5e6f7890.sk_live_abcdefghijklmnopqrstuvwxyz123456
OPENFRAME_API_URL=https://api.openframe.com
```

## Monitoring and Analytics

### Usage Metrics

Track API key usage with the following metrics:

- Request count per time period
- Success/error rates
- Response times
- Rate limit hits
- Top endpoints accessed

### Alerts

Set up alerts for:

- Unusual usage patterns
- High error rates
- Rate limit violations
- Unauthorized access attempts
- Key expiration warnings

## Migration Guide

### From JWT to API Keys

If migrating from JWT-based authentication:

1. Create API key with equivalent permissions
2. Update client applications to use `X-API-Key` header
3. Test thoroughly in staging environment
4. Gradually migrate production traffic
5. Monitor for issues and performance impact

### Backward Compatibility

API keys work alongside existing authentication methods:

- JWT tokens continue to work for user authentication
- API keys are specifically for programmatic access
- Both can be used in the same application for different purposes

## Troubleshooting

### Common Issues

**Invalid API Key:**
- Verify key format and completeness
- Check if key is active and not revoked
- Ensure key hasn't expired

**Permission Denied:**
- Verify required scopes are assigned
- Check if endpoint requires specific permissions
- Confirm user roles allow the operation

**Rate Limit Exceeded:**
- Check current rate limits
- Implement exponential backoff
- Consider requesting higher limits

**Network Issues:**
- Verify HTTPS is being used
- Check firewall and proxy settings
- Ensure API endpoint is accessible

### Support

For additional support:

- Check the [API Documentation](endpoints.md)
- Review [Integration Examples](integration.md)
- Contact support at support@openframe.com

## Next Steps

- [API Endpoints](endpoints.md) - Complete API reference
- [Integration Guide](integration.md) - Integration patterns and examples
- [WebSocket API](websocket.md) - Real-time API documentation
- [Authentication](authentication.md) - Complete authentication guide