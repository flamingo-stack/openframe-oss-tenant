# Contributing Guidelines

Welcome to the OpenFrame open-source community! This guide outlines the standards, processes, and best practices for contributing to the OpenFrame project. We appreciate your interest in making OpenFrame better for everyone.

## Code of Conduct

OpenFrame follows a community-driven approach with respect and collaboration at its core:

- **Be Respectful**: Treat all community members with respect and kindness
- **Be Collaborative**: Work together to build the best possible MSP platform
- **Be Patient**: Remember that everyone is learning and contributing in their own way
- **Be Inclusive**: Welcome newcomers and help them get started

## Getting Started

### Before You Contribute

1. **Join the Community**: Connect with us on the OpenMSP Slack workspace
   - **Join**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
   - **Website**: https://www.openmsp.ai/

2. **Read the Documentation**: Familiarize yourself with:
   - [Architecture Overview](../architecture/README.md)
   - [Development Environment Setup](../setup/environment.md)
   - [Local Development Guide](../setup/local-development.md)

3. **Set Up Your Development Environment**: Follow the setup guides to get OpenFrame running locally

## Development Workflow

### Git Workflow

OpenFrame follows the **GitFlow** branching model with some modifications:

```mermaid
gitgraph
    commit id: "Initial"
    branch develop
    checkout develop
    commit id: "Dev work"
    
    branch feature/new-api
    checkout feature/new-api
    commit id: "API changes"
    commit id: "Add tests"
    commit id: "Documentation"
    
    checkout develop
    merge feature/new-api
    commit id: "Merge feature"
    
    checkout main
    merge develop
    commit id: "Release v1.0.1"
```

### Branch Naming Convention

Use descriptive branch names that follow this pattern:

| Type | Pattern | Example |
|------|---------|---------|
| **Feature** | `feature/description-of-feature` | `feature/device-status-alerts` |
| **Bug Fix** | `fix/description-of-fix` | `fix/authentication-timeout` |
| **Hotfix** | `hotfix/critical-issue` | `hotfix/security-vulnerability` |
| **Documentation** | `docs/description` | `docs/api-documentation-update` |
| **Refactor** | `refactor/component-name` | `refactor/user-service-cleanup` |

### Commit Message Format

Follow the **Conventional Commits** specification:

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Commit Types

| Type | Description |
|------|-------------|
| **feat** | New feature for the user |
| **fix** | Bug fix for the user |
| **docs** | Documentation changes |
| **style** | Code style changes (formatting, etc.) |
| **refactor** | Code refactoring without feature changes |
| **perf** | Performance improvements |
| **test** | Adding or updating tests |
| **chore** | Build process or auxiliary tool changes |

#### Examples

```bash
# Good commit messages
feat(api): add device status filtering endpoint
fix(auth): resolve JWT token expiration handling
docs(readme): update installation instructions
test(device): add unit tests for device service
refactor(organization): simplify organization creation flow

# Bad commit messages
update code
fix bug
changes
wip
```

### Pull Request Process

#### 1. Create Your Branch

```bash
# Start from the latest develop branch
git checkout develop
git pull origin develop

# Create your feature branch
git checkout -b feature/your-feature-name
```

#### 2. Make Your Changes

Follow the coding standards outlined in this document:

```bash
# Make your changes
# Write tests for your changes
# Update documentation as needed

# Stage your changes
git add .

# Commit with a good message
git commit -m "feat(api): add device filtering functionality

- Add new DeviceFilter class for query criteria
- Implement filtering in DeviceService
- Add corresponding REST endpoint
- Include unit and integration tests"
```

#### 3. Keep Your Branch Updated

```bash
# Regularly sync with develop
git checkout develop
git pull origin develop
git checkout feature/your-feature-name
git rebase develop
```

#### 4. Run Tests and Quality Checks

```bash
# Run the full test suite
mvn clean test

# Run integration tests
mvn verify

# Check code coverage
mvn jacoco:report

# Run static analysis (if configured)
mvn sonar:sonar
```

#### 5. Create Pull Request

1. **Push Your Branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open Pull Request on GitHub**:
   - Use a descriptive title following conventional commit format
   - Fill out the pull request template completely
   - Link related issues using GitHub keywords

#### Pull Request Template

```markdown
## Description
Brief description of the changes in this PR.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

## Testing Steps
1. Step 1
2. Step 2
3. Step 3

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published

## Related Issues
Closes #123
Related to #456

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Additional Notes
Any additional information that reviewers should know.
```

## Code Style and Standards

### Java Code Style

OpenFrame follows **Google Java Style Guide** with some modifications:

#### Formatting Rules

```java
// Class structure
public class OrganizationService {
    
    // Constants first
    private static final Logger LOG = LoggerFactory.getLogger(OrganizationService.class);
    private static final int MAX_RETRY_ATTEMPTS = 3;
    
    // Fields
    private final OrganizationRepository organizationRepository;
    private final EventPublisher eventPublisher;
    
    // Constructor
    public OrganizationService(OrganizationRepository organizationRepository,
                              EventPublisher eventPublisher) {
        this.organizationRepository = requireNonNull(organizationRepository);
        this.eventPublisher = requireNonNull(eventPublisher);
    }
    
    // Public methods
    public Organization createOrganization(CreateOrganizationRequest request) {
        validateRequest(request);
        
        Organization organization = Organization.builder()
            .name(request.getName())
            .domain(request.getDomain())
            .status(OrganizationStatus.ACTIVE)
            .createdAt(Instant.now())
            .build();
        
        Organization saved = organizationRepository.save(organization);
        eventPublisher.publishEvent(new OrganizationCreatedEvent(saved));
        
        return saved;
    }
    
    // Private methods
    private void validateRequest(CreateOrganizationRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Organization name is required");
        }
        
        if (organizationRepository.existsByDomain(request.getDomain())) {
            throw new DuplicateDomainException("Domain already exists: " + request.getDomain());
        }
    }
}
```

#### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| **Classes** | PascalCase | `OrganizationService`, `DeviceController` |
| **Methods** | camelCase | `createOrganization`, `findByDomain` |
| **Variables** | camelCase | `organizationId`, `deviceStatus` |
| **Constants** | UPPER_SNAKE_CASE | `MAX_RETRY_ATTEMPTS`, `DEFAULT_TIMEOUT` |
| **Packages** | lowercase.separated | `com.openframe.api.service` |

### Documentation Standards

#### JavaDoc Requirements

All public APIs must have comprehensive JavaDoc:

```java
/**
 * Service for managing organizations within the OpenFrame platform.
 * 
 * <p>This service provides operations for creating, updating, and querying
 * organizations while ensuring proper tenant isolation and validation.
 * 
 * @author OpenFrame Team
 * @since 1.0.0
 */
@Service
public class OrganizationService {
    
    /**
     * Creates a new organization with the provided details.
     * 
     * <p>The organization domain must be unique across all tenants. After
     * successful creation, an {@link OrganizationCreatedEvent} is published
     * to notify other system components.
     * 
     * @param request the organization creation request containing name, domain, 
     *                and other details
     * @return the newly created organization with generated ID and timestamps
     * @throws IllegalArgumentException if request validation fails
     * @throws DuplicateDomainException if the domain already exists
     * @throws DataAccessException if database operation fails
     * 
     * @see CreateOrganizationRequest
     * @see OrganizationCreatedEvent
     */
    public Organization createOrganization(CreateOrganizationRequest request) {
        // Implementation
    }
}
```

### Testing Standards

#### Test Class Organization

```java
@ExtendWith(MockitoExtension.class)
@DisplayName("OrganizationService Tests")
class OrganizationServiceTest {
    
    @Mock
    private OrganizationRepository organizationRepository;
    
    @Mock  
    private EventPublisher eventPublisher;
    
    @InjectMocks
    private OrganizationService organizationService;
    
    @Nested
    @DisplayName("createOrganization")
    class CreateOrganization {
        
        @Test
        @DisplayName("Should create organization with valid data")
        void shouldCreateOrganization_WithValidData() {
            // Arrange
            CreateOrganizationRequest request = createValidRequest();
            Organization expectedOrg = createExpectedOrganization();
            
            when(organizationRepository.save(any(Organization.class)))
                .thenReturn(expectedOrg);
            
            // Act
            Organization result = organizationService.createOrganization(request);
            
            // Assert
            assertThat(result).isNotNull();
            assertThat(result.getName()).isEqualTo("Test Corp");
            verify(eventPublisher).publishEvent(any(OrganizationCreatedEvent.class));
        }
        
        @Test
        @DisplayName("Should throw exception when domain exists")
        void shouldThrowException_WhenDomainExists() {
            // Test implementation
        }
    }
    
    @Nested
    @DisplayName("findByDomain")
    class FindByDomain {
        // Nested test methods
    }
    
    // Helper methods
    private CreateOrganizationRequest createValidRequest() {
        return CreateOrganizationRequest.builder()
            .name("Test Corp")
            .domain("test-corp")
            .adminEmail("admin@test.com")
            .build();
    }
}
```

#### Test Naming Convention

Test methods should follow this pattern:
```text
should[ExpectedBehavior]_When[StateUnderTest]_Given[Conditions]
```

Examples:
```java
shouldCreateOrganization_WhenValidDataProvided()
shouldThrowException_WhenDuplicateDomainProvided()
shouldReturnEmptyList_WhenNoOrganizationsExist_GivenTenantId()
```

## Architecture Guidelines

### Service Layer Design

#### Service Responsibilities

```java
// ✅ Good - Single responsibility
@Service
public class DeviceService {
    public Device createDevice(CreateDeviceRequest request) { }
    public Device updateDevice(String id, UpdateDeviceRequest request) { }
    public void deleteDevice(String id) { }
    public Optional<Device> findById(String id) { }
    public List<Device> findByOrganization(String orgId) { }
}

// ❌ Bad - Mixed responsibilities  
@Service
public class DeviceAndOrganizationService {
    public Device createDevice(CreateDeviceRequest request) { }
    public Organization createOrganization(CreateOrganizationRequest request) { }
    public void sendEmailNotification(String email) { }
    public void generateReport(String format) { }
}
```

#### Error Handling

```java
// Custom exception hierarchy
public abstract class OpenFrameException extends RuntimeException {
    protected OpenFrameException(String message) {
        super(message);
    }
    
    protected OpenFrameException(String message, Throwable cause) {
        super(message, cause);
    }
}

public class BusinessLogicException extends OpenFrameException {
    public BusinessLogicException(String message) {
        super(message);
    }
}

public class DuplicateDomainException extends BusinessLogicException {
    public DuplicateDomainException(String domain) {
        super("Domain already exists: " + domain);
    }
}

// Service implementation
@Service
public class OrganizationService {
    
    public Organization createOrganization(CreateOrganizationRequest request) {
        try {
            validateRequest(request);
            return performCreation(request);
        } catch (DataAccessException e) {
            LOG.error("Failed to create organization: {}", request.getDomain(), e);
            throw new DataPersistenceException("Failed to create organization", e);
        }
    }
    
    private void validateRequest(CreateOrganizationRequest request) {
        if (organizationRepository.existsByDomain(request.getDomain())) {
            throw new DuplicateDomainException(request.getDomain());
        }
    }
}
```

### API Design Guidelines

#### REST API Design

```java
// ✅ Good REST API design
@RestController
@RequestMapping("/api/v1/organizations")
@Validated
public class OrganizationController {
    
    @GetMapping
    @PreAuthorize("hasRole('ORGANIZATION_VIEWER')")
    public ResponseEntity<PagedResponse<OrganizationSummary>> getOrganizations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        
        PageRequest pageRequest = PageRequest.of(page, size);
        Page<Organization> organizations = organizationService
            .findOrganizations(search, pageRequest);
        
        PagedResponse<OrganizationSummary> response = PagedResponse.of(
            organizations.map(OrganizationMapper::toSummary)
        );
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping
    @PreAuthorize("hasRole('ORGANIZATION_ADMIN')")
    public ResponseEntity<OrganizationResponse> createOrganization(
            @Valid @RequestBody CreateOrganizationRequest request) {
        
        Organization created = organizationService.createOrganization(request);
        OrganizationResponse response = OrganizationMapper.toResponse(created);
        
        return ResponseEntity.status(HttpStatus.CREATED)
            .location(URI.create("/api/v1/organizations/" + created.getId()))
            .body(response);
    }
    
    @GetMapping("/{id}")
    @PreAuthorize("hasPermission(#id, 'Organization', 'READ')")
    public ResponseEntity<OrganizationResponse> getOrganization(@PathVariable String id) {
        return organizationService.findById(id)
            .map(OrganizationMapper::toResponse)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }
}
```

#### GraphQL Schema Design

```graphql
# Good GraphQL schema design
type Organization {
  id: ID!
  name: String!
  domain: String!
  status: OrganizationStatus!
  createdAt: DateTime!
  updatedAt: DateTime
  
  # Related entities
  devices(filter: DeviceFilterInput, page: PageInput): DeviceConnection!
  users(filter: UserFilterInput, page: PageInput): UserConnection!
  
  # Computed fields
  deviceCount: Int!
  activeUserCount: Int!
}

type Query {
  organization(id: ID!): Organization
  organizations(
    filter: OrganizationFilterInput
    page: PageInput
  ): OrganizationConnection!
}

type Mutation {
  createOrganization(input: CreateOrganizationInput!): CreateOrganizationPayload!
  updateOrganization(id: ID!, input: UpdateOrganizationInput!): UpdateOrganizationPayload!
  deleteOrganization(id: ID!): DeleteOrganizationPayload!
}

# Input types
input CreateOrganizationInput {
  name: String!
  domain: String!
  adminEmail: String!
  contactInfo: ContactInfoInput
}

# Connection types for pagination
type OrganizationConnection {
  edges: [OrganizationEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type OrganizationEdge {
  node: Organization!
  cursor: String!
}
```

### Database Design Guidelines

#### MongoDB Document Design

```java
// ✅ Good document design
@Document(collection = "organizations")
public class Organization {
    
    @Id
    private String id;
    
    @Indexed(unique = true)
    private String domain;
    
    @Field("name")
    private String name;
    
    @Field("tenant_id")
    @Indexed
    private String tenantId;
    
    @Field("status") 
    private OrganizationStatus status;
    
    @Field("contact_info")
    private ContactInfo contactInfo;
    
    @Field("created_at")
    private Instant createdAt;
    
    @Field("updated_at")
    private Instant updatedAt;
    
    // Computed fields (not stored)
    @Transient
    private Integer deviceCount;
    
    // Builder pattern
    public static class OrganizationBuilder {
        // Builder implementation
    }
}

// ✅ Good embedded document
public class ContactInfo {
    private String email;
    private String phone;
    private Address address;
    
    public static class Address {
        private String street;
        private String city;  
        private String country;
        private String postalCode;
    }
}
```

#### Database Indexes

```java
// Create appropriate indexes
@Configuration
public class DatabaseIndexConfiguration {
    
    @EventListener(ApplicationReadyEvent.class)
    public void createIndexes(MongoTemplate mongoTemplate) {
        
        // Organization indexes
        mongoTemplate.indexOps(Organization.class)
            .ensureIndex(Index.on("tenantId", Sort.Direction.ASC));
        
        mongoTemplate.indexOps(Organization.class)  
            .ensureIndex(Index.on("domain", Sort.Direction.ASC).unique());
        
        // Device indexes
        mongoTemplate.indexOps(Device.class)
            .ensureIndex(Index.on("organizationId", Sort.Direction.ASC)
                             .on("status", Sort.Direction.ASC));
        
        // Compound index for common queries
        mongoTemplate.indexOps(Device.class)
            .ensureIndex(Index.on("tenantId", Sort.Direction.ASC)
                             .on("lastSeen", Sort.Direction.DESC));
    }
}
```

## Security Guidelines

### Input Validation

```java
// ✅ Comprehensive validation
@Data
@Builder
public class CreateOrganizationRequest {
    
    @NotBlank(message = "Organization name is required")
    @Size(min = 2, max = 100, message = "Name must be between 2 and 100 characters")
    @Pattern(regexp = "^[\\p{L}\\p{N}\\s\\-_.]+$", 
             message = "Name contains invalid characters")
    private String name;
    
    @NotBlank(message = "Domain is required")
    @Size(min = 3, max = 50, message = "Domain must be between 3 and 50 characters")
    @Pattern(regexp = "^[a-z0-9][a-z0-9\\-]*[a-z0-9]$", 
             message = "Invalid domain format")
    @TenantDomainConstraint
    private String domain;
    
    @NotBlank(message = "Admin email is required")
    @Email(message = "Invalid email format")
    @ValidEmailDomain
    private String adminEmail;
    
    @Valid
    private ContactInfoRequest contactInfo;
}

// Custom validator
@Component
public class TenantDomainValidator implements ConstraintValidator<TenantDomainConstraint, String> {
    
    private static final Set<String> RESERVED_DOMAINS = Set.of(
        "admin", "api", "www", "mail", "ftp", "blog", "docs", "support"
    );
    
    @Override
    public boolean isValid(String domain, ConstraintValidatorContext context) {
        if (domain == null) {
            return true; // Let @NotBlank handle null
        }
        
        String lowerDomain = domain.toLowerCase();
        if (RESERVED_DOMAINS.contains(lowerDomain)) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate("Domain is reserved")
                   .addConstraintViolation();
            return false;
        }
        
        return true;
    }
}
```

### Authentication and Authorization

```java
// ✅ Proper security implementation
@RestController
@RequestMapping("/api/v1/devices")
@PreAuthorize("hasRole('DEVICE_VIEWER')")
public class DeviceController {
    
    @GetMapping
    public ResponseEntity<List<DeviceResponse>> getDevices(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) String organizationId) {
        
        // Enforce tenant isolation
        List<Device> devices = deviceService.findByTenant(
            principal.getTenantId(), 
            organizationId,
            principal.getAccessibleOrganizations()
        );
        
        List<DeviceResponse> response = devices.stream()
            .map(DeviceMapper::toResponse)
            .collect(toList());
        
        return ResponseEntity.ok(response);
    }
    
    @PostMapping
    @PreAuthorize("hasRole('DEVICE_MANAGER')")
    public ResponseEntity<DeviceResponse> createDevice(
            @Valid @RequestBody CreateDeviceRequest request,
            @AuthenticationPrincipal AuthPrincipal principal) {
        
        // Verify user can access the organization
        if (!principal.canAccessOrganization(request.getOrganizationId())) {
            throw new AccessDeniedException("Cannot access organization");
        }
        
        Device created = deviceService.createDevice(request, principal);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(DeviceMapper.toResponse(created));
    }
}
```

## Review Process

### Code Review Checklist

#### Functionality
- [ ] Code accomplishes what it's supposed to do
- [ ] Edge cases are handled appropriately
- [ ] Error handling is comprehensive
- [ ] Business logic is correct

#### Code Quality
- [ ] Code is readable and well-structured
- [ ] Methods are reasonably sized (< 30 lines ideally)
- [ ] Variable and method names are descriptive
- [ ] No code duplication

#### Testing
- [ ] Unit tests cover the new functionality
- [ ] Integration tests are included where appropriate
- [ ] Tests are well-structured and understandable
- [ ] Test coverage meets project standards (80%+)

#### Security
- [ ] Input validation is properly implemented
- [ ] Authentication/authorization is correctly applied
- [ ] No sensitive data is logged or exposed
- [ ] SQL injection and XSS vulnerabilities are prevented

#### Performance
- [ ] No obvious performance issues
- [ ] Database queries are efficient
- [ ] Caching is used where appropriate
- [ ] Resource usage is reasonable

#### Documentation
- [ ] Public APIs are documented with JavaDoc
- [ ] Complex logic is commented
- [ ] README or other docs are updated if needed
- [ ] API documentation is updated

### Review Response Guidelines

#### For Authors

**Responding to Feedback:**
- Respond to all review comments
- Ask questions if feedback is unclear
- Make requested changes or explain why you disagree
- Thank reviewers for their time and feedback

**Example Response:**
```markdown
Thanks for the review! I've addressed your feedback:

1. ✅ Fixed the null pointer issue in line 45
2. ✅ Added unit tests for the edge cases you mentioned
3. ❓ Regarding the performance concern in the loop - I tried the suggested approach but it actually performs worse in our benchmarks. Should we keep the current implementation or do you have another suggestion?
4. ✅ Updated the JavaDoc to clarify the behavior

Let me know if you need any clarification on the changes!
```

#### For Reviewers

**Providing Effective Feedback:**
- Be specific and actionable
- Explain the reasoning behind suggestions
- Distinguish between required changes and suggestions
- Be respectful and constructive

**Example Feedback:**
```markdown
Overall looks good! A few items to address:

**Required Changes:**
1. Line 23: This could throw a NullPointerException if `user.getEmail()` is null. Consider adding a null check.
2. The `createDevice` method needs unit tests for the validation logic.

**Suggestions:**
1. Line 67: Consider extracting this complex validation logic into a separate method for better readability.
2. You might want to cache the result of this expensive calculation since it's called frequently.

**Questions:**
1. Is there a specific reason for using `ArrayList` here instead of `List` interface?

Great work on the error handling - it's comprehensive and user-friendly!
```

## Release Process

### Version Management

OpenFrame follows **Semantic Versioning** (SemVer):

```text
MAJOR.MINOR.PATCH

MAJOR: Breaking changes
MINOR: New features (backward compatible)  
PATCH: Bug fixes (backward compatible)
```

### Release Types

| Type | Branch | Version Bump | Example |
|------|---------|-------------|---------|
| **Feature Release** | `develop` → `main` | MINOR | 1.2.0 → 1.3.0 |
| **Bug Fix Release** | `develop` → `main` | PATCH | 1.2.0 → 1.2.1 |
| **Hotfix** | `hotfix/*` → `main` | PATCH | 1.2.0 → 1.2.1 |
| **Breaking Change** | `develop` → `main` | MAJOR | 1.2.0 → 2.0.0 |

### Changelog Format

```markdown
# Changelog

All notable changes to OpenFrame will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.3.0] - 2024-02-15

### Added
- Device status filtering API endpoint
- Real-time device alerts via WebSocket
- Bulk device operations support
- GraphQL subscriptions for live updates

### Changed  
- Improved organization creation performance by 40%
- Updated authentication token expiration to 4 hours
- Enhanced error messages for better user experience

### Deprecated
- Legacy REST API endpoints (will be removed in v2.0)

### Removed
- Support for deprecated authentication method

### Fixed
- Memory leak in event processing service
- Race condition in tenant creation
- GraphQL query timeout issues

### Security
- Updated dependencies with security vulnerabilities
- Enhanced rate limiting configuration
- Improved JWT token validation
```

## Community Guidelines

### Communication Channels

**Primary Communication:**
- **OpenMSP Slack**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA

**Channel Guidelines:**
- `#general` - General OpenFrame discussions
- `#development` - Technical development discussions  
- `#help` - Support and troubleshooting
- `#announcements` - Project announcements
- `#contributions` - Contribution coordination

### Issue Management

**All project management happens in Slack - we don't use GitHub Issues.**

**Reporting Bugs:**
1. Post in `#help` channel first to confirm it's a bug
2. Include reproduction steps, expected vs actual behavior
3. Provide environment details (OS, Java version, etc.)
4. Include relevant logs or error messages

**Feature Requests:**
1. Discuss in `#general` or `#development` channel
2. Explain the use case and business value
3. Be open to alternative solutions
4. Consider implementation complexity

### Recognition

We appreciate all contributions to OpenFrame:

**Contributor Recognition:**
- Monthly contributor highlights in Slack
- Contributor mentions in release notes
- Special roles and badges in Slack community
- Invitation to contributor-only channels

**Types of Contributions We Value:**
- Code contributions (features, bug fixes, refactoring)
- Documentation improvements  
- Testing and quality assurance
- Community support and mentoring
- Bug reports and feature suggestions
- Performance optimizations
- Security improvements

## Getting Help

### Documentation Resources

- **[Architecture Overview](../architecture/README.md)** - System design and patterns
- **[Development Environment](../setup/environment.md)** - IDE and tool setup
- **[Local Development](../setup/local-development.md)** - Running OpenFrame locally
- **[Security Guidelines](../security/README.md)** - Security best practices
- **[Testing Overview](../testing/README.md)** - Testing strategies and tools

### Community Support

**Need Help?**
- Ask questions in the `#help` Slack channel
- Search previous discussions before asking
- Provide context and details with your questions
- Be patient - community members respond when available

**Want to Help Others?**
- Monitor the `#help` channel
- Share your knowledge and experiences
- Help review and test contributions
- Mentor new contributors

### Troubleshooting Common Issues

**Build Issues:**
```bash
# Clean and rebuild
mvn clean install -U

# Check Java version
java -version

# Verify environment variables
echo $JAVA_HOME
```

**Test Failures:**
```bash
# Run specific test class
mvn test -Dtest="OrganizationServiceTest"

# Run with debug output
mvn test -X

# Check test containers
docker ps
```

**Development Environment:**
```bash
# Restart services
docker-compose restart

# Check service logs
docker-compose logs -f mongodb

# Verify port availability
lsof -i :8080
```

## Thank You!

Thank you for contributing to OpenFrame! Your efforts help build a better MSP platform for everyone. Together, we're creating the future of open-source IT management.

**Questions about contributing?** Join us in the OpenMSP Slack community - we're here to help! 🚀

---

**Remember**: Every expert was once a beginner. Don't hesitate to ask questions, make mistakes, and learn from the community. We're all here to support each other in building something amazing.