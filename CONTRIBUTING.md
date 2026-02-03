# Contributing to OpenFrame

We're thrilled that you're interested in contributing to OpenFrame! This guide will help you get started with contributing to the project.

## 🌟 Ways to Contribute

- **Bug Reports**: Help us identify and fix issues
- **Feature Requests**: Suggest new features or improvements
- **Code Contributions**: Submit bug fixes or new features
- **Documentation**: Improve documentation and guides
- **Community Support**: Help other users in our Slack community

## 🚀 Getting Started

### Prerequisites

Before you start contributing, make sure you have the following installed:

- **Java**: OpenJDK 21.0.1+
- **Node.js**: 18+ with npm
- **Rust**: 1.70+ with Cargo
- **Docker**: 24.0+ with Docker Compose
- **Git**: 2.42+

### Development Environment Setup

1. **Fork and Clone the Repository**
   ```bash
   git clone https://github.com/YOUR-USERNAME/openframe-oss-tenant.git
   cd openframe-oss-tenant
   ```

2. **Set up GitHub Authentication**
   ```bash
   export GITHUB_ACTOR=your-github-username
   export GITHUB_TOKEN=your-github-token
   ```

3. **Install Dependencies and Build**
   ```bash
   # Backend services
   mvn clean install
   
   # Frontend
   cd openframe/services/openframe-frontend
   npm install
   
   # Rust client
   cd ../../client
   cargo build
   ```

4. **Start Development Environment**
   ```bash
   # Start infrastructure services
   docker compose -f dev/docker-compose.dev.yml up -d
   
   # Run services in development mode
   ./scripts/run-dev.sh
   ```

For detailed setup instructions, see our [Development Setup Guide](./docs/development/setup/environment.md).

## 🔄 Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Use descriptive branch names:
- `feature/add-user-permissions`
- `fix/memory-leak-in-stream-service`
- `docs/update-api-documentation`

### 2. Make Your Changes

- Follow our [Code Style Guidelines](#code-style-guidelines)
- Write tests for your changes
- Update documentation as needed
- Ensure your changes don't break existing functionality

### 3. Test Your Changes

```bash
# Run backend tests
mvn test

# Run frontend tests
cd openframe/services/openframe-frontend
npm test

# Run Rust tests
cd client
cargo test

# Run integration tests
./scripts/test-integration.sh
```

### 4. Commit Your Changes

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
git commit -m "feat: add user role management API"
git commit -m "fix: resolve memory leak in stream processor"
git commit -m "docs: update GraphQL schema documentation"
```

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request through GitHub with:
- Clear title and description
- Link to any related issues
- Screenshots for UI changes
- Testing instructions

## 📝 Code Style Guidelines

### Java (Backend Services)

- Follow [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)
- Use `@Component`, `@Service`, `@Repository` annotations appropriately
- Implement proper error handling with custom exceptions
- Use constructor injection for dependencies
- Write comprehensive unit tests with JUnit 5

Example:
```java
@Service
@Slf4j
public class UserService {
    
    private final UserRepository userRepository;
    
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    public User createUser(CreateUserRequest request) {
        log.info("Creating user: {}", request.getEmail());
        // Implementation
    }
}
```

### TypeScript/JavaScript (Frontend)

- Use TypeScript for all new code
- Follow [Airbnb TypeScript Style Guide](https://github.com/airbnb/javascript/tree/master/packages/eslint-config-airbnb-typescript)
- Use meaningful variable and function names
- Implement proper error boundaries
- Write tests with Vitest

Example:
```typescript
interface UserProps {
  user: User;
  onUserUpdate: (user: User) => void;
}

export const UserProfile: React.FC<UserProps> = ({ user, onUserUpdate }) => {
  const [loading, setLoading] = useState(false);
  
  const handleUpdate = async (updates: Partial<User>) => {
    setLoading(true);
    try {
      const updatedUser = await updateUser(user.id, updates);
      onUserUpdate(updatedUser);
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    // Component JSX
  );
};
```

### Rust (Client Agent)

- Follow [Rust Style Guide](https://doc.rust-lang.org/style-guide/)
- Use `clippy` for linting
- Implement proper error handling with `Result` types
- Use `tokio` for async operations
- Write comprehensive tests

Example:
```rust
use anyhow::Result;
use tracing::{info, error};

#[derive(Debug, Clone)]
pub struct SystemMetrics {
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub disk_usage: f64,
}

impl SystemMetrics {
    pub async fn collect() -> Result<Self> {
        info!("Collecting system metrics");
        
        let cpu_usage = Self::get_cpu_usage().await?;
        let memory_usage = Self::get_memory_usage().await?;
        let disk_usage = Self::get_disk_usage().await?;
        
        Ok(Self {
            cpu_usage,
            memory_usage,
            disk_usage,
        })
    }
}
```

## 🧪 Testing Guidelines

### Unit Tests

- Write unit tests for all business logic
- Aim for >80% code coverage
- Use meaningful test names that describe the scenario
- Mock external dependencies

### Integration Tests

- Test complete workflows end-to-end
- Use testcontainers for database testing
- Test error scenarios and edge cases

### Frontend Testing

- Write component tests with React Testing Library
- Test user interactions and state changes
- Mock API calls appropriately

## 📚 Documentation Standards

### Code Documentation

- Use JSDoc for TypeScript/JavaScript
- Use Javadoc for Java
- Use Rust doc comments for Rust
- Document public APIs comprehensively

### User Documentation

- Write clear, step-by-step guides
- Include code examples and screenshots
- Test documentation by following it yourself
- Keep documentation up-to-date with code changes

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Environment Information**
   - OpenFrame version
   - Operating system
   - Java/Node.js/Rust versions
   - Browser (for UI bugs)

2. **Steps to Reproduce**
   - Clear, numbered steps
   - Expected vs actual behavior
   - Screenshots or logs

3. **Additional Context**
   - Error messages
   - Configuration details
   - Any workarounds found

## 💡 Feature Requests

For feature requests, please:

1. **Describe the Problem**
   - What problem does this solve?
   - Who would benefit from this feature?

2. **Proposed Solution**
   - How should it work?
   - Any implementation ideas?

3. **Alternatives Considered**
   - What other solutions did you consider?
   - Why is this the best approach?

## 🔍 Code Review Process

### For Contributors

- Ensure your PR passes all CI checks
- Be responsive to feedback
- Make requested changes in a timely manner
- Keep PRs focused and reasonably sized

### For Reviewers

- Be constructive and respectful
- Test the changes locally when possible
- Consider security, performance, and maintainability
- Approve when ready, request changes when needed

## 🏘️ Community Guidelines

### Communication

- **Primary Channel**: All discussions happen on our [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **No GitHub Issues**: We don't use GitHub Issues or Discussions
- **Be Respectful**: Treat everyone with kindness and respect
- **Be Patient**: Remember that everyone is volunteering their time

### Getting Help

- Join our [OpenMSP Slack community](https://www.openmsp.ai/)
- Ask questions in the appropriate channels
- Search previous conversations before asking
- Provide context when asking for help

## 🏆 Recognition

Contributors are recognized in:

- GitHub contributors list
- Release notes for significant contributions
- Community highlights in Slack
- Special mentions in blog posts

## 📄 License

By contributing to OpenFrame, you agree that your contributions will be licensed under the [Flamingo AI Unified License v1.0](LICENSE.md).

## ❓ Questions?

Have questions about contributing? Join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) and ask in the `#development` channel.

---

Thank you for contributing to OpenFrame! Together, we're building the future of open-source MSP platforms. 🚀