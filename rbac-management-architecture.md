# RBAC Management Architecture

## 🏗️ Service Separation Strategy

### Authorization Server (openframe-auth-server)
**Purpose**: Authentication + JWT Token Generation  
**Port**: 8090 (OAuth2), 8091 (Health/Metrics only)

```java
@RestController
public class AuthServerController {
    
    // ✅ OAuth2 endpoints (Spring handles automatically)
    // GET  /oauth2/authorize
    // POST /oauth2/token
    // POST /oauth2/introspect
    // GET  /oauth2/jwks
    
    // ✅ RBAC Claims generation (internal)
    @Component
    public class RbacClaimsService {
        
        @Cacheable(value = "user-rbac", key = "#userId")
        public RbacClaims generateClaims(String userId) {
            // Read RBAC data from shared database
            // Generate JWT claims
            return RbacClaims.builder()
                .userId(userId)
                .organizationId(user.getOrganizationId())
                .roles(user.getRoles())
                .permissions(user.getPermissions())
                .clientAccess(user.getClientAccess())
                .moduleAccess(user.getModuleAccess())
                .build();
        }
    }
}
```

### Management Service (openframe-management)
**Purpose**: RBAC CRUD Operations  
**Port**: 8081

## 🎯 Corrected Role Hierarchy

```
Platform Level:
├── SUPER_ADMIN          # Platform owner (OpenFrame team)
│
MSP Level:
├── MSP_ADMIN           # MSP company admin
├── MSP_OPERATOR        # MSP technician
│
Client Level:  
├── CLIENT_ADMIN        # Client company admin
├── CLIENT_OPERATOR     # Client technician
│
Department Level:
├── DEPARTMENT_ADMIN    # Department head
└── DEPARTMENT_USER     # Regular user
```

## 🔐 Management Service Controllers

### Platform Level Operations
```java
@RestController
@RequestMapping("/api/management/platform")
@PreAuthorize("hasRole('SUPER_ADMIN')")  // ✅ Fixed: SUPER_ADMIN only
public class PlatformManagementController {
    
    @PostMapping("/organizations")  
    public OrganizationDto createMSP(@RequestBody CreateMSPRequest request) {
        // Only platform can create MSPs
    }
    
    @PostMapping("/system-settings")
    public void updateSystemSettings(@RequestBody SystemSettingsRequest request) {
        // Platform-wide settings
    }
    
    @GetMapping("/analytics")
    public PlatformAnalyticsDto getPlatformAnalytics() {
        // Global platform metrics
    }
}
```

### MSP Level Operations  
```java
@RestController
@RequestMapping("/api/management/msp")
@PreAuthorize("hasRole('MSP_ADMIN')")  // ✅ Fixed: MSP_ADMIN
public class MSPManagementController {
    
    @PostMapping("/clients")
    public ClientDto createClient(@RequestBody CreateClientRequest request) {
        // MSP can create clients
    }
    
    @PostMapping("/users")  
    public UserDto createMSPUser(@RequestBody CreateUserRequest request) {
        // Manage MSP staff
    }
    
    @GetMapping("/clients/{clientId}/devices")
    @RequireClientAccess  // Custom annotation for client access validation
    public List<DeviceDto> getClientDevices(@PathVariable String clientId) {
        // MSP can view client devices
    }
    
    @PutMapping("/clients/{clientId}/settings")
    @RequireClientAccess
    public ClientDto updateClientSettings(@PathVariable String clientId, 
                                        @RequestBody ClientSettingsRequest request) {
        // MSP can manage client settings
    }
}
```

### Client Level Operations
```java
@RestController
@RequestMapping("/api/management/client")
@PreAuthorize("hasRole('CLIENT_ADMIN')")  // ✅ Fixed: CLIENT_ADMIN
public class ClientManagementController {
    
    @PostMapping("/departments")
    public DepartmentDto createDepartment(@RequestBody CreateDepartmentRequest request) {
        // Client can create departments
    }
    
    @PostMapping("/users")
    public UserDto createClientUser(@RequestBody CreateUserRequest request) {
        // Manage client users
    }
    
    @PutMapping("/settings")
    public void updateClientSettings(@RequestBody ClientSettingsRequest request) {
        // Client-specific settings
    }
    
    @GetMapping("/devices")
    public List<DeviceDto> getClientDevices() {
        // Client can view own devices
    }
}
```

### Universal RBAC Management
```java
@RestController
@RequestMapping("/api/management/rbac")
public class RbacManagementController {
    
    // Context-aware user management
    @PostMapping("/users")
    @PreAuthorize("@rbacService.canCreateUser(authentication, #request.organizationId)")
    public UserDto createUser(@RequestBody CreateUserRequest request) {
        // Dynamic authorization based on context
    }
    
    // Role assignment with scope validation
    @PutMapping("/users/{userId}/roles")
    @PreAuthorize("@rbacService.canAssignRoles(authentication, #userId, #roles)")
    public UserDto updateUserRoles(@PathVariable String userId, 
                                  @RequestBody List<String> roles) {
        // Validate role assignment permissions
    }
    
    // Permission management
    @PostMapping("/roles")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'MSP_ADMIN', 'CLIENT_ADMIN')")
    public RoleDto createRole(@RequestBody CreateRoleRequest request) {
        // Create role with proper scope validation
    }
    
    // Client access management
    @PutMapping("/users/{userId}/client-access")
    @PreAuthorize("@rbacService.canManageClientAccess(authentication, #userId)")
    public UserDto updateClientAccess(@PathVariable String userId,
                                    @RequestBody Map<String, AccessLevel> clientAccess) {
        // Manage which clients user can access
    }
}
```

## 🔧 Custom Authorization Service

```java
@Service
public class RbacAuthorizationService {
    
    public boolean canCreateUser(Authentication auth, String targetOrgId) {
        OpenFramePrincipal principal = (OpenFramePrincipal) auth.getPrincipal();
        
        // SUPER_ADMIN can create anywhere
        if (principal.hasRole("SUPER_ADMIN")) return true;
        
        // MSP_ADMIN can create in their clients
        if (principal.hasRole("MSP_ADMIN")) {
            return organizationService.isMSPClient(principal.getOrganizationId(), targetOrgId);
        }
        
        // CLIENT_ADMIN can create in their organization
        if (principal.hasRole("CLIENT_ADMIN")) {
            return principal.getOrganizationId().equals(targetOrgId);
        }
        
        return false;
    }
    
    public boolean canAssignRoles(Authentication auth, String userId, List<String> roles) {
        OpenFramePrincipal principal = (OpenFramePrincipal) auth.getPrincipal();
        
        // SUPER_ADMIN can assign any role
        if (principal.hasRole("SUPER_ADMIN")) return true;
        
        // MSP_ADMIN can only assign roles within their scope
        if (principal.hasRole("MSP_ADMIN")) {
            return roles.stream().allMatch(role -> 
                role.startsWith("CLIENT_") || role.startsWith("DEPARTMENT_") || role.startsWith("RMM_") || role.startsWith("MDM_"));
        }
        
        // CLIENT_ADMIN can only assign department and user roles
        if (principal.hasRole("CLIENT_ADMIN")) {
            return roles.stream().allMatch(role -> 
                role.startsWith("DEPARTMENT_") || role.equals("CLIENT_OPERATOR"));
        }
        
        return false;
    }
    
    public boolean canManageClientAccess(Authentication auth, String userId) {
        OpenFramePrincipal principal = (OpenFramePrincipal) auth.getPrincipal();
        User targetUser = userService.getUserById(userId);
        
        // SUPER_ADMIN can manage anyone
        if (principal.hasRole("SUPER_ADMIN")) return true;
        
        // MSP_ADMIN can manage users in their clients
        if (principal.hasRole("MSP_ADMIN")) {
            return organizationService.isMSPClient(principal.getOrganizationId(), 
                                                  targetUser.getOrganizationId());
        }
        
        return false;
    }
}
```

## 🎯 Permission Matrix

| Operation | SUPER_ADMIN | MSP_ADMIN | CLIENT_ADMIN | DEPT_ADMIN |
|-----------|-------------|-----------|--------------|------------|
| Create MSP | ✅ | ❌ | ❌ | ❌ |
| Create Client | ✅ | ✅ (own) | ❌ | ❌ |
| Create Department | ✅ | ✅ (client's) | ✅ (own) | ❌ |
| Manage Users | ✅ | ✅ (scope) | ✅ (scope) | ✅ (scope) |
| Assign Roles | ✅ | ✅ (limited) | ✅ (limited) | ❌ |
| Client Access | ✅ | ✅ (own clients) | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ | ❌ |

## 📱 Event-Driven Updates

```java
@EventListener
@Async
public class RbacEventHandler {
    
    @EventListener
    public void handleUserRoleChanged(UserRoleChangedEvent event) {
        // Invalidate user's cache in Auth Server
        cacheService.evictUserRbac(event.getUserId());
        
        // Publish to other services
        eventPublisher.publishEvent(new RbacCacheInvalidationEvent(event.getUserId()));
        
        // Audit logging
        auditService.logRoleChange(event);
    }
    
    @EventListener  
    public void handleClientAccessChanged(ClientAccessChangedEvent event) {
        // Update user's client access cache
        cacheService.evictUserClientAccess(event.getUserId());
        
        // Notify affected services
        kafkaTemplate.send("rbac-updates", event);
    }
}
```

## 🔄 Integration Flow

```
1. Admin updates user roles:
   openframe-management → Database → Event Bus

2. Cache invalidation:
   Event Bus → openframe-auth-server → Redis Cache Clear

3. Next user login:
   openframe-ui → openframe-auth-server → Fresh JWT with new claims

4. API calls:
   openframe-ui → openframe-gateway → JWT validation → Business APIs
```

This architecture provides **clear separation of concerns** while maintaining **consistency** in role hierarchy and **security** best practices. 