# Contributing to OpenFrame

Thank you for your interest in contributing to OpenFrame! This guide will help you get started with contributing to our AI-powered MSP platform.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Process](#contributing-process)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community Support](#community-support)

## 📜 Code of Conduct

We are committed to fostering an open and welcoming environment. By participating in this project, you agree to abide by our community standards:

- **Be respectful** and inclusive of different viewpoints and experiences
- **Be collaborative** and help others learn and grow
- **Be constructive** when providing feedback or criticism
- **Focus on what's best** for the community and the project

Unacceptable behavior includes harassment, discrimination, or any form of offensive conduct. Report issues to the maintainers at community@flamingo.run.

## 🚀 Getting Started

### Ways to Contribute

- **🐛 Report bugs** - Help us identify and fix issues
- **💡 Suggest features** - Share ideas for new functionality
- **📝 Improve documentation** - Enhance guides, examples, and API docs
- **🔧 Submit code** - Fix bugs, add features, or optimize performance
- **🧪 Write tests** - Improve test coverage and quality
- **🎨 UI/UX improvements** - Enhance the user experience
- **🔌 Tool integrations** - Add support for new MSP tools

### Before You Start

1. **Check existing issues** - Look for similar bugs or feature requests
2. **Join our community** - Connect with us on [Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
3. **Read the documentation** - Familiarize yourself with the [Architecture](docs/development/architecture/overview.md)
4. **Start small** - Begin with good first issues labeled `good first issue`

## 💻 Development Setup

### Prerequisites

Ensure you have the following installed:

- **Java**: OpenJDK 21.0.1+ 
- **Node.js**: 18+ with npm
- **Rust**: 1.70+ with Cargo (for client agent development)
- **Docker**: 24.0+ with Docker Compose
- **Git**: 2.42+
- **Maven**: 3.8+ (or use the Maven wrapper)

### Environment Setup

1. **Fork and clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
   cd openframe-oss-tenant
   ```

2. **Set up GitHub authentication** (required for private dependencies):
   ```bash
   export GITHUB_ACTOR=your-github-username
   export GITHUB_TOKEN=your-github-token
   ```

3. **Build the backend**:
   ```bash
   mvn clean install
   ```

4. **Set up the frontend**:
   ```bash
   cd openframe/services/openframe-frontend
   npm install
   npm run dev
   ```

5. **Build the Rust client** (optional):
   ```bash
   cd client
   cargo build --release
   ```

### Running Tests

Always run tests before submitting changes:

```bash
# Backend tests
mvn test

# Frontend tests
cd openframe/services/openframe-frontend
npm test
npm run type-check

# Rust tests
cd client
cargo test
```

For detailed setup instructions, see [Environment Setup](docs/development/setup/environment.md).

## 🔄 Contributing Process

### 1. Issue Discussion

- **For bugs**: Open an issue with a clear description and reproduction steps
- **For features**: Start a discussion to gather feedback before implementation
- **For questions**: Use our [Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) or GitHub Discussions

### 2. Development Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

2. **Make your changes**:
   - Follow our [code standards](#code-standards)
   - Add tests for new functionality
   - Update documentation as needed

3. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

4. **Push and create a Pull Request**:
   ```bash
   git push origin feature/your-feature-name
   ```

### 3. Pull Request Guidelines

**PR Title Format**: Use conventional commits format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `test:` for test improvements
- `refactor:` for code refactoring

**PR Description Must Include**:
- **Summary** of changes made
- **Issue reference** (Fixes #123)
- **Testing** - How you tested the changes
- **Screenshots** (for UI changes)
- **Breaking changes** (if any)

**Example PR Description**:
```markdown
## Summary
Adds support for FleetDM integration in the client service.

## Changes
- Added FleetDM SDK implementation
- Updated client service to handle FleetDM events
- Added integration tests for FleetDM workflows

## Testing
- [x] Unit tests pass
- [x] Integration tests pass
- [x] Manual testing with FleetDM instance

Fixes #456
```

## 📏 Code Standards

### Backend (Java/Spring Boot)

- **Java Version**: OpenJDK 21
- **Code Style**: Follow [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)
- **Naming**: Use descriptive names for classes, methods, and variables
- **Documentation**: Javadoc for public APIs
- **Dependency Injection**: Use Spring's `@Component`, `@Service`, `@Repository` annotations

**Example**:
```java
@Service
@Transactional
@Slf4j
public class DeviceService {
    
    private final DeviceRepository deviceRepository;
    
    public DeviceService(DeviceRepository deviceRepository) {
        this.deviceRepository = deviceRepository;
    }
    
    /**
     * Registers a new device with the specified tenant.
     *
     * @param tenantId the tenant identifier
     * @param deviceDto the device information
     * @return the created device
     */
    public Device registerDevice(String tenantId, DeviceDto deviceDto) {
        log.info("Registering device {} for tenant {}", deviceDto.getName(), tenantId);
        // Implementation
    }
}
```

### Frontend (React/TypeScript)

- **TypeScript**: Strict mode enabled
- **Code Style**: Prettier with ESLint
- **Components**: Functional components with hooks
- **State Management**: Use React hooks and context for state
- **Styling**: Tailwind CSS for styling

**Example**:
```typescript
interface DeviceCardProps {
  device: Device;
  onSelect: (device: Device) => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(device);
  }, [device, onSelect]);

  return (
    <div 
      className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
      onClick={handleClick}
    >
      <h3 className="text-lg font-semibold">{device.name}</h3>
      <p className="text-gray-600">{device.status}</p>
    </div>
  );
};
```

### Rust Client Agent

- **Edition**: Rust 2021
- **Code Style**: Use `rustfmt` and `clippy`
- **Error Handling**: Use `Result<T, E>` pattern
- **Async**: Use Tokio for async operations
- **Documentation**: Rust doc comments for public APIs

**Example**:
```rust
#[derive(Debug, Clone)]
pub struct DeviceAgent {
    config: AgentConfig,
    client: HttpClient,
}

impl DeviceAgent {
    /// Creates a new device agent with the specified configuration.
    pub fn new(config: AgentConfig) -> Result<Self, AgentError> {
        let client = HttpClient::new(&config.server_url)?;
        Ok(Self { config, client })
    }
    
    /// Registers this agent with the OpenFrame server.
    pub async fn register(&self) -> Result<RegistrationResponse, AgentError> {
        let payload = RegistrationPayload {
            hostname: self.get_hostname()?,
            platform: self.get_platform(),
        };
        
        self.client.post("/api/agents/register", &payload).await
    }
}
```

## 🧪 Testing Guidelines

### Testing Strategy

We use a comprehensive testing approach:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions
- **End-to-End Tests**: Test complete user workflows
- **Contract Tests**: Ensure API contracts are maintained

### Test Requirements

**For Backend Changes**:
- Unit tests for new services and components
- Integration tests for database interactions
- API tests for new endpoints

**For Frontend Changes**:
- Component tests using React Testing Library
- Type checking with TypeScript
- Visual regression tests for UI changes

**For Client Agent Changes**:
- Unit tests for core functionality
- Integration tests with mock servers
- Platform-specific tests when applicable

### Test Examples

**Backend Test**:
```java
@SpringBootTest
@Testcontainers
class DeviceServiceTest {
    
    @Container
    static MongoDBContainer mongodb = new MongoDBContainer("mongo:6.0");
    
    @Autowired
    private DeviceService deviceService;
    
    @Test
    void shouldRegisterNewDevice() {
        // Given
        String tenantId = "tenant-123";
        DeviceDto deviceDto = createTestDevice();
        
        // When
        Device result = deviceService.registerDevice(tenantId, deviceDto);
        
        // Then
        assertThat(result)
            .isNotNull()
            .hasFieldOrPropertyWithValue("tenantId", tenantId)
            .hasFieldOrPropertyWithValue("name", deviceDto.getName());
    }
}
```

**Frontend Test**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceCard } from './DeviceCard';

describe('DeviceCard', () => {
  const mockDevice = {
    id: '1',
    name: 'Test Device',
    status: 'online',
  };

  it('should display device information', () => {
    const onSelect = jest.fn();
    
    render(<DeviceCard device={mockDevice} onSelect={onSelect} />);
    
    expect(screen.getByText('Test Device')).toBeInTheDocument();
    expect(screen.getByText('online')).toBeInTheDocument();
  });

  it('should call onSelect when clicked', () => {
    const onSelect = jest.fn();
    
    render(<DeviceCard device={mockDevice} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByText('Test Device'));
    
    expect(onSelect).toHaveBeenCalledWith(mockDevice);
  });
});
```

## 📖 Documentation

### Documentation Updates

When contributing, please update relevant documentation:

- **Code Comments**: Document complex logic and public APIs
- **README Updates**: Update if you change setup or usage
- **API Documentation**: Update GraphQL schema documentation
- **Architecture Docs**: Update for significant architectural changes

### Documentation Standards

- Use clear, concise language
- Include code examples
- Add diagrams for complex concepts using Mermaid
- Link to related documentation

### Writing Style

- Use present tense
- Use active voice when possible
- Keep sentences short and clear
- Include examples and use cases

## 🛟 Community Support

### Getting Help

- **Slack Community**: Join [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **GitHub Discussions**: For design discussions and Q&A
- **Documentation**: Check our [development docs](docs/development/README.md)
- **Stack Overflow**: Tag questions with `openframe`

### Communication Channels

- **#general** - General discussion and announcements
- **#development** - Technical development discussions  
- **#help** - Get help with setup and usage
- **#contributors** - Contributor coordination

### Response Times

- **Bug reports**: We aim to respond within 48 hours
- **Feature requests**: Initial response within 1 week
- **Pull requests**: Review within 3-5 business days
- **Security issues**: Immediate response for critical issues

## 🚨 Security Contributions

For security-related contributions:

1. **Do NOT** open public issues for security vulnerabilities
2. **Email** security@flamingo.run with details
3. **Include** steps to reproduce and potential impact
4. **Wait** for our response before public disclosure

We follow responsible disclosure practices and will credit security researchers.

## 🏆 Recognition

Contributors will be:

- **Listed** in our [contributors page](https://github.com/flamingo-stack/openframe-oss-tenant/graphs/contributors)
- **Featured** in release notes for significant contributions
- **Invited** to contributor channels and events
- **Eligible** for swag and recognition programs

## ❓ Questions?

If you have questions about contributing:

1. Check this guide and our [documentation](docs/README.md)
2. Search existing [GitHub issues](https://github.com/flamingo-stack/openframe-oss-tenant/issues)
3. Ask in our [Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
4. Open a new issue with the `question` label

---

Thank you for contributing to OpenFrame! Together, we're building the future of AI-powered MSP operations. 🚀

---

<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> team
</div>