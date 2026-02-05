# Contributing Guidelines

Welcome to the OpenFrame contributor community! This guide covers everything you need to know about contributing to OpenFrame, from code style conventions to the pull request process.

## Getting Started as a Contributor

### Join the Community

Before making your first contribution, join our community:

- **OpenMSP Slack**: [Join here](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Website**: [openmsp.ai](https://www.openmsp.ai/)
- **Development coordination**: All happens on Slack (not GitHub Issues)

> **Important**: We manage all development discussions, questions, and coordination through our OpenMSP Slack community rather than GitHub Issues or Discussions.

### Development Setup

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
   cd openframe-oss-tenant
   
   # Add upstream remote
   git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git
   ```

2. **Set Up Development Environment**
   ```bash
   # Follow the environment setup guide
   # See docs/development/setup/environment.md
   
   # Install dependencies and start services
   docker compose up -d
   mvn clean install -DskipTests
   ./scripts/run-linux.sh --dev
   ```

3. **Verify Setup**
   ```bash
   # Run tests to ensure everything works
   mvn test
   cd openframe/services/openframe-frontend && npm test
   cd ../../clients/openframe-client && cargo test
   ```

## Code Style and Standards

### Java Code Style

#### Code Formatting
We use **Google Java Format** for consistent code styling:

```xml
<!-- pom.xml plugin configuration -->
<plugin>
    <groupId>com.diffplug.spotless</groupId>
    <artifactId>spotless-maven-plugin</artifactId>
    <version>2.40.0</version>
    <configuration>
        <java>
            <googleJavaFormat>
                <version>1.17.0</version>
                <style>GOOGLE</style>
            </googleJavaFormat>
        </java>
    </configuration>
</plugin>
```

**Apply formatting:**
```bash
# Check formatting
mvn spotless:check

# Apply formatting
mvn spotless:apply
```

#### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| **Classes** | PascalCase | `UserService`, `DeviceController` |
| **Methods** | camelCase | `createUser()`, `findDeviceById()` |
| **Variables** | camelCase | `userName`, `deviceList` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_RETRY_ATTEMPTS`, `DEFAULT_TIMEOUT` |
| **Packages** | lowercase.with.dots | `com.openframe.api.service` |

#### Code Structure Patterns

**Service Layer Pattern:**
```java
@Service
@Transactional
@Slf4j
public class DeviceService {
    
    private final DeviceRepository deviceRepository;
    private final DeviceMapper deviceMapper;
    private final List<DeviceProcessor> processors;
    
    public DeviceService(
            DeviceRepository deviceRepository,
            DeviceMapper deviceMapper,
            List<DeviceProcessor> processors) {
        this.deviceRepository = deviceRepository;
        this.deviceMapper = deviceMapper;
        this.processors = processors;
    }
    
    public DeviceResponse createDevice(CreateDeviceRequest request) {
        log.debug("Creating device with hostname: {}", request.getHostname());
        
        // Validation
        validateCreateRequest(request);
        
        // Business logic
        Device device = deviceMapper.toEntity(request);
        Device savedDevice = deviceRepository.save(device);
        
        // Post-processing
        processors.forEach(processor -> processor.afterCreate(savedDevice));
        
        return deviceMapper.toResponse(savedDevice);
    }
    
    private void validateCreateRequest(CreateDeviceRequest request) {
        Assert.hasText(request.getHostname(), "Hostname is required");
        Assert.notNull(request.getType(), "Device type is required");
    }
}
```

**Controller Pattern:**
```java
@RestController
@RequestMapping("/api/v1/devices")
@Validated
@Slf4j
public class DeviceController {
    
    private final DeviceService deviceService;
    
    public DeviceController(DeviceService deviceService) {
        this.deviceService = deviceService;
    }
    
    @PostMapping
    public ResponseEntity<DeviceResponse> createDevice(
            @Valid @RequestBody CreateDeviceRequest request,
            @AuthenticationPrincipal AuthPrincipal principal) {
        
        log.info("Creating device for organization: {}", principal.getOrganizationId());
        
        DeviceResponse response = deviceService.createDevice(request);
        
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }
}
```

### TypeScript/Vue Code Style

#### ESLint Configuration
We use ESLint with TypeScript and Vue-specific rules:

```json
// .eslintrc.js
{
  "extends": [
    "@vue/typescript/recommended",
    "@vue/prettier",
    "@vue/prettier/@typescript-eslint"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "vue/component-definition-name-casing": ["error", "PascalCase"],
    "vue/component-name-in-template-casing": ["error", "PascalCase"]
  }
}
```

#### Vue Component Structure
```vue
<template>
  <div class="device-list">
    <!-- Template content -->
    <DeviceItem
      v-for="device in devices"
      :key="device.id"
      :device="device"
      @update="handleDeviceUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { Device } from '@/types/device'
import DeviceItem from './DeviceItem.vue'
import { useDevicesStore } from '@/stores/devices'

// Props and emits
interface Props {
  organizationId?: string
  showOffline?: boolean
}

interface Emits {
  (e: 'deviceSelected', device: Device): void
}

const props = withDefaults(defineProps<Props>(), {
  showOffline: true
})

const emit = defineEmits<Emits>()

// Composables
const devicesStore = useDevicesStore()

// Reactive state
const loading = ref(false)

// Computed properties
const devices = computed(() => {
  return devicesStore.devices.filter(device => {
    if (!props.showOffline && device.status === 'offline') {
      return false
    }
    if (props.organizationId && device.organizationId !== props.organizationId) {
      return false
    }
    return true
  })
})

// Methods
const handleDeviceUpdate = (device: Device) => {
  devicesStore.updateDevice(device)
  emit('deviceSelected', device)
}

// Lifecycle
onMounted(async () => {
  loading.value = true
  try {
    await devicesStore.loadDevices()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.device-list {
  @apply space-y-4;
}
</style>
```

#### TypeScript Best Practices
```typescript
// Use proper type definitions
interface DeviceFilter {
  status?: DeviceStatus[]
  organizationId?: string
  hostname?: string
}

// Avoid 'any' type - use proper typing
type ApiResponse<T> = {
  data: T
  success: boolean
  error?: string
}

// Use utility types
type PartialDevice = Partial<Device>
type RequiredDeviceFields = Required<Pick<Device, 'hostname' | 'type'>>

// Proper error handling
const createDevice = async (request: CreateDeviceRequest): Promise<Device> => {
  try {
    const response = await api.post<ApiResponse<Device>>('/devices', request)
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create device')
    }
    
    return response.data.data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new Error(`Failed to create device: ${error}`)
  }
}
```

### Rust Code Style

#### Formatting and Linting
Use `rustfmt` and `clippy` for code quality:

```bash
# Format code
cargo fmt

# Run linter
cargo clippy -- -D warnings

# Fix automatically fixable issues
cargo clippy --fix
```

#### Code Structure Patterns
```rust
// src/services/device_service.rs
use crate::config::Config;
use crate::models::{Device, DeviceRegistrationRequest};
use anyhow::{Context, Result};
use tracing::{debug, error, info};

#[derive(Clone)]
pub struct DeviceService {
    config: Config,
    http_client: reqwest::Client,
}

impl DeviceService {
    pub fn new(config: Config) -> Self {
        let http_client = reqwest::Client::builder()
            .timeout(config.http_timeout)
            .build()
            .expect("Failed to create HTTP client");
            
        Self {
            config,
            http_client,
        }
    }
    
    pub async fn register_device(
        &self,
        request: DeviceRegistrationRequest,
    ) -> Result<Device> {
        debug!("Registering device: {}", request.hostname);
        
        let url = format!("{}/api/v1/devices", self.config.server_url);
        
        let response = self
            .http_client
            .post(&url)
            .json(&request)
            .send()
            .await
            .context("Failed to send registration request")?;
            
        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            
            error!("Device registration failed: {} - {}", status, body);
            anyhow::bail!("Registration failed with status: {}", status);
        }
        
        let device: Device = response
            .json()
            .await
            .context("Failed to parse registration response")?;
            
        info!("Device registered successfully: {}", device.id);
        Ok(device)
    }
}
```

#### Error Handling Patterns
```rust
use anyhow::{Context, Result};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DeviceError {
    #[error("Device not found: {hostname}")]
    NotFound { hostname: String },
    
    #[error("Invalid device configuration: {message}")]
    InvalidConfiguration { message: String },
    
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),
    
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

// Usage
pub async fn get_device(&self, hostname: &str) -> Result<Device, DeviceError> {
    let device = self
        .repository
        .find_by_hostname(hostname)
        .await?
        .ok_or_else(|| DeviceError::NotFound {
            hostname: hostname.to_string(),
        })?;
        
    Ok(device)
}
```

## Git Workflow

### Branch Naming Convention

| Branch Type | Pattern | Example |
|-------------|---------|---------|
| **Feature** | `feature/description` | `feature/user-authentication` |
| **Bug Fix** | `fix/description` | `fix/device-status-update` |
| **Hotfix** | `hotfix/description` | `hotfix/security-vulnerability` |
| **Refactor** | `refactor/description` | `refactor/database-layer` |
| **Documentation** | `docs/description` | `docs/api-documentation` |

### Commit Message Format

Follow the **Conventional Commits** specification:

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Commit Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or modifying tests
- **chore**: Build process or auxiliary tool changes

#### Examples
```bash
# Feature commit
feat(api): add device filtering by organization

Add ability to filter devices by organization ID in the devices endpoint.
Includes new query parameter and updated documentation.

Closes #123

# Bug fix commit
fix(frontend): resolve device status update race condition

The device status component was not properly handling rapid updates,
causing stale data to be displayed. Added proper debouncing and
state management to resolve the issue.

# Breaking change commit
feat(api)!: change device status enum values

BREAKING CHANGE: Device status enum values changed from 
uppercase to lowercase (ONLINE -> online, OFFLINE -> offline)
to maintain consistency across the API.
```

### Development Workflow

#### 1. Start New Work
```bash
# Sync with upstream
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/new-awesome-feature

# Push branch to your fork
git push -u origin feature/new-awesome-feature
```

#### 2. Make Changes
```bash
# Make your changes
# Write tests for your changes
# Ensure tests pass

# Stage and commit changes
git add .
git commit -m "feat(api): add new awesome feature

Detailed description of the changes made.

Closes #123"
```

#### 3. Keep Branch Updated
```bash
# Regularly sync with main
git fetch upstream
git rebase upstream/main

# Push updated branch (force push if rebased)
git push --force-with-lease origin feature/new-awesome-feature
```

#### 4. Prepare for Review
```bash
# Run all checks before creating PR
mvn clean test                           # Java tests
cd openframe/services/openframe-frontend && npm test    # Frontend tests
cd ../../../clients/openframe-client && cargo test      # Rust tests

# Check code formatting
mvn spotless:check                       # Java formatting
npm run lint:check                       # Frontend linting
cargo clippy -- -D warnings             # Rust linting
```

## Pull Request Process

### Before Creating a PR

1. **Run Full Test Suite**
   ```bash
   # Comprehensive testing
   mvn clean verify
   npm run test:e2e
   cargo test --all-features
   ```

2. **Check Code Quality**
   ```bash
   # Code formatting and linting
   mvn spotless:apply
   npm run lint:fix
   cargo fmt && cargo clippy --fix
   ```

3. **Update Documentation**
   - Update relevant documentation files
   - Add/update code comments
   - Update API documentation if needed

### PR Template

When creating a pull request, use this template:

```markdown
## Description
Brief description of the changes and why they were made.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Manual testing completed

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Additional Context
Add any other context about the PR here.
```

### Review Process

1. **Automated Checks**
   - All CI/CD checks must pass
   - Code coverage thresholds must be met
   - Security scans must pass

2. **Code Review**
   - At least one maintainer review required
   - Address all review comments
   - Maintain respectful discussion

3. **Testing**
   - Feature testing by reviewers
   - Regression testing if needed

### After Approval

```bash
# Squash and merge (preferred) or merge commit
# Delete feature branch after merge
git branch -d feature/new-awesome-feature
git push origin --delete feature/new-awesome-feature
```

## Code Review Guidelines

### As a Reviewer

#### Review Checklist
- [ ] **Functionality**: Does the code do what it's supposed to do?
- [ ] **Performance**: Are there any obvious performance issues?
- [ ] **Security**: Are there security concerns or vulnerabilities?
- [ ] **Style**: Does the code follow established conventions?
- [ ] **Tests**: Are there adequate tests for the changes?
- [ ] **Documentation**: Is documentation updated where needed?

#### Review Comments Best Practices

**Good Review Comments:**
```markdown
# Constructive suggestions
Consider using a Map here instead of nested loops for better performance.

# Ask questions for clarity
Could you explain why this approach was chosen over the alternative?

# Provide specific examples
This variable name could be more descriptive. Perhaps `userDeviceCount` instead of `count`?

# Acknowledge good work
Nice use of the builder pattern here - makes the code very readable!
```

**Avoid:**
```markdown
# Vague criticism
This is wrong.

# Nitpicking without value
Missing space after comma.

# Demanding without explanation
Change this.
```

### As an Author

#### Responding to Reviews
- **Be responsive**: Address comments promptly
- **Be gracious**: Thank reviewers for their time
- **Be thorough**: Explain your reasoning when asked
- **Be collaborative**: Consider suggestions seriously

#### Making Changes
```bash
# Make requested changes
git add .
git commit -m "address review comments: improve error handling"

# Push updates
git push origin feature/branch-name
```

## Testing Requirements

### Test Coverage Standards

All contributions must maintain or improve test coverage:

| Component | Minimum Coverage | Current |
|-----------|------------------|---------|
| **Backend Services** | 80% | 85% |
| **Frontend Components** | 70% | 78% |
| **Rust Client** | 80% | 82% |

### Required Tests

#### New Features
- **Unit tests** for all new functions/methods
- **Integration tests** for API endpoints
- **Component tests** for UI components
- **E2E tests** for critical user workflows

#### Bug Fixes
- **Regression tests** that would have caught the bug
- **Fix verification tests** that confirm the fix works

#### Example Test Structure
```java
// Java unit test
@Test
@DisplayName("Should create device when valid request provided")
void shouldCreateDeviceWhenValidRequest() {
    // Given
    CreateDeviceRequest request = DeviceTestDataBuilder.validRequest()
        .withHostname("test-server")
        .build();
        
    when(deviceRepository.save(any(Device.class)))
        .thenReturn(savedDevice);
    
    // When
    DeviceResponse response = deviceService.createDevice(request);
    
    // Then
    assertThat(response.getHostname()).isEqualTo("test-server");
    assertThat(response.getId()).isNotNull();
}
```

## Documentation Standards

### Code Documentation

#### Java Documentation
```java
/**
 * Creates a new device in the system.
 * 
 * @param request The device creation request containing hostname, type, and organization
 * @return DeviceResponse containing the created device information
 * @throws ValidationException when request data is invalid
 * @throws DuplicateDeviceException when device with same hostname already exists
 */
public DeviceResponse createDevice(CreateDeviceRequest request) {
    // Implementation
}
```

#### TypeScript Documentation
```typescript
/**
 * Fetches devices with optional filtering
 * 
 * @param filters - Optional filters to apply to device query
 * @param pagination - Pagination parameters
 * @returns Promise resolving to paginated device list
 * 
 * @example
 * ```typescript
 * const devices = await fetchDevices(
 *   { status: ['online'], organizationId: '123' },
 *   { page: 1, size: 20 }
 * )
 * ```
 */
export async function fetchDevices(
  filters?: DeviceFilters,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Device>> {
  // Implementation
}
```

#### Rust Documentation
```rust
/// Registers a new device with the OpenFrame platform.
/// 
/// # Arguments
/// 
/// * `request` - Device registration request containing hostname and platform info
/// 
/// # Returns
/// 
/// Returns `Ok(Device)` on successful registration, or an error if registration fails.
/// 
/// # Errors
/// 
/// This function will return an error if:
/// * Network request fails
/// * Server returns non-success status
/// * Response parsing fails
/// 
/// # Example
/// 
/// ```rust
/// let request = DeviceRegistrationRequest {
///     hostname: "server01".to_string(),
///     platform: "linux".to_string(),
/// };
/// 
/// let device = service.register_device(request).await?;
/// println!("Registered device: {}", device.id);
/// ```
pub async fn register_device(
    &self,
    request: DeviceRegistrationRequest,
) -> Result<Device> {
    // Implementation
}
```

### README and Documentation Updates

When adding new features, update relevant documentation:

1. **API Documentation**: Update OpenAPI specs
2. **User Guides**: Add new feature documentation
3. **Developer Docs**: Update architecture docs if needed
4. **README Files**: Update component READMEs

## Common Contribution Scenarios

### Adding a New API Endpoint

1. **Backend Changes**
   ```java
   // 1. Create DTO classes
   public class CreateWidgetRequest { }
   public class WidgetResponse { }
   
   // 2. Add service method
   @Service
   public class WidgetService {
       public WidgetResponse createWidget(CreateWidgetRequest request) { }
   }
   
   // 3. Add controller endpoint
   @RestController
   public class WidgetController {
       @PostMapping("/api/v1/widgets")
       public ResponseEntity<WidgetResponse> create(@Valid @RequestBody CreateWidgetRequest request) { }
   }
   
   // 4. Add tests
   @Test
   void shouldCreateWidget() { }
   ```

2. **Frontend Integration**
   ```typescript
   // 1. Add TypeScript types
   interface Widget {
     id: string
     name: string
   }
   
   // 2. Add API service
   export const widgetApi = {
     create: (widget: CreateWidgetRequest): Promise<Widget> => { }
   }
   
   // 3. Add store actions
   export const useWidgetsStore = defineStore('widgets', {
     actions: {
       async createWidget(request: CreateWidgetRequest) { }
     }
   })
   
   // 4. Add component
   <script setup lang="ts">
   // Component implementation
   </script>
   ```

### Adding a New Frontend Component

1. **Component Structure**
   ```vue
   <!-- WidgetCard.vue -->
   <template>
     <div class="widget-card">
       <!-- Component template -->
     </div>
   </template>
   
   <script setup lang="ts">
   // Component logic
   </script>
   
   <style scoped>
   .widget-card {
     /* Component styles */
   }
   </style>
   ```

2. **Component Tests**
   ```typescript
   // WidgetCard.test.ts
   describe('WidgetCard', () => {
     it('displays widget information', () => {
       const wrapper = mount(WidgetCard, {
         props: { widget: mockWidget }
       })
       
       expect(wrapper.text()).toContain(mockWidget.name)
     })
   })
   ```

3. **Storybook Story**
   ```typescript
   // WidgetCard.stories.ts
   export default {
     title: 'Components/WidgetCard',
     component: WidgetCard
   }
   
   export const Default = {
     args: {
       widget: { id: '1', name: 'Test Widget' }
     }
   }
   ```

## Getting Help

### Where to Ask Questions

1. **OpenMSP Slack**: Primary communication channel
   - `#general` - General questions
   - `#development` - Technical development questions
   - `#help` - Need help getting started

2. **Code Reviews**: Ask questions directly in PR comments

3. **Documentation**: Check existing documentation first

### Common Questions

**Q: How do I set up the development environment?**
A: Follow the [Environment Setup Guide](../setup/environment.md)

**Q: How do I run tests locally?**
A: See the [Testing Overview](../testing/overview.md)

**Q: What coding standards should I follow?**
A: This document covers all coding standards

**Q: How do I add a new database table/collection?**
A: Check the [Architecture Overview](../architecture/overview.md) for data patterns

## Contribution Recognition

Contributors are recognized through:

1. **Git History**: All contributions are tracked in Git
2. **Release Notes**: Major contributors mentioned in releases
3. **Community Recognition**: Acknowledgment in Slack community
4. **Maintainer Opportunities**: Active contributors may become maintainers

Thank you for contributing to OpenFrame! Your contributions help make OpenFrame better for the entire MSP community. 🚀

---

**Questions?** Join us on [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) - we're here to help!