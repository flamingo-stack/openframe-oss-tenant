# Security Best Practices

This guide covers security implementation, best practices, and guidelines for developing secure features in OpenFrame OSS Tenant. Security is integrated at every layer of the architecture, from authentication and authorization to data encryption and secure communication.

## Security Architecture Overview

OpenFrame implements a comprehensive security model based on industry best practices and zero-trust principles:

```mermaid
flowchart TB
    subgraph ExternalLayer[External Layer]
        Users[Users/Clients]
        Agents[OpenFrame Agents]
        ThirdParty[Third-party Services]
    end

    subgraph SecurityLayers[Security Layers]
        subgraph EdgeSecurity[Edge Security]
            WAF[Web Application Firewall]
            RateLimiter[Rate Limiting]
            CORS[CORS Policies]
        end

        subgraph Authentication[Authentication Layer]
            OAuth2[OAuth2/OIDC Server]
            JWT[JWT Validation]
            APIKeys[API Key Management]
        end

        subgraph Authorization[Authorization Layer]
            RBAC[Role-Based Access Control]
            TenantIsolation[Tenant Isolation]
            ResourcePermissions[Resource Permissions]
        end

        subgraph DataSecurity[Data Security]
            Encryption[Data Encryption]
            PII[PII Protection]
            AuditLog[Audit Logging]
        end
    end

    subgraph ApplicationServices[Application Services]
        Gateway[Gateway Service]
        API[API Service]
        Auth[Authorization Service]
    end

    ExternalLayer --> SecurityLayers
    SecurityLayers --> ApplicationServices
```

## Authentication and Authorization

### OAuth2/OIDC Implementation

OpenFrame uses Spring Authorization Server to provide OAuth2 and OpenID Connect capabilities:

#### Authorization Server Configuration

**Key Components:**
- **Multi-tenant JWT issuer** - Per-tenant token issuance
- **Dynamic client registration** - Automatic client onboarding
- **Extensible authentication flows** - Support for various login methods
- **Token introspection** - Service-to-service token validation

**Example Authorization Configuration:**

```java
@Configuration
@EnableAuthorizationServer
public class AuthorizationServerConfig {

    @Bean
    @Order(1)
    public SecurityFilterChain authorizationServerSecurityFilterChain(
            HttpSecurity http) throws Exception {
        
        OAuth2AuthorizationServerConfiguration.applyDefaultSecurity(http);
        
        http.getConfigurer(OAuth2AuthorizationServerConfigurer.class)
            .oidc(Customizer.withDefaults()); // Enable OpenID Connect
            
        http
            // Custom tenant-aware authentication
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(
                    new TenantAwareJwtAuthenticationConverter()
                ))
            )
            // Custom authorization endpoint
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(new LoginUrlAuthenticationEntryPoint("/login"))
            );
            
        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder(JWKSource<SecurityContext> jwkSource) {
        return OAuth2AuthorizationServerConfiguration.jwtDecoder(jwkSource);
    }

    @Bean
    public AuthorizationServerSettings authorizationServerSettings() {
        return AuthorizationServerSettings.builder()
            .issuer("http://localhost:9000")
            .authorizationEndpoint("/oauth2/authorize")
            .tokenEndpoint("/oauth2/token")
            .jwkSetEndpoint("/oauth2/jwks")
            .build();
    }
}
```

#### Tenant-Aware JWT Tokens

**JWT Token Structure:**

```json
{
  "iss": "http://localhost:9000",
  "sub": "user123",
  "aud": ["openframe-api", "openframe-external-api"],
  "exp": 1640995200,
  "iat": 1640991600,
  "tenant_id": "acme-corp",
  "tenant_domain": "acme.openframe.local",
  "user_roles": ["ADMIN", "USER"],
  "organization_id": "org456",
  "permissions": ["device:read", "device:write", "user:read"]
}
```

**Custom JWT Authentication Converter:**

```java
@Component
public class TenantAwareJwtAuthenticationConverter 
    implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        // Extract tenant information from JWT
        String tenantId = jwt.getClaimAsString("tenant_id");
        String tenantDomain = jwt.getClaimAsString("tenant_domain");
        List<String> roles = jwt.getClaimAsStringList("user_roles");
        List<String> permissions = jwt.getClaimAsStringList("permissions");
        
        // Create tenant-aware authentication principal
        TenantAuthenticationPrincipal principal = new TenantAuthenticationPrincipal(
            jwt.getSubject(),
            tenantId,
            tenantDomain,
            roles,
            permissions
        );
        
        // Convert roles to Spring Security authorities
        Collection<GrantedAuthority> authorities = roles.stream()
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
            .collect(Collectors.toList());
            
        return new JwtAuthenticationToken(jwt, authorities, principal);
    }
}
```

### API Key Authentication

For service-to-service and external integrations, OpenFrame supports API key authentication:

#### API Key Structure

```text
Format: ak_1a2b3c4d5e6f7890.sk_live_abcdefghijklmnopqrstuvwxyz123456
        ↑                   ↑
        Key ID              Secret Key
```

#### API Key Validation Filter

```java
@Component
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {

    private final ApiKeyValidationService apiKeyService;
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                   HttpServletResponse response,
                                   FilterChain filterChain) throws ServletException, IOException {
        
        String apiKey = extractApiKey(request);
        if (apiKey == null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            // Validate API key and get associated context
            ApiKeyContext context = validateApiKey(apiKey);
            
            // Set tenant context for the request
            TenantContextHolder.setTenantId(context.getTenantId());
            
            // Create authentication token
            ApiKeyAuthenticationToken authentication = 
                new ApiKeyAuthenticationToken(context);
            SecurityContextHolder.getContext().setAuthentication(authentication);
            
        } catch (ApiKeyException e) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.getWriter().write("{\"error\":\"Invalid API key\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private ApiKeyContext validateApiKey(String apiKey) {
        // Check cache first
        String cacheKey = "api_key:" + apiKey;
        ApiKeyContext cached = (ApiKeyContext) redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return cached;
        }

        // Validate against database
        ApiKeyContext context = apiKeyService.validateApiKey(apiKey);
        
        // Cache valid keys for 5 minutes
        redisTemplate.opsForValue().set(cacheKey, context, Duration.ofMinutes(5));
        
        return context;
    }
}
```

### Role-Based Access Control (RBAC)

OpenFrame implements fine-grained RBAC with hierarchical roles:

#### Role Hierarchy

```mermaid
graph TD
    SuperAdmin[SUPER_ADMIN<br/>Platform Administration]
    TenantAdmin[TENANT_ADMIN<br/>Tenant Management]
    OrgAdmin[ORGANIZATION_ADMIN<br/>Organization Management]
    User[USER<br/>Basic Operations]
    Agent[AGENT<br/>Device Agent]
    ReadOnly[READ_ONLY<br/>View Access]

    SuperAdmin --> TenantAdmin
    TenantAdmin --> OrgAdmin
    OrgAdmin --> User
    User --> ReadOnly
```

#### Permission System

**Permission Format**: `resource:action:scope`

Examples:
- `device:read:all` - Read all devices
- `device:write:own` - Write own devices only
- `user:create:organization` - Create users in organization
- `tool:configure:tenant` - Configure tools for tenant

**Method-Level Security:**

```java
@RestController
@RequestMapping("/api/devices")
@PreAuthorize("hasRole('USER')")
public class DeviceController {

    @GetMapping
    @PreAuthorize("hasPermission('device', 'read')")
    public ResponseEntity<List<Device>> getDevices(
            @AuthenticationPrincipal TenantAuthenticationPrincipal principal) {
        
        // Automatically filtered by tenant context
        List<Device> devices = deviceService.getDevicesForTenant(
            principal.getTenantId()
        );
        return ResponseEntity.ok(devices);
    }

    @PostMapping
    @PreAuthorize("hasPermission('device', 'create')")
    public ResponseEntity<Device> createDevice(@RequestBody CreateDeviceRequest request,
            @AuthenticationPrincipal TenantAuthenticationPrincipal principal) {
        
        // Ensure tenant context is applied
        request.setTenantId(principal.getTenantId());
        Device device = deviceService.createDevice(request);
        return ResponseEntity.ok(device);
    }

    @DeleteMapping("/{deviceId}")
    @PreAuthorize("hasPermission(#deviceId, 'device', 'delete')")
    public ResponseEntity<Void> deleteDevice(@PathVariable String deviceId) {
        deviceService.deleteDevice(deviceId);
        return ResponseEntity.noContent().build();
    }
}
```

**Custom Permission Evaluator:**

```java
@Component
public class OpenFramePermissionEvaluator implements PermissionEvaluator {

    private final DeviceService deviceService;
    private final OrganizationService organizationService;

    @Override
    public boolean hasPermission(Authentication authentication, 
                                Object targetDomainObject, 
                                Object permission) {
        
        if (!(authentication.getPrincipal() instanceof TenantAuthenticationPrincipal)) {
            return false;
        }
        
        TenantAuthenticationPrincipal principal = 
            (TenantAuthenticationPrincipal) authentication.getPrincipal();
            
        String permissionString = permission.toString();
        
        // Check explicit permissions
        if (principal.getPermissions().contains(permissionString)) {
            return true;
        }
        
        // Check role-based permissions
        return evaluateRolePermissions(principal, targetDomainObject, permissionString);
    }

    @Override
    public boolean hasPermission(Authentication authentication, 
                                Serializable targetId, 
                                String targetType, 
                                Object permission) {
        
        // Resource-specific permission checking
        switch (targetType) {
            case "device":
                return checkDevicePermission(authentication, targetId, permission.toString());
            case "organization":
                return checkOrganizationPermission(authentication, targetId, permission.toString());
            default:
                return false;
        }
    }

    private boolean checkDevicePermission(Authentication authentication, 
                                        Serializable deviceId, 
                                        String permission) {
        
        TenantAuthenticationPrincipal principal = 
            (TenantAuthenticationPrincipal) authentication.getPrincipal();
            
        // Verify device belongs to the same tenant
        Device device = deviceService.getDevice(deviceId.toString());
        if (device == null || !device.getTenantId().equals(principal.getTenantId())) {
            return false;
        }
        
        // Check specific permissions
        return principal.hasPermission("device:" + permission);
    }
}
```

## Data Encryption and Protection

### Encryption at Rest

#### Database Field-Level Encryption

**Sensitive Data Encryption:**

```java
@Document(collection = "users")
public class User {
    
    @Id
    private String id;
    
    private String tenantId;
    
    @Field("email")
    private String email;
    
    // Encrypted field using custom converter
    @Field("personal_info")
    @Convert(converter = PersonalInfoEncryptionConverter.class)
    private PersonalInfo personalInfo;
    
    @Field("encrypted_fields")
    @Convert(converter = EncryptedFieldsConverter.class)
    private Map<String, String> encryptedFields;
}

@Component
public class PersonalInfoEncryptionConverter implements AttributeConverter<PersonalInfo, String> {

    private final EncryptionService encryptionService;

    @Override
    public String convertToDatabaseColumn(PersonalInfo personalInfo) {
        if (personalInfo == null) {
            return null;
        }
        
        try {
            String json = objectMapper.writeValueAsString(personalInfo);
            return encryptionService.encrypt(json);
        } catch (Exception e) {
            throw new EncryptionException("Failed to encrypt personal info", e);
        }
    }

    @Override
    public PersonalInfo convertToEntityAttribute(String encrypted) {
        if (encrypted == null) {
            return null;
        }
        
        try {
            String json = encryptionService.decrypt(encrypted);
            return objectMapper.readValue(json, PersonalInfo.class);
        } catch (Exception e) {
            throw new EncryptionException("Failed to decrypt personal info", e);
        }
    }
}
```

#### Encryption Service Implementation

```java
@Service
public class EncryptionService {

    private final AESUtil aesUtil;
    private final KeyManagementService keyService;

    @Value("${openframe.security.encryption.algorithm:AES/GCM/NoPadding}")
    private String encryptionAlgorithm;

    public String encrypt(String plaintext) {
        return encrypt(plaintext, getTenantEncryptionKey());
    }

    public String encrypt(String plaintext, String tenantId) {
        SecretKey key = keyService.getTenantKey(tenantId);
        return encrypt(plaintext, key);
    }

    private String encrypt(String plaintext, SecretKey key) {
        try {
            Cipher cipher = Cipher.getInstance(encryptionAlgorithm);
            cipher.init(Cipher.ENCRYPT_MODE, key);
            
            byte[] iv = cipher.getIV();
            byte[] encryptedBytes = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
            
            // Combine IV and encrypted data
            byte[] combined = new byte[iv.length + encryptedBytes.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encryptedBytes, 0, combined, iv.length, encryptedBytes.length);
            
            return Base64.getEncoder().encodeToString(combined);
            
        } catch (Exception e) {
            throw new EncryptionException("Encryption failed", e);
        }
    }

    public String decrypt(String encrypted) {
        return decrypt(encrypted, getTenantEncryptionKey());
    }

    public String decrypt(String encrypted, String tenantId) {
        SecretKey key = keyService.getTenantKey(tenantId);
        return decrypt(encrypted, key);
    }

    private String decrypt(String encrypted, SecretKey key) {
        try {
            byte[] combined = Base64.getDecoder().decode(encrypted);
            
            Cipher cipher = Cipher.getInstance(encryptionAlgorithm);
            
            // Extract IV (first 12 bytes for GCM)
            byte[] iv = new byte[12];
            System.arraycopy(combined, 0, iv, 0, iv.length);
            
            // Extract encrypted data
            byte[] encryptedBytes = new byte[combined.length - iv.length];
            System.arraycopy(combined, iv.length, encryptedBytes, 0, encryptedBytes.length);
            
            // Decrypt
            GCMParameterSpec gcmSpec = new GCMParameterSpec(128, iv);
            cipher.init(Cipher.DECRYPT_MODE, key, gcmSpec);
            byte[] decryptedBytes = cipher.doFinal(encryptedBytes);
            
            return new String(decryptedBytes, StandardCharsets.UTF_8);
            
        } catch (Exception e) {
            throw new EncryptionException("Decryption failed", e);
        }
    }

    private String getTenantEncryptionKey() {
        // Get current tenant from security context
        TenantAuthenticationPrincipal principal = 
            (TenantAuthenticationPrincipal) SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();
                
        return principal.getTenantId();
    }
}
```

### Encryption in Transit

#### TLS Configuration

**Gateway TLS Configuration:**

```yaml
server:
  port: 8761
  ssl:
    enabled: true
    key-store: classpath:keystore.p12
    key-store-password: ${SSL_KEYSTORE_PASSWORD}
    key-store-type: PKCS12
    key-alias: openframe-gateway
  http2:
    enabled: true

# Force HTTPS redirects
management:
  server:
    ssl:
      enabled: true
```

**Service-to-Service mTLS:**

```java
@Configuration
@EnableWebSecurity
public class ServiceSecurityConfig {

    @Bean
    public RestTemplate secureRestTemplate() throws Exception {
        
        // Load client certificate for mTLS
        KeyStore keyStore = KeyStore.getInstance("PKCS12");
        keyStore.load(
            new FileInputStream("client-cert.p12"),
            "password".toCharArray()
        );
        
        // Load trusted CA certificates
        KeyStore trustStore = KeyStore.getInstance("PKCS12");
        trustStore.load(
            new FileInputStream("ca-certs.p12"),
            "password".toCharArray()
        );
        
        // Create SSL context with mTLS
        SSLContext sslContext = SSLContexts.custom()
            .loadKeyMaterial(keyStore, "password".toCharArray())
            .loadTrustMaterial(trustStore, null)
            .build();
        
        // Create HTTP client with SSL context
        HttpClient httpClient = HttpClients.custom()
            .setSSLContext(sslContext)
            .build();
        
        HttpComponentsClientHttpRequestFactory factory = 
            new HttpComponentsClientHttpRequestFactory(httpClient);
            
        return new RestTemplate(factory);
    }
}
```

## Input Validation and Sanitization

### Request Validation

**DTO Validation with Bean Validation:**

```java
@Data
@Validated
public class CreateDeviceRequest {

    @NotBlank(message = "Device name is required")
    @Size(min = 2, max = 100, message = "Device name must be between 2 and 100 characters")
    @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "Device name contains invalid characters")
    private String name;

    @NotBlank(message = "Hostname is required")
    @Size(max = 253, message = "Hostname too long")
    @Pattern(regexp = "^[a-zA-Z0-9]([a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?(\\.[a-zA-Z0-9]([a-zA-Z0-9\\-]{0,61}[a-zA-Z0-9])?)*$")
    private String hostname;

    @NotNull(message = "Device type is required")
    @EnumValidator(enumClass = DeviceType.class, message = "Invalid device type")
    private DeviceType deviceType;

    @Valid
    @NotNull(message = "Configuration is required")
    private DeviceConfiguration configuration;

    @Email(message = "Invalid email format")
    private String contactEmail;

    @JsonIgnore
    private String tenantId; // Set by the service, not by user input

    // Custom validation method
    @AssertTrue(message = "Configuration must be valid for the specified device type")
    public boolean isConfigurationValidForDeviceType() {
        if (configuration == null || deviceType == null) {
            return true; // Let @NotNull handle these
        }
        return configuration.isValidForDeviceType(deviceType);
    }
}

@Target({ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = EnumValidator.EnumValidatorImpl.class)
public @interface EnumValidator {
    String message() default "Invalid enum value";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
    Class<? extends Enum<?>> enumClass();
    
    class EnumValidatorImpl implements ConstraintValidator<EnumValidator, String> {
        private Class<? extends Enum<?>> enumClass;
        
        @Override
        public void initialize(EnumValidator annotation) {
            this.enumClass = annotation.enumClass();
        }
        
        @Override
        public boolean isValid(String value, ConstraintValidatorContext context) {
            if (value == null) {
                return true;
            }
            
            return Arrays.stream(enumClass.getEnumConstants())
                .anyMatch(e -> e.name().equals(value));
        }
    }
}
```

### SQL Injection Prevention

**Safe Database Queries:**

```java
@Repository
public class DeviceRepositoryImpl implements CustomDeviceRepository {

    private final MongoTemplate mongoTemplate;

    @Override
    public List<Device> findDevicesWithFilters(DeviceSearchCriteria criteria, String tenantId) {
        
        // Always include tenant filter
        Criteria baseCriteria = Criteria.where("tenantId").is(tenantId);
        
        if (StringUtils.hasText(criteria.getName())) {
            // Use regex with proper escaping to prevent injection
            String escapedName = Pattern.quote(criteria.getName());
            baseCriteria.and("name").regex(".*" + escapedName + ".*", "i");
        }
        
        if (criteria.getDeviceType() != null) {
            baseCriteria.and("deviceType").is(criteria.getDeviceType());
        }
        
        if (criteria.getStatus() != null) {
            baseCriteria.and("status").is(criteria.getStatus());
        }
        
        // Date range filtering with validation
        if (criteria.getCreatedAfter() != null) {
            baseCriteria.and("createdAt").gte(criteria.getCreatedAfter());
        }
        
        if (criteria.getCreatedBefore() != null) {
            baseCriteria.and("createdAt").lte(criteria.getCreatedBefore());
        }
        
        Query query = new Query(baseCriteria);
        
        // Apply pagination safely
        if (criteria.getLimit() > 0) {
            query.limit(Math.min(criteria.getLimit(), 1000)); // Max 1000 results
        }
        
        if (criteria.getOffset() > 0) {
            query.skip(criteria.getOffset());
        }
        
        // Apply sorting safely
        if (StringUtils.hasText(criteria.getSortBy())) {
            String sortField = sanitizeSortField(criteria.getSortBy());
            Sort.Direction direction = criteria.getSortDirection() == SortDirection.DESC 
                ? Sort.Direction.DESC 
                : Sort.Direction.ASC;
            query.with(Sort.by(direction, sortField));
        }
        
        return mongoTemplate.find(query, Device.class);
    }
    
    private String sanitizeSortField(String sortBy) {
        // Whitelist allowed sort fields
        Set<String> allowedFields = Set.of(
            "name", "createdAt", "updatedAt", "status", "deviceType", "lastSeen"
        );
        
        if (!allowedFields.contains(sortBy)) {
            throw new IllegalArgumentException("Invalid sort field: " + sortBy);
        }
        
        return sortBy;
    }
}
```

## Secure Configuration Management

### Secrets Management

**Application Properties Security:**

```yaml
# application-prod.yml
spring:
  datasource:
    url: mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}
  
  kafka:
    bootstrap-servers: ${KAFKA_BOOTSTRAP_SERVERS}
    security:
      protocol: SASL_SSL
      sasl:
        mechanism: PLAIN
        jaas:
          config: org.apache.kafka.common.security.plain.PlainLoginModule required username="${KAFKA_USERNAME}" password="${KAFKA_PASSWORD}";

openframe:
  security:
    jwt:
      secret: ${JWT_SECRET_KEY}
      issuer: ${JWT_ISSUER_URL}
    encryption:
      master-key: ${ENCRYPTION_MASTER_KEY}
    api-keys:
      signing-secret: ${API_KEY_SIGNING_SECRET}
  
  external-integrations:
    tactical-rmm:
      api-key: ${TACTICAL_RMM_API_KEY}
    fleet-mdm:
      api-key: ${FLEET_MDM_API_KEY}

# Never commit actual secrets!
```

**Secrets Validation at Startup:**

```java
@Component
@Validated
public class SecurityConfigurationValidator implements InitializingBean {

    @Value("${openframe.security.jwt.secret}")
    @NotBlank(message = "JWT secret key must be configured")
    @Size(min = 32, message = "JWT secret key must be at least 32 characters")
    private String jwtSecret;

    @Value("${openframe.security.encryption.master-key}")
    @NotBlank(message = "Encryption master key must be configured")
    @Size(min = 32, message = "Encryption master key must be at least 32 characters")
    private String masterKey;

    @Override
    public void afterPropertiesSet() throws Exception {
        // Additional runtime validation
        if (jwtSecret.equals("changeme") || jwtSecret.equals("default")) {
            throw new IllegalStateException(
                "JWT secret key must be changed from default value in production"
            );
        }
        
        if (masterKey.equals("changeme") || masterKey.equals("default")) {
            throw new IllegalStateException(
                "Encryption master key must be changed from default value in production"
            );
        }
        
        // Validate key strength
        validateKeyStrength(jwtSecret, "JWT secret");
        validateKeyStrength(masterKey, "Encryption master key");
    }

    private void validateKeyStrength(String key, String keyName) {
        // Check for common weak patterns
        if (key.matches("^(.)\\1+$")) { // All same character
            throw new IllegalStateException(keyName + " cannot be all the same character");
        }
        
        if (key.matches("^[a-zA-Z]+$")) { // Only letters
            log.warn("{} contains only letters - consider adding numbers and symbols", keyName);
        }
        
        // Check entropy (simplified)
        Set<Character> uniqueChars = key.chars()
            .mapToObj(c -> (char) c)
            .collect(Collectors.toSet());
            
        if (uniqueChars.size() < 8) {
            log.warn("{} has low character diversity - consider using more varied characters", keyName);
        }
    }
}
```

## Common Security Vulnerabilities and Mitigations

### Cross-Site Request Forgery (CSRF) Protection

```java
@Configuration
@EnableWebSecurity
public class CsrfSecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .ignoringRequestMatchers(
                    "/api/webhook/**",    // Webhooks from external systems
                    "/api/agents/**"      // Agent API endpoints
                )
                .requireCsrfProtectionMatcher(
                    new RegexRequestMatcher("^(?!.*(/api/public/)).*$", null)
                )
            );
            
        return http.build();
    }
}
```

### Cross-Site Scripting (XSS) Prevention

**Output Encoding in Templates:**

```java
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void configureViewResolvers(ViewResolverRegistry registry) {
        // Enable HTML escaping by default
        registry.enableContentNegotiation();
    }

    @Bean
    public HtmlUtils htmlUtils() {
        return new HtmlUtils();
    }
}

// In service layer - sanitize user input
@Service
public class ContentSanitizationService {

    private final PolicyFactory policyFactory;

    public ContentSanitizationService() {
        // Create OWASP Java HTML Sanitizer policy
        this.policyFactory = new HtmlPolicyBuilder()
            .allowElements("p", "br", "strong", "em", "ul", "ol", "li")
            .allowAttributes("class")
                .onElements("p", "div")
            .toFactory();
    }

    public String sanitizeHtml(String input) {
        if (input == null) {
            return null;
        }
        return policyFactory.sanitize(input);
    }

    public String sanitizeForAttribute(String input) {
        if (input == null) {
            return null;
        }
        return HtmlUtils.htmlEscape(input);
    }
}
```

### Security Headers Configuration

```java
@Configuration
public class SecurityHeadersConfig {

    @Bean
    public FilterRegistrationBean<SecurityHeadersFilter> securityHeadersFilter() {
        FilterRegistrationBean<SecurityHeadersFilter> registrationBean = new FilterRegistrationBean<>();
        registrationBean.setFilter(new SecurityHeadersFilter());
        registrationBean.addUrlPatterns("/*");
        registrationBean.setOrder(1);
        return registrationBean;
    }
}

public class SecurityHeadersFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        
        // Content Security Policy
        httpResponse.setHeader("Content-Security-Policy", 
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "connect-src 'self' ws: wss:; " +
            "frame-ancestors 'none';"
        );
        
        // Security headers
        httpResponse.setHeader("X-Content-Type-Options", "nosniff");
        httpResponse.setHeader("X-Frame-Options", "DENY");
        httpResponse.setHeader("X-XSS-Protection", "1; mode=block");
        httpResponse.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
        httpResponse.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
        
        // HSTS (only for HTTPS)
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        if (httpRequest.isSecure()) {
            httpResponse.setHeader("Strict-Transport-Security", 
                "max-age=31536000; includeSubDomains; preload");
        }
        
        chain.doFilter(request, response);
    }
}
```

## Security Testing and Code Review Guidelines

### Security Testing Checklist

**Authentication Testing:**
- [ ] JWT token validation and expiration
- [ ] API key authentication and authorization
- [ ] Session management and timeout
- [ ] Multi-factor authentication (if implemented)
- [ ] Account lockout and brute force protection

**Authorization Testing:**
- [ ] Role-based access control
- [ ] Tenant isolation verification
- [ ] Resource-level permissions
- [ ] Privilege escalation prevention
- [ ] Administrative function protection

**Input Validation Testing:**
- [ ] SQL injection prevention
- [ ] NoSQL injection prevention  
- [ ] Cross-site scripting (XSS) prevention
- [ ] Command injection prevention
- [ ] File upload security
- [ ] Path traversal prevention

**Data Protection Testing:**
- [ ] Encryption at rest validation
- [ ] Encryption in transit verification
- [ ] PII handling compliance
- [ ] Data backup security
- [ ] Secure data deletion

### Code Review Security Checklist

**General Security:**
```java
// ❌ BAD: Hardcoded credentials
private static final String API_KEY = "sk_live_abcdef123456";

// ✅ GOOD: Externalized configuration
@Value("${openframe.external-api.key}")
private String apiKey;
```

```java
// ❌ BAD: SQL injection vulnerability
String query = "SELECT * FROM users WHERE name = '" + userName + "'";

// ✅ GOOD: Parameterized query
Query query = new Query(Criteria.where("name").is(userName));
```

**Authentication & Authorization:**
```java
// ❌ BAD: No authorization check
@GetMapping("/admin/users")
public List<User> getAllUsers() {
    return userService.getAllUsers();
}

// ✅ GOOD: Proper authorization
@GetMapping("/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public List<User> getAllUsers(@AuthenticationPrincipal TenantPrincipal principal) {
    return userService.getUsersForTenant(principal.getTenantId());
}
```

**Data Handling:**
```java
// ❌ BAD: Logging sensitive data
log.info("User login: {} with password: {}", username, password);

// ✅ GOOD: No sensitive data in logs
log.info("User login attempt: {}", username);
```

### Security Incident Response

**Incident Response Plan:**

1. **Detection and Analysis**
   - Monitor security alerts and logs
   - Analyze potential security incidents
   - Determine scope and impact

2. **Containment and Eradication**
   - Isolate affected systems
   - Remove malicious content
   - Patch vulnerabilities

3. **Recovery and Post-Incident**
   - Restore services safely
   - Monitor for recurring issues
   - Document lessons learned

**Emergency Contacts:**
- Security team lead
- System administrators  
- Legal/compliance team
- External security consultants

## Summary

OpenFrame OSS Tenant implements comprehensive security measures across all layers:

- **Multi-layered authentication** with OAuth2/OIDC and API keys
- **Fine-grained authorization** with RBAC and resource-level permissions
- **Tenant isolation** ensuring complete data separation
- **Data encryption** both at rest and in transit
- **Input validation** preventing injection attacks
- **Security headers** protecting against common web vulnerabilities
- **Secure configuration** management with proper secrets handling
- **Comprehensive testing** and code review practices

**Security Best Practices for Developers:**
1. Always validate and sanitize user input
2. Use parameterized queries and safe database operations
3. Implement proper authentication and authorization
4. Never hardcode secrets or credentials
5. Apply the principle of least privilege
6. Use secure communication protocols
7. Implement proper error handling without information disclosure
8. Regular security testing and code reviews
9. Keep dependencies and frameworks updated
10. Follow secure coding guidelines and standards

For security-related questions or to report vulnerabilities, contact the security team through the [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA).