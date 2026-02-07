# Contributing to OpenFrame OSS Tenant

Thank you for considering contributing to OpenFrame! We're excited to work with you to build the future of open-source MSP platforms.

## 🌟 Welcome Contributors

OpenFrame is a community-driven project that benefits from diverse perspectives and contributions. Whether you're fixing bugs, adding features, improving documentation, or sharing feedback, your contribution matters.

## 📋 Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please read and follow our community guidelines:

- **Be respectful** - Treat all community members with kindness and respect
- **Be constructive** - Provide helpful feedback and suggestions
- **Be collaborative** - Work together to solve problems and improve the project
- **Be patient** - Remember that we're all volunteers with different experience levels

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Java 21+** (OpenJDK recommended)
- **Node.js 18+** with npm
- **Rust 1.70+** with Cargo
- **Docker 24.0+** with Docker Compose
- **Git 2.42+**
- **GitHub account** with proper SSH/GPG setup

### Development Environment Setup

1. **Fork and Clone**
   ```bash
   # Fork the repository on GitHub, then clone your fork
   git clone https://github.com/YOUR-USERNAME/openframe-oss-tenant.git
   cd openframe-oss-tenant
   ```

2. **Set Up Authentication**
   ```bash
   # Required for GitHub Packages dependency resolution
   export GITHUB_ACTOR=your-github-username
   export GITHUB_TOKEN=your-github-personal-access-token
   ```

3. **Install Dependencies and Build**
   ```bash
   # Build backend services
   mvn clean install
   
   # Install frontend dependencies
   cd openframe/services/openframe-frontend
   npm install
   
   # Build Rust client
   cd ../../client
   cargo build --release
   ```

4. **Run Tests**
   ```bash
   # Java tests
   mvn test
   
   # Frontend type checking
   cd openframe/services/openframe-frontend
   npm run type-check
   
   # Rust tests
   cd ../../client
   cargo test
   ```

For detailed setup instructions, see [Development Environment Setup](docs/development/setup/environment.md).

## 🔄 Development Workflow

### 1. Create a Branch

```bash
# Create a feature branch from main
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

### 2. Make Changes

- **Follow coding standards** - See [Coding Standards](#-coding-standards)
- **Write tests** - Include unit and integration tests for new functionality
- **Update documentation** - Keep docs in sync with code changes
- **Commit frequently** - Make small, logical commits with clear messages

### 3. Test Your Changes

```bash
# Run full test suite
mvn test
cd openframe/services/openframe-frontend && npm run type-check
cd ../../client && cargo test

# Test locally with CLI
./cli/openframe bootstrap --non-interactive
```

### 4. Submit a Pull Request

```bash
# Push your branch
git push origin feature/your-feature-name

# Create pull request via GitHub UI
```

## 📝 Contribution Types

### 🐛 Bug Reports

Found a bug? Help us fix it:

1. **Check existing issues** - Search for duplicate reports
2. **Use the bug report template** - Include all requested information
3. **Provide reproduction steps** - Clear, step-by-step instructions
4. **Include logs and screenshots** - Help us understand the issue

### 💡 Feature Requests

Have an idea for improvement?

1. **Check roadmap and existing issues** - Avoid duplicates
2. **Use the feature request template** - Explain the use case and benefits
3. **Engage in discussion** - Work with maintainers to refine the proposal

### 🔧 Code Contributions

Ready to contribute code?

#### Small Changes (Bug fixes, typos, small improvements)
- Fork, fix, test, and submit a pull request
- Include tests if applicable
- Reference any related issues

#### Large Changes (New features, architectural changes)
- **Discuss first** - Open an issue or discussion before coding
- **Follow the RFC process** for significant changes
- **Break into smaller PRs** when possible

### 📚 Documentation

Help improve our documentation:

- Fix typos and unclear explanations
- Add examples and use cases
- Improve API documentation
- Create tutorials and guides

## 🏗️ Project Structure

Understanding the codebase:

```text
openframe-oss-tenant/
├── openframe-oss-lib/           # Reusable core libraries
│   ├── api_service_core/        # Main API logic
│   ├── gateway_service_core/    # Gateway and routing
│   ├── security_shared_core/    # Security primitives
│   └── ...                     # Other core modules
├── openframe/services/          # Runnable applications
│   ├── openframe-api/          # API service entrypoint
│   ├── openframe-gateway/      # Gateway service
│   ├── openframe-frontend/     # Vue.js web interface
│   └── ...                     # Other services
├── client/                      # Rust system agent
├── cli/                         # Command-line tools
└── docs/                        # Documentation
```

### Key Areas

- **Backend Services** - Java Spring Boot microservices
- **Frontend** - Vue.js application with TypeScript
- **Client Agent** - Rust-based system monitoring
- **Infrastructure** - Docker, Kafka, MongoDB, Redis
- **Documentation** - Markdown files in `/docs`

## 🎨 Coding Standards

### Java/Spring Boot

- **Java 21** language features encouraged
- **Spring Boot 3.3** conventions and best practices
- **Clean Code** principles - readable, maintainable code
- **SOLID** principles for design
- **Tests** - Comprehensive unit and integration tests

```java
// Example: Service class structure
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    
    @Transactional
    public User createUser(CreateUserRequest request) {
        // Implementation
    }
}
```

### TypeScript/Vue.js

- **TypeScript strict mode** - Type safety is required
- **Vue 3 Composition API** - Use `<script setup>` syntax
- **ESLint + Prettier** - Automated formatting and linting
- **Component organization** - Single-file components with clear structure

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  title: string
}

const props = defineProps<Props>()
const count = ref(0)

const doubleCount = computed(() => count.value * 2)
</script>
```

### Rust

- **Rust 2021 edition** - Latest language features
- **Tokio async runtime** - For asynchronous operations
- **Error handling** - Proper use of `Result` and error types
- **Documentation** - Rustdoc comments for public APIs

```rust
/// Represents a system metric reading
#[derive(Debug, Serialize, Deserialize)]
pub struct MetricReading {
    pub timestamp: DateTime<Utc>,
    pub value: f64,
    pub unit: MetricUnit,
}
```

### General Principles

- **Clear naming** - Use descriptive variable and function names
- **Documentation** - Comment complex logic and public APIs
- **Error handling** - Graceful error handling and user-friendly messages
- **Performance** - Consider performance implications of changes
- **Security** - Follow security best practices

## ✅ Testing Guidelines

### Unit Tests

- **High coverage** - Aim for 80%+ code coverage
- **Fast execution** - Tests should run quickly
- **Isolated** - Tests should not depend on each other
- **Descriptive names** - Test names should describe what's being tested

### Integration Tests

- **Real scenarios** - Test actual user workflows
- **External dependencies** - Use test containers when possible
- **Data cleanup** - Ensure tests clean up after themselves

### End-to-End Tests

- **Critical paths** - Focus on essential user journeys
- **Stable and reliable** - Avoid flaky tests
- **Clear reporting** - Easy to understand failure reasons

## 📋 Pull Request Guidelines

### Before Submitting

- ✅ **Tests pass** - All existing and new tests pass
- ✅ **Code formatted** - Follow project formatting standards
- ✅ **Documentation updated** - Update docs for user-facing changes
- ✅ **No merge conflicts** - Rebase on latest main if needed
- ✅ **Focused scope** - One logical change per PR

### PR Description Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests that you ran to verify your changes

## Checklist:
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Review Process

1. **Automated checks** - CI/CD pipeline must pass
2. **Maintainer review** - At least one maintainer approval required
3. **Community feedback** - Other contributors may provide feedback
4. **Iteration** - Address feedback and update PR as needed
5. **Merge** - Maintainers will merge approved PRs

## 🚀 Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** - Breaking changes
- **MINOR** - New features (backward compatible)
- **PATCH** - Bug fixes (backward compatible)

### Release Types

- **Regular releases** - Monthly minor releases
- **Patch releases** - As needed for critical bugs
- **Major releases** - Quarterly, with migration guides

## 📞 Getting Help

### Communication Channels

- **🧠 Discussion** - Use GitHub Discussions for questions and ideas
- **💬 Community Slack** - [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for real-time chat
- **📖 Documentation** - Check [docs](./docs/README.md) first
- **🐛 Issues** - GitHub Issues for bugs and feature requests

### Important Note

**We do NOT use GitHub Issues or GitHub Discussions** for project management. Everything is managed through our **OpenMSP Slack Community**:

- **Community Link**: https://www.openmsp.ai/
- **Slack Invite**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA

Please join our Slack community for:
- Questions and support
- Feature discussions
- Bug reports and issues
- General project discussions
- Collaboration with other contributors

### Response Times

- **Critical bugs** - Within 24 hours
- **General questions** - Within 48 hours
- **Feature requests** - Within 1 week
- **Pull reviews** - Within 3 business days

## 🎯 Contribution Areas

Looking for ways to contribute?

### High Priority
- **Bug fixes** - Always needed
- **Performance improvements** - Optimize critical paths
- **Security enhancements** - Strengthen security posture
- **Documentation** - Improve clarity and completeness

### Medium Priority
- **New integrations** - Add support for more MSP tools
- **UI/UX improvements** - Better user experience
- **Testing** - Increase test coverage
- **Developer experience** - Improve development workflow

### Special Projects
- **Mobile app** - React Native companion app
- **Edge computing** - Lightweight agent deployment
- **AI/ML features** - Enhance intelligent automation
- **API expansions** - New GraphQL schemas and endpoints

## 🌈 Recognition

We value all contributions and recognize contributors in several ways:

- **Contributors file** - Listed in repository contributors
- **Release notes** - Credited in release announcements
- **Community recognition** - Highlighted in community channels
- **Maintainer path** - Opportunity to become a project maintainer

## 🔗 Useful Resources

- [Development Setup Guide](docs/development/setup/environment.md)
- [Architecture Overview](docs/reference/overview.md)
- [API Documentation](docs/api/README.md)
- [Testing Guidelines](docs/development/testing/overview.md)
- [Security Guidelines](docs/development/security/guidelines.md)

## 📜 License

By contributing to OpenFrame OSS Tenant, you agree that your contributions will be licensed under the [Flamingo AI Unified License v1.0](LICENSE.md).

---

**Thank you for contributing to OpenFrame!** Your efforts help build a better, more open MSP ecosystem for everyone.

---
<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> team
</div>