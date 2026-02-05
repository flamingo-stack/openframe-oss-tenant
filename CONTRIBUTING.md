# Contributing to OpenFrame

Thank you for your interest in contributing to OpenFrame! We welcome contributions from the community and are excited to work with you to make OpenFrame better.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Development Guidelines](#development-guidelines)
- [Community](#community)

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow. Please be respectful and professional in all interactions.

### Our Standards

- **Be respectful**: Treat everyone with respect and kindness
- **Be collaborative**: Work together constructively
- **Be inclusive**: Welcome contributions from all backgrounds
- **Be professional**: Maintain a professional tone in all communications

## Getting Started

### Prerequisites

Before contributing, ensure you have the required tools installed:

- **Java**: OpenJDK 21.0.1+
- **Node.js**: 18+ with npm
- **Rust**: 1.70+ with Cargo
- **Docker**: 24.0+ with Docker Compose
- **Git**: 2.42+
- **Maven**: 3.8+

### GitHub Authentication

This project depends on `openframe-oss-lib` which requires GitHub Packages authentication:

```bash
export GITHUB_ACTOR=your-github-username
export GITHUB_TOKEN=your-github-personal-access-token
```

The token needs `packages:read` permission.

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/your-username/openframe-oss-tenant.git
cd openframe-oss-tenant
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git
```

## Development Environment

### Initial Setup

1. **Start development infrastructure**:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

2. **Build the project**:

```bash
mvn clean install
```

3. **Start frontend development**:

```bash
cd openframe/services/openframe-frontend
npm install
npm run dev
```

4. **Build Rust agent**:

```bash
cd client
cargo build --release
```

### Running Services

OpenFrame consists of multiple microservices. For development, you can run them individually:

```bash
# API Service
cd openframe/services/openframe-api
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Gateway Service  
cd openframe/services/openframe-gateway
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Client Service
cd openframe/services/openframe-client
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

### Development URLs

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:8080
- **GraphQL Playground**: http://localhost:8080/graphql
- **API Documentation**: http://localhost:8080/swagger-ui

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

- **Bug fixes**: Fix issues and improve stability
- **Features**: Add new functionality
- **Documentation**: Improve guides, API docs, and examples
- **Tests**: Increase test coverage
- **Performance**: Optimize performance and scalability
- **Security**: Enhance security measures

### Finding Work

1. **Issues**: Check GitHub Issues for open bugs and feature requests
2. **Discussions**: Join GitHub Discussions for feature planning
3. **Roadmap**: Review the project roadmap for upcoming work
4. **Good First Issues**: Look for issues labeled `good-first-issue`

### Reporting Bugs

When reporting bugs, please include:

1. **Clear description** of the issue
2. **Steps to reproduce** the problem
3. **Expected vs actual behavior**
4. **Environment details** (OS, Java version, etc.)
5. **Relevant logs** or error messages
6. **Screenshots** if applicable

Use our bug report template when creating issues.

### Suggesting Features

For feature requests, please provide:

1. **Clear description** of the feature
2. **Use case** and business value
3. **Proposed implementation** approach
4. **Alternative solutions** considered
5. **Additional context** or mockups

## Pull Request Process

### Before You Start

1. **Check existing work**: Ensure no one else is working on the same issue
2. **Discuss large changes**: For significant features, discuss first in GitHub Discussions
3. **Create an issue**: Link your PR to a relevant issue

### Development Workflow

1. **Create a feature branch**:

```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes**:
   - Follow our coding standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**:

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
```

4. **Commit your changes**:

```bash
git add .
git commit -m "feat: add amazing new feature"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/) format.

5. **Push to your fork**:

```bash
git push origin feature/your-feature-name
```

6. **Create a Pull Request** on GitHub

### Pull Request Requirements

- **Clear title** describing the change
- **Detailed description** explaining what and why
- **Link to related issues**
- **Screenshots** for UI changes
- **Test coverage** for new code
- **Documentation updates** if needed

### Review Process

1. **Automated checks**: CI/CD pipeline must pass
2. **Code review**: At least one maintainer review required
3. **Testing**: Manual testing for significant changes
4. **Documentation**: Verify documentation is updated
5. **Approval**: Maintainer approval required for merge

## Development Guidelines

### Code Style

#### Java
- Follow Google Java Style Guide
- Use `mvn spotless:apply` for formatting
- Maximum line length: 120 characters
- Use meaningful variable and method names

#### TypeScript/JavaScript
- Use ESLint and Prettier configurations
- Follow React best practices
- Use TypeScript strict mode
- Prefer functional components with hooks

#### Rust
- Use `cargo fmt` for formatting
- Follow official Rust style guidelines
- Use `clippy` for linting
- Write comprehensive error handling

### Testing

#### Backend Testing
- **Unit tests**: Test individual components in isolation
- **Integration tests**: Test service interactions
- **Contract tests**: Verify API contracts
- **Minimum coverage**: 80% for new code

#### Frontend Testing
- **Component tests**: Test React components
- **Integration tests**: Test user workflows
- **End-to-end tests**: Test complete user journeys
- **Accessibility tests**: Verify WCAG compliance

#### Rust Testing
- **Unit tests**: Test individual functions and modules
- **Integration tests**: Test cross-platform compatibility
- **Performance tests**: Verify resource usage

### Documentation

- **Code comments**: Explain complex logic
- **API documentation**: Keep OpenAPI/GraphQL schemas updated
- **README updates**: Update setup and usage instructions
- **Architecture docs**: Document significant changes

### Security Guidelines

- **Input validation**: Validate all user inputs
- **Authentication**: Proper JWT handling and validation  
- **Authorization**: Implement role-based access controls
- **Data protection**: Encrypt sensitive data
- **Audit logging**: Log security-relevant events

### Performance Guidelines

- **Database queries**: Optimize query performance
- **Caching**: Use Redis for frequently accessed data
- **Async processing**: Use Kafka for heavy operations
- **Resource limits**: Implement proper resource management

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General discussions and questions
- **OpenMSP Slack**: Real-time chat and community support
- **Email**: security@flamingo.run for security issues

### Community Guidelines

- **Be patient**: Maintainers are volunteers with other commitments
- **Be helpful**: Help other contributors when possible
- **Be constructive**: Provide actionable feedback
- **Be respectful**: Treat everyone with respect and kindness

### Getting Help

- **Documentation**: Check existing docs first
- **Search**: Look through existing issues and discussions
- **Ask questions**: Don't hesitate to ask for help
- **Provide context**: Include relevant details when asking for help

## Recognition

We recognize contributions in several ways:

- **Contributors list**: All contributors are listed in the repository
- **Release notes**: Significant contributions are highlighted
- **Community recognition**: Active contributors are recognized in community channels

## License

By contributing to OpenFrame, you agree that your contributions will be licensed under the [Flamingo AI Unified License v1.0](LICENSE.md).

## Questions?

If you have questions about contributing, please:

1. Check this guide first
2. Search existing issues and discussions
3. Join the [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
4. Create a discussion on GitHub

---

Thank you for contributing to OpenFrame! Your help makes this project better for everyone.