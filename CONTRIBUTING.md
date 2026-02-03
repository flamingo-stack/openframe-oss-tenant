# Contributing to OpenFrame OSS Tenant

Thank you for your interest in contributing to OpenFrame! This document provides guidelines and information for contributing to the `openframe-oss-tenant` repository.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming and inclusive environment. Please be respectful and professional in all interactions.

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have the required tools installed:

- **Java**: OpenJDK 21.0.1+
- **Node.js**: 18+ with npm
- **Rust**: 1.70+ with Cargo
- **Docker**: 24.0+ with Docker Compose
- **Git**: 2.42+
- **Maven**: 3.9+ for Java builds

### GitHub Authentication

This project depends on private GitHub packages. Set up authentication:

```bash
export GITHUB_ACTOR=your-github-username
export GITHUB_TOKEN=your-github-token
```

Your GitHub token needs `read:packages` permission.

## 🛠️ Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR-USERNAME/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git
```

### 2. Environment Setup

```bash
# Set up GitHub authentication
export GITHUB_ACTOR=your-github-username
export GITHUB_TOKEN=your-github-token

# Build the project
mvn clean install

# Start development services (optional)
cd openframe/services/openframe-frontend
npm install && npm run dev
```

### 3. Verify Setup

```bash
# Run tests to verify everything works
mvn test

# Frontend type checking
cd openframe/services/openframe-frontend
npm run type-check

# Rust agent tests
cd client
cargo test
```

For detailed setup instructions, see [Development Setup Guide](docs/development/setup/environment.md).

## 🤝 How to Contribute

### Types of Contributions

We welcome various types of contributions:

- **Bug fixes** - Fix issues in existing code
- **Feature implementations** - Add new functionality
- **Documentation** - Improve existing docs or add new content
- **Testing** - Add or improve test coverage
- **Performance** - Optimize existing code
- **Security** - Enhance security measures

### Before You Start

1. **Check existing issues** - Look for related issues or feature requests
2. **Join our community** - Connect with us on [OpenMSP Slack](https://www.openmsp.ai/)
3. **Discuss major changes** - For significant features, please discuss first

## 📝 Pull Request Process

### 1. Create a Feature Branch

```bash
# Update your fork
git fetch upstream
git checkout main
git merge upstream/main

# Create a feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b bugfix/issue-number-description
```

### 2. Make Your Changes

- Follow our [coding standards](#coding-standards)
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass

### 3. Commit Your Changes

Use conventional commit messages:

```bash
# Feature commits
git commit -m "feat(api): add new endpoint for user management"

# Bug fix commits
git commit -m "fix(auth): resolve JWT token validation issue"

# Documentation commits
git commit -m "docs(readme): update installation instructions"
```

### 4. Push and Create PR

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create pull request on GitHub
```

### 5. PR Requirements

Your pull request must:

- ✅ Include clear description of changes
- ✅ Reference related issues (e.g., "Fixes #123")
- ✅ Pass all CI checks
- ✅ Include appropriate tests
- ✅ Update documentation if needed
- ✅ Follow coding standards
- ✅ Be reviewed and approved by maintainers

## 🎯 Coding Standards

### Java/Spring Boot

- Follow [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)
- Use Spring Boot conventions and best practices
- Implement proper error handling and logging
- Use meaningful variable and method names

```java
// Good
@Service
@Slf4j
public class UserManagementService {
    
    public User createUser(CreateUserRequest request) {
        log.info("Creating user with email: {}", request.getEmail());
        // Implementation
    }
}

// Bad
@Service
public class UMS {
    public User create(CreateUserRequest r) {
        // Implementation without logging
    }
}
```

### TypeScript/React

- Follow [Airbnb TypeScript Style Guide](https://github.com/airbnb/javascript/tree/master/packages/eslint-config-airbnb-typescript)
- Use functional components with hooks
- Implement proper TypeScript types
- Follow React best practices

```typescript
// Good
interface UserProps {
  user: User;
  onUpdate: (user: User) => void;
}

const UserComponent: React.FC<UserProps> = ({ user, onUpdate }) => {
  // Implementation
};

// Bad
const UserComponent = (props: any) => {
  // Implementation
};
```

### Rust

- Follow [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- Use `cargo fmt` and `cargo clippy`
- Implement proper error handling
- Write comprehensive tests

```rust
// Good
#[derive(Debug, thiserror::Error)]
pub enum ClientError {
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),
    #[error("Invalid configuration: {0}")]
    Config(String),
}

// Bad
pub enum ClientError {
    Error(String),
}
```

For detailed coding standards, see [Code Style Guide](docs/development/contributing/code-style.md).

## 🧪 Testing Guidelines

### Test Requirements

- **Unit tests** for all new functionality
- **Integration tests** for API endpoints
- **End-to-end tests** for critical workflows
- **Minimum 80% code coverage** for new code

### Running Tests

```bash
# Java tests
mvn test

# Frontend tests
cd openframe/services/openframe-frontend
npm test

# Rust tests
cd client
cargo test

# Integration tests
mvn verify -P integration-tests
```

### Test Structure

```java
// Java test example
@SpringBootTest
@TestPropertySource(properties = "spring.profiles.active=test")
class UserServiceTest {
    
    @Test
    @DisplayName("Should create user successfully")
    void shouldCreateUserSuccessfully() {
        // Given
        CreateUserRequest request = new CreateUserRequest("test@example.com");
        
        // When
        User result = userService.createUser(request);
        
        // Then
        assertThat(result.getEmail()).isEqualTo("test@example.com");
    }
}
```

## 📖 Documentation

### Documentation Requirements

- Update relevant documentation for all changes
- Add inline code comments for complex logic
- Update API documentation for endpoint changes
- Include examples in documentation

### Documentation Types

- **Inline comments** - For complex code sections
- **README updates** - For setup or usage changes
- **API docs** - For REST/GraphQL endpoint changes
- **Architecture docs** - For design or structure changes

### Writing Style

- Use clear, concise language
- Include code examples
- Provide step-by-step instructions
- Use proper markdown formatting

## 🌐 Community

### Getting Help

- **Documentation**: Check our [docs](./docs/README.md) first
- **Slack Community**: Join [OpenMSP Slack](https://www.openmsp.ai/) for discussions
- **Issues**: Create GitHub issues for bugs or feature requests

### Communication Channels

- **General Discussions**: OpenMSP Slack #general channel
- **Development**: OpenMSP Slack #development channel
- **Security Issues**: Email security@flamingo.run (do not use public issues)

### Community Guidelines

- Be respectful and inclusive
- Help others learn and grow
- Share knowledge and best practices
- Provide constructive feedback

## 📋 Issue Guidelines

### Reporting Bugs

When reporting bugs, please include:

- **Clear title** describing the issue
- **Steps to reproduce** the problem
- **Expected behavior** vs actual behavior
- **Environment details** (OS, versions, etc.)
- **Logs or error messages** if applicable

### Feature Requests

For feature requests, please include:

- **Clear description** of the feature
- **Use case** and business value
- **Acceptance criteria** if applicable
- **Implementation suggestions** (optional)

### Issue Labels

We use these labels to categorize issues:

- `bug` - Something isn't working
- `enhancement` - New feature or improvement
- `documentation` - Documentation related
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `priority: high/medium/low` - Priority classification

## ✅ Checklist

Before submitting your contribution:

- [ ] I have read and followed the contributing guidelines
- [ ] My code follows the project's coding standards
- [ ] I have added tests for my changes
- [ ] All tests pass locally
- [ ] I have updated documentation as needed
- [ ] My commits have clear, descriptive messages
- [ ] I have tested my changes thoroughly

## 🎉 Recognition

Contributors are recognized in:

- GitHub contributors list
- Release notes for significant contributions
- OpenMSP community acknowledgments

Thank you for contributing to OpenFrame! Your contributions help make this project better for everyone.

---

For more detailed information, see our [Development Documentation](docs/development/README.md) or join our [Slack Community](https://www.openmsp.ai/).