# Security Best Practices

Security is fundamental to OpenFrame's design as a multi-tenant MSP platform handling sensitive client data. This guide covers OpenFrame's security architecture, best practices, and guidelines for secure development.

## Security Architecture Overview

OpenFrame implements a comprehensive security model based on zero-trust principles:

```mermaid
flowchart TB
    subgraph "External Threats"
        Internet[Internet]
        BadActor[Malicious Actors]
        MITM[Man-in-Middle]
    end
    
    subgraph "Security Perimeter"
        WAF[Web Application Firewall]
        DDoS[DDoS Protection]
        TLS[TLS Termination]
    end
    
    subgraph "Authentication Layer"
        OAuth[OAuth2/OIDC Server]
        MFA[Multi-Factor Auth]
        SSO[SSO Integration]
        JWT[JWT Validation]
    end
    
    subgraph "Authorization Layer"
        RBAC[Role-Based Access Control]
        TenantIsolation[Tenant Isolation]
        ApiKeys[API Key Management]
        ResourceAuth[Resource Authorization]
    end
    
    subgraph "Application Security"
        InputValidation[Input Validation]
        SQLInjection[SQL Injection Prevention]
        XSS[XSS Protection]
        CSRF[CSRF Protection]
    end
    
    subgraph "Data Protection"
        Encryption[Data Encryption]
        KeyManagement[Key Management]
        DataMasking[Data Masking]
        BackupSecurity[Secure Backups]
    end
    
    Internet --> WAF
    BadActor --> DDoS
    MITM --> TLS
    
    WAF --> OAuth
    DDoS --> MFA
    TLS --> SSO
    
    OAuth --> RBAC
    JWT --> TenantIsolation
    MFA --> ApiKeys
    
    RBAC --> InputValidation
    ResourceAuth --> SQLInjection
    TenantIsolation --> XSS
    
    InputValidation --> Encryption
    XSS --> KeyManagement
    CSRF --> DataMasking
```

## Authentication and Authorization

### OAuth2/OpenID Connect Implementation

OpenFrame uses industry-standard OAuth2 with PKCE for secure authentication:

```mermaid
sequenceDiagram
    participant Client as Frontend Client
    participant Auth as Authorization Server
    participant Resource as Resource Server
    participant IDP as Identity Provider
    
    Note over Client,IDP: OAuth2 PKCE Flow
    
    Client->>Client: Generate code verifier & challenge
    Client->>Auth: Authorization request with PKCE challenge
    Auth->>IDP: Redirect to identity provider
    IDP->>Auth: Authentication callback with code
    Auth->>Auth: Validate authorization code
    Auth->>Client: Access token + Refresh token
    
    Note over Client,Resource: API Access Flow
    
    Client->>Resource: API request with Bearer token
    Resource->>Auth: Validate token (if not cached)
    Auth->>Resource: Token validation response
    Resource->>Resource: Check permissions
    Resource->>Client: Protected resource
```

#### Authentication Configuration

**OAuth2 Server Configuration:**

```yaml
# application-security.yml
spring:
  security:
    oauth2:
      authorizationserver:
        client:
          openframe-frontend:
            registration:
              client-id: openframe-frontend
              client-authentication-methods:
                - none  # Public client (PKCE)
              authorization-grant-types:
                - authorization_code
                - refresh_token
              redirect-uris:
                - http://localhost:3000/auth/callback
              post-logout-redirect-uris:
                - http://localhost:3000/auth/logout
              scopes:
                - openid
                - profile
                - email
                - read:devices
                - write:devices
                - read:organizations
                - write:organizations
            token:
              access-token-time-to-live: PT15M  # 15 minutes
              refresh-token-time-to-live: P7D   # 7 days
              
  jwt:
    private-key-location: classpath:tenant-keys/${tenant.id}/private-key.pem
    public-key-location: classpath:tenant-keys/${tenant.id}/public-key.pem
```

#### Multi-Factor Authentication

Enable MFA for enhanced security:

```java
@Configuration
@EnableWebSecurity
public class MFASecurityConfig {
    
    @Bean
    public MfaAuthenticationProvider mfaProvider() {
        return new MfaAuthenticationProvider()
            .setTotpService(totpService())
            .setSmsService(smsService())
            .setEmailService(emailService());
    }
    
    @Bean
    public TotpService totpService() {
        return new TotpService()
            .setSecretGenerator(new Base32SecretGenerator())
            .setTimeWindow(30) // 30 seconds
            .setDiscrepancy(1); // Allow 1 time window difference
    }
}
```

### JWT Token Security

#### Token Structure and Claims

OpenFrame JWT tokens contain tenant-specific claims:

```json
{
  "iss": "https://auth.openframe.ai/tenant-123",
  "sub": "user-456", 
  "aud": ["openframe-api", "openframe-gateway"],
  "exp": 1640995200,
  "iat": 1640991600,
  "tenant_id": "tenant-123",
  "user_roles": ["admin", "device:read", "device:write"],
  "organization_access": ["org-789", "org-101"],
  "permissions": [
    "devices:read",
    "devices:write",
    "organizations:read",
    "logs:read"
  ]
}
```

#### Token Validation Implementation

```java
@Component
public class JwtTokenValidator {
    
    @Value("${security.jwt.public-key-location}")
    private String publicKeyLocation;
    
    @Cacheable(value = "jwt-validation", key = "#token")
    public ValidationResult validateToken(String token, String tenantId) {
        try {
            // Get tenant-specific public key
            RSAPublicKey publicKey = getTenantPublicKey(tenantId);
            
            // Verify signature and decode
            DecodedJWT jwt = JWT.require(Algorithm.RSA256(publicKey))
                .withIssuer(getTenantIssuer(tenantId))
                .withAudience("openframe-api")
                .build()
                .verify(token);
                
            // Extract and validate claims
            return ValidationResult.success(extractClaims(jwt));
            
        } catch (JWTVerificationException e) {
            log.warn("JWT validation failed: {}", e.getMessage());
            return ValidationResult.failure("Invalid token");
        }
    }
    
    private RSAPublicKey getTenantPublicKey(String tenantId) {
        // Load tenant-specific public key
        String keyPath = publicKeyLocation.replace("${tenant.id}", tenantId);
        return KeyUtils.loadRSAPublicKey(keyPath);
    }
}
```

### Role-Based Access Control (RBAC)

#### Permission Model

OpenFrame implements a hierarchical permission system:

```mermaid
flowchart TD
    subgraph "Tenant Level"
        TenantAdmin[Tenant Administrator]
        TenantUser[Tenant User]
    end
    
    subgraph "Organization Level"  
        OrgAdmin[Organization Administrator]
        OrgUser[Organization User]
        OrgReadOnly[Organization Read-Only]
    end
    
    subgraph "Resource Level"
        DeviceAdmin[Device Administrator] 
        DeviceUser[Device User]
        DeviceReadOnly[Device Read-Only]
        LogsAdmin[Logs Administrator]
        LogsUser[Logs User]
    end
    
    TenantAdmin --> OrgAdmin
    TenantAdmin --> DeviceAdmin
    TenantAdmin --> LogsAdmin
    
    TenantUser --> OrgUser
    OrgAdmin --> OrgUser
    OrgAdmin --> DeviceUser
    
    OrgUser --> DeviceUser
    DeviceAdmin --> DeviceUser
    DeviceUser --> DeviceReadOnly
    
    LogsAdmin --> LogsUser
```

#### Permission Enforcement

```java
@PreAuthorize("hasPermission(#deviceId, 'Device', 'READ')")
public DeviceResponse getDevice(@PathVariable String deviceId) {
    return deviceService.getDevice(deviceId);
}

@PreAuthorize("hasRole('TENANT_ADMIN') or hasPermission(#organizationId, 'Organization', 'WRITE')")
public OrganizationResponse updateOrganization(
    @PathVariable String organizationId,
    @RequestBody UpdateOrganizationRequest request) {
    return organizationService.updateOrganization(organizationId, request);
}

// Custom permission evaluator
@Component
public class OpenFramePermissionEvaluator implements PermissionEvaluator {
    
    @Override
    public boolean hasPermission(Authentication auth, Object targetId, Object permission) {
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        String tenantId = principal.getTenantId();
        
        // Check tenant-scoped permissions
        return permissionService.hasPermission(
            tenantId, 
            principal.getUserId(), 
            targetId.toString(), 
            permission.toString()
        );
    }
}
```

## Data Security and Encryption

### Encryption at Rest

All sensitive data is encrypted using AES-256:

```java
@Configuration
public class EncryptionConfig {
    
    @Bean
    public AESUtil dataEncryption() {
        return AESUtil.builder()
            .algorithm("AES/GCM/NoPadding")
            .keySize(256)
            .keySource(KeySource.HSM) // Hardware Security Module
            .build();
    }
    
    // Encrypt sensitive fields in MongoDB
    @EventListener
    public void beforeSave(BeforeSaveEvent<Object> event) {
        Object entity = event.getSource();
        
        ReflectionUtils.doWithFields(entity.getClass(), field -> {
            if (field.isAnnotationPresent(Encrypted.class)) {
                field.setAccessible(true);
                String value = (String) field.get(entity);
                if (value != null) {
                    String encrypted = encryptionService.encrypt(value, getTenantKey());
                    field.set(entity, encrypted);
                }
            }
        });
    }
}

// Usage in domain models
@Document(collection = "users")
public class User {
    private String id;
    private String email;
    
    @Encrypted
    private String personalInfo; // Automatically encrypted
    
    @Encrypted
    private String apiKey; // Automatically encrypted
}
```

### Encryption in Transit

All communications use TLS 1.3 with strong cipher suites:

```yaml
# application-security.yml
server:
  ssl:
    enabled: true
    protocol: TLS
    enabled-protocols: TLSv1.3
    ciphers:
      - TLS_AES_256_GCM_SHA384
      - TLS_CHACHA20_POLY1305_SHA256
      - TLS_AES_128_GCM_SHA256
    key-store: classpath:keystore/server.p12
    key-store-password: ${SSL_KEYSTORE_PASSWORD}
    key-store-type: PKCS12
    
  # Require HTTPS for all endpoints
  require-ssl: true
  
  # Security headers
  security:
    headers:
      content-security-policy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
      strict-transport-security: "max-age=31536000; includeSubdomains"
      x-frame-options: DENY
      x-content-type-options: nosniff
```

### Database Security

#### MongoDB Security Configuration

```yaml
# MongoDB security settings
spring:
  data:
    mongodb:
      uri: mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_HOST}:27017/${MONGODB_DATABASE}?authSource=admin&ssl=true&replicaSet=rs0
      
      # Connection pool settings
      max-connections-per-host: 100
      min-connections-per-host: 10
      max-wait-time: 30000
      connect-timeout: 10000
      socket-timeout: 30000
      
      # Enable SSL/TLS
      ssl-enabled: true
      ssl-invalid-host-name-allowed: false
```

#### Tenant Data Isolation

Ensure complete tenant data separation:

```java
@Component
public class TenantDataFilter {
    
    @EventListener
    public void beforeQuery(BeforeQueryEvent event) {
        // Automatically add tenant filter to all queries
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth instanceof JwtAuthenticationToken) {
            String tenantId = extractTenantId(auth);
            
            Query query = event.getQuery();
            query.addCriteria(Criteria.where("tenantId").is(tenantId));
        }
    }
    
    @EventListener  
    public void beforeSave(BeforeSaveEvent<Object> event) {
        // Automatically set tenant ID on all saved entities
        Object entity = event.getSource();
        if (entity instanceof TenantAware) {
            TenantAware tenantEntity = (TenantAware) entity;
            if (tenantEntity.getTenantId() == null) {
                String tenantId = getCurrentTenantId();
                tenantEntity.setTenantId(tenantId);
            }
        }
    }
}
```

## Input Validation and Sanitization

### Request Validation

Implement comprehensive input validation:

```java
// Input validation with Bean Validation
@RestController
@Validated
public class DeviceController {
    
    @PostMapping("/devices")
    public ResponseEntity<DeviceResponse> createDevice(
            @Valid @RequestBody CreateDeviceRequest request) {
        
        // Additional custom validation
        validationService.validateDeviceRequest(request);
        
        DeviceResponse device = deviceService.createDevice(request);
        return ResponseEntity.ok(device);
    }
}

// Request DTO with validation annotations
public class CreateDeviceRequest {
    
    @NotBlank(message = "Device hostname is required")
    @Size(min = 1, max = 255, message = "Hostname must be between 1 and 255 characters")
    @Pattern(regexp = "^[a-zA-Z0-9.-]+$", message = "Invalid hostname format")
    private String hostname;
    
    @NotBlank(message = "IP address is required")
    @Pattern(regexp = "^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$", message = "Invalid IP address format")
    private String ipAddress;
    
    @Email(message = "Invalid email format")
    private String contactEmail;
    
    @Valid
    private List<@NotNull DeviceTag> tags = new ArrayList<>();
}

// Custom validation service
@Service
public class ValidationService {
    
    public void validateDeviceRequest(CreateDeviceRequest request) {
        // IP address validation
        if (!isValidIpAddress(request.getIpAddress())) {
            throw new ValidationException("Invalid IP address format");
        }
        
        // Hostname DNS validation  
        if (!isValidHostname(request.getHostname())) {
            throw new ValidationException("Invalid hostname format");
        }
        
        // Business rule validation
        if (deviceService.existsByHostname(request.getHostname())) {
            throw new ValidationException("Device with this hostname already exists");
        }
    }
}
```

### SQL Injection Prevention

Use parameterized queries and ORM best practices:

```java
// Safe repository methods using Spring Data MongoDB
@Repository
public interface DeviceRepository extends MongoRepository<Device, String> {
    
    // Safe query methods - automatically parameterized
    List<Device> findByTenantIdAndStatus(String tenantId, DeviceStatus status);
    
    @Query("{ 'tenantId': ?0, 'hostname': { $regex: ?1, $options: 'i' } }")
    List<Device> findByTenantIdAndHostnameContaining(String tenantId, String hostname);
    
    // Aggregation pipeline - safe from injection
    @Aggregation(pipeline = {
        "{ $match: { tenantId: ?0, status: ?1 } }",
        "{ $group: { _id: '$organizationId', count: { $sum: 1 } } }",
        "{ $sort: { count: -1 } }"
    })
    List<DeviceCountByOrganization> countDevicesByOrganization(String tenantId, DeviceStatus status);
}

// Never do this - vulnerable to injection
@Query("{ 'hostname': '" + "?0" + "' }") // DON'T DO THIS
List<Device> findByHostnameUnsafe(String hostname);
```

### XSS Protection

Implement comprehensive XSS prevention:

```java
@Configuration
public class XSSProtectionConfig {
    
    @Bean
    public FilterRegistrationBean<XSSFilter> xssFilter() {
        FilterRegistrationBean<XSSFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new XSSFilter());
        registration.addUrlPatterns("/*");
        registration.setOrder(1);
        return registration;
    }
}

// XSS Filter implementation
public class XSSFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        XSSRequestWrapper wrappedRequest = new XSSRequestWrapper((HttpServletRequest) request);
        chain.doFilter(wrappedRequest, response);
    }
}

// Request wrapper that sanitizes input
public class XSSRequestWrapper extends HttpServletRequestWrapper {
    
    private static final PolicyFactory POLICY = Sanitizers.FORMATTING
        .and(Sanitizers.LINKS)
        .and(Sanitizers.BLOCKS);
    
    @Override
    public String getParameter(String name) {
        String value = super.getParameter(name);
        return sanitizeInput(value);
    }
    
    @Override
    public String[] getParameterValues(String name) {
        String[] values = super.getParameterValues(name);
        if (values == null) return null;
        
        return Arrays.stream(values)
            .map(this::sanitizeInput)
            .toArray(String[]::new);
    }
    
    private String sanitizeInput(String input) {
        if (input == null) return null;
        return POLICY.sanitize(input);
    }
}
```

## API Security

### Rate Limiting

Implement per-tenant and per-user rate limiting:

```java
@Configuration
public class RateLimitConfig {
    
    @Bean
    public RateLimitService rateLimitService() {
        return RateLimitService.builder()
            .redisTemplate(redisTemplate())
            .defaultLimit(1000, Duration.ofHours(1)) // 1000 requests per hour
            .build();
    }
    
    @Bean
    public FilterRegistrationBean<RateLimitFilter> rateLimitFilter() {
        FilterRegistrationBean<RateLimitFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new RateLimitFilter(rateLimitService()));
        registration.addUrlPatterns("/api/*");
        registration.setOrder(2);
        return registration;
    }
}

// Rate limiting filter
public class RateLimitFilter implements Filter {
    
    private final RateLimitService rateLimitService;
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        String clientId = extractClientId(httpRequest);
        String tenantId = extractTenantId(httpRequest);
        
        // Check rate limits
        RateLimitResult userLimit = rateLimitService.checkLimit(
            "user:" + clientId, 100, Duration.ofMinutes(15));
        
        RateLimitResult tenantLimit = rateLimitService.checkLimit(
            "tenant:" + tenantId, 10000, Duration.ofHours(1));
        
        if (!userLimit.isAllowed() || !tenantLimit.isAllowed()) {
            httpResponse.setStatus(429); // Too Many Requests
            httpResponse.setHeader("Retry-After", "900"); // 15 minutes
            return;
        }
        
        // Add rate limit headers
        httpResponse.setHeader("X-RateLimit-Limit", "100");
        httpResponse.setHeader("X-RateLimit-Remaining", 
            String.valueOf(userLimit.getRemainingRequests()));
        httpResponse.setHeader("X-RateLimit-Reset", 
            String.valueOf(userLimit.getResetTime()));
        
        chain.doFilter(request, response);
    }
}
```

### API Key Management

Secure API key generation and validation:

```java
@Service
public class ApiKeyService {
    
    private final SecureRandom secureRandom = new SecureRandom();
    private final EncryptionService encryptionService;
    
    public ApiKeyResponse generateApiKey(CreateApiKeyRequest request) {
        // Generate cryptographically secure API key
        String keyId = generateKeyId();
        String secretKey = generateSecretKey();
        
        // Create API key record
        ApiKey apiKey = ApiKey.builder()
            .keyId(keyId)
            .hashedSecret(hashSecret(secretKey))
            .name(request.getName())
            .permissions(request.getPermissions())
            .tenantId(getCurrentTenantId())
            .expiresAt(calculateExpiration(request.getExpirationDays()))
            .createdAt(Instant.now())
            .lastUsed(null)
            .usageCount(0L)
            .build();
            
        apiKeyRepository.save(apiKey);
        
        // Return the full key only once
        String fullApiKey = keyId + "." + secretKey;
        
        return ApiKeyResponse.builder()
            .keyId(keyId)
            .fullKey(fullApiKey) // Only shown once
            .name(apiKey.getName())
            .permissions(apiKey.getPermissions())
            .expiresAt(apiKey.getExpiresAt())
            .build();
    }
    
    public boolean validateApiKey(String apiKey) {
        if (!isValidApiKeyFormat(apiKey)) {
            return false;
        }
        
        String[] parts = apiKey.split("\\.", 2);
        String keyId = parts[0];
        String secretKey = parts[1];
        
        Optional<ApiKey> storedKey = apiKeyRepository.findByKeyId(keyId);
        if (storedKey.isEmpty()) {
            return false;
        }
        
        ApiKey key = storedKey.get();
        
        // Check if expired
        if (key.getExpiresAt() != null && key.getExpiresAt().isBefore(Instant.now())) {
            return false;
        }
        
        // Verify secret using constant-time comparison
        boolean isValid = verifySecret(secretKey, key.getHashedSecret());
        
        if (isValid) {
            // Update usage statistics
            updateApiKeyUsage(key);
        }
        
        return isValid;
    }
    
    private String generateKeyId() {
        // Format: ak_1a2b3c4d5e6f7890 (8 characters after ak_)
        byte[] bytes = new byte[8];
        secureRandom.nextBytes(bytes);
        return "ak_" + Hex.encodeHexString(bytes);
    }
    
    private String generateSecretKey() {
        // Format: sk_live_abcdefghijklmnopqrstuvwxyz123456 (32 characters after sk_live_)
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return "sk_live_" + Hex.encodeHexString(bytes);
    }
}
```

## Vulnerability Management

### Security Scanning and Dependencies

Implement continuous security scanning:

```xml
<!-- Maven security plugins -->
<plugin>
    <groupId>org.owasp</groupId>
    <artifactId>dependency-check-maven</artifactId>
    <version>8.4.0</version>
    <configuration>
        <failBuildOnCVSS>7</failBuildOnCVSS>
        <suppressionFile>owasp-suppressions.xml</suppressionFile>
    </configuration>
    <executions>
        <execution>
            <goals>
                <goal>check</goal>
            </goals>
        </execution>
    </executions>
</plugin>

<plugin>
    <groupId>com.github.spotbugs</groupId>
    <artifactId>spotbugs-maven-plugin</artifactId>
    <version>4.7.3</version>
    <configuration>
        <effort>Max</effort>
        <threshold>Low</threshold>
        <includeTests>true</includeTests>
    </configuration>
</plugin>
```

### Security Headers

Configure comprehensive security headers:

```java
@Configuration
public class SecurityHeadersConfig {
    
    @Bean
    public FilterRegistrationBean<SecurityHeadersFilter> securityHeaders() {
        FilterRegistrationBean<SecurityHeadersFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new SecurityHeadersFilter());
        registration.addUrlPatterns("/*");
        registration.setOrder(0);
        return registration;
    }
}

public class SecurityHeadersFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        // Prevent clickjacking
        httpResponse.setHeader("X-Frame-Options", "DENY");
        
        // Prevent content-type sniffing
        httpResponse.setHeader("X-Content-Type-Options", "nosniff");
        
        // XSS Protection  
        httpResponse.setHeader("X-XSS-Protection", "1; mode=block");
        
        // Strict Transport Security
        httpResponse.setHeader("Strict-Transport-Security", 
            "max-age=31536000; includeSubdomains; preload");
        
        // Content Security Policy
        httpResponse.setHeader("Content-Security-Policy", 
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " +
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
            "font-src 'self' https://fonts.gstatic.com; " +
            "img-src 'self' data: https:; " +
            "connect-src 'self' ws: wss:; " +
            "frame-ancestors 'none';"
        );
        
        // Referrer Policy
        httpResponse.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        
        // Permissions Policy
        httpResponse.setHeader("Permissions-Policy", 
            "camera=(), microphone=(), geolocation=(), payment=()");
        
        chain.doFilter(request, response);
    }
}
```

## Security Testing

### Automated Security Tests

```java
@SpringBootTest
@TestPropertySource(properties = {
    "spring.profiles.active=test",
    "security.jwt.public-key-location=classpath:test-keys/public-key.pem"
})
public class SecurityIntegrationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Test
    public void testUnauthorizedAccessReturns401() throws Exception {
        mockMvc.perform(get("/api/devices"))
            .andExpect(status().isUnauthorized());
    }
    
    @Test
    public void testCrossTenantDataAccess() throws Exception {
        String tenant1Token = generateTokenForTenant("tenant-1");
        String tenant2DeviceId = createDeviceForTenant("tenant-2");
        
        // Tenant 1 should not be able to access Tenant 2's device
        mockMvc.perform(get("/api/devices/" + tenant2DeviceId)
                .header("Authorization", "Bearer " + tenant1Token))
            .andExpect(status().isForbidden());
    }
    
    @Test
    public void testSqlInjectionAttempt() throws Exception {
        String maliciousInput = "'; DROP TABLE devices; --";
        
        mockMvc.perform(get("/api/devices")
                .param("hostname", maliciousInput)
                .header("Authorization", "Bearer " + getValidToken()))
            .andExpect(status().isBadRequest());
    }
    
    @Test
    public void testXssAttempt() throws Exception {
        String xssPayload = "<script>alert('xss')</script>";
        
        mockMvc.perform(post("/api/devices")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"hostname\":\"" + xssPayload + "\"}")
                .header("Authorization", "Bearer " + getValidToken()))
            .andExpect(status().isBadRequest());
    }
    
    @Test
    public void testRateLimitingEnforcement() throws Exception {
        String token = getValidToken();
        
        // Make requests up to the limit
        for (int i = 0; i < 100; i++) {
            mockMvc.perform(get("/api/devices")
                    .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
        }
        
        // 101st request should be rate limited
        mockMvc.perform(get("/api/devices")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isTooManyRequests())
            .andExpect(header().exists("Retry-After"));
    }
}
```

## Security Monitoring and Incident Response

### Security Event Logging

```java
@Component
public class SecurityEventLogger {
    
    private final Logger securityLogger = LoggerFactory.getLogger("SECURITY");
    
    @EventListener
    public void handleAuthenticationFailure(AbstractAuthenticationFailureEvent event) {
        String username = event.getAuthentication().getName();
        String reason = event.getException().getMessage();
        String clientIp = getClientIpAddress();
        
        securityLogger.warn("Authentication failure - Username: {}, Reason: {}, IP: {}", 
            username, reason, clientIp);
        
        // Send to SIEM/monitoring system
        securityMetrics.increment("auth.failure", 
            "username", username, 
            "reason", reason,
            "client_ip", clientIp);
    }
    
    @EventListener
    public void handleRateLimitExceeded(RateLimitExceededEvent event) {
        securityLogger.warn("Rate limit exceeded - Client: {}, Endpoint: {}, Limit: {}", 
            event.getClientId(), event.getEndpoint(), event.getLimit());
        
        // Auto-block if excessive attempts
        if (event.getAttemptCount() > 1000) {
            securityService.temporaryBlock(event.getClientId(), Duration.ofHours(1));
        }
    }
    
    @EventListener 
    public void handleSuspiciousActivity(SuspiciousActivityEvent event) {
        securityLogger.error("Suspicious activity detected - Type: {}, Details: {}", 
            event.getActivityType(), event.getDetails());
        
        // Immediate alerting for critical events
        if (event.getSeverity() == Severity.CRITICAL) {
            alertingService.sendImmediateAlert(event);
        }
    }
}
```

### Incident Response Automation

```java
@Component
public class SecurityIncidentHandler {
    
    @Async
    @EventListener
    public void handleSecurityIncident(SecurityIncidentEvent event) {
        // Log incident
        incidentRepository.save(SecurityIncident.builder()
            .id(UUID.randomUUID().toString())
            .type(event.getType())
            .severity(event.getSeverity())
            .description(event.getDescription())
            .affectedTenant(event.getTenantId())
            .detectedAt(Instant.now())
            .status(IncidentStatus.OPEN)
            .build());
        
        // Automated response based on severity
        switch (event.getSeverity()) {
            case CRITICAL:
                handleCriticalIncident(event);
                break;
            case HIGH:
                handleHighSeverityIncident(event);
                break;
            case MEDIUM:
                handleMediumSeverityIncident(event);
                break;
        }
    }
    
    private void handleCriticalIncident(SecurityIncidentEvent event) {
        // Immediate actions for critical incidents
        
        // 1. Notify security team immediately
        notificationService.sendEmergencyAlert(event);
        
        // 2. Auto-block suspicious IP addresses
        if (event.getType() == IncidentType.BRUTE_FORCE_ATTACK) {
            String attackerIp = event.getSourceIp();
            firewallService.blockIpAddress(attackerIp, Duration.ofDays(1));
        }
        
        // 3. Revoke all active sessions for affected user (if applicable)
        if (event.getAffectedUser() != null) {
            sessionService.revokeAllUserSessions(event.getAffectedUser());
        }
        
        // 4. Enable enhanced monitoring
        monitoringService.enableEnhancedMode(event.getTenantId());
    }
}
```

---

This security guide provides the foundation for secure OpenFrame development. Remember that security is an ongoing process requiring continuous monitoring, updates, and improvement. Regular security assessments and penetration testing should be performed to identify and address potential vulnerabilities.