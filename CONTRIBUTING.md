# Contributing to OpenFrame

Thank you for your interest in contributing to OpenFrame! We welcome contributions from the community and appreciate your help in making OpenFrame better.

## 🤝 Code of Conduct

By participating in this project, you agree to abide by our community standards:

- **Be respectful** and considerate in all interactions
- **Be collaborative** and help others learn and grow
- **Be patient** with newcomers and those learning
- **Be constructive** in feedback and discussions

Report any unacceptable behavior to conduct@flamingo.run.

## 🚀 Getting Started

### 1. Join the Community

Before contributing, join our active community:

- **OpenMSP Slack**: [Join our community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for discussions, support, and collaboration
- **GitHub Discussions**: Use for feature requests and architectural discussions
- **Issues**: For bug reports and specific task tracking

**Note**: We manage development activities on our OpenMSP Slack community rather than GitHub Issues/Discussions. Join Slack for the most active collaboration!

### 2. Development Setup

Set up your development environment:

```bash
# Clone the repository
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant

# Follow the complete setup guide
# See: docs/development/setup/environment.md for detailed instructions

# Quick setup
export GITHUB_ACTOR=your-github-username
export GITHUB_TOKEN=your-github-token
mvn clean install
```

📖 **Detailed Setup**: Follow our [Development Environment Setup](docs/development/setup/environment.md) guide for complete configuration.

### 3. Understand the Architecture

Before making changes, familiarize yourself with OpenFrame's architecture:

- **[Architecture Overview](docs/reference/architecture/overview.md)** - High-level system design
- **[Service Documentation](docs/reference/architecture/)** - Individual service details
- **[Development Guidelines](docs/development/contributing/guidelines.md)** - Coding standards and practices

## 🐛 Reporting Issues

### Bug Reports

When reporting bugs, please include:

1. **Environment Details**:
   - Operating system and version
   - Java version (`java --version`)
   - Node.js version (`node --version`)
   - Docker version (`docker --version`)

2. **Steps to Reproduce**:
   ```text
   1. Start OpenFrame with `mvn clean install`
   2. Navigate to dashboard at localhost:3000
   3. Click on "Device Management"
   4. Error occurs...
   ```

3. **Expected vs Actual Behavior**:
   - What you expected to happen
   - What actually happened
   - Any error messages or logs

4. **Additional Context**:
   - Screenshots if applicable
   - Relevant log files
   - Configuration details

### Feature Requests

For feature requests, please:

1. **Check existing requests** in our Slack community first
2. **Describe the problem** your feature would solve
3. **Propose a solution** with implementation details
4. **Consider alternatives** and explain why your approach is preferred

## 💻 Development Process

### 1. Fork and Branch

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR-USERNAME/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git

# Create a feature branch
git checkout -b feature/your-feature-name
```

### 2. Development Guidelines

#### Code Style

**Java (Spring Boot Services)**:
- Follow [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)
- Use Spring Boot conventions and annotations
- Write comprehensive JavaDoc for public APIs
- Maximum line length: 100 characters

```java
// Example: Good service method
/**
 * Retrieves device information for the specified tenant.
 *
 * @param tenantId the tenant identifier
 * @param deviceId the device identifier
 * @return the device information
 * @throws DeviceNotFoundException if device is not found
 */
@GetMapping("/devices/{deviceId}")
public ResponseEntity<DeviceDto> getDevice(
    @PathVariable String tenantId,
    @PathVariable String deviceId) {
    // Implementation...
}
```

**TypeScript/Vue.js (Frontend)**:
- Use Vue 3 Composition API with TypeScript
- Follow [Vue.js Style Guide](https://vuejs.org/style-guide/)
- Use PrimeVue component library consistently
- Write unit tests for complex logic

```typescript
// Example: Good Vue component structure
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Device } from '@/types/device'

interface Props {
  deviceId: string
}

const props = defineProps<Props>()
const device = ref<Device | null>(null)

const isOnline = computed(() => 
  device.value?.status === 'online'
)
</script>
```

**Rust (Client Agent)**:
- Follow [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- Use `cargo fmt` and `cargo clippy`
- Write comprehensive documentation and tests
- Handle errors explicitly

#### Database Guidelines

**MongoDB**:
- Use meaningful collection and field names
- Implement proper indexing strategies
- Follow MongoDB schema design patterns

**Cassandra**:
- Design for query patterns, not normalization
- Use time-series patterns for event data
- Consider partition key distribution

#### API Design

**GraphQL**:
- Follow GraphQL best practices
- Use DataLoaders to prevent N+1 queries
- Implement proper error handling
- Document schema with descriptions

**REST**:
- Follow RESTful principles
- Use proper HTTP status codes
- Implement pagination for list endpoints
- Version APIs appropriately

### 3. Testing Requirements

All contributions must include appropriate tests:

#### Backend Testing

```bash
# Unit tests
mvn test

# Integration tests
mvn verify -P integration-tests

# Test specific service
mvn test -pl openframe/services/openframe-api
```

**Test Coverage Requirements**:
- **Unit Tests**: Minimum 80% coverage for new code
- **Integration Tests**: Critical path scenarios
- **Contract Tests**: API endpoints and GraphQL schemas

#### Frontend Testing

```bash
# Unit tests
npm run test:unit

# Component tests  
npm run test:component

# E2E tests (optional for contributions)
npm run test:e2e
```

#### Test Examples

```java
// Example: Service unit test
@ExtendWith(MockitoExtension.class)
class DeviceServiceTest {

    @Mock
    private DeviceRepository deviceRepository;

    @InjectMocks
    private DeviceService deviceService;

    @Test
    void getDevice_ValidId_ReturnsDevice() {
        // Given
        String deviceId = "device-123";
        Device mockDevice = createMockDevice(deviceId);
        when(deviceRepository.findById(deviceId))
            .thenReturn(Optional.of(mockDevice));

        // When
        Device result = deviceService.getDevice(deviceId);

        // Then
        assertThat(result.getId()).isEqualTo(deviceId);
        verify(deviceRepository).findById(deviceId);
    }
}
```

### 4. Documentation

All contributions should include relevant documentation:

- **Code Comments**: Explain complex logic and business rules
- **API Documentation**: Update GraphQL schemas and REST endpoints
- **User Documentation**: Update guides if user-facing features change
- **Architecture Docs**: Update design documents for architectural changes

## 📝 Pull Request Process

### 1. Pre-submission Checklist

Before submitting your pull request:

- [ ] **Code compiles** without warnings
- [ ] **All tests pass** locally
- [ ] **Code follows** style guidelines
- [ ] **Documentation** is updated
- [ ] **Commit messages** are descriptive
- [ ] **No sensitive data** (API keys, passwords) in commits

### 2. Commit Message Format

Use conventional commits for clear history:

```text
type(scope): brief description

Detailed explanation if needed

Fixes #123
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples**:
```text
feat(api): add device filtering by organization

Add GraphQL query support for filtering devices by organization ID.
Includes proper authorization checks and tenant isolation.

Fixes #456

fix(frontend): resolve device status update race condition

The device status was not updating correctly due to a race condition
between WebSocket updates and REST API calls.

test(client): add integration tests for heartbeat service

Ensure heartbeat messages are sent correctly and connection recovery
works as expected.
```

### 3. Pull Request Template

When creating a pull request, include:

```markdown
## Description
Brief description of the changes and why they were made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings

## Screenshots (if applicable)
Include screenshots for UI changes.

## Additional Notes
Any additional information that reviewers should know.
```

### 4. Review Process

1. **Automated Checks**: CI/CD pipeline must pass
2. **Code Review**: At least one maintainer approval required
3. **Testing**: All tests must pass
4. **Documentation**: Verify docs are complete and accurate

**Review Timeline**: We aim to review PRs within 2-3 business days. For urgent fixes, mention in our Slack community.

## 🏗️ Development Areas

### Backend Development
- **Services**: Spring Boot microservices
- **APIs**: GraphQL and REST endpoints  
- **Data**: MongoDB, Cassandra, Redis integration
- **Streaming**: Apache Kafka event processing
- **Security**: OAuth2, JWT, multi-tenancy

### Frontend Development
- **UI Components**: Vue 3 + PrimeVue components
- **State Management**: Pinia stores
- **API Integration**: GraphQL client setup
- **Responsive Design**: Mobile-friendly interfaces

### Client Development  
- **Rust Agent**: Cross-platform system monitoring
- **Communication**: WebSocket and REST clients
- **Performance**: Efficient resource monitoring
- **Deployment**: Installer and update mechanisms

### Infrastructure
- **Docker**: Container configurations
- **Kubernetes**: Deployment manifests
- **CI/CD**: GitHub Actions workflows
- **Monitoring**: Prometheus, Grafana setup

## 🎯 Contribution Ideas

### Good First Issues
- Documentation improvements
- Small bug fixes
- UI/UX enhancements
- Test coverage improvements

### Intermediate Projects
- New API endpoints
- Frontend feature additions
- Performance optimizations
- Integration improvements

### Advanced Projects
- New microservices
- Architecture improvements
- Security enhancements
- Scaling optimizations

## 📞 Getting Help

### Community Support
- **Slack Community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) - Primary community hub
- **GitHub Discussions**: Architecture and design questions
- **Documentation**: [Development guides](docs/development/README.md)

### Development Questions
1. **Check Documentation**: [Development Setup](docs/development/setup/environment.md)
2. **Search Slack**: Previous discussions may have answers
3. **Ask in Slack**: Our community is helpful and responsive
4. **Tag Maintainers**: For urgent issues, ping `@maintainers`

## 🎉 Recognition

### Contributors
All contributors are recognized in:
- **README.md**: Contributors section
- **Release Notes**: Feature attribution
- **Community Highlights**: Monthly community recognition

### Maintainer Path
Active contributors can become maintainers by:
1. **Consistent Contributions**: Regular, high-quality PRs
2. **Community Involvement**: Active in Slack and discussions
3. **Code Reviews**: Helping review others' contributions
4. **Mentorship**: Helping new contributors

## 📄 License

By contributing to OpenFrame, you agree that your contributions will be licensed under the [Flamingo AI Unified License v1.0](LICENSE.md).

---

## Thank You! 🙏

Your contributions help make OpenFrame better for everyone. Whether you're fixing a typo, adding a feature, or helping other users, your efforts are valued and appreciated.

**Ready to contribute?** Join our [Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) and introduce yourself!

---

<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> community
</div>