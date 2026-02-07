# Contributing Guidelines

Welcome to the OpenFrame project! This guide outlines our development process, code standards, and contribution workflow. Whether you're fixing a bug, adding a feature, or improving documentation, these guidelines will help ensure your contributions integrate smoothly.

## Code of Conduct

OpenFrame follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/). By participating in this project, you agree to abide by its terms. We are committed to providing a welcoming and inclusive environment for all contributors.

## Getting Started

### Prerequisites for Contributors

Before contributing, ensure you have:

- ✅ Completed [Development Environment Setup](../setup/environment.md)
- ✅ Successfully run [Local Development Setup](../setup/local-development.md)  
- ✅ Read the [Architecture Overview](../architecture/overview.md)
- ✅ Joined the [OpenMSP Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

### Types of Contributions

We welcome various types of contributions:

| Type | Description | Examples |
|------|-------------|----------|
| **🐛 Bug Fixes** | Fix existing functionality | Resolve crashes, incorrect behavior |
| **✨ Features** | Add new capabilities | New APIs, UI components, integrations |
| **📚 Documentation** | Improve project documentation | Tutorials, API docs, architecture diagrams |
| **🔧 Improvements** | Enhance existing features | Performance optimizations, UX improvements |
| **🧪 Testing** | Add or improve tests | Unit tests, integration tests, E2E tests |
| **🎨 UI/UX** | Frontend and design improvements | Component styling, user experience |

## Development Workflow

### 1. Issue Management

#### Before Starting Work

1. **Check existing issues**: Search [GitHub Issues](https://github.com/flamingo-stack/openframe-oss-tenant/issues)
2. **Create new issue if needed**: Use issue templates for bug reports or feature requests
3. **Discuss in community**: For significant changes, discuss in [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
4. **Get assignment**: Comment on the issue to get it assigned to you

#### Issue Templates

**Bug Report Template:**
```markdown
**Bug Description**
A clear description of what the bug is.

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. See error

**Expected Behavior**
What you expected to happen.

**Screenshots/Logs**
If applicable, add screenshots or error logs.

**Environment**
- OS: [e.g. macOS 13.0]
- Java Version: [e.g. 21.0.1]
- Browser: [e.g. Chrome 119]
```

**Feature Request Template:**
```markdown
**Feature Description**
A clear description of the feature you'd like to see.

**Use Case**
Describe the problem this feature would solve.

**Proposed Solution**
Your proposed approach to implementing this feature.

**Alternative Solutions**
Any alternative approaches you've considered.
```

### 2. Branch Strategy

OpenFrame uses a **Git Flow** inspired branching strategy:

```mermaid
gitgraph
    commit id: "Initial"
    branch develop
    checkout develop
    commit id: "Dev work"
    
    branch feature/user-management
    checkout feature/user-management
    commit id: "Add user API"
    commit id: "Add user UI"
    
    checkout develop
    merge feature/user-management
    
    branch release/v1.2.0
    checkout release/v1.2.0
    commit id: "Version bump"
    commit id: "Bug fixes"
    
    checkout main
    merge release/v1.2.0
    tag: "v1.2.0"
    
    checkout develop
    merge release/v1.2.0
```

#### Branch Naming Convention

| Branch Type | Pattern | Example | Purpose |
|-------------|---------|---------|---------|
| **Feature** | `feature/<description>` | `feature/device-monitoring` | New features |
| **Bug Fix** | `fix/<description>` | `fix/login-redirect-issue` | Bug fixes |
| **Hotfix** | `hotfix/<description>` | `hotfix/security-vulnerability` | Critical production fixes |
| **Docs** | `docs/<description>` | `docs/api-documentation` | Documentation updates |
| **Chore** | `chore/<description>` | `chore/dependency-updates` | Maintenance tasks |

### 3. Development Process

#### Step-by-Step Workflow

```bash
# 1. Create and checkout feature branch
git checkout -b feature/your-feature-name

# 2. Make your changes
# - Write code following our style guidelines
# - Add tests for new functionality
# - Update documentation if needed

# 3. Run tests locally
mvn test                                    # Java tests
cd openframe/services/openframe-frontend   
npm run test:unit                          # Frontend tests
cd clients/openframe-client
cargo test                                 # Rust tests

# 4. Check code quality
mvn checkstyle:check                       # Java style check
npm run lint                               # Frontend linting
cargo clippy                               # Rust linting

# 5. Commit your changes
git add .
git commit -m "feat: add device monitoring feature"

# 6. Push branch
git push origin feature/your-feature-name

# 7. Create Pull Request
# Open GitHub and create PR from your branch to develop
```

## Code Standards

### Java/Spring Boot Standards

#### Code Style
We follow **Google Java Style Guide** with OpenFrame-specific modifications:

```java
// ✅ Good: Proper class structure
@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
@Slf4j
public class DeviceController {
    
    private final DeviceService deviceService;
    private final DeviceMapper deviceMapper;
    
    @GetMapping("/{id}")
    @PreAuthorize("hasPermission(#id, 'Device', 'READ')")
    public ResponseEntity<DeviceDto> getDevice(@PathVariable String id) {
        log.debug("Fetching device with ID: {}", id);
        
        Device device = deviceService.findById(id)
            .orElseThrow(() -> new DeviceNotFoundException(id));
        
        DeviceDto dto = deviceMapper.toDto(device);
        return ResponseEntity.ok(dto);
    }
}
```

#### Key Java Conventions

1. **Use Constructor Injection**
```java
// ✅ Good
@RequiredArgsConstructor
public class DeviceService {
    private final DeviceRepository deviceRepository;
}

// ❌ Bad
@Service
public class DeviceService {
    @Autowired
    private DeviceRepository deviceRepository;
}
```

2. **Use Records for DTOs**
```java
// ✅ Good
public record CreateDeviceRequest(
    @NotBlank String name,
    @NotNull DeviceType type,
    @NotBlank String organizationId
) {}

// ❌ Bad
public class CreateDeviceRequest {
    private String name;
    private DeviceType type;
    // ... getters/setters
}
```

3. **Proper Exception Handling**
```java
// ✅ Good
@ControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(DeviceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleDeviceNotFound(DeviceNotFoundException ex) {
        ErrorResponse error = ErrorResponse.builder()
            .message("Device not found")
            .code("DEVICE_NOT_FOUND")
            .timestamp(Instant.now())
            .build();
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }
}
```

### TypeScript/Vue.js Standards

#### Code Style
We use **Prettier** and **ESLint** for consistent formatting:

```typescript
// ✅ Good: Proper Vue 3 Composition API component
<template>
  <div class="device-card" :class="cardClasses">
    <h3 class="device-card__name">{{ device.name }}</h3>
    <DeviceStatus :status="device.status" />
    <DeviceActions 
      :device="device" 
      @update="handleUpdate"
      @delete="handleDelete" 
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Device } from '@/types/device'

interface Props {
  device: Device
}

interface Emits {
  (event: 'update', device: Device): void
  (event: 'delete', deviceId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const cardClasses = computed(() => ({
  'device-card--online': props.device.status === 'online',
  'device-card--offline': props.device.status === 'offline'
}))

const handleUpdate = (updatedDevice: Device) => {
  emit('update', updatedDevice)
}

const handleDelete = () => {
  emit('delete', props.device.id)
}
</script>

<style scoped>
.device-card {
  @apply border rounded-lg p-4 transition-all;
  
  &--online {
    @apply border-green-200 bg-green-50;
  }
  
  &--offline {
    @apply border-red-200 bg-red-50;
  }
  
  &__name {
    @apply text-lg font-semibold mb-2;
  }
}
</style>
```

#### Key Frontend Conventions

1. **Use Composition API with `<script setup>`**
```typescript
// ✅ Good
<script setup lang="ts">
import { ref, computed } from 'vue'

const count = ref(0)
const doubled = computed(() => count.value * 2)
</script>

// ❌ Bad
<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  data() {
    return { count: 0 }
  }
})
</script>
```

2. **Use TypeScript Interfaces**
```typescript
// ✅ Good
interface Device {
  id: string
  name: string
  status: 'online' | 'offline' | 'warning'
  type: DeviceType
  organizationId: string
  lastSeen: string
}

// ❌ Bad
const device = {
  id: 'string',
  name: 'string'
  // ... no type safety
}
```

3. **Use Pinia for State Management**
```typescript
// ✅ Good
import { defineStore } from 'pinia'

export const useDeviceStore = defineStore('devices', () => {
  const devices = ref<Device[]>([])
  const loading = ref(false)
  
  const fetchDevices = async () => {
    loading.value = true
    try {
      const response = await deviceApi.getDevices()
      devices.value = response.data
    } finally {
      loading.value = false
    }
  }
  
  return { devices, loading, fetchDevices }
})
```

### Rust Standards

#### Code Style
We follow standard Rust conventions with `rustfmt` and `clippy`:

```rust
// ✅ Good: Proper Rust structure
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use tokio::time::{interval, Duration};
use tracing::{info, warn, error};

#[derive(Debug, Serialize, Deserialize)]
pub struct HeartbeatMessage {
    pub device_id: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub status: DeviceStatus,
    pub metrics: SystemMetrics,
}

#[derive(Debug, Clone)]
pub struct AgentService {
    client: ApiClient,
    config: AgentConfig,
}

impl AgentService {
    pub fn new(client: ApiClient, config: AgentConfig) -> Self {
        Self { client, config }
    }
    
    pub async fn start_heartbeat_loop(&self) -> Result<()> {
        let mut interval = interval(Duration::from_secs(self.config.heartbeat_interval));
        
        loop {
            interval.tick().await;
            
            if let Err(e) = self.send_heartbeat().await {
                warn!("Failed to send heartbeat: {}", e);
                // Continue the loop, don't fail completely
            }
        }
    }
    
    async fn send_heartbeat(&self) -> Result<()> {
        let message = HeartbeatMessage {
            device_id: self.config.device_id.clone(),
            timestamp: chrono::Utc::now(),
            status: self.get_device_status().await?,
            metrics: self.collect_metrics().await?,
        };
        
        self.client
            .send_heartbeat(&message)
            .await
            .context("Failed to send heartbeat to server")?;
        
        info!("Heartbeat sent successfully");
        Ok(())
    }
}
```

#### Key Rust Conventions

1. **Proper Error Handling**
```rust
// ✅ Good: Use anyhow for applications
use anyhow::{Context, Result};

pub async fn fetch_data() -> Result<Data> {
    let response = client
        .get("/api/data")
        .await
        .context("Failed to fetch data from API")?;
    
    response
        .json()
        .await
        .context("Failed to parse response JSON")
}

// ✅ Good: Use thiserror for libraries
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AgentError {
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),
    
    #[error("Configuration error: {message}")]
    Config { message: String },
}
```

2. **Use Proper Async Patterns**
```rust
// ✅ Good: Proper async/await usage
pub async fn process_events(mut receiver: UnboundedReceiver<Event>) {
    while let Some(event) = receiver.recv().await {
        tokio::spawn(async move {
            if let Err(e) = handle_event(event).await {
                error!("Failed to handle event: {}", e);
            }
        });
    }
}
```

## Testing Requirements

### Test Coverage Expectations

| Component Type | Minimum Coverage | Test Types Required |
|---------------|------------------|-------------------|
| **Service Layer** | 85% | Unit + Integration |
| **Controller Layer** | 80% | Integration + E2E |
| **Repository Layer** | 90% | Integration |
| **Frontend Components** | 75% | Unit + Integration |
| **Utilities** | 95% | Unit |

### Writing Tests

#### Java Test Example
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
    @DisplayName("Should create device and publish creation event")
    void shouldCreateDeviceAndPublishCreationEvent() {
        // Given
        CreateDeviceRequest request = CreateDeviceRequest.builder()
            .name("Test Device")
            .type(DeviceType.DESKTOP)
            .organizationId("org123")
            .build();
        
        Device savedDevice = Device.builder()
            .id("device123")
            .name("Test Device")
            .status(DeviceStatus.ONLINE)
            .build();
        
        when(deviceRepository.save(any(Device.class)))
            .thenReturn(savedDevice);
        
        // When
        Device result = deviceService.createDevice(request);
        
        // Then
        assertThat(result)
            .isNotNull()
            .hasFieldOrPropertyWithValue("name", "Test Device")
            .hasFieldOrPropertyWithValue("status", DeviceStatus.ONLINE);
        
        verify(eventPublisher).publishEvent(argThat(event -> 
            event instanceof DeviceCreatedEvent && 
            ((DeviceCreatedEvent) event).getDeviceId().equals("device123")
        ));
    }
}
```

#### Frontend Test Example
```typescript
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DeviceCard from '@/components/DeviceCard.vue'

describe('DeviceCard', () => {
  const mockDevice = {
    id: 'device-1',
    name: 'Test Device',
    status: 'online' as const,
    type: 'desktop' as const,
    organizationId: 'org-1',
    lastSeen: new Date().toISOString()
  }

  it('should render device information correctly', () => {
    const wrapper = mount(DeviceCard, {
      props: { device: mockDevice }
    })

    expect(wrapper.text()).toContain('Test Device')
    expect(wrapper.find('[data-testid="device-status"]')).toBeTruthy()
    expect(wrapper.classes()).toContain('device-card--online')
  })

  it('should emit update event when device is modified', async () => {
    const wrapper = mount(DeviceCard, {
      props: { device: mockDevice }
    })

    const updatedDevice = { ...mockDevice, name: 'Updated Device' }
    await wrapper.vm.$emit('update', updatedDevice)

    expect(wrapper.emitted('update')).toBeTruthy()
    expect(wrapper.emitted('update')?.[0]).toEqual([updatedDevice])
  })
})
```

## Commit Message Convention

We follow **Conventional Commits** specification:

### Commit Message Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type | Description | Example |
|------|-------------|---------|
| **feat** | New feature | `feat(auth): add SSO login support` |
| **fix** | Bug fix | `fix(api): resolve device query timeout` |
| **docs** | Documentation changes | `docs(readme): update installation guide` |
| **style** | Code style changes | `style(frontend): fix linting errors` |
| **refactor** | Code refactoring | `refactor(service): simplify device validation` |
| **test** | Adding or fixing tests | `test(api): add device controller tests` |
| **chore** | Maintenance tasks | `chore(deps): update spring boot to 3.2.0` |
| **perf** | Performance improvements | `perf(query): optimize device search query` |
| **ci** | CI/CD changes | `ci(github): add security scanning workflow` |

### Commit Examples

```bash
# Feature addition
git commit -m "feat(devices): add real-time device monitoring

- Implement WebSocket connection for live updates
- Add device status indicators to UI
- Include heartbeat mechanism for agents

Closes #123"

# Bug fix
git commit -m "fix(auth): resolve token expiration handling

The JWT token refresh was failing when tokens expired during
active sessions. This fix implements proper token refresh logic
with automatic retry.

Fixes #456"

# Breaking change
git commit -m "feat(api)!: update device API response format

BREAKING CHANGE: Device API now returns ISO 8601 timestamps
instead of Unix timestamps. Update clients accordingly.

Migration guide available in docs/migration/v2.0.md"
```

## Pull Request Process

### PR Checklist

Before submitting a Pull Request, ensure:

- [ ] **Code follows style guidelines** (run linters)
- [ ] **Tests are written and passing** (unit + integration)
- [ ] **Documentation is updated** (if applicable)
- [ ] **Commit messages follow convention**
- [ ] **No merge conflicts** with target branch
- [ ] **PR description is complete**

### PR Template

```markdown
## Description
Brief summary of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots or videos demonstrating the change.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added and passing

## Related Issues
Closes #123
Fixes #456
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs automatically
2. **Code Review**: At least one maintainer review required
3. **Testing**: Ensure all tests pass
4. **Approval**: Maintainer approval before merge

### Review Guidelines for Reviewers

#### What to Look For

**Code Quality**
- [ ] Code follows established patterns and conventions
- [ ] Proper error handling implemented
- [ ] No obvious security vulnerabilities
- [ ] Performance considerations addressed

**Testing**
- [ ] Adequate test coverage for new functionality
- [ ] Tests actually test the intended behavior
- [ ] Edge cases considered and tested

**Documentation**
- [ ] Public APIs documented
- [ ] Complex business logic explained
- [ ] Breaking changes clearly noted

#### Review Comments

```markdown
# 🎯 Suggestion
Consider using a switch expression here for better readability:

```java
return switch (deviceType) {
    case DESKTOP -> new DesktopValidator();
    case LAPTOP -> new LaptopValidator();
    case SERVER -> new ServerValidator();
};
```

# ⚠️ Issue
This could cause a memory leak. The connection should be closed in a finally block.

# ✅ Praise
Great use of the builder pattern here! This makes the code much more readable.

# ❓ Question  
Is there a reason we're not using the existing UserService.validateEmail() method here?
```

## Release Process

### Version Strategy

OpenFrame follows **Semantic Versioning (SemVer)**:

```text
MAJOR.MINOR.PATCH

MAJOR: Breaking API changes
MINOR: New features, backwards compatible
PATCH: Bug fixes, backwards compatible

Examples:
1.0.0 → 1.0.1 (patch: bug fix)
1.0.1 → 1.1.0 (minor: new feature)
1.1.0 → 2.0.0 (major: breaking change)
```

### Release Checklist

#### Pre-Release
- [ ] All tests passing on develop branch
- [ ] Documentation updated
- [ ] Migration guides written (if breaking changes)
- [ ] Security review completed
- [ ] Performance benchmarks validated

#### Release Creation
```bash
# 1. Create release branch
git checkout -b release/v1.2.0 develop

# 2. Update version numbers
mvn versions:set -DnewVersion=1.2.0
npm version 1.2.0

# 3. Update CHANGELOG.md
# Add release notes and breaking changes

# 4. Create release commit
git commit -m "chore(release): version 1.2.0"

# 5. Merge to main and tag
git checkout main
git merge release/v1.2.0
git tag v1.2.0

# 6. Merge back to develop
git checkout develop  
git merge release/v1.2.0

# 7. Push everything
git push origin main develop --tags
```

## Community and Support

### Communication Channels

- 💬 **Primary Discussion**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- 🐛 **Bug Reports**: GitHub Issues
- 🔧 **Feature Requests**: GitHub Issues
- 📖 **Documentation**: GitHub Wiki and docs folder

### Getting Help

1. **Check Documentation**: Search existing docs and issues
2. **Ask in Slack**: Post in `#dev` channel for development questions
3. **Create Issue**: For bugs or feature requests
4. **Mentorship**: Reach out to maintainers for guidance

### Recognition

Contributors are recognized through:
- GitHub contributor credits
- Slack community shoutouts  
- Annual contributor acknowledgments
- Opportunities to become maintainers

---

Thank you for contributing to OpenFrame! Your efforts help make MSP operations more efficient and accessible for everyone. 🚀