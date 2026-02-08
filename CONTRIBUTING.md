# Contributing to OpenFrame OSS Tenant

Thank you for your interest in contributing to OpenFrame! This guide will help you get started with contributing to the OpenFrame OSS Tenant repository.

## 🌟 Welcome Contributors

OpenFrame is an open-source MSP platform built by the community, for the community. Whether you're fixing bugs, adding features, improving documentation, or sharing ideas, your contributions are valuable and appreciated.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Community Guidelines](#community-guidelines)
- [Getting Help](#getting-help)

## 📜 Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please read and follow our community guidelines:

### Our Standards

- **Be respectful**: Treat everyone with respect and kindness
- **Be inclusive**: Welcome diverse perspectives and experiences  
- **Be collaborative**: Work together constructively
- **Be professional**: Maintain a professional demeanor in all interactions
- **Be patient**: Help newcomers learn and grow

### Enforcement

Instances of unacceptable behavior may be reported to the community leaders responsible for enforcement at **community@flamingo.run**. All complaints will be reviewed and investigated promptly and fairly.

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have the required tools installed:

- **Java**: OpenJDK 21.0.1+ 
- **Node.js**: 18+ with npm
- **Docker**: 24.0+ with Docker Compose
- **Git**: 2.42+
- **Maven**: 3.8+

### Development Setup

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
   cd openframe-oss-tenant
   ```

2. **Set Up Authentication**
   ```bash
   # Required for Maven dependencies from GitHub Packages
   export GITHUB_ACTOR=your-github-username
   export GITHUB_TOKEN=your-github-token
   ```

3. **Install Dependencies**
   ```bash
   # Backend dependencies
   mvn clean install
   
   # Frontend dependencies
   cd openframe/services/openframe-frontend
   npm install
   ```

4. **Start Development Environment**
   ```bash
   # Start infrastructure services
   docker-compose up -d kafka mongodb redis cassandra
   
   # Start backend services in development mode
   mvn spring-boot:run -pl openframe-gateway
   mvn spring-boot:run -pl openframe-api
   
   # Start frontend development server
   cd openframe/services/openframe-frontend
   npm run dev
   ```

5. **Verify Setup**
   - Frontend: http://localhost:3000
   - API Gateway: http://localhost:8080
   - GraphQL Playground: http://localhost:8081/graphql

## 🔄 Development Workflow

### Branch Strategy

We use a **GitHub Flow** approach with feature branches:

- **`main`**: Production-ready code (protected)
- **`feature/*`**: New features and enhancements
- **`bugfix/*`**: Bug fixes and patches
- **`docs/*`**: Documentation improvements
- **`refactor/*`**: Code refactoring without functional changes

### Workflow Steps

1. **Create a Feature Branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Follow our [coding standards](#coding-standards)
   - Add tests for new functionality
   - Update documentation as needed

3. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Open a Pull Request on GitHub
   ```

### Commit Message Convention

We follow **Conventional Commits** for clear, automated changelog generation:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix  
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(api): add device filtering endpoint
fix(auth): resolve JWT token expiration issue
docs(readme): update installation instructions
test(gateway): add integration tests for routing
```

## 🎨 Coding Standards

### Java Backend Standards

**Code Style:**
- Use **Java 21** features appropriately
- Follow **Google Java Style Guide** with minor modifications
- Use **4 spaces** for indentation (no tabs)
- **Maximum line length**: 120 characters
- Use **meaningful variable and method names**

**Architecture Guidelines:**
- Follow **Domain-Driven Design** principles
- Use **dependency injection** via Spring Boot
- Implement proper **error handling** with custom exceptions
- Add **logging** at appropriate levels (INFO, DEBUG, ERROR)

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
    public ResponseEntity<DeviceDto> getDevice(
            @PathVariable String deviceId,
            @AuthenticationPrincipal UserPrincipal user) {
        
        log.debug("Fetching device {} for user {}", deviceId, user.getUsername());
        
        try {
            DeviceDto device = deviceService.getDeviceById(deviceId, user.getOrganizationId());
            return ResponseEntity.ok(device);
        } catch (DeviceNotFoundException e) {
            log.warn("Device not found: {}", deviceId);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Device not found");
        }
    }
}
```

### Frontend Standards

**Vue.js Guidelines:**
- Use **Vue 3 Composition API** with TypeScript
- Follow **Vue Style Guide** (Priority A rules strictly)
- Use **PrimeVue** components for UI consistency
- Implement **reactive patterns** appropriately

**TypeScript Standards:**
- Enable **strict mode** in TypeScript configuration
- Use **explicit types** for function parameters and returns
- Avoid **any** type - use proper typing
- Use **interfaces** for object type definitions

**Example:**
```typescript
<template>
  <div class="device-list">
    <DataTable 
      :value="devices" 
      :loading="loading"
      @row-select="onDeviceSelect">
      <Column field="name" header="Device Name" />
      <Column field="status" header="Status">
        <template #body="{ data }">
          <Tag :severity="getStatusSeverity(data.status)">
            {{ data.status }}
          </Tag>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useDeviceApi } from '@/composables/useDeviceApi'
import type { Device } from '@/types/device'

interface DeviceListProps {
  organizationId: string
}

const props = defineProps<DeviceListProps>()

const devices = ref<Device[]>([])
const loading = ref(false)
const deviceApi = useDeviceApi()

const loadDevices = async (): Promise<void> => {
  loading.value = true
  try {
    devices.value = await deviceApi.getDevices(props.organizationId)
  } catch (error) {
    console.error('Failed to load devices:', error)
  } finally {
    loading.value = false
  }
}

const onDeviceSelect = (event: { data: Device }): void => {
  // Handle device selection
}

const getStatusSeverity = (status: string): string => {
  switch (status) {
    case 'ONLINE': return 'success'
    case 'OFFLINE': return 'danger'
    default: return 'warning'
  }
}

onMounted(() => {
  loadDevices()
})
</script>
```

### Documentation Standards

- Use **clear, concise language**
- Include **code examples** where helpful
- Add **diagrams** for complex concepts using Mermaid
- Keep **README files** up to date
- Document **API changes** in pull requests

## 🧪 Testing Guidelines

### Backend Testing

**Test Structure:**
- **Unit Tests**: Test individual classes and methods
- **Integration Tests**: Test service interactions
- **End-to-End Tests**: Test complete user workflows

**Testing Tools:**
- **JUnit 5** for unit and integration tests
- **Mockito** for mocking dependencies
- **TestContainers** for integration testing with real databases
- **WebMvcTest** for controller testing

**Example Unit Test:**
```java
@ExtendWith(MockitoExtension.class)
class DeviceServiceTest {

    @Mock
    private DeviceRepository deviceRepository;
    
    @Mock
    private OrganizationService organizationService;
    
    @InjectMocks
    private DeviceService deviceService;

    @Test
    @DisplayName("Should return device when found by ID and organization")
    void shouldReturnDeviceWhenFound() {
        // Given
        String deviceId = "device-123";
        String orgId = "org-456";
        Device expectedDevice = createTestDevice(deviceId, orgId);
        
        when(deviceRepository.findByIdAndOrganizationId(deviceId, orgId))
            .thenReturn(Optional.of(expectedDevice));

        // When
        DeviceDto result = deviceService.getDeviceById(deviceId, orgId);

        // Then
        assertThat(result.getId()).isEqualTo(deviceId);
        assertThat(result.getOrganizationId()).isEqualTo(orgId);
        verify(deviceRepository).findByIdAndOrganizationId(deviceId, orgId);
    }
}
```

### Frontend Testing

**Testing Tools:**
- **Vitest** for unit and component tests
- **Vue Test Utils** for component testing
- **Cypress** for end-to-end tests

**Example Component Test:**
```typescript
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import DeviceCard from '@/components/DeviceCard.vue'
import type { Device } from '@/types/device'

describe('DeviceCard', () => {
  const mockDevice: Device = {
    id: 'device-123',
    name: 'Test Device',
    status: 'ONLINE',
    organizationId: 'org-456'
  }

  it('should display device information', () => {
    const wrapper = mount(DeviceCard, {
      props: { device: mockDevice }
    })

    expect(wrapper.text()).toContain('Test Device')
    expect(wrapper.text()).toContain('ONLINE')
  })

  it('should emit select event when clicked', async () => {
    const wrapper = mount(DeviceCard, {
      props: { device: mockDevice }
    })

    await wrapper.trigger('click')

    expect(wrapper.emitted('select')).toHaveLength(1)
    expect(wrapper.emitted('select')?.[0]).toEqual([mockDevice])
  })
})
```

### Running Tests

```bash
# Backend tests
mvn test                           # All tests
mvn test -Dtest=DeviceServiceTest  # Specific test class

# Frontend tests
cd openframe/services/openframe-frontend
npm run test                       # Unit tests
npm run test:e2e                   # End-to-end tests
npm run test:coverage             # Coverage report
```

**Test Coverage Requirements:**
- **Minimum 80%** code coverage for new features
- **All critical paths** must have tests
- **Integration tests** for API endpoints
- **Component tests** for UI interactions

## 🔀 Pull Request Process

### Before Submitting

1. **Ensure tests pass**:
   ```bash
   mvn test
   npm run test
   ```

2. **Verify code quality**:
   ```bash
   mvn clean compile   # Check Java compilation
   npm run type-check  # Check TypeScript types
   npm run lint        # Check code style
   ```

3. **Update documentation** if needed

4. **Add/update tests** for new functionality

### PR Template

When creating a pull request, include:

```markdown
## Description
Brief description of the changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)  
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
Include screenshots for UI changes.

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Review Process

1. **Automated Checks**: All CI checks must pass
2. **Peer Review**: At least one approving review required
3. **Maintainer Review**: Core team member final approval
4. **Merge**: Squash and merge to main branch

## 💬 Community Guidelines

### Communication Channels

- **💬 Slack**: [OpenMSP Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) - Daily discussions, questions, announcements
- **📋 GitHub Issues**: Bug reports, feature requests, technical discussions
- **📧 Email**: security@flamingo.run for security issues

### Issue Management

**Before Opening an Issue:**
1. **Search existing issues** to avoid duplicates
2. **Check documentation** for known solutions
3. **Use appropriate labels** (bug, enhancement, question, etc.)

**Issue Templates:**
- **Bug Report**: Include reproduction steps, expected behavior, environment details
- **Feature Request**: Describe the problem and proposed solution
- **Question**: Ask specific questions with context

### Code Review Guidelines

**For Contributors:**
- **Be open to feedback** and constructive criticism
- **Respond promptly** to review comments
- **Make requested changes** or explain why they're not necessary
- **Test thoroughly** before requesting review

**For Reviewers:**
- **Be respectful and constructive** in feedback
- **Focus on code quality**, not personal preferences
- **Provide specific, actionable suggestions**
- **Acknowledge good work** and improvements

## 🆘 Getting Help

### Documentation

- **[Getting Started Guide](./docs/getting-started/introduction.md)**: Basic concepts and setup
- **[Architecture Overview](./docs/development/architecture/overview.md)**: System design and components
- **[Development Setup](./docs/development/setup/environment.md)**: Detailed setup instructions

### Support Channels

1. **OpenMSP Slack** - Best for:
   - Quick questions and discussions
   - Getting help with setup issues
   - Connecting with other contributors

2. **GitHub Issues** - Best for:
   - Bug reports with detailed reproduction steps
   - Feature requests with clear requirements
   - Technical discussions about implementation

3. **Email Support** - For:
   - Security vulnerabilities: security@flamingo.run
   - Community issues: community@flamingo.run
   - Enterprise support: contact@flamingo.run

### Mentorship Program

New contributors can request mentorship:
- **Slack**: Ask in #contributors channel
- **GitHub**: Comment on beginner-friendly issues
- **Email**: community@flamingo.run

## 🏆 Recognition

We appreciate all contributors! Your contributions will be recognized:

- **GitHub Contributors** page
- **Release notes** for significant contributions  
- **Community spotlights** in newsletters
- **Contributor badges** and achievements

## 📄 License

By contributing to OpenFrame, you agree that your contributions will be licensed under the [Flamingo AI Unified License v1.0](LICENSE.md).

---

## Thank You! 🙏

Thank you for contributing to OpenFrame and helping build the future of MSP platforms. Together, we're making IT operations more efficient, cost-effective, and intelligent for MSPs worldwide.

**Happy Contributing!** 🚀

---

<div align="center">
  Questions? Reach out on <a href="https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA"><b>OpenMSP Slack</b></a> or email <a href="mailto:community@flamingo.run"><b>community@flamingo.run</b></a>
</div>