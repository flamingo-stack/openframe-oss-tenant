# Contributing Guidelines

Welcome to the OpenFrame community! We're excited to have you contribute to the platform. This guide outlines our standards, processes, and best practices for contributing code, documentation, and other improvements.

## Code of Conduct

OpenFrame is committed to fostering an inclusive and welcoming community. All contributors are expected to:

- **Be respectful**: Treat everyone with respect and courtesy
- **Be inclusive**: Welcome newcomers and help them learn
- **Be collaborative**: Work together constructively
- **Be professional**: Maintain professional standards in all interactions

## Getting Started

### 1. Development Environment

Before contributing, set up your development environment:

1. Complete the [Environment Setup](../setup/environment.md)
2. Follow the [Local Development Guide](../setup/local-development.md)
3. Run the test suite to ensure everything works: `mvn test`

### 2. Understanding the Codebase

Familiarize yourself with:

- **[Architecture Overview](../architecture/overview.md)** - System design and patterns
- **[Testing Strategy](../testing/overview.md)** - How we test code
- **Code Structure** - Organization and conventions

### 3. Finding Issues to Work On

Look for these labels on GitHub issues:

- `good first issue` - Perfect for newcomers
- `help wanted` - Community contributions welcome
- `bug` - Bug fixes needed
- `enhancement` - New features or improvements
- `documentation` - Documentation improvements

## Contribution Workflow

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/your-username/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git

# Verify remotes
git remote -v
```

### 2. Create Feature Branch

```bash
# Fetch latest changes
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

### 3. Make Changes

Follow our coding standards and make your changes:

```bash
# Make your changes
# ... edit files ...

# Run tests frequently
mvn test

# Check code style
mvn checkstyle:check

# Run full build
mvn clean install
```

### 4. Commit Changes

Use our commit message format:

```bash
# Stage changes
git add .

# Commit with conventional format
git commit -m "feat: add device status monitoring API

- Implement GraphQL query for device status
- Add real-time status updates via WebSocket
- Include comprehensive test coverage
- Update API documentation

Closes #123"
```

### 5. Submit Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create pull request on GitHub
# Use the PR template and fill in all sections
```

## Coding Standards

### Java/Spring Boot Standards

#### 1. Code Style and Formatting

```java
// Use clear, descriptive names
public class DeviceManagementService {
    private final DeviceRepository deviceRepository;
    private final EventPublisher eventPublisher;
    
    // Constructor injection preferred
    public DeviceManagementService(DeviceRepository deviceRepository, 
                                 EventPublisher eventPublisher) {
        this.deviceRepository = deviceRepository;
        this.eventPublisher = eventPublisher;
    }
    
    // Methods should be focused and single-purpose
    @Transactional
    public Device createDevice(CreateDeviceRequest request) {
        validateDeviceRequest(request);
        
        Device device = Device.builder()
            .name(request.getName())
            .type(request.getType())
            .organizationId(request.getOrganizationId())
            .status(DeviceStatus.PENDING)
            .createdAt(Instant.now())
            .build();
            
        Device savedDevice = deviceRepository.save(device);
        
        eventPublisher.publishEvent(new DeviceCreatedEvent(savedDevice));
        
        return savedDevice;
    }
    
    private void validateDeviceRequest(CreateDeviceRequest request) {
        if (StringUtils.isBlank(request.getName())) {
            throw new IllegalArgumentException("Device name is required");
        }
        
        if (request.getType() == null) {
            throw new IllegalArgumentException("Device type is required");
        }
    }
}
```

#### 2. Error Handling

```java
// Use specific exceptions
public class DeviceNotFoundException extends RuntimeException {
    public DeviceNotFoundException(String deviceId) {
        super("Device not found: " + deviceId);
    }
}

// Proper error handling in services
@Service
public class DeviceService {
    
    public Device getDevice(String deviceId) {
        return deviceRepository.findById(deviceId)
            .orElseThrow(() -> new DeviceNotFoundException(deviceId));
    }
    
    @Transactional
    public Device updateDevice(String deviceId, UpdateDeviceRequest request) {
        Device device = getDevice(deviceId); // Will throw if not found
        
        try {
            device.updateFromRequest(request);
            return deviceRepository.save(device);
        } catch (DataIntegrityViolationException e) {
            throw new DeviceUpdateException("Failed to update device", e);
        }
    }
}
```

#### 3. Documentation and Comments

```java
/**
 * Service for managing device lifecycle operations.
 * 
 * This service handles device creation, updates, status monitoring,
 * and integration with external MSP tools.
 * 
 * @author OpenFrame Team
 * @since 1.0.0
 */
@Service
@Slf4j
public class DeviceLifecycleService {
    
    /**
     * Creates a new device and initiates monitoring setup.
     * 
     * @param request the device creation request containing name, type, and organization
     * @return the created device with assigned ID and initial status
     * @throws IllegalArgumentException if request validation fails
     * @throws OrganizationNotFoundException if organization doesn't exist
     */
    public Device createDevice(CreateDeviceRequest request) {
        log.info("Creating device: {} for organization: {}", 
                 request.getName(), request.getOrganizationId());
        
        // Implementation with clear logic flow
        validateCreateRequest(request);
        Organization organization = validateOrganization(request.getOrganizationId());
        
        Device device = buildDeviceFromRequest(request);
        Device savedDevice = deviceRepository.save(device);
        
        // Async setup - don't block creation
        initiateDeviceMonitoring(savedDevice);
        
        log.info("Successfully created device: {} with ID: {}", 
                 savedDevice.getName(), savedDevice.getId());
        
        return savedDevice;
    }
}
```

#### 4. Testing Standards

```java
@ExtendWith(MockitoExtension.class)
class DeviceServiceTest {
    
    @Mock
    private DeviceRepository deviceRepository;
    
    @Mock
    private EventPublisher eventPublisher;
    
    @InjectMocks
    private DeviceService deviceService;
    
    @Test
    @DisplayName("Should create device successfully when valid request provided")
    void shouldCreateDeviceSuccessfullyWhenValidRequestProvided() {
        // Given
        CreateDeviceRequest request = CreateDeviceRequest.builder()
            .name("Test Device")
            .type(DeviceType.WORKSTATION)
            .organizationId("org-123")
            .build();
            
        Device expectedDevice = Device.builder()
            .id("device-456")
            .name("Test Device")
            .type(DeviceType.WORKSTATION)
            .organizationId("org-123")
            .status(DeviceStatus.PENDING)
            .build();
            
        when(deviceRepository.save(any(Device.class))).thenReturn(expectedDevice);
        
        // When
        Device actualDevice = deviceService.createDevice(request);
        
        // Then
        assertThat(actualDevice).isNotNull();
        assertThat(actualDevice.getName()).isEqualTo("Test Device");
        assertThat(actualDevice.getStatus()).isEqualTo(DeviceStatus.PENDING);
        
        verify(deviceRepository).save(argThat(device -> 
            device.getName().equals("Test Device") &&
            device.getType() == DeviceType.WORKSTATION
        ));
        
        verify(eventPublisher).publishEvent(any(DeviceCreatedEvent.class));
    }
    
    @Test
    @DisplayName("Should throw exception when device name is blank")
    void shouldThrowExceptionWhenDeviceNameIsBlank() {
        // Given
        CreateDeviceRequest request = CreateDeviceRequest.builder()
            .name("")  // Invalid name
            .type(DeviceType.WORKSTATION)
            .organizationId("org-123")
            .build();
        
        // When & Then
        assertThatThrownBy(() -> deviceService.createDevice(request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessage("Device name is required");
        
        // Verify no side effects
        verifyNoInteractions(deviceRepository, eventPublisher);
    }
}
```

### Vue.js/TypeScript Standards

#### 1. Component Structure

```vue
<template>
  <div class="device-card" :class="{ 'device-card--offline': isOffline }">
    <!-- Use semantic HTML -->
    <header class="device-card__header">
      <h3 class="device-card__name">{{ device.name }}</h3>
      <DeviceStatusBadge :status="device.status" />
    </header>
    
    <main class="device-card__content">
      <div class="device-card__info">
        <InfoRow label="Type" :value="device.type" />
        <InfoRow label="Organization" :value="device.organization?.name" />
        <InfoRow label="Last Seen" :value="formatLastSeen(device.lastSeen)" />
      </div>
    </main>
    
    <footer class="device-card__actions">
      <Button
        label="Edit" 
        icon="pi pi-pencil"
        class="p-button-text"
        @click="handleEdit"
        :disabled="loading"
      />
      <Button
        label="Manage"
        icon="pi pi-cog"
        @click="handleManage"
        :disabled="isOffline || loading"
      />
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Device } from '@/types/device'
import { formatRelativeTime } from '@/utils/dateUtils'

// Props with TypeScript types
interface Props {
  device: Device
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Events with proper typing
interface Emits {
  (e: 'edit', device: Device): void
  (e: 'manage', device: Device): void
}

const emit = defineEmits<Emits>()

// Computed properties
const isOffline = computed(() => props.device.status === 'OFFLINE')

const formatLastSeen = computed(() => {
  if (!props.device.lastSeen) return 'Never'
  return formatRelativeTime(props.device.lastSeen)
})

// Event handlers
const handleEdit = () => {
  emit('edit', props.device)
}

const handleManage = () => {
  emit('manage', props.device)
}
</script>

<style scoped>
.device-card {
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  padding: 1rem;
  background: var(--surface-card);
  transition: box-shadow 0.2s;
}

.device-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.device-card--offline {
  border-left: 4px solid var(--red-500);
}

.device-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.device-card__name {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-color);
}

.device-card__content {
  margin-bottom: 1rem;
}

.device-card__actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

/* Responsive design */
@media (max-width: 768px) {
  .device-card__actions {
    flex-direction: column;
  }
}
</style>
```

#### 2. Composables and API Integration

```typescript
// src/composables/useDevices.ts
import { ref, computed } from 'vue'
import { useQuery, useMutation } from '@vue/apollo-composable'
import { GET_DEVICES, CREATE_DEVICE, UPDATE_DEVICE } from '@/graphql/devices'
import type { Device, CreateDeviceInput, UpdateDeviceInput } from '@/types/device'

export const useDevices = (organizationId?: string) => {
  // Reactive state
  const selectedDevice = ref<Device | null>(null)

  // GraphQL queries
  const { 
    result: devicesResult, 
    loading: devicesLoading, 
    error: devicesError,
    refetch: refetchDevices 
  } = useQuery(GET_DEVICES, 
    () => ({ organizationId: organizationId?.value || organizationId }),
    () => ({ enabled: !!organizationId })
  )

  // GraphQL mutations
  const { 
    mutate: createDeviceMutation, 
    loading: createLoading 
  } = useMutation(CREATE_DEVICE)

  const { 
    mutate: updateDeviceMutation, 
    loading: updateLoading 
  } = useMutation(UPDATE_DEVICE)

  // Computed properties
  const devices = computed(() => 
    devicesResult.value?.devices?.edges?.map(edge => edge.node) || []
  )

  const onlineDevices = computed(() =>
    devices.value.filter(device => device.status === 'ONLINE')
  )

  const offlineDevices = computed(() =>
    devices.value.filter(device => device.status === 'OFFLINE')
  )

  const deviceCounts = computed(() => ({
    total: devices.value.length,
    online: onlineDevices.value.length,
    offline: offlineDevices.value.length
  }))

  // Actions
  const createDevice = async (input: CreateDeviceInput): Promise<Device> => {
    try {
      const result = await createDeviceMutation({
        input: {
          ...input,
          organizationId: organizationId || input.organizationId
        }
      })

      // Refresh devices list
      await refetchDevices()

      return result?.data?.createDevice
    } catch (error) {
      console.error('Failed to create device:', error)
      throw new Error('Failed to create device')
    }
  }

  const updateDevice = async (id: string, input: UpdateDeviceInput): Promise<Device> => {
    try {
      const result = await updateDeviceMutation({
        id,
        input
      })

      // Optimistically update local state
      const deviceIndex = devices.value.findIndex(d => d.id === id)
      if (deviceIndex >= 0) {
        devices.value[deviceIndex] = { ...devices.value[deviceIndex], ...input }
      }

      return result?.data?.updateDevice
    } catch (error) {
      // Revert optimistic update on error
      await refetchDevices()
      console.error('Failed to update device:', error)
      throw new Error('Failed to update device')
    }
  }

  const selectDevice = (device: Device | null) => {
    selectedDevice.value = device
  }

  const refreshDevices = async () => {
    await refetchDevices()
  }

  // Return public interface
  return {
    // State
    devices,
    selectedDevice,
    onlineDevices,
    offlineDevices,
    deviceCounts,

    // Loading states
    loading: devicesLoading,
    createLoading,
    updateLoading,

    // Errors
    error: devicesError,

    // Actions
    createDevice,
    updateDevice,
    selectDevice,
    refreshDevices
  }
}
```

#### 3. Type Definitions

```typescript
// src/types/device.ts
export interface Device {
  id: string
  name: string
  type: DeviceType
  status: DeviceStatus
  lastSeen?: Date
  organization?: Organization
  metadata?: DeviceMetadata
  createdAt: Date
  updatedAt: Date
}

export enum DeviceType {
  WORKSTATION = 'WORKSTATION',
  SERVER = 'SERVER',
  LAPTOP = 'LAPTOP',
  MOBILE = 'MOBILE',
  NETWORK = 'NETWORK',
  OTHER = 'OTHER'
}

export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  PENDING = 'PENDING',
  ERROR = 'ERROR',
  MAINTENANCE = 'MAINTENANCE'
}

export interface DeviceMetadata {
  os?: string
  osVersion?: string
  cpu?: string
  memory?: string
  storage?: string
  ipAddress?: string
  macAddress?: string
  manufacturer?: string
  model?: string
  serialNumber?: string
}

export interface CreateDeviceInput {
  name: string
  type: DeviceType
  organizationId?: string
  metadata?: Partial<DeviceMetadata>
}

export interface UpdateDeviceInput {
  name?: string
  type?: DeviceType
  status?: DeviceStatus
  metadata?: Partial<DeviceMetadata>
}

// Response types for GraphQL
export interface DeviceConnection {
  edges: Array<{
    node: Device
    cursor: string
  }>
  pageInfo: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    startCursor?: string
    endCursor?: string
  }
  totalCount: number
}
```

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

### Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect code meaning (white-space, formatting, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to build process or auxiliary tools

### Examples

```bash
# Feature addition
git commit -m "feat(api): add device status monitoring endpoint

- Implement GraphQL query for real-time device status
- Add WebSocket support for status updates
- Include comprehensive error handling

Closes #123"

# Bug fix
git commit -m "fix(frontend): resolve device list pagination issue

The device list was not properly handling cursor pagination,
causing duplicate items to appear when loading more devices.

Fixed by properly managing cursor state in the GraphQL query.

Fixes #456"

# Documentation
git commit -m "docs: update API documentation for device endpoints

- Add examples for all device mutations
- Update schema documentation
- Fix typos in existing docs"

# Breaking change
git commit -m "feat(auth)!: implement new JWT token format

BREAKING CHANGE: JWT token structure has changed to include
additional security claims. Existing tokens will need to be
refreshed.

Migration guide:
1. Users will need to re-authenticate
2. Update client applications to handle new token structure"
```

## Pull Request Process

### 1. PR Template

Fill out our PR template completely:

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No console errors
- [ ] Backward compatibility maintained (or breaking change noted)

## Screenshots (if applicable)
Add screenshots for UI changes.

## Related Issues
Closes #123
Related to #456
```

### 2. Review Process

All PRs must:

1. **Pass CI/CD checks**: All automated tests must pass
2. **Code review**: At least one maintainer approval required
3. **Documentation**: Include relevant documentation updates
4. **No merge conflicts**: Rebase if necessary

### 3. Review Checklist

Reviewers check for:

- **Functionality**: Does the code work as intended?
- **Code quality**: Is the code clean, readable, and maintainable?
- **Performance**: Are there any performance implications?
- **Security**: Are there any security concerns?
- **Testing**: Is there adequate test coverage?
- **Documentation**: Is documentation updated?

## Code Style and Formatting

### Java Code Style

We use Google Java Style with these modifications:

```xml
<!-- checkstyle.xml -->
<module name="Checker">
  <module name="TreeWalker">
    <module name="Indentation">
      <property name="basicOffset" value="4"/>
      <property name="braceAdjustment" value="0"/>
      <property name="caseIndent" value="4"/>
    </module>
    <module name="LineLength">
      <property name="max" value="120"/>
    </module>
  </module>
</module>
```

### Frontend Code Style

We use Prettier with these settings:

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "none",
  "printWidth": 100,
  "endOfLine": "lf"
}
```

### EditorConfig

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
insert_final_newline = true
trim_trailing_whitespace = true

[*.{java,kt}]
indent_size = 4
max_line_length = 120

[*.{js,ts,vue,json}]
indent_size = 2
max_line_length = 100

[*.md]
trim_trailing_whitespace = false
```

## Documentation Standards

### 1. Code Documentation

#### Java Documentation
```java
/**
 * Service for managing device lifecycle operations including creation,
 * updates, monitoring setup, and decommissioning.
 * 
 * This service integrates with external MSP tools and handles:
 * - Device registration and validation
 * - Status monitoring and alerting
 * - Tool integration and configuration
 * - Lifecycle event publishing
 * 
 * @author OpenFrame Team
 * @since 1.0.0
 * @see DeviceRepository
 * @see ExternalToolService
 */
@Service
@Slf4j
public class DeviceLifecycleService {
    
    /**
     * Creates a new device and initiates monitoring.
     * 
     * The device creation process includes:
     * 1. Validation of request data
     * 2. Organization existence check
     * 3. Device entity creation and persistence
     * 4. Asynchronous monitoring setup
     * 5. Event notification
     * 
     * @param request the device creation request containing required fields
     * @return the created device with generated ID and initial status
     * @throws IllegalArgumentException if request validation fails
     * @throws OrganizationNotFoundException if organization doesn't exist
     * @throws DeviceCreationException if creation fails due to system error
     */
    public Device createDevice(CreateDeviceRequest request) {
        // Implementation
    }
}
```

#### TypeScript Documentation
```typescript
/**
 * Composable for managing device operations including CRUD operations,
 * status monitoring, and real-time updates.
 * 
 * @param organizationId - Optional organization filter for device queries
 * @returns Object containing device state, actions, and loading states
 * 
 * @example
 * ```typescript
 * const { devices, createDevice, loading } = useDevices('org-123')
 * 
 * // Create new device
 * const newDevice = await createDevice({
 *   name: 'Web Server',
 *   type: DeviceType.SERVER
 * })
 * ```
 */
export const useDevices = (organizationId?: Ref<string> | string) => {
    // Implementation
}
```

### 2. API Documentation

Document all GraphQL schemas:

```graphql
"""
Represents a managed device in the OpenFrame platform.
Devices can be servers, workstations, mobile devices, or network equipment.
"""
type Device {
  """Unique identifier for the device"""
  id: ID!
  
  """Human-readable device name (required)"""
  name: String!
  
  """Device type classification"""
  type: DeviceType!
  
  """Current device status"""
  status: DeviceStatus!
  
  """Last time device was seen online"""
  lastSeen: DateTime
  
  """Organization that owns this device"""
  organization: Organization!
  
  """Device metadata including hardware specs"""
  metadata: DeviceMetadata
  
  """Device creation timestamp"""
  createdAt: DateTime!
  
  """Last update timestamp"""
  updatedAt: DateTime!
}

"""
Input for creating a new device.
All required fields must be provided.
"""
input CreateDeviceInput {
  """Device name (3-100 characters, alphanumeric and spaces)"""
  name: String!
  
  """Type of device being registered"""
  type: DeviceType!
  
  """Organization ID (will use current user's org if not specified)"""
  organizationId: ID
  
  """Optional device metadata"""
  metadata: DeviceMetadataInput
}
```

### 3. README Updates

Keep README files current:

```markdown
# OpenFrame Device Management

## Overview
The device management module handles...

## Features
- Device registration and monitoring
- Real-time status updates
- Integration with MSP tools
- Automated alerting

## API Endpoints

### GraphQL Queries
```graphql
# Get devices for organization
query GetDevices($organizationId: ID!) {
  devices(organizationId: $organizationId) {
    edges {
      node {
        id
        name
        status
      }
    }
  }
}
```

### REST Endpoints
```bash
# Get device list
GET /api/v1/devices

# Create device
POST /api/v1/devices
```

## Development

### Running Tests
```bash
mvn test -Dtest=DeviceServiceTest
```

### Local Development
```bash
mvn spring-boot:run -Dspring.profiles.active=development
```
```

## Performance Guidelines

### 1. Database Queries

```java
// Use projections for list views
@Query(value = "{'organizationId': ?0}", 
       fields = "{'id': 1, 'name': 1, 'status': 1, 'lastSeen': 1}")
List<DeviceListProjection> findDeviceListByOrganization(String organizationId);

// Use pagination for large datasets
Page<Device> findByOrganizationId(String organizationId, Pageable pageable);

// Optimize with proper indexes
@Indexed
@CompoundIndex(def = "{'organizationId': 1, 'status': 1, 'lastSeen': -1}")
public class Device {
    // Fields
}
```

### 2. Caching Strategy

```java
@Cacheable(value = "devices", key = "#organizationId", unless = "#result.size() > 100")
public List<Device> getDevicesByOrganization(String organizationId) {
    return deviceRepository.findByOrganizationId(organizationId);
}

@CacheEvict(value = "devices", key = "#device.organizationId")
public Device updateDevice(Device device) {
    return deviceRepository.save(device);
}
```

### 3. Async Operations

```java
@Async("deviceTaskExecutor")
public CompletableFuture<Void> initiateMonitoring(Device device) {
    // Long-running monitoring setup
    return CompletableFuture.completedFuture(null);
}
```

## Security Guidelines

### 1. Input Validation

```java
@Valid
public Device createDevice(@Valid @RequestBody CreateDeviceRequest request) {
    // Validation annotations handle basic validation
    // Additional business logic validation
    validateBusinessRules(request);
    return deviceService.createDevice(request);
}

public class CreateDeviceRequest {
    @NotBlank(message = "Device name is required")
    @Size(min = 3, max = 100, message = "Device name must be 3-100 characters")
    @Pattern(regexp = "^[a-zA-Z0-9\\s\\-_]+$", message = "Device name contains invalid characters")
    private String name;
    
    @NotNull(message = "Device type is required")
    private DeviceType type;
}
```

### 2. Authorization

```java
@PreAuthorize("hasRole('ADMIN') or @deviceSecurityService.canAccessDevice(#deviceId, authentication.name)")
public Device getDevice(@PathVariable String deviceId) {
    return deviceService.findById(deviceId);
}
```

### 3. Data Sanitization

```java
public Device createDevice(CreateDeviceRequest request) {
    // Sanitize input data
    String sanitizedName = StringEscapeUtils.escapeHtml4(request.getName().trim());
    
    Device device = Device.builder()
        .name(sanitizedName)
        .type(request.getType())
        .build();
        
    return deviceRepository.save(device);
}
```

## Issue Reporting

### Bug Reports

Use this template for bug reports:

```markdown
## Bug Description
Clear description of the bug.

## Steps to Reproduce
1. Go to...
2. Click on...
3. See error

## Expected Behavior
What should happen.

## Actual Behavior
What actually happens.

## Environment
- OS: [e.g., Ubuntu 22.04]
- Java Version: [e.g., OpenJDK 21]
- Browser: [e.g., Chrome 120] (for frontend issues)
- OpenFrame Version: [e.g., 1.0.0]

## Additional Context
Screenshots, logs, or other helpful information.
```

### Feature Requests

```markdown
## Feature Description
Clear description of the proposed feature.

## Use Case
Why is this feature needed? What problem does it solve?

## Proposed Solution
How should this feature work?

## Alternative Solutions
Other ways to address the use case.

## Additional Context
Mockups, examples, or related features.
```

## Getting Help

### Community Resources

- **[OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)**: Join the `#development` channel
- **GitHub Discussions**: For general questions and discussions
- **GitHub Issues**: For bug reports and feature requests

### Development Questions

Before asking for help:

1. **Search existing issues** and documentation
2. **Check the FAQ** in our documentation
3. **Provide context**: Include relevant code, error messages, and environment details
4. **Create minimal reproduction**: Isolate the issue to its core components

## Recognition

Contributors are recognized through:

- **Contributors list** in README and documentation
- **Release notes** highlighting significant contributions
- **Community spotlights** in our blog and social media
- **Maintainer invitations** for consistent, high-quality contributions

## Next Steps

Ready to contribute? Here's what to do next:

1. **Set up your environment**: Follow the [Environment Setup](../setup/environment.md)
2. **Pick an issue**: Look for `good first issue` labels
3. **Join the community**: Connect with us on Slack
4. **Start coding**: Create your first pull request

We're excited to see what you'll build with OpenFrame! 🚀

---

Thank you for contributing to OpenFrame. Together, we're building the future of open-source MSP platforms.