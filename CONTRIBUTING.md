# Contributing to OpenFrame

Welcome to the OpenFrame project! This guide covers everything you need to know about contributing to the platform, from coding standards to the pull request process.

## 🚀 Getting Started

### Prerequisites for Contributors

Before contributing, ensure you have:

1. ✅ **Development Environment** - [Environment Setup](./docs/development/setup/environment.md) completed
2. ✅ **Local Development** - [Local Development](./docs/development/setup/local-development.md) working
3. ✅ **OpenMSP Slack Access** - [Join our community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
4. ✅ **GitHub Account** - With SSH key configured
5. ✅ **Basic Knowledge** - Spring Boot, React/Next.js, TypeScript

### First-Time Contributor Setup

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone git@github.com:YOUR_USERNAME/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream git@github.com:flamingo-stack/openframe-oss-tenant.git

# Verify remotes
git remote -v
# origin    git@github.com:YOUR_USERNAME/openframe-oss-tenant.git (fetch)
# origin    git@github.com:YOUR_USERNAME/openframe-oss-tenant.git (push)
# upstream  git@github.com:flamingo-stack/openframe-oss-tenant.git (fetch)
# upstream  git@github.com:flamingo-stack/openframe-oss-tenant.git (push)
```

## 📋 Code Standards

### Java/Spring Boot Standards

**Code Style:**
- **Google Java Style Guide** with minor modifications
- **4-space indentation**
- **120-character line limit**
- **Comprehensive Javadoc** for public APIs

**Service Layer Example:**
```java
/**
 * Service for managing device lifecycle operations.
 * 
 * <p>This service handles device registration, monitoring, and decommissioning
 * within the multi-tenant OpenFrame platform. All operations are tenant-aware
 * and enforce proper security boundaries.
 * 
 * @author OpenFrame Team
 * @since 1.0.0
 */
@Service
@Slf4j
@Transactional(readOnly = true)
public class DeviceService {
    
    private final DeviceRepository deviceRepository;
    private final OrganizationService organizationService;
    private final AuditService auditService;
    
    /**
     * Creates a new device within the specified organization.
     * 
     * @param request the device creation request containing device details
     * @return the created device with generated ID and metadata
     * @throws OrganizationNotFoundException if the organization doesn't exist
     * @throws DuplicateDeviceException if a device with the same name exists
     */
    @Transactional
    public Device createDevice(CreateDeviceRequest request) {
        log.debug("Creating device: {} for organization: {}", 
                 request.getDeviceName(), request.getOrganizationId());
        
        // Validate organization exists and user has access
        Organization organization = organizationService.findById(request.getOrganizationId());
        
        // Check for duplicate device names within organization
        if (deviceRepository.existsByTenantIdAndOrganizationIdAndDeviceName(
                TenantContext.getCurrentTenant(),
                request.getOrganizationId(),
                request.getDeviceName())) {
            throw new DuplicateDeviceException(
                "Device with name '" + request.getDeviceName() + "' already exists");
        }
        
        Device device = Device.builder()
            .id(UUID.randomUUID().toString())
            .tenantId(TenantContext.getCurrentTenant())
            .organizationId(request.getOrganizationId())
            .deviceName(request.getDeviceName())
            .deviceType(request.getDeviceType())
            .status(DeviceStatus.PENDING)
            .createdAt(Instant.now())
            .createdBy(SecurityContextHolder.getContext().getAuthentication().getName())
            .build();
            
        Device savedDevice = deviceRepository.save(device);
        auditService.logDeviceCreation(savedDevice);
        
        log.info("Successfully created device: {} with ID: {}", 
                savedDevice.getDeviceName(), savedDevice.getId());
        
        return savedDevice;
    }
}
```

### TypeScript/React Standards

**Code Style:**
- **Prettier** for code formatting
- **ESLint** for code quality
- **2-space indentation** for frontend code
- **PascalCase** for React components
- **camelCase** for functions and variables

**Component Structure:**
```typescript
// DeviceCard.tsx
import React from 'react';
import { Device, DeviceStatus } from '@/types/device';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDeviceActions } from '@/hooks/useDeviceActions';

interface DeviceCardProps {
  device: Device;
  onDeviceUpdate?: (deviceId: string, action: string) => void;
}

/**
 * DeviceCard displays device information in a card format.
 * 
 * Supports device actions like restart, update, and removal based on
 * user permissions and device status.
 */
export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  onDeviceUpdate,
}) => {
  const { executeAction, isLoading } = useDeviceActions();

  const handleAction = async (action: string) => {
    try {
      await executeAction(device.id, action);
      onDeviceUpdate?.(device.id, action);
    } catch (error) {
      console.error('Failed to execute device action:', error);
    }
  };

  const getStatusColor = (status: DeviceStatus): string => {
    switch (status) {
      case DeviceStatus.ONLINE:
        return 'bg-green-100 text-green-800';
      case DeviceStatus.OFFLINE:
        return 'bg-red-100 text-red-800';
      case DeviceStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {device.deviceName}
          </h3>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Type: {device.deviceType}</span>
            <span>IP: {device.ipAddress}</span>
            <span>OS: {device.operatingSystem}</span>
          </div>
          
          <div className="mt-3">
            <Badge 
              className={getStatusColor(device.status)}
              data-testid="device-status"
            >
              {device.status}
            </Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('restart')}
            disabled={isLoading || device.status === DeviceStatus.OFFLINE}
            data-testid="restart-device-button"
          >
            {isLoading ? 'Processing...' : 'Restart'}
          </Button>
        </div>
      </div>
    </div>
  );
};
```

## 🧪 Testing Standards

### Backend Testing Requirements

**Test Coverage Requirements:**
- **Service Layer**: 90% line coverage minimum
- **Repository Layer**: 85% line coverage minimum
- **Controller Layer**: 80% line coverage minimum
- **Critical Business Logic**: 100% coverage

**Test Structure:**
```java
@ExtendWith(MockitoExtension.class)
@DisplayName("DeviceService Tests")
class DeviceServiceTest {
    
    @Mock private DeviceRepository deviceRepository;
    @Mock private OrganizationService organizationService;
    @Mock private AuditService auditService;
    
    @InjectMocks private DeviceService deviceService;
    
    @Test
    @DisplayName("Should create device successfully with valid request")
    void shouldCreateDeviceSuccessfullyWithValidRequest() {
        // Given
        CreateDeviceRequest request = createValidDeviceRequest();
        Organization organization = createTestOrganization();
        when(organizationService.findById(any())).thenReturn(organization);
        when(deviceRepository.existsByTenantIdAndOrganizationIdAndDeviceName(any(), any(), any()))
            .thenReturn(false);
        when(deviceRepository.save(any(Device.class))).thenAnswer(invocation -> {
            Device device = invocation.getArgument(0);
            device.setId("generated-id");
            return device;
        });
        
        // When
        Device result = deviceService.createDevice(request);
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo("generated-id");
        assertThat(result.getDeviceName()).isEqualTo(request.getDeviceName());
        
        verify(deviceRepository).save(argThat(device ->
            device.getTenantId().equals(TenantContext.getCurrentTenant()) &&
            device.getStatus() == DeviceStatus.PENDING
        ));
        verify(auditService).logDeviceCreation(result);
    }
}
```

### Frontend Testing Requirements

**Test Coverage Requirements:**
- **Components**: 80% line coverage minimum
- **Custom Hooks**: 90% line coverage minimum
- **Utility Functions**: 95% line coverage minimum
- **Critical User Flows**: E2E tests required

## 🔄 Git Workflow

### Branch Naming Convention

```text
Feature Branches:     feature/[issue-number]-brief-description
Bug Fixes:           bugfix/[issue-number]-brief-description  
Hotfixes:            hotfix/[issue-number]-brief-description
Documentation:       docs/[topic]-brief-description
Refactoring:         refactor/[component]-brief-description

Examples:
feature/123-device-status-monitoring
bugfix/456-device-card-rendering-issue
hotfix/789-critical-security-patch
docs/api-documentation-update
refactor/device-service-cleanup
```

### Commit Message Convention

We follow **Conventional Commits** specification:

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```text
feat(devices): add device restart functionality

- Implement device restart API endpoint
- Add restart button to device card component
- Include audit logging for restart actions

Closes #123

fix(auth): resolve JWT token expiration handling

The token refresh mechanism was not properly handling expired tokens,
causing users to be logged out unexpectedly.

- Fix token refresh logic in AuthService
- Add proper error handling for expired tokens
- Update token refresh tests

Fixes #456
```

### Pull Request Process

#### 1. Before Creating PR

```bash
# Ensure you're on the latest main branch
git checkout main
git pull upstream main

# Create and checkout your feature branch
git checkout -b feature/123-device-status-monitoring

# Make your changes and commit
git add .
git commit -m "feat(devices): add device status monitoring"

# Push to your fork
git push origin feature/123-device-status-monitoring
```

#### 2. PR Template

When creating a pull request, use this template:

```markdown
## Description
Brief description of the changes and their purpose.

## Related Issue
Closes #[issue-number]

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## How Has This Been Tested?
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] E2E tests pass

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

#### 3. PR Review Process

**Approval Requirements:**
- ✅ **2 approvals** from maintainers for major features
- ✅ **1 approval** from maintainer for bug fixes and minor changes
- ✅ **All automated checks** must pass

## 📖 Documentation Standards

### Code Documentation

**Javadoc Requirements:**
```java
/**
 * Service for managing device lifecycle operations within the OpenFrame platform.
 * 
 * <p>This service provides comprehensive device management functionality including
 * registration, monitoring, configuration, and decommissioning. All operations
 * are tenant-aware and enforce proper security boundaries.
 * 
 * <h2>Security Considerations</h2>
 * <ul>
 *   <li>All operations require valid tenant context</li>
 *   <li>Cross-tenant access is prevented at the service layer</li>
 *   <li>Device access is restricted by organization membership</li>
 * </ul>
 * 
 * @author OpenFrame Team
 * @since 1.0.0
 * @see Device
 * @see DeviceRepository
 */
@Service
@Transactional(readOnly = true)
public class DeviceService {
    // Implementation
}
```

## 🚀 Release and Deployment

### Semantic Versioning

OpenFrame follows **Semantic Versioning (SemVer)**:

```text
MAJOR.MINOR.PATCH

MAJOR: Incompatible API changes
MINOR: Backward-compatible functionality additions  
PATCH: Backward-compatible bug fixes

Examples:
1.0.0 - Initial release
1.1.0 - New device monitoring features
1.1.1 - Bug fix for device status updates
2.0.0 - Breaking changes to device API
```

## 🌐 Community Guidelines

### Communication

**OpenMSP Slack Community:**
- **#general** - General discussions
- **#development** - Development questions and discussions
- **#bug-reports** - Bug reports and issue discussions
- **#feature-requests** - Feature suggestions and discussions

**Communication Guidelines:**
- ✅ **Be respectful** and inclusive
- ✅ **Search existing discussions** before asking questions
- ✅ **Provide context** when asking for help
- ✅ **Share knowledge** and help other contributors
- ❌ **Don't spam** or post off-topic content
- ❌ **Don't share sensitive information** in public channels

### Issue Reporting

**Bug Reports:**
```markdown
## Bug Description
Brief description of the bug

## Steps to Reproduce
1. Go to...
2. Click on...
3. See error

## Expected Behavior
What should happen instead

## Environment
- OpenFrame Version: [e.g. 1.2.0]
- Browser: [e.g. Chrome 120.0]
- OS: [e.g. Windows 11]
- Java Version: [e.g. 21.0.1]
- Node.js Version: [e.g. 18.19.0]
```

## 🤝 Getting Help

### Resources

1. **Documentation** - Start with our comprehensive guides
2. **[OpenMSP Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)** - Ask questions and get real-time help
3. **Code Reviews** - Learn from feedback on your contributions
4. **Mentorship** - Senior contributors available for guidance

### Troubleshooting

**Common Issues:**

```bash
# Build fails with dependency issues
mvn clean install -U

# Frontend tests failing
cd openframe/services/openframe-frontend
rm -rf node_modules package-lock.json
npm install

# Code style errors
mvn spotless:apply  # Backend
npm run format     # Frontend
```

## 🎯 Next Steps

Ready to contribute? Here's your path:

1. ✅ **Set up development environment** - [Environment Setup](./docs/development/setup/environment.md)
2. ✅ **Pick an issue** - Look for "good first issue" labels
3. ✅ **Join Slack community** - [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
4. ✅ **Create your first PR** - Follow this guide
5. ✅ **Engage with the community** - Help others and share knowledge

Welcome to the OpenFrame community! We're excited to have you contribute to the future of open-source MSP platforms. 🚀

---

For more detailed information, see our [Development Documentation](./docs/development/) and [Architecture Reference](./docs/architecture/).