# Contributing Guidelines

Welcome to the OpenFrame contributing guidelines! This document outlines the development workflow, code standards, pull request process, and quality requirements for contributing to OpenFrame.

## Code of Conduct

OpenFrame is an open and welcoming project. All contributors are expected to:

- **Be Respectful**: Treat all community members with respect and courtesy
- **Be Collaborative**: Work together constructively and share knowledge
- **Be Professional**: Maintain professional communication in all interactions
- **Be Inclusive**: Welcome newcomers and help them get started

## Development Workflow

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git

# Verify remotes
git remote -v
```

### 2. Set Up Development Environment

Follow the [Environment Setup](../setup/environment.md) guide to configure your development environment.

### 3. Create Feature Branch

```bash
# Sync with upstream
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description

# Or for documentation
git checkout -b docs/documentation-improvement
```

## Branch Naming Conventions

Use descriptive branch names that follow these patterns:

| Type | Pattern | Example |
|------|---------|---------|
| **Feature** | `feature/description` | `feature/user-profile-management` |
| **Bug Fix** | `fix/issue-description` | `fix/authentication-token-expiry` |
| **Documentation** | `docs/section-name` | `docs/api-documentation-update` |
| **Refactoring** | `refactor/component-name` | `refactor/user-service-cleanup` |
| **Performance** | `perf/optimization-area` | `perf/database-query-optimization` |
| **CI/CD** | `ci/workflow-name` | `ci/automated-testing-pipeline` |

## Code Style and Conventions

### Java/Spring Boot Backend

#### Code Formatting

**Use Google Java Style:**
```bash
# Configure IntelliJ IDEA
# File → Settings → Code Style → Java → Import Scheme
# Select: GoogleStyle.xml
```

**Key formatting rules:**
- 2 spaces for indentation
- Line length: 100 characters
- No trailing whitespace
- Unix line endings (LF)

#### Naming Conventions

```java
// Classes: PascalCase
public class UserService {

    // Constants: UPPER_SNAKE_CASE
    private static final String DEFAULT_ROLE = "USER";
    
    // Fields and methods: camelCase
    private UserRepository userRepository;
    
    public UserResponse createUser(CreateUserRequest request) {
        // Local variables: camelCase
        String hashedPassword = passwordEncoder.encode(request.getPassword());
        
        return UserResponse.builder()
            .id(savedUser.getId())
            .email(savedUser.getEmail())
            .build();
    }
}
```

#### Method Structure

```java
@Service
@Transactional
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TenantContext tenantContext;
    
    // Constructor injection (preferred)
    public UserService(UserRepository userRepository,
                      PasswordEncoder passwordEncoder,
                      TenantContext tenantContext) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tenantContext = tenantContext;
    }
    
    /**
     * Creates a new user with the specified details.
     * 
     * @param request the user creation request containing user details
     * @return the created user response with generated ID
     * @throws UserAlreadyExistsException if user with email already exists
     * @throws ValidationException if request validation fails
     */
    public UserResponse createUser(CreateUserRequest request) {
        // Input validation
        validateCreateUserRequest(request);
        
        // Business logic
        String tenantId = tenantContext.getCurrentTenant();
        checkUserNotExists(request.getEmail(), tenantId);
        
        User user = buildUserFromRequest(request, tenantId);
        User savedUser = userRepository.save(user);
        
        // Return response
        return userMapper.toResponse(savedUser);
    }
    
    private void validateCreateUserRequest(CreateUserRequest request) {
        // Validation logic
    }
    
    private void checkUserNotExists(String email, String tenantId) {
        if (userRepository.existsByEmailAndTenantId(email, tenantId)) {
            throw new UserAlreadyExistsException(
                "User with email '" + email + "' already exists");
        }
    }
}
```

### TypeScript/Frontend

#### Code Formatting

**Use Prettier configuration:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

#### Component Structure

```typescript
// UserProfile.tsx
import { useState, useCallback } from 'react';
import { z } from 'zod';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Type definitions
interface UserProfileProps {
  userId: string;
  onUpdateSuccess?: () => void;
}

// Validation schema
const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format'),
});

type UpdateProfileData = z.infer<typeof updateProfileSchema>;

// Component
export const UserProfile: React.FC<UserProfileProps> = ({
  userId,
  onUpdateSuccess,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const { profile, updateProfile, isLoading } = useUserProfile(userId);

  const handleSave = useCallback(async (data: UpdateProfileData) => {
    try {
      await updateProfile(data);
      setIsEditing(false);
      onUpdateSuccess?.();
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  }, [updateProfile, onUpdateSuccess]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="user-profile">
      {isEditing ? (
        <EditForm 
          profile={profile} 
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        <ViewMode 
          profile={profile}
          onEdit={() => setIsEditing(true)}
        />
      )}
    </div>
  );
};
```

#### Hook Patterns

```typescript
// useUserProfile.ts
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export const useUserProfile = (userId: string) => {
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => apiClient.getUser(userId),
    enabled: !!userId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProfileData) => 
      apiClient.updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['user-profile', userId]);
    },
  });

  const updateProfile = useCallback(
    (data: UpdateProfileData) => updateMutation.mutateAsync(data),
    [updateMutation]
  );

  return {
    profile,
    isLoading: isLoading || updateMutation.isPending,
    error: error || updateMutation.error,
    updateProfile,
  };
};
```

### Database and API Patterns

#### Repository Layer

```java
@Repository
public interface UserRepository extends MongoRepository<User, String>, CustomUserRepository {
    
    Optional<User> findByEmailAndTenantId(String email, String tenantId);
    
    List<User> findByTenantIdAndRolesContaining(String tenantId, String role);
    
    boolean existsByEmailAndTenantId(String email, String tenantId);
    
    @Query("{ 'tenantId': ?0, 'active': true, 'lastLoginAt': { $gte: ?1 } }")
    List<User> findActiveUsersSince(String tenantId, LocalDateTime since);
}

public interface CustomUserRepository {
    List<User> findUsersWithComplexCriteria(UserSearchCriteria criteria);
}

@Component
public class CustomUserRepositoryImpl implements CustomUserRepository {
    
    private final MongoTemplate mongoTemplate;
    
    @Override
    public List<User> findUsersWithComplexCriteria(UserSearchCriteria criteria) {
        Criteria mongoCriteria = new Criteria();
        
        if (criteria.getTenantId() != null) {
            mongoCriteria.and("tenantId").is(criteria.getTenantId());
        }
        
        if (criteria.getSearchTerm() != null) {
            Criteria searchCriteria = new Criteria().orOperator(
                Criteria.where("firstName").regex(criteria.getSearchTerm(), "i"),
                Criteria.where("lastName").regex(criteria.getSearchTerm(), "i"),
                Criteria.where("email").regex(criteria.getSearchTerm(), "i")
            );
            mongoCriteria.andOperator(searchCriteria);
        }
        
        Query query = new Query(mongoCriteria);
        
        if (criteria.getPageable() != null) {
            query.with(criteria.getPageable());
        }
        
        return mongoTemplate.find(query, User.class);
    }
}
```

#### API Controller Standards

```java
@RestController
@RequestMapping("/api/users")
@PreAuthorize("hasRole('USER')")
@Validated
public class UserController {
    
    private final UserService userService;
    
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    public ResponseEntity<PageResponse<UserResponse>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role) {
        
        UserSearchCriteria criteria = UserSearchCriteria.builder()
            .searchTerm(search)
            .role(role)
            .pageable(PageRequest.of(page, size))
            .build();
            
        PageResponse<UserResponse> users = userService.findUsers(criteria);
        return ResponseEntity.ok(users);
    }
    
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> createUser(
            @Valid @RequestBody CreateUserRequest request) {
        
        UserResponse user = userService.createUser(request);
        
        URI location = ServletUriComponentsBuilder
            .fromCurrentRequest()
            .path("/{id}")
            .buildAndExpand(user.getId())
            .toUri();
            
        return ResponseEntity.created(location).body(user);
    }
    
    @GetMapping("/{userId}")
    @PreAuthorize("@userSecurityService.canView(authentication, #userId)")
    public ResponseEntity<UserResponse> getUser(@PathVariable String userId) {
        UserResponse user = userService.getUser(userId);
        return ResponseEntity.ok(user);
    }
    
    @PutMapping("/{userId}")
    @PreAuthorize("@userSecurityService.canModify(authentication, #userId)")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable String userId,
            @Valid @RequestBody UpdateUserRequest request) {
        
        UserResponse user = userService.updateUser(userId, request);
        return ResponseEntity.ok(user);
    }
    
    @DeleteMapping("/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable String userId) {
        userService.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }
    
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException e) {
        ErrorResponse error = ErrorResponse.builder()
            .code("USER_NOT_FOUND")
            .message(e.getMessage())
            .timestamp(LocalDateTime.now())
            .build();
            
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }
}
```

## Commit Message Format

Use conventional commit format for clear change tracking:

### Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **ci**: CI/CD changes
- **chore**: Maintenance tasks

### Examples
```bash
feat(auth): add multi-factor authentication support

Add support for TOTP-based MFA using authenticator apps.
Includes user enrollment, verification, and recovery codes.

Closes #123

fix(api): handle null pointer in user profile endpoint

The user profile endpoint was throwing NPE when profile 
image was null. Added proper null checks and default values.

Fixes #456

docs(setup): update development environment guide

Added section for Docker setup and troubleshooting common
issues with local development environment.

test(user): add integration tests for user management

Added comprehensive integration tests covering user CRUD
operations, validation, and security checks.
```

## Pull Request Process

### 1. Pre-submission Checklist

- [ ] **Code Quality**: Follows style guidelines and conventions
- [ ] **Tests**: All tests pass and new tests added for changes
- [ ] **Documentation**: Updated relevant documentation
- [ ] **Security**: No security vulnerabilities introduced
- [ ] **Performance**: No performance regressions
- [ ] **Breaking Changes**: Clearly documented if any

### 2. Creating Pull Request

```bash
# Push your changes
git push origin feature/your-feature-name

# Create pull request on GitHub with:
# - Descriptive title
# - Detailed description
# - Link to related issues
# - Screenshots if UI changes
```

### 3. Pull Request Template

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
Before: [screenshot]
After: [screenshot]

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### 4. Review Process

**For Reviewers:**
- **Code Quality**: Check adherence to style and patterns
- **Functionality**: Verify changes work as intended
- **Tests**: Ensure adequate test coverage
- **Security**: Review for security implications
- **Performance**: Check for performance impacts
- **Documentation**: Verify docs are updated

**Review Comments Format:**
```markdown
**Suggestion**: Consider using Optional.ofNullable() here for better null safety.

**Issue**: This method is missing input validation.

**Nitpick**: Variable name could be more descriptive.

**Question**: Why was this approach chosen over the existing pattern?

**Approval**: LGTM! Great work on the comprehensive tests.
```

## Review Checklist

### Code Review Criteria

#### Functionality
- [ ] Code does what it's supposed to do
- [ ] Edge cases are handled properly
- [ ] Error conditions are handled gracefully
- [ ] Performance is acceptable

#### Code Quality
- [ ] Code is readable and self-documenting
- [ ] Functions/methods have single responsibility
- [ ] No code duplication
- [ ] Proper abstraction levels
- [ ] Follows established patterns

#### Security
- [ ] Input validation is present
- [ ] No security vulnerabilities introduced
- [ ] Authentication/authorization properly implemented
- [ ] Sensitive data is protected

#### Testing
- [ ] Adequate test coverage
- [ ] Tests are meaningful and test the right things
- [ ] Tests are maintainable
- [ ] No flaky tests

#### Documentation
- [ ] Code is properly documented
- [ ] API documentation is updated
- [ ] README files are current
- [ ] Breaking changes are documented

### Common Review Issues

**Backend Code:**
```java
// ❌ Bad: Missing input validation
public User createUser(CreateUserRequest request) {
    return userRepository.save(new User(request));
}

// ✅ Good: Proper validation and error handling
public UserResponse createUser(CreateUserRequest request) {
    validateCreateUserRequest(request);
    
    String tenantId = tenantContext.getCurrentTenant();
    if (userRepository.existsByEmailAndTenantId(request.getEmail(), tenantId)) {
        throw new UserAlreadyExistsException("User already exists");
    }
    
    User user = userMapper.toEntity(request);
    user.setTenantId(tenantId);
    user.setPassword(passwordEncoder.encode(request.getPassword()));
    
    User savedUser = userRepository.save(user);
    return userMapper.toResponse(savedUser);
}
```

**Frontend Code:**
```typescript
// ❌ Bad: No error handling
const UserProfile = ({ userId }: { userId: string }) => {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    apiClient.getUser(userId).then(setUser);
  }, [userId]);
  
  return <div>{user.name}</div>;
};

// ✅ Good: Proper error handling and loading states
const UserProfile = ({ userId }: { userId: string }) => {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => apiClient.getUser(userId),
    enabled: !!userId,
  });
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading user</div>;
  if (!user) return <div>User not found</div>;
  
  return <div>{user.name}</div>;
};
```

## Development Best Practices

### 1. Test-Driven Development (TDD)

```java
// 1. Write failing test
@Test
void shouldCreateUserWithHashedPassword() {
    // Given
    CreateUserRequest request = new CreateUserRequest("test@example.com", "password");
    
    // When & Then
    assertThatThrownBy(() -> userService.createUser(request))
        .isInstanceOf(UserAlreadyExistsException.class);
}

// 2. Write minimal code to pass
public UserResponse createUser(CreateUserRequest request) {
    throw new UserAlreadyExistsException("User already exists");
}

// 3. Refactor to proper implementation
public UserResponse createUser(CreateUserRequest request) {
    if (userExists(request.getEmail())) {
        throw new UserAlreadyExistsException("User already exists");
    }
    // ... proper implementation
}
```

### 2. Error Handling Patterns

```java
// Custom exception hierarchy
public abstract class OpenFrameException extends RuntimeException {
    protected OpenFrameException(String message, Throwable cause) {
        super(message, cause);
    }
}

public class UserNotFoundException extends OpenFrameException {
    public UserNotFoundException(String userId) {
        super("User not found: " + userId, null);
    }
}

// Global exception handler
@ControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(new ErrorResponse("USER_NOT_FOUND", e.getMessage()));
    }
}
```

### 3. Logging Standards

```java
@Service
public class UserService {
    
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    
    public UserResponse createUser(CreateUserRequest request) {
        logger.info("Creating user with email: {}", request.getEmail());
        
        try {
            User user = processUserCreation(request);
            logger.info("Successfully created user with ID: {}", user.getId());
            return userMapper.toResponse(user);
            
        } catch (Exception e) {
            logger.error("Failed to create user with email: {}", 
                request.getEmail(), e);
            throw e;
        }
    }
}
```

## Community and Support

### Getting Help

- **Slack Community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **GitHub Discussions**: For technical questions and design discussions
- **Documentation**: This developer documentation section
- **Office Hours**: Weekly contributor sync meetings (announced in Slack)

### Contributing Areas

#### High Priority
- **Bug fixes**: Issues labeled with `bug` and `high-priority`
- **Security improvements**: Security-related enhancements
- **Performance optimizations**: Database queries, API response times
- **Test coverage**: Areas with low test coverage

#### Medium Priority
- **Feature enhancements**: New functionality for existing features
- **Documentation**: Improving developer and user documentation
- **Developer experience**: Tooling and workflow improvements
- **Code quality**: Refactoring and cleanup

#### Great for Beginners
- **Documentation fixes**: Typos, clarity improvements
- **Test additions**: Adding missing unit tests
- **UI/UX improvements**: Frontend polish and usability
- **Good first issue**: Issues labeled specifically for newcomers

### Recognition

Contributors are recognized through:
- **Contributor list**: In README and documentation
- **Release notes**: Acknowledgment in version releases
- **Community highlights**: Featured in community updates
- **Maintainer track**: Path to becoming a project maintainer

Thank you for contributing to OpenFrame! Your efforts help build a better MSP platform for the community. 🚀