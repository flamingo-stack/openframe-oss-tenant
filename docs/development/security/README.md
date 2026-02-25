# Security Best Practices

OpenFrame implements comprehensive security measures across all architectural layers. This guide covers authentication, authorization, data protection, and security best practices for development and deployment.

## Security Architecture Overview

```mermaid
flowchart TB
    subgraph "Client Layer"
        Browser[Web Browser]
        Desktop[Desktop Client]
        Mobile[Mobile App]
        Agent[Device Agent]
    end
    
    subgraph "Edge Security"
        CDN[CDN/WAF<br/>DDoS Protection]
        LoadBalancer[Load Balancer<br/>TLS Termination]
    end
    
    subgraph "API Gateway Security"
        Gateway[Gateway Service<br/>JWT Validation]
        RateLimit[Rate Limiting]
        CORS[CORS Policy]
    end
    
    subgraph "Identity & Access"
        AuthServer[Authorization Server<br/>OAuth2/OIDC]
        TenantKeys[Tenant RSA Keys]
        RBAC[Role-Based Access]
    end
    
    subgraph "Service Security"
        ServiceMesh[Service Mesh<br/>mTLS]
        APIKeys[API Key Management]
        Secrets[Secret Management]
    end
    
    subgraph "Data Security"
        Encryption[Data Encryption]
        Audit[Audit Logging]
        Backup[Secure Backup]
    end
    
    Browser --> CDN
    Desktop --> CDN
    Mobile --> CDN
    Agent --> LoadBalancer
    
    CDN --> LoadBalancer
    LoadBalancer --> Gateway
    Gateway --> RateLimit
    RateLimit --> CORS
    
    CORS --> AuthServer
    AuthServer --> TenantKeys
    TenantKeys --> RBAC
    
    RBAC --> ServiceMesh
    ServiceMesh --> APIKeys
    APIKeys --> Secrets
    
    Secrets --> Encryption
    Encryption --> Audit
    Audit --> Backup
```

## Authentication and Authorization

### Multi-Tenant OAuth2/OIDC Implementation

OpenFrame uses a sophisticated multi-tenant authentication system built on Spring Authorization Server:

**Tenant-Scoped Authentication Flow:**

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Gateway
    participant AuthServer
    participant TenantDB
    
    User->>Frontend: Login Request
    Frontend->>AuthServer: OAuth2 Authorization Code Flow
    AuthServer->>TenantDB: Validate Tenant & User
    TenantDB-->>AuthServer: User Info + Tenant Claims
    AuthServer->>AuthServer: Generate JWT with tenant_id
    AuthServer-->>Frontend: Access Token (JWT)
    Frontend->>Gateway: API Request + JWT
    Gateway->>Gateway: Validate JWT + Extract tenant_id
    Gateway->>API: Forward Request + Tenant Context
```

**Key Security Features:**
- **Tenant-specific RSA keys** for JWT signing and validation
- **Dynamic client registration** per tenant
- **SSO integration** with Google Workspace and Microsoft Azure AD
- **Refresh token rotation** for enhanced security
- **Session management** with secure cookies

### JWT Token Structure

**Example JWT Claims:**
```json
{
  "iss": "https://auth.openframe.dev/tenant/{tenant_id}",
  "sub": "user:123",
  "aud": ["openframe-api", "openframe-gateway"],
  "exp": 1640995200,
  "iat": 1640991600,
  "tenant_id": "tenant_abc123",
  "organization_id": "org_xyz789",
  "roles": ["ADMIN", "DEVICE_MANAGER"],
  "permissions": ["devices:read", "devices:write", "users:manage"],
  "session_id": "sess_456def"
}
```

**Security Validations:**
- **Signature verification** using tenant-specific RSA public keys
- **Issuer validation** against expected tenant issuer URL
- **Audience validation** for service-specific access
- **Expiration time** enforcement (default: 1 hour access, 30 days refresh)
- **Tenant isolation** enforcement at every request

### Role-Based Access Control (RBAC)

OpenFrame implements a flexible RBAC system with hierarchical roles:

**Role Hierarchy:**
```text
SUPER_ADMIN
├── TENANT_ADMIN
│   ├── ORGANIZATION_ADMIN
│   │   ├── DEVICE_MANAGER
│   │   ├── USER_MANAGER
│   │   └── VIEWER
│   └── TECHNICIAN
│       ├── DEVICE_OPERATOR
│       └── INCIDENT_RESPONDER
└── API_USER
    ├── INTEGRATION_READ
    └── INTEGRATION_WRITE
```

**Permission Model:**
```java
@PreAuthorize("hasRole('DEVICE_MANAGER') and hasPermission('device', #deviceId, 'WRITE')")
public DeviceResponse updateDevice(@PathVariable String deviceId, 
                                  @RequestBody UpdateDeviceRequest request) {
    // Implementation with automatic tenant scoping
}
```

## API Security

### API Key Authentication

For external integrations, OpenFrame supports API key authentication with comprehensive security controls:

**API Key Format:**
```text
Format: ak_1a2b3c4d5e6f7890.sk_live_abcdefghijklmnopqrstuvwxyz123456
        ↑                   ↑
        Key ID              Secret Key
```

**Security Features:**
- **Scoped permissions** - Keys are limited to specific API endpoints
- **Rate limiting** - Per-key rate limits and quotas
- **Expiration dates** - Automatic key expiration
- **Usage tracking** - Comprehensive audit logs for API key usage
- **IP restrictions** - Optional IP allowlisting for keys
- **Environment separation** - Different keys for development/production

**API Key Security Implementation:**
```java
@Component
public class ApiKeyAuthenticationFilter implements WebFilter {
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String apiKey = extractApiKey(exchange.getRequest());
        
        return validateApiKey(apiKey)
            .flatMap(keyInfo -> enforceRateLimit(keyInfo, exchange))
            .flatMap(keyInfo -> validatePermissions(keyInfo, exchange))
            .flatMap(keyInfo -> auditApiKeyUsage(keyInfo, exchange))
            .then(chain.filter(exchange));
    }
}
```

### Input Validation and Sanitization

**Request Validation:**
```java
@RestController
@Validated
public class OrganizationController {
    
    @PostMapping("/organizations")
    public ResponseEntity<Organization> createOrganization(
            @Valid @RequestBody CreateOrganizationRequest request,
            @Parameter(description = "Tenant context") 
            @TenantId String tenantId) {
        
        // Input is automatically validated and sanitized
        return organizationService.createOrganization(request, tenantId);
    }
}

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class CreateOrganizationRequest {
    
    @NotBlank(message = "Organization name is required")
    @Size(max = 100, message = "Organization name must be less than 100 characters")
    @Pattern(regexp = "^[a-zA-Z0-9\\s\\-\\.]+$", message = "Invalid characters in organization name")
    private String name;
    
    @Email(message = "Invalid email format")
    @NotNull(message = "Contact email is required")
    private String contactEmail;
    
    @Size(max = 500, message = "Description must be less than 500 characters")
    private String description;
}
```

**SQL Injection Prevention:**
- **Parameterized queries** for all database operations
- **ORM usage** (JPA/Hibernate) prevents direct SQL construction
- **Input sanitization** for user-provided content
- **Query whitelisting** for dynamic query scenarios

**XSS Prevention:**
```java
@Component
public class XSSProtectionFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        XSSRequestWrapper wrappedRequest = new XSSRequestWrapper(httpRequest);
        
        chain.doFilter(wrappedRequest, response);
    }
}

public class XSSRequestWrapper extends HttpServletRequestWrapper {
    
    @Override
    public String getParameter(String parameter) {
        return sanitizeInput(super.getParameter(parameter));
    }
    
    private String sanitizeInput(String value) {
        if (value == null) return null;
        
        // Remove script tags, event handlers, etc.
        return Jsoup.clean(value, Whitelist.basicWithImages());
    }
}
```

## Data Encryption and Secure Storage

### Encryption at Rest

**Database Encryption:**
```yaml
# MongoDB encryption configuration
security:
  encryption:
    keyVaultDB: "encryption"
    schemaMap:
      "openframe.users":
        encryptMetadata:
          keyId: "user-data-key"
        properties:
          personalInfo:
            encrypt:
              bsonType: "object"
              algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
```

**Application-Level Encryption:**
```java
@Service
public class EncryptionService {
    
    private final AESUtil aesUtil;
    
    @Value("${openframe.encryption.key}")
    private String encryptionKey;
    
    public String encryptSensitiveData(String plainText) {
        try {
            return aesUtil.encrypt(plainText, encryptionKey);
        } catch (Exception e) {
            throw new EncryptionException("Failed to encrypt sensitive data", e);
        }
    }
    
    public String decryptSensitiveData(String encryptedText) {
        try {
            return aesUtil.decrypt(encryptedText, encryptionKey);
        } catch (Exception e) {
            throw new EncryptionException("Failed to decrypt sensitive data", e);
        }
    }
}
```

### Encryption in Transit

**TLS Configuration:**
```yaml
# Gateway TLS configuration
server:
  port: 8443
  ssl:
    enabled: true
    key-store-type: PKCS12
    key-store: classpath:keystore.p12
    key-store-password: ${SSL_KEYSTORE_PASSWORD}
    protocol: TLS
    enabled-protocols: TLSv1.3,TLSv1.2
    ciphers: 
      - TLS_AES_256_GCM_SHA384
      - TLS_CHACHA20_POLY1305_SHA256
      - TLS_AES_128_GCM_SHA256
```

**Service-to-Service Communication:**
```java
@Configuration
public class ServiceMeshSecurityConfig {
    
    @Bean
    public WebClient secureWebClient() {
        SslContext sslContext = SslContextBuilder
            .forClient()
            .trustManager(InsecureTrustManagerFactory.INSTANCE)
            .protocols("TLSv1.3", "TLSv1.2")
            .build();
            
        HttpClient httpClient = HttpClient.create()
            .secure(sslContextSpec -> sslContextSpec.sslContext(sslContext));
            
        return WebClient.builder()
            .clientConnector(new ReactorClientHttpConnector(httpClient))
            .build();
    }
}
```

## Secrets Management

### Environment Variables and Configuration

**Secret Hierarchy:**
```text
1. Kubernetes Secrets (Production)
2. Docker Secrets (Container environments)
3. Environment Variables (Development)
4. Configuration Files (Local development only)
```

**Spring Cloud Config Integration:**
```yaml
# bootstrap.yml
spring:
  cloud:
    config:
      uri: ${CONFIG_SERVER_URL:http://localhost:8888}
      username: ${CONFIG_SERVER_USERNAME}
      password: ${CONFIG_SERVER_PASSWORD}
      fail-fast: true
      retry:
        max-attempts: 6
        initial-interval: 1000ms
encrypt:
  key: ${CONFIG_ENCRYPTION_KEY}
```

**Encrypted Configuration Values:**
```yaml
# application-prod.yml (encrypted values)
spring:
  datasource:
    password: '{cipher}AQA8Q9+N9vgKz2X8dNj2A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6'
  
anthropic:
  api-key: '{cipher}BQB9R0+O0whLa3Y9eOk3B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7'
  
oauth2:
  client-secret: '{cipher}CQC0S1+P1xiMb4Z0fPl4C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8'
```

### Vault Integration (Production)

**HashiCorp Vault Configuration:**
```java
@Configuration
@EnableVault
public class VaultConfig extends AbstractVaultConfiguration {
    
    @Override
    public ClientAuthentication clientAuthentication() {
        AppRoleAuthenticationOptions options = AppRoleAuthenticationOptions.builder()
            .roleId(RoleId.provided(vaultProperties.getAppRole().getRoleId()))
            .secretId(SecretId.provided(vaultProperties.getAppRole().getSecretId()))
            .build();
            
        return new AppRoleAuthentication(options, restOperations());
    }
    
    @Override
    public VaultEndpoint vaultEndpoint() {
        return VaultEndpoint.create(vaultProperties.getHost(), vaultProperties.getPort());
    }
}
```

## Security Vulnerabilities and Mitigations

### Common Threats and Defenses

**OWASP Top 10 Mitigations:**

| Threat | Mitigation Strategy |
|--------|-------------------|
| **Injection** | Parameterized queries, input validation, ORM usage |
| **Broken Authentication** | Multi-factor authentication, session management, JWT best practices |
| **Sensitive Data Exposure** | Encryption at rest/transit, data classification, secure storage |
| **XML External Entities** | Disable XML external entity processing, input validation |
| **Broken Access Control** | RBAC implementation, tenant isolation, principle of least privilege |
| **Security Misconfiguration** | Secure defaults, automated security scanning, configuration management |
| **Cross-Site Scripting** | Input sanitization, output encoding, CSP headers |
| **Insecure Deserialization** | Input validation, safe serialization libraries, type checking |
| **Known Vulnerabilities** | Dependency scanning, automated patching, security monitoring |
| **Insufficient Logging** | Comprehensive audit logs, security event monitoring, alerting |

### Dependency Security

**Maven Security Plugin Configuration:**
```xml
<plugin>
    <groupId>org.owasp</groupId>
    <artifactId>dependency-check-maven</artifactId>
    <version>8.4.0</version>
    <executions>
        <execution>
            <goals>
                <goal>check</goal>
            </goals>
        </execution>
    </executions>
    <configuration>
        <failBuildOnCVSS>7</failBuildOnCVSS>
        <suppressionFile>owasp-suppressions.xml</suppressionFile>
    </configuration>
</plugin>
```

**Automated Vulnerability Scanning:**
```bash
# Regular security scans in CI/CD pipeline
mvn org.owasp:dependency-check-maven:check

# Container security scanning
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  -v `$PWD`:/tmp -w /tmp aquasec/trivy image openframe/api-service:latest

# Infrastructure security scanning
checkov -d ./manifests/kubernetes/ --framework kubernetes
```

## Security Testing and Code Review Guidelines

### Security Testing Strategy

**Automated Security Testing:**
```java
@SpringBootTest
@AutoConfigureTestDatabase
@TestPropertySource(properties = {
    "spring.profiles.active=test",
    "logging.level.org.springframework.security=DEBUG"
})
class SecurityIntegrationTest {
    
    @Test
    void testUnauthorizedAccess() {
        // Test that endpoints require authentication
        webTestClient.get()
            .uri("/api/devices")
            .exchange()
            .expectStatus().isUnauthorized();
    }
    
    @Test
    void testCrossTenantDataAccess() {
        // Test that users cannot access other tenant's data
        String tenant1Token = getTokenForTenant("tenant1");
        String tenant2DeviceId = createDeviceForTenant("tenant2");
        
        webTestClient.get()
            .uri("/api/devices/{id}", tenant2DeviceId)
            .header("Authorization", "Bearer " + tenant1Token)
            .exchange()
            .expectStatus().isForbidden();
    }
    
    @Test
    void testSQLInjectionPrevention() {
        // Test that SQL injection attempts are blocked
        String maliciousInput = "'; DROP TABLE users; --";
        
        webTestClient.post()
            .uri("/api/organizations")
            .bodyValue(new CreateOrganizationRequest(maliciousInput, "test@example.com"))
            .header("Authorization", "Bearer " + getValidToken())
            .exchange()
            .expectStatus().isBadRequest();
    }
}
```

**Manual Security Testing Checklist:**
- [ ] **Authentication bypass** attempts
- [ ] **Authorization escalation** testing  
- [ ] **Input validation** boundary testing
- [ ] **Session management** security
- [ ] **Cross-tenant data isolation** verification
- [ ] **API rate limiting** effectiveness
- [ ] **Error message** information leakage
- [ ] **TLS configuration** validation

### Secure Code Review Guidelines

**Security-Focused Code Review Checklist:**

```markdown
## Authentication & Authorization
- [ ] All endpoints require appropriate authentication
- [ ] User roles and permissions are properly enforced
- [ ] Tenant isolation is maintained throughout the request flow
- [ ] JWT tokens are validated correctly
- [ ] API keys have appropriate scope limitations

## Input Validation
- [ ] All user inputs are validated and sanitized
- [ ] Parameterized queries are used for database operations
- [ ] File uploads have proper type and size restrictions
- [ ] Regular expressions are safe from ReDoS attacks

## Data Protection
- [ ] Sensitive data is encrypted at rest
- [ ] PII is properly handled and protected
- [ ] Database queries are scoped to the correct tenant
- [ ] Audit logs capture security-relevant events

## Error Handling
- [ ] Error messages don't leak sensitive information
- [ ] Stack traces are not exposed to end users
- [ ] Security exceptions are logged appropriately
- [ ] Fallback mechanisms maintain security posture

## Configuration
- [ ] Secrets are not hard-coded in source code
- [ ] Default passwords are changed
- [ ] Security headers are configured correctly
- [ ] HTTPS is enforced for all communications
```

## Environment Variables and Secrets Management

### Development Environment Security

**Development Security Configuration:**
```bash
# Development environment variables (non-production)
export OPENFRAME_ENV=development
export JWT_SECRET="dev-jwt-secret-key-change-in-production"
export OAUTH2_CLIENT_SECRET="dev-oauth2-client-secret"
export ENCRYPTION_KEY="dev-encryption-key-32-chars-long"

# AI API Keys (use your own)
export ANTHROPIC_API_KEY="sk-ant-api03-your-dev-key-here"
export OPENAI_API_KEY="sk-your-openai-dev-key-here"

# Database credentials (development only)
export MONGODB_USERNAME="openframe_dev"
export MONGODB_PASSWORD="dev_password_123"
export REDIS_PASSWORD="redis_dev_password"
```

**Production Security Configuration:**
```bash
# Production environment (use secure secret management)
export OPENFRAME_ENV=production
export JWT_SECRET="${vault_jwt_secret}"
export OAUTH2_CLIENT_SECRET="${vault_oauth2_secret}"
export ENCRYPTION_KEY="${vault_encryption_key}"

# Production API keys
export ANTHROPIC_API_KEY="${vault_anthropic_key}"
export OPENAI_API_KEY="${vault_openai_key}"

# Database credentials from vault/k8s secrets
export MONGODB_USERNAME="${vault_mongodb_user}"
export MONGODB_PASSWORD="${vault_mongodb_password}"
export REDIS_PASSWORD="${vault_redis_password}"
```

### Kubernetes Secrets Management

**Secret Creation:**
```bash
# Create secrets for production
kubectl create secret generic openframe-secrets \
  --from-literal=jwt-secret="$(openssl rand -base64 32)" \
  --from-literal=encryption-key="$(openssl rand -base64 32)" \
  --from-literal=oauth2-client-secret="your-oauth2-secret"

kubectl create secret generic openframe-ai-keys \
  --from-literal=anthropic-api-key="your-anthropic-key" \
  --from-literal=openai-api-key="your-openai-key"
```

**Secret Usage in Deployments:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openframe-api
spec:
  template:
    spec:
      containers:
      - name: api-service
        image: openframe/api-service:latest
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: openframe-secrets
              key: jwt-secret
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: openframe-ai-keys
              key: anthropic-api-key
```

---

*Security is a foundational aspect of OpenFrame's architecture. Regular security reviews, testing, and updates are essential for maintaining a secure platform. Continue with [Testing](../testing/README.md) and [Contributing](../contributing/guidelines.md) guides for complete development practices.*