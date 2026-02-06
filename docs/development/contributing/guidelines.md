# Contributing Guidelines

Welcome to OpenFrame! We're excited to have you contribute to the open-source MSP platform. This guide will help you understand our development workflow, coding standards, and how to make meaningful contributions.

## Getting Started

### Prerequisites for Contributors

Before contributing, ensure you have:

1. **Completed the [Environment Setup](../setup/environment.md)**
2. **Successfully run OpenFrame locally** using the [Local Development Guide](../setup/local-development.md)
3. **Read the [Architecture Overview](../architecture/overview.md)** to understand the system
4. **Reviewed the [Testing Overview](../testing/overview.md)** for testing practices

### First-Time Setup

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
cd openframe-oss-tenant

# 3. Add upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git

# 4. Verify remotes
git remote -v
# origin    https://github.com/YOUR_USERNAME/openframe-oss-tenant.git (fetch)
# upstream  https://github.com/flamingo-stack/openframe-oss-tenant.git (fetch)

# 5. Install pre-commit hooks
npm install -g pre-commit
pre-commit install
```

## Development Workflow

### 1. Issue Creation and Assignment

#### Finding Issues to Work On

Look for issues labeled with:
- `good first issue` - Perfect for new contributors
- `help wanted` - Community contributions welcome  
- `bug` - Bug fixes needed
- `enhancement` - New features
- `documentation` - Documentation improvements

#### Creating New Issues

Before creating an issue, check if one already exists. Use these templates:

**Bug Report Template:**
```markdown
## Bug Description
A clear description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- OS: [e.g., macOS 14.0]
- Browser: [e.g., Chrome 120.0]
- OpenFrame Version: [e.g., v0.5.2]

## Additional Context
Screenshots, logs, or other relevant information.
```

**Feature Request Template:**
```markdown
## Feature Description
Clear description of the feature you'd like to see.

## Problem Statement
What problem does this solve? What use case does it address?

## Proposed Solution
How should this feature work?

## Alternatives Considered
Other approaches you've considered.

## Additional Context
Screenshots, mockups, or examples from other tools.
```

### 2. Branch Naming Convention

Create descriptive branch names that indicate the type of change:

```bash
# Feature branches
feature/add-device-filtering
feature/implement-sso-integration
feature/api-device-management

# Bug fix branches  
fix/authentication-token-expiry
fix/device-offline-status-bug
fix/memory-leak-in-stream-service

# Documentation branches
docs/update-installation-guide
docs/add-api-examples

# Refactoring branches
refactor/extract-organization-service
refactor/improve-error-handling

# Example workflow
git checkout develop
git pull upstream develop
git checkout -b feature/add-device-filtering
```

### 3. Making Changes

#### Code Style and Standards

**Java Code Style:**

```java
// Use consistent naming conventions
@Service
@Transactional
@Slf4j
public class OrganizationService {
    
    private final OrganizationRepository organizationRepository;
    private final EventPublisher eventPublisher;
    
    // Constructor injection preferred
    public OrganizationService(OrganizationRepository organizationRepository, 
                              EventPublisher eventPublisher) {
        this.organizationRepository = organizationRepository;
        this.eventPublisher = eventPublisher;
    }
    
    // Clear method names that describe intent
    public Organization createOrganization(CreateOrganizationInput input) {
        validateInput(input);
        
        Organization organization = Organization.builder()
            .name(input.getName())
            .domain(input.getDomain())
            .status(OrganizationStatus.ACTIVE)
            .createdAt(Instant.now())
            .build();
            
        Organization savedOrganization = organizationRepository.save(organization);
        
        // Publish events for async processing
        eventPublisher.publish(new OrganizationCreatedEvent(savedOrganization));
        
        log.info("Created organization: {}", savedOrganization.getId());
        return savedOrganization;
    }
    
    private void validateInput(CreateOrganizationInput input) {
        if (StringUtils.isBlank(input.getName())) {
            throw new IllegalArgumentException("Organization name is required");
        }
        if (!isValidDomain(input.getDomain())) {
            throw new IllegalArgumentException("Invalid domain format");
        }
    }
}
```

**TypeScript/Vue Code Style:**

```typescript
// Use clear, descriptive interfaces
interface OrganizationState {
  organizations: Organization[]
  selectedOrganization: Organization | null
  loading: boolean
  error: string | null
}

// Use composition API with proper typing
export const useOrganizationStore = defineStore('organization', () => {
  const state = reactive<OrganizationState>({
    organizations: [],
    selectedOrganization: null,
    loading: false,
    error: null
  })

  // Clear function names and proper error handling
  const fetchOrganizations = async (): Promise<void> => {
    try {
      state.loading = true
      state.error = null
      
      const result = await organizationApi.getOrganizations()
      state.organizations = result.data
      
    } catch (error) {
      state.error = handleApiError(error)
      console.error('Failed to fetch organizations:', error)
    } finally {
      state.loading = false
    }
  }

  const createOrganization = async (input: CreateOrganizationInput): Promise<Organization> => {
    try {
      const organization = await organizationApi.createOrganization(input)
      state.organizations.push(organization)
      return organization
    } catch (error) {
      state.error = handleApiError(error)
      throw error
    }
  }

  return {
    // State
    ...toRefs(state),
    
    // Actions  
    fetchOrganizations,
    createOrganization
  }
})
```

#### Documentation Requirements

**Code Documentation:**

```java
/**
 * Service for managing organizations within the OpenFrame platform.
 * 
 * Handles organization lifecycle operations including creation, updates,
 * and deletion. All operations are tenant-scoped and include appropriate
 * event publishing for downstream processing.
 * 
 * @author OpenFrame Team
 * @since 1.0.0
 */
@Service
public class OrganizationService {
    
    /**
     * Creates a new organization with the provided input data.
     * 
     * @param input the organization creation data
     * @return the created organization
     * @throws IllegalArgumentException if input validation fails
     * @throws OrganizationAlreadyExistsException if organization with domain already exists
     */
    public Organization createOrganization(CreateOrganizationInput input) {
        // Implementation
    }
}
```

**API Documentation:**

```java
@RestController
@RequestMapping("/api/organizations")
@Api(tags = "Organizations", description = "Organization management APIs")
public class OrganizationController {
    
    @PostMapping
    @Operation(
        summary = "Create a new organization",
        description = "Creates a new organization with the provided details. The organization will be associated with the authenticated tenant."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Organization created successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid input data"),
        @ApiResponse(responseCode = "409", description = "Organization with domain already exists")
    })
    public ResponseEntity<OrganizationResponse> createOrganization(
            @RequestBody @Valid CreateOrganizationRequest request) {
        // Implementation
    }
}
```

#### Testing Requirements

Every contribution must include appropriate tests:

```java
// Unit test example
@ExtendWith(MockitoExtension.class)
class OrganizationServiceTest {
    
    @Test
    @DisplayName("Should create organization with valid input")
    void shouldCreateOrganizationWithValidInput() {
        // Given - arrange test data
        CreateOrganizationInput input = CreateOrganizationInput.builder()
            .name("Test Organization")
            .domain("test.com")
            .build();
        
        // When - execute the operation
        Organization result = organizationService.createOrganization(input);
        
        // Then - verify the results
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Test Organization");
        verify(eventPublisher).publish(any(OrganizationCreatedEvent.class));
    }
    
    @Test
    @DisplayName("Should throw exception for invalid domain")
    void shouldThrowExceptionForInvalidDomain() {
        // Given
        CreateOrganizationInput input = CreateOrganizationInput.builder()
            .name("Test Organization")
            .domain("invalid-domain")
            .build();
        
        // When & Then
        assertThatThrownBy(() -> organizationService.createOrganization(input))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Invalid domain format");
    }
}
```

### 4. Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Formatting changes (no code logic changes)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding/updating tests
- `chore`: Maintenance tasks, dependency updates

**Examples:**

```bash
# Feature addition
feat(api): add device filtering by organization

Implements GraphQL query filters for devices by organization ID,
status, and platform. Includes pagination support and proper
authorization checks.

Closes #123

# Bug fix
fix(auth): resolve JWT token expiration handling

Fixed issue where expired tokens were not properly handled,
causing users to see 500 errors instead of being redirected
to login.

Fixes #456

# Documentation update
docs(setup): update installation requirements

Added Java 21 requirement and updated Node.js version to 18+.
Included troubleshooting section for common setup issues.

# Refactoring
refactor(service): extract organization validation logic

Moved validation logic from controller to dedicated validator
service to improve reusability and testability.

No functional changes.
```

### 5. Pull Request Process

#### Creating a Pull Request

1. **Ensure your branch is up to date:**
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout your-feature-branch
   git rebase develop
   ```

2. **Run tests locally:**
   ```bash
   mvn test
   cd openframe/services/openframe-frontend && npm test
   ```

3. **Push your changes:**
   ```bash
   git push origin your-feature-branch
   ```

4. **Create Pull Request on GitHub**

#### Pull Request Template

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues
Closes #123
Related to #456

## Changes Made
- Added device filtering functionality
- Implemented GraphQL queries for device management
- Updated documentation for new API endpoints

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass (if applicable)
- [ ] Manual testing completed

## Screenshots (if applicable)
[Include screenshots for UI changes]

## Checklist
- [ ] My code follows the project's coding standards
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] I have made corresponding changes to documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally
- [ ] Any dependent changes have been merged and published
```

#### Review Process

1. **Automated Checks:**
   - All tests must pass
   - Code quality checks must pass
   - No security vulnerabilities detected

2. **Code Review:**
   - At least one maintainer review required
   - Address all feedback and suggestions
   - Ensure code follows established patterns

3. **Final Approval:**
   - Maintainer approval required for merge
   - Squash and merge preferred for cleaner history

## Code Quality Standards

### Static Analysis Tools

**Java - SonarQube Configuration:**

```xml
<plugin>
    <groupId>org.sonarsource.scanner.maven</groupId>
    <artifactId>sonar-maven-plugin</artifactId>
    <version>3.9.1.2184</version>
</plugin>
```

```bash
# Run SonarQube analysis
mvn sonar:sonar \
  -Dsonar.projectKey=openframe \
  -Dsonar.host.url=https://sonarcloud.io \
  -Dsonar.login=$SONAR_TOKEN
```

**TypeScript - ESLint Configuration:**

```json
{
  "extends": [
    "@vue/typescript/recommended",
    "@vue/prettier",
    "@vue/eslint-config-typescript"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "vue/component-definition-name-casing": ["error", "PascalCase"],
    "vue/component-name-in-template-casing": ["error", "kebab-case"]
  }
}
```

### Security Guidelines

1. **Authentication & Authorization:**
   - Never hardcode secrets or API keys
   - Always validate user permissions
   - Use secure token storage (HTTP-only cookies)
   - Implement proper session management

2. **Input Validation:**
   ```java
   @PostMapping("/organizations")
   public ResponseEntity<Organization> createOrganization(
           @RequestBody @Valid CreateOrganizationRequest request) {
       
       // Validate input at service layer as well
       validateOrganizationInput(request);
       
       Organization org = organizationService.create(request);
       return ResponseEntity.status(201).body(org);
   }
   
   private void validateOrganizationInput(CreateOrganizationRequest request) {
       if (StringUtils.isBlank(request.getName())) {
           throw new BadRequestException("Organization name is required");
       }
       
       if (!DomainValidator.isValid(request.getDomain())) {
           throw new BadRequestException("Invalid domain format");
       }
   }
   ```

3. **Data Protection:**
   - Encrypt sensitive data at rest
   - Use HTTPS for all communications
   - Implement proper logging (no sensitive data in logs)
   - Follow GDPR/privacy requirements

### Performance Guidelines

1. **Database Optimization:**
   ```java
   // Use proper indexes
   @Indexed
   private String organizationId;
   
   @Indexed(unique = true)
   private String domain;
   
   // Use pagination for large datasets
   public Page<Device> findDevices(DeviceFilter filter, Pageable pageable) {
       return deviceRepository.findByOrganizationIdAndStatus(
           filter.getOrganizationId(), 
           filter.getStatus(), 
           pageable
       );
   }
   ```

2. **API Optimization:**
   ```java
   // Use DataLoader to prevent N+1 queries
   @DgsData(parentType = "Organization")
   public CompletableFuture<List<Device>> devices(DgsDataFetchingEnvironment dfe) {
       Organization org = dfe.getSource();
       return deviceDataLoader.load(org.getId());
   }
   
   // Implement caching for expensive operations
   @Cacheable(value = "organization-stats", key = "#organizationId")
   public OrganizationStats getOrganizationStats(String organizationId) {
       return computeStats(organizationId);
   }
   ```

## Community Guidelines

### Communication Channels

- **GitHub Discussions**: Technical discussions and Q&A
- **GitHub Issues**: Bug reports and feature requests  
- **OpenMSP Slack**: [Real-time community chat](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Community Calls**: Monthly contributor meetings

### Code of Conduct

We follow the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). In summary:

- **Be respectful and inclusive**
- **Welcome newcomers and help them get started**
- **Focus on constructive feedback**
- **Respect different viewpoints and experiences**
- **Show empathy towards other community members**

### Getting Help

If you need help:

1. **Search existing issues and discussions**
2. **Ask in the OpenMSP Slack community**
3. **Create a GitHub Discussion for general questions**
4. **Open an issue for bugs or specific problems**

## Release Process

### Versioning

OpenFrame follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

### Release Workflow

1. **Feature Freeze**: No new features, only bug fixes
2. **Release Candidate**: Create RC branch for testing
3. **Testing Period**: Comprehensive testing across environments
4. **Release**: Tag and publish stable release
5. **Post-Release**: Monitor and hotfix if needed

## Recognition

### Contributing Rewards

- **First-time contributors** get a special mention in release notes
- **Regular contributors** become maintainers with commit access
- **Exceptional contributions** are featured in blog posts and social media
- **Community leaders** are invited to speak at conferences

### Hall of Fame

Outstanding contributors are recognized in our documentation and website. Contributors who help with:

- Major features
- Security improvements  
- Documentation overhauls
- Community building
- Bug hunting and fixing

## Next Steps

Ready to contribute? Here's what to do:

1. **Pick an issue** labeled `good first issue` or `help wanted`
2. **Comment on the issue** to let others know you're working on it
3. **Follow this guide** to implement your changes
4. **Submit a pull request** and engage with reviewer feedback
5. **Celebrate** when your contribution is merged! 🎉

---

**Welcome to the OpenFrame community!** We're excited to see what you'll build with us. Every contribution, no matter how small, makes OpenFrame better for MSPs worldwide.