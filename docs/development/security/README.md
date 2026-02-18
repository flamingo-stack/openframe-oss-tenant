# Security Best Practices

Security is a fundamental aspect of OpenFrame OSS Tenant, built into every layer of the platform. This guide covers authentication and authorization patterns, data protection strategies, security testing practices, and comprehensive guidelines for maintaining a secure multi-tenant MSP platform.

## Security Architecture Overview

OpenFrame implements a comprehensive security model with defense-in-depth principles:

```mermaid
graph TD
    subgraph "Client Security"
        A[TLS 1.3]
        B[Certificate Pinning]
        C[CSRF Protection]
    end
    
    subgraph "Gateway Security"
        D[JWT Validation]
        E[API Key Auth]
        F[Rate Limiting]
        G[CORS Headers]
    end
    
    subgraph "Application Security"
        H[Method-Level Security]
        I[Input Validation]
        J[Tenant Isolation]
        K[Audit Logging]
    end
    
    subgraph "Data Security"
        L[Encryption at Rest]
        M[Field-Level Encryption]
        N[Access Logging]
        O[Data Masking]
    end
    
    A --> D
    B --> D
    C --> D
    
    D --> H
    E --> H
    F --> H
    G --> H
    
    H --> L
    I --> L
    J --> L
    K --> L
    
    style D fill:#f44336
    style H fill:#ff9800
    style L fill:#4caf50
```

## Authentication and Authorization

### Multi-Tenant OAuth2 Implementation

OpenFrame uses a sophisticated OAuth2/OIDC implementation with per-tenant isolation:

#### Per-Tenant RSA Key Management

```java
@Component
public class TenantKeyService {
    
    @Cacheable("tenant-keys")
    public RSAKey getTenantSigningKey(String tenantId) {
        TenantKey tenantKey = tenantKeyRepository.findByTenantId(tenantId);
        if (tenantKey == null) {
            tenantKey = generateAndStoreTenantKey(tenantId);
        }
        return RSAKey.parse(tenantKey.getPrivateKey());
    }
    
    private TenantKey generateAndStoreTenantKey(String tenantId) {
        KeyPair keyPair = rsaKeyPairGenerator.generate();
        TenantKey tenantKey = new TenantKey();
        tenantKey.setTenantId(tenantId);
        tenantKey.setPrivateKey(keyPair.getPrivate().getEncoded());
        tenantKey.setPublicKey(keyPair.getPublic().getEncoded());
        tenantKey.setKeyId(generateKeyId());
        tenantKey.setCreatedAt(Instant.now());
        return tenantKeyRepository.save(tenantKey);
    }
}
```

#### JWT Token Structure

```json
{
  "iss": "https://tenant.openframe.ai",
  "sub": "user123",
  "aud": "openframe-api",
  "exp": 1640995200,
  "iat": 1640991600,
  "tenant_id": "tenant-abc-123",
  "roles": ["ADMIN", "TECHNICIAN"],
  "scope": "read write",
  "email": "admin@company.com",
  "organization_id": "org-456"
}
```

#### Multi-Issuer JWT Validation

```java
@Component
public class MultiTenantJwtDecoder {
    
    private final ConcurrentHashMap<String, ReactiveJwtDecoder> decoders = new ConcurrentHashMap<>();
    
    public Mono<Jwt> decode(String token) {
        return extractIssuerFromToken(token)
            .flatMap(this::getOrCreateDecoder)
            .flatMap(decoder -> decoder.decode(token));
    }
    
    private Mono<ReactiveJwtDecoder> getOrCreateDecoder(String issuer) {
        return Mono.fromCallable(() -> 
            decoders.computeIfAbsent(issuer, this::createDecoderForIssuer));
    }
    
    private ReactiveJwtDecoder createDecoderForIssuer(String issuer) {
        String tenantId = extractTenantFromIssuer(issuer);
        RSAKey rsaKey = tenantKeyService.getTenantSigningKey(tenantId);
        return NimbusReactiveJwtDecoder.withPublicKey(rsaKey.toRSAPublicKey()).build();
    }
}
```

### API Key Authentication

For external integrations, OpenFrame provides API key authentication with comprehensive tracking:

#### API Key Structure

```text
Format: ak_1a2b3c4d5e6f7890.sk_live_abcdefghijklmnopqrstuvwxyz123456
        ↑                   ↑
        Key ID              Secret Key
```

#### API Key Validation

```java
@Component
public class ApiKeyAuthenticationFilter implements WebFilter {
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        return extractApiKey(exchange)
            .flatMap(this::validateApiKey)
            .flatMap(apiKey -> {
                // Update usage statistics
                updateApiKeyUsage(apiKey);
                // Set security context
                return setAuthenticationContext(exchange, apiKey);
            })
            .then(chain.filter(exchange))
            .onErrorResume(InvalidApiKeyException.class, 
                ex -> handleAuthenticationFailure(exchange, ex));
    }
    
    private Mono<ApiKey> validateApiKey(String keyString) {
        ApiKeyComponents components = parseApiKey(keyString);
        return apiKeyRepository.findByKeyId(components.getKeyId())
            .filter(ApiKey::isActive)
            .filter(key -> verifyKeySecret(key, components.getSecret()))
            .switchIfEmpty(Mono.error(new InvalidApiKeyException("Invalid API key")));
    }
}
```

### Single Sign-On (SSO) Integration

#### Google SSO Configuration

```java
@Configuration
public class GoogleSSOConfiguration {
    
    @Bean
    public ClientRegistration googleClientRegistration() {
        return ClientRegistration.withRegistrationId("google")
            .clientId(googleClientId)
            .clientSecret(googleClientSecret)
            .scope("openid", "profile", "email")
            .authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
            .tokenUri("https://oauth2.googleapis.com/token")
            .userInfoUri("https://www.googleapis.com/oauth2/v3/userinfo")
            .userNameAttributeName(IdTokenClaimNames.SUB)
            .jwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
            .clientName("Google")
            .build();
    }
}
```

#### SSO User Mapping and Provisioning

```java
@Component
public class SsoUserProcessor {
    
    public User processOidcUser(OidcUser oidcUser, String tenantId) {
        String email = oidcUser.getEmail();
        String domain = extractDomain(email);
        
        // Validate domain against tenant configuration
        if (!isAllowedDomain(domain, tenantId)) {
            throw new UnauthorizedDomainException("Domain not allowed for tenant");
        }
        
        // Find or create user
        return userRepository.findByEmailAndTenantId(email, tenantId)
            .orElseGet(() -> createUserFromOidcUser(oidcUser, tenantId));
    }
    
    private User createUserFromOidcUser(OidcUser oidcUser, String tenantId) {
        User user = new User();
        user.setEmail(oidcUser.getEmail());
        user.setFirstName(oidcUser.getGivenName());
        user.setLastName(oidcUser.getFamilyName());
        user.setTenantId(tenantId);
        user.setEmailVerified(true);
        user.setStatus(UserStatus.ACTIVE);
        user.setRoles(determineDefaultRoles(oidcUser, tenantId));
        return userRepository.save(user);
    }
}
```

## Data Encryption and Secure Storage

### Encryption at Rest

#### Database Encryption Configuration

```yaml
# MongoDB encryption configuration
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/openframe?ssl=true&authSource=admin
      auto-encryption:
        key-vault-namespace: "openframe.keys"
        schema-map:
          "openframe.users":
            encrypt-metadata:
              key-id: !Binary "base64-encoded-key-id"
            properties:
              ssn:
                encrypt:
                  algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"
              email:
                encrypt:
                  algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random"
```

#### Field-Level Encryption Service

```java
@Service
public class FieldEncryptionService {
    
    private final AESUtil aesUtil;
    private final KeyManagementService keyManagementService;
    
    public String encryptSensitiveField(String plaintext, String tenantId) {
        String encryptionKey = keyManagementService.getTenantEncryptionKey(tenantId);
        return aesUtil.encrypt(plaintext, encryptionKey);
    }
    
    public String decryptSensitiveField(String ciphertext, String tenantId) {
        String encryptionKey = keyManagementService.getTenantEncryptionKey(tenantId);
        return aesUtil.decrypt(ciphertext, encryptionKey);
    }
    
    @EventListener
    public void handleKeyRotation(KeyRotationEvent event) {
        String tenantId = event.getTenantId();
        String oldKey = event.getOldKey();
        String newKey = event.getNewKey();
        
        // Re-encrypt all sensitive data with new key
        reEncryptTenantData(tenantId, oldKey, newKey);
    }
}
```

### Secrets Management

#### Environment Variable Security

```bash
# Use strong passwords and rotate regularly
MONGODB_USERNAME=openframe_user
MONGODB_PASSWORD=$(openssl rand -base64 32)

# JWT signing secrets (different per environment)
JWT_SECRET=$(openssl rand -base64 64)

# API encryption keys
API_ENCRYPTION_KEY=$(openssl rand -base64 32)

# External service credentials
GOOGLE_CLIENT_SECRET=secure_google_secret
MICROSOFT_CLIENT_SECRET=secure_microsoft_secret

# Redis passwords
REDIS_PASSWORD=$(openssl rand -base64 32)
```

#### Configuration Security

```yaml
# application-production.yml
spring:
  config:
    activate:
      on-profile: production
  datasource:
    password: ${DATABASE_PASSWORD:}
    
security:
  jwt:
    secret: ${JWT_SECRET:}
  encryption:
    key: ${ENCRYPTION_KEY:}
    
# Use encrypted properties for sensitive data
jasypt:
  encryptor:
    password: ${JASYPT_PASSWORD:}
    algorithm: PBEWITHHMACSHA512ANDAES_256
```

## Input Validation and Sanitization

### Request Validation Framework

```java
@RestController
@Validated
public class UserController {
    
    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<User> createUser(
            @Valid @RequestBody CreateUserRequest request,
            @AuthenticationPrincipal AuthPrincipal principal) {
        
        // Validate tenant context
        validateTenantAccess(request.getTenantId(), principal);
        
        // Sanitize inputs
        request = sanitizeCreateUserRequest(request);
        
        User user = userService.createUser(request, principal.getTenantId());
        return ResponseEntity.ok(user);
    }
}

@Data
@Validated
public class CreateUserRequest {
    
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Pattern(regexp = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", 
             message = "Invalid email format")
    private String email;
    
    @NotBlank(message = "First name is required")
    @Size(min = 1, max = 50, message = "First name must be between 1 and 50 characters")
    @Pattern(regexp = "^[a-zA-Z\\s-']+$", message = "First name contains invalid characters")
    private String firstName;
    
    @NotBlank(message = "Last name is required")
    @Size(min = 1, max = 50, message = "Last name must be between 1 and 50 characters")
    @Pattern(regexp = "^[a-zA-Z\\s-']+$", message = "Last name contains invalid characters")
    private String lastName;
    
    @Valid
    @NotNull(message = "Organization is required")
    private OrganizationReference organization;
}
```

### SQL/NoSQL Injection Prevention

```java
@Repository
public class UserRepository {
    
    private final MongoTemplate mongoTemplate;
    
    // Safe query construction using Spring Data MongoDB
    public List<User> findUsersByTenantAndRole(String tenantId, String role) {
        Query query = new Query()
            .addCriteria(Criteria.where("tenantId").is(tenantId))
            .addCriteria(Criteria.where("roles").in(role))
            .with(Sort.by(Sort.Direction.ASC, "lastName", "firstName"));
            
        return mongoTemplate.find(query, User.class);
    }
    
    // Parameterized aggregation pipeline
    public List<UserStats> getUserStatsByTenant(String tenantId) {
        MatchOperation matchTenant = Aggregation.match(
            Criteria.where("tenantId").is(tenantId));
        
        GroupOperation groupByRole = Aggregation.group("roles")
            .count().as("userCount")
            .first("roles").as("role");
            
        Aggregation aggregation = Aggregation.newAggregation(
            matchTenant, groupByRole);
            
        return mongoTemplate.aggregate(aggregation, "users", UserStats.class)
            .getMappedResults();
    }
}
```

### GraphQL Security

```java
@DgsComponent
public class UserDataFetcher {
    
    @DgsQuery
    @PreAuthorize("hasRole('USER')")
    public List<User> users(@InputArgument UserFilterInput filter,
                           @AuthenticationPrincipal AuthPrincipal principal) {
        
        // Ensure tenant isolation
        filter.setTenantId(principal.getTenantId());
        
        // Validate and sanitize filter inputs
        validateUserFilter(filter);
        
        return userService.findUsers(filter);
    }
    
    @DgsMutation
    @PreAuthorize("hasRole('ADMIN')")
    public User updateUser(@InputArgument String userId,
                          @InputArgument UpdateUserInput input,
                          @AuthenticationPrincipal AuthPrincipal principal) {
        
        // Verify user belongs to tenant
        User existingUser = userService.findById(userId);
        if (!existingUser.getTenantId().equals(principal.getTenantId())) {
            throw new AccessDeniedException("User not found in tenant");
        }
        
        return userService.updateUser(userId, input);
    }
}
```

## Common Security Vulnerabilities and Mitigations

### OWASP Top 10 Mitigations

#### 1. Injection Attacks

**Prevention:**
- Use parameterized queries for all database operations
- Validate and sanitize all inputs
- Use prepared statements and ORM frameworks
- Implement proper error handling

```java
// Bad - Vulnerable to injection
String query = "SELECT * FROM users WHERE email = '" + email + "'";

// Good - Parameterized query
Query query = new Query(Criteria.where("email").is(email));
```

#### 2. Broken Authentication

**Prevention:**
- Implement multi-factor authentication
- Use secure session management
- Enforce strong password policies
- Monitor for suspicious login attempts

```java
@Component
public class AuthenticationSecurityService {
    
    private final RedisTemplate<String, Object> redisTemplate;
    private final int MAX_LOGIN_ATTEMPTS = 5;
    private final Duration LOCKOUT_DURATION = Duration.ofMinutes(15);
    
    public void recordFailedLogin(String username, String ipAddress) {
        String key = "failed_login:" + username + ":" + ipAddress;
        Integer attempts = (Integer) redisTemplate.opsForValue().get(key);
        attempts = (attempts == null) ? 1 : attempts + 1;
        
        if (attempts >= MAX_LOGIN_ATTEMPTS) {
            lockAccount(username, ipAddress);
        }
        
        redisTemplate.opsForValue().set(key, attempts, Duration.ofHours(1));
    }
    
    private void lockAccount(String username, String ipAddress) {
        String lockKey = "account_locked:" + username + ":" + ipAddress;
        redisTemplate.opsForValue().set(lockKey, true, LOCKOUT_DURATION);
        
        // Send security alert
        securityAlertService.sendAccountLockoutAlert(username, ipAddress);
    }
}
```

#### 3. Sensitive Data Exposure

**Prevention:**
- Encrypt sensitive data at rest and in transit
- Use HTTPS everywhere
- Implement proper data masking
- Audit data access

```java
@JsonSerialize(using = SensitiveDataSerializer.class)
@JsonDeserialize(using = SensitiveDataDeserializer.class)
public class SensitiveField {
    private String value;
    
    // Custom serialization to mask sensitive data in logs
    @Override
    public String toString() {
        return value != null ? "***MASKED***" : null;
    }
}
```

#### 4. XML External Entities (XXE)

**Prevention:**
- Disable XML external entity processing
- Use safe XML parsers
- Validate XML inputs

```java
@Configuration
public class XmlSecurityConfiguration {
    
    @Bean
    public DocumentBuilderFactory documentBuilderFactory() {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        try {
            // Disable external entity processing
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
        } catch (ParserConfigurationException e) {
            throw new SecurityException("Failed to configure XML security", e);
        }
        return factory;
    }
}
```

#### 5. Security Misconfiguration

**Prevention:**
- Use security headers
- Configure HTTPS properly
- Remove default accounts
- Regular security updates

```java
@Configuration
@EnableWebSecurity
public class SecurityConfiguration {
    
    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        return http
            .headers(headers -> headers
                .frameOptions().deny()
                .contentTypeOptions(Customizer.withDefaults())
                .httpStrictTransportSecurity(hstsConfig -> hstsConfig
                    .maxAgeInSeconds(31536000)
                    .includeSubdomains(true))
                .and()
                .add("X-Content-Type-Options", "nosniff")
                .add("X-Frame-Options", "DENY")
                .add("X-XSS-Protection", "1; mode=block")
                .add("Referrer-Policy", "strict-origin-when-cross-origin")
                .add("Content-Security-Policy", "default-src 'self'"))
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieServerCsrfTokenRepository.withHttpOnlyFalse()))
            .build();
    }
}
```

## Security Testing and Code Review

### Automated Security Testing

#### Unit Tests for Security

```java
@SpringBootTest
@TestMethodOrder(OrderAnnotation.class)
class SecurityTests {
    
    @Test
    @Order(1)
    void testJwtTokenValidation() {
        // Test valid JWT token
        String validToken = generateValidJwtToken("tenant123", "user456");
        assertTrue(jwtValidator.isValid(validToken));
        
        // Test expired token
        String expiredToken = generateExpiredJwtToken("tenant123", "user456");
        assertFalse(jwtValidator.isValid(expiredToken));
        
        // Test tampered token
        String tamperedToken = tamperWithToken(validToken);
        assertFalse(jwtValidator.isValid(tamperedToken));
    }
    
    @Test
    @Order(2)
    void testTenantIsolation() {
        // Create users in different tenants
        User tenant1User = createTestUser("tenant1", "user1@example.com");
        User tenant2User = createTestUser("tenant2", "user2@example.com");
        
        // Verify tenant1 user cannot access tenant2 data
        assertThrows(AccessDeniedException.class, () -> {
            userService.findUsersInTenant("tenant2", createAuthContext("tenant1", "user1"));
        });
    }
    
    @Test
    @Order(3)
    void testInputValidation() {
        CreateUserRequest maliciousRequest = new CreateUserRequest();
        maliciousRequest.setEmail("<script>alert('xss')</script>@example.com");
        maliciousRequest.setFirstName("'; DROP TABLE users; --");
        
        Set<ConstraintViolation<CreateUserRequest>> violations = 
            validator.validate(maliciousRequest);
        
        assertFalse(violations.isEmpty());
        assertTrue(violations.stream()
            .anyMatch(v -> v.getMessage().contains("Invalid email format")));
    }
}
```

#### Integration Security Tests

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class SecurityIntegrationTests {
    
    @Test
    void testUnauthorizedAccess() {
        ResponseEntity<String> response = restTemplate.getForEntity(
            "/api/users", String.class);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }
    
    @Test
    void testCrossOriginResourceSharing() {
        HttpHeaders headers = new HttpHeaders();
        headers.add("Origin", "https://malicious-site.com");
        
        HttpEntity<String> request = new HttpEntity<>(headers);
        ResponseEntity<String> response = restTemplate.exchange(
            "/api/users", HttpMethod.GET, request, String.class);
            
        assertNull(response.getHeaders().getAccessControlAllowOrigin());
    }
    
    @Test
    void testApiKeyRateLimit() {
        String apiKey = "ak_test123.sk_test456";
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-API-Key", apiKey);
        
        // Make requests up to the limit
        for (int i = 0; i < 100; i++) {
            HttpEntity<String> request = new HttpEntity<>(headers);
            ResponseEntity<String> response = restTemplate.exchange(
                "/external-api/devices", HttpMethod.GET, request, String.class);
            assertEquals(HttpStatus.OK, response.getStatusCode());
        }
        
        // Next request should be rate limited
        HttpEntity<String> request = new HttpEntity<>(headers);
        ResponseEntity<String> response = restTemplate.exchange(
            "/external-api/devices", HttpMethod.GET, request, String.class);
        assertEquals(HttpStatus.TOO_MANY_REQUESTS, response.getStatusCode());
    }
}
```

### Static Code Analysis

#### Security-Focused Code Review Checklist

```text
Authentication & Authorization:
☐ All endpoints have appropriate authentication
☐ Role-based access control is properly implemented
☐ Tenant isolation is maintained throughout request processing
☐ JWT tokens contain necessary claims and are validated properly

Input Validation:
☐ All user inputs are validated and sanitized
☐ Parameterized queries are used for database operations
☐ File upload restrictions are in place
☐ Request size limits are configured

Data Protection:
☐ Sensitive data is encrypted at rest
☐ PII is properly masked in logs
☐ Database connections use encryption
☐ Secrets are not hardcoded in source

Error Handling:
☐ Errors don't leak sensitive information
☐ Generic error messages for authentication failures
☐ Proper logging of security events
☐ Exception handling doesn't expose stack traces

Configuration Security:
☐ Security headers are properly configured
☐ HTTPS is enforced in production
☐ CORS policies are restrictive
☐ Default credentials are changed
```

## Environment Variables and Secrets Management

### Development Environment

```bash
# Development environment variables (.env.development)
OPENFRAME_ENV=development
LOG_LEVEL=DEBUG
JWT_EXPIRATION=3600
ENABLE_CSRF=true
ENABLE_CORS=true
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Database credentials (rotate regularly)
DATABASE_USERNAME=openframe_dev
DATABASE_PASSWORD=secure_dev_password_2024

# External service credentials (use test/sandbox keys)
GOOGLE_CLIENT_ID=development_google_client_id
GOOGLE_CLIENT_SECRET=development_google_client_secret
```

### Production Environment

```bash
# Production environment variables (use proper secret management)
OPENFRAME_ENV=production
LOG_LEVEL=WARN
JWT_EXPIRATION=1800
ENABLE_CSRF=true
ENABLE_CORS=false

# Use Azure Key Vault, AWS Secrets Manager, or similar
DATABASE_PASSWORD=$(az keyvault secret show --name db-password --vault-name openframe-vault --query value -o tsv)
JWT_SECRET=$(aws secretsmanager get-secret-value --secret-id openframe/jwt-secret --query SecretString --output text)

# Security monitoring
SECURITY_MONITORING_ENABLED=true
AUDIT_LOG_LEVEL=INFO
FAILED_LOGIN_THRESHOLD=3
ACCOUNT_LOCKOUT_DURATION=900
```

### Secret Rotation Strategy

```java
@Component
@Slf4j
public class SecretRotationService {
    
    @Scheduled(cron = "0 0 2 1 * ?") // Monthly rotation
    public void rotateJwtSecrets() {
        log.info("Starting JWT secret rotation");
        
        // Generate new signing keys for all tenants
        List<String> tenantIds = tenantService.getAllTenantIds();
        
        for (String tenantId : tenantIds) {
            try {
                KeyPair newKeyPair = rsaKeyPairGenerator.generate();
                tenantKeyService.rotateSigningKey(tenantId, newKeyPair);
                log.info("Rotated signing key for tenant: {}", tenantId);
            } catch (Exception e) {
                log.error("Failed to rotate key for tenant: {}", tenantId, e);
                alertingService.sendSecurityAlert("Key rotation failed", tenantId, e);
            }
        }
        
        log.info("Completed JWT secret rotation");
    }
}
```

## Security Monitoring and Incident Response

### Security Event Logging

```java
@Component
@Slf4j
public class SecurityEventLogger {
    
    private final ObjectMapper objectMapper;
    
    public void logAuthenticationEvent(AuthenticationEvent event) {
        try {
            String eventJson = objectMapper.writeValueAsString(Map.of(
                "event_type", "authentication",
                "timestamp", Instant.now(),
                "user_id", event.getUserId(),
                "tenant_id", event.getTenantId(),
                "ip_address", event.getIpAddress(),
                "user_agent", event.getUserAgent(),
                "success", event.isSuccess(),
                "failure_reason", event.getFailureReason()
            ));
            
            log.info("SECURITY_EVENT: {}", eventJson);
        } catch (Exception e) {
            log.error("Failed to log security event", e);
        }
    }
    
    public void logDataAccessEvent(DataAccessEvent event) {
        try {
            String eventJson = objectMapper.writeValueAsString(Map.of(
                "event_type", "data_access",
                "timestamp", Instant.now(),
                "user_id", event.getUserId(),
                "tenant_id", event.getTenantId(),
                "resource_type", event.getResourceType(),
                "resource_id", event.getResourceId(),
                "operation", event.getOperation(),
                "ip_address", event.getIpAddress()
            ));
            
            log.info("SECURITY_EVENT: {}", eventJson);
        } catch (Exception e) {
            log.error("Failed to log data access event", e);
        }
    }
}
```

### Automated Threat Detection

```java
@Component
public class ThreatDetectionService {
    
    @EventListener
    public void handleFailedAuthentication(FailedAuthenticationEvent event) {
        String key = "failed_auth:" + event.getIpAddress();
        int failureCount = incrementFailureCount(key);
        
        if (failureCount > 5) {
            // Potential brute force attack
            securityAlertService.sendAlert(SecurityAlert.builder()
                .type(AlertType.BRUTE_FORCE_DETECTED)
                .ipAddress(event.getIpAddress())
                .description("Multiple authentication failures detected")
                .build());
                
            // Temporarily block IP address
            ipBlockingService.blockIpAddress(event.getIpAddress(), Duration.ofMinutes(15));
        }
    }
    
    @EventListener
    public void handleUnusualDataAccess(DataAccessEvent event) {
        UserBehaviorProfile profile = userBehaviorService.getProfile(event.getUserId());
        
        if (isUnusualAccess(event, profile)) {
            securityAlertService.sendAlert(SecurityAlert.builder()
                .type(AlertType.UNUSUAL_ACCESS_PATTERN)
                .userId(event.getUserId())
                .tenantId(event.getTenantId())
                .description("Unusual data access pattern detected")
                .build());
        }
    }
}
```

### Incident Response Procedures

#### Automatic Response Actions

```java
@Component
public class IncidentResponseService {
    
    @EventListener
    public void handleSecurityIncident(SecurityIncident incident) {
        switch (incident.getSeverity()) {
            case CRITICAL:
                handleCriticalIncident(incident);
                break;
            case HIGH:
                handleHighSeverityIncident(incident);
                break;
            case MEDIUM:
                handleMediumSeverityIncident(incident);
                break;
            default:
                logIncident(incident);
        }
    }
    
    private void handleCriticalIncident(SecurityIncident incident) {
        // Immediate containment actions
        if (incident.getType() == IncidentType.SUSPECTED_BREACH) {
            // Disable affected user accounts
            userService.disableUsersInTenant(incident.getTenantId());
            
            // Invalidate all active sessions
            sessionService.invalidateAllSessions(incident.getTenantId());
            
            // Enable enhanced monitoring
            monitoringService.enableEnhancedMode(incident.getTenantId());
        }
        
        // Alert security team
        alertingService.sendImmediateAlert(incident);
        
        // Create incident ticket
        incidentTrackingService.createIncident(incident);
    }
}
```

## Security Compliance and Auditing

### Audit Trail Implementation

```java
@Aspect
@Component
@Slf4j
public class AuditAspect {
    
    @Around("@annotation(Auditable)")
    public Object auditMethod(ProceedingJoinPoint joinPoint) throws Throwable {
        AuditEvent auditEvent = AuditEvent.builder()
            .timestamp(Instant.now())
            .method(joinPoint.getSignature().getName())
            .className(joinPoint.getTarget().getClass().getSimpleName())
            .arguments(Arrays.toString(joinPoint.getArgs()))
            .build();
            
        try {
            Object result = joinPoint.proceed();
            auditEvent.setSuccess(true);
            auditEvent.setResult(result != null ? result.toString() : null);
            return result;
        } catch (Exception e) {
            auditEvent.setSuccess(false);
            auditEvent.setError(e.getMessage());
            throw e;
        } finally {
            auditService.recordEvent(auditEvent);
        }
    }
}

@Auditable
@RestController
public class SensitiveOperationsController {
    
    @PostMapping("/admin/users/{userId}/reset-password")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> resetPassword(@PathVariable String userId) {
        // Implementation
        return ResponseEntity.ok().build();
    }
}
```

### GDPR Compliance Features

```java
@Service
public class DataPrivacyService {
    
    public void handleDataDeletionRequest(String userId, String tenantId) {
        // Verify user belongs to tenant
        User user = userService.findByIdAndTenant(userId, tenantId);
        if (user == null) {
            throw new UserNotFoundException("User not found in tenant");
        }
        
        // Delete user data across all systems
        deleteUserFromAllSystems(user);
        
        // Log data deletion for audit
        auditService.logDataDeletion(userId, tenantId, 
            "GDPR data deletion request processed");
    }
    
    public PersonalDataExport exportUserData(String userId, String tenantId) {
        User user = userService.findByIdAndTenant(userId, tenantId);
        
        return PersonalDataExport.builder()
            .personalInformation(user.getPersonalInformation())
            .deviceInteractions(deviceService.getUserDeviceHistory(userId))
            .auditLogs(auditService.getUserAuditLogs(userId))
            .preferences(preferenceService.getUserPreferences(userId))
            .build();
    }
}
```

---

This comprehensive security guide provides the foundation for maintaining a secure multi-tenant MSP platform. Regular security reviews, updates, and monitoring are essential for maintaining the security posture of OpenFrame OSS Tenant.