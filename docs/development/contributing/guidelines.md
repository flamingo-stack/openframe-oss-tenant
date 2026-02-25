# Contributing Guidelines

Welcome to OpenFrame! We appreciate your interest in contributing to our AI-powered MSP platform. This guide outlines our development workflow, code standards, and contribution process.

## Code Style and Conventions

### Java/Spring Boot Code Style

**General Principles:**
- Follow [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)
- Use **meaningful variable and method names**
- Write **self-documenting code** with clear intent
- Apply **SOLID principles** for object-oriented design
- Maintain **consistent indentation** (4 spaces, no tabs)

**Naming Conventions:**
```java
// Class names: PascalCase
public class DeviceManagementService {
    
    // Constants: UPPER_SNAKE_CASE
    private static final String DEFAULT_DEVICE_STATUS = "UNKNOWN";
    private static final int MAX_RETRY_ATTEMPTS = 3;
    
    // Variables and methods: camelCase
    private final OrganizationRepository organizationRepository;
    private String tenantId;
    
    public DeviceResponse updateDeviceStatus(String deviceId, DeviceStatus status) {
        // Implementation
    }
    
    // Boolean methods: use is/has/can prefix
    public boolean isDeviceOnline(String deviceId) {
        return checkDeviceStatus(deviceId) == DeviceStatus.ONLINE;
    }
}
```

**Spring Boot Specific Conventions:**
```java
// Controllers: Use @RestController and clear mappings
@RestController
@RequestMapping("/api/devices")
@Validated
public class DeviceController {
    
    // Constructor injection (preferred over field injection)
    private final DeviceService deviceService;
    private final DeviceMapper deviceMapper;
    
    public DeviceController(DeviceService deviceService, DeviceMapper deviceMapper) {
        this.deviceService = deviceService;
        this.deviceMapper = deviceMapper;
    }
    
    // HTTP methods: clear, RESTful endpoints
    @GetMapping("/{deviceId}")
    public ResponseEntity<DeviceResponse> getDevice(
            @PathVariable String deviceId,
            @AuthenticationPrincipal AuthPrincipal principal) {
        
        DeviceResponse device = deviceService.getDevice(deviceId, principal.getTenantId());
        return ResponseEntity.ok(device);
    }
}

// Services: Use @Service and clear business logic separation
@Service
@Transactional
public class DeviceService {
    
    // Clear method contracts with proper exception handling
    public DeviceResponse updateDevice(String deviceId, UpdateDeviceRequest request, String tenantId) {
        Device device = deviceRepository.findByIdAndTenantId(deviceId, tenantId)
            .orElseThrow(() -> new DeviceNotFoundException("Device not found: " + deviceId));
        
        // Business logic here
        Device updatedDevice = deviceRepository.save(device);
        
        return deviceMapper.toResponse(updatedDevice);
    }
}
```

**Documentation Standards:**
```java
/**
 * Updates the status of a device with proper tenant isolation.
 * 
 * @param deviceId The unique identifier of the device
 * @param status The new status to set
 * @param tenantId The tenant context for this operation
 * @return Updated device information
 * @throws DeviceNotFoundException if device doesn't exist or doesn't belong to tenant
 * @throws IllegalArgumentException if status is invalid
 */
@Transactional
public DeviceResponse updateDeviceStatus(String deviceId, DeviceStatus status, String tenantId) {
    // Implementation
}
```

### Frontend Code Style (TypeScript/React)

**TypeScript Conventions:**
```typescript
// Interfaces: PascalCase with 'I' prefix (optional) or descriptive names
interface DeviceStatusProps {
  deviceId: string;
  status: 'online' | 'offline' | 'maintenance';
  onStatusChange?: (deviceId: string, newStatus: string) => void;
}

// Components: PascalCase, functional components preferred
export const DeviceStatus: React.FC<DeviceStatusProps> = ({ 
  deviceId, 
  status, 
  onStatusChange 
}) => {
  // Use descriptive variable names
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Clear function names describing what they do
  const handleStatusChange = useCallback(async (newStatus: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      await deviceApi.updateStatus(deviceId, newStatus);
      onStatusChange?.(deviceId, newStatus);
    } catch (error) {
      setErrorMessage('Failed to update device status');
    } finally {
      setIsLoading(false);
    }
  }, [deviceId, onStatusChange]);
  
  return (
    <div className={`device-status status-${status}`}>
      {/* Component JSX */}
    </div>
  );
};
```

**API Service Conventions:**
```typescript
// API services: clear, typed interfaces
export class DeviceApiService {
  private static readonly BASE_URL = '/api/devices';
  
  static async getDevices(filters?: DeviceFilters): Promise<Device[]> {
    const response = await fetch(`${this.BASE_URL}?${new URLSearchParams(filters)}`);
    
    if (!response.ok) {
      throw new ApiError('Failed to fetch devices', response.status);
    }
    
    return response.json();
  }
  
  static async updateDeviceStatus(deviceId: string, status: DeviceStatus): Promise<Device> {
    const response = await fetch(`${this.BASE_URL}/${deviceId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    
    if (!response.ok) {
      throw new ApiError('Failed to update device status', response.status);
    }
    
    return response.json();
  }
}
```

## Branch Naming and PR Process

### Branch Naming Convention

**Format**: `<type>/<short-description>`

**Branch Types:**
- `feature/` - New features or enhancements
- `bugfix/` - Bug fixes  
- `hotfix/` - Critical production fixes
- `refactor/` - Code refactoring without functional changes
- `docs/` - Documentation updates
- `test/` - Test additions or improvements
- `chore/` - Maintenance tasks, dependency updates

**Examples:**
```text
✅ Good branch names:
feature/multi-tenant-device-filtering
bugfix/jwt-token-validation-error
hotfix/memory-leak-in-stream-service
refactor/organization-service-cleanup
docs/api-documentation-update
test/integration-test-for-auth-flow

❌ Poor branch names:
fix
update
john-work
temp-branch
bug
```

### Pull Request Process

**1. Before Creating a PR:**
```bash
# Ensure your branch is up to date
git checkout main
git pull origin main
git checkout feature/your-feature-name
git rebase main

# Run tests locally
mvn clean verify
npm test  # For frontend changes

# Run code quality checks
mvn spotbugs:check
npm run lint
```

**2. PR Title and Description Format:**

**Title Format**: `[TYPE] Brief description of changes`

**Types:**
- `[FEATURE]` - New functionality
- `[BUGFIX]` - Bug resolution
- `[HOTFIX]` - Critical production fix
- `[REFACTOR]` - Code improvement without functional changes
- `[DOCS]` - Documentation updates
- `[TEST]` - Test-related changes

**Example PR Description:**
```markdown
## [FEATURE] Multi-tenant device filtering

### Summary
Implements tenant-aware device filtering to ensure users only see devices belonging to their organization and tenant.

### Changes Made
- Added tenant context validation in DeviceController
- Implemented tenant-scoped queries in DeviceRepository
- Updated DeviceService to enforce tenant isolation
- Added integration tests for multi-tenant scenarios

### Testing
- [x] Unit tests pass (`mvn test`)
- [x] Integration tests pass (`mvn verify`)
- [x] Manual testing with multiple tenants
- [x] Security tests for cross-tenant access prevention

### Security Considerations
- All database queries are scoped by tenant ID
- JWT token validation includes tenant context
- Added tests to prevent cross-tenant data access

### Breaking Changes
- None

### Migration Notes
- Database migration required for new tenant_id indexes

### Related Issues
Closes #123
```

**3. PR Review Checklist:**

**For Reviewers:**
- [ ] **Code Quality**: Clear, readable, and follows conventions
- [ ] **Security**: Tenant isolation, input validation, no hardcoded secrets
- [ ] **Testing**: Adequate test coverage and test quality
- [ ] **Performance**: No obvious performance issues
- [ ] **Documentation**: Code is self-documenting or has appropriate comments
- [ ] **Breaking Changes**: Properly identified and documented
- [ ] **Architecture**: Follows established patterns and principles

**For Authors:**
- [ ] **Self-Review**: Reviewed your own code before submitting
- [ ] **Tests Pass**: All automated tests are passing
- [ ] **Linting**: Code passes all linting and formatting checks
- [ ] **Documentation**: Updated relevant documentation
- [ ] **Migration**: Database migrations included if needed
- [ ] **Security**: No sensitive information in code or commits

## Commit Message Format

### Conventional Commits

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

**Format**: `<type>[optional scope]: <description>`

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, no logic changes)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks
- `perf:` - Performance improvements
- `ci:` - CI/CD changes
- `build:` - Build system changes

**Examples:**
```text
✅ Good commit messages:
feat(auth): implement multi-tenant JWT validation
fix(devices): resolve null pointer in device status update
docs(api): add authentication examples to API documentation
refactor(services): extract common tenant validation logic
test(integration): add tests for cross-tenant data isolation
chore(deps): upgrade Spring Boot to 3.3.0

❌ Poor commit messages:
Update code
Fix bug
Changes
WIP
Done
```

**Detailed Commit Message Format:**
```text
feat(auth): implement multi-tenant JWT validation

- Add tenant_id claim validation to JWT tokens
- Implement tenant-scoped RSA key lookup
- Add integration tests for tenant isolation
- Update security configuration for multi-tenancy

Closes #456
```

### Commit Guidelines

**Best Practices:**
- **Keep commits atomic** - One logical change per commit
- **Write clear commit messages** - Future you will thank you
- **Test before committing** - Ensure tests pass
- **No debugging code** - Remove console.log, print statements, etc.
- **Separate concerns** - Don't mix unrelated changes

**Commit Size Guidelines:**
```text
✅ Good commit practices:
- Single logical change
- All tests pass
- Clear, descriptive message
- No temporary/debugging code

❌ Poor commit practices:
- Multiple unrelated changes in one commit
- Commits that break tests
- Vague messages like "fix stuff"
- Commented-out code or debugging statements
```

## Review Checklist

### Code Review Guidelines

**Security Review:**
```markdown
## Security Checklist
- [ ] All user inputs are validated and sanitized
- [ ] Database queries include tenant ID scoping
- [ ] No hardcoded secrets or credentials
- [ ] Authentication is required for sensitive operations
- [ ] Authorization checks are in place
- [ ] Error messages don't leak sensitive information
- [ ] SQL injection prevention measures are implemented
- [ ] XSS prevention is implemented for user-generated content
```

**Architecture Review:**
```markdown
## Architecture Checklist
- [ ] Follows established patterns and conventions
- [ ] Proper separation of concerns
- [ ] Uses dependency injection correctly
- [ ] Transaction boundaries are appropriate
- [ ] Error handling is consistent and comprehensive
- [ ] Logging is appropriate and doesn't log sensitive data
- [ ] Performance considerations are addressed
- [ ] Scalability impact has been considered
```

**Testing Review:**
```markdown
## Testing Checklist
- [ ] Unit tests cover new functionality
- [ ] Integration tests cover service interactions
- [ ] Edge cases and error scenarios are tested
- [ ] Test data doesn't contain real/sensitive information
- [ ] Tests are independent and can run in any order
- [ ] Test names clearly describe what is being tested
- [ ] Mocking is used appropriately
- [ ] Test coverage meets minimum requirements (70%+)
```

### Frontend-Specific Review

**React/TypeScript Review:**
```markdown
## Frontend Checklist
- [ ] Components are properly typed with TypeScript
- [ ] Props interfaces are well-defined
- [ ] Error boundaries handle component errors
- [ ] Loading and error states are handled
- [ ] Accessibility attributes are included
- [ ] Components are responsive and mobile-friendly
- [ ] API calls handle network errors gracefully
- [ ] State management follows established patterns
- [ ] No unused variables or imports
- [ ] Performance optimizations are applied where needed
```

**UI/UX Review:**
```markdown
## UI/UX Checklist
- [ ] Design follows established UI patterns
- [ ] User interactions provide appropriate feedback
- [ ] Forms include proper validation and error messages
- [ ] Loading states are intuitive
- [ ] Navigation is clear and consistent
- [ ] Color contrast meets accessibility standards
- [ ] Touch targets are appropriately sized
- [ ] Content is readable and well-organized
```

## Development Workflow

### Feature Development Process

**1. Planning and Design:**
```text
1. Create or review GitHub issue
2. Discuss architectural approach with team
3. Design API contracts (if applicable)
4. Consider security and multi-tenancy implications
5. Plan testing strategy
```

**2. Development:**
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Develop incrementally with frequent commits
git add -A
git commit -m "feat(component): implement core functionality"

# Push regularly for backup and collaboration
git push origin feature/your-feature-name
```

**3. Testing and Quality Assurance:**
```bash
# Run comprehensive test suite
mvn clean verify
npm run test:all

# Check code quality
mvn spotbugs:check
npm run lint
npm run type-check

# Manual testing
./scripts/start-all-services.sh
# Test feature functionality manually
```

**4. Pull Request and Review:**
```text
1. Create PR with detailed description
2. Request review from appropriate team members
3. Address review feedback promptly
4. Ensure all automated checks pass
5. Squash commits if requested
```

**5. Merge and Deployment:**
```text
1. Merge PR using "Squash and merge" (preferred)
2. Delete feature branch
3. Verify deployment in staging environment
4. Monitor for any issues in production
```

### Hotfix Process

**For Critical Production Issues:**

```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-fix

# Implement minimal fix
# Add tests to prevent regression
# Update version number if applicable

# Create PR with "HOTFIX" label
# Require expedited review
# Deploy immediately after merge
```

## Getting Help

### Communication Channels

**OpenMSP Slack Community:**
- **General Discussion**: `#general`
- **Development Help**: `#dev-help`
- **Code Reviews**: `#code-review`
- **Architecture Discussions**: `#architecture`

**Join the community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

### Mentorship and Support

**For New Contributors:**
- Join the `#new-contributors` channel in Slack
- Read through existing code and documentation
- Start with "good first issue" labeled tickets
- Ask questions in appropriate channels
- Pair with experienced contributors when possible

**Code Review Support:**
- Request specific reviewers for your expertise area
- Use draft PRs for early feedback
- Don't hesitate to ask for clarification on review comments
- Share knowledge through thoughtful code reviews

### Resources and Documentation

**Essential Reading:**
- [Architecture Overview](../architecture/README.md) - Understand the system design
- [Security Best Practices](../security/README.md) - Learn security requirements
- [Testing Guide](../testing/README.md) - Comprehensive testing practices

**External Resources:**
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [React Documentation](https://reactjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

### Issue Reporting

**Bug Reports:**
```markdown
**Bug Description**
Clear description of the issue

**Steps to Reproduce**
1. Step one
2. Step two
3. Step three

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g., Ubuntu 22.04]
- Java Version: [e.g., 21.0.1]
- Browser: [e.g., Chrome 119] (if applicable)

**Additional Context**
Any other relevant information
```

**Feature Requests:**
```markdown
**Feature Description**
Clear description of the proposed feature

**Use Case**
Why is this feature needed?

**Proposed Implementation**
High-level approach (optional)

**Acceptance Criteria**
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
```

---

*Thank you for contributing to OpenFrame! Your efforts help build a better, more secure, and more powerful MSP platform. Together, we're creating the future of AI-powered IT operations.*