# Contributing to OpenFrame

Thank you for your interest in contributing to OpenFrame! We're excited to have you join our community of developers working to transform MSP operations through open-source innovation.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Community Guidelines](#community-guidelines)
- [Getting Help](#getting-help)

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have the following installed:

- **Java:** OpenJDK 21.0.1+
- **Node.js:** 18+ with npm
- **Rust:** 1.70+ with Cargo
- **Docker:** 24.0+ with Docker Compose
- **Git:** 2.42+
- **Maven:** 3.9.0+

### Understanding the Codebase

OpenFrame follows a distributed microservices architecture. Familiarize yourself with:

- **Backend Services**: Java 21 + Spring Boot 3.3
- **Frontend**: Vue 3 + TypeScript + PrimeVue
- **System Agent**: Rust + Tokio
- **APIs**: GraphQL (Netflix DGS) + REST
- **Data**: MongoDB, Redis, Kafka, Cassandra, Apache Pinot

📚 **Read the [Architecture Overview](./docs/development/architecture/overview.md)** for detailed system design.

## 🛠️ Development Setup

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/your-username/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git
```

### 2. Environment Configuration

```bash
# Set up GitHub authentication for Maven
export GITHUB_ACTOR=your-github-username
export GITHUB_TOKEN=your-github-token

# Optional: Set up local environment variables
cp .env.example .env
# Edit .env with your local configuration
```

### 3. Build and Test

```bash
# Build all backend services
mvn clean install

# Run backend tests
mvn test

# Set up frontend
cd openframe/services/openframe-frontend
npm install
npm run type-check
npm run test

# Build Rust agent
cd ../../client
cargo build
cargo test
```

### 4. Start Development Environment

```bash
# Start infrastructure services (Docker Compose)
docker-compose up -d mongodb redis kafka

# Start backend services
mvn spring-boot:run

# Start frontend development server
cd openframe/services/openframe-frontend
npm run dev
```

📚 **For detailed setup instructions, see [Development Setup Guide](./docs/development/setup/environment.md)**

## 🤝 How to Contribute

### Types of Contributions

We welcome various types of contributions:

- 🐛 **Bug Fixes**: Fix existing bugs and issues
- ✨ **New Features**: Add new functionality or capabilities
- 📚 **Documentation**: Improve documentation, guides, and examples
- 🎨 **UI/UX**: Enhance user interface and user experience
- ⚡ **Performance**: Optimize performance and scalability
- 🧪 **Tests**: Add or improve test coverage
- 🔧 **Tooling**: Improve development tools and workflows

### Finding Work

1. **Good First Issues**: Look for issues labeled `good first issue`
2. **Help Wanted**: Check issues labeled `help wanted`
3. **Feature Requests**: Browse issues labeled `enhancement`
4. **Bug Reports**: Fix issues labeled `bug`

Browse open issues: [GitHub Issues](https://github.com/flamingo-stack/openframe-oss-tenant/issues)

### Before You Start

1. **Check Existing Issues**: Ensure your contribution isn't already being worked on
2. **Create an Issue**: For new features or significant changes, create an issue first
3. **Join the Discussion**: Comment on the issue to discuss your approach
4. **Get Feedback**: Wait for maintainer feedback before starting large changes

## 📝 Coding Standards

### Java/Spring Boot

```java
// Use Spring Boot conventions
@RestController
@RequestMapping("/api/v1/devices")
public class DeviceController {
    
    private final DeviceService deviceService;
    
    // Constructor injection preferred
    public DeviceController(DeviceService deviceService) {
        this.deviceService = deviceService;
    }
    
    // Use descriptive method names
    @GetMapping("/{deviceId}")
    public ResponseEntity<DeviceDto> getDeviceById(@PathVariable String deviceId) {
        // Implementation
    }
}
```

**Java Guidelines:**
- Follow [Google Java Style Guide](https://google.github.io/styleguide/javaguide.html)
- Use meaningful variable and method names
- Add comprehensive JavaDoc for public APIs
- Write unit tests for all business logic
- Use Spring Boot conventions and annotations

### Vue.js/TypeScript

```typescript
<!-- Use Composition API with TypeScript -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Device } from '@/types/device'

interface Props {
  deviceId: string
}

const props = defineProps<Props>()
const device = ref<Device | null>(null)

const isOnline = computed(() => device.value?.status === 'online')

onMounted(async () => {
  await loadDevice()
})

async function loadDevice() {
  // Implementation
}
</script>
```

**Frontend Guidelines:**
- Use TypeScript for type safety
- Follow Vue 3 Composition API patterns
- Use PrimeVue components consistently
- Write unit tests for components
- Follow accessibility (a11y) best practices

### Rust

```rust
// Use descriptive struct and function names
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceHeartbeat {
    pub device_id: String,
    pub timestamp: DateTime<Utc>,
    pub cpu_usage: f64,
    pub memory_usage: f64,
}

impl DeviceHeartbeat {
    /// Creates a new device heartbeat with current system metrics
    pub fn new(device_id: String) -> Result<Self, HeartbeatError> {
        // Implementation
    }
    
    /// Validates heartbeat data before transmission
    pub fn validate(&self) -> Result<(), ValidationError> {
        // Implementation
    }
}
```

**Rust Guidelines:**
- Follow [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- Use `cargo fmt` and `cargo clippy`
- Write comprehensive documentation
- Add unit and integration tests
- Handle errors explicitly with `Result` types

### General Guidelines

- **Commit Messages**: Use [Conventional Commits](https://www.conventionalcommits.org/)
- **Code Formatting**: Use language-specific formatters (Prettier, rustfmt, Google Java Format)
- **Documentation**: Update documentation for any user-facing changes
- **Tests**: Maintain or improve test coverage
- **Security**: Follow security best practices, never commit secrets

## 🔄 Pull Request Process

### 1. Create a Feature Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name
# or for bug fixes
git checkout -b fix/issue-description
```

### 2. Make Your Changes

- Write clean, well-documented code
- Add or update tests as needed
- Update documentation if required
- Follow coding standards for the language

### 3. Test Your Changes

```bash
# Run all tests
mvn test                          # Java tests
npm run test                      # Frontend tests
cargo test                        # Rust tests

# Check code formatting
mvn spotless:check               # Java formatting
npm run format:check            # Frontend formatting
cargo fmt --check               # Rust formatting

# Check for issues
mvn spotless:apply              # Fix Java formatting
npm run format                  # Fix frontend formatting
cargo clippy                    # Rust linting
```

### 4. Commit Your Changes

```bash
# Stage your changes
git add .

# Commit with descriptive message
git commit -m "feat: add device heartbeat monitoring

- Add DeviceHeartbeat struct for system metrics
- Implement heartbeat validation and transmission
- Add unit tests for heartbeat functionality
- Update API documentation

Closes #123"
```

### 5. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create pull request on GitHub
# Fill out the pull request template completely
```

### Pull Request Guidelines

**Title Format:**
```text
type(scope): description

Examples:
feat(api): add device management endpoints
fix(frontend): resolve login redirect issue
docs(readme): update installation instructions
```

**Description Requirements:**
- Clear description of changes made
- Link to related issues (`Closes #123`, `Fixes #456`)
- Screenshots for UI changes
- Breaking changes highlighted
- Testing instructions

**Review Process:**
1. **Automated Checks**: All CI/CD checks must pass
2. **Code Review**: At least one maintainer approval required
3. **Testing**: Manual testing for significant features
4. **Documentation**: Ensure docs are updated if needed

## 🐛 Issue Reporting

### Bug Reports

When reporting bugs, please include:

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g. Windows 10, macOS 12.1, Ubuntu 20.04]
- Browser: [e.g. Chrome 98, Firefox 97]
- OpenFrame Version: [e.g. 1.2.3]
- Java Version: [e.g. OpenJDK 21.0.1]

**Additional context**
Any other context about the problem.
```

### Feature Requests

For feature requests, include:

- **Problem Statement**: What problem does this solve?
- **Proposed Solution**: How should it work?
- **Alternatives**: Other solutions considered
- **Use Cases**: Who would benefit and how?
- **Implementation Ideas**: Technical approach (optional)

## 🌟 Community Guidelines

### Code of Conduct

We follow the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/). Please:

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different opinions and approaches

### Communication Channels

- **GitHub Issues**: Bug reports, feature requests, technical discussions
- **Pull Requests**: Code review and collaboration
- **Slack Community**: [Join OpenMSP](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for real-time chat
- **GitHub Discussions**: General questions and community discussions

> **Note**: We do **not** use GitHub Issues or GitHub Discussions for support. All community interaction happens on our [OpenMSP Slack Community](https://www.openmsp.ai/).

## 🆘 Getting Help

### Documentation

- **[Getting Started Guide](./docs/getting-started/introduction.md)** - New to OpenFrame?
- **[Development Guide](./docs/development/README.md)** - Setting up your dev environment
- **[Architecture Overview](./docs/development/architecture/overview.md)** - Understanding the system
- **[API Documentation](./docs/reference/README.md)** - API references and examples

### Community Support

- **Slack Community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
  - `#general` - General discussions
  - `#development` - Development help
  - `#openframe` - OpenFrame-specific questions

### Mentorship

New contributors are welcome! If you're looking for:

- **First Contribution**: Look for `good first issue` labels
- **Mentorship**: Ask in Slack for a mentor assignment
- **Pair Programming**: Join community coding sessions

## 🎯 Development Workflow

### Branch Strategy

```text
main
├── develop (integration branch)
├── feature/feature-name (your work)
├── hotfix/critical-fix (urgent fixes)
└── release/v1.x.x (release preparation)
```

### Release Process

1. **Feature Development**: Work on feature branches
2. **Integration**: Merge to develop branch
3. **Testing**: QA testing on develop
4. **Release**: Create release branch and deploy
5. **Hotfixes**: Direct fixes to main for critical issues

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Incompatible API changes
- **MINOR**: New functionality (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

## 📊 Project Metrics

We track various metrics to ensure project health:

- **Code Coverage**: Aim for >80% test coverage
- **Performance**: Response times <200ms (P95)
- **Security**: Regular dependency updates and security scans
- **Documentation**: Keep docs up-to-date with code changes

## 🏆 Recognition

We believe in recognizing our contributors:

- **Contributors Page**: Listed on project contributors page
- **Release Notes**: Contributions highlighted in releases
- **Community Shoutouts**: Recognition in community channels
- **Maintainer Path**: Opportunity to become a project maintainer

## 📞 Contact

- **Email**: development@flamingo.run
- **Slack**: [OpenMSP Community](https://www.openmsp.ai/)
- **Website**: [https://www.flamingo.run](https://www.flamingo.run)

---

**Ready to contribute?** 

1. 🍴 Fork the repository
2. 🔧 Set up your development environment
3. 🎯 Pick an issue or feature to work on
4. 💬 Join our [Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
5. 🚀 Start coding!

Thank you for helping make OpenFrame better for everyone! 💛