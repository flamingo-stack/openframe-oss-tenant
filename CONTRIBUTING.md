# Contributing to OpenFrame

Thank you for your interest in contributing to OpenFrame! This guide will help you get started with contributing to the open-source, multi-tenant implementation of Flamingo's unified MSP platform.

## 🤝 Code of Conduct

By participating in this project, you agree to abide by our community standards:

- **Be respectful** - Treat everyone with respect and kindness
- **Be inclusive** - Welcome people of all backgrounds and skill levels
- **Be constructive** - Focus on helping and improving the project
- **Be patient** - Remember that everyone is learning

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have the required development environment:

- **Java**: OpenJDK 21.0.1+
- **Node.js**: 18+ with npm
- **Rust**: 1.70+ with Cargo  
- **Docker**: 24.0+ with Docker Compose
- **Git**: 2.42+
- **GitHub Account**: For authentication to GitHub Packages

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/openframe-oss-tenant.git
   cd openframe-oss-tenant
   ```

3. **Set up GitHub authentication** (required for dependencies):
   ```bash
   export GITHUB_ACTOR=your-github-username
   export GITHUB_TOKEN=your-github-token
   ```

4. **Install dependencies and build**:
   ```bash
   # Backend services
   mvn clean install
   
   # Frontend
   cd openframe/services/openframe-frontend
   npm install
   
   # Rust client agent  
   cd ../../client
   cargo build
   ```

5. **Run tests** to ensure everything works:
   ```bash
   # Java tests
   mvn test
   
   # Frontend tests
   cd openframe/services/openframe-frontend
   npm run type-check
   
   # Rust tests
   cd ../../client  
   cargo test
   ```

For detailed setup instructions, see the [Development Environment Guide](docs/development/setup/environment.md).

## 📋 How to Contribute

### Reporting Issues

Before creating an issue, please:

1. **Check existing issues** to avoid duplicates
2. **Use our Slack community** at [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for questions and discussions
3. **Provide detailed information** including:
   - OpenFrame version
   - Operating system and version
   - Steps to reproduce
   - Expected vs actual behavior
   - Relevant logs or error messages

**Note**: We don't use GitHub Issues or GitHub Discussions. All project coordination happens in our OpenMSP Slack community.

### Submitting Changes

#### 1. Create a Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

#### 2. Make Your Changes

- **Follow our coding standards** (see [Code Style Guide](docs/development/contributing/code-style.md))
- **Write clear commit messages** following conventional commits
- **Add tests** for new functionality
- **Update documentation** as needed

#### 3. Test Your Changes

```bash
# Run all tests
mvn clean test                                    # Backend
cd openframe/services/openframe-frontend && npm test  # Frontend  
cd client && cargo test                          # Rust agent
```

#### 4. Submit a Pull Request

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub with:
   - Clear title and description
   - Reference to any related issues
   - Screenshots/videos if applicable
   - Testing instructions

3. **Respond to feedback** promptly and make requested changes

## 📝 Development Guidelines

### Code Style

We maintain consistent code style across the project:

- **Java**: Google Java Style Guide with 4-space indentation
- **TypeScript/JavaScript**: Prettier with 2-space indentation  
- **Rust**: Standard `rustfmt` formatting
- **Documentation**: Clear, concise markdown with proper headers

See our [Code Style Guide](docs/development/contributing/code-style.md) for detailed standards.

### Commit Messages

Use conventional commit format:

```bash
feat: add user authentication to API service
fix: resolve memory leak in stream processor  
docs: update installation instructions
test: add integration tests for gateway service
refactor: optimize database query performance
```

### Branch Naming

- `feature/feature-name` - New features
- `fix/issue-description` - Bug fixes
- `docs/documentation-update` - Documentation changes
- `test/test-description` - Test additions/improvements
- `refactor/refactor-description` - Code refactoring

### Testing Requirements

All contributions must include appropriate tests:

- **Unit tests** for business logic
- **Integration tests** for service interactions
- **End-to-end tests** for critical user flows
- **Performance tests** for scalability features

## 🏗️ Project Architecture

Understanding the project structure helps with contributions:

### Repository Structure

```
openframe-oss-tenant/
├── openframe/
│   ├── services/           # Runtime Spring Boot services
│   │   ├── openframe-api-service/
│   │   ├── openframe-gateway/  
│   │   ├── openframe-authorization-server/
│   │   └── ...
│   └── client/            # Rust system agent
├── openframe-oss-lib/     # Shared core libraries  
├── docs/                  # Documentation
└── cli/                   # CLI tools (external repo)
```

### Key Components

- **API Layer**: GraphQL and REST APIs with Spring Boot
- **Gateway Layer**: Security, routing, and WebSocket handling
- **Stream Layer**: Kafka-based event processing
- **Data Layer**: MongoDB, Cassandra, Redis, and Apache Pinot
- **Client Layer**: Rust agent for system monitoring

For detailed architecture information, see [Architecture Overview](docs/development/architecture/overview.md).

## 🛠️ Development Workflows

### Adding a New Feature

1. **Discuss in Slack** - Validate the feature idea with maintainers
2. **Create detailed design** - Document the approach and impact
3. **Implement incrementally** - Break large features into smaller PRs
4. **Add comprehensive tests** - Unit, integration, and e2e as needed
5. **Update documentation** - Keep docs current with changes

### Fixing Bugs

1. **Reproduce the issue** - Create a failing test case
2. **Identify root cause** - Debug thoroughly before fixing
3. **Implement minimal fix** - Address the specific issue without over-engineering
4. **Add regression tests** - Prevent the issue from recurring
5. **Verify across services** - Ensure no unintended side effects

### Improving Documentation

1. **Identify gaps** - Look for missing or outdated content
2. **Follow structure** - Use existing patterns and organization
3. **Include examples** - Provide practical code samples
4. **Test instructions** - Verify all steps work as documented
5. **Review for clarity** - Ensure content is accessible to new contributors

## 🔍 Review Process

### What We Look For

- **Code quality** - Readable, maintainable, and well-structured
- **Test coverage** - Adequate testing of new functionality
- **Documentation** - Clear explanations and updated guides  
- **Performance** - Efficient algorithms and resource usage
- **Security** - Proper authentication, authorization, and data handling
- **Compatibility** - Works across supported platforms and versions

### Review Timeline

- **Initial response**: Within 2 business days
- **Detailed review**: Within 1 week for most PRs
- **Follow-up responses**: Within 2 business days

Complex features may require additional review cycles. We appreciate your patience as we maintain high quality standards.

## 🏷️ Issue Labels

We use labels to categorize and prioritize work:

- **Type**: `bug`, `feature`, `documentation`, `performance`
- **Priority**: `critical`, `high`, `medium`, `low`
- **Component**: `api`, `gateway`, `stream`, `client`, `frontend`
- **Status**: `needs-review`, `in-progress`, `blocked`, `ready-to-merge`
- **Experience**: `good-first-issue`, `help-wanted`

## 🌟 Recognition

We value all contributions and recognize contributors through:

- **Contributors Graph** - GitHub automatically tracks all contributors
- **Release Notes** - Major contributors mentioned in release announcements
- **Slack Shoutouts** - Regular recognition in our community
- **Maintainer Nominations** - Outstanding contributors may become maintainers

## 📞 Getting Help

Need assistance with contributing?

- **💬 Slack Community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **📚 Documentation**: [Development Guides](docs/development/README.md)
- **🔧 Setup Issues**: [Environment Setup Guide](docs/development/setup/environment.md)
- **❓ General Questions**: Ask in our #contributors Slack channel

## 📜 Legal

By contributing to OpenFrame, you agree that:

- Your contributions will be licensed under the [Flamingo AI Unified License v1.0](LICENSE.md)
- You have the right to submit your contributions
- Your contributions are your original work or properly attributed

## 🙏 Thank You

Thank you for contributing to OpenFrame! Every contribution, whether it's code, documentation, bug reports, or community support, helps make OpenFrame better for MSPs and IT teams worldwide.

Together, we're building the future of unified, AI-powered MSP platforms! 🚀

---

*For questions about this contributing guide, reach out in our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA).*