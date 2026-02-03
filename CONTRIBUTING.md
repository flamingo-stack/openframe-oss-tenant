# Contributing to OpenFrame

Thank you for your interest in contributing to OpenFrame! This guide will help you get started with contributing to our open-source MSP platform.

## 🌟 Ways to Contribute

There are many ways to contribute to OpenFrame:

- **Code Contributions**: Bug fixes, new features, performance improvements
- **Documentation**: API docs, tutorials, guides, and examples
- **Testing**: Writing tests, reporting bugs, improving test coverage
- **Community Support**: Helping other users in our Slack community
- **Feedback**: Sharing ideas, suggestions, and use cases

## 📋 Before You Start

### Join Our Community

We use Slack for all community discussions and support:

**🚨 IMPORTANT:** We don't use GitHub Issues or GitHub Discussions. All community interaction happens on our **OpenMSP Slack community**.

- **Join Slack**: [OpenMSP Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Community Hub**: [openmsp.ai](https://www.openmsp.ai/)

### Read the Documentation

Before contributing, please familiarize yourself with:
- [Getting Started Guide](docs/getting-started/introduction.md)
- [Architecture Overview](docs/development/architecture/overview.md)
- [Development Setup](docs/development/setup/environment.md)

## 🛠️ Development Setup

### Prerequisites

Ensure you have the required tools installed:

- **Java**: OpenJDK 21.0.1+ 
- **Maven**: 3.9+
- **Node.js**: 18+ with npm
- **Docker**: 24.0+ with Docker Compose
- **Git**: 2.42+
- **Rust**: 1.70+ (for client agent development)

### Environment Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
   cd openframe-oss-tenant
   ```

3. **Set up GitHub authentication** (required for `openframe-oss-lib` dependency):
   ```bash
   export GITHUB_ACTOR=your-github-username
   export GITHUB_TOKEN=your-github-token
   ```

4. **Start infrastructure services**:
   ```bash
   cd integrated-tools
   docker-compose up -d mongodb redis kafka nats
   cd ..
   ```

5. **Build the project**:
   ```bash
   mvn clean install
   ```

6. **Set up frontend**:
   ```bash
   cd openframe/services/openframe-frontend
   npm install
   cd ../../..
   ```

For detailed setup instructions, see our [Development Environment Setup Guide](docs/development/setup/environment.md).

## 📝 Code Style and Standards

### Java Code Style

We follow Spring Boot and Java best practices:

```java
// Use meaningful variable names and proper formatting
@Service
public class DeviceManagementService {
    
    private static final Logger logger = LoggerFactory.getLogger(DeviceManagementService.class);
    
    private final DeviceRepository deviceRepository;
    
    public DeviceManagementService(DeviceRepository deviceRepository) {
        this.deviceRepository = deviceRepository;
    }
    
    public Device findById(String deviceId) {
        logger.debug("Finding device by ID: {}", deviceId);
        return deviceRepository.findById(deviceId)
            .orElseThrow(() -> new DeviceNotFoundException("Device not found: " + deviceId));
    }
}
```

**Key Guidelines**:
- Use 4 spaces for indentation
- Line length: 120 characters maximum
- Use descriptive variable and method names
- Include proper logging and error handling
- Add JavaDoc for public APIs

### TypeScript/JavaScript Code Style

For frontend development:

```typescript
// Use TypeScript interfaces for type safety
interface DeviceListProps {
  organizationId: string;
  filters?: DeviceFilters;
  onSelectionChange?: (devices: Device[]) => void;
}

// Use meaningful component names and proper structure  
export const DeviceList: React.FC<DeviceListProps> = ({
  organizationId,
  filters,
  onSelectionChange
}) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Implementation...
};
```

**Key Guidelines**:
- Use 2 spaces for indentation
- Prefer TypeScript over JavaScript
- Use meaningful component and variable names
- Follow React hooks best practices
- Include proper error boundaries

### Rust Code Style

For client agent development:

```rust
// Use idiomatic Rust patterns
use tokio::time::{sleep, Duration};
use tracing::{info, error};

#[derive(Debug, Clone)]
pub struct DeviceAgent {
    device_id: String,
    config: AgentConfig,
}

impl DeviceAgent {
    pub fn new(device_id: String, config: AgentConfig) -> Self {
        Self { device_id, config }
    }
    
    pub async fn start(&self) -> Result<(), AgentError> {
        info!("Starting device agent for: {}", self.device_id);
        
        loop {
            if let Err(e) = self.collect_metrics().await {
                error!("Failed to collect metrics: {}", e);
            }
            
            sleep(Duration::from_secs(self.config.collection_interval)).await;
        }
    }
}
```

**Key Guidelines**:
- Follow standard `rustfmt` formatting
- Use `clippy` for linting
- Prefer `async/await` for I/O operations
- Include proper error handling with `Result<T, E>`
- Use structured logging with `tracing`

## 🧪 Testing Requirements

### Backend Testing

Write comprehensive tests for Java services:

```java
@SpringBootTest
@Testcontainers
class DeviceManagementServiceTest {
    
    @Container
    static MongoDBContainer mongodb = new MongoDBContainer("mongo:7.0");
    
    @Autowired
    private DeviceManagementService deviceService;
    
    @Test
    void shouldFindDeviceById() {
        // Given
        String deviceId = "device-123";
        Device device = createTestDevice(deviceId);
        deviceService.save(device);
        
        // When
        Device found = deviceService.findById(deviceId);
        
        // Then
        assertThat(found).isNotNull();
        assertThat(found.getId()).isEqualTo(deviceId);
    }
    
    @Test
    void shouldThrowExceptionForNonExistentDevice() {
        // When & Then
        assertThatThrownBy(() -> deviceService.findById("non-existent"))
            .isInstanceOf(DeviceNotFoundException.class);
    }
}
```

### Frontend Testing

Write unit and integration tests for components:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeviceList } from './DeviceList';

describe('DeviceList', () => {
  it('should render device list correctly', async () => {
    // Given
    const mockDevices = [
      { id: 'device-1', name: 'Test Device 1', status: 'online' },
      { id: 'device-2', name: 'Test Device 2', status: 'offline' }
    ];
    
    // When
    render(
      <DeviceList 
        organizationId="org-1" 
        devices={mockDevices}
      />
    );
    
    // Then
    await waitFor(() => {
      expect(screen.getByText('Test Device 1')).toBeInTheDocument();
      expect(screen.getByText('Test Device 2')).toBeInTheDocument();
    });
  });
});
```

### Running Tests

```bash
# Backend tests
mvn test

# Frontend tests  
cd openframe/services/openframe-frontend
npm run test

# Rust tests
cd client
cargo test
```

## 🔄 Pull Request Process

### 1. Create a Feature Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

### 2. Make Your Changes

- Write clean, well-documented code
- Include tests for new functionality
- Update documentation as needed
- Follow the established code style

### 3. Test Your Changes

```bash
# Run all tests
mvn test
cd openframe/services/openframe-frontend && npm run test
cd client && cargo test
```

### 4. Commit Your Changes

Use conventional commit messages:

```bash
# Feature commits
git commit -m "feat: add device status monitoring dashboard"

# Bug fix commits  
git commit -m "fix: resolve authentication token expiration issue"

# Documentation commits
git commit -m "docs: update API documentation for device endpoints"
```

**Commit Message Format**:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

### 5. Push and Create Pull Request

```bash
# Push your branch
git push origin feature/your-feature-name
```

Create a pull request with:
- **Clear title** describing the change
- **Detailed description** of what was changed and why
- **Test instructions** for reviewers
- **Screenshots** for UI changes
- **Breaking changes** clearly marked

### 6. Code Review Process

- All PRs require at least one review from a maintainer
- Address feedback promptly and professionally
- Keep discussions focused and constructive
- Update your PR based on review feedback

## 🐛 Reporting Bugs

**🚨 IMPORTANT:** Don't use GitHub Issues. Report bugs in our **Slack community**.

When reporting bugs:

1. **Join our [Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)**
2. **Use the `#bug-reports` channel**
3. **Provide detailed information**:
   - OpenFrame version
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior
   - Error logs/screenshots
   - Environment details (dev/staging/prod)

## 💡 Suggesting Features

Feature requests should be discussed in our **Slack community** before implementation:

1. **Join the conversation** in `#feature-requests`
2. **Describe the use case** and business value
3. **Discuss technical approach** with maintainers
4. **Create a design document** for complex features
5. **Get consensus** before starting implementation

## 📖 Documentation Contributions

Documentation is crucial for our community:

### Types of Documentation

- **API Documentation**: GraphQL schema, REST endpoints
- **User Guides**: Setup, configuration, usage instructions  
- **Developer Guides**: Architecture, contributing, testing
- **Examples**: Sample code, tutorials, use cases

### Writing Guidelines

- Use clear, concise language
- Include code examples where helpful
- Test all instructions before submitting
- Follow the existing documentation structure
- Update related documentation when making changes

## 🏷️ Release Process

OpenFrame follows semantic versioning (SemVer):

- **Major** (X.0.0): Breaking changes
- **Minor** (X.Y.0): New features, backward compatible
- **Patch** (X.Y.Z): Bug fixes, backward compatible

Releases are managed by maintainers and include:
- Change log with all notable changes
- Migration guides for breaking changes
- Updated documentation
- Docker images and binaries

## 👥 Community Guidelines

### Be Respectful
- Treat everyone with respect and professionalism
- Welcome newcomers and help them get started
- Be patient with questions and different skill levels
- Provide constructive feedback

### Be Collaborative  
- Share knowledge and learn from others
- Give credit where it's due
- Ask for help when you need it
- Offer help when you can provide it

### Be Professional
- Keep discussions relevant and on-topic
- Use appropriate language
- Respect different opinions and approaches
- Focus on technical merit in discussions

## ❓ Getting Help

If you need help with contributing:

1. **Check existing documentation** first
2. **Search Slack history** for similar questions
3. **Ask in the appropriate Slack channel**:
   - `#general` - General questions
   - `#development` - Technical development questions
   - `#documentation` - Documentation-related questions
   - `#bug-reports` - Bug reports and issues

## 🎯 Areas Where We Need Help

We especially welcome contributions in these areas:

### High Priority
- **Documentation improvements** and tutorials
- **Test coverage** increases
- **Performance optimizations**
- **Security enhancements**
- **Accessibility improvements**

### Feature Development
- **New integrations** with MSP tools
- **AI/ML feature** enhancements
- **Mobile companion** app development
- **Edge computing** capabilities
- **Advanced analytics** features

### Infrastructure
- **CI/CD pipeline** improvements
- **Docker/Kubernetes** optimizations
- **Monitoring and observability** enhancements
- **Development tooling** improvements

## 📞 Contact

- **Slack Community**: [OpenMSP](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Website**: [flamingo.run](https://www.flamingo.run)
- **Community Hub**: [openmsp.ai](https://www.openmsp.ai/)

## 📜 License

By contributing to OpenFrame, you agree that your contributions will be licensed under the [Flamingo AI Unified License v1.0](LICENSE.md).

---

Thank you for contributing to OpenFrame! Together, we're building the future of open-source MSP platforms. 🚀