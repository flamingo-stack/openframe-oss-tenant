# Contributing to OpenFrame OSS Tenant

Welcome to the OpenFrame open-source community! This guide outlines the standards, processes, and best practices for contributing to the OpenFrame backend platform. We appreciate your interest in making OpenFrame better for MSPs and developers worldwide.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style and Standards](#code-style-and-standards)
- [Architecture Guidelines](#architecture-guidelines)
- [Security Guidelines](#security-guidelines)
- [Testing Standards](#testing-standards)
- [Documentation Guidelines](#documentation-guidelines)
- [Review Process](#review-process)
- [Community Guidelines](#community-guidelines)
- [Getting Help](#getting-help)

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
   - [Architecture Overview](./docs/README.md#reference)
   - [Development Environment Setup](./docs/README.md#development)
   - [Getting Started Guide](./docs/README.md#getting-started)

3. **Set Up Your Development Environment**: Follow the [Quick Start](./README.md#quick-start) guide to get OpenFrame running locally

### Development Environment Setup

Ensure you have the required tools installed:

```bash
# Verify Java 21
java -version

# Verify Maven
mvn -version

# Verify Docker
docker --version && docker-compose --version

# Verify Node.js (for frontend components)
node --version && npm --version
```

**Required versions:**
- Java 21 (OpenJDK or Oracle JDK)
- Maven 3.6+
- Docker & Docker Compose
- Node.js 18+

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

# Build all services
mvn clean install -DskipTests

# Verify services start correctly
docker-compose -f docker/docker-compose.dev.yml up -d
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

## Code Style and Standards

### Java Code Style

OpenFrame follows **Google Java Style Guide** with modifications for Spring Boot:

#### Class Structure

```java
@Service
@Slf4j
public class OrganizationService {
    
    // Constants first
    private static final int MAX_RETRY_ATTEMPTS = 3;
    
    // Dependencies via constructor injection
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
    
    // Private methods last
    private void validateRequest(CreateOrganizationRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Organization name is required");
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

## Architecture Guidelines

### Service Layer Design

OpenFrame follows a layered microservices architecture. Each service should have clear responsibilities:

#### Service Boundaries

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
}
```

### Multi-Tenant Design Patterns

All services must support multi-tenancy:

```java
@RestController
@RequestMapping("/api/v1/devices")
@PreAuthorize("hasRole('DEVICE_VIEWER')")
public class DeviceController {
    
    @GetMapping
    public ResponseEntity<List<DeviceResponse>> getDevices(
            @AuthenticationPrincipal AuthPrincipal principal,
            @RequestParam(required = false) String organizationId) {
        
        // Always enforce tenant isolation
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
}
```

### Event-Driven Patterns

Use events for cross-service communication:

```java
@Component
public class OrganizationEventHandler {
    
    @EventListener
    @Async
    public void handleOrganizationCreated(OrganizationCreatedEvent event) {
        log.info("Organization created: {}", event.getOrganization().getDomain());
        
        // Initialize organization resources
        organizationInitializer.initializeResources(event.getOrganization());
        
        // Publish to Kafka for other services
        kafkaTemplate.send("organization.created", event);
    }
}
```

## Security Guidelines

### Input Validation

All user inputs must be validated:

```java
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
    private String domain;
    
    @NotBlank(message = "Admin email is required")
    @Email(message = "Invalid email format")
    private String adminEmail;
}
```

### Authentication and Authorization

Use Spring Security consistently:

```java
@RestController
@RequestMapping("/api/v1/organizations")
@PreAuthorize("hasRole('ORGANIZATION_VIEWER')")
public class OrganizationController {
    
    @PostMapping
    @PreAuthorize("hasRole('ORGANIZATION_ADMIN')")
    public ResponseEntity<OrganizationResponse> createOrganization(
            @Valid @RequestBody CreateOrganizationRequest request,
            @AuthenticationPrincipal AuthPrincipal principal) {
        
        // Verify tenant access
        if (!principal.canCreateOrganization()) {
            throw new AccessDeniedException("Cannot create organization");
        }
        
        Organization created = organizationService.createOrganization(request, principal);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(OrganizationMapper.toResponse(created));
    }
}
```

## Testing Standards

### Test Class Organization

Use nested test classes for better organization:

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
            // Arrange
            CreateOrganizationRequest request = createValidRequest();
            when(organizationRepository.existsByDomain(request.getDomain()))
                .thenReturn(true);
            
            // Act & Assert
            assertThatThrownBy(() -> organizationService.createOrganization(request))
                .isInstanceOf(DuplicateDomainException.class)
                .hasMessage("Domain already exists: " + request.getDomain());
        }
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

### Test Naming Convention

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

### Integration Tests

For testing complete workflows:

```java
@SpringBootTest
@Testcontainers
@TestMethodOrder(OrderAnnotation.class)
class OrganizationIntegrationTest {
    
    @Container
    static MongoDBContainer mongodb = new MongoDBContainer("mongo:5.0")
            .withExposedPorts(27017);
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    @Order(1)
    @DisplayName("Should create organization via REST API")
    void shouldCreateOrganization_ViaRestApi() {
        // Arrange
        CreateOrganizationRequest request = CreateOrganizationRequest.builder()
            .name("Integration Test Corp")
            .domain("integration-test")
            .adminEmail("admin@integration.test")
            .build();
        
        // Act
        ResponseEntity<OrganizationResponse> response = restTemplate
            .postForEntity("/api/v1/organizations", request, OrganizationResponse.class);
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getName()).isEqualTo("Integration Test Corp");
    }
}
```

## Documentation Guidelines

### JavaDoc Requirements

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

### API Documentation

Document REST endpoints and GraphQL schemas:

```java
@RestController
@RequestMapping("/api/v1/organizations")
@Tag(name = "Organizations", description = "Organization management operations")
public class OrganizationController {
    
    @Operation(
        summary = "Create a new organization",
        description = "Creates a new organization in the current tenant with the provided details"
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "201", description = "Organization created successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request data"),
        @ApiResponse(responseCode = "409", description = "Domain already exists")
    })
    @PostMapping
    public ResponseEntity<OrganizationResponse> createOrganization(
            @Parameter(description = "Organization creation request")
            @Valid @RequestBody CreateOrganizationRequest request) {
        // Implementation
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
- [ ] Multi-tenant isolation is maintained

#### Performance
- [ ] No obvious performance issues
- [ ] Database queries are efficient
- [ ] Caching is used where appropriate
- [ ] Resource usage is reasonable

### Pull Request Template

When creating a pull request, use this template:

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

## Related Issues
Closes #123
Related to #456

## Additional Notes
Any additional information that reviewers should know.
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

- **[Architecture Overview](./docs/README.md#reference)** - System design and patterns
- **[Getting Started Guide](./docs/README.md#getting-started)** - Setup and quick start
- **[Development Guides](./docs/README.md#development)** - Development workflows

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
echo `$JAVA_HOME`
```

**Test Failures:**
```bash
# Run specific test class
mvn test -Dtest="OrganizationServiceTest"

# Run with debug output
mvn test -X

# Check Docker containers
docker ps
```

**Development Environment:**
```bash
# Restart services
docker-compose -f docker/docker-compose.dev.yml restart

# Check service logs
docker-compose -f docker/docker-compose.dev.yml logs -f mongodb

# Verify port availability
lsof -i :8080
```

## Thank You!

Thank you for contributing to OpenFrame! Your efforts help build a better MSP platform for everyone. Together, we're creating the future of open-source IT management.

**Questions about contributing?** Join us in the OpenMSP Slack community - we're here to help! 🚀

---

**Remember**: Every expert was once a beginner. Don't hesitate to ask questions, make mistakes, and learn from the community. We're all here to support each other in building something amazing.