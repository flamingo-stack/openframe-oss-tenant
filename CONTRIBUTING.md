# Contributing to OpenFrame

Welcome to OpenFrame! We appreciate your interest in contributing to our AI-powered MSP platform. This guide outlines our development workflow, code standards, and contribution process.

## 🌟 Getting Started

### Prerequisites

Before contributing, ensure you have:
- **Java 21** or higher
- **Node.js 18+** and npm
- **Docker** and Docker Compose
- **Git** for version control
- **Maven 3.8+** for building Java services

### Development Environment Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
   cd openframe-oss-tenant
   ```

2. **Start development dependencies:**
   ```bash
   ./scripts/dev-start-dependencies.sh
   ```

3. **Initialize configuration:**
   ```bash
   ./clients/openframe-client/scripts/setup_dev_init_config.sh
   ```

4. **Build and start services:**
   ```bash
   mvn clean install -DskipTests
   ./scripts/start-all-services.sh
   ```

For detailed setup instructions, see our [Development Environment Guide](./docs/development/setup/local-development.md).

## 📝 Code Style and Conventions

### Java/Spring Boot Guidelines

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
```

**Multi-Tenant Security Requirements:**
- All database queries MUST include tenant ID scoping
- JWT token validation MUST include tenant context
- Add tests to prevent cross-tenant data access
- Use `@AuthenticationPrincipal AuthPrincipal principal` for tenant context

### Frontend Code Style (TypeScript/React)

**TypeScript Conventions:**
```typescript
// Interfaces: PascalCase with descriptive names
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

## 🔄 Development Workflow

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

### Related Issues
Closes #123
```

### Commit Message Format

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

## 🧪 Testing Requirements

### Unit Testing
- **Coverage Target**: Minimum 70% code coverage
- **Framework**: JUnit 5 for Java, Jest for TypeScript
- **Naming**: Test methods should clearly describe what is being tested
- **Isolation**: Tests must be independent and able to run in any order

```java
@Test
void shouldFilterDevicesByTenantId() {
    // Given
    String tenantId = "tenant-123";
    List<Device> tenantDevices = Arrays.asList(
        createDevice("device-1", tenantId),
        createDevice("device-2", tenantId)
    );
    
    when(deviceRepository.findByTenantId(tenantId)).thenReturn(tenantDevices);
    
    // When
    List<DeviceResponse> result = deviceService.getDevicesByTenant(tenantId);
    
    // Then
    assertThat(result).hasSize(2);
    assertThat(result.get(0).getTenantId()).isEqualTo(tenantId);
}
```

### Integration Testing
- **Database**: Use TestContainers for real database testing
- **Security**: Test cross-tenant data isolation
- **APIs**: Test complete request/response cycles
- **Multi-tenancy**: Verify tenant isolation at all layers

### End-to-End Testing
- **Critical Paths**: User registration, authentication, device management
- **AI Features**: Mingo AI conversations and tool execution
- **Real-time Features**: WebSocket connections and streaming

## 🔒 Security Guidelines

### Multi-Tenant Security (CRITICAL)
Every contribution MUST maintain strict tenant isolation:

```java
// ✅ CORRECT: Always include tenant scoping
@GetMapping("/devices")
public ResponseEntity<List<DeviceResponse>> getDevices(
        @AuthenticationPrincipal AuthPrincipal principal) {
    List<DeviceResponse> devices = deviceService.getDevicesByTenant(principal.getTenantId());
    return ResponseEntity.ok(devices);
}

// ❌ WRONG: Missing tenant context
@GetMapping("/devices") 
public ResponseEntity<List<DeviceResponse>> getDevices() {
    List<DeviceResponse> devices = deviceService.getAllDevices(); // Security violation!
    return ResponseEntity.ok(devices);
}
```

### Input Validation
- Validate all user inputs at the controller level
- Use Spring Validation annotations (`@Valid`, `@NotNull`, etc.)
- Sanitize inputs to prevent XSS and injection attacks
- Return structured error responses without sensitive data

### Authentication & Authorization
- JWT tokens MUST include tenant claims
- API endpoints MUST validate authentication
- Business logic MUST enforce authorization rules
- External APIs MUST use proper API key validation

## 🚀 Deployment and Release Process

### Feature Development Process

**1. Planning and Design:**
- Create or review GitHub issue
- Discuss architectural approach with team
- Design API contracts (if applicable)
- Consider security and multi-tenancy implications
- Plan testing strategy

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

### Code Review Checklist

**Security Review:**
- [ ] All user inputs are validated and sanitized
- [ ] Database queries include tenant ID scoping
- [ ] No hardcoded secrets or credentials
- [ ] Authentication is required for sensitive operations
- [ ] Authorization checks are in place
- [ ] Error messages don't leak sensitive information

**Architecture Review:**
- [ ] Follows established patterns and conventions
- [ ] Proper separation of concerns
- [ ] Uses dependency injection correctly
- [ ] Transaction boundaries are appropriate
- [ ] Error handling is consistent and comprehensive
- [ ] Performance considerations are addressed

**Testing Review:**
- [ ] Unit tests cover new functionality
- [ ] Integration tests cover service interactions
- [ ] Edge cases and error scenarios are tested
- [ ] Test coverage meets minimum requirements (70%+)

## 💬 Community and Communication

### Communication Channels

**OpenMSP Slack Community:**
- **General Discussion**: `#general`
- **Development Help**: `#dev-help`
- **Code Reviews**: `#code-review`
- **Architecture Discussions**: `#architecture`

**Join the community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

### Getting Help

**For New Contributors:**
- Join the `#new-contributors` channel in Slack
- Read through existing code and documentation
- Start with "good first issue" labeled tickets
- Ask questions in appropriate channels
- Pair with experienced contributors when possible

**Issue Reporting:**
Use our GitHub issue templates for:
- Bug reports with reproduction steps
- Feature requests with use cases
- Documentation improvements
- Performance issues

## 🎯 Contributing Areas

### High-Priority Contribution Areas

**AI/ML Features:**
- Mingo AI conversation improvements
- Intelligent alert processing
- Automated incident response workflows
- Tool execution optimization

**Multi-Tenancy & Security:**
- Enhanced tenant isolation
- OAuth provider integrations
- API security improvements
- Cross-tenant testing

**Integration & Tools:**
- New MSP tool integrations
- Data pipeline enhancements
- Real-time streaming improvements
- Agent communication protocols

**Developer Experience:**
- Documentation improvements
- Testing framework enhancements
- Development tooling
- CI/CD pipeline optimization

### Good First Issues

Look for issues labeled:
- `good-first-issue` - Beginner-friendly tasks
- `documentation` - Documentation improvements
- `testing` - Test coverage improvements
- `frontend` - UI/UX enhancements

## 📚 Resources and Documentation

**Essential Reading:**
- [Architecture Overview](./docs/architecture/README.md) - Understand the system design
- [Security Best Practices](./docs/security/README.md) - Learn security requirements
- [Testing Guide](./docs/testing/README.md) - Comprehensive testing practices

**External Resources:**
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [React Documentation](https://reactjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/docs/getting-started)

## 📄 License

By contributing to OpenFrame, you agree that your contributions will be licensed under the Flamingo AI Unified License v1.0.

---

*Thank you for contributing to OpenFrame! Your efforts help build a better, more secure, and more powerful MSP platform. Together, we're creating the future of AI-powered IT operations.*