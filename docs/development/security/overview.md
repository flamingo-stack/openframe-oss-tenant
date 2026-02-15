# Security Overview

OpenFrame implements a comprehensive security model with multi-tenant isolation, robust authentication, and defense-in-depth strategies. This guide covers the security architecture, implementation patterns, and best practices for secure development.

## Security Architecture

### Multi-Layer Security Model

OpenFrame employs security controls across all architectural layers:

```mermaid
graph TB
    subgraph "Client Layer Security"
        HTTPS[HTTPS/TLS 1.3]
        CSP[Content Security Policy]
        SOP[Same-Origin Policy]
        XSS[XSS Protection]
    end
    
    subgraph "Edge Layer Security"
        WAF[Web Application Firewall]
        RateLimit[Rate Limiting]
        CORS[CORS Policy]
        JWTValidation[JWT Validation]
    end
    
    subgraph "Service Layer Security"
        RBAC[Role-Based Access Control]
        TenantIsolation[Tenant Isolation]
        InputValidation[Input Validation]
        OutputSanitization[Output Sanitization]
    end
    
    subgraph "Data Layer Security"
        Encryption[Data Encryption at Rest]
        TLS[TLS in Transit]
        RowLevelSecurity[Row-Level Security]
        AuditLogging[Security Audit Logging]
    end
    
    subgraph "Infrastructure Security"
        NetworkPolicies[Network Policies]
        SecretManagement[Secret Management]
        RBAC_K8s[Kubernetes RBAC]
        ServiceMesh[Service Mesh mTLS]
    end
    
    HTTPS --> WAF
    CSP --> WAF
    WAF --> RBAC
    RateLimit --> RBAC
    RBAC --> Encryption
    TenantIsolation --> RowLevelSecurity
    Encryption --> NetworkPolicies
    TLS --> ServiceMesh
```

## Authentication and Authorization

### JWT-Based Authentication Architecture

OpenFrame uses JSON Web Tokens with per-tenant signing keys for secure, stateless authentication:

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Gateway
    participant AuthServer
    participant API
    participant TenantKeyService
    
    User->>Frontend: Login Credentials
    Frontend->>AuthServer: OAuth2 Authorization Request
    AuthServer->>TenantKeyService: Get Tenant Signing Key
    TenantKeyService-->>AuthServer: RSA Private Key
    AuthServer->>AuthServer: Generate JWT with Tenant Key
    AuthServer-->>Frontend: Access Token + Refresh Token
    
    Frontend->>Gateway: API Request + JWT
    Gateway->>TenantKeyService: Get Tenant Public Key
    TenantKeyService-->>Gateway: RSA Public Key
    Gateway->>Gateway: Validate JWT Signature
    Gateway->>API: Forwarded Request + User Context
    API->>API: Apply Authorization Rules
```

### JWT Token Structure

OpenFrame uses a structured JWT payload with comprehensive security claims:

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "tenant-abc123-2024-01"
  },
  "payload": {
    "iss": "https://auth.openframe.ai/tenant-abc123",
    "sub": "user-def456",
    "aud": ["openframe-api", "openframe-external-api"],
    "exp": 1640995200,
    "iat": 1640908800,
    "nbf": 1640908800,
    "jti": "token-unique-id-789",
    
    "tenant": "tenant-abc123",
    "org": "org-xyz789",
    "user_type": "INTERNAL",
    "roles": ["USER", "DEVICE_MANAGER"],
    "permissions": [
      "device:read",
      "device:write", 
      "organization:read"
    ],
    "device_scope": ["device-1", "device-2"],
    "ip_restrictions": ["192.168.1.0/24"],
    "session_id": "session-ghi012"
  },
  "signature": "..."
}
```

### Per-Tenant Key Management

**Tenant Key Isolation Strategy**:

```mermaid
graph TB
    subgraph "Tenant A"
        KeyA[RSA Key Pair A<br/>kid: tenant-a-2024-01]
        UsersA[Users A]
        TokensA[JWT Tokens A]
    end
    
    subgraph "Tenant B"
        KeyB[RSA Key Pair B<br/>kid: tenant-b-2024-01]
        UsersB[Users B]
        TokensB[JWT Tokens B]
    end
    
    subgraph "Tenant C"
        KeyC[RSA Key Pair C<br/>kid: tenant-c-2024-01]
        UsersC[Users C] 
        TokensC[JWT Tokens C]
    end
    
    subgraph "Key Management Service"
        KeyStore[(Secure Key Store)]
        KeyRotation[Automated Key Rotation]
        HSM[Hardware Security Module]
    end
    
    KeyA --> KeyStore
    KeyB --> KeyStore
    KeyC --> KeyStore
    
    KeyStore --> KeyRotation
    KeyStore --> HSM
    
    UsersA --> TokensA
    UsersB --> TokensB
    UsersC --> TokensC
    
    TokensA --> KeyA
    TokensB --> KeyB
    TokensC --> KeyC
```

**Key Rotation Implementation**:

```java
@Service
public class TenantKeyService {
    
    @Scheduled(cron = "0 0 2 1 * ?") // Monthly rotation
    public void rotateExpiredKeys() {
        List<Tenant> tenants = tenantRepository.findAll();
        
        for (Tenant tenant : tenants) {
            if (shouldRotateKey(tenant)) {
                rotateKeyForTenant(tenant);
            }
        }
    }
    
    private void rotateKeyForTenant(Tenant tenant) {
        // Generate new RSA key pair
        KeyPair newKeyPair = generateRSAKeyPair();
        String newKeyId = generateKeyId(tenant.getId());
        
        // Store new key with overlap period
        TenantKey newKey = TenantKey.builder()
            .tenantId(tenant.getId())
            .keyId(newKeyId)
            .privateKey(encryptPrivateKey(newKeyPair.getPrivate()))
            .publicKey(newKeyPair.getPublic())
            .validFrom(Instant.now())
            .validUntil(Instant.now().plus(Duration.ofDays(395))) // 13-month validity
            .build();
            
        tenantKeyRepository.save(newKey);
        
        // Schedule old key removal after grace period
        scheduleKeyRemoval(tenant.getCurrentKeyId(), Duration.ofDays(30));
        
        // Update tenant to use new key
        tenant.setCurrentKeyId(newKeyId);
        tenantRepository.save(tenant);
        
        log.info("Rotated signing key for tenant: {}", tenant.getId());
    }
}
```

## Authorization and Access Control

### Role-Based Access Control (RBAC)

OpenFrame implements a hierarchical RBAC system with fine-grained permissions:

```mermaid
graph TB
    subgraph "Role Hierarchy"
        SuperAdmin[Super Admin<br/>Cross-tenant access]
        TenantAdmin[Tenant Admin<br/>Full tenant access]
        OrgAdmin[Organization Admin<br/>Organization scope]
        User[Standard User<br/>Limited access]
        Viewer[Viewer<br/>Read-only access]
    end
    
    subgraph "Permission Categories"
        UserPerms[User Management<br/>user:read, user:write, user:delete]
        DevicePerms[Device Management<br/>device:read, device:write, device:control]
        OrgPerms[Organization Management<br/>org:read, org:write, org:admin]
        SystemPerms[System Management<br/>system:read, system:write, system:admin]
    end
    
    SuperAdmin --> UserPerms
    SuperAdmin --> DevicePerms
    SuperAdmin --> OrgPerms
    SuperAdmin --> SystemPerms
    
    TenantAdmin --> UserPerms
    TenantAdmin --> DevicePerms
    TenantAdmin --> OrgPerms
    
    OrgAdmin --> UserPerms
    OrgAdmin --> DevicePerms
    
    User --> DevicePerms
    Viewer --> DevicePerms
```

### Tenant Data Isolation

**Row-Level Security Implementation**:

```java
@Component
public class TenantSecurityAspect {
    
    @Around("@annotation(TenantSecured)")
    public Object enforceTenantSecurity(ProceedingJoinPoint joinPoint) throws Throwable {
        // Extract tenant context from JWT
        String currentTenant = SecurityContextHolder.getContext()
            .getAuthentication()
            .getDetails()
            .getTenant();
            
        // Apply tenant filter to all database operations
        try (TenantContext.Scope scope = TenantContext.setCurrentTenant(currentTenant)) {
            return joinPoint.proceed();
        }
    }
}

@Repository
public class OrganizationRepository {
    
    @TenantSecured
    public List<Organization> findAll() {
        // Automatically filtered by current tenant context
        String tenantId = TenantContext.getCurrentTenant();
        return mongoTemplate.find(
            Query.query(Criteria.where("tenantId").is(tenantId)),
            Organization.class
        );
    }
}
```

**Database-Level Tenant Isolation**:

```javascript
// MongoDB collection design with tenant isolation
{
  "_id": "org-123",
  "tenantId": "tenant-abc", // Enforced in all queries
  "name": "Example Organization",
  "domain": "example.com",
  // ... other fields
}

// Index for efficient tenant-scoped queries
db.organizations.createIndex({ "tenantId": 1, "_id": 1 });
db.devices.createIndex({ "tenantId": 1, "organizationId": 1 });
db.users.createIndex({ "tenantId": 1, "email": 1 });
```

## Data Security

### Encryption at Rest

OpenFrame encrypts sensitive data using AES-256 encryption:

```java
@Service
public class EncryptionService {
    
    private final AESUtil aesUtil;
    private final String encryptionKey;
    
    @Value("${openframe.security.encryption.key}")
    private String masterKey;
    
    public String encrypt(String plaintext) {
        try {
            SecretKeySpec keySpec = new SecretKeySpec(
                masterKey.getBytes(), 
                "AES"
            );
            
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, keySpec);
            
            byte[] iv = cipher.getIV();
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes());
            
            // Prepend IV to ciphertext for storage
            byte[] encryptedData = new byte[iv.length + ciphertext.length];
            System.arraycopy(iv, 0, encryptedData, 0, iv.length);
            System.arraycopy(ciphertext, 0, encryptedData, iv.length, ciphertext.length);
            
            return Base64.getEncoder().encodeToString(encryptedData);
        } catch (Exception e) {
            throw new EncryptionException("Failed to encrypt data", e);
        }
    }
}

@Entity
public class SensitiveData {
    
    @Convert(converter = EncryptedStringConverter.class)
    @Column(name = "encrypted_field")
    private String sensitiveField;
    
    // Automatic encryption/decryption through JPA converter
}
```

### Encryption in Transit

**TLS Configuration for All Services**:

```yaml
# application-security.yml
server:
  ssl:
    enabled: true
    key-store: classpath:keystore/server.p12
    key-store-password: ${SSL_KEYSTORE_PASSWORD}
    key-store-type: PKCS12
    key-alias: openframe-server
    
spring:
  data:
    mongodb:
      uri: mongodb://admin:${MONGO_PASSWORD}@localhost:27017/openframe?ssl=true&authSource=admin
      
  kafka:
    security:
      protocol: SSL
    ssl:
      trust-store-location: classpath:keystore/kafka.client.truststore.p12
      trust-store-password: ${KAFKA_TRUSTSTORE_PASSWORD}
      key-store-location: classpath:keystore/kafka.client.keystore.p12
      key-store-password: ${KAFKA_KEYSTORE_PASSWORD}
```

## Input Validation and Sanitization

### Comprehensive Input Validation

```java
@RestController
@Validated
public class OrganizationController {
    
    @PostMapping("/organizations")
    public ResponseEntity<Organization> createOrganization(
            @Valid @RequestBody CreateOrganizationRequest request) {
        
        // Additional business validation
        validateOrganizationRequest(request);
        
        Organization org = organizationService.create(request);
        return ResponseEntity.ok(org);
    }
    
    private void validateOrganizationRequest(CreateOrganizationRequest request) {
        // Domain name validation
        if (!isValidDomain(request.getDomain())) {
            throw new ValidationException("Invalid domain format");
        }
        
        // Email validation beyond @Email annotation
        if (!isValidBusinessEmail(request.getContactEmail())) {
            throw new ValidationException("Business email required");
        }
        
        // Sanitize inputs
        request.setName(sanitizeInput(request.getName()));
        request.setDescription(sanitizeInput(request.getDescription()));
    }
}

public class CreateOrganizationRequest {
    
    @NotBlank(message = "Organization name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    @Pattern(regexp = "^[a-zA-Z0-9\\s\\-\\.]+$", message = "Invalid characters in name")
    private String name;
    
    @NotBlank(message = "Domain is required")
    @Pattern(regexp = "^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\\.[a-zA-Z]{2,}$", 
             message = "Invalid domain format")
    private String domain;
    
    @NotBlank(message = "Contact email is required")
    @Email(message = "Invalid email format")
    @Size(max = 255, message = "Email too long")
    private String contactEmail;
    
    // ... getters and setters
}
```

### GraphQL Security

```java
@Component
public class GraphQLSecurityInstrumentation implements Instrumentation {
    
    @Override
    public InstrumentationState createState() {
        return new InstrumentationState() {};
    }
    
    @Override
    public InstrumentationContext<ExecutionResult> beginExecution(
            InstrumentationExecutionParameters parameters) {
        
        // Query depth analysis to prevent DoS attacks
        int queryDepth = calculateQueryDepth(parameters.getQuery());
        if (queryDepth > MAX_QUERY_DEPTH) {
            throw new GraphQLException("Query too complex");
        }
        
        // Query complexity analysis
        int queryComplexity = calculateQueryComplexity(parameters.getQuery());
        if (queryComplexity > MAX_QUERY_COMPLEXITY) {
            throw new GraphQLException("Query complexity exceeds limit");
        }
        
        return InstrumentationContext.noOp();
    }
}

@DgsComponent
public class DeviceDataFetcher {
    
    @DgsQuery
    @PreAuthorize("hasPermission(#organizationId, 'ORGANIZATION', 'DEVICE_READ')")
    public List<Device> devices(
            @Argument String organizationId,
            @Argument DeviceFilter filter) {
        
        // Validate organization access
        if (!hasOrganizationAccess(organizationId)) {
            throw new AccessDeniedException("Access denied to organization");
        }
        
        // Apply tenant context
        return deviceService.findByOrganization(organizationId, filter);
    }
}
```

## Security Best Practices

### Secure Development Guidelines

#### 1. Authentication Security

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        // Use bcrypt with sufficient rounds
        return new BCryptPasswordEncoder(12);
    }
    
    @Bean
    public AuthenticationManager authManager(HttpSecurity http) throws Exception {
        return http.getSharedObject(AuthenticationManagerBuilder.class)
            .userDetailsService(customUserDetailsService)
            .passwordEncoder(passwordEncoder())
            .and()
            .build();
    }
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .csrf(csrf -> csrf.disable()) // JWT-based, no CSRF needed
            .headers(headers -> 
                headers.frameOptions().deny()
                       .contentTypeOptions().and()
                       .httpStrictTransportSecurity(hstsConfig -> 
                           hstsConfig.maxAgeInSeconds(31536000)
                                    .includeSubdomains(true)))
            .build();
    }
}
```

#### 2. API Security

```java
@RestController
@RequestMapping("/api/external")
public class ExternalApiController {
    
    @PostMapping("/events")
    @RateLimited(requests = 1000, window = "1h")
    @ApiKeyRequired
    public ResponseEntity<?> createEvent(
            @Valid @RequestBody CreateEventRequest request,
            HttpServletRequest httpRequest) {
        
        // Log security events
        securityAuditLogger.logApiAccess(
            httpRequest.getRemoteAddr(),
            request.getApiKey(),
            "CREATE_EVENT",
            request.getOrganizationId()
        );
        
        // Process request
        Event event = eventService.create(request);
        return ResponseEntity.ok(event);
    }
}

@Component
public class ApiKeyValidator {
    
    public boolean validateApiKey(String apiKey, String organizationId) {
        try {
            // Parse API key format: ak_<keyId>.<signature>
            String[] parts = apiKey.split("\\.");
            if (parts.length != 2 || !parts[0].startsWith("ak_")) {
                return false;
            }
            
            String keyId = parts[0].substring(3);
            String signature = parts[1];
            
            // Retrieve key from database
            ApiKey key = apiKeyRepository.findByKeyId(keyId);
            if (key == null || !key.isActive()) {
                return false;
            }
            
            // Verify signature
            String expectedSignature = hmacSha256(keyId, key.getSecret());
            if (!MessageDigest.isEqual(signature.getBytes(), expectedSignature.getBytes())) {
                return false;
            }
            
            // Verify organization access
            return key.getOrganizationId().equals(organizationId);
            
        } catch (Exception e) {
            log.warn("API key validation failed", e);
            return false;
        }
    }
}
```

#### 3. Data Access Security

```java
@Repository
@TenantSecured
public class SecureDeviceRepository {
    
    public List<Device> findByOrganization(String organizationId) {
        // Ensure current user has access to organization
        String currentTenant = TenantContext.getCurrentTenant();
        String currentUserId = SecurityContext.getCurrentUserId();
        
        if (!hasOrganizationAccess(currentUserId, organizationId)) {
            throw new AccessDeniedException("Access denied to organization devices");
        }
        
        // Query with tenant and organization filters
        Query query = Query.query(
            Criteria.where("tenantId").is(currentTenant)
                   .and("organizationId").is(organizationId)
        );
        
        return mongoTemplate.find(query, Device.class);
    }
    
    private boolean hasOrganizationAccess(String userId, String organizationId) {
        UserOrganization userOrg = userOrganizationRepository
            .findByUserIdAndOrganizationId(userId, organizationId);
        return userOrg != null && userOrg.isActive();
    }
}
```

### Security Testing

#### 1. Security Test Suite

```java
@SpringBootTest
@TestPropertySource(locations = "classpath:application-security-test.properties")
public class SecurityIntegrationTest {
    
    @Test
    public void testUnauthorizedAccessDenied() {
        // Attempt API access without authentication
        ResponseEntity<String> response = restTemplate.getForEntity(
            "/api/organizations", String.class);
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
    
    @Test
    public void testCrossTenantAccessDenied() {
        // Login as Tenant A user
        String tenantAToken = loginAsTenantUser("tenant-a", "user@tenant-a.com");
        
        // Attempt to access Tenant B data
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(tenantAToken);
        HttpEntity<String> entity = new HttpEntity<>(headers);
        
        ResponseEntity<String> response = restTemplate.exchange(
            "/api/organizations/tenant-b-org-id", 
            HttpMethod.GET, 
            entity, 
            String.class);
            
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
    
    @Test
    public void testSQLInjectionPrevention() {
        String maliciousInput = "'; DROP TABLE organizations; --";
        
        CreateOrganizationRequest request = new CreateOrganizationRequest();
        request.setName(maliciousInput);
        request.setDomain("test.com");
        request.setContactEmail("test@test.com");
        
        // Should be rejected by input validation
        ResponseEntity<String> response = postAsUser("/api/organizations", request);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        
        // Verify database integrity
        long orgCount = organizationRepository.count();
        assertThat(orgCount).isGreaterThan(0); // Table should still exist
    }
}
```

#### 2. Security Audit Logging

```java
@Component
public class SecurityAuditLogger {
    
    private final Logger auditLog = LoggerFactory.getLogger("SECURITY_AUDIT");
    
    public void logAuthenticationSuccess(String userId, String ipAddress, String userAgent) {
        AuditEvent event = AuditEvent.builder()
            .eventType("AUTHENTICATION_SUCCESS")
            .userId(userId)
            .ipAddress(ipAddress)
            .userAgent(userAgent)
            .timestamp(Instant.now())
            .build();
            
        auditLog.info("AUTH_SUCCESS: {}", toJson(event));
        
        // Also store in database for analysis
        auditEventRepository.save(event);
    }
    
    public void logAuthenticationFailure(String email, String ipAddress, String reason) {
        AuditEvent event = AuditEvent.builder()
            .eventType("AUTHENTICATION_FAILURE")
            .email(email)
            .ipAddress(ipAddress)
            .reason(reason)
            .timestamp(Instant.now())
            .build();
            
        auditLog.warn("AUTH_FAILURE: {}", toJson(event));
        auditEventRepository.save(event);
        
        // Trigger security alerts if needed
        checkForBruteForceAttack(ipAddress, email);
    }
    
    private void checkForBruteForceAttack(String ipAddress, String email) {
        long recentFailures = auditEventRepository.countFailedAuthenticationAttempts(
            ipAddress, 
            Instant.now().minus(Duration.ofMinutes(15))
        );
        
        if (recentFailures >= 10) {
            securityAlertService.triggerBruteForceAlert(ipAddress, email);
        }
    }
}
```

## Security Monitoring and Incident Response

### Real-time Security Monitoring

```mermaid
graph TB
    subgraph "Security Events"
        AuthFailures[Authentication Failures]
        UnauthorizedAccess[Unauthorized Access Attempts]
        SuspiciousPatterns[Suspicious Usage Patterns]
        DataAccess[Sensitive Data Access]
    end
    
    subgraph "Detection Systems"
        WAF[Web Application Firewall]
        IDS[Intrusion Detection System]
        Behavioral[Behavioral Analysis]
        AuditLogs[Security Audit Logs]
    end
    
    subgraph "Response Systems"
        Alerts[Real-time Alerts]
        AutoBlock[Automatic IP Blocking]
        Quarantine[Account Quarantine]
        Escalation[Incident Escalation]
    end
    
    AuthFailures --> WAF
    UnauthorizedAccess --> IDS
    SuspiciousPatterns --> Behavioral
    DataAccess --> AuditLogs
    
    WAF --> Alerts
    IDS --> AutoBlock
    Behavioral --> Quarantine
    AuditLogs --> Escalation
```

### Security Incident Response Playbook

1. **Detection** - Automated monitoring identifies security event
2. **Assessment** - Determine severity and potential impact
3. **Containment** - Immediate actions to limit damage
4. **Investigation** - Detailed analysis of the incident
5. **Recovery** - Restore normal operations
6. **Lessons Learned** - Update security measures

## Compliance and Standards

### Compliance Framework

OpenFrame is designed to support various compliance requirements:

| Standard | Status | Key Controls |
|----------|--------|-------------|
| **SOC 2 Type II** | 🔄 In Progress | Access controls, encryption, monitoring |
| **ISO 27001** | 📋 Planned | Information security management |
| **GDPR** | ✅ Compliant | Data protection, privacy by design |
| **HIPAA** | 📋 Available | Healthcare data protection (optional) |

### Data Privacy

```java
@Entity
public class PersonalData {
    
    @PersonalDataField
    @JsonIgnore // Never serialize in logs
    private String firstName;
    
    @PersonalDataField
    @JsonIgnore
    private String lastName;
    
    @PersonalDataField
    @Convert(converter = EncryptedStringConverter.class)
    private String email;
    
    // GDPR compliance methods
    public PersonalData anonymize() {
        this.firstName = "REDACTED";
        this.lastName = "REDACTED";
        this.email = "redacted@example.com";
        return this;
    }
}

@Service
public class DataPrivacyService {
    
    @Async
    public void processDataDeletionRequest(String userId) {
        // GDPR Article 17 - Right to erasure
        List<PersonalData> userData = personalDataRepository.findByUserId(userId);
        
        for (PersonalData data : userData) {
            data.anonymize();
            personalDataRepository.save(data);
        }
        
        // Also remove from audit logs where legally permitted
        auditEventRepository.anonymizeUserEvents(userId);
        
        log.info("Completed data deletion for user: {}", userId);
    }
}
```

## Next Steps

This security overview provides the foundation for secure OpenFrame development. Continue with:

1. **[Testing Overview](../testing/overview.md)** - Security testing strategies
2. **[Local Development](../setup/local-development.md)** - Secure development practices
3. **[Contributing Guidelines](../contributing/guidelines.md)** - Security review process

For security questions or to report security issues, contact the security team through the [OpenMSP community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) #security channel.

## Security Resources

- **OWASP Top 10** - https://owasp.org/www-project-top-ten/
- **JWT Security Best Practices** - https://tools.ietf.org/html/rfc8725
- **Spring Security Reference** - https://docs.spring.io/spring-security/reference/
- **GraphQL Security** - https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html

Security is everyone's responsibility at OpenFrame! 🔒