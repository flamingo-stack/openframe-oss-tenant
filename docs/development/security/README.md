# Security Best Practices

OpenFrame implements comprehensive security measures across all layers of the platform. This guide covers security architecture, authentication patterns, authorization models, and best practices for secure development.

## Security Architecture Overview

OpenFrame employs a defense-in-depth security strategy with multiple layers of protection:

```mermaid
graph TB
    subgraph "Security Layers"
        EDGE[Edge Security]
        APP[Application Security]
        DATA[Data Security]
        INFRA[Infrastructure Security]
    end
    
    subgraph "Edge Security"
        TLS[TLS 1.3 Encryption]
        WAF[Web Application Firewall]
        DDOS[DDoS Protection]
        RATE[Rate Limiting]
    end
    
    subgraph "Application Security"
        OAUTH[OAuth2/OIDC]
        JWT[JWT Tokens]
        RBAC[Role-Based Access Control]
        CSRF[CSRF Protection]
    end
    
    subgraph "Data Security"
        ENCRYPT[Encryption at Rest]
        TRANSIT[Encryption in Transit]
        TENANT[Tenant Isolation]
        AUDIT[Audit Logging]
    end
    
    subgraph "Infrastructure Security"
        NETWORK[Network Segmentation]
        SECRETS[Secret Management]
        CONTAINER[Container Security]
        MONITOR[Security Monitoring]
    end
```

## Authentication Architecture

### OAuth2 Authorization Code Flow with PKCE

OpenFrame uses OAuth2 with PKCE (Proof Key for Code Exchange) for secure authentication:

```mermaid
sequenceDiagram
    participant User as User Browser
    participant Frontend as Frontend App
    participant Auth as Authorization Server
    participant API as API Service
    
    User->>Frontend: Access Protected Resource
    Frontend->>Frontend: Generate code_verifier & code_challenge
    Frontend->>Auth: Authorization Request + code_challenge
    Auth->>User: Login Page
    User->>Auth: Username/Password or SSO
    Auth->>Frontend: Authorization Code
    Frontend->>Auth: Token Exchange + code_verifier
    Auth->>Auth: Verify code_challenge
    Auth-->>Frontend: JWT Access Token + Refresh Token
    
    Frontend->>API: API Request + Bearer JWT
    API->>API: Validate JWT & Extract Claims
    API-->>Frontend: Protected Resource
```

### Multi-Tenant JWT Architecture

Each tenant has isolated JWT signing keys:

```java
@Component
public class TenantKeyService {
    
    private final Map<String, RSAKeyPair> tenantKeys = new ConcurrentHashMap<>();
    
    public RSAKeyPair getKeyPairForTenant(String tenantId) {
        return tenantKeys.computeIfAbsent(tenantId, this::generateKeyPair);
    }
    
    private RSAKeyPair generateKeyPair(String tenantId) {
        try {
            KeyPairGenerator keyGenerator = KeyPairGenerator.getInstance("RSA");
            keyGenerator.initialize(2048);
            KeyPair keyPair = keyGenerator.generateKeyPair();
            
            return new RSAKeyPair(
                (RSAPublicKey) keyPair.getPublic(),
                (RSAPrivateKey) keyPair.getPrivate()
            );
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Failed to generate RSA key pair for tenant: " + tenantId, e);
        }
    }
}
```

### JWT Token Structure

OpenFrame JWTs include tenant-specific claims:

```json
{
  "iss": "https://auth.openframe.ai/tenant-123",
  "sub": "user-456",
  "aud": ["openframe-api", "openframe-gateway"],
  "exp": 1640995200,
  "iat": 1640991600,
  "tenant_id": "tenant-123",
  "user_id": "user-456", 
  "email": "user@example.com",
  "roles": ["TECHNICIAN", "DEVICE_ADMIN"],
  "permissions": [
    "device:read",
    "device:write",
    "organization:read"
  ],
  "features": {
    "ai_enabled": true,
    "advanced_reporting": false
  }
}
```

## Authorization Model

### Role-Based Access Control (RBAC)

OpenFrame implements a hierarchical RBAC system:

```mermaid
graph TD
    subgraph "Roles Hierarchy"
        OWNER[Owner]
        ADMIN[Administrator]
        MANAGER[Manager] 
        TECH[Technician]
        VIEWER[Viewer]
        
        OWNER --> ADMIN
        ADMIN --> MANAGER
        MANAGER --> TECH
        TECH --> VIEWER
    end
    
    subgraph "Permissions"
        DEVICE_ALL[device:*]
        ORG_WRITE[organization:write]
        ORG_READ[organization:read]
        USER_WRITE[user:write]
        USER_READ[user:read]
        
        OWNER --> DEVICE_ALL
        OWNER --> ORG_WRITE
        OWNER --> USER_WRITE
        
        ADMIN --> DEVICE_ALL
        ADMIN --> ORG_READ
        ADMIN --> USER_READ
        
        MANAGER --> DEVICE_ALL
        MANAGER --> ORG_READ
        
        TECH --> DEVICE_READ[device:read]
        TECH --> DEVICE_EXECUTE[device:execute]
        
        VIEWER --> DEVICE_READ
        VIEWER --> ORG_READ
    end
```

### Permission-Based Authorization

```java
@PreAuthorize("hasPermission('device:write', #deviceId)")
@PatchMapping("/devices/{deviceId}")
public ResponseEntity<Device> updateDevice(
        @PathVariable String deviceId,
        @RequestBody UpdateDeviceRequest request,
        @AuthenticationPrincipal AuthPrincipal principal) {
    
    Device device = deviceService.updateDevice(deviceId, request, principal.getTenantId());
    return ResponseEntity.ok(device);
}

@Component
public class DevicePermissionEvaluator implements PermissionEvaluator {
    
    @Override
    public boolean hasPermission(Authentication authentication, Object targetId, Object permission) {
        AuthPrincipal principal = (AuthPrincipal) authentication.getPrincipal();
        
        if ("device:write".equals(permission)) {
            // Check if user has device write permission for this tenant
            return principal.hasPermission("device:write") && 
                   deviceBelongsToTenant((String) targetId, principal.getTenantId());
        }
        
        return false;
    }
}
```

## Data Security

### Encryption at Rest

Sensitive data is encrypted before storage:

```java
@Component
public class EncryptionService {
    
    private final AESUtil aesUtil;
    
    @Value("${openframe.encryption.key}")
    private String encryptionKey;
    
    public String encrypt(String plaintext) {
        try {
            return aesUtil.encrypt(plaintext, encryptionKey);
        } catch (Exception e) {
            throw new EncryptionException("Failed to encrypt data", e);
        }
    }
    
    public String decrypt(String ciphertext) {
        try {
            return aesUtil.decrypt(ciphertext, encryptionKey);
        } catch (Exception e) {
            throw new EncryptionException("Failed to decrypt data", e);
        }
    }
}

@Document(collection = "tool_credentials")
public class ToolCredentials {
    
    @Id
    private String id;
    
    private String tenantId;
    
    @Encrypted  // Custom annotation for automatic encryption
    private String apiKey;
    
    @Encrypted
    private String password;
    
    private String username; // Not encrypted - can be searched
}
```

### Database Security Configuration

```yaml
# MongoDB security configuration
spring:
  data:
    mongodb:
      uri: mongodb://openframe_user:${MONGODB_PASSWORD}@localhost:27017/openframe?authSource=admin&ssl=true&sslInvalidHostNameAllowed=false
      
# Redis security configuration  
spring:
  redis:
    password: ${REDIS_PASSWORD}
    ssl: true
    timeout: 2000ms
```

### Tenant Data Isolation

All database queries include tenant isolation:

```java
@Repository
public class DeviceRepositoryImpl implements CustomDeviceRepository {
    
    @Override
    public List<Device> findByTenantId(String tenantId) {
        Query query = new Query()
            .addCriteria(Criteria.where("tenantId").is(tenantId));
        return mongoTemplate.find(query, Device.class);
    }
    
    @Override
    public Device findByIdAndTenantId(String deviceId, String tenantId) {
        Query query = new Query()
            .addCriteria(Criteria.where("id").is(deviceId))
            .addCriteria(Criteria.where("tenantId").is(tenantId));
            
        Device device = mongoTemplate.findOne(query, Device.class);
        if (device == null) {
            throw new DeviceNotFoundException("Device not found: " + deviceId);
        }
        return device;
    }
}
```

## Input Validation & Sanitization

### Request Validation

```java
@RestController
@Validated
public class OrganizationController {
    
    @PostMapping("/organizations")
    public ResponseEntity<Organization> createOrganization(
            @Valid @RequestBody CreateOrganizationRequest request,
            @AuthenticationPrincipal AuthPrincipal principal) {
        
        Organization organization = organizationService.createOrganization(request, principal.getTenantId());
        return ResponseEntity.ok(organization);
    }
}

public class CreateOrganizationRequest {
    
    @NotBlank(message = "Organization name is required")
    @Size(min = 2, max = 100, message = "Organization name must be between 2 and 100 characters")
    @Pattern(regexp = "^[a-zA-Z0-9\\s\\-_.]+$", message = "Organization name contains invalid characters")
    private String name;
    
    @Email(message = "Invalid email format")
    @NotBlank(message = "Email is required")
    private String contactEmail;
    
    @ValidPhoneNumber  // Custom validator
    private String phoneNumber;
    
    @Valid
    private Address address;
}
```

### Custom Validators

```java
@Target({ElementType.FIELD})
@Retention(RetentionPolicy.RUNTIME)  
@Constraint(validatedBy = TenantDomainValidator.class)
public @interface TenantDomain {
    String message() default "Invalid tenant domain";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class TenantDomainValidator implements ConstraintValidator<TenantDomain, String> {
    
    @Override
    public boolean isValid(String domain, ConstraintValidatorContext context) {
        if (domain == null || domain.trim().isEmpty()) {
            return false;
        }
        
        // Validate domain format
        Pattern pattern = Pattern.compile("^[a-z0-9]([a-z0-9\\-]{0,61}[a-z0-9])?$");
        if (!pattern.matcher(domain).matches()) {
            return false;
        }
        
        // Check domain availability (could check against database)
        return !isReservedDomain(domain);
    }
    
    private boolean isReservedDomain(String domain) {
        List<String> reserved = Arrays.asList("admin", "api", "www", "mail", "ftp");
        return reserved.contains(domain.toLowerCase());
    }
}
```

## API Security

### Rate Limiting

```java
@Component
public class RateLimitService {
    
    private final RedisTemplate<String, String> redisTemplate;
    
    public boolean isRateLimitExceeded(String key, int maxRequests, Duration window) {
        String redisKey = "rate_limit:" + key;
        String countStr = redisTemplate.opsForValue().get(redisKey);
        
        int currentCount = countStr != null ? Integer.parseInt(countStr) : 0;
        
        if (currentCount >= maxRequests) {
            return true;
        }
        
        // Increment counter with expiration
        redisTemplate.opsForValue().increment(redisKey);
        redisTemplate.expire(redisKey, window);
        
        return false;
    }
}

@RestController
public class ApiController {
    
    @RateLimited(maxRequests = 100, window = "1m")
    @GetMapping("/api/devices")
    public ResponseEntity<List<Device>> getDevices() {
        // API implementation
    }
}
```

### CSRF Protection

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .ignoringRequestMatchers("/api/public/**")
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
            )
            .build();
    }
}
```

## Secrets Management

### Environment-Based Secret Management

```java
@ConfigurationProperties(prefix = "openframe.integrations")
@Component
public class IntegrationProperties {
    
    private Fleet fleet = new Fleet();
    private TacticalRmm tacticalRmm = new TacticalRmm();
    
    public static class Fleet {
        private String apiUrl;
        
        @Value("${FLEET_API_TOKEN:}")
        private String apiToken;
        
        // Getters and setters
    }
    
    public static class TacticalRmm {
        private String serverUrl;
        
        @Value("${TACTICAL_RMM_API_KEY:}")
        private String apiKey;
        
        // Getters and setters  
    }
}
```

### Production Secret Management

```yaml
# Example for AWS Secrets Manager integration
openframe:
  secrets:
    provider: aws-secrets-manager
    region: us-east-1
    secrets:
      - name: openframe/database/mongodb
        keys:
          - username
          - password
      - name: openframe/integrations/fleet
        keys:
          - api-token
      - name: openframe/jwt/signing-keys
        keys:
          - private-key
          - public-key
```

## Security Monitoring & Auditing

### Audit Logging

```java
@Aspect
@Component
public class AuditLoggingAspect {
    
    private final AuditLogService auditLogService;
    
    @AfterReturning(
        pointcut = "@annotation(auditable)",
        returning = "result"
    )
    public void logAuditEvent(JoinPoint joinPoint, Auditable auditable, Object result) {
        HttpServletRequest request = RequestContextHolder.currentRequestAttributes();
        AuthPrincipal principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        
        AuditLogEntry entry = AuditLogEntry.builder()
            .tenantId(principal.getTenantId())
            .userId(principal.getUserId())
            .action(auditable.action())
            .resource(auditable.resource())
            .resourceId(extractResourceId(joinPoint.getArgs()))
            .ipAddress(request.getRemoteAddr())
            .userAgent(request.getHeader("User-Agent"))
            .timestamp(Instant.now())
            .success(true)
            .build();
            
        auditLogService.log(entry);
    }
}

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Auditable {
    String action();
    String resource();
}

// Usage
@Auditable(action = "DELETE", resource = "ORGANIZATION")
@DeleteMapping("/organizations/{id}")
public ResponseEntity<Void> deleteOrganization(@PathVariable String id) {
    organizationService.deleteOrganization(id);
    return ResponseEntity.noContent().build();
}
```

### Security Event Detection

```java
@Component
public class SecurityEventDetector {
    
    @EventListener
    public void handleAuthenticationFailure(AuthenticationFailureEvent event) {
        String username = event.getAuthentication().getName();
        String remoteAddress = getRemoteAddress();
        
        SecurityEvent securityEvent = SecurityEvent.builder()
            .type(SecurityEventType.AUTHENTICATION_FAILURE)
            .username(username)
            .ipAddress(remoteAddress)
            .timestamp(Instant.now())
            .details("Failed login attempt")
            .build();
            
        securityEventService.recordEvent(securityEvent);
        
        // Check for brute force attacks
        checkForBruteForceAttack(username, remoteAddress);
    }
    
    private void checkForBruteForceAttack(String username, String ipAddress) {
        // Count failed attempts in last 15 minutes
        int failedAttempts = securityEventService.countFailedAttempts(
            username, ipAddress, Duration.ofMinutes(15)
        );
        
        if (failedAttempts >= 5) {
            // Trigger security alert
            SecurityAlert alert = SecurityAlert.builder()
                .type(AlertType.BRUTE_FORCE_ATTACK)
                .username(username)
                .ipAddress(ipAddress)
                .severity(Severity.HIGH)
                .build();
                
            alertService.triggerAlert(alert);
            
            // Temporarily block IP address
            ipBlockingService.blockIp(ipAddress, Duration.ofHours(1));
        }
    }
}
```

## Container & Infrastructure Security

### Docker Security Best Practices

```dockerfile
# Use specific, non-root base image
FROM openjdk:21-jre-slim

# Create non-root user
RUN groupadd -r openframe && useradd --no-log-init -r -g openframe openframe

# Copy application with proper ownership
COPY --chown=openframe:openframe target/openframe-api.jar /app/openframe-api.jar

# Switch to non-root user
USER openframe

# Expose only necessary port
EXPOSE 8080

# Use exec form to ensure proper signal handling
ENTRYPOINT ["java", "-jar", "/app/openframe-api.jar"]

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1
```

### Kubernetes Security Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openframe-api
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
        runAsGroup: 10001
        fsGroup: 10001
      containers:
      - name: openframe-api
        image: openframe/api:latest
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          capabilities:
            drop:
            - ALL
        resources:
          limits:
            memory: "2Gi"
            cpu: "1000m"
          requests:
            memory: "1Gi" 
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
```

## Security Testing

### Unit Tests for Security

```java
@WebMvcTest(OrganizationController.class)
class OrganizationControllerSecurityTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Test
    @WithMockUser(roles = "VIEWER")
    void shouldDenyCreateOrganizationForViewer() throws Exception {
        CreateOrganizationRequest request = new CreateOrganizationRequest();
        request.setName("Test Organization");
        
        mockMvc.perform(post("/api/organizations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }
    
    @Test
    @WithMockUser(authorities = "organization:write")
    void shouldAllowCreateOrganizationWithPermission() throws Exception {
        CreateOrganizationRequest request = new CreateOrganizationRequest();
        request.setName("Test Organization");
        
        mockMvc.perform(post("/api/organizations")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }
    
    @Test
    void shouldRequireAuthentication() throws Exception {
        mockMvc.perform(get("/api/organizations"))
                .andExpect(status().isUnauthorized());
    }
    
    @Test
    @WithMockUser
    void shouldValidateTenantIsolation() throws Exception {
        // Test that users can only access their own tenant data
        mockMvc.perform(get("/api/organizations/other-tenant-org-id"))
                .andExpect(status().isNotFound());
    }
}
```

### Security Integration Tests

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
    "spring.profiles.active=test",
    "openframe.security.enabled=true"
})
class SecurityIntegrationTest {
    
    @Test
    void shouldEnforceRateLimit() {
        // Make requests exceeding rate limit
        for (int i = 0; i < 101; i++) {
            ResponseEntity<String> response = restTemplate.getForEntity("/api/devices", String.class);
            if (i < 100) {
                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
            } else {
                assertThat(response.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
            }
        }
    }
    
    @Test
    void shouldValidateJwtSignature() {
        // Test with invalid JWT signature
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth("invalid.jwt.token");
        
        HttpEntity<String> entity = new HttpEntity<>(headers);
        ResponseEntity<String> response = restTemplate.exchange(
            "/api/devices", HttpMethod.GET, entity, String.class);
            
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
```

## Security Checklist for Development

### Code Review Security Checklist

- [ ] **Authentication**: All endpoints require valid authentication
- [ ] **Authorization**: Proper permission checks are implemented
- [ ] **Input Validation**: All user input is validated and sanitized
- [ ] **Tenant Isolation**: Data access is properly scoped to tenant
- [ ] **SQL Injection**: Parameterized queries are used
- [ ] **XSS Prevention**: Output encoding is applied
- [ ] **CSRF Protection**: CSRF tokens are required for state-changing operations
- [ ] **Secrets**: No hardcoded secrets in code
- [ ] **Error Handling**: Error messages don't leak sensitive information
- [ ] **Logging**: Security events are properly logged

### Production Deployment Security

- [ ] **HTTPS Only**: All communication uses TLS 1.3
- [ ] **Security Headers**: Proper security headers are configured
- [ ] **Secrets Management**: Production secrets use external secret store
- [ ] **Database Security**: Database access is restricted and encrypted
- [ ] **Network Security**: Proper network segmentation is implemented
- [ ] **Monitoring**: Security monitoring and alerting is configured
- [ ] **Backup Security**: Backups are encrypted and access-controlled
- [ ] **Incident Response**: Security incident response plan is ready

### Regular Security Maintenance

- [ ] **Dependency Updates**: Regular dependency vulnerability scans
- [ ] **Security Testing**: Automated security testing in CI/CD
- [ ] **Penetration Testing**: Regular third-party security assessments
- [ ] **Access Reviews**: Regular review of user access and permissions
- [ ] **Certificate Management**: SSL certificate rotation and monitoring
- [ ] **Security Training**: Developer security awareness training

## Incident Response

### Security Incident Response Plan

```java
@Component
public class SecurityIncidentHandler {
    
    @EventListener
    @Async
    public void handleSecurityIncident(SecurityIncidentEvent event) {
        // 1. Immediate containment
        containThreat(event);
        
        // 2. Notify security team
        notifySecurityTeam(event);
        
        // 3. Gather evidence
        gatherEvidence(event);
        
        // 4. Document incident
        documentIncident(event);
    }
    
    private void containThreat(SecurityIncidentEvent event) {
        switch (event.getType()) {
            case BRUTE_FORCE_ATTACK:
                ipBlockingService.blockIp(event.getSourceIp(), Duration.ofHours(24));
                break;
            case ACCOUNT_COMPROMISE:
                userService.suspendUser(event.getUserId());
                sessionService.invalidateAllUserSessions(event.getUserId());
                break;
            case DATA_BREACH:
                // Implement emergency data protection measures
                enableEmergencyMode();
                break;
        }
    }
}
```

## Security Resources & References

### Security Standards Compliance

OpenFrame follows these security standards:
- **OWASP Top 10** - Web application security risks mitigation
- **NIST Cybersecurity Framework** - Comprehensive security guidelines
- **SOC 2 Type 2** - Security, availability, and confidentiality controls
- **ISO 27001** - Information security management standards

### Security Tools Integration

**Static Code Analysis:**
- SonarQube for code quality and security
- OWASP Dependency Check for vulnerable dependencies
- SpotBugs for Java security patterns

**Dynamic Security Testing:**
- OWASP ZAP for web application security testing
- Burp Suite for manual security testing
- Security regression tests in CI/CD pipeline

## Getting Security Help

- **Security Questions**: Use `#security` channel in OpenMSP Slack
- **Security Incidents**: Contact security@openframe.ai immediately
- **OpenMSP Slack**: https://www.openmsp.ai/
- **Join Slack**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA

---

**🔒 Security Implementation Complete!** You now understand OpenFrame's comprehensive security model and best practices for secure development.