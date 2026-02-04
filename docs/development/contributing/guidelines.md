# Contributing Guidelines

Welcome to OpenFrame development! This guide ensures consistent, high-quality contributions across the platform. Whether you're fixing bugs, adding features, or improving documentation, following these guidelines helps maintain code quality and team productivity.

## Code Standards & Conventions

### Java Code Style

OpenFrame follows Google Java Style with some customizations for Spring Boot applications.

#### Naming Conventions

```java
// Classes: PascalCase
public class DeviceService { }
public class ApiKeyController { }

// Methods and variables: camelCase  
public String calculateUptime() { }
private boolean isDeviceOnline;

// Constants: UPPER_SNAKE_CASE
private static final String DEFAULT_STATUS = "UNKNOWN";
private static final int MAX_RETRY_ATTEMPTS = 3;

// Packages: lowercase with dots
com.openframe.api.service
com.openframe.data.repository
```

#### Class Organization

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class DeviceService {
    
    // 1. Static fields
    private static final String DEFAULT_STATUS = "UNKNOWN";
    
    // 2. Instance fields (final first)
    private final DeviceRepository deviceRepository;
    private final EventPublisher eventPublisher;
    private boolean cacheEnabled = true;
    
    // 3. Constructors (if needed beyond @RequiredArgsConstructor)
    
    // 4. Public methods
    public Device createDevice(CreateDeviceRequest request) {
        log.info("Creating device: {}", request.getName());
        
        Device device = Device.builder()
            .name(request.getName())
            .organizationId(request.getOrganizationId())
            .status(DeviceStatus.PENDING)
            .createdAt(LocalDateTime.now())
            .build();
            
        Device savedDevice = deviceRepository.save(device);
        
        eventPublisher.publish(new DeviceCreatedEvent(savedDevice));
        
        return savedDevice;
    }
    
    // 5. Private methods
    private void validateDevice(Device device) {
        if (StringUtils.isEmpty(device.getName())) {
            throw new IllegalArgumentException("Device name cannot be empty");
        }
    }
    
    // 6. Inner classes (if any)
}
```

#### Exception Handling

```java
// Custom exceptions with descriptive names
public class DeviceNotFoundException extends RuntimeException {
    public DeviceNotFoundException(String deviceId) {
        super("Device not found: " + deviceId);
    }
}

// Use @ControllerAdvice for global exception handling
@ControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(DeviceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleDeviceNotFound(DeviceNotFoundException ex) {
        return ErrorResponse.builder()
            .message(ex.getMessage())
            .code("DEVICE_NOT_FOUND")
            .timestamp(LocalDateTime.now())
            .build();
    }
}
```

#### Logging

```java
@Slf4j
public class DeviceService {
    
    public Device updateDevice(String deviceId, UpdateDeviceRequest request) {
        log.debug("Updating device {} with request: {}", deviceId, request);
        
        Device device = deviceRepository.findById(deviceId)
            .orElseThrow(() -> new DeviceNotFoundException(deviceId));
            
        // Update fields
        device.setName(request.getName());
        device.setStatus(request.getStatus());
        
        Device updatedDevice = deviceRepository.save(device);
        
        log.info("Device {} updated successfully. Status: {}", 
                deviceId, updatedDevice.getStatus());
                
        return updatedDevice;
    }
}
```

### TypeScript/Vue.js Code Style

#### Component Structure

```vue
<template>
  <div class="device-card" :class="statusClass">
    <div class="device-header">
      <h3 class="device-name">{{ device.name }}</h3>
      <StatusIndicator :status="device.status" />
    </div>
    
    <div class="device-details">
      <p class="last-seen">
        Last seen: {{ formatRelativeTime(device.lastSeen) }}
      </p>
    </div>
    
    <div class="device-actions">
      <Button 
        @click="handleEdit" 
        icon="pi pi-pencil" 
        class="p-button-sm p-button-outlined"
      >
        Edit
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Device, DeviceStatus } from '@/types/device'
import { formatRelativeTime } from '@/utils/date'

// Props
interface Props {
  device: Device
}

const props = defineProps<Props>()

// Emits
interface Emits {
  (e: 'edit', device: Device): void
  (e: 'statusChange', deviceId: string, status: DeviceStatus): void
}

const emit = defineEmits<Emits>()

// Computed
const statusClass = computed(() => ({
  'device-card--online': props.device.status === 'ONLINE',
  'device-card--offline': props.device.status === 'OFFLINE',
  'device-card--maintenance': props.device.status === 'MAINTENANCE'
}))

// Methods
const handleEdit = () => {
  emit('edit', props.device)
}
</script>

<style scoped lang="scss">
.device-card {
  @apply border rounded-lg p-4 bg-white shadow-sm;
  
  &--online {
    @apply border-green-200;
  }
  
  &--offline {
    @apply border-red-200;
  }
  
  &--maintenance {
    @apply border-yellow-200;
  }
}

.device-header {
  @apply flex items-center justify-between mb-3;
}

.device-name {
  @apply text-lg font-semibold text-gray-900;
}

.last-seen {
  @apply text-sm text-gray-600;
}

.device-actions {
  @apply flex gap-2 mt-3;
}
</style>
```

#### Composables Pattern

```typescript
// useDevices.ts
import { ref, computed } from 'vue'
import { useQuery, useMutation } from '@apollo/client/core'
import { DEVICES_QUERY, UPDATE_DEVICE_MUTATION } from '@/graphql/devices'
import type { Device, DeviceFilter, UpdateDeviceInput } from '@/types/device'

export function useDevices(filter?: Ref<DeviceFilter>) {
  // State
  const selectedDevices = ref<string[]>([])
  
  // Queries
  const { 
    result: devicesResult, 
    loading: devicesLoading, 
    error: devicesError,
    refetch: refetchDevices 
  } = useQuery(DEVICES_QUERY, {
    filter: filter || {}
  })
  
  // Mutations
  const { 
    mutate: updateDeviceMutation, 
    loading: updateLoading 
  } = useMutation(UPDATE_DEVICE_MUTATION)
  
  // Computed
  const devices = computed(() => 
    devicesResult.value?.devices?.edges?.map(edge => edge.node) || []
  )
  
  const onlineDevices = computed(() => 
    devices.value.filter(device => device.status === 'ONLINE')
  )
  
  const totalCount = computed(() => 
    devicesResult.value?.devices?.totalCount || 0
  )
  
  // Methods
  const updateDevice = async (deviceId: string, input: UpdateDeviceInput) => {
    try {
      await updateDeviceMutation({
        variables: { deviceId, input },
        refetchQueries: [DEVICES_QUERY]
      })
      
      return { success: true }
    } catch (error) {
      console.error('Failed to update device:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }
  
  const toggleDeviceSelection = (deviceId: string) => {
    const index = selectedDevices.value.indexOf(deviceId)
    if (index > -1) {
      selectedDevices.value.splice(index, 1)
    } else {
      selectedDevices.value.push(deviceId)
    }
  }
  
  return {
    // State
    devices: readonly(devices),
    selectedDevices: readonly(selectedDevices),
    
    // Computed
    onlineDevices,
    totalCount,
    
    // Loading states
    loading: computed(() => devicesLoading.value || updateLoading.value),
    error: devicesError,
    
    // Methods
    updateDevice,
    toggleDeviceSelection,
    refetchDevices
  }
}
```

### Rust Code Style

#### Module Organization

```rust
// src/services/device_service.rs
use std::sync::Arc;
use tokio::sync::RwLock;
use anyhow::{Context, Result};
use tracing::{info, warn, error, instrument};

use crate::{
    models::{Device, DeviceStatus, UpdateDeviceRequest},
    repositories::DeviceRepository,
    errors::DeviceError,
};

pub struct DeviceService {
    repository: Arc<dyn DeviceRepository>,
    cache: Arc<RwLock<HashMap<String, Device>>>,
}

impl DeviceService {
    pub fn new(repository: Arc<dyn DeviceRepository>) -> Self {
        Self {
            repository,
            cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }
    
    #[instrument(skip(self))]
    pub async fn create_device(&self, name: String, organization_id: String) -> Result<Device> {
        info!("Creating device: {}", name);
        
        let device = Device {
            id: uuid::Uuid::new_v4().to_string(),
            name: name.clone(),
            organization_id,
            status: DeviceStatus::Pending,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };
        
        self.repository
            .save(&device)
            .await
            .with_context(|| format!("Failed to save device: {}", name))?;
            
        // Update cache
        let mut cache = self.cache.write().await;
        cache.insert(device.id.clone(), device.clone());
        
        info!("Device created successfully: {}", device.id);
        Ok(device)
    }
    
    #[instrument(skip(self))]
    pub async fn update_device(&self, id: String, request: UpdateDeviceRequest) -> Result<Device> {
        let mut device = self.repository
            .find_by_id(&id)
            .await?
            .ok_or_else(|| DeviceError::NotFound(id.clone()))?;
            
        // Apply updates
        if let Some(name) = request.name {
            device.name = name;
        }
        
        if let Some(status) = request.status {
            device.status = status;
        }
        
        device.updated_at = chrono::Utc::now();
        
        self.repository.save(&device).await?;
        
        // Update cache
        let mut cache = self.cache.write().await;
        cache.insert(device.id.clone(), device.clone());
        
        Ok(device)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::repositories::MockDeviceRepository;
    
    #[tokio::test]
    async fn test_create_device_success() {
        // Arrange
        let mut mock_repo = MockDeviceRepository::new();
        mock_repo
            .expect_save()
            .times(1)
            .returning(|device| Ok(device.clone()));
            
        let service = DeviceService::new(Arc::new(mock_repo));
        
        // Act
        let result = service.create_device(
            "Test Device".to_string(),
            "org-123".to_string()
        ).await;
        
        // Assert
        assert!(result.is_ok());
        let device = result.unwrap();
        assert_eq!(device.name, "Test Device");
        assert_eq!(device.organization_id, "org-123");
        assert_eq!(device.status, DeviceStatus::Pending);
    }
}
```

## Branch Naming & Git Workflow

### Branch Naming Convention

| Type | Pattern | Example | Description |
|------|---------|---------|-------------|
| **Feature** | `feature/description` | `feature/device-management` | New functionality |
| **Bug Fix** | `fix/description` | `fix/device-status-update` | Bug fixes |
| **Hotfix** | `hotfix/description` | `hotfix/security-vulnerability` | Critical production fixes |
| **Chore** | `chore/description` | `chore/update-dependencies` | Maintenance tasks |
| **Documentation** | `docs/description` | `docs/api-documentation` | Documentation updates |

### Git Workflow

#### 1. Create Feature Branch

```bash
# Create and switch to feature branch
git checkout -b feature/device-filtering

# Push branch to remote
git push -u origin feature/device-filtering
```

#### 2. Development Workflow

```bash
# Make changes and commit frequently
git add .
git commit -m "Add device status filter component"

# Push changes
git push origin feature/device-filtering

# Rebase regularly to stay current
git fetch origin
git rebase origin/main
```

#### 3. Prepare for Review

```bash
# Interactive rebase to clean up commits
git rebase -i HEAD~3

# Run tests locally
mvn clean test
npm run test:unit

# Check code style
mvn spotbugs:check
npm run lint
```

## Commit Message Format

Follow conventional commits format for clear, searchable history:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type | Purpose | Example |
|------|---------|---------|
| **feat** | New feature | `feat(api): add device filtering endpoint` |
| **fix** | Bug fix | `fix(ui): resolve device status display issue` |
| **docs** | Documentation | `docs(api): update GraphQL schema documentation` |
| **style** | Code formatting | `style(frontend): fix linting issues` |
| **refactor** | Code restructuring | `refactor(service): simplify device validation logic` |
| **test** | Adding tests | `test(device): add unit tests for device service` |
| **chore** | Maintenance | `chore(deps): update Spring Boot to 3.3.1` |

### Commit Examples

```bash
# Good commit messages
git commit -m "feat(device): add real-time status updates via WebSocket"
git commit -m "fix(auth): resolve JWT token expiration handling"
git commit -m "docs(setup): update development environment guide"

# Commit with body and footer
git commit -m "feat(monitoring): add device health monitoring

Implements comprehensive device health checks including:
- CPU and memory usage tracking  
- Network connectivity tests
- Service availability verification

Closes #123
Reviewed-by: @teammate"
```

## Pull Request Process

### 1. Pre-Submission Checklist

Before creating a pull request, ensure:

- [ ] **Code compiles** without errors
- [ ] **All tests pass** locally
- [ ] **Code follows style guidelines** (linting passes)
- [ ] **Documentation updated** if needed
- [ ] **No secrets or sensitive data** committed
- [ ] **Branch is up-to-date** with main

### 2. Pull Request Template

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] All tests pass

## Screenshots (if applicable)
Include screenshots for UI changes.

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Code commented where necessary
- [ ] Documentation updated
- [ ] No breaking changes without version bump
```

### 3. Code Review Guidelines

#### For Authors

- **Keep PRs small** (< 500 lines of code when possible)
- **Provide clear description** of changes
- **Respond promptly** to feedback
- **Address all comments** before requesting re-review

#### For Reviewers

- **Review within 24 hours** when possible
- **Be constructive** in feedback
- **Check functionality**, not just code style
- **Approve when satisfied** with quality

### 4. Review Checklist

#### Functionality
- [ ] Code implements requirements correctly
- [ ] Edge cases are handled appropriately  
- [ ] Error handling is comprehensive
- [ ] Performance impact is acceptable

#### Code Quality
- [ ] Code is readable and well-structured
- [ ] Methods/functions have single responsibility
- [ ] Variable names are descriptive
- [ ] Comments explain complex logic

#### Testing
- [ ] Adequate test coverage
- [ ] Tests are meaningful and thorough
- [ ] Integration points are tested
- [ ] Error scenarios are covered

#### Security
- [ ] No hardcoded secrets or credentials
- [ ] Input validation is present
- [ ] Authentication/authorization checks
- [ ] SQL injection prevention

#### Performance
- [ ] No obvious performance issues
- [ ] Database queries are optimized
- [ ] Caching is utilized appropriately
- [ ] Memory leaks are prevented

## Code Quality Standards

### Static Analysis Tools

#### Java (SpotBugs)

```xml
<!-- pom.xml configuration -->
<plugin>
    <groupId>com.github.spotbugs</groupId>
    <artifactId>spotbugs-maven-plugin</artifactId>
    <version>4.7.3.0</version>
    <configuration>
        <effort>Max</effort>
        <threshold>Low</threshold>
        <xmlOutput>true</xmlOutput>
        <spotbugsXmlOutput>true</spotbugsXmlOutput>
    </configuration>
</plugin>
```

```bash
# Run SpotBugs analysis
mvn spotbugs:check

# Generate SpotBugs report
mvn spotbugs:gui
```

#### TypeScript (ESLint + Prettier)

```json
// .eslintrc.js
module.exports = {
  extends: [
    '@vue/eslint-config-typescript/recommended',
    '@vue/eslint-config-prettier'
  ],
  rules: {
    'vue/component-definition-name-casing': ['error', 'PascalCase'],
    'vue/component-name-in-template-casing': ['error', 'PascalCase'],
    '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'prefer-const': 'error',
    'no-var': 'error'
  }
}
```

```bash
# Run linting
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Check formatting
npm run format:check

# Fix formatting
npm run format
```

#### Rust (Clippy + Rustfmt)

```bash
# Run Clippy linting
cargo clippy -- -D warnings

# Format code
cargo fmt

# Check formatting
cargo fmt -- --check
```

### Performance Guidelines

#### Database Queries

```java
// Good: Use pagination for large result sets
@Query("SELECT d FROM Device d WHERE d.organizationId = :orgId")
Page<Device> findByOrganizationId(
    @Param("orgId") String organizationId, 
    Pageable pageable
);

// Good: Use indexes for common queries
@Index(def = "{'organizationId': 1, 'status': 1}")
public class Device {
    // ...
}

// Bad: N+1 query problem
// Use @EntityGraph or JOIN FETCH to solve
```

#### Frontend Performance

```typescript
// Good: Use computed properties for derived state
const filteredDevices = computed(() => 
  devices.value.filter(device => device.status === selectedStatus.value)
)

// Good: Debounce user input
import { debounce } from 'lodash-es'

const debouncedSearch = debounce((query: string) => {
  performSearch(query)
}, 300)

// Good: Lazy load components
const LazyDeviceDetails = defineAsyncComponent(() => 
  import('@/components/DeviceDetails.vue')
)
```

### Security Best Practices

#### Input Validation

```java
// Java validation
@RestController
@Validated
public class DeviceController {
    
    @PostMapping("/devices")
    public ResponseEntity<Device> createDevice(
        @Valid @RequestBody CreateDeviceRequest request
    ) {
        // Spring validation automatically validates @Valid objects
        return ResponseEntity.ok(deviceService.createDevice(request));
    }
}

@Data
@Builder
public class CreateDeviceRequest {
    @NotBlank(message = "Device name is required")
    @Size(min = 1, max = 100, message = "Device name must be between 1 and 100 characters")
    private String name;
    
    @NotBlank(message = "Organization ID is required")
    private String organizationId;
    
    @Pattern(regexp = "^(DESKTOP|SERVER|MOBILE)$", message = "Invalid device type")
    private String type;
}
```

#### SQL Injection Prevention

```java
// Good: Use parameterized queries
@Query("SELECT d FROM Device d WHERE d.name = :name AND d.organizationId = :orgId")
Optional<Device> findByNameAndOrganization(
    @Param("name") String name,
    @Param("orgId") String organizationId
);

// Bad: String concatenation (vulnerable to injection)
// Don't do this:
// @Query("SELECT d FROM Device d WHERE d.name = '" + name + "'")
```

#### Authentication & Authorization

```java
// Method-level security
@PreAuthorize("hasRole('ADMIN') or @deviceService.isOwner(#deviceId, authentication.name)")
public Device getDevice(String deviceId) {
    return deviceService.findById(deviceId);
}

// Custom security expression
@Component("deviceSecurity")
public class DeviceSecurityExpressionRoot {
    
    public boolean isOwner(String deviceId, String username) {
        Device device = deviceService.findById(deviceId);
        return device.getOrganization().getUsers().contains(username);
    }
}
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: Continuous Integration

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:7.0
        ports:
          - 27017:27017
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Set up JDK 21
        uses: actions/setup-java@v3
        with:
          java-version: '21'
          distribution: 'temurin'
      
      - name: Cache Maven dependencies
        uses: actions/cache@v3
        with:
          path: ~/.m2
          key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}
          restore-keys: ${{ runner.os }}-m2
      
      - name: Run backend tests
        run: mvn clean verify
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: openframe/services/openframe-frontend/package-lock.json
      
      - name: Install frontend dependencies
        run: |
          cd openframe/services/openframe-frontend
          npm ci
      
      - name: Run frontend tests
        run: |
          cd openframe/services/openframe-frontend
          npm run test:unit
          npm run lint
          npm run type-check
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: ./target/site/jacoco/jacoco.xml,./openframe/services/openframe-frontend/coverage/lcov.info

  security:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Run security scan
        uses: securecodewarrior/github-action-add-sarif@v1
        with:
          sarif-file: 'security-scan-results.sarif'
```

## Documentation Standards

### Code Documentation

#### Java (Javadoc)

```java
/**
 * Service for managing devices within the OpenFrame platform.
 * 
 * <p>This service handles device lifecycle operations including creation,
 * updates, status changes, and removal. It also manages device relationships
 * with organizations and integrates with external monitoring systems.
 * 
 * @author OpenFrame Team
 * @since 1.0.0
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DeviceService {
    
    /**
     * Creates a new device in the specified organization.
     * 
     * @param request the device creation request containing name, type, and organization
     * @return the created device with generated ID and default status
     * @throws IllegalArgumentException if the request is invalid
     * @throws OrganizationNotFoundException if the specified organization doesn't exist
     */
    public Device createDevice(CreateDeviceRequest request) {
        // Implementation
    }
}
```

#### TypeScript (TSDoc)

```typescript
/**
 * Composable for managing device state and operations.
 * 
 * @param filter - Optional reactive filter for device queries
 * @returns Object containing device state, computed properties, and methods
 * 
 * @example
 * ```typescript
 * const { devices, loading, updateDevice } = useDevices(
 *   ref({ status: 'ONLINE' })
 * )
 * ```
 */
export function useDevices(filter?: Ref<DeviceFilter>) {
  // Implementation
}

/**
 * Updates a device with the provided input.
 * 
 * @param deviceId - The unique identifier of the device
 * @param input - The update input containing fields to modify
 * @returns Promise resolving to operation result
 */
const updateDevice = async (deviceId: string, input: UpdateDeviceInput): Promise<OperationResult> => {
  // Implementation
}
```

### API Documentation

#### GraphQL Schema Documentation

```graphql
"""
Represents a managed device in the OpenFrame platform.
"""
type Device {
  """
  Unique identifier for the device.
  """
  id: ID!
  
  """
  Human-readable name of the device.
  """
  name: String!
  
  """
  Current operational status of the device.
  """
  status: DeviceStatus!
  
  """
  Timestamp when the device was last seen online.
  """
  lastSeen: DateTime
}

"""
Input type for creating a new device.
"""
input CreateDeviceInput {
  """
  Name of the device (1-100 characters).
  """
  name: String!
  
  """
  ID of the organization that owns this device.
  """
  organizationId: ID!
  
  """
  Type of device (DESKTOP, SERVER, MOBILE).
  """
  type: DeviceType!
}
```

## Release Process

### Version Management

OpenFrame uses Semantic Versioning (SemVer):

- **Major** (X.0.0): Breaking changes
- **Minor** (1.X.0): New features (backward compatible)
- **Patch** (1.0.X): Bug fixes

### Release Checklist

#### Pre-Release
- [ ] All tests pass on main branch
- [ ] Documentation updated
- [ ] Breaking changes documented
- [ ] Performance regression testing completed
- [ ] Security review completed

#### Release Creation
- [ ] Version bumped in all relevant files
- [ ] Git tag created with version number
- [ ] Release notes generated
- [ ] Docker images built and tagged
- [ ] Maven artifacts published

#### Post-Release
- [ ] Deployment to staging environment
- [ ] Smoke tests executed
- [ ] Production deployment
- [ ] Monitoring verification
- [ ] Community notification

## Getting Help

### Internal Resources

- **Architecture Questions**: Review [Architecture Overview](../architecture/overview.md)
- **Testing Help**: Reference [Testing Overview](../testing/overview.md)
- **Setup Issues**: Check [Environment Setup](../setup/environment.md)

### Community Support

- **OpenMSP Slack**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
- **GitHub Discussions**: For feature discussions and questions
- **GitHub Issues**: For bug reports and feature requests

### Code Review Support

If you need help with:

- **Code style questions**: Reference this guide or ask in Slack
- **Architecture decisions**: Discuss in GitHub Discussions
- **Testing strategies**: Review testing documentation
- **Performance concerns**: Create issue with performance label

---

**Contributing Guidelines Complete!** You're now ready to contribute effectively to OpenFrame. Remember: quality over speed, collaboration over isolation, and clarity over cleverness.