# Contributing Guidelines

Welcome to OpenFrame! We're excited that you want to contribute to the future of open-source MSP platforms. This guide will help you understand our development process, code standards, and how to make meaningful contributions.

## Getting Started

### Before You Contribute

1. **Join the Community**: Connect with us on [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
2. **Review the Codebase**: Familiarize yourself with the [Architecture Overview](../architecture/overview.md)
3. **Set Up Development Environment**: Follow the [Environment Setup Guide](../setup/environment.md)
4. **Understand Our Security Model**: Read the [Security Overview](../security/overview.md)

### Ways to Contribute

- **Bug Reports**: Help us identify and fix issues
- **Feature Requests**: Suggest improvements and new capabilities
- **Code Contributions**: Submit bug fixes, features, or improvements
- **Documentation**: Improve our guides, API docs, or examples
- **Testing**: Add test coverage or improve testing strategies
- **Community Support**: Help other users in Slack channels

## Development Workflow

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/your-username/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git

# Verify remotes
git remote -v
```

### 2. Branch Strategy

We use **Git Flow** with these branch types:

| Branch Type | Naming Convention | Purpose |
|-------------|-------------------|---------|
| **Feature** | `feature/description-here` | New features and enhancements |
| **Bugfix** | `bugfix/issue-description` | Bug fixes |
| **Hotfix** | `hotfix/critical-issue` | Critical production fixes |
| **Release** | `release/v1.2.0` | Release preparation |
| **Documentation** | `docs/topic-description` | Documentation updates |

**Create a feature branch:**

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Create and checkout feature branch
git checkout -b feature/add-device-filtering
```

### 3. Development Process

#### Make Your Changes

1. **Follow Code Standards** (detailed below)
2. **Write Tests** for new functionality
3. **Update Documentation** as needed
4. **Test Locally** before committing

#### Commit Guidelines

We follow **Conventional Commits** for clear, semantic commit messages:

```text
type(scope): description

[optional body]

[optional footer]
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

**Examples:**

```bash
# Feature addition
git commit -m "feat(api): add device filtering by status and organization"

# Bug fix
git commit -m "fix(gateway): resolve JWT validation for expired tokens"

# Documentation update
git commit -m "docs(api): add GraphQL mutation examples for device management"

# Breaking change
git commit -m "feat(auth)!: migrate to per-tenant JWT signing keys

BREAKING CHANGE: JWT tokens now require tenant-specific validation"
```

### 4. Pull Request Process

#### Before Creating a PR

```bash
# Ensure your branch is up to date
git fetch upstream
git rebase upstream/main

# Run the full test suite
mvn test                                    # Backend tests
cd openframe/services/openframe-frontend
npm run test:unit                          # Frontend tests
cd ../../../clients/openframe-client
cargo test                                 # Rust client tests

# Check code formatting
mvn spotless:check                         # Java formatting
npm run lint                               # Frontend linting
cargo fmt -- --check                      # Rust formatting
```

#### Create the Pull Request

1. **Push your branch:**
   ```bash
   git push origin feature/add-device-filtering
   ```

2. **Create PR on GitHub** with this template:

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that causes existing functionality to change)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] New tests added for new functionality

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Breaking changes documented

## Screenshots (if applicable)
Add screenshots for UI changes.

## Related Issues
Closes #123
```

## Code Standards

### Java Code Standards

#### Code Style

**Use OpenFrame's Checkstyle configuration:**

```xml
<!-- .checkstyle.xml -->
<?xml version="1.0"?>
<!DOCTYPE module PUBLIC "-//Checkstyle//DTD Check Configuration 1.3//EN"
        "https://checkstyle.org/dtds/configuration_1_3.dtd">
<module name="Checker">
    <module name="TreeWalker">
        <module name="Indentation">
            <property name="basicOffset" value="4"/>
            <property name="tabWidth" value="4"/>
        </module>
        <module name="LineLength">
            <property name="max" value="120"/>
        </module>
        <module name="MethodName"/>
        <module name="TypeName"/>
        <module name="PackageName"/>
    </module>
</module>
```

**Apply formatting automatically:**

```bash
# Format all Java code
mvn spotless:apply
```

#### Code Patterns

**1. Use Builder Pattern for Complex Objects:**

```java
// Good
Organization org = Organization.builder()
    .name("Example Organization")
    .domain("example.com")
    .contactEmail("admin@example.com")
    .tenantId(getCurrentTenantId())
    .createdAt(Instant.now())
    .build();

// Avoid
Organization org = new Organization();
org.setName("Example Organization");
org.setDomain("example.com");
// ... many setters
```

**2. Use Records for DTOs:**

```java
// Good - Modern Java record
public record CreateOrganizationRequest(
    @NotBlank String name,
    @Pattern(regexp = DOMAIN_PATTERN) String domain,
    @Email String contactEmail
) {}

// Avoid - Traditional POJO with boilerplate
public class CreateOrganizationRequest {
    private String name;
    private String domain;
    // ... getters, setters, equals, hashCode
}
```

**3. Proper Exception Handling:**

```java
// Good
@Service
public class OrganizationService {
    
    public Organization create(CreateOrganizationRequest request) {
        try {
            validateDomainAvailability(request.domain());
            Organization org = buildOrganization(request);
            return organizationRepository.save(org);
        } catch (DuplicateDomainException e) {
            log.warn("Attempt to create organization with duplicate domain: {}", 
                     request.domain(), e);
            throw new BusinessException("Domain already exists", "DUPLICATE_DOMAIN", e);
        } catch (DataAccessException e) {
            log.error("Database error creating organization: {}", request.name(), e);
            throw new SystemException("Failed to create organization", e);
        }
    }
}
```

**4. Spring Boot Best Practices:**

```java
// Good - Constructor injection and immutable fields
@RestController
@RequestMapping("/api/organizations")
@Validated
public class OrganizationController {
    
    private final OrganizationService organizationService;
    private final OrganizationMapper organizationMapper;
    
    public OrganizationController(
            OrganizationService organizationService,
            OrganizationMapper organizationMapper) {
        this.organizationService = organizationService;
        this.organizationMapper = organizationMapper;
    }
    
    @PostMapping
    @PreAuthorize("hasPermission(#request.tenantId(), 'TENANT', 'ORGANIZATION_CREATE')")
    public ResponseEntity<OrganizationResponse> createOrganization(
            @Valid @RequestBody CreateOrganizationRequest request,
            Authentication authentication) {
        
        Organization org = organizationService.create(request);
        OrganizationResponse response = organizationMapper.toResponse(org);
        
        return ResponseEntity.status(HttpStatus.CREATED)
            .location(URI.create("/api/organizations/" + org.getId()))
            .body(response);
    }
}
```

### Frontend Code Standards (Vue.js/TypeScript)

#### Vue.js Patterns

**1. Use Composition API with `<script setup>`:**

```vue
<!-- Good -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useOrganizationStore } from '@/stores/organizationStore'
import type { Organization } from '@/types/organization'

interface Props {
  organizationId: string
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

const emit = defineEmits<{
  update: [organization: Organization]
  delete: [organizationId: string]
}>()

const organizationStore = useOrganizationStore()
const isLoading = ref(false)

const organization = computed(() => 
  organizationStore.getById(props.organizationId)
)

const handleUpdate = async () => {
  isLoading.value = true
  try {
    await organizationStore.update(props.organizationId, formData.value)
    emit('update', organization.value!)
  } catch (error) {
    console.error('Failed to update organization:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  organizationStore.fetchById(props.organizationId)
})
</script>
```

**2. Strong TypeScript Types:**

```typescript
// types/organization.ts
export interface Organization {
  readonly id: string
  name: string
  domain: string
  contactEmail: string
  readonly createdAt: string
  readonly updatedAt: string
}

export interface CreateOrganizationRequest {
  name: string
  domain: string
  contactEmail: string
}

export interface OrganizationFilter {
  search?: string
  status?: OrganizationStatus[]
  createdAfter?: string
  createdBefore?: string
}

export type OrganizationStatus = 'active' | 'inactive' | 'pending'
```

**3. Pinia Store Patterns:**

```typescript
// stores/organizationStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Organization, CreateOrganizationRequest } from '@/types/organization'
import { organizationApi } from '@/api/organizationApi'

export const useOrganizationStore = defineStore('organization', () => {
  const organizations = ref<Map<string, Organization>>(new Map())
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const getById = computed(() => (id: string) => organizations.value.get(id))
  
  const getAll = computed(() => Array.from(organizations.value.values()))

  async function fetchAll() {
    isLoading.value = true
    error.value = null
    
    try {
      const result = await organizationApi.getAll()
      result.forEach(org => organizations.value.set(org.id, org))
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function create(request: CreateOrganizationRequest): Promise<Organization> {
    const organization = await organizationApi.create(request)
    organizations.value.set(organization.id, organization)
    return organization
  }

  function $reset() {
    organizations.value.clear()
    isLoading.value = false
    error.value = null
  }

  return {
    // State
    organizations: getAll,
    isLoading: readonly(isLoading),
    error: readonly(error),
    
    // Getters
    getById,
    
    // Actions
    fetchAll,
    create,
    $reset
  }
})
```

### Rust Code Standards (Client Agent)

#### Rust Patterns

**1. Error Handling with `thiserror`:**

```rust
// src/error.rs
use thiserror::Error;

#[derive(Error, Debug)]
pub enum OpenFrameError {
    #[error("Network request failed: {0}")]
    NetworkError(#[from] reqwest::Error),
    
    #[error("Authentication failed: {message}")]
    AuthenticationError { message: String },
    
    #[error("Configuration error: {0}")]
    ConfigError(String),
    
    #[error("IO operation failed: {0}")]
    IoError(#[from] std::io::Error),
    
    #[error("Serialization failed: {0}")]
    SerializationError(#[from] serde_json::Error),
}

pub type Result<T> = std::result::Result<T, OpenFrameError>;
```

**2. Service Structure with Traits:**

```rust
// src/services/agent_service.rs
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use crate::{Result, OpenFrameError};

#[derive(Serialize, Deserialize, Debug)]
pub struct AgentRegistrationRequest {
    pub machine_id: String,
    pub hostname: String,
    pub os_info: OsInfo,
    pub registration_secret: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AgentRegistrationResponse {
    pub agent_id: String,
    pub token: String,
    pub expires_at: String,
}

#[async_trait]
pub trait AgentServiceTrait {
    async fn register(&self, request: AgentRegistrationRequest) -> Result<AgentRegistrationResponse>;
    async fn send_heartbeat(&self) -> Result<()>;
}

pub struct AgentService {
    http_client: reqwest::Client,
    api_base_url: String,
}

impl AgentService {
    pub fn new(api_base_url: String) -> Self {
        Self {
            http_client: reqwest::Client::new(),
            api_base_url,
        }
    }
}

#[async_trait]
impl AgentServiceTrait for AgentService {
    async fn register(&self, request: AgentRegistrationRequest) -> Result<AgentRegistrationResponse> {
        let url = format!("{}/api/agents/register", self.api_base_url);
        
        let response = self.http_client
            .post(&url)
            .json(&request)
            .send()
            .await?;
            
        if !response.status().is_success() {
            let status = response.status();
            let error_body = response.text().await.unwrap_or_default();
            
            return Err(OpenFrameError::AuthenticationError {
                message: format!("Registration failed with status {}: {}", status, error_body)
            });
        }
        
        let registration_response: AgentRegistrationResponse = response.json().await?;
        Ok(registration_response)
    }
    
    async fn send_heartbeat(&self) -> Result<()> {
        // Implementation here
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockito::{Mock, ServerGuard};
    use tokio_test;

    #[tokio::test]
    async fn test_successful_registration() {
        // Test implementation
    }
}
```

**3. Configuration Management:**

```rust
// src/config.rs
use serde::{Deserialize, Serialize};
use std::fs;
use crate::{Result, OpenFrameError};

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Config {
    pub api: ApiConfig,
    pub agent: AgentConfig,
    pub logging: LoggingConfig,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ApiConfig {
    pub base_url: String,
    pub timeout_seconds: u64,
    pub retry_attempts: usize,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AgentConfig {
    pub heartbeat_interval_seconds: u64,
    pub registration_secret: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LoggingConfig {
    pub level: String,
    pub file_path: Option<String>,
}

impl Config {
    pub fn load_from_file<P: AsRef<std::path::Path>>(path: P) -> Result<Self> {
        let content = fs::read_to_string(path)
            .map_err(|e| OpenFrameError::ConfigError(
                format!("Failed to read config file: {}", e)
            ))?;
            
        let config: Config = toml::from_str(&content)
            .map_err(|e| OpenFrameError::ConfigError(
                format!("Failed to parse config: {}", e)
            ))?;
            
        config.validate()?;
        Ok(config)
    }
    
    fn validate(&self) -> Result<()> {
        if self.api.base_url.is_empty() {
            return Err(OpenFrameError::ConfigError(
                "API base URL cannot be empty".to_string()
            ));
        }
        
        if self.agent.registration_secret.is_empty() {
            return Err(OpenFrameError::ConfigError(
                "Registration secret cannot be empty".to_string()
            ));
        }
        
        Ok(())
    }
}
```

## Testing Requirements

### Test Coverage Requirements

All contributions must maintain or improve test coverage:

| Component | Minimum Coverage | Required for New Code |
|-----------|------------------|----------------------|
| **Business Logic** | 85% | 90% |
| **API Controllers** | 75% | 80% |
| **Service Layer** | 80% | 85% |
| **Frontend Components** | 70% | 75% |
| **Rust Code** | 75% | 80% |

### Writing Tests

**1. Java Unit Tests (JUnit 5):**

```java
@ExtendWith(MockitoExtension.class)
class NewFeatureServiceTest {
    
    @Mock
    private DependencyService dependencyService;
    
    @InjectMocks
    private NewFeatureService newFeatureService;
    
    @Test
    @DisplayName("Should handle successful case")
    void shouldHandleSuccessfulCase() {
        // Given
        when(dependencyService.getData()).thenReturn("test-data");
        
        // When
        String result = newFeatureService.processData();
        
        // Then
        assertThat(result).isEqualTo("processed-test-data");
    }
    
    @Test
    @DisplayName("Should handle error case gracefully")
    void shouldHandleErrorCaseGracefully() {
        // Given
        when(dependencyService.getData()).thenThrow(new RuntimeException("Error"));
        
        // When & Then
        assertThatThrownBy(() -> newFeatureService.processData())
            .isInstanceOf(ServiceException.class)
            .hasMessage("Processing failed")
            .hasCauseInstanceOf(RuntimeException.class);
    }
}
```

**2. Vue.js Component Tests:**

```typescript
// tests/components/NewComponent.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import NewComponent from '@/components/NewComponent.vue'

describe('NewComponent', () => {
  it('renders correctly with props', () => {
    const wrapper = mount(NewComponent, {
      props: {
        title: 'Test Title',
        data: [{ id: 1, name: 'Test' }]
      }
    })

    expect(wrapper.text()).toContain('Test Title')
    expect(wrapper.findAll('[data-testid="data-item"]')).toHaveLength(1)
  })

  it('emits event when action is triggered', async () => {
    const wrapper = mount(NewComponent, {
      props: { title: 'Test' }
    })

    await wrapper.find('[data-testid="action-button"]').trigger('click')

    expect(wrapper.emitted('action')).toBeTruthy()
  })
})
```

**3. Rust Tests:**

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;

    #[tokio::test]
    async fn test_new_feature() {
        // Given
        let service = NewFeatureService::new();
        let input = "test-input";

        // When
        let result = service.process(input).await;

        // Then
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "processed-test-input");
    }

    #[test]
    fn test_error_handling() {
        // Given
        let service = NewFeatureService::new();
        let invalid_input = "";

        // When
        let result = service.validate_input(invalid_input);

        // Then
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), NewFeatureError::InvalidInput));
    }
}
```

## Documentation Requirements

### Code Documentation

**1. Java Documentation:**

```java
/**
 * Service for managing organization lifecycle and operations.
 * 
 * <p>This service handles creation, updates, and deletion of organizations
 * with proper tenant isolation and validation.
 * 
 * @author OpenFrame Team
 * @since 1.0.0
 */
@Service
@Validated
public class OrganizationService {
    
    /**
     * Creates a new organization with validation and tenant assignment.
     * 
     * @param request the organization creation request containing name, domain, and contact info
     * @return the created organization with generated ID and metadata
     * @throws DuplicateDomainException if the domain is already registered
     * @throws ValidationException if the request data is invalid
     * @throws SystemException if there's a system error during creation
     */
    public Organization create(@Valid CreateOrganizationRequest request) {
        // Implementation
    }
}
```

**2. TypeScript Documentation:**

```typescript
/**
 * Composable for managing organization data and operations.
 * 
 * Provides reactive state management for organizations including
 * loading, creating, updating, and deleting operations.
 * 
 * @example
 * ```vue
 * <script setup>
 * const { organizations, isLoading, createOrganization } = useOrganizations()
 * 
 * const handleCreate = async (data) => {
 *   await createOrganization(data)
 * }
 * </script>
 * ```
 */
export function useOrganizations() {
  // Implementation
}
```

### API Documentation

Update API documentation for new endpoints:

```java
@RestController
@RequestMapping("/api/organizations")
@Tag(name = "Organizations", description = "Organization management operations")
public class OrganizationController {
    
    @PostMapping
    @Operation(
        summary = "Create organization",
        description = "Creates a new organization with the provided details"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Organization created successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request data"),
        @ApiResponse(responseCode = "409", description = "Domain already exists"),
        @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    public ResponseEntity<OrganizationResponse> create(
            @Parameter(description = "Organization creation request")
            @Valid @RequestBody CreateOrganizationRequest request) {
        // Implementation
    }
}
```

## Code Review Process

### Review Checklist

**For Reviewers:**

- [ ] **Code Quality**
  - [ ] Code follows established patterns and conventions
  - [ ] No code smells or technical debt introduced
  - [ ] Proper error handling and logging
  - [ ] Security considerations addressed

- [ ] **Testing**
  - [ ] Adequate test coverage for new code
  - [ ] Tests are well-structured and maintainable
  - [ ] Edge cases are covered
  - [ ] Integration tests updated if needed

- [ ] **Documentation**
  - [ ] API documentation updated for new endpoints
  - [ ] Code comments are clear and helpful
  - [ ] README or guides updated if applicable

- [ ] **Architecture**
  - [ ] Changes align with system architecture
  - [ ] No breaking changes without justification
  - [ ] Database migrations are backward compatible
  - [ ] Performance implications considered

### Review Guidelines

**For Contributors:**

1. **Self-Review First**: Review your own code before requesting review
2. **Keep PRs Focused**: One feature or fix per PR
3. **Provide Context**: Explain the why, not just the what
4. **Address Feedback**: Respond to all review comments
5. **Update Tests**: Ensure tests reflect code changes

**For Reviewers:**

1. **Be Constructive**: Suggest improvements, don't just point out problems
2. **Explain Reasoning**: Help contributors understand the why behind feedback
3. **Approve When Ready**: Don't hold PRs for minor style preferences
4. **Ask Questions**: If something is unclear, ask for clarification

## Security Guidelines

### Security Review Requirements

All PRs must pass security review:

- [ ] No hardcoded secrets or credentials
- [ ] Input validation for all user inputs
- [ ] Proper authentication and authorization checks
- [ ] SQL injection prevention
- [ ] XSS prevention in frontend code
- [ ] Secure HTTP headers configured
- [ ] Dependencies scanned for vulnerabilities

### Security Testing

```java
// Example security test
@Test
void shouldPreventSQLInjection() {
    String maliciousInput = "'; DROP TABLE organizations; --";
    
    assertThatThrownBy(() -> organizationService.findByName(maliciousInput))
        .isInstanceOf(ValidationException.class);
        
    // Verify table still exists
    assertThat(organizationRepository.count()).isGreaterThan(0);
}

@Test
void shouldEnforceAuthorization() {
    // Test with user lacking permissions
    Authentication unauthorizedAuth = createAuthWithRoles("USER");
    SecurityContextHolder.getContext().setAuthentication(unauthorizedAuth);
    
    assertThatThrownBy(() -> organizationController.delete("org-123"))
        .isInstanceOf(AccessDeniedException.class);
}
```

## Performance Considerations

### Performance Guidelines

- **Database Queries**: Use pagination and appropriate indexes
- **Caching**: Implement caching for frequently accessed data
- **API Design**: Design for efficient data fetching (avoid N+1 queries)
- **Memory Usage**: Monitor memory allocation in long-running processes
- **Response Times**: Aim for < 200ms API response times

### Performance Testing

Include performance tests for critical paths:

```java
@Test
void apiResponseTimeShouldBeAcceptable() {
    // Measure response time for critical endpoint
    long startTime = System.currentTimeMillis();
    
    ResponseEntity<String> response = restTemplate.getForEntity(
        "/api/organizations", String.class);
    
    long responseTime = System.currentTimeMillis() - startTime;
    
    assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    assertThat(responseTime).isLessThan(200); // 200ms threshold
}
```

## Release Process

### Version Management

We use **Semantic Versioning** (SemVer):

- **Major** (1.0.0): Breaking changes
- **Minor** (1.1.0): New features, backward compatible
- **Patch** (1.1.1): Bug fixes, backward compatible

### Release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] Migration scripts created (if needed)
- [ ] Performance regression testing completed
- [ ] Security review completed
- [ ] Change log updated

## Community Guidelines

### Communication

- **Be Respectful**: Treat all contributors with respect
- **Be Patient**: Remember everyone has different experience levels
- **Be Helpful**: Share knowledge and help others learn
- **Be Open**: Listen to different perspectives and ideas

### Getting Help

- **Slack Channels**:
  - `#general` - General discussions
  - `#dev-backend` - Java/Spring Boot questions
  - `#dev-frontend` - Vue.js/TypeScript questions
  - `#dev-rust` - Rust client questions
  - `#dev-questions` - Technical help

- **Code Reviews**: Don't hesitate to ask for early feedback on draft PRs

## Conclusion

Thank you for contributing to OpenFrame! Your contributions help build the future of open-source MSP platforms. 

**Quick Start Reminder:**

1. Join [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
2. Fork the repository
3. Set up your [development environment](../setup/environment.md)
4. Make your changes following these guidelines
5. Submit a pull request
6. Respond to review feedback
7. Celebrate your contribution! 🎉

**Questions?** Don't hesitate to ask in our Slack community. We're here to help!

---

*These guidelines are living documents and will evolve with the project. Suggestions for improvements are always welcome!*