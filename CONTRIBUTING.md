# Contributing to OpenFrame

Thank you for your interest in contributing to OpenFrame! This document provides guidelines and information to help you contribute effectively to our AI-powered MSP platform.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [Contributing Process](#contributing-process)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Community and Support](#community-and-support)

## Code of Conduct

OpenFrame is committed to providing a welcoming and inclusive environment for all contributors. We follow the principles of respect, collaboration, and constructive communication.

### Our Standards

- **Be Respectful**: Treat all community members with kindness and respect
- **Be Collaborative**: Work together constructively and share knowledge freely
- **Be Inclusive**: Welcome contributors of all backgrounds and experience levels
- **Be Professional**: Maintain a professional tone in all communications

### Unacceptable Behavior

- Harassment, discrimination, or abusive language
- Trolling, insulting comments, or personal attacks
- Public or private harassment
- Publishing others' private information without permission

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Java**: OpenJDK 21.0.1+
- **Node.js**: 18+ with npm
- **Rust**: 1.70+ with Cargo
- **Docker**: 24.0+ with Docker Compose
- **Git**: 2.42+
- **GitHub Account**: For pull requests and issue tracking

### Setting Up Your Development Environment

1. **Fork the Repository**
   ```bash
   # Fork the repo on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
   cd openframe-oss-tenant
   ```

2. **Configure GitHub Authentication**
   ```bash
   # Required for Maven dependency access
   export GITHUB_ACTOR=your-github-username
   export GITHUB_TOKEN=your-github-personal-access-token
   ```

3. **Set Up Development Environment**
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

4. **Verify Setup**
   ```bash
   # Run backend tests
   mvn test

   # Run frontend tests
   cd openframe/services/openframe-frontend
   npm run type-check

   # Run Rust tests
   cd ../../client
   cargo test
   ```

## Contributing Process

### 1. Issue Creation and Assignment

- **Check Existing Issues**: Search existing issues before creating new ones
- **Use Issue Templates**: Follow the provided templates for bug reports and feature requests
- **Clear Descriptions**: Provide detailed, reproducible information
- **Labels**: Apply appropriate labels to help categorize issues

### 2. Branch Naming Convention

```bash
# Feature branches
git checkout -b feature/add-device-monitoring

# Bug fixes
git checkout -b fix/resolve-auth-timeout

# Documentation updates
git checkout -b docs/update-api-reference

# Performance improvements
git checkout -b perf/optimize-query-performance
```

### 3. Making Changes

- **Small, Focused Commits**: Make atomic commits with clear purposes
- **Descriptive Messages**: Write clear, descriptive commit messages
- **Follow Code Style**: Adhere to established coding standards
- **Add Tests**: Include appropriate test coverage for new features
- **Update Documentation**: Update relevant documentation

### 4. Commit Message Format

```bash
# Format: <type>(<scope>): <description>

# Examples:
feat(api): add device health monitoring endpoint
fix(frontend): resolve authentication token refresh
docs(readme): update installation instructions
test(client): add unit tests for agent communication
perf(stream): optimize Kafka message processing
refactor(gateway): simplify routing configuration
```

**Commit Types:**
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation updates
- `test`: Adding or updating tests
- `perf`: Performance improvements
- `refactor`: Code refactoring
- `chore`: Maintenance tasks

### 5. Pull Request Process

1. **Create Pull Request**
   - Use the pull request template
   - Provide clear description of changes
   - Link related issues
   - Include screenshots for UI changes

2. **Review Process**
   - Address reviewer feedback promptly
   - Make requested changes in new commits
   - Keep PR focused and reasonably sized

3. **Final Steps**
   - Ensure all CI checks pass
   - Squash commits if requested
   - Wait for maintainer approval and merge

## Code Style Guidelines

### Java/Spring Boot

- **Code Formatting**: Use Google Java Style Guide
- **IDE Configuration**: Import provided IntelliJ/Eclipse formatter
- **Naming Conventions**: Use descriptive, camelCase variable names
- **Documentation**: Add JavaDoc for public APIs

```java
/**
 * Service for managing device operations and monitoring.
 */
@Service
@RequiredArgsConstructor
public class DeviceManagementService {
    
    private final DeviceRepository deviceRepository;
    
    /**
     * Retrieves device status with health metrics.
     *
     * @param deviceId the unique device identifier
     * @return device status with health metrics
     * @throws DeviceNotFoundException if device not found
     */
    public DeviceStatus getDeviceStatus(String deviceId) {
        // Implementation
    }
}
```

### TypeScript/Vue.js

- **ESLint Configuration**: Follow project ESLint rules
- **Vue Component Structure**: Use Composition API with `<script setup>`
- **Type Safety**: Leverage TypeScript for type safety
- **Component Naming**: Use PascalCase for component names

```typescript
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Device, DeviceStatus } from '@/types/device'

interface Props {
  deviceId: string
}

const props = defineProps<Props>()
const deviceStatus = ref<DeviceStatus | null>(null)

const fetchDeviceStatus = async () => {
  // Implementation
}

onMounted(() => {
  fetchDeviceStatus()
})
</script>
```

### Rust

- **Rust Formatting**: Use `cargo fmt` for consistent formatting
- **Clippy Lints**: Address all Clippy warnings
- **Error Handling**: Use Result types for error handling
- **Documentation**: Add doc comments for public APIs

```rust
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

/// Device health metrics collected by the agent
#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceMetrics {
    pub cpu_usage: f64,
    pub memory_usage: f64,
    pub disk_usage: f64,
}

impl DeviceMetrics {
    /// Collects current device metrics
    pub fn collect() -> Result<Self> {
        // Implementation
    }
}
```

## Testing Requirements

### Backend Testing (Java)

```bash
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=DeviceServiceTest

# Run tests with coverage
mvn test jacoco:report
```

**Test Categories:**
- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions
- **End-to-End Tests**: Test complete workflows

### Frontend Testing (TypeScript)

```bash
# Type checking
npm run type-check

# Unit tests (when available)
npm run test

# E2E tests (when available)
npm run test:e2e
```

### Client Testing (Rust)

```bash
# Run all tests
cargo test

# Run tests with output
cargo test -- --nocapture

# Run specific test
cargo test test_device_metrics
```

### Test Coverage Requirements

- **Minimum Coverage**: 80% for new code
- **Critical Components**: 90%+ coverage required
- **Integration Tests**: Required for API endpoints
- **Documentation**: Include test documentation

## Documentation

### Code Documentation

- **API Documentation**: Document all public APIs
- **Architecture Decisions**: Document significant design decisions
- **Configuration**: Document all configuration options
- **Examples**: Provide usage examples

### Documentation Updates

When making changes, update relevant documentation:

- **README.md**: For installation or basic usage changes
- **API Documentation**: For new or changed endpoints
- **Architecture Docs**: For design or architectural changes
- **Getting Started**: For new features affecting user workflows

### Documentation Style

- **Clear and Concise**: Write for your target audience
- **Examples**: Include practical examples
- **Screenshots**: Add screenshots for UI changes
- **Links**: Keep internal links up to date

## Security Considerations

### Security Guidelines

- **Sensitive Data**: Never commit secrets, tokens, or passwords
- **Input Validation**: Validate all user inputs
- **Authentication**: Follow established authentication patterns
- **Authorization**: Implement proper permission checks

### Reporting Security Issues

Found a security vulnerability? **Do NOT open a public issue.**

Instead:
1. Email security@flamingo.run with details
2. Include steps to reproduce if possible
3. Allow reasonable time for response before disclosure

## Community and Support

### Getting Help

- **OpenMSP Slack**: Join our community at https://www.openmsp.ai/
- **GitHub Discussions**: For project-related questions
- **Documentation**: Check the docs folder for detailed guides

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and community discussion
- **Slack**: Real-time community support and collaboration
- **Email**: security@flamingo.run for security issues

### Recognition

Contributors are recognized in several ways:

- **Contributors List**: Automatically updated in README
- **Release Notes**: Significant contributions mentioned in releases
- **Community Shoutouts**: Recognition in community channels

## Development Workflow

### Typical Development Cycle

1. **Check Issues**: Look for issues labeled `good first issue` or `help wanted`
2. **Discuss First**: For large features, discuss in issues or Slack before coding
3. **Create Branch**: Create feature branch from latest main
4. **Develop**: Write code following style guidelines
5. **Test**: Ensure all tests pass and add new tests as needed
6. **Document**: Update relevant documentation
7. **Submit PR**: Create pull request with detailed description
8. **Iterate**: Address review feedback
9. **Merge**: Maintainer merges after approval

### Release Process

OpenFrame follows semantic versioning (SemVer):

- **Major Version**: Breaking changes
- **Minor Version**: New features, backwards compatible
- **Patch Version**: Bug fixes, backwards compatible

## License

By contributing to OpenFrame, you agree that your contributions will be licensed under the [Flamingo AI Unified License v1.0](LICENSE.md).

## Questions?

If you have questions about contributing, feel free to:

- Ask in the [OpenMSP Slack community](https://www.openmsp.ai/)
- Open a GitHub Discussion
- Check existing documentation in the `docs/` folder

Thank you for contributing to OpenFrame! Your efforts help build better MSP tools for everyone.

---

Built with 💛 by the [Flamingo](https://www.flamingo.run) community