# Contributing Guidelines

Welcome to OpenFrame! We're excited that you want to contribute to the platform. This guide outlines our development practices, code standards, and contribution process.

## Code of Conduct

OpenFrame follows the [OpenMSP Community Code of Conduct](https://www.openmsp.ai/code-of-conduct). By participating, you agree to uphold this code. Report unacceptable behavior to conduct@openmsp.ai.

## Getting Started

### Prerequisites for Contributors

1. **Complete the development setup**: Follow [Environment Setup](../setup/environment.md)
2. **Join our community**: [OpenMSP Slack](https://www.openmsp.ai/) 
3. **Read the architecture**: Review [Architecture Overview](../architecture/README.md)
4. **Understand testing**: Read [Testing Overview](../testing/README.md)

### Finding Ways to Contribute

**Good First Issues:**
- Look for issues labeled `good-first-issue` 
- Documentation improvements
- Unit test additions
- Bug fixes in non-critical areas

**Ongoing Needs:**
- Integration improvements
- UI/UX enhancements
- Performance optimizations
- Security enhancements

> **Note**: We use **OpenMSP Slack** for discussions, not GitHub Issues. Join our [#contributors](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) channel.

## Development Workflow

### Branch Strategy

We use a **feature branch workflow** with the following conventions:

```text
main           - Production ready code
develop        - Integration branch for next release  
feature/*      - Feature development branches
bugfix/*       - Bug fix branches
hotfix/*       - Critical production fixes
release/*      - Release preparation branches
```

### Branch Naming Conventions

```bash
# Feature branches
feature/user-management-ui
feature/device-filtering
feature/ai-agent-improvements

# Bug fix branches  
bugfix/device-sync-error
bugfix/auth-token-refresh

# Hotfix branches
hotfix/security-vulnerability-fix
hotfix/critical-data-loss-bug
```

### Creating a Contribution

**1. Fork and Clone:**
```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/your-username/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git
```

**2. Create Feature Branch:**
```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
```

**3. Make Changes:**
```bash
# Make your changes following coding standards
# Add tests for your changes
# Update documentation if needed

# Verify tests pass
mvn test  # Backend tests
npm test  # Frontend tests (if applicable)
```

**4. Commit Changes:**
```bash
# Stage your changes
git add .

# Commit with descriptive message (see commit conventions below)
git commit -m "feat: add device filtering functionality"
```

**5. Submit Pull Request:**
```bash
# Push to your fork
git push origin feature/your-feature-name

# Create pull request on GitHub
# Fill out the PR template completely
```

## Commit Message Conventions

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat: add device filtering API` |
| `fix` | Bug fix | `fix: resolve authentication timeout issue` |
| `docs` | Documentation | `docs: update API documentation` |
| `style` | Code style/formatting | `style: fix code formatting in DeviceService` |
| `refactor` | Code refactoring | `refactor: simplify organization query logic` |
| `test` | Adding/updating tests | `test: add integration tests for user service` |
| `chore` | Maintenance tasks | `chore: update dependencies` |
| `perf` | Performance improvements | `perf: optimize database queries` |
| `ci` | CI/CD changes | `ci: update GitHub Actions workflow` |

### Examples

**Simple commit:**
```bash
git commit -m "feat: add device status filtering"
```

**Commit with scope:**
```bash
git commit -m "fix(auth): resolve JWT token refresh issue"
```

**Commit with body:**
```bash
git commit -m "feat: implement AI-powered incident triage

Add Mingo AI integration to automatically classify and prioritize
incoming incidents based on severity and affected systems.

- Integrate with Anthropic Claude for natural language processing
- Add incident classification models
- Implement priority scoring algorithm"
```

**Breaking change:**
```bash
git commit -m "feat!: change API response format for devices

BREAKING CHANGE: Device API now returns paginated results
instead of flat arrays. Update client code to use cursor-based
pagination."
```

## Code Style & Standards

### Java/Spring Boot Backend

**Code Formatting:**
- Use **4 spaces** for indentation (no tabs)
- Line length: **120 characters** maximum
- Use **Google Java Style Guide** as base with OpenFrame customizations

**Naming Conventions:**
```java
// Classes: PascalCase
public class OrganizationService {}

// Methods and variables: camelCase
public void createOrganization() {}
private String tenantId;

// Constants: SCREAMING_SNAKE_CASE
private static final String DEFAULT_TENANT_ID = "default";

// Packages: lowercase with dots
package com.openframe.api.service;
```

**Code Structure:**
```java
@RestController
@RequestMapping("/api/organizations")
@Validated
@Slf4j
public class OrganizationController {
    
    // Dependencies first
    private final OrganizationService organizationService;
    
    // Constructor injection (preferred)
    public OrganizationController(OrganizationService organizationService) {
        this.organizationService = organizationService;
    }
    
    // Public methods
    @GetMapping
    @PreAuthorize("hasPermission('organization:read')")
    public ResponseEntity<List<Organization>> getOrganizations(
            @AuthenticationPrincipal AuthPrincipal principal) {
        
        List<Organization> organizations = organizationService
            .getOrganizations(principal.getTenantId());
        return ResponseEntity.ok(organizations);
    }
    
    // Private methods last
    private void validateRequest(CreateOrganizationRequest request) {
        // Validation logic
    }
}
```

**Documentation Standards:**
```java
/**
 * Service for managing organization lifecycle and operations.
 * 
 * <p>This service handles CRUD operations for organizations within
 * a multi-tenant environment, ensuring proper tenant isolation
 * and access control.</p>
 * 
 * @author OpenFrame Team
 * @since 1.0.0
 */
@Service
@Transactional
public class OrganizationService {
    
    /**
     * Creates a new organization for the specified tenant.
     * 
     * @param request the organization creation request containing
     *                name, contact info, and address details
     * @param tenantId the ID of the tenant creating the organization
     * @return the created organization with generated ID and timestamps
     * @throws OrganizationValidationException if the request is invalid
     * @throws DuplicateOrganizationException if organization name exists
     */
    public Organization createOrganization(
            CreateOrganizationRequest request, 
            String tenantId) {
        // Implementation
    }
}
```

### TypeScript/React Frontend

**Code Formatting:**
- Use **2 spaces** for indentation
- Line length: **100 characters** maximum
- Use **Prettier** for consistent formatting
- Use **ESLint** for code quality

**Naming Conventions:**
```typescript
// Components: PascalCase
export function DeviceCard() {}

// Files: kebab-case
device-card.tsx
use-devices.ts

// Variables and functions: camelCase  
const deviceCount = 10;
function fetchDevices() {}

// Constants: SCREAMING_SNAKE_CASE
const API_BASE_URL = 'https://api.openframe.ai';

// Types and interfaces: PascalCase
interface DeviceFilter {
  organizationId?: string;
  status?: DeviceStatus;
}
```

**Component Structure:**
```typescript
// Import order: external libraries, internal modules, types
import React, { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Device, DeviceStatus } from '@/types/device';

interface DeviceCardProps {
  device: Device;
  onSelect: (device: Device) => void;
  onDelete?: (deviceId: string) => void;
}

/**
 * Displays device information in a card format with actions.
 * 
 * @param device - The device to display
 * @param onSelect - Callback when device is selected
 * @param onDelete - Optional callback for device deletion
 */
export function DeviceCard({ device, onSelect, onDelete }: DeviceCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Event handlers
  const handleSelect = useCallback(() => {
    onSelect(device);
  }, [device, onSelect]);
  
  const handleDelete = useCallback(async () => {
    if (!onDelete) return;
    
    setIsLoading(true);
    try {
      await onDelete(device.id);
    } finally {
      setIsLoading(false);
    }
  }, [device.id, onDelete]);
  
  return (
    <Card className="device-card">
      {/* Component JSX */}
    </Card>
  );
}
```

**Hook Patterns:**
```typescript
// Custom hook with proper error handling and loading states
export function useDevices(filter?: DeviceFilter) {
  return useQuery({
    queryKey: ['devices', filter],
    queryFn: () => apiClient.getDevices(filter),
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,   // 10 minutes
    refetchOnWindowFocus: false,
  });
}

// Mutation hook with optimistic updates
export function useUpdateDevice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: { id: string; data: UpdateDeviceData }) =>
      apiClient.updateDevice(params.id, params.data),
    
    onMutate: async ({ id, data }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['devices'] });
      
      // Snapshot previous value
      const previousDevices = queryClient.getQueryData(['devices']);
      
      // Optimistically update
      queryClient.setQueryData(['devices'], (old: Device[]) =>
        old.map(device => 
          device.id === id ? { ...device, ...data } : device
        )
      );
      
      return { previousDevices };
    },
    
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['devices'], context?.previousDevices);
    },
    
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}
```

## Testing Standards

### Test Coverage Requirements

- **Unit Tests**: 80%+ line coverage for new code
- **Integration Tests**: All critical user paths tested
- **E2E Tests**: Happy path scenarios covered

### Test Naming Conventions

```java
// Java test naming: should_<expected_result>_when_<condition>
@Test
void shouldCreateOrganization_whenValidRequest() {}

@Test  
void shouldThrowException_whenOrganizationNotFound() {}

@Test
void shouldReturnFilteredDevices_whenFilterApplied() {}
```

```typescript
// TypeScript test naming: descriptive sentences
describe('DeviceCard', () => {
  it('should display device information correctly', () => {});
  
  it('should call onSelect when clicked', () => {});
  
  it('should show loading state during delete', () => {});
});
```

### Test Structure (AAA Pattern)

```java
@Test
void shouldUpdateDeviceStatus_whenValidRequest() {
    // Arrange
    String deviceId = "device-123";
    String tenantId = "tenant-456";
    DeviceStatus newStatus = DeviceStatus.OFFLINE;
    Device existingDevice = TestDataBuilder.device()
        .id(deviceId)
        .tenantId(tenantId)
        .status(DeviceStatus.ONLINE)
        .build();
    
    when(deviceRepository.findByIdAndTenantId(deviceId, tenantId))
        .thenReturn(existingDevice);
    when(deviceRepository.save(any(Device.class)))
        .thenReturn(existingDevice);
    
    // Act
    Device updatedDevice = deviceService.updateDeviceStatus(deviceId, tenantId, newStatus);
    
    // Assert
    assertThat(updatedDevice.getStatus()).isEqualTo(DeviceStatus.OFFLINE);
    verify(deviceRepository).save(argThat(device -> 
        device.getStatus().equals(DeviceStatus.OFFLINE)));
}
```

## Pull Request Process

### PR Title Format

Use conventional commit format for PR titles:

```text
feat: implement device filtering functionality
fix: resolve authentication timeout issue
docs: update contribution guidelines
```

### PR Template

When creating a PR, fill out this information:

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)  
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass locally
- [ ] Integration tests pass locally
- [ ] Added tests for new functionality
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Code is properly commented
- [ ] Documentation updated if needed
- [ ] No new warnings or errors introduced

## Screenshots (if applicable)
Add screenshots for UI changes.

## Related Issues
Fixes #(issue number)
```

### Review Process

**Automated Checks:**
1. **CI/CD Pipeline**: All tests must pass
2. **Code Quality**: SonarQube analysis passes
3. **Security**: No new security vulnerabilities
4. **Performance**: No significant performance degradation

**Manual Review:**
1. **Code Review**: At least one approving review required
2. **Architecture Review**: For significant changes
3. **Security Review**: For security-related changes

### Review Checklist

**For Reviewers:**

- [ ] **Code Quality**: Code is clean, readable, and maintainable
- [ ] **Security**: No security vulnerabilities introduced
- [ ] **Performance**: No unnecessary performance impact
- [ ] **Testing**: Adequate test coverage for changes
- [ ] **Documentation**: Code is properly documented
- [ ] **Standards**: Follows project coding standards
- [ ] **Functionality**: Changes work as intended
- [ ] **Edge Cases**: Edge cases and error conditions handled

**Common Review Comments:**

```java
// ❌ Avoid: Hardcoded values
private static final String TENANT_ID = "tenant-123";

// ✅ Better: Configurable values
@Value("${openframe.default.tenant.id}")
private String defaultTenantId;

// ❌ Avoid: Generic exception handling
catch (Exception e) {
    log.error("Error occurred", e);
}

// ✅ Better: Specific exception handling  
catch (OrganizationNotFoundException e) {
    log.warn("Organization not found: {}", organizationId, e);
    throw new OrganizationNotFoundRestException(organizationId);
}
```

## Security Guidelines for Contributors

### Secure Coding Practices

**1. Input Validation:**
```java
// Always validate and sanitize input
@PostMapping("/organizations")
public ResponseEntity<Organization> createOrganization(
        @Valid @RequestBody CreateOrganizationRequest request,
        @AuthenticationPrincipal AuthPrincipal principal) {
    
    // Additional business validation
    validateOrganizationRequest(request);
    
    Organization org = organizationService.createOrganization(request, principal.getTenantId());
    return ResponseEntity.ok(org);
}
```

**2. Tenant Isolation:**
```java
// Always include tenant isolation in queries
public List<Device> getDevices(String tenantId) {
    return deviceRepository.findByTenantId(tenantId);
}

// ❌ Never do this - could expose other tenant's data
public List<Device> getAllDevices() {
    return deviceRepository.findAll(); // DANGEROUS!
}
```

**3. Authentication & Authorization:**
```java
// Always check permissions
@PreAuthorize("hasPermission('device:write', #deviceId)")
public Device updateDevice(String deviceId, UpdateDeviceRequest request) {
    // Implementation
}
```

### Secrets & Configuration

**Never commit secrets:**
```bash
# ❌ Never commit these files
.env
*.key
*.p12
application-prod.yml

# ✅ Use environment variables
MONGO_PASSWORD=${MONGO_PASSWORD:default-dev-password}
JWT_SECRET=${JWT_SECRET:dev-secret-change-in-prod}
```

## Documentation Standards

### Code Documentation

**JavaDoc for public APIs:**
```java
/**
 * Retrieves organizations for the specified tenant with optional filtering.
 * 
 * <p>This method supports cursor-based pagination for efficient handling
 * of large result sets. The cursor should be treated as an opaque string.</p>
 * 
 * @param tenantId the tenant identifier, must not be null
 * @param filter optional filter criteria for organizations
 * @param cursor optional cursor for pagination, null for first page
 * @param limit maximum number of results to return, must be positive
 * @return paginated result containing organizations and pagination info
 * @throws IllegalArgumentException if tenantId is null or limit is invalid
 * @throws TenantNotFoundException if the specified tenant does not exist
 * @since 1.2.0
 */
public CursorPageResult<Organization> getOrganizations(
        String tenantId,
        OrganizationFilter filter, 
        String cursor,
        int limit) {
    // Implementation
}
```

**README Updates:**
- Update README.md for significant feature additions
- Include usage examples
- Update installation/setup instructions if needed

### API Documentation

**OpenAPI/Swagger:**
```java
@Operation(
    summary = "Create new organization",
    description = "Creates a new organization for the authenticated tenant",
    responses = {
        @ApiResponse(responseCode = "200", description = "Organization created successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request data"),
        @ApiResponse(responseCode = "401", description = "Authentication required"),
        @ApiResponse(responseCode = "403", description = "Insufficient permissions")
    }
)
@PostMapping("/organizations")
public ResponseEntity<Organization> createOrganization(
    @Valid @RequestBody CreateOrganizationRequest request) {
    // Implementation
}
```

## Performance Guidelines

### Database Operations

```java
// ✅ Use efficient queries with proper indexing
@Query("{ 'tenantId': ?0, 'status': ?1 }")
List<Device> findByTenantIdAndStatus(String tenantId, DeviceStatus status);

// ✅ Use pagination for large result sets
public CursorPageResult<Device> getDevices(String tenantId, String cursor, int limit) {
    Query query = new Query()
        .addCriteria(Criteria.where("tenantId").is(tenantId))
        .limit(limit + 1); // +1 to determine hasNextPage
    
    if (cursor != null) {
        query.addCriteria(Criteria.where("_id").gt(cursor));
    }
    
    return buildPageResult(mongoTemplate.find(query, Device.class));
}

// ❌ Avoid N+1 queries
// Bad: Loading organizations one by one
for (Device device : devices) {
    Organization org = organizationService.getOrganization(device.getOrganizationId());
    // Process device with organization
}

// ✅ Good: Batch loading
Set<String> orgIds = devices.stream()
    .map(Device::getOrganizationId)
    .collect(Collectors.toSet());
Map<String, Organization> organizations = organizationService.getOrganizations(orgIds);
```

### Caching

```java
// Use appropriate cache strategies
@Cacheable(value = "organizations", key = "#tenantId + ':' + #orgId")
public Organization getOrganization(String tenantId, String orgId) {
    return organizationRepository.findByIdAndTenantId(orgId, tenantId);
}

@CacheEvict(value = "organizations", key = "#organization.tenantId + ':' + #organization.id")
public Organization updateOrganization(Organization organization) {
    return organizationRepository.save(organization);
}
```

## Release Process

### Version Numbering

We use [Semantic Versioning](https://semver.org/):

```text
MAJOR.MINOR.PATCH

Major: Breaking changes
Minor: New features (backward compatible)  
Patch: Bug fixes (backward compatible)
```

### Release Workflow

1. **Feature Freeze**: No new features, only bug fixes
2. **Release Branch**: Create `release/v1.2.0` branch
3. **Testing**: Comprehensive testing of release candidate
4. **Documentation**: Update changelog and release notes
5. **Tag**: Tag release `v1.2.0`
6. **Deploy**: Deploy to production
7. **Announcement**: Announce release in community

## Community Guidelines

### Communication

- **Be respectful**: Treat all community members with respect
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Allow time for reviews and responses
- **Be collaborative**: Work together to improve the platform

### Getting Help

**Development Questions:**
- Use `#development` channel in OpenMSP Slack
- Provide context and specific examples
- Share relevant code snippets

**Architecture Discussions:**
- Use `#architecture` channel for design discussions
- Include diagrams or mockups when helpful
- Consider impact on existing functionality

**General Support:**
- Use `#general` channel for general questions
- Search previous discussions before asking
- Help others when you can

### Recognition

We recognize contributors through:
- **Contributors list** in repository
- **Release notes** acknowledgments  
- **Community highlights** in Slack
- **Special badges** for significant contributions

## Troubleshooting Common Issues

### Build Problems

**Maven build fails:**
```bash
# Clear dependencies and rebuild
rm -rf ~/.m2/repository/com/openframe
mvn clean install -U
```

**Node/npm issues:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Development Issues

**Database connection problems:**
```bash
# Check if MongoDB is running
docker compose ps mongodb

# Restart if needed
docker compose restart mongodb
```

**Authentication issues:**
```bash
# Regenerate test JWT tokens
# Check token expiration
# Verify OAuth2 configuration
```

### Getting Contribution Help

- **Slack Channels**:
  - `#contributors` - General contributor discussion
  - `#development` - Technical development help
  - `#code-review` - Code review requests
  
- **Direct Support**:
  - Mention `@maintainers` for urgent issues
  - Email: contributors@openframe.ai

- **OpenMSP Community**: https://www.openmsp.ai/
- **Join Slack**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA

---

**🤝 Ready to Contribute!** Thank you for helping make OpenFrame better. Every contribution, no matter how small, makes a difference in the MSP community.