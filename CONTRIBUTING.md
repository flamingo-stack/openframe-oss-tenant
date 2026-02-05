# Contributing to OpenFrame OSS Tenant

Thank you for considering contributing to OpenFrame! This guide will help you get started with contributing to our open-source MSP platform.

## 🤝 Welcome Contributors

OpenFrame thrives on community contributions. Whether you're fixing bugs, adding features, improving documentation, or helping other users, we appreciate your involvement.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Contribution Workflow](#contribution-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Community Guidelines](#community-guidelines)
- [Support & Questions](#support--questions)

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Java 21** (OpenJDK 21.0.1+)
- **Node.js 20+** with npm
- **Rust 1.70+** (for client development)
- **Docker 24.0+** with Docker Compose
- **Maven 3.9+**
- **Git 2.42+**

### First-Time Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/openframe-oss-tenant.git
   cd openframe-oss-tenant
   ```

3. **Set up GitHub authentication** (required for `openframe-oss-lib` dependency):
   ```bash
   export GITHUB_ACTOR=your-github-username
   export GITHUB_TOKEN=your-personal-access-token
   ```

4. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git
   ```

5. **Build and verify** everything works:
   ```bash
   mvn clean install
   ./scripts/run-tests.sh
   ```

## 🛠️ Development Environment

### IDE Setup

#### IntelliJ IDEA (Recommended for Java)
- Install **Spring Boot**, **GraphQL**, and **Docker** plugins
- Configure **Java 21** as project SDK  
- Enable **Maven auto-import**
- Set up **code style** from `.editorconfig`

#### VS Code (Frontend & General)
- Install extensions: **TypeScript**, **Tailwind CSS IntelliSense**, **Docker**, **REST Client**
- Configure workspace settings for consistent formatting

### Repository Structure

Understanding the codebase organization:

```text
openframe-oss-tenant/
├── openframe-oss-lib/              # 🏗️ Reusable core libraries
│   ├── openframe-api-service-core  # GraphQL/REST API core
│   ├── openframe-data-mongo        # MongoDB data layer  
│   ├── openframe-gateway-service-core # API Gateway core
│   ├── openframe-security-core     # JWT/OAuth security
│   └── ...                         # Other core modules
├── openframe/services/             # 🚀 Deployable applications
│   ├── openframe-api/              # Main API service
│   ├── openframe-gateway/          # API Gateway service
│   ├── openframe-frontend/         # Next.js frontend
│   └── ...                         # Other services
├── clients/                        # 📱 Client applications
│   ├── openframe-chat/             # AI chat client
│   └── openframe-client/           # System agent (Rust)
├── scripts/                        # ⚙️ Development scripts
└── docs/                          # 📖 Documentation
```

### Local Development

Start the development environment:

```bash
# Start backend services
docker-compose up -d

# Start frontend development server
cd openframe/services/openframe-frontend
npm run dev

# Build Rust client (if needed)
cd clients/openframe-client
cargo build --release
```

## 🔄 Contribution Workflow

### 1. Choose Your Contribution

**Good First Issues:**
- Documentation improvements
- Bug fixes with clear reproduction steps  
- Code style and formatting improvements
- Test coverage improvements
- Small feature enhancements

**Advanced Contributions:**
- New microservices or major features
- Performance optimizations
- Security enhancements
- Architecture improvements

### 2. Create a Feature Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/short-description
# or
git checkout -b bugfix/issue-number-description
# or  
git checkout -b docs/topic-improvement
```

### 3. Make Your Changes

Follow our [Code Standards](#code-standards) and ensure:

- ✅ Code compiles without warnings
- ✅ All tests pass locally
- ✅ New features include tests
- ✅ Documentation is updated
- ✅ Commit messages follow conventions

### 4. Test Your Changes

```bash
# Run all tests
mvn test

# Run integration tests
mvn verify

# Frontend tests
cd openframe/services/openframe-frontend
npm test

# Rust tests
cd clients/openframe-client  
cargo test
```

### 5. Submit Pull Request

1. **Push your branch** to your fork
2. **Create Pull Request** against the `main` branch
3. **Fill out PR template** completely
4. **Request review** from appropriate maintainers
5. **Address feedback** and update as needed

## 📝 Code Standards

### Java Code Style

Follow **Spring Boot best practices**:

```java
// ✅ Good: Clear naming, proper annotations
@RestController
@RequestMapping("/api/v1/devices")
@RequiredArgsConstructor
@Slf4j
public class DeviceController {
    
    private final DeviceService deviceService;
    
    @GetMapping("/{deviceId}")
    public ResponseEntity<DeviceDto> getDevice(@PathVariable String deviceId) {
        log.debug("Fetching device with ID: {}", deviceId);
        DeviceDto device = deviceService.findById(deviceId);
        return ResponseEntity.ok(device);
    }
}
```

**Java Guidelines:**
- Use **Lombok** judiciously (avoid `@Data`, prefer `@Value`/`@Builder`)
- Follow **Spring Boot** naming conventions
- Use **SLF4J** for logging with appropriate levels
- Implement proper **error handling** with custom exceptions
- Write **comprehensive JavaDoc** for public APIs

### TypeScript/JavaScript Code Style

Follow **modern TypeScript** practices:

```typescript
// ✅ Good: Type safety, clear interfaces  
interface DeviceListProps {
  devices: Device[];
  onDeviceSelect: (device: Device) => void;
  loading?: boolean;
}

export const DeviceList: React.FC<DeviceListProps> = ({ 
  devices, 
  onDeviceSelect, 
  loading = false 
}) => {
  return (
    <div className="device-list">
      {loading ? (
        <LoadingSpinner />
      ) : (
        devices.map(device => (
          <DeviceCard 
            key={device.id}
            device={device}
            onClick={() => onDeviceSelect(device)}
          />
        ))
      )}
    </div>
  );
};
```

**Frontend Guidelines:**
- Use **strict TypeScript** configuration
- Follow **React Hooks** patterns and best practices
- Implement **proper error boundaries**
- Use **Tailwind CSS** for styling consistency
- Write **accessible** components (WCAG 2.1)

### Rust Code Style

Follow **Rust idioms** and conventions:

```rust
// ✅ Good: Proper error handling, clear types
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub id: String,
    pub hostname: String,
    pub platform: String,
    pub last_seen: chrono::DateTime<chrono::Utc>,
}

impl DeviceInfo {
    pub fn new(hostname: String, platform: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            hostname,
            platform,
            last_seen: chrono::Utc::now(),
        }
    }
    
    pub async fn collect_system_info() -> Result<DeviceInfo> {
        let hostname = sys_info::hostname()
            .context("Failed to get system hostname")?;
        let platform = std::env::consts::OS.to_string();
        
        Ok(DeviceInfo::new(hostname, platform))
    }
}
```

**Rust Guidelines:**
- Use `anyhow` for **error handling** in applications
- Implement `thiserror` for **library errors**
- Follow **async/await** patterns with Tokio
- Use **proper lifetime annotations** when needed
- Write **comprehensive documentation** with examples

### Git Commit Standards

Use **Conventional Commits** format:

```text
feat: add device registration endpoint
fix: resolve JWT token expiration issue  
docs: update API documentation for GraphQL schema
test: add integration tests for user service
refactor: simplify authentication middleware
perf: optimize database queries in device service
style: fix code formatting in gateway module
chore: update dependencies to latest versions
```

**Commit Guidelines:**
- Use **present tense** ("add feature" not "added feature")
- Keep **first line under 72 characters**
- Include **detailed description** for complex changes
- Reference **issue numbers** when applicable (`fixes #123`)

## 🧪 Testing Requirements

### Test Coverage Standards

Maintain **minimum 80% code coverage** across all components:

- **Unit Tests**: Test individual methods and classes in isolation
- **Integration Tests**: Test service interactions and API endpoints  
- **End-to-End Tests**: Test complete user workflows and critical paths
- **Performance Tests**: Validate response times and throughput

### Writing Effective Tests

#### Java Unit Tests (JUnit 5 + Mockito)

```java
@ExtendWith(MockitoExtension.class)
class DeviceServiceTest {
    
    @Mock
    private DeviceRepository deviceRepository;
    
    @InjectMocks
    private DeviceServiceImpl deviceService;
    
    @Test
    @DisplayName("Should return device when found by ID")
    void shouldReturnDeviceWhenFoundById() {
        // Given
        String deviceId = "device-123";
        Device mockDevice = Device.builder()
            .id(deviceId)
            .hostname("test-device")
            .build();
        when(deviceRepository.findById(deviceId))
            .thenReturn(Optional.of(mockDevice));
        
        // When
        Optional<Device> result = deviceService.findById(deviceId);
        
        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getHostname()).isEqualTo("test-device");
        verify(deviceRepository).findById(deviceId);
    }
}
```

#### Frontend Tests (Jest + React Testing Library)

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceList } from './DeviceList';

describe('DeviceList', () => {
  const mockDevices = [
    { id: '1', hostname: 'device-1', status: 'online' },
    { id: '2', hostname: 'device-2', status: 'offline' }
  ];

  it('should call onDeviceSelect when device is clicked', () => {
    const mockOnSelect = jest.fn();
    
    render(
      <DeviceList devices={mockDevices} onDeviceSelect={mockOnSelect} />
    );
    
    fireEvent.click(screen.getByText('device-1'));
    
    expect(mockOnSelect).toHaveBeenCalledWith(mockDevices[0]);
  });
});
```

#### Integration Tests (Spring Boot Test + Testcontainers)

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class DeviceControllerIntegrationTest {
    
    @Container
    static MongoDBContainer mongoContainer = new MongoDBContainer("mongo:7.0");
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    void shouldCreateAndRetrieveDevice() {
        // Given
        CreateDeviceRequest request = CreateDeviceRequest.builder()
            .hostname("test-device")
            .platform("linux")
            .build();
        
        // When - Create device
        ResponseEntity<DeviceDto> createResponse = restTemplate.postForEntity(
            "/api/v1/devices", 
            request, 
            DeviceDto.class
        );
        
        // Then - Verify creation
        assertThat(createResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String deviceId = createResponse.getBody().getId();
        
        // When - Retrieve device  
        ResponseEntity<DeviceDto> getResponse = restTemplate.getForEntity(
            "/api/v1/devices/" + deviceId, 
            DeviceDto.class
        );
        
        // Then - Verify retrieval
        assertThat(getResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(getResponse.getBody().getHostname()).isEqualTo("test-device");
    }
}
```

## 📖 Documentation

### Documentation Standards

**All contributions must include appropriate documentation:**

- **API Changes**: Update OpenAPI/GraphQL schema documentation
- **New Features**: Add usage examples and configuration guides
- **Architecture Changes**: Update architecture diagrams and design docs  
- **Code Changes**: Update inline code documentation and README files

### Writing Style Guide

- Use **clear, concise language**
- Include **practical examples** with real code
- Provide **step-by-step instructions** for complex procedures  
- Use **active voice** ("Configure the service" not "The service should be configured")
- Include **troubleshooting sections** for common issues

### Documentation Types

| Type | Purpose | Examples |
|------|---------|----------|
| **API Docs** | Technical reference | GraphQL schema, REST endpoints |
| **User Guides** | Step-by-step instructions | Installation, configuration |
| **Architecture** | Design and structure | System diagrams, data flow |
| **Development** | Contributing and setup | Environment setup, testing |

## 🌟 Community Guidelines

### Code of Conduct

We follow a simple principle: **Be respectful, helpful, and collaborative.**

**Expected Behavior:**
- ✅ **Be respectful** to all community members regardless of background
- ✅ **Be constructive** in feedback and code reviews
- ✅ **Be patient** with newcomers and those learning
- ✅ **Be open** to different perspectives and approaches
- ✅ **Be helpful** by sharing knowledge and assisting others

**Unacceptable Behavior:**
- ❌ Personal attacks, harassment, or discriminatory language
- ❌ Spam, trolling, or deliberately disruptive behavior  
- ❌ Publishing private information without consent
- ❌ Any conduct that creates an unwelcoming environment

### Code Review Process

**For Contributors:**
- Respond to feedback **within 3 business days**
- Be **open to suggestions** and willing to make changes
- Explain **complex decisions** and architectural choices
- **Test thoroughly** before marking as ready for review

**For Reviewers:**
- Provide **constructive, actionable feedback**
- Focus on **code quality, security, and maintainability**
- **Approve quickly** for minor changes and documentation updates
- **Suggest improvements** rather than just pointing out problems

### Recognition

We recognize contributions through:

- **Contributor listings** in project documentation
- **GitHub contribution graphs** and statistics
- **Community shout-outs** in Slack and release notes
- **Maintainer invitations** for consistent, quality contributors

## 🆘 Support & Questions

### Getting Help

1. **Search Documentation**: Check existing docs and FAQs first
2. **OpenMSP Slack**: Join [#openframe-dev](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for technical questions
3. **Code Reviews**: Learn from pull request discussions and feedback
4. **Office Hours**: Join weekly community calls for live Q&A

### Reporting Issues

**For Bugs:**
- Provide **minimal reproduction steps**
- Include **environment details** (Java version, OS, etc.)
- Share **relevant logs** and error messages
- Test against **latest main branch** when possible

**For Feature Requests:**
- Describe the **business use case** and user value
- Provide **detailed specifications** and acceptance criteria
- Consider **alternative solutions** and trade-offs
- Discuss in **Slack community** before implementing large features

### Community Resources

- **OpenMSP Slack**: [Join Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Website**: [flamingo.run](https://flamingo.run)
- **Knowledge Base**: [flamingo.run/knowledge-base](https://www.flamingo.run/knowledge-base)
- **LinkedIn**: [OpenFrame LinkedIn](https://www.linkedin.com/showcase/openframemsp/about/)

> **Note**: We don't use GitHub Issues or Discussions. All support, feature requests, and community discussions happen in our OpenMSP Slack workspace.

## 🎯 Next Steps

Ready to contribute? Here's your recommended path:

1. **Join the Community**: Connect with us on [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
2. **Set Up Environment**: Follow the [Development Setup Guide](./docs/development/setup/environment.md)
3. **Choose an Issue**: Look for "good first issue" labels or ask in Slack
4. **Make Your Contribution**: Follow this guide and submit your first PR
5. **Stay Engaged**: Participate in code reviews and community discussions

Thank you for contributing to OpenFrame! Together, we're building the future of open-source MSP platforms. 🚀

---

**Questions?** Join the [OpenMSP Slack Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) - we're here to help!