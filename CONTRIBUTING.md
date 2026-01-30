# Contributing to OpenFrame

Thank you for your interest in contributing to OpenFrame! This guide will help you get started with contributing to the AI-powered MSP platform that revolutionizes IT operations.

## 🌟 Welcome Contributors

OpenFrame is built by and for the MSP community. Whether you're fixing bugs, adding features, improving documentation, or helping other users, every contribution makes a difference.

### Types of Contributions

We welcome all kinds of contributions:

| Type | Description | Getting Started |
|------|-------------|----------------|
| **🐛 Bug Fixes** | Fix issues and improve stability | Browse `#bugs` in Slack |
| **✨ Features** | Add new functionality | Discuss in `#features` first |
| **📚 Documentation** | Improve guides and API docs | Check docs marked incomplete |
| **🧪 Testing** | Add tests and improve coverage | Review test gaps |
| **🎨 UI/UX** | Enhance user experience | Share designs in `#design` |
| **⚡ Performance** | Optimize code and queries | Profile bottlenecks first |

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- ✅ **Development Environment**: Complete [environment setup](./docs/development/setup/environment.md)
- ✅ **GitHub Account**: With repository access for pull requests
- ✅ **Slack Access**: Join [OpenMSP Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- ✅ **Technical Knowledge**: Basic understanding of the [architecture](./docs/development/architecture/overview.md)

### Development Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/YOUR-USERNAME/openframe-oss-tenant.git
cd openframe-oss-tenant

# 2. Set up environment variables
export GITHUB_ACTOR=your-github-username
export GITHUB_TOKEN=your-github-token

# 3. Start infrastructure services
docker-compose up -d mongodb kafka consul redis

# 4. Build the project
mvn clean install

# 5. Verify setup
./scripts/verify-setup.sh
```

## 📋 Contribution Process

### 1. Planning Your Contribution

**Start with Discussion**
- 💬 Join relevant Slack channels:
  - `#features` - New functionality
  - `#bugs` - Bug reports and fixes
  - `#docs` - Documentation improvements
  - `#dev-help` - Technical questions

**Identify or Create Issues**
- Check existing discussions in Slack
- For bugs: Include reproduction steps, environment, logs
- For features: Describe problem, solution, acceptance criteria
- Get feedback before significant work

### 2. Development Workflow

**Create Feature Branch**
```bash
# Update main branch
git checkout main
git pull origin main

# Create descriptive branch
git checkout -b feature/device-status-indicators
git checkout -b fix/auth-timeout-bug
git checkout -b docs/api-reference-update
```

**Branch Naming Convention**
- `feature/brief-description` - New functionality
- `fix/brief-description` - Bug fixes
- `docs/brief-description` - Documentation updates
- `chore/brief-description` - Maintenance tasks

### 3. Code Standards

#### Java Services (Spring Boot)

```java
@Service
@Transactional
@Slf4j
public class DeviceService {
    
    private final DeviceRepository deviceRepository;
    private final EventPublisher eventPublisher;
    
    // Constructor injection preferred
    public DeviceService(DeviceRepository deviceRepository, 
                        EventPublisher eventPublisher) {
        this.deviceRepository = deviceRepository;
        this.eventPublisher = eventPublisher;
    }
    
    /**
     * Updates device status and publishes change event.
     * 
     * @param deviceId unique device identifier
     * @param status new device status
     * @return updated device
     * @throws DeviceNotFoundException if device not found
     */
    public Device updateDeviceStatus(String deviceId, DeviceStatus status) {
        log.info("Updating device status: deviceId={}, status={}", deviceId, status);
        
        Device device = deviceRepository.findById(deviceId)
            .orElseThrow(() -> new DeviceNotFoundException(deviceId));
            
        DeviceStatus previousStatus = device.getStatus();
        device.setStatus(status);
        device.setLastUpdated(Instant.now());
        
        Device savedDevice = deviceRepository.save(device);
        eventPublisher.publishDeviceStatusChanged(deviceId, previousStatus, status);
        
        return savedDevice;
    }
}
```

#### Vue.js/TypeScript Frontend

```vue
<template>
  <div 
    :class="statusClasses"
    :data-testid="`device-status-${device.id}`"
    @click="handleClick"
  >
    <Icon :name="statusIcon" :size="16" />
    <span class="ml-2 text-sm font-medium">{{ statusText }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Device } from '@/types/device'

interface Props {
  device: Device
  interactive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  interactive: false
})

const emit = defineEmits<{
  click: [device: Device]
}>()

const statusClasses = computed(() => {
  const base = 'flex items-center px-3 py-1 rounded-full'
  const interactive = props.interactive ? 'cursor-pointer hover:opacity-80' : ''
  const statusColor = {
    ONLINE: 'bg-green-100 text-green-800',
    OFFLINE: 'bg-red-100 text-red-800',
    MAINTENANCE: 'bg-yellow-100 text-yellow-800'
  }[props.device.status] || 'bg-gray-100 text-gray-800'
  
  return `${base} ${interactive} ${statusColor}`
})

const handleClick = () => {
  if (props.interactive) {
    emit('click', props.device)
  }
}
</script>
```

#### Rust Client Code

```rust
use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use tokio::time::{Duration, sleep};
use tracing::{info, error};

/// Device status monitoring service
pub struct DeviceStatusService {
    api_client: Box<dyn ApiClient + Send + Sync>,
    config: MonitoringConfig,
}

impl DeviceStatusService {
    pub fn new(api_client: Box<dyn ApiClient + Send + Sync>, config: MonitoringConfig) -> Self {
        Self { api_client, config }
    }
    
    /// Start continuous device monitoring
    pub async fn start_monitoring(&self, device_id: &str) -> Result<()> {
        info!("Starting device monitoring: {}", device_id);
        
        loop {
            if let Err(e) = self.send_heartbeat(device_id).await {
                error!("Heartbeat failed for {}: {}", device_id, e);
            }
            
            sleep(self.config.heartbeat_interval).await;
        }
    }
    
    async fn send_heartbeat(&self, device_id: &str) -> Result<()> {
        let heartbeat = HeartbeatMessage {
            device_id: device_id.to_string(),
            timestamp: chrono::Utc::now(),
            status: self.get_current_status().await?,
        };
        
        self.api_client
            .send_heartbeat(&heartbeat)
            .await
            .context("Failed to send heartbeat")?;
            
        Ok(())
    }
}
```

### 4. Testing Requirements

All contributions must include appropriate tests:

**Test Coverage Standards**
- **Unit Tests**: 80%+ coverage for business logic
- **Integration Tests**: Database/API interactions
- **Component Tests**: Frontend UI components
- **E2E Tests**: Critical user workflows (for major features)

**Running Tests**
```bash
# Java unit tests
mvn test

# Integration tests
mvn verify -P integration-tests

# Frontend tests
cd openframe/services/openframe-frontend
npm run test:unit
npm run test:e2e

# Rust tests
cd clients/openframe-client
cargo test

# All tests
./scripts/test-all.sh
```

**Test Examples**

```java
@ExtendWith(MockitoExtension.class)
class DeviceServiceTest {
    
    @Mock private DeviceRepository deviceRepository;
    @Mock private EventPublisher eventPublisher;
    @InjectMocks private DeviceService deviceService;
    
    @Test
    @DisplayName("Should update device status and publish event")
    void shouldUpdateDeviceStatusAndPublishEvent() {
        // Given
        Device device = createTestDevice("device-1", DeviceStatus.OFFLINE);
        when(deviceRepository.findById("device-1")).thenReturn(Optional.of(device));
        when(deviceRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        
        // When
        Device result = deviceService.updateDeviceStatus("device-1", DeviceStatus.ONLINE);
        
        // Then
        assertThat(result.getStatus()).isEqualTo(DeviceStatus.ONLINE);
        verify(eventPublisher).publishDeviceStatusChanged("device-1", 
                                                         DeviceStatus.OFFLINE, 
                                                         DeviceStatus.ONLINE);
    }
}
```

### 5. Documentation Standards

**Code Documentation**
- Add JavaDoc for public methods and classes
- Include JSDoc for TypeScript functions
- Document Rust modules and public APIs
- Explain complex business logic with comments

**README Updates**
- Update feature lists for new functionality
- Add configuration examples
- Include API usage examples
- Update installation instructions if needed

**API Documentation**
- Document new GraphQL fields and mutations
- Add REST endpoint examples
- Include request/response schemas
- Update OpenAPI specifications

## 📤 Pull Request Process

### Creating a Pull Request

1. **Ensure Branch is Current**
   ```bash
   git checkout main
   git pull origin main
   git checkout your-feature-branch
   git rebase main
   ```

2. **Push and Create PR**
   ```bash
   git push origin your-feature-branch
   # Go to GitHub and create pull request
   ```

3. **Use PR Template**
   Fill out all sections of the pull request template:
   - Description of changes
   - Type of change (bug fix, feature, etc.)
   - Testing performed
   - Breaking changes (if any)
   - Screenshots/demos (if applicable)

### PR Review Process

**Automated Checks** (must pass):
- ✅ CI pipeline builds successfully
- ✅ All tests pass
- ✅ Code formatting is correct
- ✅ Security scans pass
- ✅ Coverage thresholds met

**Human Review** (at least 1 reviewer):
- ✅ Code quality and readability
- ✅ Architecture alignment
- ✅ Test coverage adequacy
- ✅ Documentation completeness
- ✅ Performance impact

**Merge Requirements**:
- All automated checks pass
- At least one approving review
- No unresolved review comments
- CI pipeline is green

## 🎯 Commit Message Standards

We use [Conventional Commits](https://www.conventionalcommits.org/) for clear commit history:

### Format
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(api): add device filtering by status` |
| `fix` | Bug fix | `fix(auth): resolve JWT expiration handling` |
| `docs` | Documentation | `docs(readme): update installation guide` |
| `style` | Code formatting | `style(frontend): fix ESLint warnings` |
| `refactor` | Code refactoring | `refactor(service): simplify device queries` |
| `test` | Test additions | `test(device): add status update tests` |
| `chore` | Maintenance | `chore(deps): update Spring Boot to 3.3.0` |

### Examples

**Good Commits**
```bash
feat(device): implement real-time status updates

Add WebSocket support for live device status changes in the dashboard.
Users now see immediate updates without page refresh.

- Add WebSocket service with reconnection logic
- Update DeviceCard component for real-time display
- Add integration tests for status broadcasting

Closes #123

fix(auth): handle concurrent session cleanup

Previously, multiple simultaneous logouts could cause race conditions
in session cleanup, leaving stale sessions in Redis.

- Add distributed locking for session operations
- Implement proper cleanup ordering
- Add tests for concurrent session handling

Fixes #456
```

## 🛠️ Development Best Practices

### Code Quality

**General Guidelines**
- Follow SOLID principles
- Write self-documenting code
- Use meaningful variable and method names
- Keep functions focused and small
- Handle errors gracefully with proper logging

**Performance Considerations**
- Optimize database queries with proper indexing
- Implement cursor-based pagination for large datasets
- Use caching strategically (Redis, in-memory)
- Monitor and profile performance bottlenecks
- Consider async processing for heavy operations

**Security Best Practices**
- Validate all user inputs
- Use parameterized queries to prevent SQL injection
- Implement proper authentication and authorization
- Don't log sensitive information
- Follow OWASP security guidelines

### Project Structure

**Java Services**
```
src/main/java/com/openframe/{service}/
├── controller/          # HTTP/GraphQL endpoints
├── service/            # Business logic layer
├── repository/         # Data access layer
├── dto/               # Data transfer objects
├── entity/            # Database entities
├── config/            # Configuration classes
├── exception/         # Custom exceptions
└── util/              # Utility classes
```

**Frontend Structure**
```
src/
├── components/        # Reusable Vue components
├── composables/       # Vue composition functions
├── pages/            # Route-based page components
├── stores/           # Pinia state management
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
├── services/         # API client services
└── assets/           # Static assets
```

## 🐛 Bug Reports

When reporting bugs, include:

**Required Information**
- **Environment**: OS, browser, versions
- **Steps to Reproduce**: Detailed reproduction steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Logs**: Relevant error messages and stack traces
- **Screenshots**: Visual issues or error dialogs

**Bug Report Template**
```markdown
## Bug Description
Brief description of the bug

## Environment
- OS: [e.g., macOS 14.2]
- Browser: [e.g., Chrome 120.0]
- OpenFrame Version: [e.g., 1.2.0]
- Java Version: [e.g., 21.0.1]

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
Describe what you expected to happen

## Actual Behavior
Describe what actually happened

## Logs/Screenshots
Include relevant logs, error messages, or screenshots

## Additional Context
Any other context about the problem
```

## 💡 Feature Requests

For new features, consider:

**Feature Planning**
- **Problem Statement**: What problem does this solve?
- **Proposed Solution**: How would you implement this?
- **Alternatives**: What other approaches were considered?
- **User Impact**: Who benefits and how?
- **Implementation Effort**: Rough complexity estimate

**Feature Request Process**
1. **Discuss in Slack**: Start conversation in `#features`
2. **Gather Feedback**: Get community input and validation  
3. **Create Design Doc**: For larger features, create technical design
4. **Implementation Plan**: Break down into manageable tasks
5. **Code and Test**: Implement with comprehensive testing

## 🎨 UI/UX Contributions

For user interface improvements:

**Design Guidelines**
- Follow existing design system and patterns
- Ensure accessibility (WCAG 2.1 AA compliance)
- Test on multiple screen sizes and devices
- Consider dark mode and light mode support
- Maintain consistent spacing and typography

**Asset Requirements**
- Use SVG icons when possible
- Optimize images for web (WebP format preferred)
- Include high-DPI versions of raster images
- Follow naming conventions for assets

## 🔧 Infrastructure & DevOps

Infrastructure contributions are welcome:

**Areas of Focus**
- Docker and containerization improvements
- Kubernetes deployment optimizations
- CI/CD pipeline enhancements
- Monitoring and alerting setup
- Database performance tuning
- Security hardening

**Guidelines**
- Test changes in isolated environments first
- Document configuration changes thoroughly
- Consider backward compatibility
- Monitor resource usage and performance impact

## 📊 Analytics & Monitoring

Help improve OpenFrame's observability:

**Metrics and Monitoring**
- Add meaningful application metrics
- Improve health check implementations
- Enhance log correlation and tracing
- Create useful Grafana dashboards
- Set up appropriate alerting rules

**Performance Analytics**
- Profile application bottlenecks
- Analyze database query performance
- Monitor API response times
- Track user experience metrics

## 🌐 Community Support

Help other community members:

**Ways to Help**
- Answer questions in Slack channels
- Review and test pull requests
- Improve documentation based on user feedback
- Create tutorials and how-to guides
- Share best practices and tips

**Community Guidelines**
- Be respectful and welcoming to all contributors
- Provide constructive feedback
- Help newcomers get started
- Share knowledge and learn from others
- Follow our [Code of Conduct](https://www.flamingo.run/code-of-conduct)

## 🚀 Getting Your First Contribution Merged

**For New Contributors**

1. **Start Small**: Pick a "good first issue" from Slack discussions
2. **Ask Questions**: Don't hesitate to ask for help in `#dev-help`
3. **Follow Guidelines**: Use this guide and read existing code
4. **Test Thoroughly**: Ensure your changes work as expected
5. **Be Patient**: Review process helps maintain code quality

**First Contribution Ideas**
- Fix typos in documentation
- Add missing unit tests
- Improve error messages
- Add configuration examples
- Update dependencies

## 📞 Getting Help

**Before Asking for Help**
- ✅ Check existing documentation
- ✅ Search Slack conversation history  
- ✅ Review similar issues and PRs
- ✅ Try debugging with logs and tests

**When You Need Help**
- **General Questions**: `#general` channel in Slack
- **Technical Help**: `#dev-help` channel
- **Bug Reports**: `#bugs` channel  
- **Feature Discussion**: `#features` channel
- **UI/UX Feedback**: `#design` channel

**Providing Context**
When asking for help, include:
- What you're trying to accomplish
- What you've already tried
- Relevant error messages or logs
- Your environment details
- Code snippets (use formatting)

## 🏆 Recognition

We appreciate all contributors! Ways we recognize contributions:

**Contributor Rewards**
- **First Contribution**: Welcome package and Slack recognition
- **Regular Contributor** (5+ PRs): Contributor badge and early access
- **Core Contributor** (20+ PRs): Direct maintainer access
- **Maintainer**: Repository permissions and design input

**Annual Recognition**
- Contributor spotlight in community updates
- Conference speaking opportunities
- Special recognition at community events
- Exclusive contributor swag and rewards

## 📈 Metrics and Analytics

Help us track contribution health:

**Contribution Metrics**
- Code contributions (lines, complexity)
- Documentation improvements
- Community support (helping others)
- Review participation
- Bug reports and feature suggestions

**Community Health**
- Response time to new contributors
- Pull request merge time
- Issue resolution rate
- Community engagement levels

## 🗺️ Contribution Roadmap

**Current Priorities**
- 🔧 Backend API improvements and optimizations
- 🎨 Frontend user experience enhancements
- 📚 Documentation completeness and clarity
- 🧪 Test coverage improvements
- 🔒 Security hardening and compliance

**Upcoming Focus Areas**
- 🤖 AI/ML integration features
- 📱 Mobile application development
- 🌐 Multi-region deployment support
- 🔍 Advanced analytics and reporting
- 🛠️ Developer tooling improvements

---

## 🎉 Ready to Contribute?

We're excited to have you as part of the OpenFrame community!

### Next Steps

1. **🔗 Join our Community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
2. **🛠️ Set Up Environment**: Follow the [setup guide](./docs/development/setup/environment.md)
3. **🎯 Find Your First Issue**: Browse `#good-first-issue` discussions
4. **💬 Introduce Yourself**: Say hi in `#introductions` channel
5. **🚀 Make Your First PR**: Start with documentation or small fixes

### Resources

- **📖 Documentation**: [Complete guides](./docs/README.md)
- **🏗️ Architecture**: [System overview](./docs/development/architecture/overview.md)
- **🧪 Testing**: [Testing guide](./docs/development/testing/overview.md)
- **🎨 UI Guidelines**: [Design system documentation](./docs/development/frontend/design-system.md)

---

**Thank you for contributing to OpenFrame!** 🙏

Together, we're building the future of open-source MSP operations. Every contribution, no matter how small, makes a difference in helping MSP providers worldwide.

*Built with 💛 by the OpenFrame community*