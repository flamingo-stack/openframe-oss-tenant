# Contributing to OpenFrame

Thank you for your interest in contributing to OpenFrame! This guide will help you get started with contributing to the unified MSP platform that's revolutionizing IT operations.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Process](#contributing-process)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Documentation Guidelines](#documentation-guidelines)
- [Community and Support](#community-and-support)

## 🤝 Code of Conduct

OpenFrame is committed to providing a welcoming and inclusive environment for all contributors. Please read and follow our code of conduct:

### Our Pledge

We pledge to make participation in OpenFrame a harassment-free experience for everyone, regardless of:
- Age, body size, disability, ethnicity
- Gender identity and expression
- Level of experience, nationality
- Personal appearance, race, religion
- Sexual identity and orientation

### Our Standards

**Positive behaviors include:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behaviors include:**
- Harassment, discrimination, or offensive comments
- Public or private harassment
- Publishing others' private information without permission
- Other conduct that would be inappropriate in a professional setting

### Enforcement

Code of conduct violations can be reported to **conduct@flamingo.run**. All complaints will be reviewed and investigated promptly and fairly.

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

**Required Software:**
- **Java**: OpenJDK 21.0.1+
- **Node.js**: 18+ with npm
- **Rust**: 1.70+ with Cargo
- **Docker**: 24.0+ with Docker Compose
- **Git**: 2.42+

**Recommended Tools:**
- **IDE**: IntelliJ IDEA (Java), VS Code (TypeScript/Rust)
- **Database Tools**: MongoDB Compass, DBeaver
- **API Testing**: Postman, GraphQL Playground

### First Steps

1. **Join our community** for support and discussions:
   - 💬 **OpenMSP Slack**: [Join here](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
   - 📖 **Documentation**: [OpenFrame Docs](https://www.flamingo.run/openframe)

2. **Explore the codebase** and understand the architecture:
   - Read the [Architecture Overview](docs/development/architecture/overview.md)
   - Review existing [issues](https://github.com/flamingo-stack/openframe-oss-tenant/issues)
   - Check out [getting started guides](docs/getting-started/introduction.md)

3. **Find something to work on**:
   - Look for issues labeled `good first issue` or `help wanted`
   - Check the [roadmap](README.md#roadmap) for planned features
   - Ask in Slack if you need guidance

## 🛠️ Development Setup

### Environment Configuration

```bash
# Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Set up GitHub authentication for Maven dependencies
export GITHUB_ACTOR=your-github-username
export GITHUB_TOKEN=your-github-personal-access-token

# Copy environment template
cp .env.example .env
```

### Build and Run

```bash
# Build all backend services
mvn clean install

# Start infrastructure services
docker-compose up -d mongodb kafka cassandra pinot redis

# Start backend services
mvn spring-boot:run -pl openframe-gateway &
mvn spring-boot:run -pl openframe-api &
mvn spring-boot:run -pl openframe-authorization-server &

# Start frontend development server
cd openframe/services/openframe-frontend
npm install
npm run dev

# Build Rust agent
cd client
cargo build --release
```

### Verify Installation

```bash
# Check backend services
curl http://localhost:8080/health

# Check frontend
open http://localhost:3000

# Run tests
mvn test
npm run test
cargo test
```

## 🔄 Contributing Process

### 1. Issue First Approach

**Before writing code, create or discuss an issue:**

- **For Bug Fixes**: Create a detailed bug report with reproduction steps
- **For Features**: Propose the feature and discuss the implementation approach
- **For Large Changes**: Create a design document or RFC for community review

### 2. Fork and Branch

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR-USERNAME/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git

# Create a feature branch
git checkout -b feature/your-feature-name
```

### 3. Make Changes

**Follow these guidelines:**

- Make small, focused commits with clear messages
- Follow existing code style and patterns
- Add tests for new functionality
- Update documentation for API changes
- Ensure all tests pass

### 4. Commit Guidelines

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
# Format: type(scope): description

# Examples:
git commit -m "feat(api): add device search endpoint"
git commit -m "fix(gateway): resolve JWT validation issue"
git commit -m "docs(readme): update installation instructions"
git commit -m "test(client): add unit tests for agent registration"
```

**Commit Types:**
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation updates
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Maintenance tasks

### 5. Testing

**Run comprehensive tests before submitting:**

```bash
# Backend tests
mvn test

# Frontend tests
cd openframe/services/openframe-frontend
npm run test
npm run type-check
npm run lint

# Rust tests
cd client
cargo test
cargo clippy

# Integration tests
mvn test -Pintegration
```

### 6. Submit Pull Request

```bash
# Sync with upstream
git fetch upstream
git rebase upstream/main

# Push your branch
git push origin feature/your-feature-name

# Create pull request on GitHub
```

**Pull Request Template:**

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

### 7. Code Review Process

**What to expect:**

1. **Automated Checks**: CI/CD will run tests and checks
2. **Maintainer Review**: Project maintainers will review code
3. **Community Feedback**: Other contributors may provide input
4. **Iteration**: Address feedback and make improvements
5. **Approval**: Once approved, changes will be merged

## 📝 Code Style Guidelines

### Java (Backend Services)

**Follow Spring Boot and OpenFrame conventions:**

```java
// Use clear, descriptive names
@Service
public class OrganizationService {
    
    // Prefer composition over inheritance
    private final OrganizationRepository repository;
    private final EventPublisher eventPublisher;
    
    // Use constructor injection
    public OrganizationService(OrganizationRepository repository, 
                             EventPublisher eventPublisher) {
        this.repository = repository;
        this.eventPublisher = eventPublisher;
    }
    
    // Handle errors gracefully
    public Organization findById(String id) {
        return repository.findById(id)
            .orElseThrow(() -> new OrganizationNotFoundException(id));
    }
}
```

**Code Style Rules:**
- Use Google Java Style Guide
- Line length: 120 characters
- Use meaningful variable names
- Add JavaDoc for public methods
- Prefer immutable objects where possible

### TypeScript (Frontend)

**Follow React and Next.js best practices:**

```typescript
// Use functional components with hooks
interface DeviceListProps {
  organizationId: string;
  onDeviceSelect: (device: Device) => void;
}

export function DeviceList({ organizationId, onDeviceSelect }: DeviceListProps) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Use custom hooks for data fetching
  const { data: devicesData, isLoading } = useDevices(organizationId);
  
  return (
    <div className="device-list">
      {/* JSX content */}
    </div>
  );
}
```

**TypeScript Rules:**
- Enable strict mode
- Use explicit types for props and state
- Prefer interfaces over types for object shapes
- Use meaningful component and hook names

### Rust (Client Agent)

**Follow Rust conventions and clippy recommendations:**

```rust
// Use descriptive error types
#[derive(Debug, thiserror::Error)]
pub enum AgentError {
    #[error("Network error: {0}")]
    Network(String),
    #[error("Configuration error: {0}")]
    Config(String),
}

// Use async/await with proper error handling
pub async fn register_agent(config: &AgentConfig) -> Result<AuthToken, AgentError> {
    let client = HttpClient::new();
    
    let response = client
        .post(&config.registration_url)
        .json(&RegistrationRequest::from(config))
        .send()
        .await
        .map_err(|e| AgentError::Network(e.to_string()))?;
    
    Ok(response.json().await?)
}
```

**Rust Rules:**
- Use `cargo fmt` and `cargo clippy`
- Handle errors explicitly (no unwrap in production code)
- Use meaningful type names
- Prefer owned types for public APIs

## 🧪 Testing Requirements

### Test Coverage Expectations

**Minimum coverage requirements:**
- **Java**: 80% line coverage for service classes
- **TypeScript**: 80% coverage for utility functions and hooks
- **Rust**: 85% coverage for core logic

### Test Types

#### Unit Tests

```java
// Java unit test example
@ExtendWith(MockitoExtension.class)
class OrganizationServiceTest {
    
    @Mock
    private OrganizationRepository repository;
    
    @InjectMocks
    private OrganizationService service;
    
    @Test
    void shouldFindOrganizationById() {
        // Given
        String id = "org-123";
        Organization expected = Organization.builder().id(id).build();
        when(repository.findById(id)).thenReturn(Optional.of(expected));
        
        // When
        Organization result = service.findById(id);
        
        // Then
        assertThat(result).isEqualTo(expected);
    }
}
```

```typescript
// TypeScript test example
describe('DeviceService', () => {
  test('should fetch devices for organization', async () => {
    // Given
    const organizationId = 'org-123';
    const mockDevices = [createMockDevice()];
    
    // When
    const devices = await deviceService.getDevices(organizationId);
    
    // Then
    expect(devices).toEqual(mockDevices);
  });
});
```

```rust
// Rust test example
#[tokio::test]
async fn test_agent_registration() {
    // Given
    let config = AgentConfig::test_config();
    let mock_server = MockServer::start().await;
    
    // When
    let result = register_agent(&config).await;
    
    // Then
    assert!(result.is_ok());
}
```

#### Integration Tests

```java
// Spring Boot integration test
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestContainers
class OrganizationControllerIntegrationTest {
    
    @Container
    static MongoDBContainer mongodb = new MongoDBContainer("mongo:6.0");
    
    @Test
    void shouldCreateOrganization() {
        // Test full request/response cycle
    }
}
```

## 📖 Documentation Guidelines

### Code Documentation

**Java - Use JavaDoc:**
```java
/**
 * Service for managing organizations within a tenant.
 * 
 * @author OpenFrame Team
 * @since 1.0.0
 */
@Service
public class OrganizationService {
    
    /**
     * Finds an organization by its unique identifier.
     * 
     * @param id the organization identifier
     * @return the organization
     * @throws OrganizationNotFoundException if not found
     */
    public Organization findById(String id) {
        // Implementation
    }
}
```

**TypeScript - Use JSDoc:**
```typescript
/**
 * Hook for fetching and managing device data.
 * 
 * @param organizationId - The organization identifier
 * @returns Device data and loading state
 */
export function useDevices(organizationId: string) {
    // Implementation
}
```

**Rust - Use doc comments:**
```rust
/// Represents an OpenFrame agent configuration.
/// 
/// This struct contains all necessary configuration for an agent
/// to register and communicate with the OpenFrame platform.
#[derive(Debug, Clone)]
pub struct AgentConfig {
    /// The agent registration URL
    pub registration_url: String,
    /// The agent identifier
    pub agent_id: String,
}
```

### Markdown Documentation

**Follow the project style:**

```markdown
# Document Title

Brief description of the document's purpose.

## Section Title

Content with proper formatting:

- Use bullet points for lists
- Use `code blocks` for code snippets
- Use **bold** for emphasis
- Use *italic* for terms

### Code Examples

\`\`\`bash
# Always include language hints
mvn clean install
\`\`\`

### API Documentation

Document endpoints with examples:

**GET** `/api/organizations`

Parameters:
- `limit` (optional): Maximum results to return
- `page` (optional): Page number for pagination

Response:
\`\`\`json
{
  "data": [...],
  "pagination": {...}
}
\`\`\`
```

## 🌟 Recognition

### Contribution Recognition

We recognize contributors through:

- **GitHub Contributors Graph**: Automatic recognition for commits
- **Release Notes**: Major contributions highlighted in releases  
- **Community Shoutouts**: Recognition in Slack and social media
- **Contributor Badge**: Special recognition for significant contributions

### Becoming a Maintainer

**Path to maintainership:**

1. **Consistent Quality Contributions**: Regular, high-quality submissions
2. **Community Involvement**: Active participation in discussions and reviews
3. **Technical Expertise**: Demonstrated deep understanding of the codebase
4. **Mentorship**: Helping other contributors and reviewing PRs
5. **Invitation**: Current maintainers will invite qualified contributors

## 🆘 Community and Support

### Getting Help

**For development questions:**
- 💬 **Slack**: Ask in [OpenMSP community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- 📚 **Documentation**: Check the [docs directory](docs/README.md)
- 🐛 **Issues**: Search existing [GitHub issues](https://github.com/flamingo-stack/openframe-oss-tenant/issues)

**For urgent issues:**
- 🔒 **Security**: Email security@flamingo.run
- 🚨 **Critical Bugs**: Create high-priority GitHub issue

### Communication Channels

| Channel | Purpose | Response Time |
|---------|---------|---------------|
| **Slack #general** | General questions and discussion | < 24 hours |
| **Slack #development** | Technical development discussion | < 24 hours |
| **GitHub Issues** | Bug reports and feature requests | < 48 hours |
| **GitHub PRs** | Code review and discussion | < 72 hours |
| **Email** | Private/sensitive matters | < 72 hours |

## 📄 License

By contributing to OpenFrame, you agree that your contributions will be licensed under the [Flamingo AI Unified License v1.0](LICENSE.md).

---

## 🎉 Thank You!

Your contributions help make OpenFrame better for MSPs around the world. Whether you're fixing bugs, adding features, improving documentation, or helping other contributors, your efforts make a real difference.

**Every contribution counts**, from fixing typos to architecting major features. Thank you for being part of the OpenFrame community!

---

<div align="center">
  Questions? Join us in <a href="https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA"><b>Slack</b></a> or check our <a href="docs/README.md"><b>Documentation</b></a>
</div>