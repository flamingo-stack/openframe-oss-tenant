# Contributing to OpenFrame OSS Tenant

We love your input! We want to make contributing to OpenFrame as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have the following installed:

- **Java**: OpenJDK 21.0.1+
- **Node.js**: 18+ with npm
- **Rust**: 1.70+ with Cargo
- **Docker**: 24.0+ with Docker Compose
- **Git**: 2.42+

### GitHub Authentication Setup

OpenFrame depends on `openframe-oss-lib` via GitHub Packages. You'll need to authenticate:

```bash
export GITHUB_ACTOR=your-github-username
export GITHUB_TOKEN=your-github-token
```

Your `GITHUB_TOKEN` needs `read:packages` permission.

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### Development Environment Setup

```bash
# Install dependencies and build
mvn clean install

# Start frontend development server
cd openframe/services/openframe-frontend
npm install && npm run dev

# Build Rust agent (optional for backend development)
cd ../../client
cargo build --release
```

## 🛠️ Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/amazing-feature
# or
git checkout -b bugfix/fix-issue-123
```

### Branch Naming Convention

- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/improvements

### 2. Make Your Changes

- Write clear, concise commit messages
- Follow the existing code style and conventions
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Backend tests
mvn test

# Frontend tests
cd openframe/services/openframe-frontend
npm run test
npm run type-check

# Rust tests (if applicable)
cd ../../client
cargo test
```

### 4. Commit Your Changes

Follow conventional commit format:

```bash
git commit -m "feat: add new device filtering capability"
git commit -m "fix: resolve authentication timeout issue"
git commit -m "docs: update API documentation"
```

### 5. Push and Create Pull Request

```bash
git push origin feature/amazing-feature
```

Then create a Pull Request on GitHub with:

- Clear title and description
- Reference any related issues
- Screenshots/GIFs for UI changes
- Test results and validation steps

## 📁 Project Structure

Understanding the codebase structure:

```
openframe-oss-tenant/
├── openframe/services/            # Deployable Spring Boot services
│   ├── api-service/              # Main REST + GraphQL API
│   ├── authorization-server/     # OAuth2 + OIDC identity
│   ├── gateway-service/          # Edge security and routing
│   ├── external-api-service/     # External API endpoints
│   ├── client-service/           # Agent ingest service
│   ├── stream-service/           # Kafka event processing
│   ├── management-service/       # System initialization
│   └── openframe-frontend/       # React UI application
├── openframe-oss-lib/            # Shared infrastructure modules
├── client/                       # Rust system agent
├── docs/                         # Documentation
└── cli/                          # CLI tools (separate repo)
```

### Key Technologies

- **Backend**: Java 21, Spring Boot 3.3, Netflix DGS (GraphQL)
- **Frontend**: React 19, TypeScript 5.8, Apollo GraphQL
- **Data**: MongoDB, Cassandra, Apache Pinot, Redis
- **Messaging**: Apache Kafka, NATS
- **Security**: OAuth2, JWT, Spring Security
- **Client**: Rust, Tokio

## 🧪 Testing Guidelines

### Backend Testing

- Write unit tests for all business logic
- Use Spring Boot Test for integration tests
- Mock external dependencies appropriately
- Aim for >80% code coverage

```java
@SpringBootTest
class DeviceServiceTest {
    @Test
    void shouldCreateDeviceWithValidData() {
        // Test implementation
    }
}
```

### Frontend Testing

- Use React Testing Library for component tests
- Test user interactions and state changes
- Mock GraphQL queries and mutations
- Write integration tests for complex workflows

```typescript
import { render, screen } from '@testing-library/react';
import { DeviceList } from './DeviceList';

test('renders device list with data', () => {
    render(<DeviceList devices={mockDevices} />);
    expect(screen.getByText('Device 1')).toBeInTheDocument();
});
```

### Integration Testing

- Use Docker Compose for local testing environment
- Test complete user workflows
- Validate API contracts between services
- Test multi-tenant isolation

## 📝 Code Style Guidelines

### Java

- Follow Google Java Style Guide
- Use meaningful variable and method names
- Keep methods focused and small (<30 lines)
- Document public APIs with JavaDoc
- Use Spring Boot conventions

### TypeScript/React

- Follow Airbnb TypeScript Style Guide  
- Use functional components with hooks
- Implement proper error handling
- Use TypeScript strict mode
- Follow React best practices

### Rust

- Follow Rust standard conventions
- Use `cargo fmt` for formatting
- Run `cargo clippy` for linting
- Write comprehensive unit tests
- Document public APIs

### General

- Use clear, descriptive commit messages
- Keep lines under 100 characters
- Remove trailing whitespace
- Use consistent indentation (spaces, not tabs)

## 🔒 Security Guidelines

- Never commit secrets or credentials
- Use environment variables for configuration
- Follow OWASP security guidelines
- Validate all inputs and sanitize outputs
- Use parameterized queries for database operations
- Report security issues privately to security@flamingo.run

## 📚 Documentation

### Code Documentation

- Document all public APIs
- Include usage examples
- Explain complex business logic
- Keep README files updated
- Use clear variable and function names

### Architecture Documentation

- Update architecture diagrams for structural changes
- Document new integrations and dependencies  
- Explain design decisions and trade-offs
- Keep deployment documentation current

## 🐛 Bug Reports

Create detailed bug reports with:

1. **Clear title** describing the issue
2. **Steps to reproduce** the bug
3. **Expected behavior** vs actual behavior
4. **Environment details** (OS, Java version, etc.)
5. **Screenshots/logs** if applicable
6. **Workarounds** if known

Use our [Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for bug reports and discussions.

## 💡 Feature Requests

For new features:

1. **Search existing discussions** to avoid duplicates
2. **Describe the problem** you're trying to solve
3. **Propose a solution** with technical details
4. **Consider alternatives** and explain why your approach is best
5. **Think about breaking changes** and migration paths

## 🔄 Pull Request Process

1. **Update documentation** for any new features
2. **Add/update tests** with good coverage
3. **Ensure CI passes** all checks
4. **Request review** from maintainers
5. **Address feedback** promptly and thoroughly
6. **Squash commits** before merging (if requested)

### Pull Request Template

```markdown
## Summary
Brief description of changes

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
- [ ] No breaking changes (or clearly documented)
```

## 🏷️ Issue Labels

We use these labels to organize issues:

- `bug` - Something isn't working
- `enhancement` - New feature or improvement
- `documentation` - Documentation needs
- `good first issue` - Good for newcomers
- `help wanted` - Community help needed
- `priority:high` - Critical issues
- `priority:low` - Nice to have

## 🎯 Development Tips

### Efficient Development

- Use IDE with good Spring Boot support (IntelliJ IDEA recommended)
- Set up hot reloading for faster feedback
- Use Docker for consistent local environment
- Profile and test performance changes
- Keep dependencies up to date

### Debugging

- Use proper logging levels (DEBUG, INFO, WARN, ERROR)
- Include correlation IDs for distributed tracing
- Use debugger for complex issues
- Test with realistic data volumes
- Monitor memory and CPU usage

### GraphQL Development

- Use GraphQL Playground for API testing
- Follow GraphQL schema design best practices
- Implement proper DataLoaders to avoid N+1 queries
- Use proper error handling and validation
- Document schema changes thoroughly

## 🤝 Community Guidelines

### Communication

- Be respectful and inclusive
- Provide constructive feedback
- Ask questions if something is unclear
- Share knowledge and help others
- Follow our [Code of Conduct](CODE_OF_CONDUCT.md)

### Getting Help

- Join our [Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- Check existing documentation first  
- Provide context when asking questions
- Be patient with responses
- Help others when you can

## 📞 Contact

- **Slack**: [OpenMSP Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Website**: [flamingo.run/openframe](https://www.flamingo.run/openframe)
- **Community**: [openmsp.ai](https://www.openmsp.ai/)
- **Security**: security@flamingo.run

## 📄 License

By contributing to OpenFrame, you agree that your contributions will be licensed under the [Flamingo AI Unified License v1.0](LICENSE.md).

---

Thank you for contributing to OpenFrame! 🎉

<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> team
</div>