# RBAC Implementation Examples

## Real-World Scenarios

Based on your permission diagram, here are concrete examples of how the RBAC system works in practice:

## Scenario 1: MSP Admin Managing Multiple Clients

### User Profile
```json
{
  "userId": "admin-123",
  "email": "admin@msp-company.com",
  "organizationId": "msp-001",
  "organizationType": "MSP",
  "roles": ["MSP_ADMIN", "RMM_ADMIN"],
  "permissions": [
    "rmm:full", "mdm:full", "admin:full",
    "client:create", "client:manage", "user:manage"
  ],
  "clientAccess": {
    "client-001": "FULL",
    "client-002": "FULL", 
    "client-003": "READ"
  },
  "moduleAccess": {
    "RMM": "FULL",
    "MDM": "FULL", 
    "ADMIN": "FULL"
  },
  "accessibleClients": ["client-001", "client-002", "client-003"],
  "tenantHierarchy": ["msp-001", "client-001", "client-002", "client-003"]
}
```

### JWT Token Example
```json
{
  "sub": "admin-123",
  "email": "admin@msp-company.com",
  "organization_id": "msp-001",
  "organization_type": "MSP",
  "roles": ["MSP_ADMIN", "RMM_ADMIN"],
  "permissions": ["rmm:full", "mdm:full", "admin:full"],
  "client_access": {
    "client-001": "FULL",
    "client-002": "FULL",
    "client-003": "READ"
  },
  "module_access": {
    "RMM": "FULL",
    "MDM": "FULL",
    "ADMIN": "FULL"
  },
  "accessible_clients": ["client-001", "client-002", "client-003"],
  "tenant_hierarchy": ["msp-001", "client-001", "client-002", "client-003"],
  "scope": "openid profile rmm:read rmm:write mdm:read mdm:write admin:read admin:write",
  "iat": 1640995200,
  "exp": 1640999800
}
```

### Controller Usage
```java
@RestController
@RequestMapping("/api/rmm")
public class RmmController {

    // MSP Admin can view all client devices
    @GetMapping("/devices")
    @RequireModuleAccess(module = ModuleType.RMM, accessLevel = AccessLevel.READ)
    public ResponseEntity<Page<DeviceDto>> getDevices(
            @RequestParam(required = false) String clientId,
            Authentication authentication,
            Pageable pageable) {
        
        OpenFramePrincipal principal = (OpenFramePrincipal) authentication.getPrincipal();
        
        if (clientId != null) {
            // Check specific client access
            if (!rbacSecurityService.hasClientAccess(principal, clientId, AccessLevel.READ)) {
                throw new AccessDeniedException("No access to client: " + clientId);
            }
            return ResponseEntity.ok(deviceService.getDevicesByClient(clientId, pageable));
        } else {
            // Return devices from all accessible clients
            return ResponseEntity.ok(deviceService.getDevicesForUser(principal, pageable));
        }
    }

    // Only FULL access can execute scripts
    @PostMapping("/devices/{deviceId}/scripts")
    @RequireModuleAccess(module = ModuleType.RMM, accessLevel = AccessLevel.FULL)
    public ResponseEntity<ScriptExecutionDto> executeScript(
            @PathVariable String deviceId,
            @RequestBody ScriptExecutionRequest request,
            Authentication authentication) {
        
        OpenFramePrincipal principal = (OpenFramePrincipal) authentication.getPrincipal();
        
        // Get device's client
        Device device = deviceService.findById(deviceId);
        String clientId = device.getClientId();
        
        // Verify user has FULL access to this client
        if (!rbacSecurityService.hasClientAccess(principal, clientId, AccessLevel.FULL)) {
            throw new AccessDeniedException("Insufficient privileges for client: " + clientId);
        }
        
        return ResponseEntity.ok(scriptService.executeScript(deviceId, request));
    }
}
```

## Scenario 2: Client User with Limited Access

### User Profile
```json
{
  "userId": "user-456", 
  "email": "tech@client-company.com",
  "organizationId": "client-001",
  "organizationType": "CLIENT",
  "roles": ["CLIENT_TECHNICIAN"],
  "permissions": ["rmm:read", "rmm:write"],
  "clientAccess": {
    "client-001": "WRITE"
  },
  "moduleAccess": {
    "RMM": "WRITE",
    "MDM": "NONE",
    "ADMIN": "NONE"
  },
  "accessibleClients": ["client-001"],
  "tenantHierarchy": ["client-001"]
}
```

### Access Control in Action
```java
@Service
public class DeviceService {

    public Page<DeviceDto> getDevicesForUser(OpenFramePrincipal principal, Pageable pageable) {
        // Filter devices based on user's accessible clients
        Set<String> accessibleClients = principal.getAccessibleClients();
        
        if (accessibleClients.isEmpty()) {
            return Page.empty();
        }
        
        return deviceRepository.findByClientIdIn(accessibleClients, pageable)
            .map(deviceMapper::toDto);
    }

    @PreAuthorize("@rbacSecurityService.hasClientAccess(authentication.principal, #device.clientId, T(AccessLevel).WRITE)")
    public DeviceDto updateDevice(String deviceId, UpdateDeviceRequest request) {
        Device device = deviceRepository.findById(deviceId)
            .orElseThrow(() -> new DeviceNotFoundException(deviceId));
        
        // Update device
        device.setHostname(request.getHostname());
        device.setDescription(request.getDescription());
        
        return deviceMapper.toDto(deviceRepository.save(device));
    }
}
```

## Scenario 3: Department User with Restricted Module Access

### User Profile
```json
{
  "userId": "dept-789",
  "email": "monitor@dept.client-company.com", 
  "organizationId": "dept-001",
  "organizationType": "DEPARTMENT",
  "roles": ["MONITORING_VIEWER"],
  "permissions": ["monitoring:read"],
  "clientAccess": {
    "client-001": "READ"
  },
  "moduleAccess": {
    "RMM": "READ",
    "MDM": "NONE", 
    "ADMIN": "NONE",
    "MONITORING": "READ"
  },
  "accessibleClients": ["client-001"],
  "tenantHierarchy": ["client-001", "dept-001"]
}
```

### Security Enforcement
```java
@RestController
@RequestMapping("/api/monitoring")
public class MonitoringController {

    // Department user can only view monitoring data
    @GetMapping("/metrics")
    @RequireModuleAccess(module = ModuleType.MONITORING, accessLevel = AccessLevel.READ)
    public ResponseEntity<MetricsDto> getMetrics(
            @RequestParam String clientId,
            Authentication authentication) {
        
        OpenFramePrincipal principal = (OpenFramePrincipal) authentication.getPrincipal();
        
        // Verify access to specific client
        if (!principal.getAccessibleClients().contains(clientId)) {
            throw new AccessDeniedException("No access to client: " + clientId);
        }
        
        return ResponseEntity.ok(monitoringService.getMetrics(clientId));
    }

    // This would be denied for department user
    @PostMapping("/alerts")
    @RequireModuleAccess(module = ModuleType.MONITORING, accessLevel = AccessLevel.WRITE)
    public ResponseEntity<AlertDto> createAlert(@RequestBody CreateAlertRequest request) {
        // Department user with READ access cannot create alerts
        return ResponseEntity.ok(alertService.createAlert(request));
    }
}
```

## Scenario 4: Dynamic Permission Checking Service

### RBAC Security Service Implementation
```java
@Service
@Transactional(readOnly = true)
public class RbacSecurityService {

    private final ClientRepository clientRepository;
    private final OrganizationRepository organizationRepository;

    public boolean hasModuleAccess(OpenFramePrincipal principal, 
                                  ModuleType module, 
                                  AccessLevel requiredLevel, 
                                  String clientId) {
        
        // Check global module access first
        AccessLevel globalAccess = principal.getModuleAccess().get(module);
        if (globalAccess != null && globalAccess.ordinal() >= requiredLevel.ordinal()) {
            
            // If client-specific check is needed
            if (StringUtils.hasText(clientId)) {
                return hasClientAccess(principal, clientId, AccessLevel.READ);
            }
            
            return true;
        }
        
        // Check client-specific module access
        if (StringUtils.hasText(clientId)) {
            return hasClientSpecificModuleAccess(principal, module, requiredLevel, clientId);
        }
        
        return false;
    }

    public boolean hasClientAccess(OpenFramePrincipal principal, 
                                  String clientId, 
                                  AccessLevel requiredLevel) {
        
        // Check if user has access to this client
        if (!principal.getAccessibleClients().contains(clientId)) {
            return false;
        }
        
        // Check access level
        AccessLevel userAccess = principal.getClientAccess().get(clientId);
        if (userAccess == null || userAccess.ordinal() < requiredLevel.ordinal()) {
            return false;
        }
        
        // Additional hierarchical check for MSP users
        if (principal.getOrganizationType() == OrganizationType.MSP) {
            return hasHierarchicalAccess(principal, clientId);
        }
        
        return true;
    }

    public boolean hasTenantAccess(OpenFramePrincipal principal, String tenantId) {
        // Check direct organization access
        if (principal.getOrganizationId().equals(tenantId)) {
            return true;
        }
        
        // Check hierarchical access
        return principal.getTenantHierarchy().contains(tenantId);
    }

    private boolean hasHierarchicalAccess(OpenFramePrincipal principal, String clientId) {
        // For MSP users, verify the client is actually under their organization
        Client client = clientRepository.findById(clientId).orElse(null);
        if (client == null) {
            return false;
        }
        
        // Check if client's organization is in user's hierarchy
        return principal.getTenantHierarchy().contains(client.getOrganizationId());
    }

    private boolean hasClientSpecificModuleAccess(OpenFramePrincipal principal, 
                                                 ModuleType module, 
                                                 AccessLevel requiredLevel, 
                                                 String clientId) {
        
        // This would require additional entity for client-specific module access
        // For now, fall back to general client access + module access combination
        
        boolean hasClientAccess = hasClientAccess(principal, clientId, AccessLevel.READ);
        AccessLevel moduleAccess = principal.getModuleAccess().get(module);
        
        return hasClientAccess && 
               moduleAccess != null && 
               moduleAccess.ordinal() >= requiredLevel.ordinal();
    }
}
```

## Scenario 5: Token Refresh and Permission Updates

### Real-time Permission Updates
```java
@Service
public class UserPermissionService {

    private final UserRepository userRepository;
    private final CacheManager cacheManager;
    private final ApplicationEventPublisher eventPublisher;

    @Transactional
    public void updateUserPermissions(String userId, UpdatePermissionsRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException(userId));
        
        // Update permissions in database
        updateUserRoleAssignments(user, request.getRoleChanges());
        updateUserClientAccess(user, request.getClientAccessChanges());
        updateUserModuleAccess(user, request.getModuleAccessChanges());
        
        // Invalidate cached permissions
        cacheManager.evict("user-permissions", userId);
        
        // Publish permission change event
        eventPublisher.publishEvent(new UserPermissionChangedEvent(userId));
    }

    @EventListener
    @Async
    public void handlePermissionChange(UserPermissionChangedEvent event) {
        String userId = event.getUserId();
        
        // Option 1: Invalidate cache and let tokens refresh naturally
        cacheManager.evict("user-permissions", userId);
        
        // Option 2: Proactively revoke existing tokens (for critical changes)
        if (event.isCritical()) {
            tokenRevocationService.revokeAllUserTokens(userId);
        }
        
        // Option 3: Send real-time update to user's active sessions
        sessionNotificationService.notifyPermissionChange(userId);
    }
}

@RestController
@RequestMapping("/api/auth")
public class TokenController {

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refreshToken(
            @RequestBody RefreshTokenRequest request) {
        
        // Validate refresh token
        OAuth2RefreshToken refreshToken = tokenService.validateRefreshToken(request.getRefreshToken());
        
        // Get current user permissions (may have changed since token issuance)
        String userId = extractUserIdFromRefreshToken(refreshToken);
        UserRbacContext currentPermissions = userPermissionService.getUserRbacContext(userId);
        
        // Issue new access token with updated permissions
        OAuth2AccessToken newAccessToken = tokenService.createAccessToken(
            refreshToken.getTokenValue(), 
            currentPermissions
        );
        
        return ResponseEntity.ok(TokenResponse.builder()
            .accessToken(newAccessToken.getTokenValue())
            .refreshToken(refreshToken.getTokenValue())
            .expiresIn(newAccessToken.getExpiresAt().getEpochSecond())
            .build());
    }
}
```

## Scenario 6: Audit and Compliance

### Comprehensive Audit Logging
```java
@Component
public class RbacAuditLogger {

    private final AuditEventRepository auditEventRepository;

    @EventListener
    public void handleAuthorizationSuccess(AuthorizationSuccessEvent event) {
        AuditEvent auditEvent = AuditEvent.builder()
            .eventType("AUTHORIZATION_SUCCESS")
            .userId(event.getUserId())
            .resource(event.getResource())
            .action(event.getAction())
            .clientId(event.getClientId())
            .timestamp(LocalDateTime.now())
            .ipAddress(event.getIpAddress())
            .userAgent(event.getUserAgent())
            .result("SUCCESS")
            .build();
            
        auditEventRepository.save(auditEvent);
    }

    @EventListener
    public void handleAuthorizationFailure(AuthorizationFailureEvent event) {
        AuditEvent auditEvent = AuditEvent.builder()
            .eventType("AUTHORIZATION_FAILURE")
            .userId(event.getUserId())
            .resource(event.getResource())
            .action(event.getAction())
            .clientId(event.getClientId())
            .timestamp(LocalDateTime.now())
            .ipAddress(event.getIpAddress())
            .userAgent(event.getUserAgent())
            .result("FAILURE")
            .reason(event.getReason())
            .build();
            
        auditEventRepository.save(auditEvent);
        
        // Alert on suspicious activity
        if (isSuspiciousActivity(event)) {
            securityAlertService.sendSecurityAlert(event);
        }
    }
}

// Usage in security service
@Service
public class RbacSecurityService {

    private final ApplicationEventPublisher eventPublisher;

    public boolean hasModuleAccess(OpenFramePrincipal principal, 
                                  ModuleType module, 
                                  AccessLevel requiredLevel, 
                                  String clientId) {
        
        boolean hasAccess = checkModuleAccess(principal, module, requiredLevel, clientId);
        
        // Publish audit event
        if (hasAccess) {
            eventPublisher.publishEvent(AuthorizationSuccessEvent.builder()
                .userId(principal.getUserId())
                .resource(module.name())
                .action(requiredLevel.name())
                .clientId(clientId)
                .build());
        } else {
            eventPublisher.publishEvent(AuthorizationFailureEvent.builder()
                .userId(principal.getUserId())
                .resource(module.name())
                .action(requiredLevel.name())
                .clientId(clientId)
                .reason("Insufficient permissions")
                .build());
        }
        
        return hasAccess;
    }
}
```

These examples demonstrate how your permission diagram translates into a fully functional, enterprise-grade RBAC system using Spring Authorization Server. The system provides:

- **Fine-grained access control** based on organization hierarchy
- **Dynamic permission checking** with real-time updates
- **Comprehensive audit logging** for compliance
- **Performance optimization** through caching
- **Security enforcement** at multiple layers

The solution scales from simple read-only access to complex multi-tenant scenarios while maintaining clean, maintainable code. 