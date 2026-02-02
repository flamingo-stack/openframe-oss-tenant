# Contributing Guidelines

Welcome to OpenFrame! We're excited to have you contribute to the future of MSP automation. This guide will help you understand our development workflow, coding standards, and contribution process.

[![OpenFrame v0.5.2: Autonomous AI Agent Architecture for MSPs](https://img.youtube.com/vi/PexpoNdZtUk/maxresdefault.jpg)](https://www.youtube.com/watch?v=PexpoNdZtUk)

## Getting Started with Contributions

### Prerequisites for Contributors

Before you start contributing, ensure you have:

- ✅ Completed [Environment Setup](../setup/environment.md)
- ✅ Successfully run [Local Development](../setup/local-development.md)
- ✅ Read the [Architecture Overview](../architecture/overview.md)
- ✅ Joined our [OpenMSP Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

### First-Time Setup

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
   cd openframe-oss-tenant
   
   # Add upstream remote
   git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git
   git remote -v
   ```

2. **Set Up Development Environment**
   ```bash
   # Install pre-commit hooks
   cp scripts/git-hooks/* .git/hooks/
   chmod +x .git/hooks/*
   
   # Verify environment
   ./scripts/verify-dev-env.sh
   ```

3. **Build and Test**
   ```bash
   # Full build to ensure everything works
   mvn clean install
   cd openframe/services/openframe-frontend && npm install
   
   # Run tests to ensure your environment is working
   mvn test
   npm run test
   ```

## Development Workflow

### 1. Planning Your Contribution

#### Finding Issues to Work On

- **Good First Issues**: Look for issues labeled `good-first-issue`
- **Help Wanted**: Issues labeled `help-wanted` are ready for contribution
- **Feature Requests**: Check discussions for feature requests
- **Bug Reports**: Issues with detailed reproduction steps

#### Proposing New Features

Before starting work on significant features:

1. **Create an Issue** describing the proposed feature
2. **Discuss in Slack** to get community feedback
3. **Wait for Maintainer Approval** before starting implementation
4. **Create a Design Document** for complex features

### 2. Branch Strategy

We use **Git Flow** with the following branch structure:

```mermaid
gitgraph
    commit id: "Initial"
    branch develop
    checkout develop
    commit id: "Dev setup"
    
    branch feature/user-auth
    checkout feature/user-auth
    commit id: "Add login"
    commit id: "Add signup"
    commit id: "Add tests"
    
    checkout develop
    merge feature/user-auth
    commit id: "Merge auth"
    
    branch feature/device-mgmt
    checkout feature/device-mgmt
    commit id: "Add devices"
    commit id: "Add monitoring"
    
    checkout develop
    merge feature/device-mgmt
    
    checkout main
    merge develop
    commit id: "Release v1.0"
```

#### Branch Naming Convention

```bash
# Feature branches
feature/description-in-kebab-case
feature/add-device-management
feature/implement-sso-authentication

# Bug fix branches  
bugfix/description-in-kebab-case
bugfix/fix-device-status-update
bugfix/resolve-memory-leak

# Hotfix branches (for production issues)
hotfix/critical-issue-description
hotfix/fix-authentication-bypass

# Release branches
release/v1.2.0
```

### 3. Making Changes

#### Create Your Branch

```bash
# Ensure you're on develop and up to date
git checkout develop
git pull upstream develop

# Create your feature branch
git checkout -b feature/your-feature-name

# Push branch to your fork
git push -u origin feature/your-feature-name
```

#### Development Best Practices

1. **Make Small, Focused Commits**
   ```bash
   # Good: Small, focused commits
   git commit -m "Add user authentication service"
   git commit -m "Add authentication unit tests"
   git commit -m "Update authentication documentation"
   
   # Avoid: Large commits with multiple unrelated changes
   git commit -m "Add auth, fix bugs, update docs"
   ```

2. **Write Clear Commit Messages**
   ```bash
   # Format: <type>(<scope>): <description>
   feat(auth): add OAuth2 authentication support
   fix(devices): resolve device status update issue
   docs(api): update GraphQL schema documentation
   test(services): add integration tests for device service
   refactor(frontend): extract reusable components
   ```

3. **Keep Commits Atomic**
   Each commit should represent a single logical change that:
   - Compiles successfully
   - Passes existing tests
   - Can be understood in isolation

#### Code Style Guidelines

### Java Code Style

**Use Google Java Style Guide** with these specific requirements:

```java
// Class structure
@Service
@RequiredArgsConstructor
@Slf4j
public class DeviceService {
    
    private final DeviceRepository deviceRepository;
    private final EventPublisher eventPublisher;
    
    @Transactional
    public Device createDevice(CreateDeviceRequest request, TenantContext tenant) {
        log.debug("Creating device: {} for tenant: {}", request.getName(), tenant.getTenantId());
        
        // Validation
        validateDeviceRequest(request);
        
        // Business logic
        Device device = Device.builder()
            .tenantId(tenant.getTenantId())
            .name(request.getName())
            .type(request.getType())
            .status(DeviceStatus.PENDING)
            .createdAt(Instant.now())
            .build();
            
        // Persistence
        Device savedDevice = deviceRepository.save(device);
        
        // Events
        eventPublisher.publishEvent(new DeviceCreatedEvent(savedDevice));
        
        log.info("Created device: {} with ID: {}", device.getName(), device.getId());
        return savedDevice;
    }
    
    private void validateDeviceRequest(CreateDeviceRequest request) {
        if (StringUtils.isBlank(request.getName())) {
            throw new ValidationException("Device name cannot be blank");
        }
        if (request.getType() == null) {
            throw new ValidationException("Device type is required");
        }
    }
}
```

**Key Java Conventions**:
- **Indentation**: 2 spaces (no tabs)
- **Line Length**: 100 characters maximum
- **Imports**: Organize automatically, no wildcards
- **Naming**: camelCase for variables/methods, PascalCase for classes
- **Comments**: Javadoc for public APIs, inline for complex logic
- **Error Handling**: Use specific exceptions, not generic Exception

### TypeScript/Vue.js Code Style

**Use Prettier + ESLint** configuration:

```typescript
// Component structure
<template>
  <div class="device-card" :class="cardClasses" @click="onSelect">
    <div class="device-header">
      <h3 class="device-name" data-testid="device-name">
        {{ device.name }}
      </h3>
      <StatusIndicator 
        :status="device.status" 
        data-testid="status-indicator"
      />
    </div>
    
    <div class="device-details">
      <DeviceInfo :device="device" />
      <DeviceActions 
        :device="device" 
        @action="onAction"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Device } from '@/types/device'

interface Props {
  device: Device
  selectable?: boolean
}

interface Emits {
  select: [device: Device]
  action: [action: string, device: Device]
}

const props = withDefaults(defineProps<Props>(), {
  selectable: true
})

const emit = defineEmits<Emits>()

const cardClasses = computed(() => ({
  'device-card--selectable': props.selectable,
  'device-card--online': props.device.status === 'ONLINE',
  'device-card--offline': props.device.status === 'OFFLINE'
}))

const onSelect = () => {
  if (props.selectable) {
    emit('select', props.device)
  }
}

const onAction = (action: string) => {
  emit('action', action, props.device)
}
</script>

<style scoped>
.device-card {
  @apply border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow;
}

.device-card--selectable {
  @apply cursor-pointer;
}

.device-card--online {
  @apply border-green-200 bg-green-50;
}

.device-card--offline {
  @apply border-red-200 bg-red-50;
}
</style>
```

**Key Frontend Conventions**:
- **Indentation**: 2 spaces
- **Naming**: camelCase for variables/functions, PascalCase for components
- **Components**: Single File Components with `<script setup>`
- **Types**: Explicit TypeScript types for all props and emits
- **Styling**: Tailwind CSS classes with scoped styles when needed
- **Testing**: Data attributes (`data-testid`) for test selectors

### Documentation Standards

#### Code Documentation

```java
/**
 * Service responsible for device lifecycle management.
 * 
 * <p>This service handles device creation, updates, and deletion while ensuring
 * proper multi-tenant isolation and event publishing.
 * 
 * @author OpenFrame Team
 * @since 1.0.0
 */
@Service
public class DeviceService {
    
    /**
     * Creates a new device for the specified tenant.
     * 
     * @param request the device creation request containing device details
     * @param tenant the tenant context for multi-tenant isolation
     * @return the created device with generated ID and audit fields
     * @throws ValidationException if the request contains invalid data
     * @throws TenantNotFoundException if the tenant doesn't exist
     */
    public Device createDevice(CreateDeviceRequest request, TenantContext tenant) {
        // Implementation
    }
}
```

#### API Documentation

```java
@RestController
@RequestMapping("/api/devices")
@Tag(name = "Devices", description = "Device management operations")
public class DeviceController {
    
    @PostMapping
    @Operation(
        summary = "Create a new device",
        description = "Creates a new device in the current tenant with the provided details"
    )
    @ApiResponses({
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
            responseCode = "401", 
            description = "Authentication required"
        )
    })
    public ResponseEntity<DeviceResponse> createDevice(
        @RequestBody @Valid CreateDeviceRequest request,
        @Parameter(hidden = true) @AuthenticationPrincipal UserPrincipal user
    ) {
        // Implementation
    }
}
```

## Testing Requirements

Every contribution must include appropriate tests:

### Test Coverage Requirements

- **Unit Tests**: >80% line coverage for new code
- **Integration Tests**: Cover all new API endpoints
- **Frontend Tests**: Test components and services
- **E2E Tests**: For new user-facing features

### Test Examples

**Java Service Test**:
```java
@ExtendWith(MockitoExtension.class)
class DeviceServiceTest {
    
    @Mock
    private DeviceRepository deviceRepository;
    
    @InjectMocks
    private DeviceService deviceService;
    
    @Test
    @DisplayName("Should create device with valid input")
    void createDevice_WithValidInput_ShouldReturnCreatedDevice() {
        // Given
        CreateDeviceRequest request = CreateDeviceRequest.builder()
            .name("Test Device")
            .type(DeviceType.SERVER)
            .build();
            
        TenantContext tenant = TenantContext.builder()
            .tenantId("tenant-123")
            .build();
            
        Device expectedDevice = Device.builder()
            .id("device-123")
            .tenantId("tenant-123")
            .name("Test Device")
            .build();
            
        when(deviceRepository.save(any(Device.class)))
            .thenReturn(expectedDevice);
        
        // When
        Device result = deviceService.createDevice(request, tenant);
        
        // Then
        assertThat(result).isEqualTo(expectedDevice);
        verify(deviceRepository).save(argThat(device ->
            device.getName().equals("Test Device") &&
            device.getTenantId().equals("tenant-123")
        ));
    }
}
```

**Vue Component Test**:
```typescript
describe('DeviceCard', () => {
  it('should emit select event when clicked', async () => {
    const device = createMockDevice()
    const wrapper = mount(DeviceCard, {
      props: { device }
    })
    
    await wrapper.find('[data-testid="device-card"]').trigger('click')
    
    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0]).toEqual([device])
  })
})
```

## Pull Request Process

### 1. Pre-Pull Request Checklist

Before creating a pull request, ensure:

- [ ] **Code compiles** without warnings
- [ ] **All tests pass** (`mvn test` and `npm run test`)
- [ ] **Code follows style guidelines**
- [ ] **Documentation is updated** if needed
- [ ] **Commit messages are clear** and follow convention
- [ ] **Branch is up to date** with develop

```bash
# Update your branch before PR
git checkout develop
git pull upstream develop
git checkout feature/your-feature
git rebase develop

# Run final checks
mvn clean install
cd openframe/services/openframe-frontend && npm run test:ci
```

### 2. Creating the Pull Request

#### PR Title Format
```
<type>(<scope>): <description>

feat(auth): add OAuth2 authentication support
fix(devices): resolve device status synchronization issue
docs(api): update GraphQL schema documentation
```

#### PR Description Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Changes Made
- List of specific changes
- Another change
- Third change

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] All existing tests pass

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for hard-to-understand areas
- [ ] Documentation updated
- [ ] No new warnings or errors introduced
```

### 3. Review Process

#### What Reviewers Look For

1. **Code Quality**
   - Follows coding standards
   - Proper error handling
   - No code smells or anti-patterns

2. **Testing**
   - Adequate test coverage
   - Tests are meaningful and well-written
   - Edge cases are covered

3. **Documentation**
   - Code is self-documenting
   - Complex logic has comments
   - API changes are documented

4. **Security**
   - No security vulnerabilities
   - Proper input validation
   - Authentication/authorization checks

5. **Performance**
   - No obvious performance issues
   - Database queries are optimized
   - Large datasets are handled appropriately

#### Addressing Review Comments

```bash
# Make requested changes
git add .
git commit -m "address: fix validation logic per review"

# Push changes to update PR
git push origin feature/your-feature
```

#### Handling Merge Conflicts

```bash
# Update your branch with latest develop
git checkout develop
git pull upstream develop
git checkout feature/your-feature
git rebase develop

# Resolve conflicts, then
git add .
git rebase --continue
git push --force-with-lease origin feature/your-feature
```

### 4. Merge Requirements

For a PR to be merged, it must have:

- ✅ **At least 2 approvals** from maintainers
- ✅ **All CI checks passing** (build, tests, linting)
- ✅ **No merge conflicts** with the target branch
- ✅ **Up-to-date branch** (rebased on latest develop)

## Code Review Guidelines

### As a Reviewer

#### Review Checklist

1. **Functionality**
   - [ ] Does the code do what it's supposed to do?
   - [ ] Are edge cases handled?
   - [ ] Is error handling appropriate?

2. **Code Quality**
   - [ ] Is the code readable and maintainable?
   - [ ] Are naming conventions followed?
   - [ ] Is there unnecessary code duplication?

3. **Testing**
   - [ ] Are there sufficient tests?
   - [ ] Do tests cover the important scenarios?
   - [ ] Are tests reliable and fast?

4. **Documentation**
   - [ ] Is the code self-documenting?
   - [ ] Are complex algorithms explained?
   - [ ] Is API documentation updated?

#### Review Comments Best Practices

```markdown
# Good review comments

## Suggestions with context
Consider using a Map here instead of nested loops for better performance when dealing with large datasets.

## Questions for clarification  
Is this validation necessary at this layer? It seems like it might be redundant with the controller validation.

## Positive feedback
Nice use of the builder pattern here! This makes the code much more readable.

## Specific improvements
```java
// Instead of:
if (device.getStatus().equals("ONLINE"))

// Consider:
if (DeviceStatus.ONLINE.equals(device.getStatus()))
```
This prevents NPE if device.getStatus() returns null.
```

### As a Contributor

#### Responding to Reviews

- **Be receptive** to feedback and suggestions
- **Ask questions** if comments are unclear
- **Explain your reasoning** when you disagree
- **Thank reviewers** for their time and effort

```markdown
# Good responses to review comments

Thanks for the suggestion! You're right that a Map would be more efficient here. I've updated the code to use HashMap for the lookup.

I added this validation because the controller validation only checks format, but this validates business rules. Should I add a comment to clarify this?

Good catch on the potential NPE! I've updated the code to use the safer null check pattern.
```

## Release Process

### Semantic Versioning

OpenFrame follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features (backward compatible)
- **PATCH** (0.0.1): Bug fixes (backward compatible)

### Release Branch Workflow

```bash
# Create release branch from develop
git checkout develop
git pull upstream develop
git checkout -b release/v1.2.0

# Update version numbers
# Update CHANGELOG.md
# Final testing and bug fixes

# Merge to main
git checkout main
git merge release/v1.2.0
git tag v1.2.0

# Merge back to develop
git checkout develop
git merge release/v1.2.0
```

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. All contributors must adhere to our Code of Conduct:

- **Be respectful** and inclusive
- **Be collaborative** and helpful
- **Focus on what's best** for the community
- **Show empathy** towards other community members

### Communication Channels

- **Slack**: [OpenMSP Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for discussions and questions
- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For architectural discussions and proposals
- **Pull Requests**: For code review and collaboration

### Recognition

We recognize contributors through:

- **Contributors file**: All contributors are listed in CONTRIBUTORS.md
- **Release notes**: Significant contributions are highlighted
- **Community shoutouts**: Recognition in Slack and social media
- **Maintainer pathway**: Active contributors can become maintainers

## Getting Help

### Before Asking for Help

1. **Search existing issues** and documentation
2. **Check the FAQ** section in documentation
3. **Review similar code** in the codebase
4. **Try debugging** with appropriate tools

### How to Ask for Help

When asking for help, provide:

- **Context**: What are you trying to achieve?
- **Problem**: What specific issue are you facing?
- **Attempts**: What have you already tried?
- **Code**: Minimal reproduction code if applicable
- **Environment**: Your development environment details

### Example Help Request

```markdown
## Context
I'm trying to add a new GraphQL mutation for updating device configurations.

## Problem
Getting a validation error when trying to save the updated device, but I can't figure out why the validation is failing.

## What I've Tried
- Checked that all required fields are present
- Verified the device exists in the database
- Added debug logging to see the validation errors

## Code
```java
@Mutation
public Device updateDeviceConfig(@Argument String deviceId, @Argument DeviceConfigInput config) {
    Device device = deviceService.getDevice(deviceId);
    device.setConfiguration(config.toEntity());
    return deviceService.updateDevice(device); // Validation fails here
}
```

## Environment
- Java 21
- Spring Boot 3.3.0
- MongoDB 7.0
- Running locally on macOS
```

## Advanced Contributing

### Becoming a Maintainer

Active contributors can become maintainers by:

1. **Consistent contributions** over 3+ months
2. **High-quality code** and reviews
3. **Community involvement** in discussions and help
4. **Nomination by existing maintainers**

### Special Contribution Types

#### Security Issues

Report security vulnerabilities privately:
- Email: security@openframe.ai
- Include detailed reproduction steps
- Allow time for patch before public disclosure

#### Performance Improvements

For performance-related contributions:
- Include benchmarks showing improvement
- Explain the optimization technique used
- Ensure changes don't break existing functionality

#### Documentation Improvements

Documentation contributions are highly valued:
- Fix typos and grammar
- Add examples and tutorials
- Improve API documentation
- Translate documentation (future)

## Conclusion

Contributing to OpenFrame is an opportunity to shape the future of MSP automation. Whether you're fixing bugs, adding features, or improving documentation, your contributions make a difference.

### Next Steps

1. **Join our [Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)** to connect with other contributors
2. **Find your first issue** to work on
3. **Set up your development environment**
4. **Start contributing** and become part of the OpenFrame community!

Thank you for contributing to OpenFrame! 🚀

---

*These guidelines are living documents that evolve with the project. Feedback and suggestions for improvements are always welcome.*