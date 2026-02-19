# Security Guidelines

Security is fundamental to OpenFrame's design as a multi-tenant MSP platform. This comprehensive guide covers authentication, authorization, secure coding practices, and security testing strategies for developers working with OpenFrame.

## Security Architecture Overview

OpenFrame implements defense-in-depth security with multiple layers of protection:

```mermaid
flowchart TD
    Internet[Internet/Public] --> WAF[Web Application Firewall]
    WAF --> TLS[TLS Termination]
    TLS --> Gateway[Gateway Service]
    
    Gateway --> Auth[Authentication]
    Auth --> Authz[Authorization]
    Authz --> RateLimit[Rate Limiting]
    RateLimit --> Services[Microservices]
    
    Services --> Encryption[Data Encryption]
    Encryption --> Database[(Encrypted Database)]
    
    subgraph "Security Layers"
        NetworkSec[Network Security]
        AppSec[Application Security]
        DataSec[Data Security]
        OperationalSec[Operational Security]
    end
    
    style NetworkSec fill:#ffebee
    style AppSec fill:#e8f5e8
    style DataSec fill:#e3f2fd
    style OperationalSec fill:#fff3e0
```

## Authentication and Authorization

### Multi-Tenant OAuth2/OIDC Implementation

OpenFrame implements OAuth2 and OpenID Connect with multi-tenant extensions:

#### Per-Tenant Authorization Servers

Each tenant has isolated OAuth2 configuration:

```java
@Configuration
@EnableAuthorizationServer
public class MultiTenantAuthorizationServerConfig {

    @Bean
    public RegisteredClientRepository registeredClientRepository(TenantService tenantService) {
        return new MongoRegisteredClientRepository(tenantService);
    }

    @Bean
    public JWKSource<SecurityContext> jwkSource(TenantKeyService keyService) {
        return new MultiTenantJWKSource(keyService);
    }

    @Bean
    public JwtDecoder jwtDecoder(JWKSource<SecurityContext> jwkSource) {
        return OAuth2AuthorizationServerConfiguration.jwtDecoder(jwkSource);
    }
}
```

#### JWT Token Structure

OpenFrame JWTs include tenant-specific claims:

```json
{
  "sub": "user-123",
  "tenant_id": "tenant-456", 
  "tenant_domain": "acme-corp",
  "iss": "https://auth.openframe.local/tenant-456",
  "aud": ["openframe-api", "openframe-external-api"],
  "scope": ["read:devices", "write:organizations"],
  "roles": ["ADMIN", "DEVICE_MANAGER"],
  "permissions": ["devices:read", "organizations:write"],
  "iat": 1642246800,
  "exp": 1642250400
}
```

### Authentication Implementation

#### JWT Validation Service

```java
@Component
public class JwtValidationService {
    
    private final TenantKeyService tenantKeyService;
    private final RedisTemplate<String, Object> redisTemplate;
    
    public Authentication validateToken(String token) {
        try {
            // Parse JWT and extract tenant
            Claims claims = parseToken(token);
            String tenantId = claims.get("tenant_id", String.class);
            
            // Get tenant-specific public key
            RSAPublicKey publicKey = tenantKeyService.getPublicKey(tenantId);
            
            // Verify signature and expiration
            Jws<Claims> validatedClaims = Jwts.parserBuilder()
                .setSigningKey(publicKey)
                .build()
                .parseClaimsJws(token);
                
            // Check if token is revoked
            if (isTokenRevoked(token)) {
                throw new JwtException("Token has been revoked");
            }
            
            // Build Spring Security authentication
            return buildAuthentication(validatedClaims.getBody());
            
        } catch (JwtException e) {
            throw new AuthenticationException("Invalid JWT token", e);
        }
    }
    
    private boolean isTokenRevoked(String token) {
        String tokenHash = DigestUtils.sha256Hex(token);
        return redisTemplate.hasKey("revoked:token:" + tokenHash);
    }
}
```

#### API Key Authentication

For external integrations, OpenFrame supports API key authentication:

```java
@Component
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {
    
    private final ApiKeyService apiKeyService;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                   HttpServletResponse response, 
                                   FilterChain filterChain) throws ServletException, IOException {
        
        String apiKey = extractApiKey(request);
        if (apiKey != null) {
            try {
                ApiKey validatedKey = apiKeyService.validateApiKey(apiKey);
                
                // Set up security context
                Authentication auth = new ApiKeyAuthentication(validatedKey);
                SecurityContextHolder.getContext().setAuthentication(auth);
                
                // Log API key usage for audit
                auditService.logApiKeyUsage(validatedKey.getId(), request);
                
            } catch (InvalidApiKeyException e) {
                response.setStatus(HttpStatus.UNAUTHORIZED.value());
                response.getWriter().write("{\"error\":\"Invalid API key\"}");
                return;
            }
        }
        
        filterChain.doFilter(request, response);
    }
    
    private String extractApiKey(HttpServletRequest request) {
        String header = request.getHeader("X-API-Key");
        if (header != null && header.startsWith("ak_")) {
            return header;
        }
        return null;
    }
}
```

### Authorization Patterns

#### Role-Based Access Control (RBAC)

OpenFrame implements hierarchical roles:

```java
public enum Role {
    SUPER_ADMIN(1000),      // Platform administrator
    TENANT_ADMIN(800),      // Tenant administrator  
    ORGANIZATION_ADMIN(600), // Organization administrator
    DEVICE_MANAGER(400),    // Device management
    TECHNICIAN(200),        // Read/limited write access
    VIEWER(100);            // Read-only access
    
    private final int level;
    
    Role(int level) {
        this.level = level;
    }
    
    public boolean hasPermission(Role requiredRole) {
        return this.level >= requiredRole.level;
    }
}
```

#### Method-Level Security

```java
@RestController
@RequestMapping("/api/v1/organizations")
@PreAuthorize("hasRole('TENANT_ADMIN')")
public class OrganizationController {
    
    @GetMapping
    @PreAuthorize("hasPermission(#tenantId, 'Organization', 'READ')")
    public ResponseEntity<List<Organization>> getOrganizations(
            @AuthenticationPrincipal AuthPrincipal principal) {
        
        String tenantId = principal.getTenantId();
        List<Organization> organizations = organizationService.findByTenant(tenantId);
        return ResponseEntity.ok(organizations);
    }
    
    @PostMapping
    @PreAuthorize("hasPermission(#request.tenantId, 'Organization', 'CREATE')")
    public ResponseEntity<Organization> createOrganization(
            @Valid @RequestBody CreateOrganizationRequest request,
            @AuthenticationPrincipal AuthPrincipal principal) {
        
        Organization created = organizationService.create(request, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasPermission(#id, 'Organization', 'DELETE')")
    public ResponseEntity<Void> deleteOrganization(@PathVariable String id) {
        organizationService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
```

#### GraphQL Security

```java
@DgsComponent
public class DeviceDataFetcher {
    
    @DgsQuery
    @PreAuthorize("hasRole('DEVICE_MANAGER')")
    public List<Device> devices(@Argument DeviceFilterInput filter,
                               DgsDataFetchingEnvironment dfe) {
        
        AuthPrincipal principal = getPrincipal(dfe);
        
        // Enforce tenant isolation
        filter.setTenantId(principal.getTenantId());
        
        // Apply additional filters based on user permissions
        if (!principal.hasRole(Role.ORGANIZATION_ADMIN)) {
            // Limit to user's assigned organizations
            filter.setOrganizationIds(principal.getAccessibleOrganizations());
        }
        
        return deviceService.findDevices(filter);
    }
    
    @DgsMutation
    @PreAuthorize("hasRole('DEVICE_MANAGER')")
    public Device updateDeviceStatus(@Argument String deviceId, 
                                    @Argument DeviceStatus status,
                                    DgsDataFetchingEnvironment dfe) {
        
        AuthPrincipal principal = getPrincipal(dfe);
        
        // Verify device belongs to user's tenant
        Device device = deviceService.findById(deviceId);
        if (!device.getTenantId().equals(principal.getTenantId())) {
            throw new AccessDeniedException("Device not found");
        }
        
        return deviceService.updateStatus(deviceId, status, principal);
    }
}
```

## Data Security

### Encryption at Rest

OpenFrame encrypts sensitive data using AES-256 encryption:

```java
@Component
public class EncryptionService {
    
    private final AESUtil aesUtil;
    
    @Value("${openframe.encryption.key}")
    private String encryptionKey;
    
    public String encrypt(String plaintext) {
        try {
            SecretKey key = new SecretKeySpec(
                Base64.getDecoder().decode(encryptionKey), 
                "AES"
            );
            
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key);
            
            byte[] iv = cipher.getIV();
            byte[] encryptedData = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            
            // Combine IV and encrypted data
            ByteBuffer buffer = ByteBuffer.allocate(iv.length + encryptedData.length);
            buffer.put(iv);
            buffer.put(encryptedData);
            
            return Base64.getEncoder().encodeToString(buffer.array());
            
        } catch (Exception e) {
            throw new EncryptionException("Failed to encrypt data", e);
        }
    }
    
    public String decrypt(String encryptedData) {
        try {
            SecretKey key = new SecretKeySpec(
                Base64.getDecoder().decode(encryptionKey), 
                "AES"
            );
            
            byte[] decodedData = Base64.getDecoder().decode(encryptedData);
            ByteBuffer buffer = ByteBuffer.wrap(decodedData);
            
            // Extract IV and encrypted content
            byte[] iv = new byte[12]; // GCM IV length
            buffer.get(iv);
            byte[] encrypted = new byte[buffer.remaining()];
            buffer.get(encrypted);
            
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, iv));
            
            byte[] decryptedData = cipher.doFinal(encrypted);
            return new String(decryptedData, StandardCharsets.UTF_8);
            
        } catch (Exception e) {
            throw new EncryptionException("Failed to decrypt data", e);
        }
    }
}
```

### Field-Level Encryption

For highly sensitive data like API keys and passwords:

```java
@Document(collection = "api_keys")
public class ApiKey {
    
    @Id
    private String id;
    
    private String name;
    
    @Encrypted // Custom annotation for field-level encryption
    private String keyValue;
    
    @Encrypted
    private String description;
    
    private String tenantId;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime lastUsedAt;
    
    // Getters and setters...
}

// Custom encryption converter
@Component
public class FieldEncryptionConverter implements Converter<String, String> {
    
    @Autowired
    private EncryptionService encryptionService;
    
    @Override
    public String convert(String source) {
        return encryptionService.encrypt(source);
    }
}
```

### Database Security

#### MongoDB Security Configuration

```yaml
# MongoDB security settings
spring:
  data:
    mongodb:
      uri: mongodb://openframe_user:${MONGODB_PASSWORD}@localhost:27017/openframe?authSource=admin
      auto-index-creation: false
      
# Enable MongoDB field-level encryption
mongodb:
  encryption:
    enabled: true
    key-vault-namespace: "encryption.__keyVault"
    kms-providers:
      local:
        key: ${MONGODB_ENCRYPTION_KEY}
```

#### Connection Security

```java
@Configuration
public class MongoSecurityConfig extends AbstractMongoClientConfiguration {
    
    @Override
    protected void configureClientSettings(MongoClientSettings.Builder builder) {
        // Enable TLS
        builder.applyToSslSettings(ssl -> 
            ssl.enabled(true)
               .invalidHostNameAllowed(false));
        
        // Connection security
        builder.applyToConnectionPoolSettings(pool ->
            pool.maxSize(20)
                .minSize(5)
                .maxConnectionIdleTime(30, TimeUnit.SECONDS));
        
        // Enable authentication
        builder.credential(MongoCredential.createCredential(
            username, database, password.toCharArray()));
    }
}
```

## Input Validation and Sanitization

### Request Validation

OpenFrame uses Bean Validation (JSR-303) with custom validators:

```java
public class CreateOrganizationRequest {
    
    @NotBlank(message = "Organization name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    @Pattern(regexp = "^[a-zA-Z0-9\\s\\-_.]+$", message = "Invalid characters in name")
    private String name;
    
    @TenantDomain // Custom validation annotation
    private String domain;
    
    @ValidEmail
    private String adminEmail;
    
    @ValidPhone(optional = true)
    private String phone;
    
    // Getters and setters...
}

// Custom validator for tenant domains
@Component
public class TenantDomainValidator implements ConstraintValidator<TenantDomain, String> {
    
    @Override
    public boolean isValid(String domain, ConstraintValidatorContext context) {
        if (domain == null || domain.trim().isEmpty()) {
            return false;
        }
        
        // Check domain format
        if (!domain.matches("^[a-zA-Z0-9][a-zA-Z0-9\\-]*[a-zA-Z0-9]$")) {
            return false;
        }
        
        // Check for reserved domains
        List<String> reserved = Arrays.asList("admin", "api", "www", "mail");
        if (reserved.contains(domain.toLowerCase())) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Domain name is reserved")
                   .addConstraintViolation();
            return false;
        }
        
        return true;
    }
}
```

### SQL Injection Prevention

While OpenFrame primarily uses MongoDB, SQL injection principles apply to query construction:

```java
@Repository
public class DeviceRepositoryImpl implements CustomDeviceRepository {
    
    @Autowired
    private MongoTemplate mongoTemplate;
    
    public List<Device> findDevicesWithFilters(DeviceFilterCriteria criteria) {
        Query query = new Query();
        
        // Safe parameterized queries
        if (criteria.getOrganizationId() != null) {
            query.addCriteria(Criteria.where("organizationId")
                .is(criteria.getOrganizationId()));
        }
        
        if (criteria.getStatus() != null) {
            query.addCriteria(Criteria.where("status")
                .is(criteria.getStatus()));
        }
        
        if (criteria.getNamePattern() != null) {
            // Use regex with proper escaping
            String escapedPattern = Pattern.quote(criteria.getNamePattern());
            query.addCriteria(Criteria.where("name")
                .regex(escapedPattern, "i"));
        }
        
        return mongoTemplate.find(query, Device.class);
    }
}
```

### XSS Prevention

For any HTML content handling:

```java
@Component
public class HtmlSanitizer {
    
    private final PolicyFactory policy;
    
    public HtmlSanitizer() {
        this.policy = Sanitizers.FORMATTING
            .and(Sanitizers.LINKS)
            .and(Sanitizers.BLOCKS);
    }
    
    public String sanitize(String untrustedHtml) {
        if (untrustedHtml == null) {
            return null;
        }
        return policy.sanitize(untrustedHtml);
    }
}
```

## Network Security

### TLS Configuration

OpenFrame enforces TLS 1.3 for all external communications:

```java
@Configuration
@EnableWebSecurity
public class TlsSecurityConfig {
    
    @Bean
    public TomcatServletWebServerFactory tomcatFactory() {
        TomcatServletWebServerFactory factory = new TomcatServletWebServerFactory();
        
        factory.addConnectorCustomizers(connector -> {
            connector.setScheme("https");
            connector.setSecure(true);
            
            // Configure SSL protocol
            Http11NioProtocol protocol = (Http11NioProtocol) connector.getProtocolHandler();
            protocol.setSSLEnabled(true);
            protocol.setSslProtocol("TLSv1.3");
            
            // Security headers
            protocol.setSSLHonorCipherOrder(true);
            protocol.setCiphers("TLS_AES_256_GCM_SHA384,TLS_AES_128_GCM_SHA256");
        });
        
        return factory;
    }
}
```

### CORS Configuration

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("https://*.openframe.local", "https://*.flamingo.run")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
        
        // GraphQL endpoint
        registry.addMapping("/graphql")
                .allowedOriginPatterns("https://*.openframe.local")
                .allowedMethods("POST", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
```

### Rate Limiting

OpenFrame implements distributed rate limiting:

```java
@Component
public class RateLimitService {
    
    private final RedisTemplate<String, Object> redisTemplate;
    
    public boolean isRateLimited(String identifier, RateLimitConfig config) {
        String key = "rate_limit:" + identifier;
        
        try {
            // Use Redis sliding window rate limiting
            Long currentRequests = redisTemplate.opsForValue()
                .increment(key, 1);
            
            if (currentRequests == 1) {
                // Set expiration on first request
                redisTemplate.expire(key, config.getWindow(), TimeUnit.SECONDS);
            }
            
            return currentRequests > config.getMaxRequests();
            
        } catch (Exception e) {
            // Fail open - allow request if Redis is unavailable
            log.warn("Rate limiting check failed", e);
            return false;
        }
    }
}
```

## Security Testing

### Unit Test Security

```java
@SpringBootTest
@AutoConfigureTestDatabase
@WithMockUser(username = "test-user", roles = {"DEVICE_MANAGER"})
public class DeviceControllerSecurityTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Test
    public void testGetDevices_WithValidRole_ShouldSucceed() throws Exception {
        mockMvc.perform(get("/api/v1/devices")
                .header("Authorization", "Bearer " + generateValidJwt()))
                .andExpect(status().isOk());
    }
    
    @Test
    @WithMockUser(roles = {"VIEWER"}) 
    public void testCreateDevice_WithInsufficientRole_ShouldFail() throws Exception {
        CreateDeviceRequest request = new CreateDeviceRequest();
        request.setName("Test Device");
        
        mockMvc.perform(post("/api/v1/devices")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }
    
    @Test
    public void testGetDevices_WithoutAuthentication_ShouldFail() throws Exception {
        mockMvc.perform(get("/api/v1/devices"))
                .andExpect(status().isUnauthorized());
    }
    
    private String generateValidJwt() {
        return Jwts.builder()
                .setSubject("test-user")
                .claim("tenant_id", "test-tenant")
                .claim("roles", Arrays.asList("DEVICE_MANAGER"))
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 3600000))
                .signWith(testSigningKey, SignatureAlgorithm.RS256)
                .compact();
    }
}
```

### Integration Security Testing

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
public class AuthenticationIntegrationTest {
    
    @Container
    static MongoDBContainer mongodb = new MongoDBContainer("mongo:7.0");
    
    @Container  
    static GenericContainer<?> redis = new GenericContainer<>("redis:7.2-alpine")
            .withExposedPorts(6379);
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    public void testFullAuthenticationFlow() {
        // Test tenant registration
        TenantRegistrationRequest registration = new TenantRegistrationRequest();
        registration.setOrganizationName("Test Corp");
        registration.setDomain("test-corp");
        registration.setAdminEmail("admin@test.com");
        
        ResponseEntity<TenantRegistrationResponse> regResponse = 
            restTemplate.postForEntity("/auth/register", registration, 
                                     TenantRegistrationResponse.class);
        
        assertThat(regResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        
        // Test login
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("admin@test.com");
        loginRequest.setPassword("password123");
        loginRequest.setTenantDomain("test-corp");
        
        ResponseEntity<TokenResponse> loginResponse = 
            restTemplate.postForEntity("/auth/login", loginRequest, TokenResponse.class);
        
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(loginResponse.getBody().getAccessToken()).isNotNull();
        
        // Test API access with token
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(loginResponse.getBody().getAccessToken());
        HttpEntity<String> entity = new HttpEntity<>(headers);
        
        ResponseEntity<String> apiResponse = restTemplate.exchange(
            "/api/v1/organizations", HttpMethod.GET, entity, String.class);
        
        assertThat(apiResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
    }
}
```

### Security Vulnerability Testing

```java
@Component
public class SecurityVulnerabilityTests {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Test
    public void testSqlInjectionPrevention() throws Exception {
        // Test with malicious input
        String maliciousInput = "'; DROP TABLE devices; --";
        
        mockMvc.perform(get("/api/v1/devices")
                .param("search", maliciousInput))
                .andExpect(status().isOk())
                .andExpect(content().string(not(containsString("error"))));
    }
    
    @Test
    public void testXssPrevention() throws Exception {
        String xssPayload = "<script>alert('XSS')</script>";
        
        CreateOrganizationRequest request = new CreateOrganizationRequest();
        request.setName(xssPayload);
        
        mockMvc.perform(post("/api/v1/organizations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
    
    @Test
    public void testCsrfProtection() throws Exception {
        // Test that CSRF token is required for state-changing operations
        mockMvc.perform(post("/api/v1/organizations")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isForbidden());
    }
}
```

## Common Security Vulnerabilities and Mitigations

### OWASP Top 10 Coverage

| Vulnerability | OpenFrame Mitigation |
|---------------|---------------------|
| **A01: Broken Access Control** | Role-based access control, resource-level permissions, tenant isolation |
| **A02: Cryptographic Failures** | AES-256 encryption, TLS 1.3, proper key management |
| **A03: Injection** | Parameterized queries, input validation, output encoding |
| **A04: Insecure Design** | Security by design, threat modeling, secure coding standards |
| **A05: Security Misconfiguration** | Secure defaults, configuration validation, environment isolation |
| **A06: Vulnerable Components** | Dependency scanning, regular updates, vulnerability monitoring |
| **A07: Authentication Failures** | Multi-factor authentication, session management, password policies |
| **A08: Software Integrity** | Code signing, secure CI/CD pipeline, dependency verification |
| **A09: Logging Failures** | Comprehensive audit logging, log monitoring, incident response |
| **A10: Server-Side Request Forgery** | Request validation, allowlist-based URL filtering |

### Security Headers

OpenFrame implements comprehensive security headers:

```java
@Configuration
public class SecurityHeadersConfig {
    
    @Bean
    public FilterRegistrationBean<SecurityHeadersFilter> securityHeadersFilter() {
        FilterRegistrationBean<SecurityHeadersFilter> registration = 
            new FilterRegistrationBean<>();
        registration.setFilter(new SecurityHeadersFilter());
        registration.addUrlPatterns("/*");
        return registration;
    }
}

public class SecurityHeadersFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) throws IOException, ServletException {
        
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        // Content Security Policy
        httpResponse.setHeader("Content-Security-Policy", 
            "default-src 'self'; script-src 'self' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline'; img-src 'self' data:");
        
        // Additional security headers
        httpResponse.setHeader("X-Content-Type-Options", "nosniff");
        httpResponse.setHeader("X-Frame-Options", "DENY");
        httpResponse.setHeader("X-XSS-Protection", "1; mode=block");
        httpResponse.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        httpResponse.setHeader("Permissions-Policy", 
            "camera=(), microphone=(), geolocation=()");
        
        // HSTS (HTTP Strict Transport Security)
        httpResponse.setHeader("Strict-Transport-Security", 
            "max-age=31536000; includeSubDomains; preload");
        
        chain.doFilter(request, response);
    }
}
```

## Environment Variables and Secrets Management

### Secure Configuration

```bash
# Environment-specific security settings
export OPENFRAME_JWT_SIGNING_KEY=$(cat /etc/secrets/jwt-private-key.pem)
export MONGODB_PASSWORD=$(cat /etc/secrets/mongodb-password)
export ENCRYPTION_KEY=$(openssl rand -base64 32)
export ANTHROPIC_API_KEY=$(cat /etc/secrets/anthropic-api-key)

# Security-related flags
export OPENFRAME_SECURITY_STRICT_MODE=true
export OPENFRAME_AUDIT_ENABLED=true
export OPENFRAME_RATE_LIMIT_ENABLED=true
```

### Secrets in Production

For production deployments, use proper secrets management:

```yaml
# Kubernetes secrets example
apiVersion: v1
kind: Secret
metadata:
  name: openframe-secrets
type: Opaque
data:
  jwt-private-key: <base64-encoded-private-key>
  mongodb-password: <base64-encoded-password>
  encryption-key: <base64-encoded-encryption-key>
  anthropic-api-key: <base64-encoded-api-key>

---
# Use secrets in deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openframe-api
spec:
  template:
    spec:
      containers:
      - name: api
        image: openframe/api:latest
        env:
        - name: MONGODB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: openframe-secrets
              key: mongodb-password
        - name: ENCRYPTION_KEY
          valueFrom:
            secretKeyRef:
              name: openframe-secrets
              key: encryption-key
```

## Code Review Checklist

### Security Review Points

When reviewing code, check for:

**Authentication & Authorization:**
- [ ] Proper authentication checks on all endpoints
- [ ] Authorization logic correctly implemented
- [ ] Tenant isolation enforced
- [ ] Role-based access control applied

**Data Handling:**
- [ ] Input validation on all user inputs
- [ ] Output encoding where appropriate
- [ ] Sensitive data encrypted
- [ ] Database queries parameterized

**Error Handling:**
- [ ] Sensitive information not exposed in error messages
- [ ] Proper error logging for security events
- [ ] Graceful handling of authentication failures

**Configuration:**
- [ ] No hardcoded secrets or passwords
- [ ] Secure defaults used
- [ ] Environment-specific security settings

## Security Monitoring and Incident Response

### Audit Logging

OpenFrame logs all security-relevant events:

```java
@Component
public class SecurityAuditService {
    
    private final Logger auditLogger = LoggerFactory.getLogger("SECURITY_AUDIT");
    
    public void logAuthenticationAttempt(String userId, String tenantId, 
                                        boolean successful, String ipAddress) {
        auditLogger.info("AUTH_ATTEMPT: user={}, tenant={}, success={}, ip={}", 
                        userId, tenantId, successful, ipAddress);
    }
    
    public void logAuthorizationFailure(String userId, String resource, 
                                       String action, String reason) {
        auditLogger.warn("AUTHZ_FAILURE: user={}, resource={}, action={}, reason={}", 
                        userId, resource, action, reason);
    }
    
    public void logSensitiveDataAccess(String userId, String dataType, String recordId) {
        auditLogger.info("DATA_ACCESS: user={}, type={}, record={}", 
                        userId, dataType, recordId);
    }
}
```

## Security Best Practices Summary

### Development Guidelines

1. **Follow Secure Coding Standards**
   - Always validate input at boundaries
   - Use parameterized queries
   - Implement proper error handling
   - Apply principle of least privilege

2. **Authentication & Authorization**
   - Never trust client-side validation
   - Implement defense in depth
   - Use strong authentication mechanisms
   - Enforce authorization at every level

3. **Data Protection**
   - Encrypt sensitive data at rest and in transit
   - Use proper key management
   - Implement data minimization
   - Follow data retention policies

4. **Testing & Monitoring**
   - Include security tests in CI/CD pipeline
   - Monitor for security events
   - Implement incident response procedures
   - Regular security assessments

## Further Resources

- **OWASP**: https://owasp.org/
- **Spring Security Documentation**: https://spring.io/projects/spring-security
- **Java Cryptography Architecture**: https://docs.oracle.com/javase/8/docs/technotes/guides/security/crypto/CryptoSpec.html

## Questions or Security Concerns?

Security discussions happen in the OpenMSP Slack community:
- **Join**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
- **Website**: https://www.openmsp.ai/

For security vulnerabilities, please follow responsible disclosure practices and report issues in the appropriate security channels.

Remember: Security is everyone's responsibility. When in doubt, choose the more secure option and ask for guidance from the community! 🔒