# Contributing to OpenFrame OSS Tenant

Welcome to the OpenFrame OSS Tenant project! We appreciate your interest in contributing to this AI-driven MSP platform. This guide outlines our code style, conventions, pull request process, and contribution standards to ensure high-quality and consistent contributions.

## 🤝 Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. By participating in this project, you agree to abide by our community standards:

- **Be Respectful**: Treat all community members with respect and kindness
- **Be Collaborative**: Work together constructively and share knowledge
- **Be Patient**: Help newcomers and be understanding of different skill levels
- **Be Professional**: Keep discussions focused on technical matters

## 🚀 Getting Started

### Prerequisites for Contributors

Before contributing, ensure you have:

- ✅ Completed the [Prerequisites](docs/getting-started/prerequisites.md) setup
- ✅ Successfully run the [Quick Start](docs/getting-started/quick-start.md)
- ✅ Configured your [Development Environment](docs/development/setup/environment.md)
- ✅ Read the [Architecture Overview](docs/development/architecture/README.md)
- ✅ Joined the [OpenMSP Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

### Development Setup

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR-USERNAME/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git

# Create a new branch for your contribution
git checkout -b feature/your-feature-name

# Install dependencies and run tests
mvn clean install
npm install --prefix openframe/services/openframe-frontend
```

## 📝 Code Style and Conventions

### Java Code Style

We follow **Google Java Style Guide** with specific OpenFrame conventions:

#### Formatting Standards

```java
// Class naming: PascalCase
public class UserService {
    
    // Constants: UPPER_SNAKE_CASE
    private static final String DEFAULT_ROLE = "USER";
    private static final int MAX_LOGIN_ATTEMPTS = 5;
    
    // Fields: camelCase with descriptive names
    private final UserRepository userRepository;
    private final EventPublisher eventPublisher;
    
    // Methods: camelCase, descriptive verbs
    public User createUser(CreateUserRequest request) {
        // Validation first
        validateCreateUserRequest(request);
        
        // Business logic with clear variable names
        User newUser = buildUserFromRequest(request);
        User savedUser = userRepository.save(newUser);
        
        // Event publishing
        eventPublisher.publishEvent(new UserCreatedEvent(savedUser));
        
        return savedUser;
    }
    
    // Private methods: descriptive names
    private void validateCreateUserRequest(CreateUserRequest request) {
        if (userRepository.existsByEmailAndTenantId(request.getEmail(), request.getTenantId())) {
            throw new UserAlreadyExistsException("User with email already exists in tenant");
        }
    }
}
```

#### Documentation Standards

```java
/**
 * Service for managing user lifecycle operations in a multi-tenant environment.
 * 
 * <p>This service handles user creation, updates, deactivation, and tenant isolation.
 * All operations are tenant-scoped and include comprehensive audit logging.
 * 
 * @author OpenFrame Team
 * @since 1.0.0
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class UserService {
    
    /**
     * Creates a new user within the specified tenant context.
     * 
     * <p>This method validates that the email is unique within the tenant,
     * creates the user with appropriate default settings, and publishes
     * a UserCreatedEvent for downstream processing.
     * 
     * @param request the user creation request containing email, name, and tenant info
     * @return the created user with generated ID and timestamps
     * @throws UserAlreadyExistsException if a user with the email already exists in the tenant
     * @throws ValidationException if the request contains invalid data
     * @throws TenantNotFoundException if the specified tenant doesn't exist
     */
    public User createUser(CreateUserRequest request) {
        // Implementation...
    }
}
```

#### Error Handling Patterns

```java
@Service
public class UserService {
    
    public User findUserById(String userId, String tenantId) {
        return userRepository.findByIdAndTenantId(userId, tenantId)
            .orElseThrow(() -> new UserNotFoundException(
                String.format("User with ID %s not found in tenant %s", userId, tenantId)
            ));
    }
    
    public User createUser(CreateUserRequest request) {
        try {
            validateUserRequest(request);
            return processUserCreation(request);
        } catch (ValidationException e) {
            log.warn("User creation failed due to validation: {}", e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("Unexpected error during user creation", e);
            throw new UserCreationException("Failed to create user", e);
        }
    }
}
```

### TypeScript/React Code Style

#### Component Structure

```typescript
// UserForm.tsx
import React, { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createUser } from '../services/userService';
import { Button, Input, Form } from '../components/ui';

interface UserFormProps {
  onSubmit: (user: User) => void;
  onCancel: () => void;
  initialData?: Partial<CreateUserRequest>;
}

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
}

const UserForm: React.FC<UserFormProps> = ({ 
  onSubmit, 
  onCancel, 
  initialData 
}) => {
  const [formData, setFormData] = useState<FormData>({
    email: initialData?.email ?? '',
    firstName: initialData?.firstName ?? '',
    lastName: initialData?.lastName ?? '',
    organizationId: initialData?.organizationId ?? ''
  });

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (user) => {
      onSubmit(user);
    },
    onError: (error) => {
      console.error('Failed to create user:', error);
    }
  });

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    createUserMutation.mutate(formData);
  }, [formData, createUserMutation]);

  return (
    <Form onSubmit={handleSubmit}>
      <Input
        label="Email"
        type="email"
        value={formData.email}
        onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
        required
        error={createUserMutation.error?.message}
      />
      
      <Button 
        type="submit" 
        loading={createUserMutation.isPending}
        disabled={!formData.email || !formData.firstName}
      >
        Create User
      </Button>
    </Form>
  );
};

export default UserForm;
```

## 🌿 Branch Naming Conventions

Use descriptive branch names that indicate the type and purpose of your changes:

### Branch Types

| Type | Purpose | Example |
|------|---------|---------|
| `feature/` | New features | `feature/user-management-api` |
| `bugfix/` | Bug fixes | `bugfix/jwt-token-validation` |
| `hotfix/` | Urgent production fixes | `hotfix/security-vulnerability` |
| `refactor/` | Code refactoring | `refactor/user-service-cleanup` |
| `docs/` | Documentation updates | `docs/contributing-guidelines` |
| `test/` | Test improvements | `test/integration-test-coverage` |
| `chore/` | Maintenance tasks | `chore/dependency-updates` |

### Branch Naming Examples

```bash
# Good branch names
feature/multi-tenant-user-management
bugfix/graphql-query-performance
hotfix/security-jwt-validation
refactor/service-layer-organization
docs/api-documentation-update
test/user-service-unit-tests

# Bad branch names
fix
new-feature
update
john-working-branch
```

## 💬 Commit Message Format

We follow the **Conventional Commits** specification for clear and standardized commit messages:

### Commit Message Structure

```text
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New features | `feat(api): add user management endpoints` |
| `fix` | Bug fixes | `fix(auth): resolve JWT token validation issue` |
| `docs` | Documentation | `docs(readme): update installation instructions` |
| `style` | Code style changes | `style(java): apply Google Java Style formatting` |
| `refactor` | Code refactoring | `refactor(service): simplify user creation logic` |
| `test` | Test additions/modifications | `test(user): add integration tests for user service` |
| `chore` | Maintenance tasks | `chore(deps): update Spring Boot to 3.3.0` |
| `perf` | Performance improvements | `perf(db): optimize user query performance` |
| `ci` | CI/CD changes | `ci(github): add automated testing workflow` |

### Commit Message Examples

```bash
# Feature addition
feat(user-mgmt): implement multi-tenant user creation API

Add REST endpoint for creating users with tenant isolation.
Includes validation, audit logging, and event publishing.

- Add CreateUserRequest DTO with validation annotations
- Implement UserController with security annotations  
- Add comprehensive unit and integration tests
- Update API documentation

Closes #123

# Bug fix
fix(jwt): handle expired tokens gracefully in gateway

Previously, expired JWT tokens caused 500 errors instead of 401.
Now properly validates token expiration and returns appropriate
HTTP status codes.

Fixes #456

# Documentation update  
docs(api): add GraphQL schema documentation

Update API documentation to include GraphQL schema definitions
and example queries for user management operations.
```

## 🔄 Pull Request Process

### Before Creating a Pull Request

1. **Sync with upstream:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests locally:**
   ```bash
   mvn clean test
   cd openframe/services/openframe-frontend && npm test
   ```

3. **Check code style:**
   ```bash
   mvn checkstyle:check
   npm run lint --prefix openframe/services/openframe-frontend
   ```

4. **Update documentation** if needed

### Pull Request Template

When creating a pull request, use this template:

```markdown
## Description

Brief description of the changes and why they were made.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] New tests added for new functionality
- [ ] Manual testing completed

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

## Related Issues

Closes #[issue_number]
Relates to #[issue_number]
```

### Pull Request Review Process

1. **Automated Checks**: All PRs must pass:
   - Unit tests
   - Integration tests
   - Code style checks
   - Security scans
   - Build verification

2. **Code Review Requirements**:
   - At least 2 approvals from maintainers
   - No unresolved discussions
   - All CI checks passing

3. **Review Focus Areas**:
   - **Functionality**: Does the code work as intended?
   - **Security**: Are there any security vulnerabilities?
   - **Performance**: Will this impact system performance?
   - **Maintainability**: Is the code readable and maintainable?
   - **Testing**: Are there adequate tests?
   - **Documentation**: Is documentation updated appropriately?

## ✅ Review Checklist

### For Contributors

Before requesting review, ensure:

- [ ] **Code Quality**
  - [ ] Code follows established patterns and conventions
  - [ ] No hardcoded values or magic numbers
  - [ ] Error handling is comprehensive
  - [ ] Logging is appropriate and informative

- [ ] **Security**
  - [ ] Input validation is implemented
  - [ ] Authentication and authorization are proper
  - [ ] No sensitive data in logs or responses
  - [ ] SQL/NoSQL injection prevention

- [ ] **Testing**
  - [ ] Unit tests cover new functionality
  - [ ] Integration tests verify end-to-end behavior
  - [ ] Edge cases are tested
  - [ ] Tests are maintainable and readable

- [ ] **Documentation**
  - [ ] Code is well-commented
  - [ ] API documentation is updated
  - [ ] README updates if needed
  - [ ] Architecture docs updated for significant changes

### For Reviewers

When reviewing pull requests, consider:

- [ ] **Architecture Alignment**
  - [ ] Changes align with overall architecture
  - [ ] Proper separation of concerns
  - [ ] No unnecessary complexity

- [ ] **Multi-Tenancy**
  - [ ] Tenant isolation is maintained
  - [ ] No cross-tenant data leakage
  - [ ] Tenant context propagation is correct

- [ ] **Performance Impact**
  - [ ] No N+1 query problems
  - [ ] Efficient database queries
  - [ ] Appropriate caching strategies

- [ ] **Backward Compatibility**
  - [ ] API changes are backward compatible
  - [ ] Database migrations are safe
  - [ ] Configuration changes are documented

## 🔄 Development Workflow

### Feature Development

```bash
# 1. Create feature branch
git checkout -b feature/new-awesome-feature

# 2. Develop with frequent commits
git add .
git commit -m "feat(feature): implement core functionality"

# 3. Add tests
git add .
git commit -m "test(feature): add comprehensive test coverage"

# 4. Update documentation
git add .
git commit -m "docs(feature): update API documentation"

# 5. Rebase with main before PR
git fetch upstream
git rebase upstream/main

# 6. Push and create PR
git push origin feature/new-awesome-feature
```

### Bug Fix Workflow

```bash
# 1. Create bugfix branch
git checkout -b bugfix/fix-critical-issue

# 2. Reproduce the bug with a test
git add .
git commit -m "test(bug): reproduce issue with failing test"

# 3. Fix the bug
git add .
git commit -m "fix(component): resolve critical issue

Detailed explanation of what was causing the bug
and how this fix resolves it.

Fixes #123"

# 4. Verify fix and push
npm test && mvn test
git push origin bugfix/fix-critical-issue
```

## 💬 Communication Guidelines

### Using Slack Community

- **General Discussion**: Use #general for broad questions
- **Technical Help**: Use #dev-help for development issues  
- **Feature Requests**: Discuss in #feature-requests before implementing
- **Bug Reports**: Report in #bug-reports with reproduction steps

### Issue Management

We use Slack for all project management instead of GitHub Issues:

1. **Bug Reports**: Post in #bug-reports with:
   - Clear description of the issue
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Java version, etc.)

2. **Feature Requests**: Discuss in #feature-requests:
   - Use case and business justification
   - Proposed implementation approach
   - Impact on existing functionality

3. **Questions**: Ask in appropriate channels:
   - Tag relevant team members
   - Provide context and code snippets
   - Be specific about what you've already tried

## 🏆 Recognition

We appreciate all contributions! Contributors are recognized through:

- **Contributor Credits**: Listed in project documentation
- **Community Highlights**: Featured in community channels
- **Swag and Rewards**: Special recognition for significant contributions

## 🆘 Getting Help

### Resources

- **Documentation**: Start with our comprehensive docs in `docs/`
- **Architecture Guide**: Understand the system design
- **Code Examples**: Learn from existing implementations
- **Test Cases**: See how features should work

### Community Support

- **Slack Community**: [Join OpenMSP](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Mentorship**: Experienced contributors help newcomers
- **Code Reviews**: Learn from review feedback
- **Pairing Sessions**: Work with maintainers on complex features

## 🔐 Security Guidelines

### Reporting Security Issues

If you discover a security vulnerability:

1. **DO NOT** create a public GitHub issue
2. **DO** report it privately via direct message to maintainers in Slack
3. **DO** provide detailed reproduction steps
4. **DO** include potential impact assessment

### Security Best Practices

When contributing code:

- Always validate input parameters
- Use parameterized queries to prevent injection
- Implement proper authentication and authorization checks
- Never log sensitive information (passwords, tokens, etc.)
- Use HTTPS for all external communications
- Follow OWASP security guidelines

## 🎯 Multi-Tenant Development Guidelines

When working on multi-tenant features:

### Tenant Isolation

- **Database**: Always filter by tenant ID in queries
- **APIs**: Validate tenant context in controllers
- **Events**: Include tenant information in all events
- **Caching**: Use tenant-prefixed cache keys

### Example Multi-Tenant Controller

```java
@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('USER')")
public class UserController {
    
    @GetMapping
    public Page<User> getUsers(
            @AuthenticationPrincipal AuthPrincipal principal,
            Pageable pageable) {
        // Always use tenant from authenticated principal
        return userService.findUsersByTenant(principal.getTenantId(), pageable);
    }
    
    @PostMapping
    public User createUser(
            @AuthenticationPrincipal AuthPrincipal principal,
            @Valid @RequestBody CreateUserRequest request) {
        // Ensure tenant isolation
        request.setTenantId(principal.getTenantId());
        return userService.createUser(request);
    }
}
```

## 📊 Performance Guidelines

### Database Optimization

- Use appropriate indexes for multi-tenant queries
- Implement cursor-based pagination for large datasets
- Use DataLoader pattern to prevent N+1 queries in GraphQL
- Monitor query performance with proper logging

### Caching Strategy

- Cache frequently accessed data with appropriate TTL
- Use tenant-aware cache keys to prevent data leakage
- Implement cache warming for critical paths
- Monitor cache hit rates and adjust strategies

### Example Caching Implementation

```java
@Service
public class UserService {
    
    @Cacheable(value = "users", key = "#tenantId + ':' + #userId")
    public Optional<User> findById(String userId, String tenantId) {
        return userRepository.findByIdAndTenantId(userId, tenantId);
    }
    
    @CacheEvict(value = "users", key = "#user.tenantId + ':' + #user.id")
    public User updateUser(User user) {
        return userRepository.save(user);
    }
}
```

---

Thank you for contributing to OpenFrame OSS Tenant! Your contributions help build a better, more secure, and more powerful MSP platform for the entire community. 

Remember: Every contribution, no matter how small, makes a difference. Whether it's fixing a typo, adding a test, or implementing a major feature, we appreciate your time and effort.

**Join us on [Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) to connect with the community and get support!**