# Contributing Guidelines

Welcome to OpenFrame! We appreciate your interest in contributing to the platform. This guide will help you get started with the contribution process, coding standards, and development workflow.

## 🤝 How to Contribute

### Types of Contributions

We welcome several types of contributions:

**🐛 Bug Reports**
- Report bugs you encounter
- Provide detailed reproduction steps
- Include system information and logs

**✨ Feature Requests**
- Suggest new features or improvements
- Explain the use case and benefits
- Provide mockups or examples if applicable

**💻 Code Contributions**
- Bug fixes
- New features
- Performance improvements
- Documentation updates

**📚 Documentation**
- Improve existing documentation
- Add missing documentation
- Fix typos and clarifications

**🧪 Testing**
- Add test coverage
- Improve test quality
- Performance testing

## 🚀 Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR-USERNAME/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git
```

### 2. Set Up Development Environment

Follow the [Environment Setup Guide](../setup/environment.md) to configure your development environment.

### 3. Create a Feature Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

## 📋 Development Workflow

### Branch Naming Convention

Use descriptive branch names that follow this pattern:

```text
type/short-description

Types:
- feature/    New features
- fix/        Bug fixes  
- docs/       Documentation changes
- test/       Test improvements
- refactor/   Code refactoring
- perf/       Performance improvements
- chore/      Maintenance tasks
```

**Examples:**
```bash
feature/device-batch-operations
fix/authentication-token-refresh
docs/api-documentation-update
test/integration-test-coverage
refactor/service-layer-cleanup
perf/database-query-optimization
```

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
type(scope): brief description

Longer description explaining the change in detail.
Include motivation for the change and contrast with
previous behavior.

Closes #123
Fixes #456
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements

**Examples:**
```bash
feat(devices): add device batch operations API

Add support for performing operations on multiple devices
simultaneously. This improves efficiency for MSPs managing
large device fleets.

- Add batch update endpoint
- Add batch command execution
- Include progress tracking
- Add comprehensive tests

Closes #234

fix(auth): resolve token refresh race condition

Fixed a race condition in token refresh logic that could
cause authentication failures during concurrent requests.

The issue occurred when multiple requests tried to refresh
the same expired token simultaneously.

Fixes #567
```

## 🎨 Code Style and Standards

### Java Code Style

We follow **Google Java Style Guide** with some modifications:

**Formatting:**
```java
// Use 4 spaces for indentation
public class DeviceService {
    
    private final DeviceRepository deviceRepository;
    private final EventPublisher eventPublisher;
    
    public DeviceService(DeviceRepository deviceRepository, 
                        EventPublisher eventPublisher) {
        this.deviceRepository = deviceRepository;
        this.eventPublisher = eventPublisher;
    }
    
    public Device createDevice(CreateDeviceRequest request) {
        validateRequest(request);
        
        Device device = Device.builder()
            .hostname(request.getHostname())
            .operatingSystem(request.getOperatingSystem())
            .tenantId(getCurrentTenantId())
            .status(DeviceStatus.PENDING)
            .createdAt(Instant.now())
            .build();
            
        Device savedDevice = deviceRepository.save(device);
        eventPublisher.publishDeviceCreated(savedDevice);
        
        return savedDevice;
    }
}
```

**Naming Conventions:**
- Classes: `PascalCase` (e.g., `DeviceService`, `ApiKeyController`)
- Methods: `camelCase` (e.g., `createDevice`, `validateRequest`)
- Variables: `camelCase` (e.g., `deviceRepository`, `savedDevice`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_ATTEMPTS`)
- Packages: `lowercase` (e.g., `com.openframe.api.service`)

**Documentation:**
```java
/**
 * Service responsible for device lifecycle management.
 * 
 * Handles device creation, updates, and deletion while ensuring
 * proper tenant isolation and event publishing.
 * 
 * @author Development Team
 * @since 1.0.0
 */
@Service
@Transactional
public class DeviceService {
    
    /**
     * Creates a new device for the current tenant.
     * 
     * @param request the device creation request containing hostname,
     *                operating system, and other device details
     * @return the created device with generated ID and timestamps
     * @throws ValidationException if the request is invalid
     * @throws TenantNotFoundException if no tenant context is found
     */
    public Device createDevice(CreateDeviceRequest request) {
        // Implementation
    }
}
```

### TypeScript/React Code Style

We use **ESLint** and **Prettier** for consistent formatting:

**Component Style:**
```typescript
import React, { FC, useCallback, useMemo } from 'react';
import { Device, DeviceStatus } from '../types/device.types';
import { useDeviceActions } from '../hooks/useDeviceActions';

interface DeviceCardProps {
  device: Device;
  onDeviceClick: (deviceId: string) => void;
  className?: string;
}

/**
 * Device card component displaying device information and status.
 * 
 * Provides quick actions for device management and real-time status updates.
 */
export const DeviceCard: FC<DeviceCardProps> = ({
  device,
  onDeviceClick,
  className = ''
}) => {
  const { updateDeviceStatus } = useDeviceActions();
  
  const handleClick = useCallback(() => {
    onDeviceClick(device.id);
  }, [device.id, onDeviceClick]);
  
  const statusColor = useMemo(() => {
    switch (device.status) {
      case DeviceStatus.ONLINE:
        return 'bg-green-500';
      case DeviceStatus.OFFLINE:
        return 'bg-red-500';
      case DeviceStatus.MAINTENANCE:
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  }, [device.status]);
  
  return (
    <div 
      className={`device-card p-4 border rounded-lg hover:shadow-lg cursor-pointer ${className}`}
      onClick={handleClick}
      data-testid="device-card"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{device.hostname}</h3>
          <p className="text-sm text-gray-600">{device.operatingSystem}</p>
        </div>
        <div 
          className={`w-3 h-3 rounded-full ${statusColor}`}
          data-testid="status-indicator"
          title={device.status}
        />
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        Last seen: {new Date(device.lastSeen).toLocaleString()}
      </div>
    </div>
  );
};
```

**Hooks and Utilities:**
```typescript
// Custom hook example
export const useDeviceActions = () => {
  const [updateDevice] = useUpdateDeviceMutation();
  
  const updateDeviceStatus = useCallback(async (
    deviceId: string, 
    status: DeviceStatus
  ) => {
    try {
      await updateDevice({
        variables: {
          id: deviceId,
          input: { status }
        }
      });
      
      // Show success notification
      toast.success('Device status updated successfully');
    } catch (error) {
      console.error('Failed to update device status:', error);
      toast.error('Failed to update device status');
    }
  }, [updateDevice]);
  
  return {
    updateDeviceStatus
  };
};
```

### Database and API Conventions

**Database Naming:**
```javascript
// MongoDB collection naming: kebab-case
{
  "_id": ObjectId("..."),
  "tenant_id": "acme-corp",        // snake_case for fields
  "hostname": "laptop-001",
  "operating_system": "Windows 11",
  "ip_address": "192.168.1.100",
  "created_at": ISODate("..."),
  "updated_at": ISODate("...")
}
```

**GraphQL Schema:**
```graphql
# Use PascalCase for types
type Device {
  id: ID!
  hostname: String!
  operatingSystem: String!
  ipAddress: String
  status: DeviceStatus!
  createdAt: DateTime!
  updatedAt: DateTime!
}

# Use camelCase for fields and arguments
type Query {
  devices(
    first: Int
    after: String
    filter: DeviceFilterInput
  ): DeviceConnection!
}

# Use UPPER_CASE for enums
enum DeviceStatus {
  ONLINE
  OFFLINE
  MAINTENANCE
  ERROR
}
```

**REST API Conventions:**
```bash
# Use kebab-case for URLs
GET    /api/v1/devices
POST   /api/v1/devices
GET    /api/v1/devices/{id}
PUT    /api/v1/devices/{id}
DELETE /api/v1/devices/{id}

# Use camelCase in JSON payloads
{
  "hostname": "laptop-001",
  "operatingSystem": "Windows 11",
  "ipAddress": "192.168.1.100",
  "deviceType": "LAPTOP"
}
```

## 🧪 Testing Requirements

### Test Coverage Requirements

**Minimum Coverage:**
- **Unit Tests**: 80% line coverage
- **Integration Tests**: All critical paths covered
- **E2E Tests**: Main user workflows covered

### Writing Tests

**Unit Test Example:**
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
    
    @Test
    @DisplayName("Should create device successfully with valid input")
    void shouldCreateDeviceWithValidInput() {
        // Given
        CreateDeviceRequest request = CreateDeviceRequest.builder()
            .hostname("test-device")
            .operatingSystem("Windows 11")
            .build();
            
        Device expectedDevice = Device.builder()
            .id("device-123")
            .hostname("test-device")
            .operatingSystem("Windows 11")
            .build();
            
        when(deviceRepository.save(any(Device.class))).thenReturn(expectedDevice);
        
        // When
        Device result = deviceService.createDevice(request);
        
        // Then
        assertThat(result.getHostname()).isEqualTo("test-device");
        verify(eventPublisher).publishDeviceCreated(expectedDevice);
    }
}
```

**Integration Test Example:**
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class DeviceControllerIntegrationTest {
    
    @Container
    static MongoDBContainer mongodb = new MongoDBContainer("mongo:6.0");
    
    @Test
    @WithMockUser(authorities = {"devices:write"})
    void shouldCreateDeviceViaAPI() {
        CreateDeviceRequest request = new CreateDeviceRequest("test-device", "Windows 11");
        
        given()
            .contentType(ContentType.JSON)
            .body(request)
        .when()
            .post("/api/v1/devices")
        .then()
            .statusCode(201)
            .body("hostname", equalTo("test-device"));
    }
}
```

## 📝 Pull Request Process

### Before Submitting

**Pre-submission Checklist:**
- [ ] Code follows style guidelines
- [ ] All tests pass locally
- [ ] New tests added for new functionality
- [ ] Documentation updated if needed
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main

### Pull Request Template

```markdown
## Summary
Brief description of the changes made.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Performance improvement

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed
- [ ] All tests pass

## Changes Made
- List of specific changes
- Include any breaking changes
- Note any dependencies added/removed

## Related Issues
Closes #123
Fixes #456

## Screenshots (if applicable)
Include screenshots for UI changes.

## Deployment Notes
Any special deployment considerations.
```

### Review Process

**Code Review Criteria:**
1. **Functionality**: Does the code work as intended?
2. **Code Quality**: Is the code readable and maintainable?
3. **Tests**: Are tests comprehensive and meaningful?
4. **Documentation**: Is code properly documented?
5. **Performance**: Are there any performance concerns?
6. **Security**: Are security best practices followed?
7. **Architecture**: Does the change fit the overall architecture?

**Review Timeline:**
- Small changes (< 100 lines): 1-2 business days
- Medium changes (100-500 lines): 2-3 business days  
- Large changes (> 500 lines): 3-5 business days

### Addressing Review Feedback

```bash
# Make requested changes
git add .
git commit -m "fix: address review feedback for device validation"

# Push changes
git push origin feature/your-feature-name

# The pull request will automatically update
```

## 🏷️ Release Process

### Version Management

We use **Semantic Versioning** (SemVer):

```text
MAJOR.MINOR.PATCH

- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes (backward compatible)
```

### Release Branches

```bash
# Create release branch from main
git checkout main
git pull upstream main
git checkout -b release/1.2.0

# Update version numbers
# Update CHANGELOG.md
# Final testing

# Merge to main and tag
git checkout main
git merge release/1.2.0
git tag v1.2.0
git push upstream main --tags
```

## 📚 Documentation Standards

### Code Documentation

**JavaDoc Standards:**
```java
/**
 * Creates a new device in the system.
 * 
 * This method performs the following operations:
 * 1. Validates the incoming request
 * 2. Creates a new device entity
 * 3. Saves the device to the repository
 * 4. Publishes a device creation event
 * 
 * @param request the device creation request containing hostname,
 *                operating system, and other device properties
 * @return the newly created device with generated ID and timestamps
 * @throws ValidationException if the request fails validation
 * @throws DuplicateHostnameException if hostname already exists
 * @throws TenantNotFoundException if current tenant is not found
 * 
 * @since 1.0.0
 * @author John Doe
 */
public Device createDevice(CreateDeviceRequest request) {
    // Implementation
}
```

**README Standards:**
```markdown
# Component Name

Brief description of what the component does.

## Features

- Feature 1
- Feature 2
- Feature 3

## Usage

```java
// Example usage
DeviceService service = new DeviceService(repository, publisher);
Device device = service.createDevice(request);
```

## Configuration

| Property | Description | Default | Required |
|----------|-------------|---------|----------|
| `hostname` | Device hostname | - | Yes |
| `os` | Operating system | - | Yes |

## Dependencies

- Spring Boot 3.3.0+
- MongoDB 6.0+

## Testing

```bash
mvn test
```
```

### API Documentation

**OpenAPI Documentation:**
```java
@RestController
@RequestMapping("/api/v1/devices")
@Tag(name = "Device Management", description = "Operations for managing devices")
public class DeviceController {
    
    @PostMapping
    @Operation(
        summary = "Create a new device",
        description = "Creates a new device in the system for the current tenant"
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
        @ApiResponse(responseCode = "401", description = "Unauthorized"),
        @ApiResponse(responseCode = "403", description = "Forbidden")
    })
    public ResponseEntity<DeviceResponse> createDevice(
        @Valid @RequestBody CreateDeviceRequest request) {
        // Implementation
    }
}
```

## 🐛 Bug Reports

### Bug Report Template

```markdown
## Bug Description
Clear description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Screenshots
Add screenshots if applicable.

## Environment
- OS: [e.g. Windows 11, macOS 13]
- Browser: [e.g. Chrome 91, Firefox 89]
- Version: [e.g. 1.2.3]

## Additional Context
Any other context about the problem.

## Logs
```
Paste relevant log output here
```
```

## 🌟 Feature Requests

### Feature Request Template

```markdown
## Feature Summary
Brief summary of the feature request.

## Motivation
Why is this feature needed? What problem does it solve?

## Detailed Description
Detailed description of the proposed feature.

## Proposed Solution
How should this feature work?

## Alternatives Considered
Alternative solutions you've considered.

## Additional Context
Any other context, mockups, or examples.
```

## 📊 Performance Guidelines

### Performance Requirements

**Response Time Targets:**
- API endpoints: < 200ms (p95)
- Database queries: < 100ms (p95)
- Page loads: < 2s (p95)
- Real-time updates: < 1s

**Performance Testing:**
```java
@Test
@Timeout(value = 200, unit = TimeUnit.MILLISECONDS)
void shouldQueryDevicesWithinTimeLimit() {
    // Test implementation
}
```

### Database Performance

**Query Guidelines:**
- Use indexes for frequently queried fields
- Implement cursor-based pagination
- Avoid N+1 query problems
- Use database-specific optimizations

```java
// Good - uses index and pagination
@Query("{'tenantId': ?0, 'status': ?1}")
Page<Device> findByTenantIdAndStatus(String tenantId, DeviceStatus status, Pageable pageable);

// Bad - no index, loads all data
@Query("{'createdAt': {$gte: ?0}}")
List<Device> findAllCreatedAfter(Instant timestamp);
```

## 🔒 Security Guidelines

### Security Checklist

**Code Security:**
- [ ] Input validation implemented
- [ ] Output encoding applied
- [ ] SQL injection prevention
- [ ] XSS prevention measures
- [ ] Authentication checks in place
- [ ] Authorization properly implemented
- [ ] Sensitive data encrypted
- [ ] Secrets not hardcoded

**Review Security:**
- [ ] New endpoints secured
- [ ] Tenant isolation maintained
- [ ] No information disclosure
- [ ] Audit logging present
- [ ] Rate limiting applied
- [ ] OWASP guidelines followed

## 🎉 Recognition

### Contributor Recognition

We recognize contributions in several ways:

**GitHub Recognition:**
- Contributor list in README
- Release notes mention contributors
- GitHub contributor statistics

**Community Recognition:**
- Monthly contributor highlights
- Community Slack mentions
- Blog post features for major contributions

## 📞 Getting Help

### Community Resources

- **[OpenMSP Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)**: Get help from the community
- **GitHub Discussions**: For longer-form discussions
- **GitHub Issues**: For bug reports and feature requests

### Development Support

**Before Asking for Help:**
1. Check existing documentation
2. Search GitHub issues
3. Review recent discussions
4. Try debugging yourself

**When Asking for Help:**
- Provide clear problem description
- Include relevant code snippets
- Share error messages and logs
- Mention what you've already tried

## ✨ Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behavior includes:**
- Being respectful and inclusive
- Accepting constructive criticism gracefully
- Focusing on what's best for the community
- Showing empathy towards others

**Unacceptable behavior includes:**
- Harassment or discriminatory language
- Personal attacks or insults
- Publishing private information without consent
- Other conduct inappropriate in a professional setting

### Enforcement

Instances of unacceptable behavior may be reported to the project maintainers. All complaints will be reviewed and investigated promptly and fairly.

## 🚀 Conclusion

Thank you for contributing to OpenFrame! Your contributions help make the platform better for everyone in the MSP community.

**Next Steps:**
1. Set up your [development environment](../setup/environment.md)
2. Read the [architecture overview](../architecture/README.md)
3. Check out [good first issues](https://github.com/flamingo-stack/openframe-oss-tenant/labels/good%20first%20issue)
4. Join our [community Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

Happy coding! 🎉