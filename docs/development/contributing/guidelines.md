# Contributing Guidelines

Welcome to the OpenFrame contributor community! This guide provides everything you need to know about contributing to OpenFrame, from code style conventions to the pull request process.

## Getting Started

### Contributor Onboarding

1. **Join the Community**: Connect with us on [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
2. **Set Up Development Environment**: Follow the [Environment Setup](../setup/environment.md) guide
3. **Understand the Architecture**: Review the [Architecture Overview](../architecture/overview.md)
4. **Find Your First Issue**: Look for issues labeled `good first issue` on GitHub

### Ways to Contribute

| Contribution Type | Examples | Skill Level |
|-------------------|----------|-------------|
| **Bug Fixes** | Fix service crashes, UI bugs, data inconsistencies | Beginner+ |
| **Feature Development** | New API endpoints, UI components, integrations | Intermediate+ |
| **Documentation** | Tutorials, API docs, architecture guides | Any |
| **Testing** | Unit tests, E2E tests, performance tests | Intermediate+ |
| **Infrastructure** | CI/CD improvements, Docker configs, Kubernetes manifests | Advanced |
| **Design** | UI/UX improvements, accessibility enhancements | Design + Frontend |

## Code Style and Conventions

### Java Code Style

#### Formatting Standards

We follow Google Java Style Guide with minor modifications:

```java
// ✅ Good: Proper formatting and naming
@RestController
@RequestMapping("/api/devices")
public class DeviceController {
    
    private final DeviceService deviceService;
    private final EventPublisher eventPublisher;
    
    public DeviceController(DeviceService deviceService, 
                          EventPublisher eventPublisher) {
        this.deviceService = deviceService;
        this.eventPublisher = eventPublisher;
    }
    
    @GetMapping("/{deviceId}")
    public ResponseEntity<DeviceResponse> getDevice(
            @PathVariable String deviceId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        
        Device device = deviceService.findByIdAndTenantId(
            deviceId, 
            principal.getTenantId()
        );
        
        return ResponseEntity.ok(DeviceResponse.from(device));
    }
}
```

#### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| **Classes** | PascalCase | `DeviceService`, `UserController` |
| **Methods** | camelCase | `findByTenantId()`, `createDevice()` |
| **Variables** | camelCase | `deviceId`, `tenantId` |
| **Constants** | UPPER_SNAKE_CASE | `DEFAULT_PAGE_SIZE`, `MAX_RETRY_ATTEMPTS` |
| **Packages** | lowercase.with.dots | `com.openframe.api.service` |

#### Documentation Standards

```java
/**
 * Manages device lifecycle operations within a tenant context.
 * 
 * <p>This service provides CRUD operations for devices and ensures
 * proper tenant isolation for all operations. All methods require
 * a valid tenant context.</p>
 * 
 * @author OpenFrame Team
 * @since 1.0.0
 */
@Service
@Transactional
public class DeviceService {
    
    /**
     * Finds a device by ID within the specified tenant.
     * 
     * @param deviceId the unique device identifier
     * @param tenantId the tenant context
     * @return the device if found
     * @throws DeviceNotFoundException if device not found or not accessible
     * @throws IllegalArgumentException if parameters are null or empty
     */
    public Device findByIdAndTenantId(String deviceId, String tenantId) {
        // Implementation
    }
}
```

### Frontend Code Style (TypeScript/Vue.js)

#### Component Structure

```vue
<!-- ✅ Good: Well-structured Vue component -->
<template>
  <div class="device-card" :class="deviceStatusClass">
    <div class="device-header">
      <h3 class="device-name" data-testid="device-name">
        {{ device.name }}
      </h3>
      <DeviceStatusBadge :status="device.status" />
    </div>
    
    <div class="device-actions">
      <Button
        variant="primary"
        size="sm"
        @click="handleDeviceAction('restart')"
        data-testid="restart-button"
      >
        Restart
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Device } from '@/types/device'
import DeviceStatusBadge from './DeviceStatusBadge.vue'
import Button from '@/components/ui/Button.vue'

interface Props {
  device: Device
}

interface Emits {
  (e: 'device-action', action: string, deviceId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const deviceStatusClass = computed(() => ({
  'device-card--online': props.device.status === 'online',
  'device-card--offline': props.device.status === 'offline',
  'device-card--warning': props.device.status === 'warning'
}))

const handleDeviceAction = (action: string): void => {
  emit('device-action', action, props.device.id)
}
</script>

<style scoped>
.device-card {
  @apply p-4 border border-gray-200 rounded-lg bg-white shadow-sm;
}

.device-card--online {
  @apply border-green-200 bg-green-50;
}

.device-card--offline {
  @apply border-red-200 bg-red-50;
}

.device-name {
  @apply text-lg font-semibold text-gray-900;
}
</style>
```

#### TypeScript Standards

```typescript
// ✅ Good: Proper TypeScript usage
import type { ComputedRef, Ref } from 'vue'

// Define interfaces for complex objects
interface Device {
  readonly id: string
  readonly name: string
  readonly status: DeviceStatus
  readonly type: DeviceType
  readonly lastSeen: string
  readonly metadata?: DeviceMetadata
}

// Use union types for constrained values
type DeviceStatus = 'online' | 'offline' | 'warning' | 'error'
type DeviceType = 'workstation' | 'server' | 'mobile' | 'iot'

// Generic types for reusable patterns
interface ApiResponse<T> {
  data: T
  status: number
  message?: string
}

// Composable function with proper typing
export function useDeviceActions() {
  const isLoading: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)
  
  const restartDevice = async (deviceId: string): Promise<void> => {
    isLoading.value = true
    error.value = null
    
    try {
      await deviceApi.restartDevice(deviceId)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      isLoading.value = false
    }
  }
  
  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    restartDevice
  }
}
```

### Rust Code Style

#### Formatting and Structure

```rust
// ✅ Good: Rust code following conventions
use std::time::Duration;
use tokio::time;
use serde::{Deserialize, Serialize};
use tracing::{error, info, warn};

/// Configuration for the OpenFrame agent.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    /// URL of the OpenFrame server
    pub server_url: String,
    /// Interval between metric collection cycles
    pub metrics_interval: Duration,
    /// Directory for storing agent data
    pub data_dir: std::path::PathBuf,
    /// Maximum number of retry attempts
    pub max_retries: u32,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            server_url: "http://localhost:8080".to_string(),
            metrics_interval: Duration::from_secs(30),
            data_dir: std::path::PathBuf::from("/opt/openframe/data"),
            max_retries: 3,
        }
    }
}

/// System metrics collected by the agent.
#[derive(Debug, Serialize, Deserialize)]
pub struct SystemMetrics {
    pub cpu_usage_percent: f64,
    pub memory_usage_bytes: u64,
    pub disk_usage: Vec<DiskUsage>,
    pub network_interfaces: Vec<NetworkInterface>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

impl SystemMetrics {
    /// Collects current system metrics.
    /// 
    /// # Errors
    /// 
    /// Returns an error if system information cannot be retrieved.
    pub async fn collect() -> Result<Self, MetricsError> {
        let cpu_usage = collect_cpu_usage().await?;
        let memory_usage = collect_memory_usage()?;
        let disk_usage = collect_disk_usage()?;
        let network_interfaces = collect_network_interfaces()?;
        
        Ok(Self {
            cpu_usage_percent: cpu_usage,
            memory_usage_bytes: memory_usage,
            disk_usage,
            network_interfaces,
            timestamp: chrono::Utc::now(),
        })
    }
}

#[derive(Debug, thiserror::Error)]
pub enum MetricsError {
    #[error("Failed to collect CPU metrics: {0}")]
    CpuCollection(String),
    #[error("Failed to collect memory metrics: {0}")]
    MemoryCollection(String),
    #[error("System information unavailable")]
    SystemUnavailable,
}
```

## Branch Naming and Workflow

### Branch Naming Convention

Use the following pattern for branch names:

```bash
<type>/<short-description>

# Examples:
feature/add-device-filtering
fix/api-authentication-bug
docs/update-contributing-guide
refactor/simplify-user-service
test/add-integration-tests
chore/update-dependencies
```

### Branch Types

| Type | Purpose | Example |
|------|---------|---------|
| `feature/` | New features or enhancements | `feature/mingo-chat-integration` |
| `fix/` | Bug fixes | `fix/device-status-sync-issue` |
| `docs/` | Documentation changes | `docs/api-reference-updates` |
| `refactor/` | Code refactoring without functional changes | `refactor/extract-device-service` |
| `test/` | Adding or improving tests | `test/e2e-device-management` |
| `chore/` | Maintenance tasks | `chore/upgrade-spring-boot-version` |
| `hotfix/` | Critical production fixes | `hotfix/security-vulnerability-patch` |

### Git Workflow

#### 1. Feature Development Workflow

```bash
# 1. Create and switch to feature branch
git checkout -b feature/add-awesome-feature

# 2. Make your changes
# ... code, test, commit ...

# 3. Keep branch up to date
git fetch origin
git rebase origin/main

# 4. Push branch
git push origin feature/add-awesome-feature

# 5. Create pull request on GitHub
```

#### 2. Hotfix Workflow

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-fix

# 2. Make minimal fix
# ... fix, test, commit ...

# 3. Push and create PR for immediate review
git push origin hotfix/critical-security-fix
```

## Commit Message Format

### Conventional Commits

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(api): add device filtering endpoint` |
| `fix` | Bug fix | `fix(auth): resolve JWT expiration handling` |
| `docs` | Documentation changes | `docs(readme): update installation instructions` |
| `style` | Code formatting changes | `style(frontend): format Vue components` |
| `refactor` | Code refactoring | `refactor(service): extract common validation logic` |
| `test` | Adding/updating tests | `test(integration): add device API tests` |
| `chore` | Maintenance tasks | `chore(deps): update Spring Boot to 3.3.1` |

#### Examples

```bash
# ✅ Good commit messages
feat(api): add GraphQL device filtering with tenant isolation

fix(frontend): resolve device status badge color inconsistency
- Status colors now match design system
- Added proper contrast ratios for accessibility
- Updated unit tests for badge component

docs(contributing): add branch naming conventions
- Clarify feature branch workflow  
- Add examples for each branch type
- Document commit message format

test(e2e): add device management user workflows
- Test device creation and deletion
- Verify remote access functionality
- Add error handling scenarios

chore(docker): update base images to latest LTS versions
- Update Java base image to openjdk:21-jre-slim
- Update Node.js base image to node:20-alpine
- Update MongoDB to version 7.0

# ❌ Poor commit messages (avoid these)
fix: stuff
update code
WIP
fixed it
misc changes
```

## Pull Request Process

### Before Creating a Pull Request

#### Pre-submission Checklist

- [ ] **Code Quality**: Code follows style guidelines and is properly formatted
- [ ] **Tests**: New features include unit tests, bug fixes include regression tests
- [ ] **Documentation**: Public APIs are documented, README updated if needed
- [ ] **Build**: All services build successfully without warnings
- [ ] **Tests Pass**: All existing tests continue to pass
- [ ] **Lint**: Code passes all linting checks
- [ ] **Security**: No secrets or credentials committed
- [ ] **Performance**: Changes don't introduce performance regressions

#### Running Pre-commit Checks

```bash
# Format and lint Java code
mvn spotless:apply
mvn checkstyle:check

# Format and lint frontend code
cd openframe/services/openframe-frontend
npm run lint:fix
npm run format

# Format Rust code
cd clients/openframe-client
cargo fmt

# Run all tests
mvn test                           # Java tests
npm run test                       # Frontend tests  
cargo test                         # Rust tests

# Build all components
mvn clean install -DskipTests      # Java services
npm run build                      # Frontend
cargo build --release             # Rust agent
```

### Pull Request Template

When creating a pull request, use this template:

```markdown
## Description

Brief description of changes and motivation.

Fixes #(issue number)

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Changes Made

### Backend Changes
- List specific changes to Java services
- Include API modifications
- Note database schema changes

### Frontend Changes  
- List UI/UX changes
- Note new components or pages
- Include accessibility improvements

### Infrastructure Changes
- Docker/Kubernetes changes
- CI/CD pipeline updates
- Configuration changes

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing performed

### Test Scenarios
1. **Scenario 1**: Description and expected outcome
2. **Scenario 2**: Description and expected outcome
3. **Error Cases**: How errors are handled

## Screenshots (if applicable)

### Before
![Before Screenshot](url)

### After  
![After Screenshot](url)

## Performance Impact

- [ ] No performance impact
- [ ] Performance improved
- [ ] Performance impact assessed and acceptable
- [ ] Performance benchmarks included

## Security Considerations

- [ ] No security implications
- [ ] Security review completed
- [ ] Authentication/authorization changes reviewed
- [ ] Input validation added/updated

## Breaking Changes

List any breaking changes and migration steps:

1. **Change 1**: Description and required actions
2. **Change 2**: Description and required actions

## Deployment Notes

Special deployment considerations:
- Database migrations required: Yes/No
- Configuration updates needed: Yes/No
- Service restart required: Yes/No
- Dependencies to deploy first: List services

## Checklist

- [ ] Self-review of code completed
- [ ] Code follows project style guidelines
- [ ] Tests added and passing
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] Branch is up to date with main
```

### Review Process

#### Automated Checks

All pull requests must pass:

1. **Build Checks**: All services compile successfully
2. **Test Suites**: Unit, integration, and E2E tests pass
3. **Code Quality**: Linting, formatting, and style checks
4. **Security Scans**: Dependency vulnerability and SAST scans
5. **Performance Tests**: No significant regressions

#### Human Review Requirements

| Change Type | Required Reviewers | Review Focus |
|-------------|-------------------|--------------|
| **Bug Fix** | 1 core maintainer | Logic correctness, test coverage |
| **Small Feature** | 1-2 maintainers | Design approach, implementation quality |
| **Large Feature** | 2+ maintainers + architect | Architecture alignment, scalability |
| **Breaking Change** | 3+ maintainers + lead | Impact assessment, migration plan |
| **Security Change** | Security team member | Threat model, vulnerability analysis |
| **Performance Change** | Performance team member | Benchmarks, scalability implications |

#### Review Criteria

Reviewers will evaluate:

1. **Correctness**: Does the code work as intended?
2. **Design**: Is the solution well-architected?
3. **Readability**: Is the code clear and maintainable?
4. **Testing**: Are tests comprehensive and meaningful?
5. **Performance**: Are there performance implications?
6. **Security**: Are security best practices followed?
7. **Documentation**: Is sufficient documentation provided?

### Handling Review Feedback

#### Responding to Comments

```markdown
# ✅ Good response to review feedback
Thanks for the feedback! You're right about the error handling. 

I've updated the code to:
1. Use specific exception types instead of generic Exception
2. Added proper logging with context information
3. Updated unit tests to verify error scenarios

The changes are in commits abc123f and def456g.

# ❌ Poor response (avoid this)
Fixed.
```

#### Making Changes

```bash
# Make requested changes in new commits
git add .
git commit -m "fix(api): improve error handling per review feedback"

# Push updates
git push origin feature/branch-name

# If requested to squash commits before merge:
git rebase -i HEAD~n  # where n is number of commits
git push --force-with-lease origin feature/branch-name
```

## Code Review Standards

### As a Reviewer

#### What to Look For

1. **Functionality**: Does the code solve the problem correctly?
2. **Edge Cases**: Are error conditions and edge cases handled?
3. **Performance**: Are there potential performance bottlenecks?
4. **Security**: Could this introduce security vulnerabilities?
5. **Maintainability**: Will this be easy to understand and modify?
6. **Tests**: Do tests adequately cover the changes?

#### Providing Helpful Feedback

```markdown
# ✅ Constructive feedback
## Issue: Resource Management
The database connection isn't being closed in the error path.

**Suggestion:** Consider using try-with-resources or ensure the connection is closed in a finally block.

**Example:**
```java
try (Connection conn = getConnection()) {
    // Use connection
} // Automatically closed
```

## Praise: Good Error Handling  
Great job adding specific error messages! This will make debugging much easier.

# ❌ Unhelpful feedback (avoid this)
This is wrong.
Fix this.
I don't like this approach.
```

### As a Contributor

#### Responding to Reviews

1. **Be Receptive**: View feedback as an opportunity to improve
2. **Ask Questions**: If feedback is unclear, ask for clarification
3. **Explain Decisions**: If you disagree, explain your reasoning respectfully
4. **Make Changes Promptly**: Address feedback in a timely manner
5. **Thank Reviewers**: Appreciate the time reviewers spent on your code

#### Example Response

```markdown
Thanks for the thorough review @reviewer!

## Addressing Performance Concern
> The nested loop could be O(n²) with large datasets.

You're absolutely right. I've refactored this to use a HashMap lookup which reduces complexity to O(n). See commit abc123f.

## Question About Error Handling
> Consider using a specific exception type here.

I used `IllegalArgumentException` to match the existing pattern in this service. Should I create a domain-specific exception instead? I'm open to either approach.

## Documentation Update
> Could you add a comment explaining the algorithm?

Added comprehensive comments and updated the method documentation. The algorithm is now explained step-by-step.

All tests are passing and I've verified the performance improvement with the existing benchmarks.
```

## Release Process

### Version Management

OpenFrame uses [Semantic Versioning (SemVer)](https://semver.org/):

- **MAJOR** version: Incompatible API changes
- **MINOR** version: Backward-compatible functionality additions
- **PATCH** version: Backward-compatible bug fixes

### Release Workflow

```bash
# 1. Create release branch
git checkout main
git pull origin main
git checkout -b release/v1.2.0

# 2. Update version numbers
./scripts/update-version.sh 1.2.0

# 3. Update CHANGELOG.md
# Add release notes and breaking changes

# 4. Create release commit
git add .
git commit -m "chore: prepare release v1.2.0"

# 5. Create PR for release branch
# This triggers additional testing and security scans

# 6. After PR approval, tag the release
git tag v1.2.0
git push origin v1.2.0

# 7. GitHub Actions handles deployment
```

## Community Guidelines

### Code of Conduct

OpenFrame follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/). Key principles:

1. **Be Respectful**: Treat all community members with respect
2. **Be Inclusive**: Welcome developers of all backgrounds and experience levels
3. **Be Collaborative**: Focus on constructive feedback and solutions
4. **Be Patient**: Help newcomers learn and grow
5. **Be Professional**: Keep interactions professional and on-topic

### Getting Help

1. **Slack Community**: Join [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for real-time help
2. **GitHub Discussions**: Ask questions and share ideas
3. **Documentation**: Check existing documentation first
4. **Mentorship**: Request mentorship for complex contributions

### Recognition

We recognize contributors through:

- **Contributor List**: Recognition in README and documentation
- **Release Notes**: Acknowledgment in release announcements  
- **Community Spotlights**: Featured contributions in newsletters
- **Swag**: OpenFrame stickers and merchandise for regular contributors
- **Conference Talks**: Opportunities to speak about OpenFrame at events

---

Thank you for contributing to OpenFrame! Your contributions help build the future of open-source MSP tooling. If you have questions about this guide, reach out on [Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) or create a GitHub discussion.

Ready to make your first contribution? Look for issues tagged `good first issue` and follow our [Environment Setup](../setup/environment.md) guide to get started!