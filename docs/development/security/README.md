# Security Best Practices

Security is paramount in OpenFrame's design. This guide covers the comprehensive security measures implemented throughout the platform and best practices for maintaining security in development and production environments.

## Security Overview

OpenFrame implements defense-in-depth security with multiple layers of protection:

```mermaid
graph TB
    subgraph "Client Security"
        ClientAuth[Client Authentication]
        TokenStorage[Secure Token Storage]
        CSP[Content Security Policy]
    end
    
    subgraph "Transport Security"
        TLS[TLS 1.3 Encryption]
        HSTS[HTTP Strict Transport Security]
        CertManagement[Certificate Management]
    end
    
    subgraph "Application Security"
        JWT[JWT Token Validation]
        OAuth[OAuth2/OIDC Flows]
        RBAC[Role-Based Access Control]
        InputValidation[Input Validation & Sanitization]
    end
    
    subgraph "Data Security"
        Encryption[Data Encryption at Rest]
        Transit[Data Encryption in Transit]
        KeyManagement[Key Management]
        DataIsolation[Multi-Tenant Data Isolation]
    end
    
    subgraph "Infrastructure Security"
        NetworkSeg[Network Segmentation]
        Firewall[Firewall Rules]
        Monitoring[Security Monitoring]
        Audit[Comprehensive Audit Logs]
    end
    
    ClientAuth --> JWT
    TLS --> Encryption
    JWT --> RBAC
    Encryption --> KeyManagement
    NetworkSeg --> Monitoring
    
    style JWT fill:#e8f5e8
    style Encryption fill:#e3f2fd
    style Monitoring fill:#fff3e0
```

## Authentication and Authorization

### Multi-Tenant OAuth2/OIDC Implementation

OpenFrame's authentication system provides secure, multi-tenant identity management:

**Core Components:**
- **Authorization Server**: Spring Authorization Server with multi-tenant support
- **JWT Tokens**: RS256 signed tokens with per-tenant keys
- **SSO Integration**: Dynamic Google and Microsoft SSO providers
- **API Key Authentication**: Service-to-service authentication

### Authentication Flow

```mermaid
sequenceDiagram
    participant Client as Client Application
    participant Gateway as API Gateway
    participant Auth as Authorization Server
    participant MongoDB as MongoDB
    participant KeyStore as Tenant Key Store

    Client->>Gateway: Login Request
    Gateway->>Auth: Redirect to Auth Server
    Auth->>MongoDB: Validate Tenant
    Auth->>KeyStore: Retrieve Tenant Keys
    Auth->>Auth: Generate JWT (RS256)
    Auth->>Client: Return JWT Token
    
    Client->>Gateway: API Request + JWT
    Gateway->>Gateway: Validate JWT Signature
    Gateway->>API: Forward with User Context
    
    Note over Client, API: Subsequent requests use JWT until expiration
```

### JWT Token Structure

OpenFrame uses structured JWT tokens with tenant-specific claims:

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "tenant-123-key-id"
  },
  "payload": {
    "sub": "user-456",
    "iss": "https://auth.openframe.ai/tenant-123",
    "aud": ["openframe-api", "openframe-external-api"],
    "exp": 1640995200,
    "iat": 1640991600,
    "tenant_id": "tenant-123",
    "organization_id": "org-789",
    "roles": ["TECHNICIAN", "DEVICE_MANAGER"],
    "permissions": ["device:read", "device:write", "organization:read"]
  }
}
```

**Security Features:**
- **Per-Tenant Keys**: Each tenant uses unique RSA key pairs
- **Audience Validation**: Tokens specify valid services
- **Role-Based Claims**: Granular permission system
- **Expiration Management**: Short-lived tokens with refresh capability

### Role-Based Access Control (RBAC)

**Predefined Roles:**

| Role | Description | Permissions |
|------|-------------|-------------|
| **OWNER** | Organization owner | Full access to all resources |
| **ADMIN** | Organization administrator | Manage users, devices, settings |
| **TECHNICIAN** | MSP technician | Manage devices, view logs, run scripts |
| **VIEWER** | Read-only access | View devices, logs, reports |
| **CLIENT** | End client access | View own organization's devices only |

**Permission System:**
```java
@PreAuthorize("hasPermission(#deviceId, 'Device', 'WRITE')")
public void updateDevice(@PathVariable String deviceId, @RequestBody DeviceDto device) {
    // Implementation
}
```

### API Key Authentication

For service-to-service communication and programmatic access:

**API Key Format:**
```text
Format: ak_1a2b3c4d5e6f7890.sk_live_abcdefghijklmnopqrstuvwxyz123456
        ↑                   ↑
        Key ID              Secret Key
```

**Security Features:**
- **Scoped Permissions**: API keys have specific permission sets
- **Rate Limiting**: Per-key request rate limits
- **Audit Logging**: All API key usage is logged
- **Rotation Support**: Keys can be rotated without service disruption

## Data Encryption and Secure Storage

### Encryption at Rest

All sensitive data is encrypted using AES-256 encryption:

**Database Encryption:**
```java
@Entity
@Table(name = "organizations")
public class Organization {
    @Id
    private String id;
    
    @Column
    private String name;
    
    @Column
    @Encrypted  // Custom annotation for field-level encryption
    private String apiKey;
    
    @Column
    @Encrypted
    private String ssoClientSecret;
}
```

**Encryption Service Implementation:**
```java
@Service
public class EncryptionService {
    
    @Value("${openframe.encryption.key}")
    private String encryptionKey;
    
    public String encrypt(String plainText) {
        // AES-256-GCM encryption implementation
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        SecretKeySpec keySpec = new SecretKeySpec(
            Base64.getDecoder().decode(encryptionKey), 
            "AES"
        );
        cipher.init(Cipher.ENCRYPT_MODE, keySpec);
        byte[] encrypted = cipher.doFinal(plainText.getBytes());
        return Base64.getEncoder().encodeToString(encrypted);
    }
    
    public String decrypt(String encryptedText) {
        // Decryption implementation
    }
}
```

### Secure Key Management

**Development Environment:**
```bash
# Generate encryption key for development
openssl rand -base64 32 > dev-encryption.key

# Set environment variable
export ENCRYPTION_KEY=$(cat dev-encryption.key)
```

**Production Environment:**
- Use cloud provider key management services (AWS KMS, Azure Key Vault)
- Implement key rotation policies
- Separate keys per environment and tenant

### Multi-Tenant Data Isolation

**Database-Level Isolation:**
```java
@Repository
public class OrganizationRepository {
    
    @Query("{ 'organizationId': ?0 }")
    List<Device> findDevicesByOrganization(String organizationId);
    
    @Query("{ 'organizationId': ?0, 'userId': ?1 }")
    User findUserInOrganization(String organizationId, String userId);
}
```

**Query-Level Security:**
```java
@PreAuthorize("@tenantService.hasAccessToOrganization(authentication, #organizationId)")
public OrganizationDto getOrganization(@PathVariable String organizationId) {
    return organizationService.findById(organizationId);
}
```

## Input Validation and Sanitization

### Request Validation

**Bean Validation:**
```java
@RestController
@Validated
public class DeviceController {
    
    @PostMapping("/devices")
    public ResponseEntity<DeviceDto> createDevice(
            @Valid @RequestBody CreateDeviceRequest request) {
        
        // @Valid annotation triggers validation
        DeviceDto device = deviceService.createDevice(request);
        return ResponseEntity.ok(device);
    }
}

@Data
public class CreateDeviceRequest {
    @NotBlank(message = "Device name is required")
    @Size(max = 100, message = "Device name must be less than 100 characters")
    @Pattern(regexp = "^[a-zA-Z0-9\\s\\-_]+$", message = "Invalid characters in device name")
    private String name;
    
    @NotBlank(message = "IP address is required")
    @Pattern(regexp = "^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$", message = "Invalid IP address format")
    private String ipAddress;
    
    @Valid
    private ContactInfoDto contactInfo;
}
```

### SQL Injection Prevention

**MongoDB Query Safety:**
```java
@Repository
public class DeviceRepositoryImpl implements CustomDeviceRepository {
    
    // SAFE: Using parameterized queries
    public List<Device> findBySearchCriteria(String organizationId, String searchTerm) {
        Query query = new Query();
        query.addCriteria(Criteria.where("organizationId").is(organizationId));
        
        if (StringUtils.hasText(searchTerm)) {
            // Safe regex pattern construction
            String escapedTerm = Pattern.quote(searchTerm);
            query.addCriteria(Criteria.where("name").regex(escapedTerm, "i"));
        }
        
        return mongoTemplate.find(query, Device.class);
    }
}
```

### XSS Prevention

**Frontend Security:**
```typescript
// Content Security Policy configuration
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    imgSrc: ["'self'", "data:", "https:"],
    scriptSrc: ["'self'"],
    objectSrc: ["'none'"],
    frameSrc: ["'none'"]
  }
};

// Input sanitization
import DOMPurify from 'dompurify';

function sanitizeInput(userInput: string): string {
  return DOMPurify.sanitize(userInput, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: []
  });
}
```

## Common Security Vulnerabilities and Mitigations

### OWASP Top 10 Protection

**1. Injection Attacks**
- **Mitigation**: Parameterized queries, input validation, least privilege database access
- **Implementation**: MongoDB safe query builders, validated DTOs

**2. Broken Authentication**
- **Mitigation**: OAuth2/OIDC implementation, JWT with proper validation
- **Implementation**: Multi-factor authentication support, session management

**3. Sensitive Data Exposure**
- **Mitigation**: Encryption at rest and in transit, secure key management
- **Implementation**: AES-256 encryption, TLS 1.3, secure headers

**4. XML External Entities (XXE)**
- **Mitigation**: Disable XML external entity processing
- **Implementation**: Secure XML parser configuration

```java
@Configuration
public class SecurityConfiguration {
    
    @Bean
    public DocumentBuilderFactory documentBuilderFactory() {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        try {
            // Disable external entities
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        } catch (ParserConfigurationException e) {
            log.error("Failed to configure secure XML parser", e);
        }
        return factory;
    }
}
```

**5. Broken Access Control**
- **Mitigation**: Proper authorization checks, RBAC implementation
- **Implementation**: Method-level security, tenant isolation

**6. Security Misconfiguration**
- **Mitigation**: Security-first defaults, automated security testing
- **Implementation**: Spring Security configuration, security headers

**7. Cross-Site Scripting (XSS)**
- **Mitigation**: Content Security Policy, input sanitization
- **Implementation**: DOMPurify, React's built-in XSS protection

**8. Insecure Deserialization**
- **Mitigation**: Avoid deserializing untrusted data, whitelist classes
- **Implementation**: Jackson secure deserialization configuration

```java
@Configuration
public class JacksonConfiguration {
    
    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        
        // Prevent deserialization of arbitrary classes
        mapper.enableDefaultTyping(ObjectMapper.DefaultTyping.NON_FINAL, JsonTypeInfo.As.PROPERTY);
        mapper.setDefaultTyping(createSecureTypeValidator());
        
        return mapper;
    }
    
    private PolymorphicTypeValidator createSecureTypeValidator() {
        return BasicPolymorphicTypeValidator.builder()
            .allowIfSubType("com.openframe.api.dto")  // Only allow our DTOs
            .build();
    }
}
```

**9. Using Components with Known Vulnerabilities**
- **Mitigation**: Regular dependency updates, vulnerability scanning
- **Implementation**: Dependabot alerts, Maven security plugins

**10. Insufficient Logging & Monitoring**
- **Mitigation**: Comprehensive audit logs, security monitoring
- **Implementation**: Structured logging, security event alerts

### Security Testing and Code Review

**Static Code Analysis:**
```xml
<!-- Maven security plugins -->
<plugin>
    <groupId>org.owasp</groupId>
    <artifactId>dependency-check-maven</artifactId>
    <version>8.0.0</version>
    <configuration>
        <failBuildOnCVSS>7</failBuildOnCVSS>
    </configuration>
    <executions>
        <execution>
            <goals>
                <goal>check</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

**Security Testing:**
```java
@SpringBootTest
@TestPropertySource(properties = {
    "spring.profiles.active=test-security"
})
class SecurityTests {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Test
    void shouldRejectUnauthorizedRequests() throws Exception {
        mockMvc.perform(get("/api/devices"))
            .andExpect(status().isUnauthorized());
    }
    
    @Test
    void shouldPreventSQLInjection() throws Exception {
        String maliciousInput = "'; DROP TABLE devices; --";
        
        mockMvc.perform(get("/api/devices")
            .param("search", maliciousInput)
            .header("Authorization", "Bearer " + validJwt))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.devices").isArray());
        
        // Verify data integrity
        assertThat(deviceRepository.count()).isGreaterThan(0);
    }
}
```

### Environment Variables and Secrets Management

**Development Environment:**
```bash
# Use strong, unique values for development
export JWT_SIGNING_KEY=$(openssl rand -base64 32)
export ENCRYPTION_KEY=$(openssl rand -base64 32)
export DATABASE_PASSWORD=$(openssl rand -base64 16)

# Never commit these to version control
echo "*.env" >> .gitignore
echo "secrets/" >> .gitignore
```

**Production Environment:**
```yaml
# Use external secret management
apiVersion: v1
kind: Secret
metadata:
  name: openframe-secrets
type: Opaque
stringData:
  jwt-signing-key: ${JWT_SIGNING_KEY}
  encryption-key: ${ENCRYPTION_KEY}
  database-password: ${DATABASE_PASSWORD}
```

## Security Monitoring and Incident Response

### Audit Logging

**Comprehensive Security Events:**
```java
@Component
@Slf4j
public class SecurityEventLogger {
    
    @EventListener
    public void handleAuthenticationSuccess(AuthenticationSuccessEvent event) {
        SecurityContext context = SecurityContextHolder.getContext();
        String userId = context.getAuthentication().getName();
        String tenantId = extractTenantId(context);
        
        log.info("SECURITY_EVENT: Authentication successful - user: {}, tenant: {}, timestamp: {}",
            userId, tenantId, Instant.now());
    }
    
    @EventListener
    public void handleAuthenticationFailure(AbstractAuthenticationFailureEvent event) {
        String username = event.getAuthentication().getName();
        String reason = event.getException().getMessage();
        
        log.warn("SECURITY_EVENT: Authentication failed - user: {}, reason: {}, timestamp: {}",
            username, reason, Instant.now());
    }
    
    @EventListener
    public void handleAuthorizationFailure(AuthorizationFailureEvent event) {
        log.warn("SECURITY_EVENT: Authorization denied - user: {}, resource: {}, timestamp: {}",
            event.getAuthentication().getName(), 
            event.getSource(), 
            Instant.now());
    }
}
```

### Security Metrics and Monitoring

**Key Security Metrics:**
```java
@Component
public class SecurityMetrics {
    
    private final MeterRegistry meterRegistry;
    private final Counter authSuccessCounter;
    private final Counter authFailureCounter;
    private final Timer jwtValidationTimer;
    
    public SecurityMetrics(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        this.authSuccessCounter = Counter.builder("auth.success")
            .description("Successful authentication attempts")
            .register(meterRegistry);
        this.authFailureCounter = Counter.builder("auth.failure")
            .description("Failed authentication attempts")
            .register(meterRegistry);
        this.jwtValidationTimer = Timer.builder("jwt.validation")
            .description("JWT validation time")
            .register(meterRegistry);
    }
    
    public void recordAuthSuccess(String tenantId) {
        authSuccessCounter.increment(Tags.of("tenant", tenantId));
    }
    
    public void recordAuthFailure(String reason) {
        authFailureCounter.increment(Tags.of("reason", reason));
    }
}
```

### Incident Response Procedures

**Security Incident Categories:**

| Severity | Description | Response Time | Actions |
|----------|-------------|---------------|---------|
| **Critical** | Data breach, system compromise | 15 minutes | Isolate system, notify team lead |
| **High** | Authentication bypass, privilege escalation | 1 hour | Analyze logs, apply patches |
| **Medium** | Suspicious activity, failed intrusion attempts | 4 hours | Review security controls |
| **Low** | Policy violations, minor configuration issues | 24 hours | Document and schedule fix |

**Automated Response:**
```java
@Component
public class SecurityIncidentHandler {
    
    @EventListener
    public void handleSuspiciousActivity(SuspiciousActivityEvent event) {
        if (event.getSeverity() == Severity.CRITICAL) {
            // Automatically disable user account
            userService.suspendUser(event.getUserId());
            
            // Send immediate alert
            alertService.sendCriticalAlert(
                "User account suspended due to suspicious activity: " + event.getUserId()
            );
            
            // Log security incident
            securityIncidentService.createIncident(event);
        }
    }
}
```

## Development Security Guidelines

### Secure Coding Practices

**Code Review Checklist:**
- [ ] Input validation implemented and tested
- [ ] SQL injection prevention measures in place
- [ ] Authentication and authorization checks present
- [ ] Sensitive data properly encrypted
- [ ] Error messages don't expose sensitive information
- [ ] Logging doesn't include sensitive data
- [ ] Dependencies are up-to-date and vulnerability-free

**Security Testing Integration:**
```bash
#!/bin/bash
# Pre-commit security checks

echo "Running security checks..."

# Dependency vulnerability scan
mvn org.owasp:dependency-check-maven:check

# Static code analysis
mvn spotbugs:check

# License compliance
mvn license:check

# Code coverage for security tests
mvn jacoco:check -Djacoco.haltOnFailure=true

echo "Security checks completed!"
```

### Environment-Specific Security

**Development Security:**
- Use strong passwords even in development
- Regularly rotate development secrets
- Enable security logging for debugging
- Test with realistic security scenarios

**Production Security:**
- Implement Web Application Firewall (WAF)
- Enable DDoS protection
- Use managed certificate services
- Implement automated backup encryption
- Set up security monitoring dashboards

---

This comprehensive security guide ensures OpenFrame maintains the highest security standards. Security is everyone's responsibility, and these practices should be integrated into daily development workflows.

**Next Steps:**
- [Testing Overview](../testing/README.md) - Learn about security testing strategies
- [Contributing Guidelines](../contributing/guidelines.md) - Security considerations for contributors
- [Architecture Overview](../architecture/README.md) - Understand security architecture decisions

> **🔒 Security Reminder**: Security is not a one-time implementation but an ongoing process. Regularly review and update security measures as the platform evolves and new threats emerge.