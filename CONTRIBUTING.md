# Contributing to OpenFrame OSS Tenant

Thank you for your interest in contributing to OpenFrame! This guide will help you get started with contributing to the open-source backbone of the OpenFrame platform.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Contributing Workflow](#contributing-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Community Guidelines](#community-guidelines)
- [Getting Help](#getting-help)

## Getting Started

OpenFrame OSS Tenant is the multi-tenant, open-source backbone of the OpenFrame platform. Before contributing, please:

1. **Join our community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
2. **Read the documentation**: [docs/README.md](docs/README.md)
3. **Understand the architecture**: [Architecture Overview](docs/development/architecture/overview.md)
4. **Review open issues**: Check GitHub Issues for good first issues

### What We're Looking For

We welcome contributions in these areas:

- 🐛 **Bug fixes** — Improving stability and reliability
- 📚 **Documentation** — Better guides, examples, and API docs
- ✨ **Features** — New functionality that aligns with our roadmap
- 🧪 **Testing** — Improved test coverage and quality
- 🔧 **Tooling** — Developer experience improvements
- 🌐 **Integrations** — Support for additional MSP tools

## Development Environment

### Prerequisites

Before setting up your development environment, ensure you have:

- **Java**: OpenJDK 21.0.1+ 
- **Node.js**: 18+ with npm
- **Rust**: 1.70+ with Cargo
- **Docker**: 24.0+ with Docker Compose
- **Git**: 2.42+
- **Maven**: 3.8+

### Setup Instructions

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
   cd openframe-oss-tenant
   ```

2. **Set up GitHub authentication** (required for dependencies):
   ```bash
   export GITHUB_ACTOR=your-github-username
   export GITHUB_TOKEN=your-github-token
   ```

3. **Build the backend services**:
   ```bash
   mvn clean install
   ```

4. **Start the frontend development server**:
   ```bash
   cd openframe/services/openframe-frontend
   npm install
   npm run dev
   ```

5. **Build the Rust client agents** (optional):
   ```bash
   cd client
   cargo build --release
   ```

6. **Start the application**:
   ```bash
   # In the root directory
   mvn spring-boot:run
   ```

The application will be available at `https://localhost`.

### Development Tools

We recommend using:
- **IDE**: IntelliJ IDEA (Ultimate preferred) or VS Code
- **Java**: Use the included `.editorconfig` for formatting
- **Frontend**: Vue.js DevTools browser extension
- **Database**: MongoDB Compass for database inspection
- **API Testing**: Postman or GraphQL Playground

## Contributing Workflow

### 1. Create an Issue

Before starting work:
- Check if an issue already exists
- Create a new issue describing the problem or feature
- Wait for maintainer feedback before starting work
- Get assigned to avoid duplicate work

### 2. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

**Branch naming conventions**:
- `feature/` — New features
- `fix/` — Bug fixes  
- `docs/` — Documentation improvements
- `refactor/` — Code improvements without behavior changes
- `test/` — Test improvements

### 3. Make Your Changes

- Follow our [Code Standards](#code-standards)
- Write tests for new functionality
- Update documentation as needed
- Keep commits focused and atomic

### 4. Test Your Changes

```bash
# Run backend tests
mvn test

# Run frontend tests
cd openframe/services/openframe-frontend
npm run test
npm run type-check

# Run Rust tests
cd client
cargo test

# Integration tests (if applicable)
mvn verify
```

### 5. Submit a Pull Request

See [Pull Request Process](#pull-request-process) below.

## Code Standards

### Java Backend

- **Java Version**: Target Java 21
- **Style**: Follow Google Java Style Guide
- **Framework**: Spring Boot 3.3+ with dependency injection
- **Documentation**: Use Javadoc for public APIs
- **Logging**: Use SLF4J with structured logging

```java
@Service
public class ExampleService {
    private static final Logger log = LoggerFactory.getLogger(ExampleService.class);
    
    /**
     * Processes the given request and returns a response.
     * 
     * @param request the request to process
     * @return the processed response
     * @throws ServiceException if processing fails
     */
    public ResponseDto processRequest(RequestDto request) throws ServiceException {
        log.info("Processing request: {}", request.getId());
        // Implementation here
    }
}
```

### Frontend (Vue.js)

- **TypeScript**: Use TypeScript for all new code
- **Style**: Use Prettier with ESLint
- **Components**: Use Composition API with `<script setup>`
- **Styling**: Use CSS modules or scoped styles
- **Testing**: Write unit tests for components

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { User } from '@/types'

interface Props {
  user: User
}

const props = defineProps<Props>()
const count = ref(0)

const displayName = computed(() => 
  `${props.user.firstName} ${props.user.lastName}`
)
</script>

<template>
  <div class="user-card">
    <h3>{{ displayName }}</h3>
    <button @click="count++">Count: {{ count }}</button>
  </div>
</template>

<style scoped>
.user-card {
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style>
```

### Rust Client

- **Edition**: Use Rust 2021 edition
- **Style**: Use `rustfmt` with default settings
- **Error Handling**: Use `Result` types and proper error propagation
- **Async**: Use Tokio for async operations
- **Documentation**: Use doc comments for public APIs

```rust
use anyhow::Result;
use tokio::time::{sleep, Duration};

/// Represents a system agent for the OpenFrame platform.
pub struct SystemAgent {
    id: String,
    endpoint: String,
}

impl SystemAgent {
    /// Creates a new system agent with the given configuration.
    pub fn new(id: String, endpoint: String) -> Self {
        Self { id, endpoint }
    }
    
    /// Starts the agent and begins monitoring system metrics.
    pub async fn start(&self) -> Result<()> {
        log::info!("Starting agent: {}", self.id);
        
        loop {
            self.collect_metrics().await?;
            sleep(Duration::from_secs(30)).await;
        }
    }
    
    async fn collect_metrics(&self) -> Result<()> {
        // Implementation here
        Ok(())
    }
}
```

### Database and API

- **GraphQL**: Use Netflix DGS framework
- **MongoDB**: Use Spring Data MongoDB with proper indexing
- **Caching**: Use Redis for frequently accessed data
- **Security**: Validate all inputs and use parameterized queries

## Testing Requirements

### Test Coverage

We maintain high test coverage standards:
- **Backend**: Minimum 80% line coverage
- **Frontend**: Minimum 70% line coverage
- **Critical paths**: 100% coverage required

### Test Types

**Backend Testing**:
```bash
# Unit tests
mvn test

# Integration tests  
mvn verify

# Specific service tests
mvn test -Dtest=ApiServiceTest
```

**Frontend Testing**:
```bash
# Unit tests
npm run test

# Component tests
npm run test:unit

# Type checking
npm run type-check

# E2E tests (when available)
npm run test:e2e
```

**Rust Testing**:
```bash
# Unit tests
cargo test

# Integration tests
cargo test --tests

# Documentation tests
cargo test --doc
```

### Writing Good Tests

- **Arrange, Act, Assert**: Structure tests clearly
- **Descriptive names**: Test names should explain the scenario
- **Independent tests**: Tests should not depend on each other
- **Mock external dependencies**: Use mocks for databases, APIs, etc.

Example test structure:
```java
@Test
void shouldReturnUserWhenValidIdProvided() {
    // Arrange
    String userId = "user-123";
    User expectedUser = new User(userId, "John Doe");
    when(userRepository.findById(userId)).thenReturn(Optional.of(expectedUser));
    
    // Act
    Optional<User> result = userService.getUser(userId);
    
    // Assert
    assertThat(result).isPresent();
    assertThat(result.get().getName()).isEqualTo("John Doe");
}
```

## Pull Request Process

### Before Submitting

- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] Commit messages are clear
- [ ] Branch is up to date with main

### PR Template

When creating a pull request, please include:

```markdown
## Description
Brief description of the changes and why they are needed.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings introduced

## Related Issues
Closes #(issue number)
```

### Review Process

1. **Automated checks**: CI/CD pipeline runs tests and linting
2. **Maintainer review**: Core team member reviews the code
3. **Community review**: Other contributors may provide feedback
4. **Approval**: At least one maintainer approval required
5. **Merge**: Maintainer merges after approval

### Review Criteria

Reviewers will check for:
- **Functionality**: Does the code work as intended?
- **Security**: Are there any security vulnerabilities?
- **Performance**: Will this impact system performance?
- **Maintainability**: Is the code clean and well-documented?
- **Compatibility**: Does this break existing functionality?

## Community Guidelines

### Code of Conduct

We follow the [Contributor Covenant](https://www.contributor-covenant.org/):
- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome people of all backgrounds and experience levels
- **Be collaborative**: Work together towards common goals
- **Be constructive**: Provide helpful feedback and suggestions

### Communication

- **Slack**: Join [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for real-time discussion
- **GitHub Issues**: Use for bug reports and feature requests
- **Pull Requests**: Use for code review discussions
- **Documentation**: Update docs for any user-facing changes

### Recognition

Contributors are recognized in:
- **Release notes**: Significant contributions mentioned
- **Contributors page**: All contributors listed on GitHub
- **Community shoutouts**: Recognition in Slack and blog posts

## Getting Help

### Resources

- **[Documentation](docs/README.md)**: Comprehensive guides and API docs
- **[Architecture Overview](docs/development/architecture/overview.md)**: Understanding the system design
- **[Getting Started](docs/getting-started/introduction.md)**: New developer onboarding
- **[OpenMSP Community](https://www.openmsp.ai/)**: Community resources and support

### Support Channels

1. **Slack Community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
   - `#general` — General discussion
   - `#development` — Development questions
   - `#help` — Get help with issues

2. **GitHub Issues**: For bug reports and feature requests

3. **Documentation**: Check existing docs before asking questions

### Mentorship

New contributors can request mentorship:
- Tag `@openframe-mentors` in Slack
- Mention mentorship interest in your first issue or PR
- Attend virtual office hours (announced in Slack)

## Thank You

Your contributions help make OpenFrame better for the entire MSP community. Whether you're fixing a typo, adding a feature, or helping other users, every contribution matters.

---

**Questions?** Join our [Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) or check the [documentation](docs/README.md).