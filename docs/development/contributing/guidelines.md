# Contributing Guidelines

Thank you for your interest in contributing to OpenFrame! This guide provides everything you need to know to contribute effectively to the OpenFrame project, from code style to the submission process.

## Getting Started

Before making your first contribution:

1. **Join our community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
2. **Set up development environment**: Follow the [Environment Setup](../setup/environment.md) guide
3. **Understand the architecture**: Read the [Architecture Overview](../architecture/overview.md)
4. **Review existing code** to understand patterns and conventions

> **Important**: We use our OpenMSP Slack community for all discussions, support, and coordination. GitHub Issues and Discussions are not actively monitored.

## Types of Contributions

We welcome various types of contributions:

| Type | Description | Skills Needed |
|------|-------------|---------------|
| **Bug Fixes** | Fix reported bugs and issues | Understanding of affected component |
| **Feature Development** | Implement new features | Full-stack development |
| **Documentation** | Improve guides and API docs | Technical writing |
| **Testing** | Add tests and improve coverage | Testing frameworks |
| **Performance** | Optimize code and queries | Profiling and optimization |
| **Security** | Enhance security measures | Security best practices |

## Development Workflow

### 1. Find or Create an Issue

Before starting work:

1. **Check existing work**: Search our Slack channels for ongoing discussions
2. **Discuss your idea**: Post in the appropriate Slack channel:
   - `#general` - General questions
   - `#development` - Technical discussions
   - `#feature-requests` - New feature ideas
   - `#bugs` - Bug reports
3. **Get consensus** before starting major features

### 2. Fork and Branch

```bash
# Fork the repository on GitHub
# Clone your fork locally
git clone https://github.com/YOUR-USERNAME/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

### 3. Development Process

#### Make Your Changes

Follow our coding standards (detailed below):

```bash
# Make incremental commits
git add .
git commit -m "feat: add device status monitoring"

# Keep your branch up to date
git fetch upstream
git rebase upstream/main
```

#### Test Your Changes

Ensure all tests pass:

```bash
# Java tests
mvn test
mvn test -Dtest=**/*IT

# Frontend tests  
cd openframe/services/openframe-frontend
npm run test
npm run test:e2e

# End-to-end tests
cd openframe-e2e-tests
mvn test
```

#### Document Your Changes

- Update relevant documentation
- Add code comments for complex logic
- Update API documentation if needed

### 4. Submit Pull Request

```bash
# Push your changes
git push origin feature/your-feature-name

# Create pull request via GitHub UI
# Fill out the PR template completely
```

## Code Style Guidelines

### Java Code Style

#### General Principles

- **Follow Google Java Style** with OpenFrame-specific additions
- **Use meaningful names** for classes, methods, and variables
- **Keep methods small** (< 30 lines when possible)
- **Favor composition over inheritance**

#### Formatting Standards

```java
// Class structure
@Component
@RequiredArgsConstructor
@Slf4j
public class DeviceService {
    
    private final DeviceRepository deviceRepository;
    private final EventPublisher eventPublisher;
    
    public Device findById(String deviceId) {
        return deviceRepository.findById(deviceId)
            .orElseThrow(() -> new DeviceNotFoundException(deviceId));
    }
    
    public Device create(CreateDeviceRequest request) {
        Device device = Device.builder()
            .name(request.getName())
            .organizationId(request.getOrganizationId())
            .status(DeviceStatus.OFFLINE)
            .build();
            
        Device savedDevice = deviceRepository.save(device);
        
        eventPublisher.publish(DeviceCreatedEvent.builder()
            .deviceId(savedDevice.getId())
            .tenantId(savedDevice.getTenantId())
            .build());
            
        return savedDevice;
    }
}
```

#### Naming Conventions

```java
// Classes: PascalCase
public class DeviceStatusProcessor { }

// Methods and variables: camelCase
public Device findByName(String deviceName) { }
private boolean isDeviceOnline;

// Constants: SCREAMING_SNAKE_CASE
public static final String DEFAULT_STATUS = "OFFLINE";

// Packages: lowercase with dots
package com.openframe.api.service.device;
```

#### Documentation Standards

```java
/**
 * Service for managing device lifecycle and operations.
 * 
 * <p>This service handles device creation, updates, status monitoring,
 * and integration with external monitoring systems.</p>
 * 
 * @author OpenFrame Team
 * @since 1.0
 */
@Service
public class DeviceService {
    
    /**
     * Creates a new device with the provided configuration.
     * 
     * <p>The device will be created in OFFLINE status and must be
     * activated separately through the agent registration process.</p>
     * 
     * @param request the device creation request containing name and configuration
     * @return the created device with generated ID and timestamps
     * @throws ValidationException if the request contains invalid data
     * @throws TenantAccessException if the user lacks permission to create devices
     */
    public Device create(CreateDeviceRequest request) {
        // Implementation
    }
}
```

### TypeScript/Vue Code Style

#### General Principles

- **Use TypeScript strictly** - no `any` types unless absolutely necessary
- **Prefer composition API** for Vue components
- **Use explicit return types** for functions
- **Follow Vue 3 best practices**

#### Component Structure

```vue
<template>
  <div class="device-card">
    <div class="device-header">
      <h3 data-testid="device-name">{{ device.name }}</h3>
      <DeviceStatusBadge :status="device.status" />
    </div>
    
    <div class="device-actions">
      <PrimeButton
        data-testid="edit-button"
        label="Edit"
        @click="$emit('edit', device.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Device } from '@/types/device'
import DeviceStatusBadge from './DeviceStatusBadge.vue'

interface Props {
  device: Device
}

interface Emits {
  edit: [deviceId: string]
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Computed properties
const isOnline = computed(() => props.device.status === 'ONLINE')
</script>

<style scoped>
.device-card {
  @apply border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow;
}

.device-header {
  @apply flex justify-between items-center mb-4;
}

.device-actions {
  @apply flex gap-2;
}
</style>
```

#### TypeScript Standards

```typescript
// Interfaces: PascalCase with descriptive names
interface DeviceCreationRequest {
  name: string
  organizationId: string
  type: DeviceType
  configuration?: DeviceConfiguration
}

// Types for unions
type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'ERROR'

// Enums for constants
enum DeviceType {
  DESKTOP = 'DESKTOP',
  LAPTOP = 'LAPTOP',
  SERVER = 'SERVER',
  MOBILE = 'MOBILE'
}

// Functions with explicit types
function createDevice(request: DeviceCreationRequest): Promise<Device> {
  return deviceApi.create(request)
}

// Composables with clear return types
interface UseDevicesReturn {
  devices: Ref<Device[]>
  loading: Ref<boolean>
  error: Ref<Error | null>
  refetch: () => Promise<void>
  createDevice: (request: DeviceCreationRequest) => Promise<Device>
}

export function useDevices(): UseDevicesReturn {
  // Implementation
}
```

### Rust Code Style

#### General Principles

- **Follow official Rust style** (rustfmt default)
- **Use meaningful error types** instead of generic errors
- **Prefer explicit types** over type inference when it improves readability
- **Write comprehensive tests** for all public functions

#### Code Structure

```rust
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::fs;
use uuid::Uuid;

/// Configuration for device monitoring and management
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceConfig {
    pub device_id: Uuid,
    pub monitoring_interval: u64,
    pub endpoints: Vec<String>,
}

/// Errors that can occur during device operations
#[derive(Debug, thiserror::Error)]
pub enum DeviceError {
    #[error("Device not found: {device_id}")]
    NotFound { device_id: Uuid },
    
    #[error("Configuration error: {message}")]
    ConfigError { message: String },
    
    #[error("Network error: {source}")]
    NetworkError {
        #[from]
        source: reqwest::Error,
    },
}

/// Service for managing device operations
pub struct DeviceService {
    config: DeviceConfig,
    client: reqwest::Client,
}

impl DeviceService {
    /// Creates a new device service with the provided configuration
    pub fn new(config: DeviceConfig) -> Result<Self, DeviceError> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| DeviceError::ConfigError {
                message: format!("Failed to create HTTP client: {}", e),
            })?;
            
        Ok(Self { config, client })
    }
    
    /// Fetches device status from the monitoring endpoint
    pub async fn get_device_status(&self) -> Result<DeviceStatus, DeviceError> {
        let response = self
            .client
            .get(&format!("{}/status", self.config.endpoints[0]))
            .send()
            .await?;
            
        let status: DeviceStatus = response.json().await?;
        Ok(status)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_device_service_creation() {
        let config = DeviceConfig {
            device_id: Uuid::new_v4(),
            monitoring_interval: 60,
            endpoints: vec!["http://localhost:8080".to_string()],
        };
        
        let service = DeviceService::new(config);
        assert!(service.is_ok());
    }
}
```

## Testing Requirements

All contributions must include appropriate tests:

### Test Coverage Requirements

| Component Type | Unit Tests | Integration Tests | E2E Tests |
|----------------|------------|-------------------|-----------|
| **Services** | Required | Required | Optional |
| **Controllers** | Required | Required | Critical paths |
| **Components** | Required | Optional | User journeys |
| **Utilities** | Required | N/A | N/A |

### Test Naming and Structure

```java
// Java test structure
class DeviceServiceTest {
    
    @Test
    void create_ValidRequest_ReturnsCreatedDevice() {
        // Given
        CreateDeviceRequest request = validDeviceRequest();
        when(deviceRepository.save(any())).thenReturn(savedDevice());
        
        // When
        Device result = deviceService.create(request);
        
        // Then
        assertThat(result)
            .isNotNull()
            .extracting(Device::getName)
            .isEqualTo(request.getName());
    }
    
    @Test
    void create_InvalidTenant_ThrowsTenantAccessException() {
        // Given
        CreateDeviceRequest request = requestWithInvalidTenant();
        
        // When & Then
        assertThrows(TenantAccessException.class, 
            () -> deviceService.create(request));
    }
}
```

```typescript
// Frontend test structure
describe('DeviceCard.vue', () => {
  const mockDevice: Device = {
    id: 'device-1',
    name: 'Test Device',
    status: DeviceStatus.ONLINE
  }

  it('displays device information correctly', () => {
    const wrapper = mount(DeviceCard, {
      props: { device: mockDevice }
    })

    expect(wrapper.find('[data-testid="device-name"]').text())
      .toBe('Test Device')
  })

  it('emits edit event when edit button clicked', async () => {
    const wrapper = mount(DeviceCard, {
      props: { device: mockDevice }
    })

    await wrapper.find('[data-testid="edit-button"]').trigger('click')
    
    expect(wrapper.emitted('edit')).toBeTruthy()
    expect(wrapper.emitted('edit')![0]).toEqual([mockDevice.id])
  })
})
```

## Documentation Standards

### Code Documentation

#### Java Documentation

```java
/**
 * Processes device heartbeat events and updates device status.
 * 
 * <p>This method handles incoming heartbeat events from devices,
 * validates the tenant context, updates the device's last seen
 * timestamp, and publishes status change events if needed.</p>
 * 
 * <p>If a device has been offline for more than the configured
 * threshold, it will be marked as OFFLINE and an alert will be
 * generated.</p>
 * 
 * @param heartbeat the device heartbeat containing device ID and status
 * @throws DeviceNotFoundException if the device is not found
 * @throws TenantAccessException if the device belongs to a different tenant
 * @see DeviceHeartbeat
 * @see DeviceStatus
 */
@EventListener
public void processHeartbeat(DeviceHeartbeat heartbeat) {
    // Implementation
}
```

#### TypeScript Documentation

```typescript
/**
 * Composable for managing device operations
 * 
 * Provides reactive state and methods for device CRUD operations,
 * including real-time status updates and filtering capabilities.
 * 
 * @param organizationId - Optional organization ID to filter devices
 * @returns Device management state and operations
 * 
 * @example
 * ```typescript
 * const { devices, loading, createDevice } = useDevices('org-123')
 * 
 * await createDevice({
 *   name: 'New Device',
 *   type: DeviceType.DESKTOP
 * })
 * ```
 */
export function useDevices(organizationId?: string): UseDevicesReturn {
  // Implementation
}
```

### README Updates

When adding new features or making significant changes:

1. **Update relevant README sections**
2. **Add new configuration options** to documentation
3. **Update example usage** if APIs change
4. **Add troubleshooting info** for common issues

## Commit Message Format

Follow conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Build process or auxiliary tool changes

### Examples

```bash
feat(api): add device status monitoring endpoint

Add GraphQL endpoint for real-time device status monitoring.
Includes subscription support for live updates.

Closes: #123

fix(frontend): resolve device list pagination issue

Fixed infinite scroll not loading additional pages when
filtering is applied.

docs(readme): update installation instructions

Added Windows-specific installation steps and
troubleshooting section.

test(device-service): add tests for edge cases

Added tests for device creation with invalid tenant
and malformed heartbeat processing.
```

## Pull Request Process

### 1. PR Template

Fill out the complete PR template:

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## How Has This Been Tested?
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Manual testing

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented complex code
- [ ] I have made corresponding changes to documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective
- [ ] New and existing unit tests pass locally
```

### 2. Review Process

1. **Automated checks** must pass:
   - Code formatting (Prettier, Spotless)
   - Linting (ESLint, Checkstyle)
   - Tests (Unit, Integration, E2E)
   - Security scans

2. **Manual review** by maintainers:
   - Code quality and architecture
   - Test coverage and quality
   - Documentation completeness
   - Security considerations

3. **Community feedback** in Slack (optional but encouraged)

### 3. Merge Requirements

- [ ] All CI checks passing
- [ ] At least one approving review from maintainer
- [ ] All conversations resolved
- [ ] Up-to-date with main branch
- [ ] No merge conflicts

## Release Process

### Versioning

OpenFrame follows [Semantic Versioning](https://semver.org/):

- **MAJOR.MINOR.PATCH** (e.g., 1.2.3)
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)  
- **PATCH**: Bug fixes (backward compatible)

### Release Workflow

1. **Feature freeze** announced in Slack
2. **Release branch** created from main
3. **Release candidate** testing
4. **Final release** with changelog
5. **Documentation** updated

## Getting Help

### Community Support

- **General questions**: `#general` in Slack
- **Development help**: `#development` in Slack  
- **Architecture discussions**: `#architecture` in Slack
- **Bug reports**: `#bugs` in Slack

### Direct Contact

For sensitive issues or private discussions, reach out to maintainers directly via Slack DM.

## Recognition

Contributors are recognized through:

- **Contributors page** on the OpenFrame website
- **Release notes** acknowledgments
- **Community highlights** in Slack
- **Maintainer recommendations** for significant contributions

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- **Be respectful** in all interactions
- **Be patient** with new contributors  
- **Be constructive** in feedback
- **Be collaborative** rather than competitive

Violations of our community standards will result in removal from the community.

---

Thank you for contributing to OpenFrame! Your contributions help make MSP operations more efficient and accessible for everyone. 🚀

For questions about these guidelines, ask in our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA).