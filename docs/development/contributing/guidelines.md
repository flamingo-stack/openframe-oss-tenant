# Contributing Guidelines

Welcome to OpenFrame! This guide outlines our code style conventions, development workflow, and contribution process to help you contribute effectively to the project.

## Code of Conduct

OpenFrame is committed to providing a welcoming and inclusive environment for all contributors. We expect all participants to adhere to our community standards:

- **Be Respectful**: Treat everyone with respect and kindness
- **Be Collaborative**: Work together towards common goals
- **Be Constructive**: Provide helpful feedback and suggestions
- **Be Patient**: Help newcomers learn and grow
- **Be Open**: Welcome different perspectives and ideas

Report any unacceptable behavior to the project maintainers through [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA).

## Getting Started

### Before You Contribute

1. **Join the Community**: Connect with us on [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
2. **Set Up Development Environment**: Follow our [Environment Setup Guide](../setup/environment.md)
3. **Understand the Architecture**: Read the [Architecture Overview](../architecture/overview.md)
4. **Check Existing Issues**: Browse GitHub Issues to see what needs work

### Types of Contributions

We welcome various types of contributions:

- **Bug Fixes**: Fix reported issues and bugs
- **Feature Development**: Implement new features
- **Documentation**: Improve or add documentation
- **Testing**: Add test coverage or improve test quality
- **Performance**: Optimize existing code
- **UI/UX**: Enhance user interface and experience

## Development Workflow

### 1. Issue Creation and Assignment

**Creating Issues**:
```text
Title: [Component] Brief description
Labels: bug/feature/documentation/enhancement

Description:
- **Problem**: Clear description of the issue
- **Expected Behavior**: What should happen
- **Actual Behavior**: What currently happens
- **Steps to Reproduce**: Detailed reproduction steps
- **Environment**: OS, Java version, browser, etc.
- **Additional Context**: Screenshots, logs, etc.
```

**Issue Templates**:
- **Bug Report**: For reporting bugs and issues
- **Feature Request**: For proposing new features
- **Documentation**: For documentation improvements
- **Performance**: For performance-related issues

### 2. Branch Naming Convention

Use descriptive branch names that indicate the type of work:

```bash
# Feature branches
feature/device-bulk-operations
feature/ai-chat-improvements
feature/kubernetes-integration

# Bug fix branches
bugfix/device-status-update-error
bugfix/authentication-token-refresh
bugfix/frontend-routing-issue

# Documentation branches
docs/api-documentation-update
docs/installation-guide-improvements

# Maintenance branches
chore/dependency-updates
chore/code-cleanup
chore/ci-improvements
```

### 3. Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types**:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring without functionality changes
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```bash
feat(api): add device bulk update endpoint

fix(frontend): resolve device status display issue

docs(readme): update installation instructions

test(api): add integration tests for device service

chore(deps): update Spring Boot to 3.3.1
```

### 4. Pull Request Process

**Before Creating a PR**:
1. Ensure your branch is up to date with main
2. Run all tests locally and ensure they pass
3. Follow code style guidelines
4. Update documentation if needed
5. Add tests for new functionality

**PR Title and Description**:
```text
Title: feat(api): add device bulk operations support

Description:
## Summary
Adds support for bulk operations on devices including bulk update, delete, and status changes.

## Changes Made
- Added DeviceBulkOperationController with endpoints for bulk operations
- Implemented DeviceBulkOperationService with validation and processing logic
- Added DTOs for bulk operation requests and responses
- Added comprehensive tests for all bulk operations
- Updated API documentation with new endpoints

## Testing
- [x] Unit tests for service layer
- [x] Integration tests for controller
- [x] Manual testing with Postman
- [x] Frontend integration testing

## Breaking Changes
None

## Related Issues
Closes #123, Addresses #456
```

**PR Checklist**:
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] CI/CD checks pass
- [ ] Ready for review

## Code Style Guidelines

### Java Code Style

**General Conventions**:
- Use 4 spaces for indentation (no tabs)
- Line length limit: 120 characters
- UTF-8 encoding for all files

**Class Structure**:
```java
// 1. Package declaration
package com.openframe.api.service;

// 2. Imports (grouped and sorted)
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.openframe.api.dto.DeviceRequest;
import com.openframe.data.entity.Device;

// 3. Class documentation
/**
 * Service for managing device operations including CRUD operations,
 * status updates, and bulk operations.
 * 
 * @author OpenFrame Team
 * @since 1.0.0
 */
@Service
@Transactional
public class DeviceService {
    
    // 4. Constants
    private static final int MAX_BULK_OPERATION_SIZE = 1000;
    
    // 5. Fields
    private final DeviceRepository deviceRepository;
    private final EventPublisher eventPublisher;
    
    // 6. Constructor
    public DeviceService(DeviceRepository deviceRepository, 
                        EventPublisher eventPublisher) {
        this.deviceRepository = deviceRepository;
        this.eventPublisher = eventPublisher;
    }
    
    // 7. Public methods
    public Device createDevice(CreateDeviceRequest request) {
        validateDeviceRequest(request);
        
        Device device = Device.builder()
            .name(request.getName())
            .organizationId(request.getOrganizationId())
            .deviceType(request.getDeviceType())
            .status(DeviceStatus.ACTIVE)
            .createdAt(Instant.now())
            .build();
            
        Device savedDevice = deviceRepository.save(device);
        eventPublisher.publishEvent(new DeviceCreatedEvent(savedDevice));
        
        return savedDevice;
    }
    
    // 8. Private methods
    private void validateDeviceRequest(CreateDeviceRequest request) {
        if (deviceRepository.existsByNameAndOrganizationId(
                request.getName(), request.getOrganizationId())) {
            throw new DuplicateDeviceException(
                "Device with name '" + request.getName() + "' already exists");
        }
    }
}
```

**Naming Conventions**:
- **Classes**: PascalCase (`DeviceService`, `UserController`)
- **Methods**: camelCase (`createDevice`, `validateInput`)
- **Variables**: camelCase (`deviceRepository`, `createdAt`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)
- **Packages**: lowercase (`com.openframe.api.service`)

**Annotation Usage**:
```java
// Controller example
@RestController
@RequestMapping("/api/devices")
@Validated
@SecurityRequirement(name = "bearerAuth")
public class DeviceController {

    @PostMapping
    @Operation(summary = "Create new device")
    @ResponseStatus(HttpStatus.CREATED)
    public DeviceResponse createDevice(
            @Valid @RequestBody CreateDeviceRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal AuthPrincipal principal) {
        // Implementation
    }
}

// Service example
@Service
@Transactional
@Slf4j
public class DeviceService {
    
    @Retryable(value = {TransientException.class}, maxAttempts = 3)
    public void updateDeviceStatus(String deviceId, DeviceStatus status) {
        // Implementation
    }
}
```

### Frontend Code Style (Vue.js/TypeScript)

**General Conventions**:
- Use 2 spaces for indentation
- Use single quotes for strings
- Semicolons required
- Line length limit: 100 characters

**Vue Component Structure**:
```vue
<template>
  <div class="device-card">
    <div class="device-card__header">
      <h3 class="device-card__title">{{ device.name }}</h3>
      <StatusBadge :status="device.status" />
    </div>
    
    <div class="device-card__content">
      <p class="device-card__type">{{ deviceTypeLabel }}</p>
      <p class="device-card__last-seen">Last seen: {{ formattedLastSeen }}</p>
    </div>
    
    <div class="device-card__actions">
      <Button 
        variant="primary" 
        @click="handleEdit"
      >
        Edit
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
// 1. Imports
import { computed } from 'vue';
import { formatDistanceToNow } from 'date-fns';
import StatusBadge from '@/components/StatusBadge.vue';
import Button from '@/components/ui/Button.vue';
import type { Device, DeviceStatus } from '@/types/device';

// 2. Interface definitions
interface Props {
  device: Device;
  readonly?: boolean;
}

interface Emits {
  edit: [deviceId: string];
  delete: [deviceId: string];
}

// 3. Props and emits
const props = withDefaults(defineProps<Props>(), {
  readonly: false
});

const emit = defineEmits<Emits>();

// 4. Computed properties
const deviceTypeLabel = computed(() => {
  const labels: Record<string, string> = {
    SERVER: 'Server',
    DESKTOP: 'Desktop',
    LAPTOP: 'Laptop',
    MOBILE: 'Mobile Device'
  };
  return labels[props.device.deviceType] || 'Unknown';
});

const formattedLastSeen = computed(() => {
  return formatDistanceToNow(props.device.lastSeen, { addSuffix: true });
});

// 5. Methods
const handleEdit = (): void => {
  emit('edit', props.device.id);
};
</script>

<style scoped>
.device-card {
  @apply rounded-lg border border-gray-200 bg-white p-4 shadow-sm;
  
  &__header {
    @apply flex items-center justify-between mb-3;
  }
  
  &__title {
    @apply text-lg font-semibold text-gray-900;
  }
  
  &__content {
    @apply space-y-2 mb-4;
  }
  
  &__type {
    @apply text-sm font-medium text-gray-600;
  }
  
  &__last-seen {
    @apply text-xs text-gray-500;
  }
  
  &__actions {
    @apply flex gap-2;
  }
}
</style>
```

**TypeScript Conventions**:
```typescript
// Interface definitions
interface DeviceFilters {
  status?: DeviceStatus[];
  deviceType?: DeviceType[];
  organizationId?: string;
  search?: string;
}

// Type definitions
type DeviceStatus = 'ACTIVE' | 'OFFLINE' | 'MAINTENANCE' | 'ERROR';
type SortDirection = 'asc' | 'desc';

// Function declarations
const fetchDevices = async (
  filters: DeviceFilters = {},
  pagination: CursorPaginationInput = { first: 20 }
): Promise<DeviceConnection> => {
  const response = await apiClient.post('/graphql', {
    query: DEVICES_QUERY,
    variables: { filters, pagination }
  });
  
  return response.data.devices;
};

// Store definitions (Pinia)
export const useDevicesStore = defineStore('devices', () => {
  // State
  const devices = ref<Device[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  
  // Getters
  const activeDevices = computed(() => 
    devices.value.filter(device => device.status === 'ACTIVE')
  );
  
  // Actions
  const loadDevices = async (filters?: DeviceFilters): Promise<void> => {
    try {
      loading.value = true;
      error.value = null;
      
      const result = await fetchDevices(filters);
      devices.value = result.edges.map(edge => edge.node);
    } catch (err) {
      error.value = 'Failed to load devices';
      console.error('Error loading devices:', err);
    } finally {
      loading.value = false;
    }
  };
  
  return {
    devices: readonly(devices),
    loading: readonly(loading),
    error: readonly(error),
    activeDevices,
    loadDevices
  };
});
```

### Database Conventions

**MongoDB Schema Design**:
```java
@Document(collection = "devices")
@TypeAlias("Device")
public class Device {
    
    @Id
    private String id;
    
    @Field("organization_id")
    @Indexed
    private String organizationId;
    
    @Field("name")
    private String name;
    
    @Field("device_type")
    @Indexed
    private DeviceType deviceType;
    
    @Field("status")
    @Indexed
    private DeviceStatus status;
    
    @Field("system_info")
    private SystemInfo systemInfo;
    
    @Field("created_at")
    @Indexed
    private Instant createdAt;
    
    @Field("updated_at")
    private Instant updatedAt;
    
    @Field("last_seen")
    @Indexed
    private Instant lastSeen;
    
    // Constructors, getters, setters, builder
}
```

**Index Strategy**:
```java
@CompoundIndex(
    def = "{'organization_id': 1, 'status': 1}", 
    name = "idx_org_status"
)
@CompoundIndex(
    def = "{'organization_id': 1, 'device_type': 1}", 
    name = "idx_org_type"
)
@CompoundIndex(
    def = "{'organization_id': 1, 'last_seen': -1}", 
    name = "idx_org_last_seen"
)
public class Device {
    // Implementation
}
```

## Testing Guidelines

### Unit Test Conventions

**Test Class Structure**:
```java
@ExtendWith(MockitoExtension.class)
@DisplayName("Device Service Tests")
class DeviceServiceTest {
    
    @Mock
    private DeviceRepository deviceRepository;
    
    @Mock
    private EventPublisher eventPublisher;
    
    @InjectMocks
    private DeviceService deviceService;
    
    private Device testDevice;
    private CreateDeviceRequest validRequest;
    
    @BeforeEach
    void setUp() {
        testDevice = Device.builder()
            .id("device-123")
            .name("Test Device")
            .organizationId("org-123")
            .status(DeviceStatus.ACTIVE)
            .build();
            
        validRequest = CreateDeviceRequest.builder()
            .name("Test Device")
            .organizationId("org-123")
            .deviceType(DeviceType.SERVER)
            .build();
    }
    
    @Nested
    @DisplayName("Device Creation")
    class DeviceCreation {
        
        @Test
        @DisplayName("Should create device with valid data")
        void shouldCreateDeviceWithValidData() {
            // Given
            when(deviceRepository.save(any(Device.class))).thenReturn(testDevice);
            
            // When
            Device result = deviceService.createDevice(validRequest);
            
            // Then
            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("Test Device");
            verify(eventPublisher).publishEvent(any(DeviceCreatedEvent.class));
        }
        
        @Test
        @DisplayName("Should throw exception for duplicate device name")
        void shouldThrowExceptionForDuplicateDeviceName() {
            // Given
            when(deviceRepository.existsByNameAndOrganizationId(
                validRequest.getName(), validRequest.getOrganizationId()))
                .thenReturn(true);
            
            // When & Then
            assertThatThrownBy(() -> deviceService.createDevice(validRequest))
                .isInstanceOf(DuplicateDeviceException.class)
                .hasMessage("Device with name 'Test Device' already exists");
        }
    }
}
```

### Integration Test Conventions

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@DisplayName("Device API Integration Tests")
class DeviceControllerIT {
    
    @Container
    static MongoDBContainer mongodb = new MongoDBContainer("mongo:7")
            .withReuse(true);
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Autowired
    private DeviceRepository deviceRepository;
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", mongodb::getReplicaSetUrl);
    }
    
    @BeforeEach
    void setUp() {
        deviceRepository.deleteAll();
    }
    
    @Test
    @DisplayName("Should create and retrieve device successfully")
    void shouldCreateAndRetrieveDeviceSuccessfully() {
        // Test implementation
    }
}
```

## Documentation Guidelines

### Code Documentation

**JavaDoc Standards**:
```java
/**
 * Creates a new device in the specified organization.
 * 
 * <p>This method validates the device request, ensures no duplicate device names
 * exist within the organization, and publishes a device creation event.</p>
 * 
 * @param request the device creation request containing device details
 * @return the created device with assigned ID and default status
 * @throws DuplicateDeviceException if a device with the same name already exists
 * @throws ValidationException if the request contains invalid data
 * @throws OrganizationNotFoundException if the specified organization doesn't exist
 * 
 * @since 1.0.0
 */
public Device createDevice(CreateDeviceRequest request) {
    // Implementation
}
```

**README Standards**:
- Clear project description and purpose
- Installation and setup instructions
- Usage examples with code snippets
- Configuration options and environment variables
- Troubleshooting section
- Contributing guidelines link
- License information

### API Documentation

**OpenAPI/Swagger Annotations**:
```java
@Operation(
    summary = "Create a new device",
    description = "Creates a new device in the specified organization with the provided details.",
    tags = {"Devices"}
)
@ApiResponses(value = {
    @ApiResponse(
        responseCode = "201",
        description = "Device created successfully",
        content = @Content(schema = @Schema(implementation = DeviceResponse.class))
    ),
    @ApiResponse(
        responseCode = "400",
        description = "Invalid request data",
        content = @Content(schema = @Schema(implementation = ErrorResponse.class))
    ),
    @ApiResponse(
        responseCode = "409",
        description = "Device with same name already exists",
        content = @Content(schema = @Schema(implementation = ErrorResponse.class))
    )
})
public ResponseEntity<DeviceResponse> createDevice(
        @Parameter(description = "Device creation request")
        @Valid @RequestBody CreateDeviceRequest request) {
    // Implementation
}
```

## Code Review Process

### Review Criteria

**Code Quality**:
- [ ] Code follows established style guidelines
- [ ] Logic is clear and well-structured
- [ ] Error handling is appropriate
- [ ] Performance considerations are addressed
- [ ] Security best practices are followed

**Testing**:
- [ ] Adequate test coverage for new code
- [ ] Tests are well-written and maintainable
- [ ] Integration tests cover critical paths
- [ ] Edge cases are properly tested

**Documentation**:
- [ ] Code is properly documented
- [ ] API documentation is updated
- [ ] README and guides are current
- [ ] Breaking changes are clearly marked

### Review Timeline

- **Initial Review**: Within 2 business days
- **Follow-up Reviews**: Within 1 business day
- **Approval**: Requires at least 1 approval from maintainer
- **Large Changes**: May require additional reviews

### Review Feedback

**Providing Feedback**:
- Be constructive and specific
- Explain the reasoning behind suggestions
- Offer alternatives when requesting changes
- Use kind and professional language
- Focus on the code, not the person

**Example Good Feedback**:
```text
Consider using a Builder pattern here for better readability:

```java
Device device = Device.builder()
    .name(request.getName())
    .organizationId(request.getOrganizationId())
    .status(DeviceStatus.ACTIVE)
    .createdAt(Instant.now())
    .build();
```

This makes it easier to add new fields in the future and improves code clarity.
```

**Example Feedback to Avoid**:
```text
This code is bad. Fix it.
```

### Addressing Review Comments

**Responding to Feedback**:
- Address all comments, even if just to acknowledge
- Ask for clarification if feedback is unclear
- Explain your reasoning for any disagreements
- Make requested changes or discuss alternatives
- Thank reviewers for their time and input

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR.MINOR.PATCH** (e.g., 1.2.3)
- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes (backward compatible)

### Release Checklist

- [ ] All tests pass
- [ ] Documentation is updated
- [ ] CHANGELOG.md is updated
- [ ] Version numbers are bumped
- [ ] Release notes are prepared
- [ ] Migration scripts are ready (if needed)
- [ ] Security review is completed

## Getting Help

### Resources

- **Documentation**: Comprehensive guides and API references
- **Slack Community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for real-time help
- **GitHub Issues**: Bug reports and feature requests
- **Architecture Guide**: [Architecture Overview](../architecture/overview.md)

### Mentorship Program

We welcome new contributors and provide mentorship for:
- First-time open source contributors
- Complex feature development
- Architecture design discussions
- Code review training

Contact us on Slack to connect with a mentor!

---

Thank you for contributing to OpenFrame! Your efforts help make the platform better for everyone. If you have questions about these guidelines or need clarification on any points, don't hesitate to reach out to our community.