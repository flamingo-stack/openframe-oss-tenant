# Contributing to OpenFrame

Thank you for your interest in contributing to OpenFrame! We're excited to work with the community to build the best AI-powered MSP platform possible.

## 🌟 Getting Started

### Prerequisites

Before you begin, ensure you have:
- Java 21 or later
- Node.js 18+ and npm
- Docker and Docker Compose
- Git
- Maven 3.9+

For detailed setup instructions, see our [Prerequisites Guide](./docs/getting-started/prerequisites.md).

### Development Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
   cd openframe-oss-tenant
   ```

2. **Set up development environment**
   ```bash
   ./setup-dev.sh
   ```

3. **Verify setup**
   ```bash
   # Start all services
   foreman start
   
   # Test API health
   curl -k https://localhost:8081/actuator/health
   ```

For comprehensive setup instructions, see [Environment Setup](./docs/development/setup/environment.md).

## 🏗️ Project Structure

OpenFrame follows a microservices architecture with clear separation between core libraries and service applications:

```text
openframe-oss-tenant/
├── openframe-oss-lib/          # Core libraries and domain logic
│   ├── openframe-authorization-service-core/
│   ├── openframe-gateway-service-core/
│   ├── openframe-api-service-core/
│   └── ...
├── openframe/services/         # Runnable Spring Boot applications
│   ├── openframe-api/
│   ├── openframe-gateway/
│   ├── openframe-authorization-server/
│   └── ...
├── docs/                       # Documentation
└── docker-compose.yml         # Development infrastructure
```

## 🔄 Development Workflow

### 1. Create Feature Branch

```bash
# Create and switch to a new feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 2. Development Process

- **Follow Test-Driven Development (TDD)**: Write tests before implementation
- **Maintain code coverage**: Aim for 80%+ test coverage on new code
- **Run tests frequently**: Use `mvn test -T 1C` for fast parallel testing
- **Follow coding standards**: Use Google Java Style Guide

### 3. Code Quality Checks

Before committing, ensure all quality checks pass:

```bash
# Run all tests
mvn clean verify

# Check code coverage
mvn jacoco:report

# Static analysis
mvn spotbugs:check

# Integration tests
mvn verify -P integration-tests
```

### 4. Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for consistent commit messages:

```bash
# Format: <type>(<scope>): <description>
git commit -m "feat(api): add device filtering capability"
git commit -m "fix(gateway): resolve JWT validation issue"
git commit -m "docs(readme): update quick start instructions"
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 5. Submit Pull Request

1. Push your branch to your fork
2. Create a pull request against the main repository
3. Fill out the pull request template completely
4. Ensure all CI checks pass
5. Address review feedback promptly

## 🎯 Contribution Guidelines

### Code Style

- **Java**: Follow [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)
- **JavaScript/TypeScript**: Use Prettier with default settings
- **Documentation**: Use clear, concise language with examples

### Testing Standards

#### Unit Tests
- Test all public methods and important private methods
- Use meaningful test method names: `shouldReturnFilteredDevicesWhenValidCriteriaProvided`
- Mock external dependencies
- Use AssertJ for fluent assertions

#### Integration Tests
- Test complete workflows end-to-end
- Use TestContainers for database testing
- Verify multi-tenant isolation
- Test error scenarios and edge cases

#### Example Test Structure
```java
@SpringBootTest
@TestMethodOrder(OrderAnnotation.class)
class DeviceServiceIntegrationTest {
    
    @Test
    @Order(1)
    void shouldCreateDeviceSuccessfully() {
        // Given
        DeviceCreateRequest request = DeviceCreateRequest.builder()
            .name("Test Device")
            .type(DeviceType.WORKSTATION)
            .build();
        
        // When
        DeviceResponse response = deviceService.createDevice(request);
        
        // Then
        assertThat(response)
            .isNotNull()
            .extracting("name", "type")
            .containsExactly("Test Device", DeviceType.WORKSTATION);
    }
}
```

### Security Considerations

- **Multi-tenant isolation**: Always include tenant context in data access
- **Input validation**: Validate all external inputs
- **Authentication**: Use proper JWT validation patterns
- **Authorization**: Implement proper role-based access control
- **Sensitive data**: Never log sensitive information

### Documentation Requirements

- **README updates**: Update relevant README files for user-facing changes
- **API documentation**: Document new GraphQL schemas and REST endpoints
- **Architecture docs**: Update architecture diagrams for structural changes
- **Code comments**: Use JavaDoc for public APIs

## 🧪 Testing Strategy

### Test Categories

1. **Unit Tests** (`src/test/java`)
   - Fast, isolated tests
   - Mock external dependencies
   - Test business logic and edge cases

2. **Integration Tests** (`src/integration-test/java`)
   - Test component interactions
   - Use real databases with TestContainers
   - Verify complete workflows

3. **End-to-End Tests**
   - Test complete user workflows
   - Use the full application stack
   - Verify cross-service communication

### Running Tests

```bash
# Unit tests only
mvn test

# All tests including integration
mvn verify

# Specific test class
mvn test -Dtest=DeviceServiceTest

# Tests with coverage
mvn clean verify jacoco:report
```

## 🐛 Bug Reports

When reporting bugs, include:

1. **Clear title**: Describe the issue concisely
2. **Environment**: OS, Java version, browser (if applicable)
3. **Steps to reproduce**: Detailed steps to trigger the bug
4. **Expected behavior**: What should happen
5. **Actual behavior**: What actually happens
6. **Screenshots/logs**: Any relevant visual or log information

**Note**: Submit bug reports in our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) (#bugs channel) rather than GitHub Issues.

## 🚀 Feature Requests

For new features:

1. **Join the discussion** in [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) (#feature-requests)
2. **Describe the use case**: Why is this feature needed?
3. **Provide examples**: How would it work?
4. **Consider alternatives**: Are there existing solutions?
5. **Implementation ideas**: Any thoughts on technical approach?

## 🏛️ Architecture Contributions

For architectural changes:

1. **Discuss first**: Use #architecture channel in Slack
2. **Create an ADR**: Architecture Decision Record for significant changes
3. **Update diagrams**: Maintain Mermaid diagrams in documentation
4. **Consider backwards compatibility**: Plan migration strategies
5. **Performance impact**: Consider scalability implications

## 👥 Community Guidelines

### Communication

- **Be respectful**: Treat everyone with respect and professionalism
- **Be inclusive**: Welcome people of all backgrounds and skill levels
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Remember that everyone is volunteering their time

### Slack Etiquette

- **Use threads**: Keep channels organized by using thread replies
- **Search first**: Check if your question has been asked before
- **Use appropriate channels**: #development for dev questions, #architecture for design discussions
- **Share knowledge**: Help others when you can

### Code Review Guidelines

#### For Authors
- **Keep PRs small**: Easier to review and merge
- **Write clear descriptions**: Explain what and why
- **Test thoroughly**: Ensure all tests pass
- **Address feedback**: Respond to review comments promptly

#### For Reviewers
- **Be constructive**: Suggest improvements, don't just criticize
- **Explain reasoning**: Help the author understand your perspective
- **Approve promptly**: Don't let good PRs languish
- **Test locally**: Verify changes work in your environment

## 🎓 Learning Resources

### OpenFrame Architecture
- [System Architecture](./docs/development/architecture/README.md)
- [Development Setup](./docs/development/setup/environment.md)
- [Security Patterns](./docs/development/security/README.md)

### External Technologies
- [Spring Boot Reference](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/)
- [Netflix DGS Framework](https://netflix.github.io/dgs/)
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)
- [MongoDB Manual](https://www.mongodb.com/docs/)

### Best Practices
- [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)

## 📞 Getting Help

### Community Support
- **OpenMSP Slack**: [Join our community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Development Questions**: #development channel
- **Architecture Discussions**: #architecture channel
- **General Help**: #general channel

### Documentation
- **Getting Started**: [Quick Start Guide](./docs/getting-started/quick-start.md)
- **Development**: [Local Development Setup](./docs/development/setup/local-development.md)
- **API Reference**: Available through GraphQL Playground and Swagger UI

### Mentorship
New contributors are welcome! Join the #mentorship channel in Slack to:
- Get paired with an experienced contributor
- Ask questions about the codebase
- Get guidance on your first contribution
- Learn about development best practices

## 🎉 Recognition

We value all contributions to OpenFrame! Contributors are recognized through:

- **Contributor list**: Added to our contributors documentation
- **Slack shout-outs**: Recognition in community channels
- **Feature highlights**: Major contributions highlighted in release notes
- **Maintainer status**: Active contributors may be invited to join the maintainer team

## 📋 Checklist for First-Time Contributors

- [ ] Join the [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- [ ] Set up development environment following the [setup guide](./docs/development/setup/environment.md)
- [ ] Read the [architecture documentation](./docs/development/architecture/README.md)
- [ ] Find a "good first issue" or discuss ideas in #development
- [ ] Create a feature branch and start coding
- [ ] Write tests for your changes
- [ ] Run all quality checks
- [ ] Submit your pull request
- [ ] Celebrate your contribution! 🎉

## 📄 License

By contributing to OpenFrame, you agree that your contributions will be licensed under the same license as the project: Flamingo AI Unified License v1.0.

---

**Ready to contribute?** Join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) and let's build the future of MSP automation together! 🚀