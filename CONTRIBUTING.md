# Contributing to OpenFrame OSS Tenant

Thank you for your interest in contributing to OpenFrame! This guide will help you get started with contributing to the OpenFrame OSS Tenant repository.

## 🤝 How to Contribute

We welcome contributions of all kinds:
- 🐛 **Bug reports and fixes**
- ✨ **New features and enhancements**
- 📚 **Documentation improvements**
- 🧪 **Test coverage improvements**
- 🎨 **UI/UX improvements**
- 🚀 **Performance optimizations**

## 📋 Prerequisites

Before contributing, ensure you have:

- **Java**: OpenJDK 21.0.1+
- **Node.js**: 18+ with npm
- **Rust**: 1.70+ with Cargo (for client development)
- **Docker**: 24.0+ with Docker Compose
- **Git**: 2.42+
- **Maven**: 3.9+ (or use the included Maven wrapper)

## 🚀 Getting Started

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git
```

### 2. Set Up Development Environment

```bash
# Start infrastructure services
docker compose up -d mongodb kafka redis cassandra pinot

# Build all services
mvn clean install -DskipTests

# Start OpenFrame services
./scripts/run-mac.sh --silent        # macOS
./scripts/run-linux.sh --silent      # Linux
./scripts/run-windows.ps1 -Silent    # Windows

# Start frontend development server
cd openframe/services/openframe-frontend
npm install && npm run dev
```

### 3. Create a Feature Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b bugfix/issue-description
```

## 🏗️ Development Workflow

### Code Organization

The repository is organized into several key areas:

```text
openframe-oss-tenant/
├── openframe/
│   ├── services/           # Microservices
│   │   ├── openframe-gateway-service/
│   │   ├── openframe-api-service/
│   │   ├── openframe-authorization-server/
│   │   ├── openframe-client-service/
│   │   ├── openframe-management-service/
│   │   ├── openframe-stream-service/
│   │   └── openframe-frontend/    # Vue.js frontend
│   └── libs/              # Shared libraries
│       ├── data-layer-*/
│       ├── security-*/
│       └── core-utilities/
├── clients/               # Rust agent code
├── scripts/              # Development scripts
├── manifests/            # Kubernetes manifests
└── docs/                # Documentation
```

### Making Changes

#### Backend Development

1. **Service Changes**: 
   ```bash
   # Make your changes in the appropriate service
   cd openframe/services/openframe-api-service
   
   # Rebuild and restart
   mvn clean install -DskipTests
   # Restart the affected service
   ```

2. **Library Changes**:
   ```bash
   # Make changes in shared libraries
   cd openframe/libs/data-layer-core-and-cache
   
   # Rebuild all dependent services
   mvn clean install -DskipTests
   ```

#### Frontend Development

```bash
cd openframe/services/openframe-frontend

# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type checking
npm run type-check
```

#### Client Agent Development

```bash
cd clients

# Build the Rust client
cargo build --release

# Run tests
cargo test

# Format code
cargo fmt

# Lint
cargo clippy
```

### Testing

#### Java Services

```bash
# Run all tests
mvn test

# Run tests for specific service
cd openframe/services/openframe-api-service
mvn test

# Run integration tests
mvn verify

# Check test coverage
mvn clean test jacoco:report
```

#### Frontend Tests

```bash
cd openframe/services/openframe-frontend

# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run e2e tests (requires services to be running)
npm run test:e2e
```

#### Rust Client Tests

```bash
cd clients

# Run all tests
cargo test

# Run with coverage
cargo tarpaulin --out Html
```

## 📝 Coding Standards

### Java Guidelines

- **Code Style**: Follow Google Java Style Guide
- **Formatting**: Use built-in IntelliJ formatting or `mvn spotless:apply`
- **Testing**: Maintain >80% code coverage
- **Documentation**: Use JavaDoc for public APIs
- **Logging**: Use SLF4J with structured logging

```java
// Example: Good service method
@Service
@Slf4j
public class DeviceService {
    
    /**
     * Retrieves device by ID with tenant isolation
     * @param deviceId the device identifier
     * @param tenantId the tenant identifier for security
     * @return the device if found and accessible
     * @throws DeviceNotFoundException if device not found
     */
    public Device findDevice(String deviceId, String tenantId) {
        log.info("Finding device {} for tenant {}", deviceId, tenantId);
        return deviceRepository.findByIdAndTenantId(deviceId, tenantId)
            .orElseThrow(() -> new DeviceNotFoundException(deviceId));
    }
}
```

### TypeScript/Vue Guidelines

- **Code Style**: Follow Vue 3 Composition API patterns
- **Formatting**: Use Prettier with ESLint
- **Testing**: Write unit tests for components and utilities
- **Type Safety**: Use strict TypeScript configuration

```typescript
// Example: Good Vue component
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Device } from '@/types/device'

interface Props {
  tenantId: string
}

const props = defineProps<Props>()
const devices = ref<Device[]>([])
const loading = ref(false)

const deviceCount = computed(() => devices.value.length)

const loadDevices = async (): Promise<void> => {
  loading.value = true
  try {
    devices.value = await deviceService.getDevices(props.tenantId)
  } catch (error) {
    console.error('Failed to load devices:', error)
  } finally {
    loading.value = false
  }
}

onMounted(loadDevices)
</script>
```

### Rust Guidelines

- **Code Style**: Follow `rustfmt` defaults
- **Testing**: Write unit and integration tests
- **Documentation**: Use `cargo doc` comments
- **Error Handling**: Use `Result` types and proper error propagation

```rust
// Example: Good Rust service
use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub id: String,
    pub hostname: String,
    pub platform: String,
}

impl DeviceInfo {
    /// Collects basic device information
    pub fn collect() -> Result<Self> {
        let hostname = hostname::get()?
            .to_string_lossy()
            .to_string();
            
        Ok(Self {
            id: generate_device_id()?,
            hostname,
            platform: std::env::consts::OS.to_string(),
        })
    }
}
```

## 📄 Documentation

### Adding Documentation

- **API Changes**: Update OpenAPI specifications
- **New Features**: Add user-facing documentation in `docs/`
- **Architecture Changes**: Update architecture diagrams and documentation

### Documentation Structure

```bash
# Add new docs in appropriate section
docs/
├── getting-started/          # User onboarding
├── development/              # Developer guides
├── reference/               # Technical reference
└── operations/              # Deployment/ops guides
```

### Writing Style

- Use clear, concise language
- Include code examples
- Add diagrams for complex concepts
- Test all instructions yourself

## 🔄 Pull Request Process

### Before Submitting

1. **Sync with upstream**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run quality checks**:
   ```bash
   # Java: Format and test
   mvn spotless:apply
   mvn clean test
   
   # Frontend: Format and test
   cd openframe/services/openframe-frontend
   npm run lint:fix
   npm test
   
   # Rust: Format and test
   cd clients
   cargo fmt
   cargo clippy
   cargo test
   ```

3. **Update documentation**:
   - Update relevant docs in `docs/`
   - Add/update API documentation
   - Update README if needed

### PR Guidelines

**Title Format**: Use conventional commits format
- `feat: add device filtering API`
- `fix: resolve authentication timeout issue`
- `docs: update installation guide`
- `refactor: simplify event processing pipeline`

**Description Template**:

```markdown
## Description
Brief description of the change and why it was needed.

## Changes Made
- Bullet point list of specific changes
- Include any breaking changes

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass  
- [ ] Manual testing completed
- [ ] Documentation updated

## Screenshots (if applicable)
Add screenshots for UI changes

## Breaking Changes
List any breaking changes and migration steps

## Related Issues
Closes #123
```

### Review Process

1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one maintainer review required
3. **Testing**: Verify all tests pass and coverage requirements met
4. **Documentation**: Ensure documentation is updated appropriately

## 🐛 Reporting Issues

### Bug Reports

Use our issue template and include:

- **Environment**: OS, Java version, Docker version
- **Steps to reproduce**: Detailed reproduction steps
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Logs**: Relevant log excerpts
- **Screenshots**: If applicable

### Feature Requests

- **Use case**: Describe the problem you're trying to solve
- **Proposed solution**: Your ideal solution
- **Alternatives**: Other approaches you've considered
- **Additional context**: Any other relevant information

## 📞 Community & Support

### Getting Help

**Join our OpenMSP Slack Community:**
🔗 https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA

**Channels:**
- `#general` - General discussion
- `#development` - Development questions
- `#contributions` - Contribution coordination
- `#support` - User support

> **Note**: We don't use GitHub Issues or GitHub Discussions. All support and community interaction happens in our Slack community.

### Communication Guidelines

- Be respectful and inclusive
- Provide context when asking questions
- Search previous discussions before posting
- Use appropriate channels for different topics

## 📚 Additional Resources

### Learning Resources

- **Spring Boot**: [Official Documentation](https://spring.io/projects/spring-boot)
- **Vue.js**: [Vue 3 Documentation](https://vuejs.org/)
- **Rust**: [The Rust Programming Language](https://doc.rust-lang.org/book/)
- **Apache Kafka**: [Kafka Documentation](https://kafka.apache.org/documentation/)

### Development Tools

- **IDE Setup**: See [Development Environment Setup](./docs/development/setup/environment.md)
- **Debugging**: See [Local Development Guide](./docs/development/setup/local-development.md)
- **Architecture**: See [Architecture Overview](./docs/development/architecture/overview.md)

## 🏆 Recognition

Contributors will be:
- Added to the contributors list
- Mentioned in release notes for significant contributions
- Invited to contribute to future roadmap discussions

## 📄 License

By contributing to OpenFrame, you agree that your contributions will be licensed under the [Flamingo AI Unified License v1.0](LICENSE.md).

---

Thank you for contributing to OpenFrame! Together, we're building the future of open-source MSP platforms. 🚀