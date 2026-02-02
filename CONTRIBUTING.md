# Contributing to OpenFrame

Thank you for your interest in contributing to OpenFrame! This document provides guidelines and information for contributors to the OpenFrame OSS Tenant project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Environment](#development-environment)
4. [Contributing Process](#contributing-process)
5. [Code Standards](#code-standards)
6. [Testing Guidelines](#testing-guidelines)
7. [Documentation](#documentation)
8. [Community](#community)

## Code of Conduct

We are committed to fostering a welcoming and inclusive community. By participating in this project, you agree to abide by our Code of Conduct:

- **Be respectful**: Treat everyone with respect and professionalism
- **Be inclusive**: Welcome and support people of all backgrounds
- **Be constructive**: Provide helpful and actionable feedback
- **Be collaborative**: Work together to improve the project
- **Be patient**: Understand that everyone learns at their own pace

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Java**: OpenJDK 21.0.1 or higher
- **Node.js**: 18.0.0 or higher with npm
- **Rust**: 1.70.0 or higher with Cargo
- **Docker**: 24.0.0 or higher with Docker Compose
- **Git**: 2.42.0 or higher
- **Maven**: 3.8.0 or higher

### GitHub Authentication

OpenFrame depends on `openframe-oss-lib` from GitHub Packages. Set up authentication:

```bash
export GITHUB_ACTOR=your-github-username
export GITHUB_TOKEN=your-personal-access-token
```

Your GitHub token needs `read:packages` permission.

### Repository Setup

```bash
# Fork the repository on GitHub
# Clone your fork locally
git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git

# Install dependencies and setup
./scripts/setup-dev-env.sh
```

## Development Environment

### IDE Configuration

#### IntelliJ IDEA (Recommended for Java)

1. **Install Required Plugins**:
   - Spring Boot
   - GraphQL
   - Lombok
   - Docker
   - SonarLint

2. **Project Configuration**:
   - Set Project SDK to OpenJDK 21
   - Enable Maven auto-import
   - Configure code style: Google Java Style Guide
   - Set file encoding to UTF-8

#### VS Code (Recommended for Frontend)

Install recommended extensions:

```json
{
  "recommendations": [
    "vue.vscode-typescript-vue-plugin",
    "bradlc.vscode-tailwindcss", 
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "rust-lang.rust-analyzer"
  ]
}
```

### Local Development Setup

1. **Start Infrastructure Services**:
   ```bash
   cd integrated-tools
   docker compose up -d
   ```

2. **Build Backend Services**:
   ```bash
   mvn clean install
   ```

3. **Start Development Servers**:
   ```bash
   # Backend services
   ./scripts/run-mac.sh  # or run-linux.sh, run-windows.ps1
   
   # Frontend development
   cd openframe/services/openframe-frontend
   npm run dev
   ```

4. **Build Rust Client**:
   ```bash
   cd client
   cargo build
   ```

## Contributing Process

### 1. Choose an Issue

- Browse [open issues](https://github.com/flamingo-stack/openframe-oss-tenant/issues)
- Look for issues labeled `good first issue` or `help wanted`
- Comment on the issue to express interest before starting work
- For new features, open a discussion first

### 2. Create a Branch

```bash
# Update your fork
git checkout main
git pull upstream main
git push origin main

# Create feature branch
git checkout -b feature/your-feature-name

# For bug fixes
git checkout -b fix/issue-description

# For documentation
git checkout -b docs/update-description
```

### 3. Make Changes

- Write clean, readable code following our [Code Standards](#code-standards)
- Include tests for new functionality
- Update documentation as needed
- Commit frequently with descriptive messages

### 4. Test Your Changes

```bash
# Run unit tests
mvn test

# Run integration tests
mvn test -Pintegration

# Run frontend tests
cd openframe/services/openframe-frontend
npm run test:unit
npm run type-check

# Run Rust tests
cd client
cargo test
```

### 5. Submit Pull Request

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create Pull Request**:
   - Go to GitHub and create a pull request
   - Use the PR template provided
   - Include clear description of changes
   - Reference related issues with `Fixes #123` or `Related to #123`
   - Add appropriate labels

3. **PR Review Process**:
   - Automated checks must pass
   - Request review from maintainers
   - Address feedback promptly
   - Update documentation if required

## Code Standards

### Java Backend

#### Code Style
- Follow [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)
- Use Lombok to reduce boilerplate code
- Maximum line length: 100 characters
- Use meaningful variable and method names

#### Best Practices
```java
// Good: Clear, descriptive naming
@Service
public class DeviceRegistrationService {
    
    private final DeviceRepository deviceRepository;
    private final AuditLogger auditLogger;
    
    public DeviceRegistrationResult registerDevice(
            @Valid DeviceRegistrationRequest request,
            @NonNull String tenantId) {
        
        validateRequest(request, tenantId);
        Device device = createDeviceFromRequest(request);
        Device savedDevice = deviceRepository.save(device);
        auditLogger.logDeviceRegistration(savedDevice, tenantId);
        
        return DeviceRegistrationResult.success(savedDevice);
    }
}
```

#### Documentation
- Use JavaDoc for public APIs
- Include parameter descriptions and return value documentation
- Document complex business logic

```java
/**
 * Registers a new device for the specified tenant.
 * 
 * @param request the device registration request containing device details
 * @param tenantId the ID of the tenant registering the device
 * @return registration result containing the created device or error details
 * @throws ValidationException if the request validation fails
 * @throws TenantNotFoundException if the tenant doesn't exist
 */
public DeviceRegistrationResult registerDevice(
        DeviceRegistrationRequest request, 
        String tenantId) {
    // Implementation
}
```

### TypeScript Frontend

#### Code Style
- Use TypeScript strict mode
- Follow Vue 3 Composition API patterns
- Use PascalCase for components, camelCase for variables
- Maximum line length: 100 characters

#### Component Structure
```vue
<template>
  <div class="device-list">
    <h2>{{ title }}</h2>
    <DeviceTable 
      :devices="devices" 
      :loading="loading"
      @refresh="handleRefresh"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useDeviceService } from '@/services/device-service'
import DeviceTable from '@/components/DeviceTable.vue'

interface Props {
  tenantId: string
  showInactive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showInactive: false
})

const emit = defineEmits<{
  deviceSelected: [deviceId: string]
}>()

const { devices, loading, fetchDevices } = useDeviceService()

const title = computed(() => 
  props.showInactive ? 'All Devices' : 'Active Devices'
)

const handleRefresh = async () => {
  await fetchDevices(props.tenantId, props.showInactive)
}

onMounted(() => {
  handleRefresh()
})
</script>

<style scoped>
.device-list {
  @apply p-4 bg-white rounded-lg shadow;
}
</style>
```

### Rust Client

#### Code Style
- Follow [Rust Style Guide](https://doc.rust-lang.org/nightly/style-guide/)
- Use `cargo fmt` for formatting
- Run `cargo clippy` for linting
- Maximum line length: 100 characters

```rust
use tokio::sync::mpsc;
use tracing::{error, info, warn};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub hostname: String,
    pub os_info: OsInfo,
    pub network_interfaces: Vec<NetworkInterface>,
    pub last_seen: chrono::DateTime<chrono::Utc>,
}

impl DeviceInfo {
    /// Creates new device information by collecting system data.
    pub async fn collect() -> Result<Self, CollectionError> {
        let hostname = hostname::get()
            .map_err(CollectionError::HostnameError)?
            .to_string_lossy()
            .into_owned();
            
        let os_info = OsInfo::collect().await?;
        let network_interfaces = NetworkInterface::collect_all().await?;
        
        Ok(Self {
            hostname,
            os_info,
            network_interfaces,
            last_seen: chrono::Utc::now(),
        })
    }
}
```

### Database Design

#### MongoDB Collections
- Use consistent naming: `snake_case` for field names
- Include tenant isolation in all queries
- Add proper indexes for query performance
- Document schema changes in migration scripts

#### Example Document
```javascript
// devices collection
{
  "_id": ObjectId("..."),
  "tenant_id": "tenant123",
  "device_id": "device456", 
  "hostname": "workstation-01",
  "os_info": {
    "name": "Windows",
    "version": "11", 
    "architecture": "x86_64"
  },
  "network_interfaces": [...],
  "created_at": ISODate("..."),
  "updated_at": ISODate("..."),
  "tags": ["workstation", "sales-team"]
}
```

### API Design

#### GraphQL Schema
- Use clear, descriptive type and field names
- Include proper documentation strings
- Design for efficient data fetching
- Implement proper error handling

```graphql
"""
Device management operations
"""
type Device {
  """Unique device identifier"""
  id: ID!
  
  """Device hostname"""
  hostname: String!
  
  """Operating system information"""
  osInfo: OsInfo!
  
  """Device creation timestamp"""
  createdAt: DateTime!
  
  """Device last update timestamp"""
  updatedAt: DateTime!
}

"""
Device registration input
"""
input DeviceRegistrationInput {
  """Device hostname (required)"""
  hostname: String!
  
  """Operating system details"""
  osInfo: OsInfoInput!
  
  """Optional device tags"""
  tags: [String!]
}
```

#### REST API Design
- Follow RESTful conventions
- Use appropriate HTTP status codes
- Include proper error responses
- Implement consistent pagination

```java
@RestController
@RequestMapping("/api/v1/devices")
@Validated
public class DeviceController {
    
    @GetMapping
    public ResponseEntity<Page<DeviceDto>> getDevices(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<DeviceDto> devices = deviceService.findDevices(search, pageable);
        
        return ResponseEntity.ok(devices);
    }
    
    @PostMapping
    public ResponseEntity<DeviceDto> createDevice(
            @Valid @RequestBody DeviceRegistrationDto request) {
        
        DeviceDto created = deviceService.createDevice(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
```

## Testing Guidelines

### Unit Testing

#### Java (JUnit 5 + Mockito)
```java
@ExtendWith(MockitoExtension.class)
class DeviceServiceTest {
    
    @Mock
    private DeviceRepository deviceRepository;
    
    @Mock
    private AuditLogger auditLogger;
    
    @InjectMocks
    private DeviceService deviceService;
    
    @Test
    void shouldRegisterDeviceSuccessfully() {
        // Given
        DeviceRegistrationRequest request = DeviceRegistrationRequest.builder()
            .hostname("test-device")
            .build();
        String tenantId = "tenant123";
        
        Device expectedDevice = new Device();
        expectedDevice.setHostname("test-device");
        expectedDevice.setTenantId(tenantId);
        
        when(deviceRepository.save(any(Device.class)))
            .thenReturn(expectedDevice);
        
        // When
        DeviceRegistrationResult result = deviceService.registerDevice(request, tenantId);
        
        // Then
        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getDevice().getHostname()).isEqualTo("test-device");
        
        verify(deviceRepository).save(argThat(device -> 
            device.getHostname().equals("test-device") &&
            device.getTenantId().equals(tenantId)
        ));
        verify(auditLogger).logDeviceRegistration(expectedDevice, tenantId);
    }
}
```

#### Frontend (Vitest + Vue Test Utils)
```typescript
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import DeviceTable from '@/components/DeviceTable.vue'

describe('DeviceTable', () => {
  it('displays devices correctly', () => {
    const devices = [
      { id: '1', hostname: 'device1', osInfo: { name: 'Linux' }},
      { id: '2', hostname: 'device2', osInfo: { name: 'Windows' }}
    ]
    
    const wrapper = mount(DeviceTable, {
      props: { devices, loading: false }
    })
    
    expect(wrapper.text()).toContain('device1')
    expect(wrapper.text()).toContain('device2')
    expect(wrapper.text()).toContain('Linux')
    expect(wrapper.text()).toContain('Windows')
  })
  
  it('emits refresh event when refresh button clicked', async () => {
    const wrapper = mount(DeviceTable, {
      props: { devices: [], loading: false }
    })
    
    await wrapper.find('[data-testid="refresh-button"]').trigger('click')
    
    expect(wrapper.emitted('refresh')).toHaveLength(1)
  })
})
```

#### Rust (cargo test)
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;
    
    #[tokio::test]
    async fn test_device_info_collection() {
        // Given
        let device_info = DeviceInfo::collect().await;
        
        // Then
        assert!(device_info.is_ok());
        let info = device_info.unwrap();
        assert!(!info.hostname.is_empty());
        assert!(!info.network_interfaces.is_empty());
    }
    
    #[test]
    fn test_device_info_serialization() {
        // Given
        let device_info = DeviceInfo {
            hostname: "test-device".to_string(),
            os_info: OsInfo::default(),
            network_interfaces: vec![],
            last_seen: chrono::Utc::now(),
        };
        
        // When
        let json = serde_json::to_string(&device_info);
        
        // Then
        assert!(json.is_ok());
        let deserialized: DeviceInfo = serde_json::from_str(&json.unwrap()).unwrap();
        assert_eq!(deserialized.hostname, "test-device");
    }
}
```

### Integration Testing

#### Test Containers
```java
@SpringBootTest
@Testcontainers
class DeviceIntegrationTest {
    
    @Container
    static MongoDBContainer mongoContainer = new MongoDBContainer("mongo:6.0")
            .withExposedPorts(27017);
    
    @Container
    static GenericContainer<?> redisContainer = new GenericContainer<>("redis:7.0")
            .withExposedPorts(6379);
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", mongoContainer::getReplicaSetUrl);
        registry.add("spring.redis.host", redisContainer::getHost);
        registry.add("spring.redis.port", redisContainer::getFirstMappedPort);
    }
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    void shouldCreateDeviceThroughAPI() {
        // Given
        DeviceRegistrationDto request = new DeviceRegistrationDto();
        request.setHostname("integration-test-device");
        
        // When
        ResponseEntity<DeviceDto> response = restTemplate.postForEntity(
            "/api/v1/devices", 
            request, 
            DeviceDto.class
        );
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getHostname()).isEqualTo("integration-test-device");
    }
}
```

### Test Data Management

#### Use Test Builders
```java
public class DeviceTestDataBuilder {
    private String hostname = "default-hostname";
    private String tenantId = "default-tenant";
    private OsInfo osInfo = OsInfo.builder().name("Linux").build();
    
    public static DeviceTestDataBuilder aDevice() {
        return new DeviceTestDataBuilder();
    }
    
    public DeviceTestDataBuilder withHostname(String hostname) {
        this.hostname = hostname;
        return this;
    }
    
    public DeviceTestDataBuilder withTenantId(String tenantId) {
        this.tenantId = tenantId;
        return this;
    }
    
    public Device build() {
        Device device = new Device();
        device.setHostname(hostname);
        device.setTenantId(tenantId);
        device.setOsInfo(osInfo);
        return device;
    }
}

// Usage
Device testDevice = DeviceTestDataBuilder.aDevice()
    .withHostname("test-machine")
    .withTenantId("test-tenant")
    .build();
```

## Documentation

### Code Documentation
- Write clear JavaDoc for public APIs
- Include TypeScript interface documentation
- Document complex algorithms and business logic
- Use meaningful commit messages

### README Updates
- Update relevant README sections for new features
- Include code examples for new APIs
- Update installation instructions if needed

### API Documentation
- Keep GraphQL schema documentation current
- Update OpenAPI/Swagger specs for REST APIs
- Include request/response examples

## Community

### Communication Channels

- **Slack Community**: Join [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for real-time discussions
- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For general questions and community discussions

### Getting Help

1. **Check Documentation**: Look through existing docs and README files
2. **Search Issues**: Check if your question has been asked before
3. **Ask in Slack**: Get help from the community
4. **Create Discussion**: For broader questions about architecture or design

### Recognition

We value all contributions and recognize contributors through:

- GitHub contributor lists
- Release notes mentions
- Community highlights in Slack
- Swag for significant contributions

## Questions?

If you have questions about contributing, please:

1. Check this document first
2. Search existing GitHub issues and discussions
3. Ask in the [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
4. Create a GitHub discussion for broader questions

Thank you for contributing to OpenFrame! 🚀