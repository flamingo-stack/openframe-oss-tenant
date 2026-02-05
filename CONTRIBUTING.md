# Contributing to OpenFrame

Welcome to OpenFrame! We're excited that you're interested in contributing to the open-source core of Flamingo's AI-powered MSP platform. This guide will help you get started with contributing to the project.

## 🚀 Quick Start for Contributors

### Prerequisites

Before you begin, ensure you have:

- **Java**: OpenJDK 21.0.1+
- **Node.js**: 18+ LTS with npm
- **Rust**: 1.70+ (for client development)
- **Docker**: 24.0+ with Docker Compose
- **Maven**: 3.9+
- **Git**: 2.30+

### Development Environment Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
   cd openframe-oss-tenant
   ```

2. **Set up GitHub Authentication**
   ```bash
   export GITHUB_ACTOR=your-github-username
   export GITHUB_TOKEN=your-github-token
   ```

3. **Start Development Environment**
   ```bash
   # Start infrastructure services
   docker compose up -d

   # Build backend services
   mvn clean install

   # Start frontend (new terminal)
   cd openframe/services/openframe-frontend
   npm install && npm run dev

   # Build client agent (optional)
   cd ../../client
   cargo build --release
   ```

## 🤝 How to Contribute

### Types of Contributions

We welcome various types of contributions:

- **🐛 Bug Reports** - Help us identify and fix issues
- **✨ Feature Requests** - Suggest new functionality
- **📖 Documentation** - Improve guides, examples, and API docs
- **🔧 Code Contributions** - Bug fixes, new features, optimizations
- **🧪 Testing** - Add tests, improve test coverage
- **🎨 UI/UX Improvements** - Enhance user interface and experience

### Contribution Workflow

1. **Join the Community**
   - Join our [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
   - Introduce yourself and discuss your contribution ideas
   - **Note**: We coordinate all development through Slack, not GitHub Issues

2. **Create a Feature Branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**
   - Follow our [Code Style Guidelines](#code-style)
   - Write tests for new functionality
   - Update documentation as needed
   - Ensure all tests pass

4. **Test Your Changes**
   ```bash
   # Backend tests
   mvn test

   # Frontend tests
   cd openframe/services/openframe-frontend
   npm run type-check
   npm test

   # Client tests
   cd ../../client
   cargo test
   ```

5. **Submit a Pull Request**
   - Push your branch: `git push origin feature/your-feature-name`
   - Create a Pull Request on GitHub
   - Fill out the PR template completely
   - Reference any related Slack discussions

6. **Code Review Process**
   - Automated tests must pass
   - At least one maintainer review required
   - Address feedback and make requested changes
   - Once approved, your PR will be merged

## 📝 Code Style

### Java (Backend Services)

We use **google-java-format** for consistent formatting:

```bash
# Format all Java files
mvn formatter:format

# Verify formatting
mvn formatter:validate
```

**Key conventions:**
- Use Java 21 features (records, pattern matching, etc.)
- Follow Spring Boot conventions
- Use `@Slf4j` for logging
- Write comprehensive Javadoc for public APIs
- Prefer composition over inheritance

**Example:**
```java
@RestController
@RequestMapping("/api/v1/devices")
@Slf4j
public class DeviceController {
    
    private final DeviceService deviceService;
    
    public DeviceController(DeviceService deviceService) {
        this.deviceService = deviceService;
    }
    
    @GetMapping("/{deviceId}")
    public ResponseEntity<DeviceDto> getDevice(@PathVariable String deviceId) {
        log.debug("Fetching device with ID: {}", deviceId);
        return ResponseEntity.ok(deviceService.getDevice(deviceId));
    }
}
```

### TypeScript (Frontend)

We use **Prettier** and **ESLint** for formatting and linting:

```bash
cd openframe/services/openframe-frontend

# Format code
npm run format

# Lint code
npm run lint

# Type checking
npm run type-check
```

**Key conventions:**
- Use Vue 3 Composition API
- Prefer TypeScript strict mode
- Use Pinia for state management
- Write descriptive component names
- Use PrimeVue components when available

**Example:**
```typescript
<template>
  <div class="device-card">
    <h3>{{ device.name }}</h3>
    <Badge :value="device.status" :severity="statusSeverity" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Device } from '@/types/device'

interface Props {
  device: Device
}

const props = defineProps<Props>()

const statusSeverity = computed(() => {
  switch (props.device.status) {
    case 'online': return 'success'
    case 'offline': return 'danger'
    default: return 'warning'
  }
})
</script>
```

### Rust (Client Agent)

We use **rustfmt** and **clippy** for formatting and linting:

```bash
cd client

# Format code
cargo fmt

# Lint code
cargo clippy

# Run with strict linting
cargo clippy -- -D warnings
```

**Key conventions:**
- Use `async`/`await` with Tokio
- Prefer `serde` for serialization
- Use `thiserror` for error handling
- Write comprehensive documentation
- Follow Rust naming conventions

**Example:**
```rust
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tokio::time::{sleep, Duration};

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub id: String,
    pub name: String,
    pub status: DeviceStatus,
}

#[derive(Debug, Error)]
pub enum DeviceError {
    #[error("Device not found: {id}")]
    NotFound { id: String },
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),
}

impl DeviceInfo {
    /// Fetches device information from the API
    pub async fn fetch(id: &str) -> Result<Self, DeviceError> {
        // Implementation here
        Ok(DeviceInfo {
            id: id.to_string(),
            name: "Example Device".to_string(),
            status: DeviceStatus::Online,
        })
    }
}
```

## 🧪 Testing Guidelines

### Testing Philosophy

- **Unit Tests**: Test individual functions and methods
- **Integration Tests**: Test service interactions
- **End-to-End Tests**: Test complete user workflows
- **Performance Tests**: Ensure scalability requirements

### Backend Testing (Java)

```java
@SpringBootTest
@Testcontainers
class DeviceServiceIntegrationTest {
    
    @Container
    static MongoDBContainer mongoContainer = new MongoDBContainer("mongo:7.0");
    
    @Autowired
    private DeviceService deviceService;
    
    @Test
    void shouldCreateDevice() {
        // Given
        CreateDeviceRequest request = new CreateDeviceRequest("test-device");
        
        // When
        Device device = deviceService.createDevice(request);
        
        // Then
        assertThat(device.getName()).isEqualTo("test-device");
        assertThat(device.getId()).isNotNull();
    }
}
```

### Frontend Testing (TypeScript)

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DeviceCard from '@/components/DeviceCard.vue'

describe('DeviceCard', () => {
  it('renders device information correctly', () => {
    const device = {
      id: '1',
      name: 'Test Device',
      status: 'online'
    }
    
    const wrapper = mount(DeviceCard, {
      props: { device }
    })
    
    expect(wrapper.text()).toContain('Test Device')
    expect(wrapper.find('.badge').classes()).toContain('success')
  })
})
```

### Client Testing (Rust)

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;

    #[tokio::test]
    async fn test_device_fetch() {
        let device = DeviceInfo::fetch("test-id").await.unwrap();
        assert_eq!(device.id, "test-id");
        assert!(!device.name.is_empty());
    }
}
```

## 📖 Documentation

### API Documentation

- **GraphQL**: Schema is auto-generated from Java code
- **REST**: Use OpenAPI 3.0 annotations
- **Javadoc**: Required for all public APIs

### Frontend Documentation

- **Component Documentation**: Use JSDoc comments
- **Storybook**: Create stories for reusable components
- **Type Definitions**: Comprehensive TypeScript types

### General Documentation

- **README Files**: Keep them up-to-date and comprehensive
- **Architecture Docs**: Update when making structural changes
- **Setup Guides**: Test with fresh environments

## 🐛 Reporting Issues

Since we coordinate development through Slack:

1. **Join our Slack**: [OpenMSP Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
2. **Search existing discussions** before posting
3. **Provide detailed information**:
   - OpenFrame version
   - Operating system and version
   - Steps to reproduce
   - Expected vs actual behavior
   - Relevant log output
   - Screenshots if applicable

## 🔒 Security

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. **Email**: security@flamingo.run
3. **Include**:
   - Detailed description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if you have one)

We will respond within 48 hours and work with you to resolve the issue.

## 📜 License

By contributing to OpenFrame, you agree that your contributions will be licensed under the [Flamingo AI Unified License v1.0](LICENSE.md).

## ❓ Getting Help

### Community Support

- **Slack**: [OpenMSP Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) - Primary support channel
- **Documentation**: [flamingo.run/knowledge-base](https://www.flamingo.run/knowledge-base)
- **Website**: [openframe.ai](https://openframe.ai)

### Development Help

- **Architecture Questions**: Ask in `#openframe-dev` Slack channel
- **Code Reviews**: Maintainers provide feedback on PRs
- **Mentoring**: We're happy to help new contributors get started

## 🎉 Recognition

Contributors are recognized through:

- **Contributors Page**: Listed on GitHub contributors page
- **Release Notes**: Significant contributions mentioned in releases
- **Community Shoutouts**: Recognition in Slack and social media
- **Swag**: Occasional contributor swag for significant contributions

## 📋 Commit Guidelines

We follow conventional commits for clear history:

```bash
# Format: type(scope): description

# Examples:
feat(api): add device filtering endpoint
fix(ui): resolve dashboard loading issue  
docs(readme): update installation instructions
test(client): add integration tests for auth
refactor(stream): improve kafka consumer performance
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Maintenance tasks

## 🚀 Release Process

1. **Feature Freeze**: No new features in release branch
2. **Testing**: Comprehensive testing across all components
3. **Documentation**: Update docs and changelog
4. **Release Candidate**: Deploy to staging environment
5. **Final Release**: Tag and publish release
6. **Post-Release**: Monitor and address any issues

---

Thank you for contributing to OpenFrame! Together, we're building the future of open-source MSP platforms. 🚀

**Questions?** Join our [Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) and ask away!