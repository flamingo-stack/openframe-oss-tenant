# Contributing to OpenFrame

Welcome to the OpenFrame contributing guidelines! We're excited that you're interested in contributing to the future of MSP platforms. This document outlines how to get involved, the development workflow, and our community standards.

## 🌟 Getting Started

### Prerequisites

Before contributing, ensure you have:
- **Java 21+** - Required for backend development
- **Node.js 18+** - For frontend development and tooling
- **Maven 3.8+** - Build tool for Java services
- **Docker & Docker Compose** - For running infrastructure services
- **Git** - Version control

### Development Environment Setup

1. **Fork and Clone**
   ```bash
   # Fork the repository on GitHub
   git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
   cd openframe-oss-tenant
   
   # Add upstream remote
   git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git
   ```

2. **Set Up Local Environment**
   ```bash
   # Initialize development configuration
   ./clients/openframe-client/scripts/setup_dev_init_config.sh
   
   # Start infrastructure services
   docker-compose up -d mongodb kafka redis nats cassandra
   
   # Verify services are running
   docker-compose ps
   ```

3. **Build and Test**
   ```bash
   # Build all modules
   mvn clean install
   
   # Run tests
   mvn test
   
   # Start development services (see Quick Start guide)
   ```

For detailed setup instructions, see the [Development Documentation](./docs/README.md#development).

## 🔄 Development Workflow

### 1. Create Feature Branch

```bash
# Sync with upstream
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
# Or for bug fixes: git checkout -b fix/issue-description
# Or for docs: git checkout -b docs/documentation-improvement
```

### 2. Make Changes

Follow our coding standards:
- **Backend (Java/Spring Boot)**: Google Java Style, proper layering (Controller → Service → Repository)
- **Frontend (TypeScript)**: Prettier formatting, proper component structure
- **Database**: Proper indexing, multi-tenant aware queries
- **Security**: Input validation, authentication/authorization checks

### 3. Test Your Changes

```bash
# Run unit tests
mvn test

# Run integration tests
mvn verify

# Test specific module
mvn test -pl openframe/services/openframe-api

# Frontend tests
cd openframe/services/openframe-frontend
npm test
```

### 4. Commit Your Changes

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
git commit -m "feat(auth): add multi-factor authentication support

Add support for TOTP-based MFA using authenticator apps.
Includes user enrollment, verification, and recovery codes.

Closes #123"
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix  
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `ci`: CI/CD changes
- `chore`: Maintenance tasks

### 5. Submit Pull Request

```bash
# Push your changes
git push origin feature/your-feature-name

# Create pull request on GitHub
```

## 📋 Pull Request Guidelines

### PR Checklist

Before submitting, ensure:
- [ ] **Code Quality**: Follows style guidelines and patterns
- [ ] **Tests**: All tests pass and new tests added for changes
- [ ] **Documentation**: Updated relevant documentation
- [ ] **Security**: No security vulnerabilities introduced
- [ ] **Performance**: No performance regressions
- [ ] **Breaking Changes**: Clearly documented if any

### PR Template

Use this template for your pull requests:

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
Fixes #456

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] New tests added for changes

## Screenshots (if applicable)
[Add screenshots for UI changes]

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
```

## 🎯 Contributing Areas

We welcome contributions in several areas:

### 🚨 High Priority
- **Bug Fixes**: Issues labeled `bug` and `high-priority`
- **Security Improvements**: Authentication, authorization, input validation
- **Performance Optimization**: Database queries, API response times, memory usage
- **Test Coverage**: Areas with low test coverage, integration tests

### 🔧 Medium Priority  
- **Feature Enhancements**: New functionality for existing features
- **Developer Experience**: Tooling, build process, debugging improvements
- **Code Quality**: Refactoring, cleanup, pattern consistency
- **Documentation**: API docs, developer guides, architecture documentation

### 🌟 Great for Beginners
- **Documentation Fixes**: Typos, clarity improvements, missing examples
- **Test Additions**: Unit tests for uncovered methods
- **UI/UX Polish**: Frontend improvements, accessibility enhancements
- **Good First Issues**: Look for issues labeled `good-first-issue`

## 💻 Code Standards

### Backend (Java/Spring Boot)

**Architecture Patterns:**
```java
// Controller Layer - Thin, validation only
@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('USER')")
public class UserController {
    
    private final UserService userService;
    
    @PostMapping
    public ResponseEntity<UserResponse> createUser(
            @Valid @RequestBody CreateUserRequest request) {
        UserResponse user = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }
}

// Service Layer - Business logic
@Service
@Transactional
public class UserService {
    
    public UserResponse createUser(CreateUserRequest request) {
        validateCreateUserRequest(request);
        
        User user = userMapper.toEntity(request);
        user.setTenantId(tenantContext.getCurrentTenant());
        
        User savedUser = userRepository.save(user);
        return userMapper.toResponse(savedUser);
    }
}

// Repository Layer - Data access
@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmailAndTenantId(String email, String tenantId);
}
```

**Security Requirements:**
- Always validate input at controller level
- Use `@PreAuthorize` for method-level security  
- Implement tenant isolation in all queries
- Never log sensitive information (passwords, tokens)

### Frontend (TypeScript/React)

**Component Structure:**
```typescript
// Component with proper error handling
interface UserProfileProps {
  userId: string;
  onUpdateSuccess?: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  onUpdateSuccess,
}) => {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => apiClient.getUser(userId),
    enabled: !!userId,
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!user) return <div>User not found</div>;

  return (
    <Card>
      <CardContent>
        {/* Component content */}
      </CardContent>
    </Card>
  );
};
```

**State Management:**
- Use React Query for server state
- Use React hooks for local state
- Implement proper loading and error states
- Follow accessibility best practices

### Database Design

**Multi-Tenancy:**
```java
// All entities must include tenant isolation
@Document(collection = "users")
public class User {
    @Id
    private String id;
    
    @Indexed  // Always index tenant fields
    private String tenantId;
    
    private String email;
    // ... other fields
}

// Repository queries must include tenant filtering
public interface UserRepository extends MongoRepository<User, String> {
    // ✅ Good: Includes tenant isolation
    Optional<User> findByEmailAndTenantId(String email, String tenantId);
    
    // ❌ Bad: Missing tenant isolation
    // Optional<User> findByEmail(String email);
}
```

**Performance:**
- Add appropriate indexes for all query patterns
- Use projection for large documents
- Implement cursor-based pagination for lists
- Consider read/write patterns when designing schemas

## 🧪 Testing Standards

### Unit Tests

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @Mock  
    private TenantContext tenantContext;
    
    @InjectMocks
    private UserService userService;
    
    @Test
    void shouldCreateUserWithValidRequest() {
        // Given
        String tenantId = "tenant-123";
        CreateUserRequest request = new CreateUserRequest("test@example.com", "password");
        
        when(tenantContext.getCurrentTenant()).thenReturn(tenantId);
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        
        // When
        UserResponse result = userService.createUser(request);
        
        // Then
        assertThat(result.getEmail()).isEqualTo("test@example.com");
        
        verify(userRepository).save(argThat(user -> 
            user.getEmail().equals("test@example.com") &&
            user.getTenantId().equals(tenantId)
        ));
    }
}
```

### Integration Tests

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class UserControllerIntegrationTest {
    
    @Container
    static MongoDBContainer mongodb = new MongoDBContainer("mongo:5.0")
            .withExposedPorts(27017);
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    void shouldCreateUserViaAPI() {
        CreateUserRequest request = new CreateUserRequest("test@example.com", "password");
        
        ResponseEntity<UserResponse> response = restTemplate.postForEntity(
            "/api/users", request, UserResponse.class);
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getEmail()).isEqualTo("test@example.com");
    }
}
```

## 🔒 Security Guidelines

### Input Validation
- Validate all input at API boundaries using Bean Validation
- Sanitize user input to prevent XSS
- Use parameterized queries to prevent injection
- Implement rate limiting for public endpoints

### Authentication & Authorization
- Never bypass authentication checks
- Implement proper RBAC with `@PreAuthorize`
- Use JWT tokens with appropriate expiration
- Implement tenant isolation at all levels

### Data Protection
- Never log sensitive data (passwords, tokens, PII)
- Use HTTPS for all communications
- Implement proper session management
- Follow OWASP security guidelines

## 📖 Documentation Standards

### Code Documentation

```java
/**
 * Creates a new user in the specified tenant context.
 * 
 * @param request the user creation request containing email and password
 * @return the created user response with generated ID
 * @throws UserAlreadyExistsException if user with email already exists
 * @throws ValidationException if request validation fails
 */
public UserResponse createUser(CreateUserRequest request) {
    // Implementation
}
```

### API Documentation

Use OpenAPI/Swagger annotations:

```java
@Operation(summary = "Create a new user", description = "Creates a new user in the current tenant")
@ApiResponses({
    @ApiResponse(responseCode = "201", description = "User created successfully"),
    @ApiResponse(responseCode = "400", description = "Invalid request data"),
    @ApiResponse(responseCode = "409", description = "User already exists")
})
@PostMapping
public ResponseEntity<UserResponse> createUser(@Valid @RequestBody CreateUserRequest request) {
    // Implementation
}
```

## 🤝 Community Guidelines

### Communication

- **Be Respectful**: Treat all community members with respect and courtesy
- **Be Constructive**: Provide helpful feedback and suggestions
- **Be Patient**: Remember that contributors have varying experience levels
- **Be Inclusive**: Welcome newcomers and help them get started

### Where to Get Help

- **Slack Community**: Join [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
  - `#general` - General discussions
  - `#development` - Technical development questions  
  - `#help` - Getting help with setup and usage
- **GitHub Discussions**: For technical design discussions
- **GitHub Issues**: For bug reports and feature requests (not general support)

### Code Review Process

**For Contributors:**
1. Submit PRs with clear descriptions and proper testing
2. Be responsive to reviewer feedback
3. Keep PRs focused and reasonably sized
4. Update documentation as needed

**For Reviewers:**
- Review for functionality, security, performance, and maintainability
- Provide constructive feedback with specific suggestions
- Test changes locally when possible
- Approve when ready, request changes when needed

Example review comments:
```markdown
**Suggestion**: Consider using `Optional.ofNullable()` here for better null safety.

**Issue**: This method is missing input validation for the email parameter.

**Question**: Why was this approach chosen over the existing UserMapper pattern?

**Approval**: LGTM! Great work on the comprehensive test coverage.
```

## 🎉 Recognition

We value all contributions and recognize contributors through:

- **Contributor List**: Featured in README and release notes
- **Community Highlights**: Showcased in community updates  
- **Maintainer Path**: Outstanding contributors can become project maintainers
- **Swag & Rewards**: Special recognition for significant contributions

## 🚀 Next Steps

Ready to contribute? Here's how to get started:

1. **Choose Your First Issue**: Look for [`good-first-issue`](https://github.com/flamingo-stack/openframe-oss-tenant/labels/good-first-issue) labels
2. **Set Up Development Environment**: Follow the [Development Guide](./docs/README.md#development)
3. **Join the Community**: Connect with us on [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
4. **Read the Architecture**: Understand the system design in [Architecture Documentation](./docs/README.md#reference)

## 📄 License

By contributing to OpenFrame, you agree that your contributions will be licensed under the same [Flamingo AI Unified License v1.0](LICENSE.md) as the project.

---

Thank you for contributing to OpenFrame! Your efforts help build a better MSP platform for the community. Together, we're revolutionizing how managed service providers operate with AI-powered automation and open-source innovation. 🚀