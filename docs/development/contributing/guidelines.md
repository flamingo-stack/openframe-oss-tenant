# Contributing Guidelines

Welcome to the OpenFrame community! This guide provides comprehensive guidelines for contributing to OpenFrame, including code standards, development workflows, and collaboration practices.

## Code of Conduct

OpenFrame is committed to providing a welcoming and inclusive environment for all contributors. We expect all community members to:

- **Be Respectful**: Treat all community members with respect and professionalism
- **Be Collaborative**: Work together constructively and accept feedback gracefully
- **Be Inclusive**: Welcome newcomers and help them get started
- **Be Patient**: Remember that everyone has different experience levels
- **Be Professional**: Maintain professional communication in all interactions

## Getting Started

### 1. Join the Community

Before contributing, connect with the OpenFrame community:

- **OpenMSP Slack**: Join our active community at https://www.openmsp.ai/
- **Direct Invite**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
- **Introduce Yourself**: Share your background and interests in the `#introductions` channel

### 2. Set Up Your Development Environment

Follow our comprehensive setup guides:

1. **[Environment Setup](../setup/environment.md)** - Install required tools and configure your IDE
2. **[Local Development](../setup/local-development.md)** - Run OpenFrame locally for development

### 3. Understand the Architecture

Familiarize yourself with OpenFrame's architecture:

1. **[Architecture Overview](../architecture/README.md)** - High-level system design
2. **[Service Documentation](../../architecture/README.md)** - Detailed service specifications
3. **[Security Guidelines](../security/README.md)** - Security patterns and practices

## Contribution Types

We welcome various types of contributions:

### 🐛 Bug Reports

Help us identify and fix issues:

- **Search First**: Check existing issues before creating new ones
- **Detailed Description**: Provide clear steps to reproduce the issue
- **Environment Info**: Include your system, Java version, and OpenFrame version
- **Expected vs Actual**: Describe what you expected vs what happened
- **Screenshots/Logs**: Include relevant screenshots or log excerpts

**Bug Report Template:**
```markdown
## Bug Description
A clear description of what the bug is.

## Steps to Reproduce
1. Navigate to '...'
2. Click on '...'
3. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- OpenFrame Version: [e.g., v1.2.3]
- Java Version: [e.g., 21.0.1]
- Operating System: [e.g., Ubuntu 22.04]
- Browser (if applicable): [e.g., Chrome 120]

## Additional Context
Any other context, screenshots, or logs.
```

### ✨ Feature Requests

Suggest new functionality:

- **Use Case Description**: Explain the problem your feature would solve
- **Proposed Solution**: Describe your suggested approach
- **Alternative Solutions**: Consider other possible approaches
- **Community Input**: Discuss in Slack before submitting large features

### 🔧 Code Contributions

Contribute code improvements:

- **Bug Fixes**: Fix identified issues
- **Feature Implementation**: Build new functionality
- **Performance Improvements**: Optimize existing code
- **Test Coverage**: Add missing tests
- **Documentation**: Improve code documentation

### 📚 Documentation

Help improve our documentation:

- **API Documentation**: Enhance API specifications
- **User Guides**: Improve user-facing documentation
- **Developer Guides**: Update development documentation
- **Code Comments**: Add or improve code comments

## Development Workflow

### 1. Issue Assignment

**For New Contributors:**
- Look for issues labeled `good-first-issue` or `help-wanted`
- Comment on the issue expressing interest
- Wait for maintainer assignment before starting work

**For Regular Contributors:**
- Comment on issues to request assignment
- Coordinate with maintainers for larger features
- Create issues for bugs you discover

### 2. Branch Strategy

OpenFrame uses a structured branch strategy:

```text
main                    # Production-ready code
├── develop            # Integration branch
├── feature/OF-123     # Feature branches
├── bugfix/OF-456      # Bug fix branches
└── hotfix/OF-789      # Critical fixes
```

**Branch Naming Convention:**
- `feature/OF-{issue-number}-{short-description}`
- `bugfix/OF-{issue-number}-{short-description}`
- `hotfix/OF-{issue-number}-{short-description}`

**Example:**
```bash
# Create feature branch
git checkout -b feature/OF-123-device-management

# Create bug fix branch
git checkout -b bugfix/OF-456-authentication-error
```

### 3. Development Process

#### Step 1: Set Up Your Branch
```bash
# Clone the repository (first time)
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Create and switch to your feature branch
git checkout -b feature/OF-123-your-feature
```

#### Step 2: Implement Your Changes
```bash
# Make your changes
# Follow the coding standards below

# Stage your changes
git add .

# Commit with conventional commit message
git commit -m "feat(devices): add device status filtering

- Add DeviceStatusFilter enum
- Implement filtering in DeviceService
- Add corresponding tests
- Update API documentation

Closes #123"
```

#### Step 3: Test Your Changes
```bash
# Run all tests
mvn test

# Run integration tests
mvn test -Pintegration

# Check test coverage
mvn test jacoco:report
```

#### Step 4: Submit Pull Request
```bash
# Push your branch
git push origin feature/OF-123-your-feature

# Create pull request on GitHub
# Follow the PR template
```

## Code Standards

### 1. Java Code Style

OpenFrame follows Google Java Style with some customizations:

#### Formatting Rules

```java
// Class structure order
public class DeviceService {
    // 1. Static constants
    private static final int DEFAULT_PAGE_SIZE = 20;
    
    // 2. Instance fields
    private final DeviceRepository deviceRepository;
    private final EventPublisher eventPublisher;
    
    // 3. Constructor
    public DeviceService(DeviceRepository deviceRepository, 
                        EventPublisher eventPublisher) {
        this.deviceRepository = deviceRepository;
        this.eventPublisher = eventPublisher;
    }
    
    // 4. Public methods
    public Device createDevice(CreateDeviceRequest request, AuthPrincipal principal) {
        validateRequest(request);
        
        Device device = Device.builder()
            .name(request.getName())
            .type(request.getType())
            .tenantId(principal.getTenantId())
            .status(DeviceStatus.PENDING)
            .createdAt(Instant.now())
            .build();
            
        Device savedDevice = deviceRepository.save(device);
        
        eventPublisher.publishEvent(new DeviceCreatedEvent(savedDevice));
        
        return savedDevice;
    }
    
    // 5. Private methods
    private void validateRequest(CreateDeviceRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new ValidationException("Device name is required");
        }
    }
}
```

#### Naming Conventions

```java
// Classes: PascalCase
public class DeviceManagementService { }

// Methods and variables: camelCase
private String deviceName;
public void updateDeviceStatus() { }

// Constants: SCREAMING_SNAKE_CASE
private static final int MAX_RETRY_ATTEMPTS = 3;

// Packages: lowercase with dots
package com.openframe.api.service;

// Test classes: append "Test"
class DeviceServiceTest { }
```

### 2. Spring Boot Conventions

#### Service Layer
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class DeviceService {
    
    private final DeviceRepository deviceRepository;
    
    @Transactional
    public Device createDevice(CreateDeviceRequest request, AuthPrincipal principal) {
        log.info("Creating device: {} for tenant: {}", request.getName(), principal.getTenantId());
        
        // Implementation
    }
}
```

#### Controller Layer
```java
@RestController
@RequestMapping("/api/devices")
@RequiredArgsConstructor
@Validated
public class DeviceController {
    
    private final DeviceService deviceService;
    
    @PostMapping
    public ResponseEntity<Device> createDevice(
            @Valid @RequestBody CreateDeviceRequest request,
            @AuthenticationPrincipal AuthPrincipal principal) {
        
        Device device = deviceService.createDevice(request, principal);
        return ResponseEntity.status(HttpStatus.CREATED).body(device);
    }
}
```

#### Configuration Classes
```java
@Configuration
@EnableConfigurationProperties(DeviceProperties.class)
public class DeviceConfiguration {
    
    @Bean
    @ConditionalOnMissingBean
    public DeviceValidator deviceValidator() {
        return new DefaultDeviceValidator();
    }
}
```

### 3. Error Handling

#### Custom Exceptions
```java
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidDeviceException extends RuntimeException {
    
    public InvalidDeviceException(String message) {
        super(message);
    }
    
    public InvalidDeviceException(String message, Throwable cause) {
        super(message, cause);
    }
}
```

#### Global Exception Handler
```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(InvalidDeviceException.class)
    public ResponseEntity<ErrorResponse> handleInvalidDevice(InvalidDeviceException ex) {
        ErrorResponse error = ErrorResponse.builder()
            .code("INVALID_DEVICE")
            .message(ex.getMessage())
            .timestamp(Instant.now())
            .build();
            
        return ResponseEntity.badRequest().body(error);
    }
}
```

### 4. Testing Standards

#### Unit Test Structure
```java
@ExtendWith(MockitoExtension.class)
@DisplayName("DeviceService")
class DeviceServiceTest {
    
    @Mock
    private DeviceRepository deviceRepository;
    
    @InjectMocks
    private DeviceService deviceService;
    
    @Nested
    @DisplayName("createDevice")
    class CreateDevice {
        
        @Test
        @DisplayName("should create device with valid request")
        void shouldCreateDeviceWithValidRequest() {
            // Given
            CreateDeviceRequest request = CreateDeviceRequest.builder()
                .name("Test Device")
                .type(DeviceType.DESKTOP)
                .build();
                
            AuthPrincipal principal = AuthPrincipal.builder()
                .tenantId("test-tenant")
                .build();
                
            Device expectedDevice = Device.builder()
                .name("Test Device")
                .tenantId("test-tenant")
                .build();
                
            when(deviceRepository.save(any(Device.class))).thenReturn(expectedDevice);
            
            // When
            Device result = deviceService.createDevice(request, principal);
            
            // Then
            assertThat(result)
                .isNotNull()
                .hasFieldOrPropertyWithValue("name", "Test Device")
                .hasFieldOrPropertyWithValue("tenantId", "test-tenant");
                
            verify(deviceRepository).save(argThat(device -> 
                device.getName().equals("Test Device") &&
                device.getTenantId().equals("test-tenant")
            ));
        }
        
        @Test
        @DisplayName("should throw exception when name is null")
        void shouldThrowExceptionWhenNameIsNull() {
            // Given
            CreateDeviceRequest request = CreateDeviceRequest.builder()
                .name(null)
                .type(DeviceType.DESKTOP)
                .build();
                
            AuthPrincipal principal = AuthPrincipal.builder()
                .tenantId("test-tenant")
                .build();
            
            // When & Then
            assertThatThrownBy(() -> deviceService.createDevice(request, principal))
                .isInstanceOf(ValidationException.class)
                .hasMessage("Device name is required");
                
            verify(deviceRepository, never()).save(any());
        }
    }
}
```

### 5. Documentation Standards

#### Javadoc Requirements
```java
/**
 * Service for managing devices in a multi-tenant environment.
 * 
 * <p>This service provides operations for creating, updating, and retrieving
 * devices with proper tenant isolation. All operations require authentication
 * and validate tenant access.
 * 
 * @author OpenFrame Team
 * @since 1.0.0
 */
@Service
public class DeviceService {
    
    /**
     * Creates a new device for the authenticated tenant.
     * 
     * <p>The device is created in PENDING status and requires activation
     * through the device management workflow.
     * 
     * @param request the device creation request containing name and type
     * @param principal the authenticated user principal with tenant context
     * @return the created device with generated ID and metadata
     * @throws ValidationException if the request is invalid
     * @throws DuplicateDeviceException if a device with the same name exists
     * @throws AccessDeniedException if the user lacks permission
     */
    public Device createDevice(CreateDeviceRequest request, AuthPrincipal principal) {
        // Implementation
    }
}
```

#### README Updates
When adding new features, update relevant documentation:

```markdown
## New Feature: Device Status Filtering

### Overview
Added ability to filter devices by status in the device list API.

### Usage
```bash
# Filter by single status
GET /api/devices?status=ONLINE

# Filter by multiple statuses  
GET /api/devices?status=ONLINE,PENDING
```

### Implementation Details
- Added `DeviceStatusFilter` enum
- Extended `DeviceRepository` with filtering methods
- Updated GraphQL schema with filter parameters
```

## Commit Message Format

OpenFrame uses Conventional Commits for consistent commit messages:

### Format
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Formatting changes (no code logic changes)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples
```bash
# Feature addition
git commit -m "feat(devices): add device status filtering

Add ability to filter devices by status in both REST and GraphQL APIs.
Includes comprehensive test coverage and documentation updates.

Closes #123"

# Bug fix
git commit -m "fix(auth): resolve JWT token expiration issue

Fix edge case where tokens were expiring 1 minute early due to
clock skew. Added tolerance for token validation.

Fixes #456"

# Documentation
git commit -m "docs(api): update device API documentation

Add examples for new filtering parameters and update response schemas."
```

### Breaking Changes
```bash
git commit -m "feat(api)!: change device creation endpoint

BREAKING CHANGE: Device creation endpoint now requires 'type' field.
Update client code to include device type in creation requests.

Migration guide available in MIGRATION.md"
```

## Pull Request Process

### 1. Pull Request Template

When creating a PR, use this template:

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement

## Related Issues
- Closes #123
- Related to #456

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] All tests pass locally

## Screenshots (if applicable)
Include screenshots of UI changes.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings or errors
- [ ] Breaking changes documented
```

### 2. Review Process

#### Self-Review Checklist
Before requesting review:

- [ ] **Code Quality**: Code is clean, readable, and well-structured
- [ ] **Tests**: Comprehensive test coverage for new/changed code
- [ ] **Documentation**: Updated documentation for new features
- [ ] **Security**: Security implications considered and addressed
- [ ] **Performance**: Performance impact assessed
- [ ] **Breaking Changes**: Breaking changes documented and justified

#### Reviewer Guidelines

**As a Reviewer:**
- **Be Constructive**: Provide helpful, actionable feedback
- **Focus on Logic**: Review business logic and architecture decisions
- **Check Tests**: Ensure adequate test coverage
- **Verify Security**: Look for security vulnerabilities
- **Consider Maintainability**: Evaluate long-term code maintainability

**Review Comments:**
```markdown
# Good feedback
Consider using a more specific exception type here to help with error handling.

# Better feedback
Consider using `InvalidDeviceStatusException` instead of generic `RuntimeException` 
here. This would allow calling code to handle device status errors specifically 
and provide better error messages to users.

# Suggestion with code
```java
// Consider this approach for better error handling
if (!isValidStatus(status)) {
    throw new InvalidDeviceStatusException(
        "Invalid status: " + status + ". Valid statuses are: " + 
        Arrays.toString(DeviceStatus.values())
    );
}
```
```

### 3. Merge Requirements

Before merging, ensure:

- [ ] **All Checks Pass**: CI/CD pipeline completes successfully
- [ ] **Reviews Approved**: At least one maintainer approval
- [ ] **Conflicts Resolved**: No merge conflicts with target branch
- [ ] **Tests Pass**: All automated tests pass
- [ ] **Documentation Updated**: Relevant documentation is current

## Release Process

### 1. Version Numbering

OpenFrame follows Semantic Versioning (SemVer):

- **Major** (X.0.0): Breaking changes
- **Minor** (0.X.0): New features (backward compatible)
- **Patch** (0.0.X): Bug fixes (backward compatible)

### 2. Release Workflow

```bash
# Create release branch
git checkout -b release/v1.2.0

# Update version numbers
mvn versions:set -DnewVersion=1.2.0

# Update CHANGELOG.md
# Run final tests
mvn test

# Commit release changes
git commit -m "chore: release v1.2.0"

# Create pull request to main
# After approval and merge, tag the release
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0
```

## Issue Templates

### Bug Report Template
```markdown
---
name: Bug Report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
---

**Describe the Bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
- OpenFrame Version: [e.g. 1.2.3]
- Java Version: [e.g. 21.0.1]
- OS: [e.g. Ubuntu 22.04]
- Browser [e.g. chrome, safari]

**Additional Context**
Add any other context about the problem here.
```

### Feature Request Template
```markdown
---
name: Feature Request
about: Suggest an idea for OpenFrame
title: '[FEATURE] '
labels: enhancement
---

**Is your feature request related to a problem?**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions.

**Additional context**
Add any other context or screenshots about the feature request here.

**Implementation Notes**
Any technical considerations or suggestions for implementation.
```

## Community Recognition

### Contributors Hall of Fame

We recognize our contributors in various ways:

- **Monthly Contributor Spotlight**: Featured in community newsletter
- **Contributor Badge**: Special recognition in GitHub and Slack
- **Conference Opportunities**: Speaking opportunities at OpenMSP events
- **Swag and Prizes**: OpenFrame merchandise for significant contributors

### Contribution Metrics

We track and celebrate:
- **First-time Contributors**: Special welcome and support
- **Regular Contributors**: Ongoing recognition and opportunities
- **Code Reviews**: Quality feedback and mentoring
- **Documentation**: Improving accessibility for all users
- **Community Support**: Helping others in Slack and forums

## Getting Help

### Where to Ask Questions

- **General Questions**: `#general` channel in Slack
- **Development Help**: `#development` channel in Slack
- **Bug Reports**: GitHub Issues
- **Feature Discussions**: `#feature-requests` channel in Slack

### Mentorship Program

New contributors can request mentorship:

1. **Join Slack**: Connect with the community
2. **Express Interest**: Ask in `#development` channel
3. **Get Matched**: We'll pair you with an experienced contributor
4. **Start Contributing**: Begin with guided contributions

## Legal and Licensing

### Contributor License Agreement (CLA)

By contributing to OpenFrame, you agree that:

- Your contributions are your original work
- You grant OpenFrame project the right to use your contributions
- Your contributions are submitted under the project's license terms

### Code License

OpenFrame is released under the Apache License 2.0. All contributions must be compatible with this license.

### Third-Party Dependencies

When adding new dependencies:

- **Check License Compatibility**: Ensure compatible with Apache 2.0
- **Update Documentation**: Add to dependency documentation
- **Security Review**: Verify dependency security status
- **Minimize Dependencies**: Avoid unnecessary dependencies

## Resources

### Essential Links
- **OpenFrame Website**: https://openframe.ai
- **Flamingo Platform**: https://www.flamingo.run/openframe
- **OpenMSP Community**: https://www.openmsp.ai/
- **Slack Community**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA

### Development Resources
- **[Environment Setup](../setup/environment.md)**
- **[Local Development](../setup/local-development.md)**
- **[Architecture Guide](../architecture/README.md)**
- **[Security Guidelines](../security/README.md)**
- **[Testing Guide](../testing/README.md)**

### Learning Resources
- **Spring Boot Documentation**: https://spring.io/projects/spring-boot
- **Spring Security**: https://spring.io/projects/spring-security
- **MongoDB**: https://docs.mongodb.com/
- **Apache Kafka**: https://kafka.apache.org/documentation/

---

Thank you for contributing to OpenFrame! Your contributions help build the future of open-source MSP automation. Together, we're creating powerful, accessible technology for managed service providers worldwide. 🚀

**Questions?** Join our [Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) and ask in the `#contributing` channel!