# Contributing Guidelines

Welcome to the OpenFrame community! This guide outlines how to contribute effectively to the OpenFrame project, ensuring quality, consistency, and collaboration.

## Getting Started

### Prerequisites for Contributors

Before contributing, ensure you have:
- ✅ Completed [Environment Setup](../setup/environment.md)
- ✅ Successfully run [Local Development](../setup/local-development.md)
- ✅ Read [Architecture Overview](../architecture/overview.md) 
- ✅ Joined [OpenMSP Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

### Finding Good First Issues

Start with issues labeled:
- 🟢 `good-first-issue` - Beginner-friendly tasks
- 🟡 `documentation` - Documentation improvements  
- 🔵 `enhancement` - Small feature additions
- 🟠 `bug` - Bug fixes (after confirming reproduction)

## Code Standards

### Java Coding Standards

**General Principles**:
- Follow Oracle's Java Code Conventions
- Use descriptive names for variables, methods, and classes
- Keep methods small and focused (< 20 lines preferred)
- Write self-documenting code with minimal comments

**Code Style**:
```java
// ✅ Good: Clear, descriptive naming
public class DeviceRegistrationService {
    
    private final DeviceRepository deviceRepository;
    private final EventPublisher eventPublisher;
    
    public DeviceRegistrationService(
            DeviceRepository deviceRepository,
            EventPublisher eventPublisher) {
        this.deviceRepository = requireNonNull(deviceRepository);
        this.eventPublisher = requireNonNull(eventPublisher);
    }
    
    public Device registerDevice(DeviceRegistrationRequest request) {
        validateRegistrationRequest(request);
        
        var device = Device.builder()
            .hostname(request.getHostname())
            .organizationId(request.getOrganizationId())
            .status(DeviceStatus.PENDING)
            .registeredAt(Instant.now())
            .build();
            
        var savedDevice = deviceRepository.save(device);
        eventPublisher.publish(new DeviceRegisteredEvent(savedDevice.getId()));
        
        return savedDevice;
    }
}
```

**Spring Boot Conventions**:
- Use constructor injection (not field injection)
- Leverage Spring Boot auto-configuration
- Use `@ConfigurationProperties` for type-safe configuration
- Implement proper exception handling with `@ControllerAdvice`

**GraphQL Best Practices**:
```java
@Component
@DgsComponent
public class DeviceDataFetcher {
    
    private final DeviceService deviceService;
    
    @DgsQuery
    public List<Device> devices(@InputArgument DeviceFilterInput filter) {
        return deviceService.findDevices(filter);
    }
    
    @DgsData(parentType = "Device")
    public CompletableFuture<Organization> organization(DataFetchingEnvironment dfe) {
        var device = dfe.<Device>getSource();
        var dataLoader = dfe.<String, Organization>getDataLoader("organizationLoader");
        return dataLoader.load(device.getOrganizationId());
    }
}
```

### Frontend Coding Standards

**TypeScript Best Practices**:
- Use strict TypeScript mode
- Define interfaces for all data structures
- Use enums for constants and status values
- Leverage type guards for runtime type checking

```typescript
// ✅ Good: Strong typing and clear interfaces
interface Device {
  id: string
  hostname: string
  status: DeviceStatus
  organizationId: string
  lastSeen: Date
  metadata?: Record<string, unknown>
}

enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  PENDING = 'PENDING',
  ERROR = 'ERROR'
}

// Type guard for runtime checking
function isDevice(obj: unknown): obj is Device {
  return typeof obj === 'object' && 
         obj !== null &&
         typeof (obj as Device).id === 'string' &&
         typeof (obj as Device).hostname === 'string'
}
```

**Vue 3 Component Standards**:
```vue
<script setup lang="ts">
// ✅ Good: Composition API with TypeScript
interface Props {
  device: Device
  editable?: boolean
}

interface Emits {
  (e: 'update', device: Device): void
  (e: 'delete', deviceId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  editable: false
})

const emit = defineEmits<Emits>()

const { devices, isLoading, error } = useDevices()

const handleEdit = () => {
  if (!props.editable) return
  emit('update', props.device)
}

const handleDelete = () => {
  if (confirm('Delete this device?')) {
    emit('delete', props.device.id)
  }
}
</script>

<template>
  <div class="device-card" data-testid="device-card">
    <h3 data-testid="device-hostname">{{ device.hostname }}</h3>
    <DeviceStatus :status="device.status" />
    
    <div v-if="editable" class="actions">
      <Button 
        @click="handleEdit" 
        data-testid="edit-button"
        severity="secondary"
      >
        Edit
      </Button>
      <Button 
        @click="handleDelete"
        data-testid="delete-button" 
        severity="danger"
      >
        Delete
      </Button>
    </div>
  </div>
</template>
```

**CSS/Styling Guidelines**:
- Use Tailwind CSS utility classes primarily
- Create component-specific CSS only when necessary
- Follow mobile-first responsive design
- Use CSS custom properties for theme variables

### Rust Coding Standards

**Rust Best Practices**:
```rust
// ✅ Good: Clear error handling and async patterns
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use tokio::time::{sleep, Duration};

#[derive(Debug, Serialize, Deserialize)]
pub struct AgentConfig {
    pub api_url: String,
    pub heartbeat_interval: Duration,
    pub max_retries: u32,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            api_url: "http://localhost:8088".to_string(),
            heartbeat_interval: Duration::from_secs(30),
            max_retries: 3,
        }
    }
}

pub struct AgentService {
    config: AgentConfig,
    client: reqwest::Client,
}

impl AgentService {
    pub fn new(config: AgentConfig) -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(10))
            .build()
            .expect("Failed to create HTTP client");
            
        Self { config, client }
    }
    
    pub async fn register(&self, secret: &str) -> Result<String> {
        let request = AgentRegistrationRequest {
            secret: secret.to_string(),
            hostname: hostname::get()?,
        };
        
        let response = self
            .client
            .post(&format!("{}/api/agents/register", self.config.api_url))
            .json(&request)
            .send()
            .await
            .context("Failed to send registration request")?;
            
        if !response.status().is_success() {
            anyhow::bail!("Registration failed: {}", response.status());
        }
        
        let registration_response: AgentRegistrationResponse = response
            .json()
            .await
            .context("Failed to parse registration response")?;
            
        Ok(registration_response.agent_id)
    }
}
```

## Development Workflow

### Branch Naming Convention

Use descriptive branch names with prefixes:

- `feature/device-bulk-operations` - New features
- `bugfix/fix-device-status-sync` - Bug fixes  
- `refactor/improve-auth-service` - Code refactoring
- `docs/update-api-documentation` - Documentation updates
- `test/add-integration-tests` - Test improvements

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Examples**:
```bash
feat(devices): add bulk device registration endpoint

- Add POST /api/devices/bulk endpoint
- Support batch device registration 
- Include validation and error handling
- Add comprehensive tests

Closes #123

fix(auth): resolve JWT token refresh issue

The refresh token was not being properly validated,
causing users to be logged out unexpectedly.

Breaking change: Auth service now requires refresh 
token to be sent in request body instead of headers.

BREAKING CHANGE: refresh token location changed

docs: update API authentication documentation

test(devices): add integration tests for device service
```

**Commit Types**:
- `feat` - New features
- `fix` - Bug fixes
- `docs` - Documentation changes
- `test` - Test additions/modifications
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `style` - Code style changes
- `ci` - CI/CD changes
- `build` - Build system changes

### Pull Request Process

**1. Before Creating a PR**:
```bash
# Ensure your branch is up to date
git checkout main
git pull origin main
git checkout your-feature-branch
git rebase main

# Run tests locally
mvn test                           # Java tests
npm run test                       # Frontend tests
cargo test                         # Rust tests

# Check code quality
mvn spotbugs:check                 # Java static analysis
npm run lint                       # Frontend linting
cargo clippy                       # Rust linting
```

**2. Creating the PR**:

Use this PR template:

```markdown
## Description
Brief description of the changes made and why.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
- Closes #123
- Related to #456

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Code Quality
- [ ] Code follows project style guidelines
- [ ] Self-review of code completed
- [ ] Code is properly commented
- [ ] No new warnings or errors

## Documentation
- [ ] Documentation updated (if needed)
- [ ] API documentation updated (if applicable)
- [ ] Changelog updated (for user-facing changes)

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Additional Notes
Any additional information reviewers should know.
```

**3. PR Review Checklist**:

**For Authors**:
- ✅ All tests pass in CI
- ✅ Code coverage maintained or improved
- ✅ No merge conflicts
- ✅ Documentation updated as needed
- ✅ Self-review completed

**For Reviewers**:
- ✅ Code follows project conventions
- ✅ Tests adequately cover new functionality
- ✅ Security considerations addressed
- ✅ Performance implications considered
- ✅ Breaking changes properly documented

## Code Quality Standards

### Static Analysis

**Java Quality Checks**:
```bash
# Run all quality checks
mvn verify

# Specific quality tools
mvn checkstyle:check              # Code style
mvn spotbugs:check               # Bug detection
mvn pmd:check                    # Code analysis
mvn jacoco:check                 # Coverage verification
```

**Frontend Quality Checks**:
```bash
# Linting and formatting
npm run lint                     # ESLint
npm run lint:fix                 # Auto-fix issues
npm run format                   # Prettier formatting

# Type checking
npm run type-check               # TypeScript validation
```

**Rust Quality Checks**:
```bash
# Rust quality tools
cargo fmt                       # Code formatting
cargo clippy                    # Linting
cargo audit                     # Security audit
cargo outdated                  # Dependency updates
```

### Code Coverage Requirements

| Component | Minimum Coverage | Target Coverage |
|-----------|------------------|------------------|
| **Java Services** | 80% line coverage | 90% line coverage |
| **Frontend Components** | 70% line coverage | 85% line coverage |
| **Rust Client** | 75% line coverage | 88% line coverage |

### Performance Standards

**API Performance Requirements**:
- REST endpoints: p95 < 200ms
- GraphQL queries: p95 < 500ms
- Database queries: p95 < 100ms
- Memory usage: < 2GB per service instance

**Frontend Performance Requirements**:
- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- Bundle size: < 500KB initial load

## Testing Requirements

### Test Coverage Expectations

**Required Tests for New Features**:
```bash
# Java services
✅ Unit tests for service layer
✅ Integration tests for repositories
✅ Contract tests for external APIs  
✅ Web layer tests for controllers

# Frontend components
✅ Component unit tests
✅ Store/composable tests
✅ User interaction tests
✅ Accessibility tests

# Rust client
✅ Unit tests for core logic
✅ Integration tests for HTTP clients
✅ Property-based tests for data structures
```

**Test Documentation Requirements**:
- Test names should describe the behavior being tested
- Complex test setups should include comments
- Test data builders should be reusable
- Integration tests should be properly categorized

### Performance Testing

**Load Testing Requirements**:
```javascript
// Example performance test requirements
export let options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '60s', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.1'],
    checks: ['rate>0.95'],
  },
};
```

## Documentation Standards

### Code Documentation

**JavaDoc Requirements**:
```java
/**
 * Service for managing device lifecycle operations.
 * 
 * <p>Handles device registration, status updates, and decommissioning.
 * All operations are tenant-aware and include proper audit logging.
 * 
 * @author OpenFrame Team
 * @since 1.0.0
 */
@Service
public class DeviceService {
    
    /**
     * Registers a new device in the system.
     * 
     * @param request the device registration request containing hostname and org ID
     * @return the newly created device with generated ID and initial status
     * @throws IllegalArgumentException if request validation fails
     * @throws DuplicateHostnameException if hostname already exists in organization
     */
    public Device registerDevice(DeviceRegistrationRequest request) {
        // Implementation
    }
}
```

**API Documentation**:
- All GraphQL schemas must include descriptions
- REST endpoints require OpenAPI documentation
- Include request/response examples
- Document error scenarios and status codes

### README Updates

When adding new features, update relevant README files:
- Service-specific README files
- Integration documentation
- Configuration examples
- Troubleshooting guides

## Security Guidelines

### Security Best Practices

**Input Validation**:
```java
@RestController
@Validated
public class DeviceController {
    
    @PostMapping("/devices")
    public ResponseEntity<Device> createDevice(
            @Valid @RequestBody DeviceRequest request,
            @AuthenticationPrincipal AuthPrincipal principal) {
        
        // Validate tenant access
        tenantValidator.validateAccess(principal, request.getOrganizationId());
        
        // Sanitize input
        var sanitizedRequest = inputSanitizer.sanitize(request);
        
        return ResponseEntity.ok(deviceService.createDevice(sanitizedRequest));
    }
}
```

**Sensitive Data Handling**:
- Never log sensitive information (passwords, tokens, API keys)
- Use proper encryption for stored secrets
- Implement proper session management
- Follow OWASP security guidelines

**Database Security**:
- All queries must include tenant filtering
- Use parameterized queries to prevent SQL injection
- Implement proper access controls
- Regular security audits of dependencies

## Release Process

### Version Management

OpenFrame uses [Semantic Versioning](https://semver.org/):
- **Major** (X.0.0): Breaking changes
- **Minor** (0.X.0): New features, backwards compatible
- **Patch** (0.0.X): Bug fixes, backwards compatible

### Release Checklist

**Before Release**:
- [ ] All tests pass in CI/CD
- [ ] Security scan completed
- [ ] Performance benchmarks meet requirements
- [ ] Documentation updated
- [ ] Changelog prepared
- [ ] Migration scripts tested (if applicable)

**Release Process**:
1. Create release branch from main
2. Update version numbers
3. Generate changelog
4. Create release PR
5. Merge after approval
6. Tag release
7. Deploy to staging
8. Deploy to production
9. Monitor metrics post-deployment

## Community Interaction

### Communication Channels

**OpenMSP Slack Community**: [Join Here](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- `#general` - General discussions
- `#development` - Technical development topics
- `#support` - Help and troubleshooting
- `#announcements` - Project updates

**GitHub Discussions**:
- Feature requests and RFC discussions
- Architecture decisions
- Community showcase

**Code of Conduct**:
We follow the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/). Be respectful, inclusive, and professional in all interactions.

### Getting Help

**For Technical Issues**:
1. Search existing GitHub issues
2. Check documentation and troubleshooting guides
3. Ask in OpenMSP Slack `#development` channel
4. Create detailed GitHub issue with reproduction steps

**For Feature Discussions**:
1. Start discussion in OpenMSP Slack `#general`
2. Create GitHub Discussion for formal RFC
3. Gather community feedback
4. Create implementation issue

## Recognition

### Contributor Recognition

We recognize contributions through:
- GitHub contributor acknowledgments
- Community highlights in release notes
- Annual contributor appreciation
- Conference speaking opportunities

### Becoming a Maintainer

Regular contributors may be invited to become maintainers based on:
- Consistent high-quality contributions
- Community engagement and helpfulness
- Understanding of project architecture
- Commitment to project values

## Troubleshooting Common Issues

### Build Failures

**Maven Build Issues**:
```bash
# Clear cache and rebuild
rm -rf ~/.m2/repository
mvn clean install -U

# Skip tests for quick build
mvn clean install -DskipTests

# Debug dependency conflicts
mvn dependency:tree
```

**Frontend Build Issues**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear build cache
rm -rf dist .vite

# Check TypeScript errors
npm run type-check
```

### Development Environment

**Docker Issues**:
```bash
# Reset Docker environment
docker system prune -af
docker-compose down -v
docker-compose up -d

# Check service logs
docker-compose logs -f service-name
```

**Database Connection Issues**:
```bash
# Test MongoDB connection
mongosh mongodb://localhost:27017/openframe_dev

# Reset development database
docker-compose down -v
docker-compose up -d mongo
```

## Next Steps

Ready to contribute? Here's your path forward:

1. **Join the Community**: Connect on OpenMSP Slack
2. **Pick an Issue**: Find a `good-first-issue` to start with
3. **Setup Development**: Follow environment setup guides
4. **Make Changes**: Follow coding standards and testing requirements
5. **Submit PR**: Use the PR template and process
6. **Engage**: Participate in code reviews and discussions

---

**🤝 Welcome to the Team!** Thank you for contributing to OpenFrame. Your contributions help build the future of open-source MSP tooling!