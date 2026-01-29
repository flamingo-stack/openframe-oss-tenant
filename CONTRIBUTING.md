# Contributing to OpenFrame

Thank you for your interest in contributing to OpenFrame! This document provides guidelines and information for contributors.

## 🌟 Welcome

OpenFrame is an open-source MSP platform built by the community, for the community. We welcome all types of contributions, from code and documentation to bug reports and feature requests.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Workflow](#contributing-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Community Guidelines](#community-guidelines)
- [Getting Help](#getting-help)

## 📖 Code of Conduct

By participating in this project, you agree to abide by our code of conduct:

- **Be respectful** - Treat everyone with respect and professionalism
- **Be inclusive** - Welcome newcomers and help them get started
- **Be constructive** - Provide helpful feedback and suggestions
- **Be patient** - Remember that everyone has different experience levels
- **Be collaborative** - Work together towards common goals

Unacceptable behavior will not be tolerated. Report issues to the maintainers via our OpenMSP Slack community.

## 🚀 Getting Started

### Types of Contributions

We welcome various types of contributions:

- **🐛 Bug Reports** - Help us identify and fix issues
- **💡 Feature Requests** - Suggest new features and improvements  
- **📝 Documentation** - Improve guides, tutorials, and API docs
- **🔧 Code Contributions** - Bug fixes, new features, and improvements
- **🧪 Testing** - Write tests, perform QA testing
- **🎨 UI/UX** - Design improvements and user experience enhancements

### Before You Contribute

1. **Join our community**: Join the [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
2. **Check existing work**: Look for existing issues or pull requests related to your idea
3. **Discuss your idea**: Chat with maintainers and community members in Slack
4. **Start small**: Begin with documentation fixes or small bug fixes to get familiar

> **Important**: We don't use GitHub Issues or Discussions. All communication happens in our OpenMSP Slack community at https://www.openmsp.ai/

## 🔧 Development Setup

### Prerequisites

Ensure you have the following installed:

- **Java**: OpenJDK 21.0.1+
- **Node.js**: 18+ with npm
- **Rust**: 1.70+ with Cargo  
- **Docker**: 24.0+ with Docker Compose
- **Git**: 2.42+
- **Maven**: 3.8+

### Environment Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
   cd openframe-oss-tenant
   ```

2. **Set up GitHub authentication** (required for Maven packages):
   ```bash
   export GITHUB_ACTOR=your-github-username
   export GITHUB_TOKEN=your-github-personal-access-token
   ```

3. **Build the project**:
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

4. **Run locally**:
   ```bash
   # Start services with CLI
   ./cli/openframe bootstrap
   
   # Or run individual components for development
   # See docs/development/setup/local-development.md for details
   ```

For detailed setup instructions, see our [Development Environment Guide](docs/development/setup/environment.md).

## 🔄 Contributing Workflow

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR-USERNAME/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git
```

### 2. Create a Branch

Create a descriptive branch name:

```bash
git checkout -b feature/add-device-monitoring
git checkout -b fix/authentication-bug
git checkout -b docs/improve-setup-guide
```

### 3. Make Your Changes

- Follow our [code style guidelines](#code-style-guidelines)
- Write tests for new functionality
- Update documentation if needed
- Ensure all tests pass

### 4. Commit Your Changes

Use clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add real-time device monitoring dashboard

- Add WebSocket connection for live device status
- Implement device health metrics visualization  
- Update API to support streaming device data
- Add comprehensive tests for monitoring features

Closes #123"
```

**Commit Message Format**:
- Use conventional commits: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`
- Keep the first line under 72 characters
- Include detailed description if needed
- Reference issue numbers when applicable

### 5. Push and Create Pull Request

```bash
git push origin feature/add-device-monitoring
```

Then create a pull request on GitHub with:
- Clear title and description
- Reference to related issues
- Screenshots for UI changes
- Testing instructions

## 🎨 Code Style Guidelines

### Java Code Style

- **Format**: Use Spring Boot conventions and Google Java Style
- **Naming**: Use camelCase for methods/variables, PascalCase for classes
- **Documentation**: Include Javadoc for public APIs
- **Annotations**: Use Spring annotations appropriately

```java
@RestController
@RequestMapping("/api/devices")
@Slf4j
public class DeviceController {
    
    private final DeviceService deviceService;
    
    public DeviceController(DeviceService deviceService) {
        this.deviceService = deviceService;
    }
    
    /**
     * Get all devices for the authenticated organization.
     * 
     * @param pageable pagination parameters
     * @return paginated list of devices
     */
    @GetMapping
    public ResponseEntity<Page<DeviceDto>> getDevices(Pageable pageable) {
        log.debug("Fetching devices with pagination: {}", pageable);
        Page<DeviceDto> devices = deviceService.findAll(pageable);
        return ResponseEntity.ok(devices);
    }
}
```

### TypeScript/Vue Code Style

- **Format**: Use Prettier with our configuration
- **Naming**: Use camelCase for variables/functions, PascalCase for components
- **Types**: Use strict TypeScript, avoid `any`
- **Vue**: Use Composition API with `<script setup>`

```typescript
<template>
  <div class="device-list">
    <DataTable 
      :value="devices" 
      :loading="loading"
      paginator 
      :rows="10"
    >
      <Column field="hostname" header="Hostname" />
      <Column field="status" header="Status">
        <template #body="{ data }">
          <Badge 
            :value="data.status" 
            :severity="getStatusSeverity(data.status)" 
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDeviceStore } from '@/stores/device'
import type { Device } from '@/types/device'

interface Props {
  organizationId?: string
}

const props = withDefaults(defineProps<Props>(), {
  organizationId: ''
})

const deviceStore = useDeviceStore()
const devices = ref<Device[]>([])
const loading = ref(false)

const getStatusSeverity = (status: string): string => {
  const severityMap: Record<string, string> = {
    online: 'success',
    offline: 'danger',
    warning: 'warn'
  }
  return severityMap[status] || 'info'
}

onMounted(async () => {
  loading.value = true
  try {
    devices.value = await deviceStore.fetchDevices(props.organizationId)
  } finally {
    loading.value = false
  }
})
</script>
```

### Rust Code Style

- **Format**: Use `rustfmt` with default settings
- **Linting**: Pass `clippy` checks
- **Error Handling**: Use `Result<T, E>` and `?` operator
- **Documentation**: Include doc comments for public APIs

```rust
use tokio::time::{interval, Duration};
use tracing::{info, error};

/// Device monitoring service that collects and reports system metrics
pub struct DeviceMonitor {
    client: OpenFrameClient,
    interval_seconds: u64,
}

impl DeviceMonitor {
    /// Create a new device monitor with specified reporting interval
    pub fn new(client: OpenFrameClient, interval_seconds: u64) -> Self {
        Self {
            client,
            interval_seconds,
        }
    }
    
    /// Start the monitoring loop
    pub async fn start(&self) -> Result<(), MonitorError> {
        let mut interval = interval(Duration::from_secs(self.interval_seconds));
        
        loop {
            interval.tick().await;
            
            match self.collect_and_report().await {
                Ok(()) => info!("Successfully reported device metrics"),
                Err(e) => error!("Failed to report metrics: {}", e),
            }
        }
    }
    
    async fn collect_and_report(&self) -> Result<(), MonitorError> {
        let metrics = self.collect_metrics().await?;
        self.client.report_metrics(metrics).await?;
        Ok(())
    }
}
```

## 🧪 Testing Requirements

### Backend Testing

- **Unit Tests**: Test individual components with JUnit 5
- **Integration Tests**: Test service interactions
- **Repository Tests**: Use `@DataMongoTest` for database tests
- **Web Tests**: Use `@WebMvcTest` for controller tests

```java
@ExtendWith(MockitoExtension.class)
class DeviceServiceTest {
    
    @Mock
    private DeviceRepository deviceRepository;
    
    @InjectMocks
    private DeviceService deviceService;
    
    @Test
    void shouldFindDeviceById() {
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
    }
}
```

### Frontend Testing

- **Unit Tests**: Test components with Vitest
- **Type Checking**: Ensure TypeScript compliance
- **E2E Tests**: Use Playwright for critical user flows

```typescript
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DeviceList from '@/components/DeviceList.vue'

describe('DeviceList', () => {
  it('should display devices correctly', async () => {
    const mockDevices = [
      { id: '1', hostname: 'server-01', status: 'online' },
      { id: '2', hostname: 'server-02', status: 'offline' }
    ]
    
    const wrapper = mount(DeviceList, {
      props: { devices: mockDevices }
    })
    
    expect(wrapper.findAll('.device-item')).toHaveLength(2)
    expect(wrapper.text()).toContain('server-01')
    expect(wrapper.text()).toContain('server-02')
  })
})
```

### Running Tests

```bash
# Backend tests
mvn test

# Frontend tests  
cd openframe/services/openframe-frontend
npm run test
npm run type-check

# Rust tests
cd client
cargo test

# E2E tests
npm run test:e2e
```

## 🔀 Pull Request Process

### Before Submitting

1. **Rebase on latest main**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all tests**:
   ```bash
   mvn test
   npm run test
   cargo test
   ```

3. **Check code formatting**:
   ```bash
   mvn spring-javaformat:apply
   npm run format
   cargo fmt
   ```

### PR Requirements

Your pull request must:

- ✅ Have a clear title and description
- ✅ Reference related issues/discussions
- ✅ Include tests for new functionality
- ✅ Update documentation if needed
- ✅ Pass all CI checks
- ✅ Be reviewed by at least one maintainer
- ✅ Follow semantic versioning for breaking changes

### PR Template

When creating a PR, use this template:

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] E2E tests pass (if applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added for new functionality
- [ ] All CI checks passing

## Screenshots (if applicable)
Add screenshots for UI changes.

## Additional Notes
Any additional information for reviewers.
```

### Review Process

1. **Automated checks**: CI runs tests and code quality checks
2. **Code review**: Maintainers review code and provide feedback
3. **Address feedback**: Make requested changes and push updates
4. **Final approval**: Maintainer approves and merges the PR

## 👥 Community Guidelines

### Communication Channels

- **Primary Discussion**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **General Chat**: `#general` channel
- **Development**: `#development` channel  
- **Architecture**: `#architecture` channel
- **Support**: `#support` channel

### Community Values

- **Open Source First**: We believe in the power of open-source software
- **Community Driven**: Decisions are made collectively with community input
- **Quality Focus**: We prioritize quality code, documentation, and user experience
- **Continuous Learning**: We help each other grow and learn new technologies
- **Transparency**: Development processes and decisions are open and transparent

### Recognition

We recognize contributors through:

- GitHub contributor graphs
- Slack shout-outs and appreciation
- Contributor spotlight in releases
- Maintainer privileges for consistent contributors

## ❓ Getting Help

### Documentation Resources

- **[Getting Started Guide](docs/getting-started/introduction.md)** - Basic concepts and setup
- **[Development Setup](docs/development/setup/environment.md)** - Local development environment
- **[Architecture Overview](docs/development/architecture/overview.md)** - System architecture
- **[API Documentation](docs/api/README.md)** - GraphQL schema and endpoints

### Getting Support

1. **Check Documentation**: Look through our comprehensive docs first
2. **Search Slack**: Check if your question has been asked before
3. **Ask in Slack**: Post your question in the appropriate channel
4. **Provide Context**: Include code snippets, error messages, and steps to reproduce
5. **Be Patient**: Community members volunteer their time to help

### Common Questions

**Q: How do I set up the development environment?**
A: Follow our [Development Setup Guide](docs/development/setup/environment.md).

**Q: How do I contribute to documentation?**  
A: Documentation is written in Markdown. Submit PRs with doc improvements.

**Q: Can I add new external tool integrations?**
A: Yes! Check our [Integration Guide](docs/development/architecture/integration.md) for patterns.

**Q: How do I report security vulnerabilities?**
A: Email security@flamingo.run instead of posting publicly.

## 📚 Additional Resources

- **Project Website**: https://openframe.ai
- **Flamingo Knowledge Base**: https://www.flamingo.run/knowledge-base
- **OpenMSP Community**: https://www.openmsp.ai/
- **Architecture Deep-Dive**: [docs/development/architecture/overview.md](docs/development/architecture/overview.md)

---

## 🙏 Thank You

Thank you for contributing to OpenFrame! Your contributions help make MSP operations more efficient and accessible to everyone. Together, we're building the future of IT service management.

**Questions?** Join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) - we're here to help!

---

<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> team
</div>