# Contributing Guidelines

Welcome to OpenFrame! We're excited to have you contribute to our open-source MSP platform. This guide covers our code standards, development workflow, and contribution process.

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct:

- **Be respectful**: Treat all community members with respect and kindness
- **Be constructive**: Provide helpful feedback and suggestions
- **Be collaborative**: Work together towards common goals
- **Be inclusive**: Welcome developers of all skill levels and backgrounds

## Getting Started

### 1. Set Up Development Environment

Before contributing, complete the development setup:

1. **[Environment Setup](../setup/environment.md)** - Configure your development tools
2. **[Local Development](../setup/local-development.md)** - Get OpenFrame running locally
3. **[Architecture Overview](../architecture/overview.md)** - Understand the system design

### 2. Join the Community

- **Slack Community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Development Channel**: #openframe-dev
- **Announcements**: #general

> 📝 **Note**: We don't use GitHub Issues or GitHub Discussions. All development discussions happen in our Slack community.

## Development Workflow

### Branch Strategy

We follow a simplified Git flow model:

```mermaid
gitgraph
    commit id: "main"
    branch develop
    checkout develop
    commit id: "develop setup"
    
    branch feature/user-management
    checkout feature/user-management
    commit id: "feat: add user service"
    commit id: "feat: add user controller"
    commit id: "test: add user tests"
    
    checkout develop
    merge feature/user-management
    
    branch hotfix/security-fix
    checkout hotfix/security-fix
    commit id: "fix: security vulnerability"
    
    checkout main
    merge hotfix/security-fix
    
    checkout develop
    merge main
```

### Branch Naming Convention

| Branch Type | Pattern | Example | Purpose |
|-------------|---------|---------|---------|
| **Feature** | `feature/description` | `feature/user-management` | New features |
| **Bugfix** | `bugfix/description` | `bugfix/login-issue` | Bug fixes |
| **Hotfix** | `hotfix/description` | `hotfix/security-patch` | Critical fixes |
| **Improvement** | `improvement/description` | `improvement/api-performance` | Enhancements |
| **Documentation** | `docs/description` | `docs/api-reference` | Documentation only |

### Contribution Process

#### Step 1: Create a Feature Branch
```bash
# Make sure you're on the latest develop branch
git checkout develop
git pull origin develop

# Create your feature branch
git checkout -b feature/your-feature-name

# Example
git checkout -b feature/device-monitoring
```

#### Step 2: Make Your Changes

Follow our [code standards](#code-standards) and include:

- ✅ **Functional code** with proper error handling
- ✅ **Unit tests** with good coverage
- ✅ **Integration tests** for new APIs
- ✅ **Documentation** updates
- ✅ **Type annotations** (TypeScript/Java)

#### Step 3: Commit Your Changes

Follow our [commit message format](#commit-message-format):

```bash
git add .
git commit -m "feat: add device monitoring dashboard

- Implement real-time device status tracking
- Add device metrics collection service  
- Create device monitoring Vue components
- Include unit and integration tests

Closes #123"
```

#### Step 4: Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:

- **Clear title** following commit message format
- **Detailed description** of changes
- **Screenshots** for UI changes  
- **Testing instructions** for reviewers
- **Link to related discussions** in Slack

#### Step 5: Address Review Feedback

- Respond to reviewer comments
- Make requested changes
- Push additional commits to the same branch
- Request re-review when ready

## Code Standards

### Java/Spring Boot Standards

#### Code Style
```java
// Use meaningful variable names
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    // Constructor injection (not field injection)
    public UserService(UserRepository userRepository, 
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }
    
    // Use builder pattern for complex objects
    public User createUser(CreateUserRequest request) {
        String encodedPassword = passwordEncoder.encode(request.getPassword());
        
        return User.builder()
            .email(request.getEmail())
            .firstName(request.getFirstName())
            .lastName(request.getLastName())
            .password(encodedPassword)
            .createdAt(Instant.now())
            .build();
    }
    
    // Proper exception handling
    public User findUserById(String id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException("User not found: " + id));
    }
}
```

#### Spring Boot Best Practices
- Use `@ConfigurationProperties` for configuration
- Implement proper validation with Bean Validation
- Use constructor injection over field injection
- Create custom exceptions extending appropriate base classes
- Use `@Transactional` appropriately
- Implement proper security with method-level authorization

#### GraphQL DataFetcher Pattern
```java
@DgsComponent
public class UserDataFetcher {
    
    private final UserService userService;
    
    public UserDataFetcher(UserService userService) {
        this.userService = userService;
    }
    
    @DgsQuery
    public List<User> users(@InputArgument UserFilter filter) {
        return userService.findUsers(filter);
    }
    
    @DgsMutation  
    public User createUser(@InputArgument CreateUserInput input) {
        return userService.createUser(input);
    }
    
    @DgsData(parentType = "User")
    public Organization organization(DgsDataFetchingEnvironment dfe) {
        User user = dfe.getSource();
        return userService.loadOrganization(user.getOrganizationId());
    }
}
```

### TypeScript/Vue.js Standards

#### Vue 3 Composition API
```vue
<script setup lang="ts">
// Define interfaces at the top
interface Props {
  readonly userId: string
  readonly editable?: boolean
}

interface User {
  id: string
  name: string
  email: string
  organization?: Organization
}

// Props with defaults
const props = withDefaults(defineProps<Props>(), {
  editable: false
})

// Reactive state
const user = ref<User | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

// Store usage
const userStore = useUserStore()
const { updateUser } = userStore
const { users } = storeToRefs(userStore)

// Computed properties
const displayName = computed(() => 
  user.value ? `${user.value.name} (${user.value.email})` : 'Unknown User'
)

// Methods
async function loadUser() {
  loading.value = true
  error.value = null
  
  try {
    user.value = await userStore.fetchUser(props.userId)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load user'
  } finally {
    loading.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadUser()
})

// Event handlers
function handleSave(userData: Partial<User>) {
  if (!user.value) return
  
  updateUser(user.value.id, userData)
}
</script>

<template>
  <div class="user-details">
    <div v-if="loading" class="loading">
      Loading user...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else-if="user" class="user-content">
      <h2>{{ displayName }}</h2>
      
      <UserForm 
        v-if="editable"
        :user="user"
        @save="handleSave"
      />
      
      <UserDisplay 
        v-else
        :user="user"
      />
    </div>
  </div>
</template>
```

#### Pinia Store Pattern
```typescript
import { defineStore } from 'pinia'
import type { User, CreateUserRequest, UpdateUserRequest } from '@/types/user'
import { apiClient } from '@/lib/api-client'

export const useUserStore = defineStore('user', () => {
  // State
  const users = ref<User[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const userCount = computed(() => users.value.length)
  
  const getUserById = computed(() => {
    return (id: string) => users.value.find(user => user.id === id)
  })

  // Actions
  async function fetchUsers() {
    loading.value = true
    error.value = null

    try {
      const response = await apiClient.users.list()
      users.value = response.data.users
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch users'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createUser(userData: CreateUserRequest) {
    try {
      const response = await apiClient.users.create(userData)
      users.value.push(response.data.user)
      return response.data.user
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create user'
      throw err
    }
  }

  async function updateUser(id: string, userData: UpdateUserRequest) {
    try {
      const response = await apiClient.users.update(id, userData)
      const index = users.value.findIndex(user => user.id === id)
      if (index !== -1) {
        users.value[index] = response.data.user
      }
      return response.data.user
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update user'
      throw err
    }
  }

  return {
    // State
    users: readonly(users),
    loading: readonly(loading),
    error: readonly(error),
    
    // Getters
    userCount,
    getUserById,
    
    // Actions
    fetchUsers,
    createUser,
    updateUser
  }
})
```

### Rust Standards

#### Code Organization
```rust
// main.rs or lib.rs
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use tokio;

// Public API
pub mod agent;
pub mod config;
pub mod services;

// Private modules  
mod utils;
mod error;

// Configuration structure
#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub api_url: String,
    pub client_id: String,
    pub log_level: String,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        envy::from_env()
            .context("Failed to load configuration from environment")
    }
}
```

#### Error Handling
```rust
use anyhow::{Context, Result};
use thiserror::Error;

// Custom error types
#[derive(Error, Debug)]
pub enum AgentError {
    #[error("Network connection failed: {0}")]
    NetworkError(#[from] reqwest::Error),
    
    #[error("Configuration error: {message}")]
    ConfigError { message: String },
    
    #[error("Device registration failed")]
    RegistrationFailed,
}

// Service implementation
pub struct DeviceService {
    client: reqwest::Client,
    config: Config,
}

impl DeviceService {
    pub fn new(config: Config) -> Self {
        Self {
            client: reqwest::Client::new(),
            config,
        }
    }
    
    pub async fn register_device(&self, request: DeviceRegistrationRequest) -> Result<DeviceResponse> {
        let response = self.client
            .post(&format!("{}/api/devices/register", self.config.api_url))
            .json(&request)
            .send()
            .await
            .context("Failed to send registration request")?;
            
        if !response.status().is_success() {
            return Err(AgentError::RegistrationFailed.into());
        }
        
        let device_response = response
            .json::<DeviceResponse>()
            .await
            .context("Failed to parse registration response")?;
            
        Ok(device_response)
    }
}
```

### Database Patterns

#### MongoDB Repository Pattern
```java
@Repository
public class UserRepository {
    
    private final MongoTemplate mongoTemplate;
    
    public UserRepository(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }
    
    public Optional<User> findById(String id) {
        Query query = new Query(Criteria.where("id").is(id));
        User user = mongoTemplate.findOne(query, User.class);
        return Optional.ofNullable(user);
    }
    
    public List<User> findByOrganization(String organizationId, Pageable pageable) {
        Query query = new Query(Criteria.where("organizationId").is(organizationId))
            .with(pageable);
        return mongoTemplate.find(query, User.class);
    }
    
    public User save(User user) {
        if (user.getId() == null) {
            user.setId(generateId());
            user.setCreatedAt(Instant.now());
        }
        user.setUpdatedAt(Instant.now());
        return mongoTemplate.save(user);
    }
}
```

## Commit Message Format

We follow the [Conventional Commits](https://conventionalcommits.org/) specification:

### Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
| Type | Description | Example |
|------|-------------|---------|
| **feat** | New feature | `feat: add user authentication` |
| **fix** | Bug fix | `fix: resolve login validation issue` |
| **docs** | Documentation | `docs: update API reference` |
| **style** | Code style changes | `style: format code with prettier` |
| **refactor** | Code refactoring | `refactor: extract user service logic` |
| **test** | Adding tests | `test: add unit tests for user service` |
| **chore** | Maintenance tasks | `chore: update dependencies` |
| **perf** | Performance improvements | `perf: optimize GraphQL queries` |
| **ci** | CI/CD changes | `ci: add automated deployment` |

### Examples

#### Simple Commit
```
feat: add device monitoring dashboard

Implement real-time device status tracking with WebSocket updates
```

#### Commit with Scope
```
fix(api): resolve authentication token expiration

- Fix JWT token refresh mechanism
- Add proper error handling for expired tokens
- Update token validation middleware

Closes #456
```

#### Breaking Change
```
feat!: migrate to new authentication system

BREAKING CHANGE: API authentication now requires OAuth2 tokens instead of API keys.
See migration guide for details.

Closes #123
```

## Testing Requirements

### Test Coverage Requirements

All contributions must include appropriate tests:

| Component | Required Tests | Coverage |
|-----------|----------------|----------|
| **New Features** | Unit + Integration | 80%+ |
| **Bug Fixes** | Test reproducing bug + fix | N/A |
| **API Changes** | Contract tests | 90%+ |
| **UI Components** | Component tests | 70%+ |
| **Rust Code** | Unit + integration | 80%+ |

### Test Examples

#### Java Unit Test
```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @InjectMocks
    private UserService userService;
    
    @Test
    @DisplayName("Should create user successfully")
    void shouldCreateUserSuccessfully() {
        // Given
        CreateUserRequest request = new CreateUserRequest(
            "john.doe@test.com", 
            "John", 
            "Doe"
        );
        
        User expectedUser = TestDataBuilder.user()
            .email("john.doe@test.com")
            .firstName("John")
            .lastName("Doe")
            .build();
            
        when(userRepository.save(any(User.class))).thenReturn(expectedUser);
        
        // When
        User result = userService.createUser(request);
        
        // Then
        assertThat(result.getEmail()).isEqualTo("john.doe@test.com");
        verify(userRepository).save(any(User.class));
    }
}
```

#### Vue Component Test
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/vue'
import UserForm from '@/components/UserForm.vue'

describe('UserForm', () => {
  it('should emit save event with form data', async () => {
    // Given
    const { emitted } = render(UserForm, {
      props: {
        user: { id: '1', name: 'John Doe', email: 'john@test.com' }
      }
    })

    // When
    await fireEvent.update(screen.getByLabelText(/name/i), 'Jane Doe')
    await fireEvent.click(screen.getByRole('button', { name: /save/i }))

    // Then
    expect(emitted().save).toBeTruthy()
    expect(emitted().save[0]).toEqual([
      { id: '1', name: 'Jane Doe', email: 'john@test.com' }
    ])
  })
})
```

## Code Review Process

### Review Checklist

#### For Authors
- [ ] **Self-review**: Review your own PR before requesting review
- [ ] **Tests pass**: All CI checks are green
- [ ] **Documentation**: Update relevant documentation
- [ ] **Breaking changes**: Note any breaking changes
- [ ] **Screenshots**: Include for UI changes

#### For Reviewers
- [ ] **Functionality**: Does the code work as intended?
- [ ] **Code quality**: Is the code readable and maintainable?
- [ ] **Tests**: Are there adequate tests?
- [ ] **Security**: Are there any security concerns?
- [ ] **Performance**: Any performance implications?

### Review Guidelines

#### Giving Feedback
- **Be constructive**: Suggest improvements, don't just point out problems
- **Explain reasoning**: Help the author understand your suggestions
- **Distinguish severity**: Use labels like "nit:", "suggestion:", "critical:"
- **Appreciate good code**: Call out clever solutions and good practices

#### Example Review Comments
```
✅ Good: "Consider using a Map here for O(1) lookups instead of filtering the array"

❌ Poor: "This is slow"

✅ Good: "nit: This variable name could be more descriptive. Maybe `usersByOrganization`?"

❌ Poor: "Bad variable name"

✅ Good: "Great job implementing this error handling! It makes the code much more robust."

❌ Poor: "Looks good"
```

### Receiving Feedback
- **Stay open-minded**: Consider all feedback objectively
- **Ask questions**: If feedback isn't clear, ask for clarification
- **Discuss alternatives**: If you disagree, explain your reasoning
- **Say thank you**: Appreciate the time reviewers spend

## Documentation Standards

### Code Documentation

#### Java Documentation
```java
/**
 * Service for managing user accounts and authentication.
 * 
 * <p>This service handles user creation, updates, authentication,
 * and organization membership management. All operations are
 * tenant-isolated based on the organization context.
 * 
 * @author OpenFrame Team
 * @since 1.0.0
 */
@Service
public class UserService {
    
    /**
     * Creates a new user account with the specified details.
     * 
     * <p>The user will be associated with the organization from
     * the current security context. Password will be encoded
     * using the configured password encoder.
     * 
     * @param request the user creation request
     * @return the created user
     * @throws UserAlreadyExistsException if a user with the same email exists
     * @throws InvalidOrganizationException if the organization is invalid
     */
    public User createUser(CreateUserRequest request) {
        // Implementation...
    }
}
```

#### TypeScript Documentation
```typescript
/**
 * Store for managing user data and operations.
 * 
 * Provides reactive state management for users, including
 * CRUD operations, caching, and real-time updates.
 */
export const useUserStore = defineStore('user', () => {
  /**
   * Fetches all users for the current organization.
   * 
   * @param filters - Optional filters to apply
   * @returns Promise resolving to the list of users
   * @throws Will throw an error if the request fails
   */
  async function fetchUsers(filters?: UserFilters): Promise<User[]> {
    // Implementation...
  }
})
```

### README Updates

When adding new features, update relevant README files:

```markdown
## New Feature: Device Monitoring

OpenFrame now includes real-time device monitoring capabilities.

### Features
- Real-time status updates
- Performance metrics collection
- Alert notifications
- Historical data analysis

### Usage
```bash
# Enable monitoring for a device
curl -X POST /api/devices/{id}/monitoring \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"enabled": true}'
```

### Configuration
Add these environment variables:
- `MONITORING_ENABLED=true`
- `METRICS_INTERVAL=30s`
```

## Performance Guidelines

### Backend Performance

#### Database Optimization
```java
// Use projections for large documents
@Query("{ 'organizationId': ?0 }")
List<UserProjection> findUserProjectionsByOrganization(String organizationId);

// Implement proper indexing
@Document(collection = "users")
@CompoundIndex(def = "{'organizationId': 1, 'email': 1}", unique = true)
public class User {
    // ...
}

// Use pagination for large datasets
Page<User> findByOrganization(String organizationId, Pageable pageable);
```

#### Caching Strategy
```java
@Service
public class UserService {
    
    @Cacheable(value = "users", key = "#id")
    public User findById(String id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException(id));
    }
    
    @CacheEvict(value = "users", key = "#user.id")
    public User updateUser(User user) {
        return userRepository.save(user);
    }
}
```

### Frontend Performance

#### Component Optimization
```vue
<script setup lang="ts">
// Use computed for expensive operations
const filteredUsers = computed(() => {
  if (!searchTerm.value) return users.value
  
  return users.value.filter(user =>
    user.name.toLowerCase().includes(searchTerm.value.toLowerCase())
  )
})

// Debounce user input
const debouncedSearch = debounce((term: string) => {
  searchTerm.value = term
}, 300)

// Virtual scrolling for large lists
const { containerProps, wrapperProps, list } = useVirtualList(
  filteredUsers,
  { itemHeight: 50 }
)
</script>

<template>
  <div v-bind="containerProps" class="user-list">
    <div v-bind="wrapperProps">
      <UserItem
        v-for="{ data: user, index } in list"
        :key="user.id"
        :user="user"
        :style="{ height: '50px' }"
      />
    </div>
  </div>
</template>
```

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes (v2.0.0)
- **MINOR**: New features, backward compatible (v1.1.0)  
- **PATCH**: Bug fixes, backward compatible (v1.0.1)

### Release Checklist

#### Pre-Release
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Performance benchmarks meet requirements
- [ ] Security review completed
- [ ] Database migrations tested

#### Release
- [ ] Create release branch from develop
- [ ] Update version numbers
- [ ] Generate changelog
- [ ] Create GitHub release
- [ ] Deploy to staging for final testing
- [ ] Deploy to production
- [ ] Monitor for issues

## Getting Help

### Development Support

- **Slack Community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Development Channel**: #openframe-dev  
- **Help Channel**: #help
- **Architecture Discussions**: #architecture

### Resources

- **Architecture Overview**: [/development/architecture/overview.md](../architecture/overview.md)
- **Testing Guide**: [/development/testing/overview.md](../testing/overview.md)
- **API Documentation**: [/reference/](../../reference/)
- **Deployment Guide**: [/deployment/](../../deployment/)

## Recognition

We appreciate all contributions to OpenFrame! Contributors will be:

- **Listed** in our contributors file
- **Acknowledged** in release notes for significant contributions
- **Invited** to contributor-only channels in Slack
- **Considered** for maintainer status based on ongoing contributions

---

Thank you for contributing to OpenFrame! Your efforts help make MSP operations more efficient and accessible for everyone. 🚀