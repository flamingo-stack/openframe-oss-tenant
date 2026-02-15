# Contributing to OpenFrame OSS Tenant

Welcome! We're excited that you want to contribute to OpenFrame. This guide will help you get started with contributing to the OpenFrame OSS Tenant repository.

## 🌟 Ways to Contribute

- 🐛 **Bug Reports** - Help us identify and fix issues
- ✨ **Feature Requests** - Suggest new capabilities
- 🔧 **Code Contributions** - Submit bug fixes and new features
- 📖 **Documentation** - Improve guides, API docs, and examples
- 🧪 **Testing** - Write tests and help with QA
- 💬 **Community Support** - Help other users in discussions

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Java**: OpenJDK 21.0.1+
- **Node.js**: 18+ with npm
- **Docker**: 24.0+ with Docker Compose
- **Git**: 2.42+
- **GitHub Account** with access to GitHub Packages

### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
   cd openframe-oss-tenant
   ```

3. **Set up authentication** for GitHub Packages:
   ```bash
   export GITHUB_ACTOR=your-github-username
   export GITHUB_TOKEN=your-github-token
   ```

4. **Build the project**:
   ```bash
   mvn clean install
   ```

5. **Start development servers**:
   ```bash
   # Frontend
   cd openframe/services/openframe-frontend
   npm install && npm run dev
   
   # Chat Client
   cd ../../clients/openframe-chat
   npm install && npm run tauri dev
   ```

For detailed setup instructions, see our [Development Setup Guide](./docs/development/setup/environment.md).

## 🔄 Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b bugfix/issue-description
```

### 2. Make Your Changes

- Write clean, well-documented code
- Follow existing code style and conventions
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes

```bash
# Run Java tests
mvn test

# Run frontend tests
cd openframe/services/openframe-frontend
npm run type-check

# Run Rust tests (if applicable)
cd clients/openframe-chat
cargo test
```

### 4. Commit Your Changes

Use clear, descriptive commit messages following conventional commits:

```bash
git add .
git commit -m "feat: add new dashboard widget for system metrics"
# or
git commit -m "fix: resolve authentication timeout issue"
# or
git commit -m "docs: update API documentation for devices endpoint"
```

**Commit Types:**
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear title and description
- Reference to related issues
- Screenshots/recordings for UI changes
- List of changes made

## 📝 Code Guidelines

### Java (Backend Services)

- Follow **Spring Boot** best practices
- Use **dependency injection** properly
- Write **unit and integration tests**
- Document public APIs with **Javadoc**
- Follow **Google Java Style Guide**

Example:
```java
@Service
@RequiredArgsConstructor
public class DeviceService {
    
    private final DeviceRepository deviceRepository;
    
    /**
     * Retrieves a device by its unique identifier.
     *
     * @param deviceId the unique device identifier
     * @return the device if found
     * @throws DeviceNotFoundException if device doesn't exist
     */
    public Device getDeviceById(String deviceId) {
        return deviceRepository.findById(deviceId)
            .orElseThrow(() -> new DeviceNotFoundException(deviceId));
    }
}
```

### TypeScript/React (Frontend)

- Use **TypeScript** for all code
- Follow **React Hooks** patterns
- Write **component tests** with Jest/Testing Library
- Use **ESLint** and **Prettier** for formatting
- Document complex components with JSDoc

Example:
```typescript
interface DeviceCardProps {
  device: Device;
  onEdit: (device: Device) => void;
}

/**
 * Displays device information in a card format
 */
export const DeviceCard: React.FC<DeviceCardProps> = ({ device, onEdit }) => {
  const handleEditClick = useCallback(() => {
    onEdit(device);
  }, [device, onEdit]);

  return (
    <Card>
      <CardHeader>
        <h3>{device.name}</h3>
      </CardHeader>
      <CardContent>
        <p>Status: {device.status}</p>
        <Button onClick={handleEditClick}>Edit</Button>
      </CardContent>
    </Card>
  );
};
```

### Rust (Chat Client)

- Follow **Rust best practices**
- Use **async/await** for asynchronous operations
- Write **unit tests** with `#[cfg(test)]`
- Document public APIs with `///` comments
- Use **clippy** for linting

Example:
```rust
/// Manages authentication tokens for the chat client
pub struct TokenService {
    token: Arc<RwLock<Option<String>>>,
}

impl TokenService {
    /// Creates a new TokenService instance
    pub fn new() -> Self {
        Self {
            token: Arc::new(RwLock::new(None)),
        }
    }
    
    /// Sets the authentication token
    pub async fn set_token(&self, token: String) -> Result<(), TokenError> {
        let mut guard = self.token.write().await;
        *guard = Some(token);
        Ok(())
    }
}
```

## 🧪 Testing

### Backend Testing

```bash
# Run all tests
mvn test

# Run specific service tests
mvn test -pl openframe/services/openframe-api

# Run with coverage
mvn test jacoco:report
```

### Frontend Testing

```bash
cd openframe/services/openframe-frontend

# Run unit tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

### Integration Testing

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
mvn verify -Pintegration-test
```

## 📖 Documentation

### API Documentation

- Document all REST endpoints with **OpenAPI/Swagger**
- Document GraphQL schema with descriptions
- Include request/response examples

### Code Documentation

- Use **Javadoc** for Java classes and methods
- Use **JSDoc** for TypeScript functions and components  
- Use **Rust doc comments** (`///`) for public APIs
- Write **README files** for complex modules

### User Documentation

- Update relevant guides in `docs/` directory
- Include screenshots for UI changes
- Provide examples and use cases

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Clear title** describing the issue
2. **Steps to reproduce** the problem
3. **Expected behavior** vs **actual behavior**
4. **Environment details**:
   - OS and version
   - Java version
   - Node.js version
   - Browser (for UI issues)
5. **Logs and error messages**
6. **Screenshots/recordings** if applicable

Use our bug report template when creating issues.

## 💡 Feature Requests

When suggesting features:

1. **Describe the problem** the feature would solve
2. **Explain the proposed solution**
3. **Consider alternatives** you've thought of
4. **Provide use cases** and examples
5. **Consider impact** on existing functionality

## 🏷️ Issue Labels

We use these labels to organize issues:

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Documentation needs
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention needed
- `priority:high` - High priority issues
- `service:api` - API service related
- `service:frontend` - Frontend related
- `service:gateway` - Gateway service related

## 👥 Community

### Communication Channels

- **OpenMSP Slack Community**: [Join here](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **GitHub Discussions**: For questions and community discussions
- **GitHub Issues**: For bug reports and feature requests

### Code of Conduct

We follow a Code of Conduct to ensure a welcoming community:

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## 🔍 Review Process

### Pull Request Review

1. **Automated checks** must pass (tests, linting, etc.)
2. **Code review** by at least one maintainer
3. **Documentation review** if docs are changed
4. **Security review** for sensitive changes

### Review Criteria

- Code quality and style
- Test coverage
- Documentation completeness
- Performance impact
- Security considerations
- Backward compatibility

## 🎉 Recognition

Contributors will be:

- **Added to contributors list** in README
- **Credited in release notes** for significant contributions
- **Invited to join** the maintainers team for consistent contributors

## ❓ Getting Help

If you need help:

1. **Check existing documentation** in `docs/`
2. **Search existing issues** on GitHub
3. **Ask in our Slack community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
4. **Create a GitHub Discussion** for general questions
5. **Open an issue** for specific problems

## 📞 Contact

- **General Questions**: [OpenMSP Slack Community](https://www.openmsp.ai/)
- **Security Issues**: security@flamingo.run
- **Business Inquiries**: [Flamingo Contact](https://www.flamingo.run/contact)

---

Thank you for contributing to OpenFrame! Your contributions make the platform better for everyone. 🚀

---
<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> team
</div>