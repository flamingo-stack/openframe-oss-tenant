# OpenFrame RBAC Complete Architecture

## 📋 Executive Summary

OpenFrame implements a comprehensive Role-Based Access Control (RBAC) system designed for multi-tenant SaaS environments with MSP (Managed Service Provider) hierarchy. The architecture uses Spring Authorization Server for authentication and JWT tokens stored in HttpOnly cookies for secure, scalable authorization.

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Frontend Applications                         │
│              (Web UI, Mobile App, CLI Tools, APIs)                  │
└─────────────────┬───────────────────────────────────────────────────┘
                  │ OAuth2/OIDC Flows + Cookie-based JWT
┌─────────────────▼───────────────────────────────────────────────────┐
│                    API Gateway                                      │
│                (openframe-gateway)                                  │
│               Cookie → JWT Extraction                               │
└─────────┬─────────────────┬─────────────────┬─────────────────┬─────┘
          │                 │                 │                 │
┌─────────▼─────────┐ ┌─────▼─────┐ ┌─────────▼─────┐ ┌─────────▼─────┐
│ openframe-auth-   │ │ openframe-│ │ openframe-    │ │ openframe-    │
│ server            │ │ api       │ │ management    │ │ stream        │
│ (Authentication)  │ │ (Business)│ │ (RBAC Admin)  │ │ (Processing)  │
└───────────────────┘ └───────────┘ └───────────────┘ └───────────────┘
          │                 │                 │                 │
          └─────────────────▼─────────────────▼─────────────────┘
                     ┌─────────────────────────────┐
                     │      Shared Database        │
                     │   (MongoDB with RBAC)       │
                     └─────────────────────────────┘
```

## 🎯 Core RBAC Principles

### Multi-Tenant Hierarchy
```
Platform Owner (OpenFrame Team)
├── SUPER_ADMIN
│
MSP Organizations  
├── MSP_ADMIN               # Full MSP management
├── MSP_OPERATOR           # MSP technical operations
│
Client Organizations
├── CLIENT_ADMIN           # Client company administration  
├── CLIENT_OPERATOR        # Client technical operations
│
Departments
├── DEPARTMENT_ADMIN       # Department management
└── DEPARTMENT_USER        # Regular user access
```

### Permission Model
Based on the original diagram, permissions flow through:
- **User** → Has roles within organization context
- **Privilege** → Role-based permissions (CRUD operations)
- **Scope** → Client and module access restrictions
- **Resources** → Specific modules (RMM, MDM, Admin, etc.)

## 📊 Data Models

### Core RBAC Entities

#### User Entity
```java
@Document(collection = "users")
@Data
@Builder
public class User {
    @Id
    private String id;
    
    @Field("email")
    @Indexed(unique = true)
    private String email;
    
    @Field("first_name")
    private String firstName;
    
    @Field("last_name") 
    private String lastName;
    
    @Field("organization_id")
    @Indexed
    private String organizationId;
    
    @Field("status")
    @Enumerated(EnumType.STRING)
    private UserStatus status; // ACTIVE, INACTIVE, SUSPENDED
    
    @Field("created_at")
    private LocalDateTime createdAt;
    
    @Field("updated_at")
    private LocalDateTime updatedAt;
    
    // Relationships
    @DBRef
    private Set<UserRole> roles = new HashSet<>();
    
    @DBRef
    private Set<UserClientAccess> clientAccess = new HashSet<>();
    
    @DBRef 
    private Set<UserModuleAccess> moduleAccess = new HashSet<>();
}
```

#### Organization Entity (Multi-tenant)
```java
@Document(collection = "organizations")
@Data
@Builder
public class Organization {
    @Id
    private String id;
    
    @Field("name")
    private String name;
    
    @Field("domain")
    @Indexed(unique = true)
    private String domain;
    
    @Field("organization_type")
    @Enumerated(EnumType.STRING)
    private OrganizationType type; // PLATFORM, MSP, CLIENT, DEPARTMENT
    
    @Field("parent_organization_id")
    @Indexed
    private String parentOrganizationId; // Hierarchical structure
    
    @Field("settings")
    private Map<String, Object> settings;
    
    @Field("status")
    @Enumerated(EnumType.STRING)
    private OrganizationStatus status; // ACTIVE, INACTIVE, SUSPENDED
    
    @Field("created_at")
    private LocalDateTime createdAt;
    
    @Field("updated_at")
    private LocalDateTime updatedAt;
}
```

#### Role & Permission System
```java
@Document(collection = "roles")
@Data
@Builder
public class Role {
    @Id
    private String id;
    
    @Field("name")
    @Indexed
    private String name; // MSP_ADMIN, CLIENT_ADMIN, etc.
    
    @Field("display_name")
    private String displayName;
    
    @Field("description")
    private String description;
    
    @Field("organization_type")
    @Enumerated(EnumType.STRING)
    private OrganizationType organizationType; // Which org types can have this role
    
    @Field("permissions")
    private Set<String> permissions;
    
    @Field("is_system_role")
    private Boolean isSystemRole = false; // Cannot be deleted
    
    @Field("created_at")
    private LocalDateTime createdAt;
}

@Document(collection = "permissions")
@Data
@Builder
public class Permission {
    @Id
    private String id;
    
    @Field("name")
    @Indexed(unique = true)
    private String name; // user:create, rmm:full, client:read
    
    @Field("resource")
    private String resource; // user, device, client, etc.
    
    @Field("action")
    private String action; // create, read, update, delete, full
    
    @Field("description")
    private String description;
    
    @Field("module")
    @Enumerated(EnumType.STRING)
    private ModuleType module; // RMM, MDM, ADMIN, etc.
}
```

#### Client & Module Access Control
```java
@Document(collection = "user_client_access")
@Data
@Builder
public class UserClientAccess {
    @Id
    private String id;
    
    @Field("user_id")
    @Indexed
    private String userId;
    
    @Field("client_organization_id")
    @Indexed
    private String clientOrganizationId;
    
    @Field("access_level")
    @Enumerated(EnumType.STRING)
    private AccessLevel accessLevel; // FULL, READ, NONE
    
    @Field("granted_by")
    private String grantedBy; // Who granted this access
    
    @Field("granted_at")
    private LocalDateTime grantedAt;
    
    @Field("expires_at")
    private LocalDateTime expiresAt; // Optional expiration
}

@Document(collection = "user_module_access") 
@Data
@Builder
public class UserModuleAccess {
    @Id
    private String id;
    
    @Field("user_id")
    @Indexed
    private String userId;
    
    @Field("module")
    @Enumerated(EnumType.STRING)
    private ModuleType module; // RMM, MDM, ADMIN, etc.
    
    @Field("access_level")
    @Enumerated(EnumType.STRING)
    private AccessLevel accessLevel; // FULL, READ, NONE
    
    @Field("client_organization_id")
    @Indexed 
    private String clientOrganizationId; // Module access per client
    
    @Field("granted_by")
    private String grantedBy;
    
    @Field("granted_at") 
    private LocalDateTime grantedAt;
}
```

#### Enums
```java
public enum OrganizationType {
    PLATFORM,      // OpenFrame platform owner
    MSP,           // Managed Service Provider
    CLIENT,        // MSP's client company  
    DEPARTMENT     // Department within client
}

public enum ModuleType {
    RMM,           // Remote Monitoring & Management
    MDM,           // Mobile Device Management
    ADMIN,         // Administration module
    ANALYTICS,     // Analytics & Reporting
    BILLING,       // Billing & Invoicing
    SUPPORT        // Support & Ticketing
}

public enum AccessLevel {
    NONE,          // No access
    READ,          // View only
    WRITE,         // Create/Update  
    FULL           // Full CRUD + Admin
}

public enum UserStatus {
    ACTIVE,        // Active user
    INACTIVE,      // Temporarily disabled
    SUSPENDED,     // Suspended due to violations
    PENDING        // Awaiting activation
}
```

## 🔑 Token Model & Authentication

### JWT Token Structure (Current Implementation)
```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "openframe-key-2024"
  },
  "payload": {
    "iss": "https://auth.openframe.com",
    "sub": "user-123",
    "aud": ["openframe-api", "openframe-management"],
    "exp": 1640995200,
    "iat": 1640908800,
    "email": "admin@msp-company.com",
    "organization_id": "msp-001",
    "organization_type": "MSP",
    
    // RBAC Claims
    "roles": ["MSP_ADMIN", "RMM_ADMIN"],
    "permissions": [
      "user:create", "user:read", "user:update", "user:delete",
      "rmm:full", "mdm:full", "admin:full",
      "client:create", "client:manage"
    ],
    
    // Client Access Mapping
    "client_access": {
      "client-001": "FULL",
      "client-002": "FULL", 
      "client-003": "READ"
    },
    
    // Module Access Mapping
    "module_access": {
      "RMM": "FULL",
      "MDM": "FULL",
      "ADMIN": "FULL",
      "ANALYTICS": "READ"
    },
    
    // Accessible clients list (for UI filtering)
    "accessible_clients": ["client-001", "client-002", "client-003"]
  },
  "signature": "..."
}
```

### Cookie Storage Strategy (Current - KEEP IT!)
```http
HTTP Response Headers:
Set-Cookie: access_token=eyJ...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900
Set-Cookie: refresh_token=eyJ...; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh; Max-Age=604800
```

**Why cookies are better than localStorage:**
- ✅ **XSS Protection**: HttpOnly prevents JavaScript access
- ✅ **CSRF Protection**: SameSite=Strict prevents cross-site requests  
- ✅ **Automatic Management**: Browser handles sending/receiving
- ✅ **Secure Transport**: Secure flag ensures HTTPS only

## 🔐 Spring Authorization Server Integration

### Service Architecture

#### openframe-auth-server (Port 8090)
**Responsibility**: Authentication + JWT Token Generation

```java
@Configuration
@EnableAuthorizationServer
public class AuthorizationServerConfig {
    
    @Bean
    public RegisteredClientRepository registeredClientRepository() {
        RegisteredClient webClient = RegisteredClient.withId("openframe-web")
            .clientId("openframe-web-client")
            .clientAuthenticationMethod(ClientAuthenticationMethod.NONE) // PKCE
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
            .redirectUri("https://app.openframe.com/auth/callback")
            .scope(OidcScopes.OPENID)
            .scope(OidcScopes.PROFILE)
            .scope("rmm:read")
            .scope("rmm:write")
            .scope("mdm:read") 
            .scope("mdm:write")
            .scope("admin:read")
            .scope("admin:write")
            .clientSettings(ClientSettings.builder()
                .requireAuthorizationConsent(false)
                .requireProofKey(true) // PKCE required
                .build())
            .tokenSettings(TokenSettings.builder()
                .accessTokenTimeToLive(Duration.ofMinutes(15))
                .refreshTokenTimeToLive(Duration.ofDays(7))
                .reuseRefreshTokens(false)
                .build())
            .build();
        
        return new InMemoryRegisteredClientRepository(webClient);
    }
    
    @Bean
    public OAuth2TokenCustomizer<JwtEncodingContext> jwtCustomizer() {
        return context -> {
            if (context.getTokenType() == OAuth2TokenType.ACCESS_TOKEN) {
                // Add RBAC claims to JWT
                Authentication principal = context.getPrincipal();
                OpenFramePrincipal userDetails = (OpenFramePrincipal) principal.getPrincipal();
                
                context.getClaims()
                    .claim("organization_id", userDetails.getOrganizationId())
                    .claim("organization_type", userDetails.getOrganizationType())
                    .claim("roles", userDetails.getRoles())
                    .claim("permissions", userDetails.getPermissions())
                    .claim("client_access", userDetails.getClientAccess())
                    .claim("module_access", userDetails.getModuleAccess())
                    .claim("accessible_clients", userDetails.getAccessibleClients());
            }
        };
    }
}
```

#### Custom Cookie Token Endpoint
```java
@RestController
public class CookieTokenController {
    
    private final OAuth2AuthorizationService authorizationService;
    private final CookieService cookieService;
    
    @PostMapping("/oauth2/token")
    public ResponseEntity<Map<String, Object>> token(
            @RequestParam Map<String, String> parameters,
            HttpServletRequest request,
            HttpServletResponse response) {
        
        // Standard OAuth2 token exchange
        OAuth2AccessTokenResponse tokenResponse = performTokenExchange(parameters);
        
        // Set HttpOnly cookies instead of returning tokens in body
        cookieService.setAccessTokenCookie(
            tokenResponse.getAccessToken().getTokenValue(), 
            response
        );
        cookieService.setRefreshTokenCookie(
            tokenResponse.getRefreshToken().getTokenValue(),
            response  
        );
        
        // Return success without sensitive data
        return ResponseEntity.ok(Map.of(
            "token_type", "Bearer",
            "expires_in", tokenResponse.getAccessToken().getExpiresAt(),
            "scope", tokenResponse.getAccessToken().getScopes()
        ));
    }
}
```

### openframe-management (Port 8081) 
**Responsibility**: RBAC Administration

```java
@RestController
@RequestMapping("/api/rbac")
public class RBACManagementController {
    
    private final UserManagementService userService;
    private final RoleManagementService roleService;
    private final OrganizationService organizationService;
    
    // User Management
    @PostMapping("/users")
    @PreAuthorize("hasPermission(#request.organizationId, 'USER', 'CREATE')")
    public ResponseEntity<UserDto> createUser(@RequestBody CreateUserRequest request) {
        return ResponseEntity.ok(userService.createUser(request));
    }
    
    @GetMapping("/users")
    @PreAuthorize("hasPermission(null, 'USER', 'READ')")
    public ResponseEntity<Page<UserDto>> getUsers(
            @RequestParam(required = false) String organizationId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal OpenFramePrincipal principal) {
        
        return ResponseEntity.ok(userService.getUsers(
            organizationId, principal, PageRequest.of(page, size)));
    }
    
    // Role Management  
    @PostMapping("/roles")
    @PreAuthorize("hasRole('MSP_ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<RoleDto> createRole(@RequestBody CreateRoleRequest request) {
        return ResponseEntity.ok(roleService.createRole(request));
    }
    
    // Client Access Management
    @PostMapping("/users/{userId}/client-access")
    @PreAuthorize("hasPermission(#userId, 'USER', 'UPDATE')")
    public ResponseEntity<Void> grantClientAccess(
            @PathVariable String userId,
            @RequestBody GrantClientAccessRequest request) {
        
        userService.grantClientAccess(userId, request);
        return ResponseEntity.ok().build();
    }
    
    // Module Access Management
    @PostMapping("/users/{userId}/module-access") 
    @PreAuthorize("hasPermission(#userId, 'USER', 'UPDATE')")
    public ResponseEntity<Void> grantModuleAccess(
            @PathVariable String userId,
            @RequestBody GrantModuleAccessRequest request) {
        
        userService.grantModuleAccess(userId, request);
        return ResponseEntity.ok().build();
    }
}
```

## 🛡️ Resource Server Security Configuration

### Gateway Security (openframe-gateway)
```java
@Configuration
@EnableWebFluxSecurity  
public class GatewaySecurityConfig {
    
    @Bean
    public SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
            .csrf().disable()
            .authorizeExchange(exchanges -> exchanges
                // Public endpoints
                .pathMatchers("/oauth2/**", "/login", "/.well-known/**").permitAll()
                .pathMatchers("/actuator/health").permitAll()
                
                // Authenticated endpoints
                .pathMatchers("/api/**").authenticated()
                .anyExchange().authenticated()
            )
            .addFilterAt(cookieToJwtFilter(), SecurityWebFiltersOrder.AUTHENTICATION)
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtDecoder(jwtDecoder())
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
            )
            .build();
    }
    
    @Bean
    public WebFilter cookieToJwtFilter() {
        return new CookieToJwtFilter(cookieService, jwtDecoder());
    }
}

@Component
public class CookieToJwtFilter implements WebFilter {
    
    private final CookieService cookieService;
    private final ReactiveJwtDecoder jwtDecoder;
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String jwt = cookieService.getAccessTokenFromCookies(exchange);
        
        if (jwt != null) {
            ServerHttpRequest modifiedRequest = exchange.getRequest().mutate()
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt)
                .build();
            
            return chain.filter(exchange.mutate().request(modifiedRequest).build());
        }
        
        return chain.filter(exchange);
    }
}
```

### Business Service Security (openframe-api, etc.)
```java
@Configuration
@EnableWebSecurity
@EnableGlobalMethodSecurity(prePostEnabled = true)
public class ResourceServerConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) {
        return http
            .csrf().disable()
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .decoder(jwtDecoder())
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
            )
            .build();
    }
    
    @Bean
    public Converter<Jwt, OpenFramePrincipal> jwtAuthenticationConverter() {
        return jwt -> OpenFramePrincipal.builder()
            .userId(jwt.getSubject())
            .email(jwt.getClaimAsString("email"))
            .organizationId(jwt.getClaimAsString("organization_id"))
            .organizationType(OrganizationType.valueOf(jwt.getClaimAsString("organization_type")))
            .roles(new HashSet<>(jwt.getClaimAsStringList("roles")))
            .permissions(new HashSet<>(jwt.getClaimAsStringList("permissions")))
            .clientAccess(jwt.getClaimAsMap("client_access"))
            .moduleAccess(jwt.getClaimAsMap("module_access"))
            .accessibleClients(new HashSet<>(jwt.getClaimAsStringList("accessible_clients")))
            .authenticated(true)
            .build();
    }
}
```

## 🎯 Authorization Patterns

### Method-Level Security Annotations
```java
// Standard Spring Security roles
@PreAuthorize("hasRole('MSP_ADMIN')")
public void manageMSPSettings() { }

// Custom permission checks  
@PreAuthorize("hasPermission(#deviceId, 'DEVICE', 'UPDATE')")
public Device updateDevice(String deviceId, DeviceUpdateRequest request) { }

// Client access validation
@RequireClientAccess
@PostMapping("/clients/{clientId}/devices")
public DeviceDto createDevice(@PathVariable String clientId, @RequestBody DeviceRequest request) { }

// Module access validation  
@RequireModuleAccess(module = ModuleType.RMM, accessLevel = AccessLevel.FULL)
@PostMapping("/rmm/deploy-script")
public ScriptDeploymentDto deployScript(@RequestBody ScriptRequest request) { }

// Combined authorization
@RequireClientAccess
@RequireModuleAccess(module = ModuleType.MDM, accessLevel = AccessLevel.READ)
@GetMapping("/clients/{clientId}/mdm/devices")
public List<MobileDeviceDto> getMobileDevices(@PathVariable String clientId) { }
```

### Custom Authorization Annotations
```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("@clientAccessValidator.hasAccess(#clientId, authentication)")
public @interface RequireClientAccess {
}

@Target(ElementType.METHOD) 
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("@moduleAccessValidator.hasAccess(module, accessLevel, authentication)")
public @interface RequireModuleAccess {
    ModuleType module();
    AccessLevel accessLevel() default AccessLevel.READ;
}

@Component
public class ClientAccessValidator {
    
    public boolean hasAccess(String clientId, Authentication auth) {
        OpenFramePrincipal principal = (OpenFramePrincipal) auth.getPrincipal();
        
        // Check if user has access to this client
        return principal.getAccessibleClients().contains(clientId) &&
               !AccessLevel.NONE.equals(principal.getClientAccess().get(clientId));
    }
}

@Component
public class ModuleAccessValidator {
    
    public boolean hasAccess(ModuleType module, AccessLevel requiredLevel, Authentication auth) {
        OpenFramePrincipal principal = (OpenFramePrincipal) auth.getPrincipal();
        
        AccessLevel userLevel = principal.getModuleAccess().get(module.name());
        if (userLevel == null) return false;
        
        // Check if user's access level is sufficient
        return isAccessLevelSufficient(userLevel, requiredLevel);
    }
    
    private boolean isAccessLevelSufficient(AccessLevel userLevel, AccessLevel requiredLevel) {
        return switch (requiredLevel) {
            case READ -> userLevel != AccessLevel.NONE;
            case WRITE -> userLevel == AccessLevel.WRITE || userLevel == AccessLevel.FULL;
            case FULL -> userLevel == AccessLevel.FULL;
            default -> false;
        };
    }
}
```

## 🚀 Real-World Usage Examples

### Scenario 1: MSP Admin Creating Client User
```java
// MSP Admin (user: msp-admin@company.com)
// JWT Claims:
{
  "sub": "msp-admin-123",
  "organization_id": "msp-001", 
  "organization_type": "MSP",
  "roles": ["MSP_ADMIN"],
  "permissions": ["user:create", "client:manage"],
  "client_access": {
    "client-001": "FULL",
    "client-002": "FULL"
  }
}

// Request: Create user for client-001
POST /api/rbac/users
{
  "email": "tech@client001.com",
  "firstName": "John",
  "lastName": "Doe", 
  "organizationId": "client-001",
  "roles": ["CLIENT_OPERATOR"],
  "moduleAccess": {
    "RMM": "FULL",
    "MDM": "READ"
  }
}

// Authorization Flow:
1. @PreAuthorize("hasPermission(#request.organizationId, 'USER', 'CREATE')")
2. Check if msp-admin-123 can create users in client-001
3. Verify client-001 is in accessible_clients
4. Verify user:create permission exists
5. ✅ Allow operation
```

### Scenario 2: Client User Accessing RMM Module
```java
// Client Operator (user: tech@client001.com)
// JWT Claims:
{
  "sub": "client-tech-456",
  "organization_id": "client-001",
  "organization_type": "CLIENT", 
  "roles": ["CLIENT_OPERATOR"],
  "permissions": ["rmm:read", "rmm:write", "device:manage"],
  "client_access": {
    "client-001": "FULL"  // Own organization only
  },
  "module_access": {
    "RMM": "FULL",
    "MDM": "READ"
  }
}

// Request: Deploy script to devices
POST /rmm/deploy-script
{
  "scriptId": "script-123",
  "targetDevices": ["dev-001", "dev-002"],
  "clientId": "client-001"
}

// Authorization Flow:
1. @RequireClientAccess - verify access to client-001 ✅
2. @RequireModuleAccess(module=RMM, accessLevel=FULL) - verify RMM:FULL ✅
3. Check device ownership within client-001 ✅
4. ✅ Allow operation
```

### Scenario 3: Cross-Client Access Denied
```java
// Same Client Operator trying to access different client
POST /clients/client-002/devices
{
  "hostname": "new-device",
  "type": "Windows"
}

// Authorization Flow:
1. @RequireClientAccess - check access to client-002
2. principal.getAccessibleClients() = ["client-001"] 
3. client-002 NOT in accessible clients
4. ❌ Access Denied - 403 Forbidden
```

## 📈 Performance & Scalability

### Caching Strategy
```java
@Configuration
@EnableCaching
public class RBACCacheConfig {
    
    @Bean
    public CacheManager cacheManager() {
        RedisCacheManager.Builder builder = RedisCacheManager
            .RedisCacheManagerBuilder
            .fromConnectionFactory(redisConnectionFactory())
            .cacheDefaults(cacheConfiguration());
        
        return builder.build();
    }
    
    @Bean
    public RedisCacheConfiguration cacheConfiguration() {
        return RedisCacheConfiguration.defaultCacheConfig()
            .entryTtl(Duration.ofMinutes(30)) // Cache RBAC data for 30 minutes
            .serializeKeysWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new StringRedisSerializer()))
            .serializeValuesWith(RedisSerializationContext.SerializationPair
                .fromSerializer(new GenericJackson2JsonRedisSerializer()));
    }
}

@Service
public class RBACService {
    
    @Cacheable(value = "user-rbac", key = "#userId")
    public UserRBACData getUserRBACData(String userId) {
        // Heavy database queries cached
        return buildUserRBACData(userId);
    }
    
    @CacheEvict(value = "user-rbac", key = "#userId")
    public void invalidateUserRBAC(String userId) {
        // Called when user permissions change
    }
}
```

### Event-Driven Permission Updates
```java
@Component
public class RBACEventHandler {
    
    @EventListener
    @Async
    public void handleUserRoleChanged(UserRoleChangedEvent event) {
        // Invalidate user's RBAC cache
        cacheManager.getCache("user-rbac").evict(event.getUserId());
        
        // Send real-time update to user's active sessions
        webSocketService.sendToUser(event.getUserId(), new PermissionUpdateNotification());
        
        // Audit log
        auditService.logEvent(AuditEventType.PERMISSION_CHANGED, event);
    }
    
    @EventListener
    @Async 
    public void handleClientAccessGranted(ClientAccessGrantedEvent event) {
        // Invalidate affected user caches
        event.getUserIds().forEach(userId -> 
            cacheManager.getCache("user-rbac").evict(userId));
    }
}
```

## 🔍 Monitoring & Audit

### Audit Logging
```java
@Aspect
@Component
public class RBACauditAspect {
    
    @Around("@annotation(requireClientAccess)")
    public Object auditClientAccess(ProceedingJoinPoint joinPoint, RequireClientAccess requireClientAccess) {
        String methodName = joinPoint.getSignature().getName();
        Object[] args = joinPoint.getArgs();
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        OpenFramePrincipal principal = (OpenFramePrincipal) auth.getPrincipal();
        
        try {
            Object result = joinPoint.proceed();
            
            // Log successful access
            auditService.logSuccess(AuditEvent.builder()
                .userId(principal.getUserId())
                .action("CLIENT_ACCESS")
                .resource(extractClientId(args))
                .method(methodName)
                .timestamp(LocalDateTime.now())
                .build());
                
            return result;
        } catch (AccessDeniedException e) {
            // Log access denied
            auditService.logFailure(AuditEvent.builder()
                .userId(principal.getUserId())
                .action("CLIENT_ACCESS_DENIED") 
                .resource(extractClientId(args))
                .method(methodName)
                .reason(e.getMessage())
                .timestamp(LocalDateTime.now())
                .build());
                
            throw e;
        }
    }
}
```

## 📋 Summary

This RBAC architecture provides:

✅ **Multi-tenant SaaS support** with MSP → Client → Department hierarchy  
✅ **Granular permissions** at user, client, and module levels  
✅ **Industry-standard security** with Spring Authorization Server + JWT  
✅ **Secure token storage** with HttpOnly cookies (XSS protection)  
✅ **High performance** with Redis caching and efficient database queries  
✅ **Real-time updates** with event-driven architecture  
✅ **Comprehensive audit** for compliance and monitoring  
✅ **Scalable architecture** ready for enterprise deployment  

The system perfectly translates your original permission flow diagram into a production-ready Spring Boot RBAC implementation that scales with your SaaS platform growth. 