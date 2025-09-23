# OpenFrame Authorization Server

The OpenFrame Authorization Server is a Spring Authorization Server-based OAuth2/OIDC provider that handles authentication and authorization for the OpenFrame platform. It provides comprehensive RBAC (Role-Based Access Control) functionality with multi-tenant support.

## Features

- **OAuth 2.1 & OpenID Connect 1.0** compliance
- **JWT Token Generation** with custom claims
- **MongoDB-based RBAC** with hierarchical roles
- **Multi-tenant Architecture** ready
- **Cookie-based Authentication** with HttpOnly cookies
- **Direct API Access** (bypasses Gateway for external access)
- **Comprehensive User Management** with security features
- **Role Inheritance** and permission aggregation
- **MFA Support** (future enhancement)

## Architecture

The Authorization Server operates independently from the Gateway to support future multi-tenant deployments where it will be centralized across multiple clusters.

```
Frontend → Authorization Server (Direct) → JWT Token
Frontend → Gateway → Backend Services (with JWT validation)
```

## Configuration

### Environment Profiles

- **local**: Local development (port 9000)
- **docker**: Docker deployment  
- **production**: Production deployment

### Key Configuration Properties

```yaml
server:
  port: 9000

spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/openframe-authz
    redis:
      host: localhost
      port: 6379

openframe:
  security:
    jwt:
      issuer: http://localhost:9000
  rbac:
    default-tenant: "default"
    default-roles:
      - "USER"
```

## MongoDB Collections

### Users Collection
```javascript
// Document structure
{
  "_id": "user_id",
  "tenantId": "tenant_123",
  "username": "john.doe",
  "email": "john.doe@example.com",
  "passwordHash": "$2a$12$...",
  "status": "ACTIVE",
  "profile": {
    "firstName": "John",
    "lastName": "Doe",
    "preferredLanguage": "en-US",
    "timezone": "UTC",
    "department": "Engineering",
    "jobTitle": "Software Engineer"
  },
  "security": {
    "mfaEnabled": false,
    "lastLogin": "2024-01-15T10:30:00Z",
    "loginAttempts": 0,
    "lockedUntil": null,
    "passwordLastChanged": "2024-01-01T00:00:00Z"
  },
  "roles": [
    {
      "roleId": "role_123",
      "assignedAt": "2024-01-01T00:00:00Z",
      "assignedBy": "admin_user_id"
    }
  ],
  "organizations": [
    {
      "organizationId": "org_123",
      "role": "MEMBER",
      "joinedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Roles Collection
```javascript
// Document structure
{
  "_id": "role_id",
  "tenantId": "tenant_123",
  "name": "ADMIN",
  "displayName": "Administrator",
  "description": "Full system access",
  "type": "SYSTEM",
  "status": "ACTIVE",
  "category": "ADMIN",
  "priority": 1,
  "permissionIds": ["perm_1", "perm_2"],
  "inheritedRoleIds": ["role_base_123"],
  "scopes": [
    {
      "scope": "openframe.admin",
      "description": "Admin scope"
    }
  ],
  "metadata": {
    "description": "System administrator role",
    "documentation": "https://docs.openframe.com/roles/admin"
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### OAuth2 Clients Collection
Automatically managed by the Authorization Server.

### SSO Configurations Collection
```javascript
// Document structure for federated identity providers
{
  "_id": "sso_config_id",
  "provider": "google",
  "clientId": "your-google-client-id",
  "clientSecret": "encrypted-client-secret",
  "enabled": true
}
```

## Dynamic OAuth2 Client Registrations

The Authorization Server supports **dynamic OAuth2 client registrations** loaded from MongoDB. This allows runtime configuration of federated identity providers without restarting the server.

### Supported Providers
- **Google**: OAuth2 + OIDC 
- **Microsoft**: Azure AD OAuth2 + OIDC  
- **Slack**: OAuth2

### Configuration Management

OAuth2 provider configurations are stored in the `sso_configs` MongoDB collection and loaded dynamically:

```java
// Example: Configure Google OAuth2
SSOConfig googleConfig = new SSOConfig();
googleConfig.setProvider("google");
googleConfig.setClientId("your-google-client-id");
googleConfig.setClientSecret(encryptedSecret); // Encrypted with EncryptionService
googleConfig.setEnabled(true);
ssoConfigRepository.save(googleConfig);
```

### Management Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/sso/configs` | GET | Get all SSO configurations |
| `/admin/sso/configs/enabled` | GET | Get enabled SSO configurations |
| `/admin/sso/providers` | GET | Get configured providers |
| `/admin/sso/providers/{provider}/status` | GET | Check provider status |
| `/admin/sso/test/{provider}` | GET | Test provider configuration |
| `/admin/sso/cache/clear` | POST | Clear OAuth2 client cache |

### Example API Usage

```bash
# Check Google provider status
curl http://localhost:9000/admin/sso/providers/google/status

# Response:
{
  "provider": "google",
  "enabled": true,
  "configured": true,
  "clientId": "your-google-client-id"
}

# Test Google configuration  
curl http://localhost:9000/admin/sso/test/google

# Response:
{
  "provider": "google",
  "status": "success",
  "clientId": "your-google-client-id",
  "scopes": ["openid", "email", "profile"],
  "authorizationUri": "https://accounts.google.com/o/oauth2/v2/auth",
  "tokenUri": "https://oauth2.googleapis.com/token"
}
```

## API Endpoints

### OAuth2/OIDC Endpoints

- `GET /oauth2/authorize` - Authorization endpoint
- `POST /oauth2/token` - Token endpoint  
- `POST /oauth2/revoke` - Token revocation
- `POST /oauth2/introspect` - Token introspection
- `GET /.well-known/jwks.json` - JWK Set
- `GET /.well-known/openid-configuration` - OIDC Discovery

### Health & Monitoring

- `GET /actuator/health` - Health check
- `GET /actuator/metrics` - Metrics
- `GET /actuator/prometheus` - Prometheus metrics

## JWT Token Structure

```json
{
  "iss": "http://localhost:9000",
  "sub": "user_id",
  "aud": "openframe-frontend",
  "exp": 1640995200,
  "iat": 1640991600,
  "username": "john.doe",
  "email": "john@example.com",
  "full_name": "John Doe",
  "tenant_id": "tenant_id",
  "roles": ["USER", "DEVICE_ADMIN"],
  "permissions": ["device.read", "device.write", "profile.read"],
  "scopes": ["GLOBAL:*"],
  "organizations": ["org_id"],
  "authorities": ["ROLE_USER", "ROLE_DEVICE_ADMIN"],
  "mfa_enabled": false
}
```

## Development

### Prerequisites

- Java 21
- Maven 3.9+
- MongoDB 6.0+
- Redis 7.0+

### Running Locally

```bash
# Start MongoDB and Redis
docker-compose -f docker-compose.openframe-infrastructure.yml up -d mongodb redis

# Run the Authorization Server
cd openframe/services/openframe-authorization-server
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

### Building Docker Image

```bash
cd openframe/services/openframe-authorization-server
docker build -t openframe/authorization-server:latest .
```

### Default Clients

The server automatically creates these default OAuth2 clients:

1. **openframe-frontend**
   - Client ID: `openframe-frontend`
   - Grant Types: `authorization_code`, `refresh_token`
   - PKCE: Required
   - Scopes: `openid`, `profile`, `email`, `openframe.read`, `openframe.write`

2. **openframe-external-api**
   - Client ID: `openframe-external-api`
   - Grant Types: `client_credentials`
   - Scopes: `openframe.read`, `openframe.write`

## RBAC System

### Role Hierarchy

Roles can inherit from other roles, creating a hierarchy:

```
SUPER_ADMIN
  └── TENANT_ADMIN
      ├── DEVICE_ADMIN
      │   └── DEVICE_OPERATOR
      └── USER_ADMIN
          └── USER
```

### Permission Resolution

1. Direct permissions from assigned roles
2. Inherited permissions from parent roles
3. Permissions are aggregated and deduplicated
4. Circular dependencies are prevented

### Scope Types

- **GLOBAL**: Access to all resources
- **ORGANIZATION**: Access within specific organization
- **PROJECT**: Access within specific project  
- **DEVICE**: Access to specific devices

## Security Features

### Password Security
- BCrypt hashing with strength 12
- Password history (last 5 passwords)
- Configurable password policies

### Account Lockout
- Configurable max failed attempts (default: 5)
- Lockout duration (default: 30 minutes)
- Automatic unlock after duration

### JWT Security
- RSA 2048-bit key pairs for signing
- Rotating key support
- Configurable token expiration

### Multi-Factor Authentication
- TOTP support (future enhancement)
- Backup codes (future enhancement)

## Monitoring & Observability

### Health Checks
- MongoDB connectivity
- Redis connectivity  
- Application status

### Metrics
- Authentication attempts
- Token generation rates
- User login patterns
- Role assignment statistics

### Logging
- Authentication events
- Authorization decisions
- Role assignments
- Security violations

## Multi-Tenant Migration Plan

### Phase 1: Current State (Single Cluster)
- Authorization Server within cluster
- Direct frontend access
- MongoDB per cluster

### Phase 2: Multi-Tenant (Future)
- Centralized Authorization Server
- Shared MongoDB for users/roles
- Per-tenant data isolation
- Cross-cluster JWT validation

## Troubleshooting

### Common Issues

1. **JWT Validation Fails**
   - Check issuer URL configuration
   - Verify JWK endpoint accessibility
   - Confirm clock synchronization

2. **User Cannot Login**
   - Check user status (ACTIVE)
   - Verify account not locked
   - Confirm password not expired

3. **Role Permissions Not Working**
   - Verify role inheritance chain
   - Check permission assignments
   - Confirm role is ACTIVE

### Debug Logging

Enable debug logging for detailed troubleshooting:

```yaml
logging:
  level:
    com.openframe.authz: DEBUG
    org.springframework.security: DEBUG
    org.springframework.security.oauth2: TRACE
```

## Performance Considerations

### Database Indexes

Essential indexes are automatically created:

```javascript
// Users collection
db.users.createIndex({"tenantId": 1, "username": 1}, {unique: true})
db.users.createIndex({"tenantId": 1, "email": 1}, {unique: true})

// Roles collection  
db.roles.createIndex({"tenantId": 1, "name": 1}, {unique: true})
db.roles.createIndex({"type": 1, "status": 1})
```

### Caching Strategy

- JWT tokens cached in Redis
- Role permissions cached per user
- Client configurations cached

### Connection Pooling

MongoDB and Redis connection pools are configured for optimal performance:

```yaml
spring:
  data:
    mongodb:
      connection-pool:
        max-size: 100
        min-size: 5
    redis:
      lettuce:
        pool:
          max-active: 8
          max-idle: 8
```

## Contributing

1. Follow Spring Security best practices
2. Maintain backward compatibility for JWT claims
3. Add comprehensive tests for RBAC changes
4. Update documentation for new features
5. Consider multi-tenant implications

## License

This project is licensed under the MIT License. 