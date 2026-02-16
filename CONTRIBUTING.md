# Contributing to OpenFrame

Welcome to OpenFrame! We're excited that you want to contribute to the AI-powered MSP platform. This guide outlines our development practices, code standards, and contribution process.

## 📋 Quick Start for Contributors

### Prerequisites
1. **Complete the development setup**: [Environment Setup](./docs/development/setup/environment.md)
2. **Join our community**: [OpenMSP Slack](https://www.openmsp.ai/)
3. **Read the architecture**: [Architecture Overview](./docs/development/architecture/README.md)

### How to Contribute
```bash
# 1. Fork the repository on GitHub
git clone https://github.com/your-username/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Set up your development environment
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git
git checkout -b feature/your-feature-name

# 3. Make your changes with tests
mvn test  # Backend tests
npm test  # Frontend tests (if applicable)

# 4. Submit pull request
git push origin feature/your-feature-name
```

## 🌟 Ways to Contribute

### Good First Issues
- Documentation improvements
- Unit test additions
- Bug fixes in non-critical areas
- UI/UX enhancements

### Ongoing Needs
- **Tool Integrations**: Add support for new MSP tools (ConnectWise, Autotask, etc.)
- **AI Enhancements**: Improve Mingo and Fae AI capabilities
- **Frontend Components**: React components and user interfaces
- **Performance Optimizations**: Database queries, caching, API performance
- **Security Enhancements**: Authentication, authorization, data protection

> **Note**: We use **OpenMSP Slack** for discussions, not GitHub Issues. Join our [#contributors](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) channel.

## 🔄 Development Workflow

### Branch Strategy
```text
main           - Production ready code
develop        - Integration branch for next release
feature/*      - Feature development branches
bugfix/*       - Bug fix branches
hotfix/*       - Critical production fixes
```

### Branch Naming
```bash
# Features
feature/device-filtering-ui
feature/ai-agent-improvements

# Bug fixes
bugfix/auth-token-refresh
bugfix/device-sync-error

# Hotfixes
hotfix/security-vulnerability-fix
```

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>[optional scope]: <description>

[optional body]
[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix  
- `docs`: Documentation
- `style`: Code style/formatting
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat: add device filtering functionality
fix(auth): resolve JWT token refresh issue  
docs: update API documentation
test: add integration tests for user service
```

## 🎯 Code Standards

### Java/Spring Boot Backend

**Code Style:**
- **4 spaces** for indentation
- **120 characters** line length maximum
- **Google Java Style Guide** with OpenFrame customizations

**Structure Example:**
```java
@RestController
@RequestMapping("/api/organizations")
@Validated
@Slf4j
public class OrganizationController {
    
    private final OrganizationService organizationService;
    
    public OrganizationController(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }
    
    @GetMapping
    @PreAuthorize("hasPermission('organization:read')")
    public ResponseEntity<List<Organization>> getOrganizations(
            @AuthenticationPrincipal AuthPrincipal principal) {
        
        List<Organization> organizations = organizationService
            .getOrganizations(principal.getTenantId());
        return ResponseEntity.ok(organizations);
    }
}
```

**Security Requirements:**
```java
// ✅ Always include tenant isolation
public List<Device> getDevices(String tenantId) {
    return deviceRepository.findByTenantId(tenantId);
}

// ✅ Validate input and check permissions
@PreAuthorize("hasPermission('device:write')")
public Device updateDevice(@Valid UpdateDeviceRequest request) {
    // Implementation
}

// ❌ Never expose all tenant data
public List<Device> getAllDevices() {
    return deviceRepository.findAll(); // DANGEROUS!
}
```

### TypeScript/React Frontend

**Code Style:**
- **2 spaces** for indentation
- **100 characters** line length maximum
- **Prettier** for formatting, **ESLint** for quality

**Component Structure:**
```typescript
interface DeviceCardProps {
  device: Device;
  onSelect: (device: Device) => void;
  onDelete?: (deviceId: string) => void;
}

/**
 * Displays device information in a card format with actions.
 */
export function DeviceCard({ device, onSelect, onDelete }: DeviceCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSelect = useCallback(() => {
    onSelect(device);
  }, [device, onSelect]);
  
  return (
    <Card className="device-card">
      {/* Component JSX */}
    </Card>
  );
}
```

**Hook Patterns:**
```typescript
// Custom hook with proper error handling
export function useDevices(filter?: DeviceFilter) {
  return useQuery({
    queryKey: ['devices', filter],
    queryFn: () => apiClient.getDevices(filter),
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

## 🧪 Testing Requirements

### Coverage Requirements
- **Unit Tests**: 80%+ line coverage for new code
- **Integration Tests**: All critical user paths
- **E2E Tests**: Happy path scenarios

### Test Naming
```java
// Java tests: should_<expected_result>_when_<condition>
@Test
void shouldCreateOrganization_whenValidRequest() {}

@Test
void shouldThrowException_whenOrganizationNotFound() {}
```

```typescript
// TypeScript tests: descriptive sentences
describe('DeviceCard', () => {
  it('should display device information correctly', () => {});
  it('should call onSelect when clicked', () => {});
});
```

### Test Structure (AAA Pattern)
```java
@Test
void shouldUpdateDeviceStatus_whenValidRequest() {
    // Arrange
    String deviceId = "device-123";
    DeviceStatus newStatus = DeviceStatus.OFFLINE;
    Device existingDevice = TestDataBuilder.device().build();
    
    // Act
    Device updatedDevice = deviceService.updateDeviceStatus(deviceId, newStatus);
    
    // Assert
    assertThat(updatedDevice.getStatus()).isEqualTo(DeviceStatus.OFFLINE);
}
```

## 📝 Pull Request Process

### PR Title Format
Use conventional commit format:
```text
feat: implement device filtering functionality
fix: resolve authentication timeout issue
docs: update contribution guidelines
```

### PR Checklist
- [ ] **Tests**: Unit tests pass locally
- [ ] **Integration**: Integration tests pass locally
- [ ] **Documentation**: Updated if needed
- [ ] **Style**: Code follows style guidelines
- [ ] **Security**: No security vulnerabilities
- [ ] **Performance**: No performance degradation

### Review Process

**Automated Checks:**
- CI/CD pipeline passes
- Code quality analysis passes
- Security scan passes
- Test coverage maintained

**Manual Review:**
- At least one approving review required
- Architecture review for significant changes
- Security review for security-related changes

## 🔒 Security Guidelines

### Secure Coding Practices

**Input Validation:**
```java
@PostMapping("/organizations")
public ResponseEntity<Organization> createOrganization(
        @Valid @RequestBody CreateOrganizationRequest request,
        @AuthenticationPrincipal AuthPrincipal principal) {
    
    Organization org = organizationService.createOrganization(
        request, principal.getTenantId());
    return ResponseEntity.ok(org);
}
```

**Never Commit Secrets:**
```bash
# ❌ Never commit these
.env
*.key
*.p12
application-prod.yml

# ✅ Use environment variables
MONGO_PASSWORD=${MONGO_PASSWORD:default-dev-password}
JWT_SECRET=${JWT_SECRET:dev-secret}
```

## 🚀 Performance Guidelines

### Database Operations
```java
// ✅ Efficient queries with indexing
@Query("{ 'tenantId': ?0, 'status': ?1 }")
List<Device> findByTenantIdAndStatus(String tenantId, DeviceStatus status);

// ✅ Use pagination for large results
public CursorPageResult<Device> getDevices(String cursor, int limit) {
    // Cursor-based pagination implementation
}
```

### Caching
```java
@Cacheable(value = "organizations", key = "#tenantId + ':' + #orgId")
public Organization getOrganization(String tenantId, String orgId) {
    return organizationRepository.findByIdAndTenantId(orgId, tenantId);
}
```

## 📚 Documentation Standards

### JavaDoc for Public APIs
```java
/**
 * Retrieves organizations for the specified tenant with optional filtering.
 * 
 * @param tenantId the tenant identifier, must not be null
 * @param filter optional filter criteria for organizations
 * @param cursor optional cursor for pagination
 * @return paginated result containing organizations
 * @throws TenantNotFoundException if the tenant does not exist
 * @since 1.2.0
 */
public CursorPageResult<Organization> getOrganizations(
        String tenantId, OrganizationFilter filter, String cursor) {
    // Implementation
}
```

### API Documentation
```java
@Operation(
    summary = "Create new organization",
    description = "Creates a new organization for the authenticated tenant",
    responses = {
        @ApiResponse(responseCode = "200", description = "Organization created"),
        @ApiResponse(responseCode = "400", description = "Invalid request"),
        @ApiResponse(responseCode = "401", description = "Authentication required")
    }
)
```

## 🤝 Community Guidelines

### Communication Principles
- **Be respectful**: Treat all community members with respect
- **Be constructive**: Provide helpful feedback and suggestions  
- **Be patient**: Allow time for reviews and responses
- **Be collaborative**: Work together to improve the platform

### Getting Help

**Development Support:**
- **#development** channel in OpenMSP Slack
- **#contributors** channel for contributor discussions
- **#architecture** channel for design discussions

**Community:**
- **OpenMSP Community**: https://www.openmsp.ai/
- **Join Slack**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
- **Email**: contributors@openframe.ai

### Recognition
We recognize contributors through:
- Contributors list in repository
- Release notes acknowledgments
- Community highlights in Slack
- Special badges for significant contributions

## 🛠️ Troubleshooting

### Common Issues

**Build Problems:**
```bash
# Maven build fails
rm -rf ~/.m2/repository/com/openframe
mvn clean install -U

# Node/npm issues
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Development Issues:**
```bash
# Database connection problems
docker compose ps mongodb
docker compose restart mongodb

# Port conflicts
sudo lsof -i :8080
sudo kill -9 <PID>
```

## 📋 Areas of Contribution

### High-Impact Areas
1. **MSP Tool Integrations**
   - ConnectWise PSA/RMM
   - Autotask integration
   - Kaseya integration
   - N-central support

2. **AI/ML Enhancements**
   - Improve Mingo AI incident triage
   - Enhance Fae client interactions
   - Custom AI model training
   - Natural language processing

3. **Performance Optimization**
   - Database query optimization
   - Frontend performance improvements
   - Caching strategies
   - API response time optimization

4. **User Experience**
   - Dashboard improvements
   - Mobile responsiveness
   - Accessibility enhancements
   - User workflow optimization

### Getting Started with Specific Areas

**Tool Integrations:**
1. Review existing integrations in `external-api-service-core`
2. Study tool API documentation
3. Implement following existing patterns
4. Add comprehensive tests

**AI Enhancements:**
1. Understand VoltAgent architecture
2. Review existing AI integrations
3. Study prompt engineering patterns
4. Implement with proper testing

**Frontend Development:**
1. Review component library
2. Understand design system
3. Follow React best practices
4. Implement responsive design

## 📋 Release Process

We use [Semantic Versioning](https://semver.org/):
- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes (backward compatible)

## 🎉 Getting Started Checklist

- [ ] Join [OpenMSP Slack community](https://www.openmsp.ai/)
- [ ] Set up [development environment](./docs/development/setup/environment.md)
- [ ] Read [architecture overview](./docs/development/architecture/README.md)
- [ ] Review [security guidelines](./docs/development/security/README.md)
- [ ] Fork repository and create feature branch
- [ ] Make first contribution (documentation, tests, or small feature)
- [ ] Join `#contributors` channel for ongoing discussions

---

**🚀 Ready to Contribute?** Thank you for helping make OpenFrame the best open-source MSP platform. Every contribution, no matter how small, makes a difference in the MSP community!

For questions or guidance, reach out in our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) - we're here to help!