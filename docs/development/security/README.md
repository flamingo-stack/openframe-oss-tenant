# Security Best Practices

This document covers the security architecture, patterns, and best practices for OpenFrame OSS Tenant. Security is built into every layer of the platform — from the JWT authorization model to MongoDB query scoping.

---

## Security Architecture Overview

```mermaid
flowchart TD
    Client["Client Request"] --> OriginSanitizer["Origin Sanitizer Filter\n(prevent header injection)"]
    OriginSanitizer --> AuthHeader["Authorization Header Normalizer\n(cookie / header / query param → Bearer)"]
    AuthHeader --> JwtValidator["Multi-Issuer JWT Validator\n(per-tenant RSA keys)"]
    JwtValidator --> RoleEnforcer["Role-Based Authorization\n(RBAC)"]
    RoleEnforcer --> ApiKeyFilter["API Key Filter\n(external-api routes only)"]
    ApiKeyFilter --> RateLimiter["Rate Limiter\n(Redis sliding window)"]
    RateLimiter --> BackendService["Backend Service"]
    BackendService --> MongoQuery["Tenant-Scoped MongoDB Query\n(tenantId filter)"]
```

---

## Authentication & Authorization

### OAuth2 / OIDC with Per-Tenant JWT Keys

OpenFrame uses **Spring Authorization Server** to implement a full OAuth2/OIDC authorization server.

Key security characteristics:
- **Per-tenant RSA key pairs** — Each tenant gets its own RSA-2048 signing key, stored encrypted in MongoDB
- **Short-lived access tokens** — Configurable TTL, default designed for short sessions
- **Refresh token rotation** — New refresh token issued on each use
- **PKCE support** — Secure public client flows (SPA, mobile)

```mermaid
flowchart TD
    A["Token Request"] --> B["TenantKeyService"]
    B -->|"Key exists"| C["Return RSAKey for tenant"]
    B -->|"No key"| D["Generate RSA-2048 key pair"]
    D --> E["Encrypt private key"]
    E --> F["Store in MongoDB"]
    F --> C
    C --> G["Sign JWT with tenant key"]
```

### JWT Claims Structure

All JWTs issued by OpenFrame include:

```json
{
  "tenant_id": "your-tenant-id",
  "userId": "user-object-id",
  "roles": ["ROLE_ADMIN"],
  "scope": "openid profile",
  "iss": "https://your-domain/sas/your-tenant-id",
  "exp": 1700000000,
  "iat": 1699996400
}
```

### Role Definitions

| Role | Description | Gateway Access |
|---|---|---|
| `ROLE_OWNER` | Tenant owner (implies ADMIN) | All admin routes |
| `ROLE_ADMIN` | Full platform access | `/api/**` |
| `ROLE_AGENT` | OpenFrame client agent | `/tools/agent/**`, `/ws/tools/agent/**` |
| `SCOPE_*` | OAuth2 scopes | As configured |

### SSO Configuration

Google and Microsoft SSO are supported. Configure via the Settings → SSO section:
- Uses `SsoAuthorizationRequestResolver` for provider-specific flows
- Supports both tenant registration and invitation acceptance via SSO
- Cookie-based state (`SsoCookieCodec`) for secure PKCE flow

---

## API Key Security

### External API Authentication

API keys authenticate requests to the `/external-api/**` routes:

```mermaid
flowchart TD
    A["/external-api/* Request"] --> B["Check X-API-Key header"]
    B --> C["ApiKeyValidationService\n(verify hash in MongoDB)"]
    C --> D["RateLimitService\n(Redis sliding window)"]
    D -->|"Within limit"| E["Forward request"]
    D -->|"Exceeded"| F["429 Too Many Requests"]
```

**API Key best practices:**
- Keys are stored as **hashed values** in MongoDB — the plaintext is shown only once at creation
- Keys have configurable rate limits per window
- API key stats (usage counts) are tracked via Redis and synced to MongoDB by the Management Service scheduler
- Revoke keys immediately when not needed

---

## Data Security & Multi-Tenancy

### MongoDB Tenant Isolation

Every MongoDB query includes a `tenantId` filter enforced at the repository layer. Direct queries without `tenantId` are prevented by base repository abstractions.

```java
// Example: All repositories extend BaseTenantRepository
// which automatically scopes queries to the current tenant
query.addCriteria(Criteria.where("tenantId").is(TenantContext.getTenantId()));
```

**Never bypass the repository layer** to query MongoDB directly without tenant scoping.

### Redis Key Namespace

Redis keys follow a tenant-aware pattern:
```text
of:{tenantId}:{environment}:{keyName}
```

This prevents cross-tenant data leakage in shared Redis instances.

### NATS Topic Isolation

NATS topics include tenant identifiers in the subject hierarchy to prevent cross-tenant message delivery.

---

## Input Validation & Sanitization

### Bean Validation

All DTOs use Jakarta Bean Validation (`@NotNull`, `@Email`, `@Pattern`, etc.):

```java
// Example from CreateOrganizationRequest
@NotBlank
private String name;

@Email
private String contactEmail;
```

### Custom Validators

OpenFrame includes custom validators:
- `@TenantDomain` — Validates tenant domain slug format (lowercase letters, numbers, hyphens only)
- `@ValidEmail` — Enhanced email validation beyond standard `@Email`

### GraphQL Input Validation

GraphQL mutations validate inputs through:
1. Schema-level type checking
2. Domain service validation
3. Custom `DomainValidationService` for business rules

---

## Secrets Management

### Environment Variables

Never hardcode credentials. Use environment variables or your secrets management system:

```bash
# Required secrets (never commit these)
SPRING_DATA_MONGODB_URI=mongodb://user:password@host:27017/db
SPRING_REDIS_PASSWORD=<redis-password>
JWT_SIGNING_KEY=<base64-encoded-key>
```

### Private Key Encryption

Tenant RSA private keys are **encrypted before storage** in MongoDB using the `EncryptionService` from `openframe-core-crypto`. The encryption key itself must be protected via your secrets management solution.

### Config Server Secrets

For production, encrypt sensitive values in the Config Server using Spring Cloud Config's encryption:

```bash
# Encrypt a value (requires encryption key configured in Config Server)
curl -X POST http://config-server:8888/encrypt -d 'my-secret-value'
# Returns: {cipher}AQA...

# Use in application.yml
spring:
  datasource:
    password: '{cipher}AQA...'
```

---

## Common Security Vulnerabilities & Mitigations

| Vulnerability | Mitigation in OpenFrame |
|---|---|
| **Cross-Tenant Data Leakage** | `tenantId` enforced at repository layer on every query |
| **JWT Forgery** | Per-tenant RSA keys; strict issuer validation |
| **CSRF** | Disabled (stateless REST/GraphQL API); token-based auth |
| **SQL/NoSQL Injection** | MongoDB criteria builder; no raw query strings |
| **API Abuse** | Rate limiting via Redis; API key validation |
| **Credential Exposure** | Keys hashed in DB; private keys encrypted at rest |
| **Header Injection** | `OriginSanitizerFilter` strips malicious origin headers |
| **Token Replay** | Refresh token rotation; short access token TTL |
| **Mass Assignment** | DTOs with explicit fields; no raw request maps |
| **CORS** | Configured via `CorsConfig`; restrict in production |

---

## Security Testing Guidelines

### Unit Testing Security Components

```java
// Example: Test authentication configuration
@SpringBootTest
@WithMockUser(roles = "ADMIN")
class ApiSecurityTest {
    @Test
    void adminEndpoint_withAdminRole_returns200() {
        // ...
    }

    @Test
    void adminEndpoint_withoutAuth_returns401() {
        // ...
    }
}
```

### Integration Testing with `spring-security-test`

The project includes `spring-security-test` as a dependency:

```java
// Use MockMvc with security
mockMvc.perform(
    get("/api/v1/organizations")
        .with(jwt().claim("tenant_id", "test-tenant").roles("ADMIN"))
).andExpect(status().isOk());
```

### API Key Testing

```bash
# Test rate limiting
for i in {1..20}; do
    curl -s -o /dev/null -w "%{http_code}" \
        http://localhost:8080/external-api/v1/devices \
        -H "X-API-Key: your-test-key"
    echo ""
done
```

---

## Security Code Review Checklist

Before submitting a PR, review:

- [ ] No hardcoded credentials, tokens, or secrets
- [ ] All DTOs have input validation annotations
- [ ] MongoDB queries go through repository layer (not raw MongoTemplate)
- [ ] New endpoints have appropriate role annotations
- [ ] Sensitive data is not logged (use `@JsonIgnore` or mask in logs)
- [ ] New API keys/tokens follow the existing hash-and-store pattern
- [ ] Multi-tenant isolation is preserved for new data models
- [ ] Exception handlers don't expose internal details to clients

---

## Production Security Checklist

For production deployments:

- [ ] Use TLS/HTTPS for all service-to-service and client communication
- [ ] Rotate tenant RSA keys periodically
- [ ] Set appropriate JWT token TTLs (access: short, refresh: longer)
- [ ] Enable MongoDB authentication and configure TLS
- [ ] Restrict CORS origins to your actual frontend domain
- [ ] Enable Redis AUTH and TLS
- [ ] Use a dedicated secrets manager (HashiCorp Vault, AWS Secrets Manager, etc.)
- [ ] Configure rate limits appropriate for your traffic
- [ ] Enable Spring Boot Actuator security (restrict `/actuator/**` endpoints)
- [ ] Review and tighten role-based access control rules

---

## Reporting Security Issues

Security vulnerabilities should be reported to the OpenFrame team via the **OpenMSP Slack** community:

- **Community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

> Do **not** open public GitHub issues for security vulnerabilities. Report them privately via Slack.
