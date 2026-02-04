# Contributing to OpenFrame OSS Tenant

Thank you for your interest in contributing to OpenFrame! We're excited to have you join our community of developers building the future of MSP operations.

## 🌟 Welcome Contributors!

OpenFrame is an open-source project that thrives on community contributions. Whether you're fixing bugs, adding features, improving documentation, or sharing ideas, your contributions are valued and appreciated.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contribution Workflow](#contribution-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community Support](#community-support)

## 📜 Code of Conduct

This project follows the [Flamingo Community Code of Conduct](https://www.flamingo.run/community/code-of-conduct). By participating, you agree to uphold this code. Please report unacceptable behavior to community@flamingo.run.

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Java**: OpenJDK 21.0.1+
- **Node.js**: 18+ with npm
- **Rust**: 1.70+ with Cargo (for client development)
- **Docker**: 24.0+ with Docker Compose
- **Git**: 2.42+
- **Maven**: 3.9+

### Development Environment Setup

1. **Fork and Clone**
   ```bash
   # Fork the repository on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
   cd openframe-oss-tenant
   ```

2. **Set Up Authentication**
   ```bash
   # Required for accessing openframe-oss-lib dependencies
   export GITHUB_ACTOR=your-github-username
   export GITHUB_TOKEN=your-github-token
   ```

3. **Build the Project**
   ```bash
   # Full build with tests
   mvn clean install
   
   # Quick build without tests
   mvn clean install -DskipTests
   ```

4. **Verify Setup**
   ```bash
   # Run tests to ensure everything works
   mvn test
   ```

For detailed setup instructions, see [Development Environment Setup](docs/development/setup/environment.md).

## 🔄 Contribution Workflow

### 1. Create an Issue (Optional)

For significant changes, create an issue first to discuss the approach:
- **Bug Reports**: Use the bug report template
- **Feature Requests**: Use the feature request template
- **Questions**: Join our [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

> **Note**: We don't use GitHub Issues for support. Use our Slack community for questions and discussions.

### 2. Create a Feature Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name
git checkout -b fix/bug-description
git checkout -b docs/documentation-update
```

**Branch Naming Convention:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test improvements

### 3. Make Your Changes

- **Keep commits focused** - One logical change per commit
- **Write clear commit messages** - Follow conventional commit format
- **Test your changes** - Ensure all tests pass
- **Update documentation** - Include relevant docs updates

### 4. Commit Guidelines

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
# Examples of good commit messages
git commit -m "feat(api): add user authentication endpoint"
git commit -m "fix(gateway): resolve JWT token validation issue"
git commit -m "docs(readme): update installation instructions"
git commit -m "test(client): add integration tests for agent registration"
```

**Commit Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test additions or modifications
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `chore:` - Maintenance tasks

### 5. Push and Create Pull Request

```bash
# Push your branch
git push origin feature/your-feature-name

# Create a pull request on GitHub
# Use the PR template and provide a clear description
```

## 📏 Coding Standards

### Java Code Style

- **Formatting**: Follow Google Java Style Guide
- **Checkstyle**: Configured in `checkstyle.xml`
- **JavaDoc**: Required for public APIs
- **Naming**: Use descriptive names for variables and methods

```java
// Good example
public class UserAuthenticationService {
    /**
     * Authenticates a user with the provided credentials.
     *
     * @param credentials the user credentials
     * @return authentication result
     * @throws AuthenticationException if authentication fails
     */
    public AuthenticationResult authenticate(UserCredentials credentials) {
        // Implementation
    }
}
```

### TypeScript/Vue.js Code Style

- **ESLint**: Configured with Vue.js and TypeScript rules
- **Prettier**: For consistent formatting
- **Composition API**: Preferred for new Vue components
- **Type Safety**: Use TypeScript types and interfaces

```typescript
// Good example
interface User {
  id: string;
  name: string;
  email: string;
}

const userService = {
  async fetchUser(id: string): Promise<User> {
    // Implementation
  }
};
```

### Rust Code Style

- **rustfmt**: For consistent formatting
- **Clippy**: For linting and best practices
- **Documentation**: Use `///` for public items
- **Error Handling**: Use `Result<T, E>` pattern

```rust
/// Represents a device agent configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentConfig {
    pub device_id: String,
    pub endpoint: String,
    pub auth_token: String,
}

impl AgentConfig {
    /// Creates a new agent configuration
    pub fn new(device_id: String, endpoint: String, auth_token: String) -> Self {
        // Implementation
    }
}
```

## 🧪 Testing Guidelines

### Test Requirements

- **Unit Tests**: Required for all new features
- **Integration Tests**: For API endpoints and service interactions
- **End-to-End Tests**: For critical user workflows
- **Coverage**: Minimum 80% code coverage for new code

### Running Tests

```bash
# Java tests
mvn test

# Specific service tests
cd openframe/services/openframe-api
mvn test

# Frontend tests
cd openframe/services/openframe-frontend
npm run test

# Rust tests
cd clients/openframe-client
cargo test
```

### Test Structure

```java
// Java test example
@SpringBootTest
class UserAuthenticationServiceTest {
    
    @Test
    @DisplayName("Should authenticate user with valid credentials")
    void shouldAuthenticateUserWithValidCredentials() {
        // Given
        UserCredentials credentials = new UserCredentials("user", "password");
        
        // When
        AuthenticationResult result = authService.authenticate(credentials);
        
        // Then
        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getUser()).isNotNull();
    }
}
```

## 📚 Documentation

### Required Documentation Updates

When contributing, update relevant documentation:

- **Code Documentation**: JavaDoc, JSDoc, Rust docs
- **API Documentation**: GraphQL schema descriptions
- **User Documentation**: If adding user-facing features
- **Architecture Documentation**: For significant architectural changes

### Documentation Standards

- **Clear and Concise**: Write for developers of all skill levels
- **Examples**: Include code examples where helpful
- **Up-to-date**: Ensure documentation matches implementation
- **Searchable**: Use clear headings and structure

## 🛠️ Development Tips

### Local Development Workflow

1. **Start Services Individually** for focused development:
   ```bash
   # Start only the services you're working on
   cd openframe/services/openframe-api
   mvn spring-boot:run
   ```

2. **Use Hot Reload** for faster iteration:
   ```bash
   # Frontend hot reload
   cd openframe/services/openframe-frontend
   npm run dev
   ```

3. **Debug with IDE**: Configure your IDE for debugging Spring Boot and Vue.js applications

### Common Issues and Solutions

- **Build Failures**: Check Java version and Maven settings
- **Port Conflicts**: Services use specific ports (see docker-compose.yml)
- **Database Issues**: Ensure Docker containers are running
- **Authentication**: Verify `GITHUB_ACTOR` and `GITHUB_TOKEN` are set

## 🏷️ Release Process

### Semantic Versioning

OpenFrame follows [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Cadence

- **Major Releases**: Quarterly
- **Minor Releases**: Monthly
- **Patch Releases**: As needed

## 🎯 Areas for Contribution

We welcome contributions in these areas:

### 🔧 **High Priority**
- Performance optimizations
- Test coverage improvements
- Documentation enhancements
- Bug fixes and stability improvements

### 🌟 **Feature Development**
- New integrations with MSP tools
- AI/ML feature enhancements
- Mobile application features
- Advanced analytics and reporting

### 📝 **Documentation**
- Getting started guides
- Architecture documentation
- API documentation
- Tutorials and examples

### 🧪 **Testing & Quality**
- Automated testing improvements
- Security testing
- Load testing
- Accessibility testing

## 💬 Community Support

### Getting Help

- **OpenMSP Slack**: [Join our community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for real-time support
- **Documentation**: Check [docs/](./docs/README.md) for comprehensive guides
- **Codebase**: Review existing code for patterns and examples

### Channels for Different Topics

- **`#general`**: General discussions and announcements
- **`#development`**: Development questions and code reviews
- **`#documentation`**: Documentation discussions and improvements
- **`#bugs`**: Bug reports and troubleshooting

## 📧 Contact

- **Community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Email**: community@flamingo.run
- **Website**: [flamingo.run](https://flamingo.run)

## 🎉 Recognition

We recognize and appreciate all contributors:

- **Contributors** are listed in the project README
- **Significant contributions** are highlighted in release notes
- **Community contributors** are featured on our website and social media

## 📄 License

By contributing to OpenFrame, you agree that your contributions will be licensed under the [Flamingo AI Unified License v1.0](LICENSE.md).

---

**Thank you for contributing to OpenFrame!** 🚀

Your contributions help build the future of MSP operations. Together, we're creating a platform that empowers MSPs worldwide with open-source, AI-driven automation.

---

<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> team and community contributors
</div>