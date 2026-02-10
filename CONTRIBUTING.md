# Contributing to OpenFrame OSS Tenant

First off, thanks for taking the time to contribute! 🎉

OpenFrame OSS Tenant is the open-source assembly layer that powers the unified MSP platform. Whether you're fixing bugs, adding features, improving documentation, or helping with community support, your contributions are welcome.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Style Guidelines](#style-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## 🤝 Code of Conduct

This project and everyone participating in it is governed by our commitment to creating a welcoming, inclusive environment. By participating, you are expected to uphold this standard.

### Our Standards

**Examples of behavior that contributes to a positive environment:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Examples of unacceptable behavior:**
- The use of sexualized language or imagery and unwelcome sexual attention
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information without explicit permission
- Other conduct which could reasonably be considered inappropriate in a professional setting

## 🛠️ How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When you create a bug report, include:

**Bug Report Template:**
```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Environment**
- OS: [e.g. Ubuntu 22.04]
- Java Version: [e.g. OpenJDK 21.0.1]
- Node.js Version: [e.g. 18.17.0]
- Browser [e.g. Chrome 118]

**Additional context**
Add any other context about the problem here.
```

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

**Feature Request Template:**
```markdown
**Is your feature request related to a problem?**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

### Contributing Code

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Add tests** (if applicable)
5. **Submit a pull request**

### Contributing Documentation

- Fix typos, clarify explanations, add examples
- Create tutorials and guides
- Improve API documentation
- Translate documentation (coming soon)

## 🚀 Getting Started

### Prerequisites

Ensure your development environment meets these requirements:

- **Java:** OpenJDK 21.0.1+
- **Maven:** 3.9+
- **Node.js:** 18+ with npm
- **Rust:** 1.70+ with Cargo
- **Docker:** 24.0+ with Docker Compose
- **Git:** 2.42+

### Environment Setup

1. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
   cd openframe-oss-tenant
   ```

2. **Set up authentication:**
   ```bash
   export GITHUB_ACTOR=your_github_username
   export GITHUB_TOKEN=your_github_token
   ```

3. **Install dependencies:**
   ```bash
   # Java dependencies
   mvn clean install

   # Frontend dependencies
   cd openframe/services/openframe-frontend
   npm install
   cd -

   # Rust dependencies  
   cd clients/openframe-client
   cargo build
   cd -
   ```

4. **Start development services:**
   ```bash
   # Start infrastructure (MongoDB, Redis, Kafka)
   docker-compose -f integrated-tools/docker-compose.dev.yml up -d

   # Start backend services
   ./scripts/dev-start.sh
   ```

### Verifying Your Setup

```bash
# Check all services are running
./scripts/dev-verify.sh

# Run tests to ensure everything works
mvn test
cd openframe/services/openframe-frontend && npm run test
cd clients/openframe-client && cargo test
```

## 🔄 Development Workflow

### Branch Naming Convention

Use descriptive branch names with one of these prefixes:
- `feature/` - New features
- `bugfix/` - Bug fixes  
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests

Examples:
- `feature/add-mingo-chat-integration`
- `bugfix/fix-gateway-cors-headers`
- `docs/update-api-examples`

### Making Changes

1. **Create a new branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   - Write clean, readable code
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes:**
   ```bash
   # Run all tests
   mvn test
   cd openframe/services/openframe-frontend && npm test
   cd clients/openframe-client && cargo test
   ```

4. **Commit your changes:**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

## 🎨 Style Guidelines

### Java Code Style

We follow **Google Java Style Guide** with some modifications:

```java
// Use meaningful variable names
String organizationName = "Acme Corp";  // ✅ Good
String s = "Acme Corp";                 // ❌ Bad

// Use proper indentation (2 spaces)
public class ExampleService {
  private final String serviceName;
  
  public ExampleService(String serviceName) {
    this.serviceName = serviceName;
  }
}

// Use clear method names
public List<Device> getActiveDevicesForOrganization(String orgId) {
  // implementation
}
```

**Code formatting:**
- **Indentation:** 2 spaces (no tabs)
- **Line length:** 100 characters maximum
- **Import order:** java.*, javax.*, org.*, com.openframe.*, others

### TypeScript/JavaScript Style

We use **Prettier** and **ESLint** for consistent formatting:

```typescript
// Use meaningful variable names and proper typing
interface DeviceMetrics {
  deviceId: string;
  cpuUsage: number;
  memoryUsage: number;
  timestamp: Date;
}

// Use async/await over Promises
async function fetchDeviceMetrics(deviceId: string): Promise<DeviceMetrics> {
  const response = await api.get(`/devices/${deviceId}/metrics`);
  return response.data;
}

// Use proper component structure (Vue 3 Composition API)
<script setup lang="ts">
import { ref, computed } from 'vue';

const deviceCount = ref(0);
const isLoading = ref(false);

const statusMessage = computed(() => 
  isLoading.value ? 'Loading...' : `Found ${deviceCount.value} devices`
);
</script>
```

### Rust Style

Follow **Rust standard library style**:

```rust
// Use proper naming conventions
struct DeviceMetrics {
    device_id: String,
    cpu_usage: f64,
    memory_usage: f64,
    timestamp: chrono::DateTime<chrono::Utc>,
}

// Use proper error handling
async fn fetch_device_metrics(device_id: &str) -> Result<DeviceMetrics, Error> {
    let response = client
        .get(&format!("/devices/{}/metrics", device_id))
        .send()
        .await?;
    
    let metrics: DeviceMetrics = response.json().await?;
    Ok(metrics)
}

// Use descriptive function names
pub fn calculate_average_cpu_usage(metrics: &[DeviceMetrics]) -> f64 {
    let sum: f64 = metrics.iter().map(|m| m.cpu_usage).sum();
    sum / metrics.len() as f64
}
```

## 📝 Commit Guidelines

We use **Conventional Commits** for clear commit history:

### Commit Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, missing semi-colons, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

### Examples

```bash
# Feature addition
git commit -m "feat(api): add device health monitoring endpoint"

# Bug fix
git commit -m "fix(gateway): resolve CORS headers for external APIs"

# Documentation update
git commit -m "docs(readme): add troubleshooting section"

# Breaking change
git commit -m "feat(auth)!: migrate to OAuth 2.1 specification

BREAKING CHANGE: OAuth 2.0 clients must be updated to support PKCE"
```

## 🔍 Pull Request Process

### Before Submitting

1. **Ensure your code builds and passes all tests:**
   ```bash
   mvn clean install
   cd openframe/services/openframe-frontend && npm run build
   cd clients/openframe-client && cargo build --release
   ```

2. **Update documentation** if you've made changes to:
   - APIs (update GraphQL schema docs)
   - Configuration options  
   - User-facing features
   - Development setup

3. **Add tests** for new functionality:
   - Java: JUnit 5 tests in `src/test/java/`
   - TypeScript: Jest tests in `__tests__/` or `.spec.ts` files
   - Rust: Unit tests with `#[cfg(test)]`

### Pull Request Template

When you submit a PR, please include:

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Tests pass locally with my changes
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Related Issues
Closes #(issue number)
```

### Review Process

1. **Automated checks** must pass (CI/CD, linting, tests)
2. **Code review** by at least one maintainer
3. **Testing** in development environment
4. **Documentation** review if applicable
5. **Approval** and merge by maintainer

### After Your PR is Merged

1. **Delete your feature branch**
2. **Pull the latest changes** from main
3. **Celebrate!** 🎉 Your contribution is now part of OpenFrame

## 🏗️ Architecture Guidelines

### Service Design Principles

When contributing to services, follow these principles:

**Single Responsibility:**
```java
// ✅ Good - service has single responsibility
@Service
public class DeviceMetricsService {
    public DeviceMetrics getMetrics(String deviceId) { ... }
    public void updateMetrics(String deviceId, DeviceMetrics metrics) { ... }
}

// ❌ Bad - service has multiple responsibilities  
@Service
public class DeviceService {
    public Device getDevice(String id) { ... }
    public DeviceMetrics getMetrics(String deviceId) { ... }
    public void sendNotification(String message) { ... }  // Wrong responsibility
}
```

**Dependency Injection:**
```java
// ✅ Good - constructor injection
@Service
public class DeviceService {
    private final DeviceRepository repository;
    
    public DeviceService(DeviceRepository repository) {
        this.repository = repository;
    }
}

// ❌ Bad - field injection
@Service
public class DeviceService {
    @Autowired
    private DeviceRepository repository;
}
```

### API Design Guidelines

**RESTful endpoints:**
```java
// ✅ Good - RESTful design
GET    /api/v1/organizations/{orgId}/devices           // List devices
GET    /api/v1/organizations/{orgId}/devices/{id}      // Get device
POST   /api/v1/organizations/{orgId}/devices           // Create device
PUT    /api/v1/organizations/{orgId}/devices/{id}      // Update device
DELETE /api/v1/organizations/{orgId}/devices/{id}      // Delete device

// ❌ Bad - non-RESTful design
GET    /api/v1/getDevices?orgId=123
POST   /api/v1/createDevice
POST   /api/v1/updateDevice
```

**GraphQL schema design:**
```graphql
# ✅ Good - clear, type-safe schema
type Device {
  id: ID!
  name: String!
  organizationId: ID!
  status: DeviceStatus!
  metrics: DeviceMetrics
  createdAt: DateTime!
  updatedAt: DateTime!
}

enum DeviceStatus {
  ONLINE
  OFFLINE
  MAINTENANCE
}

type Query {
  device(id: ID!): Device
  devices(organizationId: ID!, filter: DeviceFilter): [Device!]!
}

# ❌ Bad - unclear types and structure
type Device {
  data: String  # Unclear what this contains
  info: JSON    # Untyped data
}
```

## 🧪 Testing Guidelines

### Testing Strategy

We aim for comprehensive testing at multiple levels:

1. **Unit Tests** - Test individual functions/methods
2. **Integration Tests** - Test service interactions
3. **End-to-End Tests** - Test complete user workflows
4. **Performance Tests** - Ensure scalability requirements

### Java Testing

```java
@SpringBootTest
class DeviceServiceTest {
    
    @Autowired
    private DeviceService deviceService;
    
    @MockBean
    private DeviceRepository deviceRepository;
    
    @Test
    @DisplayName("Should return device when valid ID is provided")
    void shouldReturnDeviceForValidId() {
        // Given
        String deviceId = "device-123";
        Device expectedDevice = Device.builder()
            .id(deviceId)
            .name("Test Device")
            .status(DeviceStatus.ONLINE)
            .build();
            
        when(deviceRepository.findById(deviceId))
            .thenReturn(Optional.of(expectedDevice));
        
        // When
        Device actualDevice = deviceService.getDevice(deviceId);
        
        // Then
        assertThat(actualDevice).isEqualTo(expectedDevice);
        verify(deviceRepository).findById(deviceId);
    }
    
    @Test
    @DisplayName("Should throw exception when device not found")
    void shouldThrowExceptionWhenDeviceNotFound() {
        // Given
        String deviceId = "non-existent";
        when(deviceRepository.findById(deviceId))
            .thenReturn(Optional.empty());
        
        // When/Then
        assertThatThrownBy(() -> deviceService.getDevice(deviceId))
            .isInstanceOf(DeviceNotFoundException.class)
            .hasMessage("Device not found: " + deviceId);
    }
}
```

### TypeScript Testing

```typescript
// DeviceService.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceService } from '../DeviceService';
import { mockApiClient } from '../__mocks__/apiClient';

describe('DeviceService', () => {
  let deviceService: DeviceService;

  beforeEach(() => {
    vi.clearAllMocks();
    deviceService = new DeviceService(mockApiClient);
  });

  it('should fetch devices for organization', async () => {
    // Given
    const orgId = 'org-123';
    const expectedDevices = [
      { id: 'device-1', name: 'Test Device 1', status: 'ONLINE' },
      { id: 'device-2', name: 'Test Device 2', status: 'OFFLINE' }
    ];
    
    mockApiClient.get.mockResolvedValue({ data: expectedDevices });

    // When
    const devices = await deviceService.getDevicesForOrganization(orgId);

    // Then
    expect(devices).toEqual(expectedDevices);
    expect(mockApiClient.get).toHaveBeenCalledWith(`/organizations/${orgId}/devices`);
  });

  it('should handle API errors gracefully', async () => {
    // Given
    const orgId = 'org-123';
    mockApiClient.get.mockRejectedValue(new Error('API Error'));

    // When/Then
    await expect(deviceService.getDevicesForOrganization(orgId))
      .rejects.toThrow('Failed to fetch devices');
  });
});
```

### Rust Testing

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;
    
    #[tokio::test]
    async fn test_device_metrics_calculation() {
        // Given
        let metrics = vec![
            DeviceMetrics { device_id: "1".to_string(), cpu_usage: 50.0, memory_usage: 60.0, timestamp: Utc::now() },
            DeviceMetrics { device_id: "2".to_string(), cpu_usage: 70.0, memory_usage: 80.0, timestamp: Utc::now() },
        ];
        
        // When
        let avg_cpu = calculate_average_cpu_usage(&metrics);
        
        // Then
        assert_eq!(avg_cpu, 60.0);
    }
    
    #[tokio::test]
    async fn test_device_metrics_client_success() {
        // Given
        let mock_server = mockito::Server::new();
        let mock = mock_server.mock("GET", "/devices/123/metrics")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"{"device_id":"123","cpu_usage":45.0,"memory_usage":65.0}"#)
            .create();
        
        let client = DeviceMetricsClient::new(&mock_server.url());
        
        // When
        let result = client.fetch_metrics("123").await;
        
        // Then
        assert!(result.is_ok());
        let metrics = result.unwrap();
        assert_eq!(metrics.device_id, "123");
        assert_eq!(metrics.cpu_usage, 45.0);
        mock.assert();
    }
}
```

## 🌐 Community

### Communication Channels

- **GitHub Discussions** - For design discussions and questions
- **OpenMSP Slack** - Real-time chat and support: [Join Here](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **GitHub Issues** - Bug reports and feature requests

### Community Guidelines

- **Be respectful** - Treat all community members with respect
- **Be helpful** - Help newcomers and share knowledge
- **Be constructive** - Provide actionable feedback
- **Be patient** - Maintainers are volunteers with limited time

### Recognition

Contributors who make significant impacts are recognized in:
- Repository README contributors section
- Release notes and changelogs
- Community highlights in newsletters
- Speaking opportunities at community events

## 🎯 Getting Help

### Documentation

- **Getting Started** - [docs/getting-started/](docs/getting-started/)
- **Development Setup** - [docs/development/setup/](docs/development/setup/)
- **Architecture Guide** - [docs/reference/architecture/](docs/reference/architecture/)
- **API Documentation** - Available in GraphQL playground

### Support Channels

1. **Check existing documentation** first
2. **Search GitHub issues** for similar problems
3. **Ask in OpenMSP Slack** for quick questions
4. **Create GitHub issue** for bugs or feature requests

### Mentorship

New contributors can request mentorship through:
- OpenMSP Slack #mentorship channel
- GitHub discussions tagged with "mentorship"
- Pairing sessions during community office hours

---

## 🎉 Thank You!

Your contributions make OpenFrame better for everyone. Whether you're fixing a typo, adding a feature, or helping another user, every contribution matters.

**Happy Contributing!** 🚀

---

*This contributing guide is inspired by open-source best practices and evolves with our community needs.*