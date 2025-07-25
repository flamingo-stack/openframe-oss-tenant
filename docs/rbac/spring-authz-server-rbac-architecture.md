# OpenFrame RBAC Architecture with Spring Authorization Server

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                            Frontend Apps                             │
│          (Web UI, Mobile App, CLI Tools, Third-party)               │
└─────────────────────┬───────────────────────────────────────────────┘
                      │ OAuth2/OIDC Flows
┌─────────────────────▼───────────────────────────────────────────────┐
│                 Spring Authorization Server                          │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐│
│  │   OAuth2 Flows  │ │  Token Issuance │ │    RBAC Claims         ││
│  │   (PKCE, etc.)  │ │  (JWT + Opaque) │ │    Generation          ││
│  └─────────────────┘ └─────────────────┘ └─────────────────────────┘│
└─────────────────────┬───────────────────────────────────────────────┘
                      │ JWT/Opaque Tokens with RBAC Claims
┌─────────────────────▼───────────────────────────────────────────────┐
│                        API Gateway                                   │
│            (Token Validation + Initial Auth Check)                   │
└─────────────────────┬───────────────────────────────────────────────┘
                      │ Enriched Request Context
┌─────────────────────▼───────────────────────────────────────────────┐
│                     Resource Servers                                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐│
│  │   RMM Service   │ │   MDM Service   │ │    Admin Service       ││
│  │                 │ │                 │ │                        ││
│  └─────────────────┘ └─────────────────┘ └─────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Spring Authorization Server Configuration

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
            .tokenEndpoint(tokenEndpoint -> 
                tokenEndpoint.accessTokenRequestConverter(
                    new RbacTokenRequestConverter())
                .accessTokenResponseHandler(
                    new RbacTokenResponseHandler()))
            .oidc(Customizer.withDefaults());
            
        return http
            .exceptionHandling(exceptions -> 
                exceptions.defaultAuthenticationEntryPointFor(
                    new LoginUrlAuthenticationEntryPoint("/login"),
                    new MediaTypeRequestMatcher(MediaType.TEXT_HTML)))
            .oauth2ResourceServer(resourceServer -> 
                resourceServer.jwt(Customizer.withDefaults()))
            .build();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain defaultSecurityFilterChain(
            HttpSecurity http) throws Exception {
        return http
            .authorizeHttpRequests(authorize -> 
                authorize.anyRequest().authenticated())
            .formLogin(Customizer.withDefaults())
            .build();
    }

    @Bean
    public RegisteredClientRepository registeredClientRepository() {
        // Define OAuth2 clients with different access levels
        RegisteredClient publicClient = RegisteredClient.withId("web-ui")
            .clientId("openframe-web-ui")
            .clientAuthenticationMethod(ClientAuthenticationMethod.NONE)
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
            .redirectUri("https://ui.openframe.com/callback")
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
                .requireProofKey(true)
                .build())
            .build();

        RegisteredClient confidentialClient = RegisteredClient.withId("api-client")
            .clientId("openframe-api-client")
            .clientSecret("{noop}secret")
            .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
            .authorizationGrantType(AuthorizationGrantType.CLIENT_CREDENTIALS)
            .scope("api:full")
            .build();

        return new InMemoryRegisteredClientRepository(publicClient, confidentialClient);
    }
}
```

### 2. RBAC Claims Customization

```java
@Component
public class RbacJwtCustomizer implements OAuth2TokenCustomizer<JwtEncodingContext> {

    private final UserPermissionService userPermissionService;
    private final OrganizationService organizationService;

    @Override
    public void customize(JwtEncodingContext context) {
        Authentication principal = context.getPrincipal();
        
        if (principal instanceof UsernamePasswordAuthenticationToken) {
            String userId = principal.getName();
            
            // Fetch user permissions
            UserRbacContext rbacContext = userPermissionService.getUserRbacContext(userId);
            
            JwtClaimsSet.Builder claims = context.getClaims();
            
            // Add RBAC claims
            claims.claim("user_id", rbacContext.getUserId());
            claims.claim("organization_id", rbacContext.getOrganizationId());
            claims.claim("organization_type", rbacContext.getOrganizationType());
            claims.claim("roles", rbacContext.getRoles());
            claims.claim("permissions", rbacContext.getPermissions());
            claims.claim("client_access", rbacContext.getClientAccess());
            claims.claim("module_access", rbacContext.getModuleAccess());
            claims.claim("accessible_clients", rbacContext.getAccessibleClients());
            
            // Add tenant context
            claims.claim("tenant", rbacContext.getOrganizationId());
            claims.claim("tenant_hierarchy", rbacContext.getTenantHierarchy());
        }
    }
}

@Data
@Builder
public class UserRbacContext {
    private String userId;
    private String email;
    private String organizationId;
    private OrganizationType organizationType;
    private Set<String> roles;
    private Set<String> permissions;
    private Map<String, AccessLevel> clientAccess;
    private Map<ModuleType, AccessLevel> moduleAccess;
    private Set<String> accessibleClients;
    private List<String> tenantHierarchy;
}
```

### 3. Enhanced RBAC Data Model

```java
// Core User Entity
@Entity
@Table(name = "users")
public class User {
    @Id
    private String id;
    
    @Column(nullable = false, unique = true)
    private String email;
    
    @Column(nullable = false)
    private String firstName;
    
    @Column(nullable = false)
    private String lastName;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization;
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private Set<UserRoleAssignment> roleAssignments = new HashSet<>();
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private Set<UserClientAccess> clientAccess = new HashSet<>();
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private Set<UserModuleAccess> moduleAccess = new HashSet<>();
}

// Organization hierarchy for multi-tenancy
@Entity
@Table(name = "organizations")
public class Organization {
    @Id
    private String id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(unique = true)
    private String domain;
    
    @Enumerated(EnumType.STRING)
    private OrganizationType type; // MSP, CLIENT, DEPARTMENT
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_organization_id")
    private Organization parentOrganization;
    
    @OneToMany(mappedBy = "parentOrganization")
    private Set<Organization> childOrganizations = new HashSet<>();
    
    @JsonIgnore
    @Formula("(select string_agg(cast(hierarchy.ancestor_id as varchar), ',') " +
             "from organization_hierarchy hierarchy " +
             "where hierarchy.descendant_id = id)")
    private String ancestorPath;
}

// Role-based access control
@Entity
@Table(name = "roles")
public class Role {
    @Id
    private String id;
    
    @Column(nullable = false)
    private String name;
    
    @Column
    private String description;
    
    @Enumerated(EnumType.STRING)
    private RoleScope scope; // GLOBAL, ORGANIZATION, CLIENT
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization;
    
    @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
        name = "role_permissions",
        joinColumns = @JoinColumn(name = "role_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    private Set<Permission> permissions = new HashSet<>();
}

// Granular permissions
@Entity
@Table(name = "permissions")
public class Permission {
    @Id
    private String id;
    
    @Column(nullable = false)
    private String name;
    
    @Column
    private String description;
    
    @Enumerated(EnumType.STRING)
    private ModuleType module; // RMM, MDM, ADMIN, etc.
    
    @Enumerated(EnumType.STRING)
    private ActionType action; // CREATE, READ, UPDATE, DELETE, EXECUTE
    
    @Column
    private String resource; // specific resource or wildcard
}

// User role assignments with context
@Entity
@Table(name = "user_role_assignments")
public class UserRoleAssignment {
    @Id
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id")
    private Role role;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    private Client client; // Specific client if role is client-scoped
    
    @Column
    private LocalDateTime validFrom;
    
    @Column
    private LocalDateTime validUntil;
    
    @Column
    private boolean active = true;
}

// Client access control
@Entity
@Table(name = "user_client_access")
public class UserClientAccess {
    @Id
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    private Client client;
    
    @Enumerated(EnumType.STRING)
    private AccessLevel accessLevel; // NONE, READ, WRITE, FULL
    
    @Column
    private boolean inheritFromParent = true;
}

// Module access control
@Entity
@Table(name = "user_module_access")
public class UserModuleAccess {
    @Id
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
    
    @Enumerated(EnumType.STRING)
    private ModuleType module;
    
    @Enumerated(EnumType.STRING)
    private AccessLevel accessLevel;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id")
    private Client client; // null means global access
}

// Enums
public enum OrganizationType {
    MSP, CLIENT, DEPARTMENT
}

public enum ModuleType {
    RMM, MDM, ADMIN, MONITORING, REPORTING
}

public enum AccessLevel {
    NONE, READ, WRITE, FULL
}

public enum ActionType {
    CREATE, READ, UPDATE, DELETE, EXECUTE, APPROVE
}

public enum RoleScope {
    GLOBAL, ORGANIZATION, CLIENT
}
```

### 4. Resource Server Integration

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class ResourceServerConfig {

    @Bean
    public SecurityFilterChain resourceServerFilterChain(HttpSecurity http) throws Exception {
        return http
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/public/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .decoder(jwtDecoder())
                    .jwtAuthenticationConverter(rbacJwtAuthenticationConverter())))
            .build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        return JwtDecoders.fromIssuerLocation("https://auth.openframe.com");
    }

    @Bean
    public Converter<Jwt, AbstractAuthenticationToken> rbacJwtAuthenticationConverter() {
        return new RbacJwtAuthenticationConverter();
    }
}

// Custom JWT Authentication Converter
@Component
public class RbacJwtAuthenticationConverter 
        implements Converter<Jwt, AbstractAuthenticationToken> {

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Collection<GrantedAuthority> authorities = extractAuthorities(jwt);
        OpenFramePrincipal principal = createPrincipal(jwt);
        
        return new JwtAuthenticationToken(jwt, authorities, principal.getUserId());
    }

    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        Set<GrantedAuthority> authorities = new HashSet<>();
        
        // Add role-based authorities
        List<String> roles = jwt.getClaimAsStringList("roles");
        if (roles != null) {
            roles.forEach(role -> 
                authorities.add(new SimpleGrantedAuthority("ROLE_" + role)));
        }
        
        // Add permission-based authorities
        List<String> permissions = jwt.getClaimAsStringList("permissions");
        if (permissions != null) {
            permissions.forEach(permission -> 
                authorities.add(new SimpleGrantedAuthority("PERM_" + permission)));
        }
        
        // Add scope-based authorities
        String scope = jwt.getClaimAsString("scope");
        if (scope != null) {
            Arrays.stream(scope.split(" "))
                .forEach(s -> authorities.add(new SimpleGrantedAuthority("SCOPE_" + s)));
        }
        
        return authorities;
    }

    private OpenFramePrincipal createPrincipal(Jwt jwt) {
        return OpenFramePrincipal.builder()
            .userId(jwt.getSubject())
            .email(jwt.getClaimAsString("email"))
            .organizationId(jwt.getClaimAsString("organization_id"))
            .organizationType(OrganizationType.valueOf(
                jwt.getClaimAsString("organization_type")))
            .roles(new HashSet<>(jwt.getClaimAsStringList("roles")))
            .permissions(new HashSet<>(jwt.getClaimAsStringList("permissions")))
            .clientAccess(extractClientAccess(jwt))
            .moduleAccess(extractModuleAccess(jwt))
            .accessibleClients(new HashSet<>(jwt.getClaimAsStringList("accessible_clients")))
            .tenantHierarchy(jwt.getClaimAsStringList("tenant_hierarchy"))
            .build();
    }
}
```

### 5. Method-Level Security with RBAC

```java
// Custom security annotations
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("@rbacSecurityService.hasModuleAccess(authentication.principal, " +
             "#module, #accessLevel, #clientId)")
public @interface RequireModuleAccess {
    ModuleType module();
    AccessLevel accessLevel() default AccessLevel.READ;
    String clientId() default "";
}

@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("@rbacSecurityService.hasClientAccess(authentication.principal, " +
             "#clientId, #accessLevel)")
public @interface RequireClientAccess {
    String clientId();
    AccessLevel accessLevel() default AccessLevel.READ;
}

// RBAC Security Service
@Service
public class RbacSecurityService {

    public boolean hasModuleAccess(OpenFramePrincipal principal, 
                                  ModuleType module, 
                                  AccessLevel requiredLevel, 
                                  String clientId) {
        
        // Check if user has global access to module
        AccessLevel globalAccess = principal.getModuleAccess().get(module);
        if (globalAccess != null && globalAccess.ordinal() >= requiredLevel.ordinal()) {
            return true;
        }
        
        // Check client-specific access if clientId provided
        if (StringUtils.hasText(clientId)) {
            return hasClientSpecificModuleAccess(principal, module, requiredLevel, clientId);
        }
        
        return false;
    }

    public boolean hasClientAccess(OpenFramePrincipal principal, 
                                  String clientId, 
                                  AccessLevel requiredLevel) {
        
        if (!principal.getAccessibleClients().contains(clientId)) {
            return false;
        }
        
        AccessLevel userAccess = principal.getClientAccess().get(clientId);
        return userAccess != null && userAccess.ordinal() >= requiredLevel.ordinal();
    }

    public boolean hasTenantAccess(OpenFramePrincipal principal, String tenantId) {
        return principal.getTenantHierarchy().contains(tenantId) ||
               principal.getOrganizationId().equals(tenantId);
    }
}

// Usage in controllers
@RestController
@RequestMapping("/api/rmm")
public class RmmController {

    @GetMapping("/devices")
    @RequireModuleAccess(module = ModuleType.RMM, accessLevel = AccessLevel.READ)
    public ResponseEntity<Page<DeviceDto>> getDevices(
            @RequestParam(required = false) String clientId,
            Pageable pageable) {
        
        // Implementation
        return ResponseEntity.ok(deviceService.getDevices(clientId, pageable));
    }

    @PostMapping("/devices/{deviceId}/scripts")
    @RequireModuleAccess(module = ModuleType.RMM, accessLevel = AccessLevel.FULL)
    @RequireClientAccess(clientId = "#clientId", accessLevel = AccessLevel.WRITE)
    public ResponseEntity<ScriptExecutionDto> executeScript(
            @PathVariable String deviceId,
            @RequestParam String clientId,
            @RequestBody ScriptExecutionRequest request) {
        
        // Implementation
        return ResponseEntity.ok(scriptService.executeScript(deviceId, request));
    }
}
``` 