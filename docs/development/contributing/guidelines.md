# Contributing Guidelines

Welcome to the OpenFrame project! This guide covers everything you need to know about contributing to the platform, from coding standards to the pull request process.

## Getting Started

### Prerequisites for Contributors

Before contributing, ensure you have:

1. ✅ **Development Environment** - [Environment Setup](../setup/environment.md) completed
2. ✅ **Local Development** - [Local Development](../setup/local-development.md) working
3. ✅ **OpenMSP Slack Access** - [Join our community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
4. ✅ **GitHub Account** - With SSH key configured
5. ✅ **Basic Knowledge** - Spring Boot, React/Next.js, TypeScript

### First-Time Contributor Setup

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone git@github.com:YOUR_USERNAME/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream git@github.com:openframe-stack/openframe-oss-tenant.git

# Verify remotes
git remote -v
# origin    git@github.com:YOUR_USERNAME/openframe-oss-tenant.git (fetch)
# origin    git@github.com:YOUR_USERNAME/openframe-oss-tenant.git (push)
# upstream  git@github.com:openframe-stack/openframe-oss-tenant.git (fetch)
# upstream  git@github.com:openframe-stack/openframe-oss-tenant.git (push)
```

## Code Standards

### Java/Spring Boot Standards

**Code Style:**
- **Google Java Style Guide** with minor modifications
- **4-space indentation**
- **120-character line limit**
- **Comprehensive Javadoc** for public APIs

**Example:**
```java
/**
 * Service for managing device lifecycle operations.
 * 
 * <p>This service handles device registration, monitoring, and decommissioning
 * within the multi-tenant OpenFrame platform. All operations are tenant-aware
 * and enforce proper security boundaries.
 * 
 * @author OpenFrame Team
 * @since 1.0.0
 */
@Service
@Slf4j
@Transactional(readOnly = true)
public class DeviceService {
    
    private final DeviceRepository deviceRepository;
    private final OrganizationService organizationService;
    private final AuditService auditService;
    
    public DeviceService(DeviceRepository deviceRepository,
                        OrganizationService organizationService,
                        AuditService auditService) {
        this.deviceRepository = deviceRepository;
        this.organizationService = organizationService;
        this.auditService = auditService;
    }
    
    /**
     * Creates a new device within the specified organization.
     * 
     * @param request the device creation request containing device details
     * @return the created device with generated ID and metadata
     * @throws OrganizationNotFoundException if the organization doesn't exist
     * @throws DuplicateDeviceException if a device with the same name exists
     */
    @Transactional
    public Device createDevice(CreateDeviceRequest request) {
        log.debug("Creating device: {} for organization: {}", 
                 request.getDeviceName(), request.getOrganizationId());
        
        // Validate organization exists and user has access
        Organization organization = organizationService.findById(request.getOrganizationId());
        
        // Check for duplicate device names within organization
        if (deviceRepository.existsByTenantIdAndOrganizationIdAndDeviceName(
                TenantContext.getCurrentTenant(),
                request.getOrganizationId(),
                request.getDeviceName())) {
            throw new DuplicateDeviceException(
                "Device with name '" + request.getDeviceName() + "' already exists");
        }
        
        Device device = Device.builder()
            .id(UUID.randomUUID().toString())
            .tenantId(TenantContext.getCurrentTenant())
            .organizationId(request.getOrganizationId())
            .deviceName(request.getDeviceName())
            .deviceType(request.getDeviceType())
            .status(DeviceStatus.PENDING)
            .createdAt(Instant.now())
            .createdBy(SecurityContextHolder.getContext().getAuthentication().getName())
            .build();
            
        Device savedDevice = deviceRepository.save(device);
        
        auditService.logDeviceCreation(savedDevice);
        
        log.info("Successfully created device: {} with ID: {}", 
                savedDevice.getDeviceName(), savedDevice.getId());
        
        return savedDevice;
    }
}
```

**Lombok Usage:**
```java
// Prefer builder pattern for complex objects
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Device {
    private String id;
    private String tenantId;
    private String organizationId;
    private String deviceName;
    private DeviceType deviceType;
    private DeviceStatus status;
    private Instant createdAt;
    private String createdBy;
}

// Use @Slf4j for logging
@Service
@Slf4j
public class MyService {
    // log.info(), log.debug(), log.error() available
}
```

### TypeScript/React Standards

**Code Style:**
- **Prettier** for code formatting
- **ESLint** for code quality
- **2-space indentation** for frontend code
- **PascalCase** for React components
- **camelCase** for functions and variables

**Component Structure:**
```typescript
// DeviceCard.tsx
import React from 'react';
import { Device, DeviceStatus } from '@/types/device';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDeviceActions } from '@/hooks/useDeviceActions';

interface DeviceCardProps {
  device: Device;
  onDeviceUpdate?: (deviceId: string, action: string) => void;
}

/**
 * DeviceCard displays device information in a card format.
 * 
 * Supports device actions like restart, update, and removal based on
 * user permissions and device status.
 */
export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  onDeviceUpdate,
}) => {
  const { executeAction, isLoading } = useDeviceActions();

  const handleAction = async (action: string) => {
    try {
      await executeAction(device.id, action);
      onDeviceUpdate?.(device.id, action);
    } catch (error) {
      console.error('Failed to execute device action:', error);
    }
  };

  const getStatusColor = (status: DeviceStatus): string => {
    switch (status) {
      case DeviceStatus.ONLINE:
        return 'bg-green-100 text-green-800';
      case DeviceStatus.OFFLINE:
        return 'bg-red-100 text-red-800';
      case DeviceStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {device.deviceName}
          </h3>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Type: {device.deviceType}</span>
            <span>IP: {device.ipAddress}</span>
            <span>OS: {device.operatingSystem}</span>
          </div>
          
          <div className="mt-3">
            <Badge 
              className={getStatusColor(device.status)}
              data-testid="device-status"
            >
              {device.status}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('restart')}
            disabled={isLoading || device.status === DeviceStatus.OFFLINE}
            data-testid="restart-device-button"
          >
            {isLoading ? 'Processing...' : 'Restart'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeviceCard;
```

**Custom Hooks:**
```typescript
// useDeviceActions.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { devicesApi } from '@/services/api';
import { toast } from '@/hooks/useToast';

interface DeviceActionParams {
  deviceId: string;
  action: string;
}

export const useDeviceActions = () => {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: ({ deviceId, action }: DeviceActionParams) => 
      devicesApi.executeAction(deviceId, action),
    
    onSuccess: (_, { deviceId, action }) => {
      // Invalidate and refetch device queries
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device', deviceId] });
      
      toast({
        title: 'Action Executed',
        description: `Device ${action} initiated successfully`,
        variant: 'success',
      });
    },
    
    onError: (error, { action }) => {
      console.error('Device action failed:', error);
      
      toast({
        title: 'Action Failed',
        description: `Failed to ${action} device. Please try again.`,
        variant: 'destructive',
      });
    },
  });
  
  const executeAction = (deviceId: string, action: string) => {
    return mutation.mutateAsync({ deviceId, action });
  };
  
  return {
    executeAction,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
};
```

### Database and API Standards

**MongoDB Entity Design:**
```java
@Document(collection = "devices")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Device {
    
    @Id
    private String id;
    
    @Indexed
    private String tenantId;  // Always include for multi-tenancy
    
    @Indexed
    private String organizationId;
    
    @Indexed
    private String deviceName;
    
    @Enumerated(EnumType.STRING)
    private DeviceType deviceType;
    
    @Enumerated(EnumType.STRING)
    private DeviceStatus status;
    
    private String ipAddress;
    private String macAddress;
    private String operatingSystem;
    
    @CreatedDate
    private Instant createdAt;
    
    @LastModifiedDate  
    private Instant updatedAt;
    
    private String createdBy;
    private String updatedBy;
    
    // Compound index for efficient tenant-aware queries
    @CompoundIndex(def = "{'tenantId': 1, 'organizationId': 1, 'status': 1}")
    public static class Indexes {}
}
```

**REST API Design:**
```java
@RestController
@RequestMapping("/api/devices")
@Validated
@SecurityRequirement(name = "bearerAuth")
public class DeviceController {
    
    @GetMapping
    @Operation(summary = "List devices", description = "Retrieve paginated list of devices")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Devices retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<PageResponse<DeviceResponse>> getDevices(
            @Parameter(description = "Organization ID to filter devices")
            @RequestParam(required = false) String organizationId,
            
            @Parameter(description = "Device status filter")
            @RequestParam(required = false) DeviceStatus status,
            
            @Parameter(description = "Pagination cursor")
            @RequestParam(required = false) String cursor,
            
            @Parameter(description = "Number of items per page (max 100)")
            @RequestParam(defaultValue = "20") @Max(100) int limit) {
        
        DeviceFilters filters = DeviceFilters.builder()
            .organizationId(organizationId)
            .status(status)
            .build();
            
        PaginationCriteria pagination = PaginationCriteria.builder()
            .cursor(cursor)
            .limit(limit)
            .build();
        
        DeviceConnection connection = deviceService.getDevices(filters, pagination);
        
        PageResponse<DeviceResponse> response = PageResponse.<DeviceResponse>builder()
            .data(connection.getDevices().stream()
                 .map(deviceMapper::toResponse)
                 .collect(Collectors.toList()))
            .totalCount(connection.getTotalCount())
            .hasNextPage(connection.getHasNextPage())
            .nextCursor(connection.getNextCursor())
            .build();
            
        return ResponseEntity.ok(response);
    }
    
    @PostMapping
    @Operation(summary = "Create device", description = "Register a new device")
    public ResponseEntity<DeviceResponse> createDevice(
            @Valid @RequestBody CreateDeviceRequest request) {
        
        Device device = deviceService.createDevice(request);
        DeviceResponse response = deviceMapper.toResponse(device);
        
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
```

## Testing Standards

### Backend Testing Requirements

**Test Coverage Requirements:**
- **Service Layer**: 90% line coverage minimum
- **Repository Layer**: 85% line coverage minimum
- **Controller Layer**: 80% line coverage minimum
- **Critical Business Logic**: 100% coverage

**Test Structure:**
```java
@ExtendWith(MockitoExtension.class)
@DisplayName("DeviceService Tests")
class DeviceServiceTest {
    
    @Mock private DeviceRepository deviceRepository;
    @Mock private OrganizationService organizationService;
    @Mock private AuditService auditService;
    
    @InjectMocks private DeviceService deviceService;
    
    @Nested
    @DisplayName("Device Creation")
    class DeviceCreation {
        
        @Test
        @DisplayName("Should create device successfully with valid request")
        void shouldCreateDeviceSuccessfullyWithValidRequest() {
            // Given
            CreateDeviceRequest request = createValidDeviceRequest();
            Organization organization = createTestOrganization();
            when(organizationService.findById(any())).thenReturn(organization);
            when(deviceRepository.existsByTenantIdAndOrganizationIdAndDeviceName(any(), any(), any()))
                .thenReturn(false);
            when(deviceRepository.save(any(Device.class))).thenAnswer(invocation -> {
                Device device = invocation.getArgument(0);
                device.setId("generated-id");
                return device;
            });
            
            // When
            Device result = deviceService.createDevice(request);
            
            // Then
            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo("generated-id");
            assertThat(result.getDeviceName()).isEqualTo(request.getDeviceName());
            
            verify(deviceRepository).save(argThat(device ->
                device.getTenantId().equals(TenantContext.getCurrentTenant()) &&
                device.getStatus() == DeviceStatus.PENDING
            ));
            verify(auditService).logDeviceCreation(result);
        }
        
        @Test
        @DisplayName("Should throw exception when organization not found")
        void shouldThrowExceptionWhenOrganizationNotFound() {
            // Given
            CreateDeviceRequest request = createValidDeviceRequest();
            when(organizationService.findById(any()))
                .thenThrow(new OrganizationNotFoundException("org-123"));
            
            // When & Then
            assertThatThrownBy(() -> deviceService.createDevice(request))
                .isInstanceOf(OrganizationNotFoundException.class)
                .hasMessage("Organization not found: org-123");
                
            verify(deviceRepository, never()).save(any());
        }
    }
}
```

### Frontend Testing Requirements

**Test Coverage Requirements:**
- **Components**: 80% line coverage minimum
- **Custom Hooks**: 90% line coverage minimum
- **Utility Functions**: 95% line coverage minimum
- **Critical User Flows**: E2E tests required

**Component Testing:**
```typescript
// DeviceCard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DeviceCard } from '../DeviceCard';
import { Device, DeviceStatus } from '@/types/device';
import * as devicesApi from '@/services/api';

// Mock the API module
jest.mock('@/services/api');
const mockDevicesApi = devicesApi as jest.Mocked<typeof devicesApi>;

const mockDevice: Device = {
  id: 'device-123',
  deviceName: 'Test Device',
  deviceType: 'DESKTOP',
  status: DeviceStatus.ONLINE,
  organizationId: 'org-456',
  ipAddress: '192.168.1.100',
  operatingSystem: 'Windows 11',
  lastSeen: new Date('2024-01-01T10:00:00Z'),
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('DeviceCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('Rendering', () => {
    test('should display device information correctly', () => {
      renderWithProviders(<DeviceCard device={mockDevice} />);
      
      expect(screen.getByText('Test Device')).toBeInTheDocument();
      expect(screen.getByText('Type: DESKTOP')).toBeInTheDocument();
      expect(screen.getByText('IP: 192.168.1.100')).toBeInTheDocument();
      expect(screen.getByText('OS: Windows 11')).toBeInTheDocument();
    });
    
    test('should display correct status badge styling', () => {
      renderWithProviders(<DeviceCard device={mockDevice} />);
      
      const statusBadge = screen.getByTestId('device-status');
      expect(statusBadge).toHaveTextContent('ONLINE');
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800');
    });
  });
  
  describe('Device Actions', () => {
    test('should execute restart action when button clicked', async () => {
      const user = userEvent.setup();
      const onDeviceUpdate = jest.fn();
      
      mockDevicesApi.devicesApi.executeAction.mockResolvedValue({ success: true });
      
      renderWithProviders(
        <DeviceCard device={mockDevice} onDeviceUpdate={onDeviceUpdate} />
      );
      
      const restartButton = screen.getByTestId('restart-device-button');
      await user.click(restartButton);
      
      await waitFor(() => {
        expect(mockDevicesApi.devicesApi.executeAction)
          .toHaveBeenCalledWith('device-123', 'restart');
      });
      
      await waitFor(() => {
        expect(onDeviceUpdate).toHaveBeenCalledWith('device-123', 'restart');
      });
    });
    
    test('should disable restart button for offline devices', () => {
      const offlineDevice = { ...mockDevice, status: DeviceStatus.OFFLINE };
      
      renderWithProviders(<DeviceCard device={offlineDevice} />);
      
      const restartButton = screen.getByTestId('restart-device-button');
      expect(restartButton).toBeDisabled();
    });
  });
});
```

## Git Workflow

### Branch Naming Convention

```text
Feature Branches:     feature/[issue-number]-brief-description
Bug Fixes:           bugfix/[issue-number]-brief-description  
Hotfixes:            hotfix/[issue-number]-brief-description
Documentation:       docs/[topic]-brief-description
Refactoring:         refactor/[component]-brief-description

Examples:
feature/123-device-status-monitoring
bugfix/456-device-card-rendering-issue
hotfix/789-critical-security-patch
docs/api-documentation-update
refactor/device-service-cleanup
```

### Commit Message Convention

We follow **Conventional Commits** specification:

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```text
feat(devices): add device restart functionality

- Implement device restart API endpoint
- Add restart button to device card component
- Include audit logging for restart actions

Closes #123

fix(auth): resolve JWT token expiration handling

The token refresh mechanism was not properly handling expired tokens,
causing users to be logged out unexpectedly.

- Fix token refresh logic in AuthService
- Add proper error handling for expired tokens
- Update token refresh tests

Fixes #456

docs(api): update device API documentation

- Add missing parameters for device listing endpoint
- Include example responses for all device operations
- Fix outdated authentication requirements

test(components): add tests for DeviceCard component

- Add unit tests for device information rendering
- Test device action button interactions
- Include accessibility testing

chore(deps): update Spring Boot to 3.3.1

- Update parent dependency version
- Resolve deprecated method usage
- Update related test configurations
```

### Pull Request Process

#### 1. Before Creating PR

```bash
# Ensure you're on the latest main branch
git checkout main
git pull upstream main

# Create and checkout your feature branch
git checkout -b feature/123-device-status-monitoring

# Make your changes and commit
git add .
git commit -m "feat(devices): add device status monitoring"

# Push to your fork
git push origin feature/123-device-status-monitoring
```

#### 2. PR Template

When creating a pull request, use this template:

```markdown
## Description
Brief description of the changes and their purpose.

## Related Issue
Closes #[issue-number]

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## How Has This Been Tested?
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] E2E tests pass

## Testing Details
Describe the specific tests you've added or modified.

## Screenshots (if applicable)
Include screenshots for UI changes.

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Additional Notes
Any additional information or context about the changes.
```

#### 3. PR Review Process

**Automated Checks:**
- ✅ All tests pass (unit, integration, E2E)
- ✅ Code coverage meets minimum requirements
- ✅ Security scans pass
- ✅ Code style checks pass
- ✅ Build succeeds

**Manual Review:**
1. **Code Quality Review** - Code structure, maintainability, performance
2. **Security Review** - Security implications, input validation, access control
3. **Architecture Review** - Design patterns, component boundaries, scalability
4. **Documentation Review** - Code comments, API documentation, user guides

**Approval Requirements:**
- ✅ **2 approvals** from maintainers for major features
- ✅ **1 approval** from maintainer for bug fixes and minor changes
- ✅ **Security team approval** for security-related changes
- ✅ **All automated checks** must pass

### Code Review Guidelines

#### For Reviewers

**What to Look For:**

```text
Code Quality
├── Readability and clarity
├── Proper error handling
├── Performance implications
├── Memory usage patterns
└── Resource cleanup

Security
├── Input validation
├── SQL/NoSQL injection prevention
├── XSS prevention
├── Authentication/authorization checks
└── Sensitive data handling

Architecture
├── Separation of concerns
├── Design pattern usage
├── Component boundaries
├── Scalability considerations
└── Database design

Testing
├── Test coverage adequacy
├── Test quality and reliability
├── Edge case coverage
├── Integration test completeness
└── Performance test considerations
```

**Review Comment Examples:**

```text
# Constructive feedback
"Consider using Optional.ofNullable() here to handle potential null values more gracefully."

"This database query might be inefficient with large datasets. Consider adding pagination or indexing."

"The error message could be more user-friendly. Consider providing actionable guidance."

# Positive reinforcement
"Great use of the builder pattern here! It makes the code much more readable."

"Excellent test coverage for the edge cases."

"Nice refactoring - this is much cleaner than the previous implementation."
```

#### For Contributors

**Responding to Reviews:**

1. **Be Receptive** - Reviews are meant to improve code quality
2. **Ask Questions** - If feedback isn't clear, ask for clarification
3. **Explain Decisions** - If you disagree, explain your reasoning respectfully
4. **Make Changes** - Address feedback promptly and thoroughly
5. **Test Changes** - Ensure all fixes work as expected

## Documentation Standards

### Code Documentation

**Javadoc Requirements:**
```java
/**
 * Service for managing device lifecycle operations within the OpenFrame platform.
 * 
 * <p>This service provides comprehensive device management functionality including
 * registration, monitoring, configuration, and decommissioning. All operations
 * are tenant-aware and enforce proper security boundaries.
 * 
 * <h2>Security Considerations</h2>
 * <ul>
 *   <li>All operations require valid tenant context</li>
 *   <li>Cross-tenant access is prevented at the service layer</li>
 *   <li>Device access is restricted by organization membership</li>
 * </ul>
 * 
 * <h2>Performance Considerations</h2>
 * <p>Device queries are optimized with compound indexes on (tenantId, organizationId, status).
 * Large result sets are automatically paginated to prevent memory issues.
 * 
 * @author OpenFrame Team
 * @since 1.0.0
 * @see Device
 * @see DeviceRepository
 * @see OrganizationService
 */
@Service
@Transactional(readOnly = true)
public class DeviceService {
    
    /**
     * Creates a new device within the specified organization.
     * 
     * <p>This method performs the following validations:
     * <ul>
     *   <li>Organization exists and user has access</li>
     *   <li>Device name is unique within the organization</li>
     *   <li>Device configuration is valid</li>
     * </ul>
     * 
     * @param request the device creation request containing all necessary device information
     * @return the newly created device with generated ID and audit metadata
     * @throws OrganizationNotFoundException if the specified organization doesn't exist
     * @throws DuplicateDeviceException if a device with the same name already exists
     * @throws ValidationException if the device configuration is invalid
     * @throws SecurityException if the user doesn't have permission to create devices
     */
    @Transactional
    public Device createDevice(CreateDeviceRequest request) {
        // Implementation
    }
}
```

**TSDoc Requirements:**
```typescript
/**
 * Custom hook for managing device operations and state.
 * 
 * Provides device CRUD operations, real-time status updates, and action execution
 * with proper error handling and loading states.
 * 
 * @example
 * ```typescript
 * const { devices, isLoading, executeAction } = useDevices({
 *   organizationId: 'org-123',
 *   filters: { status: DeviceStatus.ONLINE }
 * });
 * 
 * const handleRestart = async (deviceId: string) => {
 *   await executeAction(deviceId, 'restart');
 * };
 * ```
 * 
 * @param options - Configuration options for device management
 * @returns Device management interface with operations and state
 */
export const useDevices = (options: UseDevicesOptions): UseDevicesReturn => {
  // Implementation
};
```

### API Documentation

**OpenAPI Specification:**
```java
@RestController
@RequestMapping("/api/devices")
@Tag(name = "Device Management", description = "Operations for managing devices")
@SecurityRequirement(name = "bearerAuth")
public class DeviceController {
    
    @Operation(
        summary = "Create a new device",
        description = "Registers a new device within the specified organization. " +
                     "Requires DEVICE_WRITE permission.",
        responses = {
            @ApiResponse(
                responseCode = "201",
                description = "Device created successfully",
                content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = DeviceResponse.class),
                    examples = @ExampleObject(
                        name = "Desktop Device",
                        summary = "Example desktop device creation",
                        value = """
                        {
                          "id": "device-123",
                          "deviceName": "Office Desktop 01",
                          "deviceType": "DESKTOP",
                          "status": "PENDING",
                          "organizationId": "org-456"
                        }
                        """
                    )
                )
            ),
            @ApiResponse(
                responseCode = "400",
                description = "Invalid request data",
                content = @Content(
                    mediaType = "application/json",
                    schema = @Schema(implementation = ErrorResponse.class)
                )
            ),
            @ApiResponse(
                responseCode = "401", 
                description = "Authentication required"
            ),
            @ApiResponse(
                responseCode = "403",
                description = "Insufficient permissions"
            )
        }
    )
    @PostMapping
    public ResponseEntity<DeviceResponse> createDevice(
            @Parameter(
                description = "Device creation request",
                required = true,
                schema = @Schema(implementation = CreateDeviceRequest.class)
            )
            @Valid @RequestBody CreateDeviceRequest request) {
        // Implementation
    }
}
```

## Release and Deployment

### Semantic Versioning

OpenFrame follows **Semantic Versioning (SemVer)**:

```text
MAJOR.MINOR.PATCH

MAJOR: Incompatible API changes
MINOR: Backward-compatible functionality additions  
PATCH: Backward-compatible bug fixes

Examples:
1.0.0 - Initial release
1.1.0 - New device monitoring features
1.1.1 - Bug fix for device status updates
2.0.0 - Breaking changes to device API
```

### Release Process

```bash
# 1. Create release branch
git checkout -b release/1.2.0

# 2. Update version numbers
# - pom.xml versions
# - package.json versions
# - CHANGELOG.md

# 3. Run full test suite
mvn clean verify
npm run test:all

# 4. Create release PR
# Title: "Release v1.2.0"
# Include changelog and migration notes

# 5. After PR approval and merge
git checkout main
git pull upstream main
git tag -a v1.2.0 -m "Release version 1.2.0"
git push upstream v1.2.0
```

## Community Guidelines

### Communication

**OpenMSP Slack Community:**
- **#general** - General discussions
- **#development** - Development questions and discussions
- **#bug-reports** - Bug reports and issue discussions
- **#feature-requests** - Feature suggestions and discussions
- **#security** - Security-related discussions (private channel)

**Communication Guidelines:**
- ✅ **Be respectful** and inclusive
- ✅ **Search existing discussions** before asking questions
- ✅ **Provide context** when asking for help
- ✅ **Share knowledge** and help other contributors
- ❌ **Don't spam** or post off-topic content
- ❌ **Don't share sensitive information** in public channels

### Issue Reporting

**Bug Reports:**
```markdown
## Bug Description
Brief description of the bug

## Steps to Reproduce
1. Go to...
2. Click on...
3. Scroll down to...
4. See error

## Expected Behavior
What should happen instead

## Actual Behavior  
What actually happens

## Environment
- OpenFrame Version: [e.g. 1.2.0]
- Browser: [e.g. Chrome 120.0]
- OS: [e.g. Windows 11]
- Java Version: [e.g. 21.0.1]
- Node.js Version: [e.g. 18.19.0]

## Additional Context
Screenshots, logs, or other relevant information
```

**Feature Requests:**
```markdown
## Feature Summary
Brief description of the requested feature

## Problem Statement
What problem does this feature solve?

## Proposed Solution
Detailed description of how the feature should work

## Alternative Solutions
Other approaches you've considered

## Use Cases
Specific scenarios where this feature would be useful

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Additional Context
Mockups, examples, or related features
```

### Recognition

Contributors are recognized through:

- **GitHub Contributors** page
- **Release notes** acknowledgments  
- **Community highlights** in Slack
- **Special contributor** badges
- **Annual contributor** awards

## Getting Help

### Resources

1. **Documentation** - Start with our comprehensive guides
2. **Slack Community** - Ask questions and get real-time help
3. **GitHub Discussions** - In-depth technical discussions
4. **Code Reviews** - Learn from feedback on your contributions
5. **Mentorship** - Senior contributors available for guidance

### Troubleshooting

**Common Issues:**

```bash
# Build fails with dependency issues
mvn clean install -U

# Frontend tests failing
cd openframe/services/openframe-frontend
rm -rf node_modules package-lock.json
npm install

# Code style errors
mvn spotless:apply  # Backend
npm run format     # Frontend

# Git issues
git checkout main
git pull upstream main
git branch -d old-feature-branch
```

### Mentorship Program

New contributors can request mentorship:

1. **Join OpenMSP Slack** community
2. **Introduce yourself** in #general
3. **Express interest** in contributing
4. **Request mentor assignment** in #development
5. **Start with good first issues**

## Next Steps

Ready to contribute? Here's your path:

1. ✅ **Set up development environment** - [Environment Setup](../setup/environment.md)
2. ✅ **Pick an issue** - Look for "good first issue" labels
3. ✅ **Join Slack community** - [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
4. ✅ **Create your first PR** - Follow this guide
5. ✅ **Engage with the community** - Help others and share knowledge

Welcome to the OpenFrame community! We're excited to have you contribute to the future of open-source MSP platforms. 🚀