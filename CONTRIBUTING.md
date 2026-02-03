# Contributing to OpenFrame

Welcome to OpenFrame! We're excited to have you contribute to the open-source MSP platform that's revolutionizing IT operations with AI-powered automation.

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

1. **Development Environment** - See [Development Setup](docs/development/setup/environment.md)
2. **Local OpenFrame Instance** - Follow the [Quick Start Guide](docs/getting-started/quick-start.md)
3. **Community Access** - Join our [OpenMSP Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

### Technology Requirements

| Component | Required Version |
|-----------|------------------|
| **Java** | OpenJDK 21.0.1+ |
| **Node.js** | 18+ with npm |
| **Rust** | 1.75+ with Cargo |
| **Docker** | 24.0+ with Docker Compose |
| **Git** | 2.42+ |

## 📋 Contribution Workflow

### 1. Find or Create an Issue

- **Existing Issues**: Browse [Community Discussions](https://www.openmsp.ai/) in our Slack
- **Bug Reports**: Report in `#bugs` channel on Slack
- **Feature Requests**: Discuss in `#feature-requests` channel on Slack
- **Architecture Questions**: Ask in `#architecture` channel on Slack

> **Note**: We don't use GitHub Issues. All project management happens in our OpenMSP Slack community.

### 2. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR-USERNAME/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git
```

### 3. Create a Feature Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 4. Set Up Development Environment

```bash
# Set up GitHub authentication for Maven
export GITHUB_ACTOR=your-github-username
export GITHUB_TOKEN=your-github-token

# Build and verify everything works
mvn clean install
cd openframe/services/openframe-frontend && npm install
cd ../../client && cargo build
```

## 💻 Development Guidelines

### Code Style

#### Java (Spring Boot Services)

```java
// Use clear, descriptive names
@RestController
@RequestMapping("/api/v1/organizations")
@RequiredArgsConstructor
public class OrganizationController {
    
    private final OrganizationService organizationService;
    
    @GetMapping("/{id}")
    public ResponseEntity<OrganizationDto> getOrganization(
            @PathVariable String id,
            Authentication authentication) {
        // Implementation here
    }
}
```

**Standards:**
- Use `@RequiredArgsConstructor` for dependency injection
- Validate all inputs at controller level
- Return appropriate HTTP status codes
- Include proper authentication checks

#### TypeScript/Vue 3 (Frontend)

```typescript
// Use composition API with TypeScript
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Organization } from '@/types/organization'

interface Props {
  organizationId: string
}

const props = defineProps<Props>()
const organization = ref<Organization | null>(null)

const isLoaded = computed(() => organization.value !== null)

onMounted(async () => {
  // Load data
})
</script>
```

**Standards:**
- Use Composition API with `<script setup lang="ts">`
- Define proper TypeScript interfaces
- Use reactive refs for mutable state
- Implement proper error handling

#### Rust (Client Agent)

```rust
// Use idiomatic Rust patterns
use tokio::time::{Duration, interval};
use anyhow::{Result, Context};

#[derive(Debug, Clone)]
pub struct AgentConfig {
    pub server_url: String,
    pub heartbeat_interval: Duration,
}

impl AgentConfig {
    pub fn from_env() -> Result<Self> {
        let server_url = std::env::var("OPENFRAME_SERVER_URL")
            .context("OPENFRAME_SERVER_URL environment variable required")?;
        
        Ok(Self {
            server_url,
            heartbeat_interval: Duration::from_secs(30),
        })
    }
}
```

**Standards:**
- Use `anyhow` for error handling
- Implement proper `Debug` and `Clone` derives
- Use `tokio` for async operations
- Follow Rust naming conventions

### Testing Requirements

#### Java Tests

```java
@SpringBootTest
@Testcontainers
class OrganizationServiceTest {
    
    @Container
    static MongoDBContainer mongoDb = new MongoDBContainer("mongo:7.0");
    
    @Autowired
    private OrganizationService organizationService;
    
    @Test
    void shouldCreateOrganization() {
        // Given
        CreateOrganizationRequest request = CreateOrganizationRequest.builder()
            .name("Test Org")
            .build();
        
        // When
        OrganizationDto result = organizationService.createOrganization(request);
        
        // Then
        assertThat(result.getName()).isEqualTo("Test Org");
    }
}
```

#### Frontend Tests

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OrganizationCard from '@/components/OrganizationCard.vue'

describe('OrganizationCard', () => {
  it('displays organization name', () => {
    const wrapper = mount(OrganizationCard, {
      props: {
        organization: {
          id: '1',
          name: 'Test Organization'
        }
      }
    })

    expect(wrapper.text()).toContain('Test Organization')
  })
})
```

#### Rust Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_agent_heartbeat() {
        let config = AgentConfig {
            server_url: "http://localhost:8080".to_string(),
            heartbeat_interval: Duration::from_millis(100),
        };
        
        let agent = Agent::new(config).await.unwrap();
        let result = agent.send_heartbeat().await;
        
        assert!(result.is_ok());
    }
}
```

## 🏗️ Project Structure

### Service Organization

```text
openframe/
├── services/
│   ├── openframe-api/              # Core GraphQL API
│   ├── openframe-authorization/    # OAuth2/OIDC server
│   ├── openframe-gateway/          # API gateway
│   ├── openframe-client/          # Agent management
│   ├── openframe-management/       # Platform orchestration
│   ├── openframe-stream/          # Event processing
│   ├── openframe-config/          # Configuration server
│   ├── openframe-external-api/    # Public APIs
│   └── openframe-frontend/        # Vue.js frontend
├── libs/                          # Shared libraries
└── client/                        # Rust agent
```

### Adding a New Service

1. **Create Service Structure**:
   ```bash
   mkdir -p openframe/services/openframe-newservice/src/main/java/com/openframe/newservice
   ```

2. **Follow Naming Convention**:
   - Service class: `NewServiceApplication`
   - Package: `com.openframe.newservice`
   - Port: Next available in sequence (8081, 8082, etc.)

3. **Include Required Dependencies**:
   ```xml
   <dependency>
       <groupId>com.openframe</groupId>
       <artifactId>openframe-oss-lib-security</artifactId>
   </dependency>
   ```

## 🧪 Testing Your Changes

### Running Tests

```bash
# Java unit tests
mvn test

# Java integration tests
mvn verify

# Frontend type checking
cd openframe/services/openframe-frontend
npm run type-check

# Frontend unit tests
npm run test

# Rust tests
cd client
cargo test

# End-to-end tests (requires running services)
npm run test:e2e
```

### Manual Testing

1. **Start Local Services**:
   ```bash
   # Use the CLI bootstrap
   ./openframe bootstrap --non-interactive
   ```

2. **Verify Your Changes**:
   - Access UI at https://localhost
   - Check logs for errors
   - Test affected functionality

## 📝 Commit Guidelines

### Commit Message Format

```text
type(scope): subject

body (optional)

footer (optional)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```bash
git commit -m "feat(api): add organization filtering endpoint"
git commit -m "fix(frontend): resolve device list pagination issue"
git commit -m "docs(readme): update installation instructions"
```

## 🔄 Pull Request Process

### Before Submitting

1. **Sync with Upstream**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run Full Test Suite**:
   ```bash
   mvn verify
   cd openframe/services/openframe-frontend && npm run test
   cd ../../client && cargo test
   ```

3. **Update Documentation**:
   - Update relevant documentation files
   - Add/update code comments
   - Update API documentation if applicable

### PR Template

When creating a PR, include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature  
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

### Review Process

1. **Automated Checks**: All CI/CD checks must pass
2. **Code Review**: At least one maintainer review required
3. **Community Input**: Major changes discussed in Slack
4. **Documentation**: Verify docs are updated
5. **Testing**: Manual testing for UI/UX changes

## 🐛 Bug Reports

### Before Reporting

1. **Search Existing**: Check Slack `#bugs` channel for similar issues
2. **Reproduce Locally**: Verify the bug with latest code
3. **Gather Information**: Collect logs, screenshots, steps to reproduce

### Bug Report Template

Post in the `#bugs` channel:

```markdown
**Bug Description**
Clear description of what happened

**Expected Behavior**
What should have happened

**Steps to Reproduce**
1. Go to...
2. Click on...
3. See error

**Environment**
- OS: [e.g., Ubuntu 22.04]
- Browser: [e.g., Chrome 120]
- OpenFrame Version: [e.g., v0.5.2]

**Additional Context**
Logs, screenshots, etc.
```

## 🚀 Feature Requests

### Discussion Process

1. **Community Discussion**: Post in `#feature-requests` Slack channel
2. **Use Case**: Explain the problem you're trying to solve
3. **Proposed Solution**: If you have ideas, share them
4. **Impact Assessment**: Discuss with maintainers

### Implementation

1. **Design Document**: For major features, create a design doc
2. **Feedback Loop**: Get community input before implementation
3. **Incremental Delivery**: Break large features into smaller PRs

## 📚 Documentation

### Types of Documentation

1. **Code Comments**: Inline documentation for complex logic
2. **API Documentation**: GraphQL schema documentation
3. **Architecture Docs**: High-level system design
4. **User Guides**: End-user facing documentation

### Documentation Standards

- Use clear, concise language
- Include code examples where appropriate
- Keep documentation up-to-date with code changes
- Use proper Markdown formatting

## 🏆 Recognition

### Contributors

We recognize contributors in:

- Repository contributors list
- Release notes
- Community Slack channels
- Annual contributor spotlight

### Becoming a Maintainer

Regular contributors may be invited to become maintainers based on:

- Consistent, quality contributions
- Community involvement and help
- Understanding of project architecture
- Commitment to project values

## ❓ Getting Help

### Community Support

- **General Questions**: `#general` channel on Slack
- **Development Help**: `#development` channel
- **Architecture Questions**: `#architecture` channel
- **Bug Reports**: `#bugs` channel

### Documentation

- [Development Documentation](docs/development/README.md)
- [Architecture Overview](docs/development/architecture/overview.md)
- [API Documentation](docs/api/README.md)

### Direct Contact

For security issues or sensitive topics, email: security@flamingo.run

---

Thank you for contributing to OpenFrame! Together, we're building the future of MSP platforms with open-source and AI. 🚀

**Happy coding!** 💛