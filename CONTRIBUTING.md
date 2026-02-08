# Contributing to OpenFrame OSS Tenant

Thank you for your interest in contributing to OpenFrame! This guide will help you get started with contributing to the OpenFrame OSS Tenant repository.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Project Structure](#project-structure)
- [Making Contributions](#making-contributions)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Community Guidelines](#community-guidelines)

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have:

- **Java:** OpenJDK 21.0.1+ 
- **Node.js:** 18+ with npm
- **Rust:** 1.70+ with Cargo (for agent development)
- **Docker:** 24.0+ with Docker Compose
- **Git:** 2.42+
- **GitHub Account:** For submitting pull requests

### GitHub Packages Authentication

This project depends on `openframe-oss-lib` which is hosted on GitHub Packages. You'll need to authenticate:

```bash
export GITHUB_ACTOR=your-github-username
export GITHUB_TOKEN=your-personal-access-token
```

**Creating a GitHub Personal Access Token:**
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token with `read:packages` scope
3. Use this token as your `GITHUB_TOKEN`

## 🛠️ Development Environment

### 1. Fork and Clone

```bash
# Fork the repository on GitHub first, then clone your fork
git clone https://github.com/YOUR-USERNAME/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add the original repo as upstream
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git
```

### 2. Environment Setup

```bash
# Set up authentication
export GITHUB_ACTOR=your-github-username
export GITHUB_TOKEN=your-github-token

# Build the project
mvn clean install

# Verify everything builds correctly
mvn test
```

### 3. IDE Configuration

**For IntelliJ IDEA:**
- Import as a Maven project
- Enable annotation processing
- Set Project SDK to Java 21
- Install the Lombok plugin

**For VS Code:**
- Install Java Extension Pack
- Install Spring Boot Extension Pack
- Install REST Client extension

## 📁 Project Structure

Understanding the repository structure will help you navigate contributions:

```text
openframe-oss-tenant/
├── openframe/
│   ├── services/          # Service entrypoints (Spring Boot apps)
│   │   ├── openframe-api/
│   │   ├── openframe-authorization-server/
│   │   ├── openframe-gateway/
│   │   ├── openframe-management/
│   │   └── openframe-frontend/
│   └── shared/            # Shared configurations and utilities
├── client/                # Rust agent source code
├── docs/                  # Documentation
├── scripts/               # Build and deployment scripts
└── docker/                # Docker configurations
```

### Key Components to Understand

- **Service Entrypoints**: Deployable Spring Boot applications
- **Service Cores**: Business logic libraries (imported from openframe-oss-lib)
- **Frontend**: Next.js/React web application
- **Client Agent**: Rust-based cross-platform agent
- **Shared Infrastructure**: Security, data layer, and common utilities

## 🔄 Making Contributions

### 1. Choose an Issue or Feature

- Browse existing issues in our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- Join the `#development` channel for coordination
- **Note**: We don't use GitHub Issues - all coordination happens in Slack

### 2. Create a Feature Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create your feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

### 3. Development Workflow

```bash
# Make your changes
# ... develop your feature ...

# Run tests frequently
mvn test

# For frontend changes
cd openframe/services/openframe-frontend
npm run type-check
npm run test

# For client agent changes
cd client
cargo test
```

### 4. Commit Guidelines

We follow conventional commit format:

```bash
git commit -m "feat: add device status monitoring dashboard"
git commit -m "fix: resolve authentication token refresh issue" 
git commit -m "docs: update API documentation for new endpoints"
git commit -m "refactor: improve error handling in stream service"
```

**Commit Types:**
- `feat:` - New features
- `fix:` - Bug fixes  
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `ci:` - CI/CD changes

### 5. Submit Pull Request

```bash
# Push your branch
git push origin feature/your-feature-name

# Create pull request on GitHub
# Target the main branch
# Include a clear description of your changes
```

## 📝 Code Standards

### Java (Backend Services)

**Code Style:**
- Follow Google Java Style Guide
- Use meaningful variable and method names
- Add JavaDoc for public APIs
- Use `@SuppressWarnings` sparingly

**Example:**
```java
/**
 * Service for managing device registrations and status updates.
 */
@Service
@Slf4j
public class DeviceManagementService {
    
    /**
     * Registers a new device for the specified tenant.
     *
     * @param tenantId the tenant identifier
     * @param deviceInfo device registration information
     * @return the registered device
     * @throws DeviceRegistrationException if registration fails
     */
    public Device registerDevice(String tenantId, DeviceRegistrationInfo deviceInfo) {
        log.info("Registering device {} for tenant {}", deviceInfo.getName(), tenantId);
        
        // Implementation...
    }
}
```

**Required Practices:**
- Use `@Slf4j` for logging, not `System.out.println`
- Validate inputs with `@Valid` and custom validators
- Handle exceptions gracefully with proper error responses
- Use Spring Security's `@PreAuthorize` for authorization
- Always include tenant context in database queries

### TypeScript (Frontend)

**Code Style:**
- Use TypeScript strict mode
- Define interfaces for all data structures
- Use functional components with hooks
- Prefer composition over inheritance

**Example:**
```typescript
interface DeviceStatusProps {
  deviceId: string;
  tenantId: string;
  onStatusChange?: (status: DeviceStatus) => void;
}

export const DeviceStatusComponent: React.FC<DeviceStatusProps> = ({ 
  deviceId, 
  tenantId, 
  onStatusChange 
}) => {
  const [status, setStatus] = useState<DeviceStatus>();
  const { data, loading, error } = useDeviceStatusQuery({
    variables: { deviceId, tenantId }
  });

  // Implementation...
};
```

### Rust (Client Agent)

**Code Style:**
- Follow Rust standard conventions
- Use `clippy` for code quality
- Write comprehensive tests
- Handle errors with `Result<T, E>`

**Example:**
```rust
use tokio::time::{Duration, interval};
use anyhow::Result;

/// Manages device health monitoring and reporting
pub struct DeviceMonitor {
    client: ApiClient,
    interval: Duration,
}

impl DeviceMonitor {
    /// Creates a new device monitor with specified check interval
    pub fn new(client: ApiClient, interval: Duration) -> Self {
        Self { client, interval }
    }
    
    /// Starts the monitoring loop
    pub async fn start_monitoring(&self) -> Result<()> {
        let mut timer = interval(self.interval);
        
        loop {
            timer.tick().await;
            
            match self.check_device_health().await {
                Ok(health) => self.report_health(health).await?,
                Err(e) => log::error!("Health check failed: {}", e),
            }
        }
    }
}
```

## ✅ Testing Requirements

### Backend Tests

**Unit Tests:**
```java
@SpringBootTest
@TestMethodOrder(OrderAnnotation.class)
class DeviceManagementServiceTest {
    
    @MockBean
    private DeviceRepository deviceRepository;
    
    @Autowired
    private DeviceManagementService deviceService;
    
    @Test
    void shouldRegisterDeviceSuccessfully() {
        // Given
        DeviceRegistrationInfo info = DeviceRegistrationInfo.builder()
            .name("Test Device")
            .type(DeviceType.WORKSTATION)
            .build();
            
        // When
        Device result = deviceService.registerDevice("tenant-1", info);
        
        // Then
        assertThat(result.getName()).isEqualTo("Test Device");
        assertThat(result.getTenantId()).isEqualTo("tenant-1");
    }
}
```

**Integration Tests:**
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.kafka.bootstrap-servers=\${embedded.kafka.brokers}"
})
class DeviceApiIntegrationTest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    void shouldCreateDeviceViaApi() {
        // Test implementation
    }
}
```

### Frontend Tests

**Component Tests:**
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { DeviceStatusComponent } from './DeviceStatusComponent';

describe('DeviceStatusComponent', () => {
  it('should display device status correctly', async () => {
    render(
      <DeviceStatusComponent 
        deviceId="device-1" 
        tenantId="tenant-1" 
      />
    );
    
    expect(await screen.findByText('Online')).toBeInTheDocument();
  });
});
```

### Rust Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::Duration;
    
    #[tokio::test]
    async fn test_device_monitor_creation() {
        let client = ApiClient::new("http://localhost:8080").unwrap();
        let monitor = DeviceMonitor::new(client, Duration::from_secs(60));
        
        assert_eq!(monitor.interval, Duration::from_secs(60));
    }
}
```

### Test Coverage Requirements

- **Backend**: Minimum 80% code coverage
- **Frontend**: Minimum 70% component coverage  
- **Rust**: All public APIs must have tests

```bash
# Check coverage
mvn test jacoco:report
npm run test:coverage
cargo test --coverage
```

## 📚 Documentation

### Code Documentation

**Java:**
```java
/**
 * Validates device configuration against tenant policies.
 * 
 * @param tenantId the tenant identifier for policy lookup
 * @param config the device configuration to validate
 * @return validation result with any policy violations
 * @throws PolicyNotFoundException if tenant policies are not configured
 * @since 1.2.0
 */
@ValidateInput
public ValidationResult validateDeviceConfig(
    @NotNull String tenantId, 
    @Valid DeviceConfiguration config
) throws PolicyNotFoundException {
    // Implementation
}
```

**TypeScript:**
```typescript
/**
 * Hook for managing device status subscriptions
 * @param deviceId - Unique device identifier
 * @param options - Subscription options
 * @returns Device status data and subscription controls
 */
export function useDeviceStatus(
  deviceId: string,
  options: SubscriptionOptions = {}
): DeviceStatusResult {
  // Implementation
}
```

### README Updates

If your changes require documentation updates:

1. Update relevant sections in `docs/` directory
2. Update API documentation for new endpoints
3. Add examples for new features
4. Update troubleshooting guides if needed

## 🤝 Community Guidelines

### Code of Conduct

We follow the [OpenMSP Community Code of Conduct](https://www.openmsp.ai/). All contributors are expected to:

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the technical merits of contributions
- Help newcomers learn and contribute

### Communication Channels

- **Primary**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Channels to join**:
  - `#development` - Development coordination
  - `#architecture` - Architectural discussions  
  - `#general` - General community chat
  - `#help` - Getting help and support

### Getting Help

**For Development Questions:**
1. Check existing documentation first
2. Search Slack history in relevant channels
3. Ask in `#development` with context:
   - What you're trying to achieve
   - What you've already tried
   - Relevant error messages or logs

**For Architecture Decisions:**
- Post in `#architecture` channel
- Include technical context and trade-offs
- Tag `@architecture-team` for complex decisions

## 🚀 Advanced Contribution Topics

### Working with Service Cores

The business logic lives in `openframe-oss-lib` (separate repository). If your contribution requires changes to service cores:

1. First discuss in `#architecture` Slack channel
2. Changes may need to be made in the lib repository first
3. Coordinate with maintainers for version updates

### Multi-Tenant Considerations

All contributions must maintain multi-tenant isolation:

```java
// Always include tenant context
public List<Device> getDevices() {
    String tenantId = TenantContext.getCurrentTenantId();
    return deviceRepository.findByTenantId(tenantId);
}

// Database queries must filter by tenant
@Query("{'tenantId': ?0, 'status': ?1}")
List<Device> findByTenantAndStatus(String tenantId, DeviceStatus status);
```

### Performance Considerations

- Database queries must use proper indexes
- Cache frequently accessed data appropriately
- Use pagination for large data sets
- Implement proper rate limiting

### Security Requirements

- All endpoints must be authenticated
- Use `@PreAuthorize` for authorization
- Validate all inputs
- Sanitize user-provided data
- Follow OWASP security guidelines

## ✅ Pull Request Checklist

Before submitting your pull request, ensure:

- [ ] Code follows style guidelines
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] Multi-tenant isolation is maintained
- [ ] Security considerations are addressed
- [ ] Performance impact is considered
- [ ] Breaking changes are clearly documented
- [ ] Commit messages follow conventional format

## 🙋 Questions?

If you have questions about contributing:

1. **First**: Check this guide and existing documentation
2. **Then**: Ask in the appropriate Slack channel
3. **For urgent issues**: Tag `@maintainers` in Slack

Thank you for contributing to OpenFrame! Your contributions help build the future of open-source MSP platforms.

---

**Happy coding!** 🚀

Built with 💛 by the [Flamingo](https://www.flamingo.run/about) team and the OpenMSP community.