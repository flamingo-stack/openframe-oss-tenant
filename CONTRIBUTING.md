# Contributing to OpenFrame

Thank you for your interest in contributing to OpenFrame! This guide will help you get started with contributing to our open-source MSP platform.

## 🌟 Ways to Contribute

We welcome all types of contributions:

- **🐛 Bug Reports** - Help us identify and fix issues
- **✨ Feature Requests** - Propose new functionality
- **📝 Documentation** - Improve guides and references
- **🔧 Code Contributions** - Fix bugs or add features
- **🧪 Testing** - Help improve test coverage
- **💬 Community Support** - Help other users on Slack

## 🚀 Quick Start for Contributors

### 1. Set Up Your Development Environment

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
cd openframe-oss-tenant

# Set up upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git

# Create your development environment
cp .env.example .env
# Edit .env with your GitHub token (required for dependencies)

# Start the development environment
./scripts/run-mac.sh --silent  # or run-linux.sh / run-windows.ps1
```

### 2. Create a Feature Branch

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# or for bug fixes
git checkout -b fix/bug-description
```

### 3. Make Your Changes

Follow our development guidelines:
- Write clear, concise commit messages
- Add tests for new functionality
- Update documentation as needed
- Follow code style guidelines

### 4. Test Your Changes

```bash
# Run backend tests
mvn test

# Run frontend tests
cd openframe/services/openframe-frontend
npm run test:unit

# Run integration tests
mvn verify
```

### 5. Submit Your Contribution

```bash
# Commit your changes
git add .
git commit -m "feat: add your feature description"

# Push to your fork
git push origin feature/your-feature-name

# Create a Pull Request on GitHub
```

## 📋 Development Guidelines

### Code Style

#### Java (Backend)

- **Formatting**: Use standard Java formatting (included in IDE settings)
- **Naming**: Use descriptive names for classes, methods, and variables
- **Documentation**: Add JavaDoc for public APIs
- **Testing**: Write unit tests for all new functionality

```java
/**
 * Service for managing organization data and operations.
 */
@Service
public class OrganizationService {
    
    /**
     * Retrieves organization by ID with tenant context.
     * 
     * @param organizationId the organization identifier
     * @param tenantId the tenant context
     * @return organization data or empty if not found
     */
    public Optional<Organization> findById(String organizationId, String tenantId) {
        // Implementation
    }
}
```

#### TypeScript/Vue (Frontend)

- **Formatting**: Use Prettier configuration (run `npm run lint:fix`)
- **Components**: Use Composition API with `<script setup lang="ts">`
- **Types**: Define explicit types for all data structures
- **Testing**: Add unit tests for components and utilities

```vue
<script setup lang="ts">
interface Props {
  organizationId: string
  readonly?: boolean
}

interface Organization {
  id: string
  name: string
  createdAt: Date
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false
})

const { data: organization } = useQuery<Organization>(GET_ORGANIZATION, {
  variables: { id: props.organizationId }
})
</script>
```

### Commit Messages

Use conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(api): add organization management endpoints
fix(ui): resolve dashboard loading issue
docs(readme): update installation instructions
```

### Testing Requirements

#### Backend Testing

All backend code must include:

- **Unit Tests**: Test individual methods and classes
- **Integration Tests**: Test service interactions
- **API Tests**: Test REST and GraphQL endpoints

```java
@Test
void shouldCreateOrganizationWithValidData() {
    // Given
    CreateOrganizationRequest request = new CreateOrganizationRequest();
    request.setName("Test Organization");
    
    // When
    Organization result = organizationService.create(request);
    
    // Then
    assertThat(result.getName()).isEqualTo("Test Organization");
    assertThat(result.getId()).isNotNull();
}
```

#### Frontend Testing

All frontend code should include:

- **Component Tests**: Test Vue components
- **Unit Tests**: Test utility functions
- **Integration Tests**: Test complete user flows

```typescript
describe('OrganizationCard', () => {
  it('displays organization name correctly', () => {
    const organization = { id: '1', name: 'Test Org' }
    const wrapper = mount(OrganizationCard, {
      props: { organization }
    })
    
    expect(wrapper.text()).toContain('Test Org')
  })
})
```

### Documentation Standards

#### Code Documentation

- **JavaDoc** for all public Java methods and classes
- **TSDoc** for TypeScript functions and interfaces
- **README files** for new modules or significant features
- **API documentation** for new GraphQL schemas

#### User Documentation

When adding new features, update:

- Getting Started guides if it affects setup
- User guides if it adds new functionality  
- API documentation if it adds new endpoints
- Architecture documentation for significant changes

### Security Guidelines

#### Authentication & Authorization

- Always validate user permissions before operations
- Use tenant-aware queries to prevent cross-tenant access
- Sanitize all user inputs
- Use parameterized queries to prevent injection

```java
// ✅ Good: Tenant-aware query
@PreAuthorize("hasRole('ADMIN')")
public List<Device> getDevices(@TenantId String tenantId) {
    return deviceRepository.findByTenantId(tenantId);
}

// ❌ Bad: Missing tenant isolation
public List<Device> getDevices() {
    return deviceRepository.findAll(); // Cross-tenant data leak!
}
```

#### Data Handling

- Never log sensitive information (passwords, tokens, PII)
- Use encryption for sensitive data storage
- Validate all external data inputs
- Follow OWASP security guidelines

## 🐛 Bug Reports

When reporting bugs, please include:

### Bug Report Template

```markdown
## Bug Description
A clear description of what the bug is.

## Steps to Reproduce
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- OS: [e.g. macOS 13.0]
- Browser: [e.g. Chrome 120]
- OpenFrame Version: [e.g. v0.5.2]
- Java Version: [e.g. OpenJDK 21]

## Additional Context
Add any other context about the problem here.

## Screenshots
If applicable, add screenshots to help explain your problem.
```

## ✨ Feature Requests

For new features, please provide:

### Feature Request Template

```markdown
## Feature Summary
A brief description of the feature.

## Problem Statement
What problem does this feature solve?

## Proposed Solution
Describe your proposed solution.

## Alternatives Considered
Describe alternative solutions you've considered.

## Additional Context
Add any other context or screenshots about the feature request.

## Implementation Notes
Any technical considerations or constraints.
```

## 🔄 Pull Request Process

### PR Guidelines

1. **Fork and Branch**: Create a feature branch from `main`
2. **Small Changes**: Keep PRs focused and manageable
3. **Tests**: Include tests for new functionality
4. **Documentation**: Update relevant documentation
5. **Description**: Write clear PR descriptions

### PR Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass locally
- [ ] Changes are backward compatible

## Screenshots (if applicable)
Add screenshots for UI changes.

## Related Issues
Closes #123
```

### Review Process

1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one maintainer must approve
3. **Testing**: Automated tests must pass
4. **Documentation**: Documentation changes reviewed
5. **Merge**: Squash and merge to main branch

## 🧪 Development Environment

### Prerequisites

- **Java 21+**: OpenJDK or Oracle JDK
- **Node.js 18+**: With npm package manager
- **Docker**: For running dependencies
- **Git**: Version control
- **IDE**: IntelliJ IDEA or VS Code recommended

### Environment Setup

Detailed setup instructions are available in:
- [Environment Setup](docs/development/setup/environment.md)
- [Local Development](docs/development/setup/local-development.md)

### Development Scripts

```bash
# Start all services
./scripts/run-mac.sh

# Build only backend
mvn clean install

# Build only frontend
cd openframe/services/openframe-frontend
npm run build

# Run tests
mvn test                          # Backend tests
npm run test:unit                 # Frontend tests

# Code quality checks
mvn spotbugs:check               # Java static analysis
npm run lint                     # Frontend linting
```

## 📞 Getting Help

### Community Support

- **OpenMSP Slack**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
- **GitHub Discussions**: For technical discussions and Q&A
- **Documentation**: https://www.flamingo.run/knowledge-base

### Direct Contact

- **General Questions**: Join our Slack community
- **Security Issues**: security@flamingo.run
- **Partnership Inquiries**: hello@flamingo.run

### Response Times

- **Security Issues**: Within 24 hours
- **Bug Reports**: Within 3-5 business days
- **Feature Requests**: Within 1 week
- **Pull Reviews**: Within 2-3 business days

## 📜 Code of Conduct

### Our Standards

We are committed to providing a welcoming and inspiring community for all. Examples of behavior that contributes to a positive environment:

- **Respectful Communication**: Using welcoming and inclusive language
- **Constructive Feedback**: Being respectful of differing viewpoints
- **Collaboration**: Focusing on what is best for the community
- **Empathy**: Showing empathy towards other community members

### Unacceptable Behavior

- Harassment, discriminatory language, or personal attacks
- Trolling, insulting comments, or political attacks
- Public or private harassment
- Publishing others' private information without consent
- Other conduct inappropriate in a professional setting

### Enforcement

Project maintainers are responsible for clarifying standards and will take corrective action in response to behavior they deem inappropriate. Contact the team at hello@flamingo.run for issues.

## 🎯 Development Roadmap

Our current development priorities:

### Q1 2025
- Enhanced AI/ML capabilities
- Performance optimizations
- Extended tool integrations

### Q2 2025
- Edge computing features
- Advanced analytics
- Mobile responsive improvements

### Q3 2025
- Enterprise SSO integrations
- Advanced reporting
- API marketplace

We welcome contributions toward any of these goals!

## 🏆 Recognition

### Contributors

All contributors are recognized in our:
- **README Contributors Section**
- **Release Notes** for significant contributions
- **Community Spotlight** in monthly updates
- **Annual Contributor Recognition** program

### Contribution Levels

- **First-time Contributor**: Welcome badge and documentation credit
- **Regular Contributor**: Recognition in release notes
- **Core Contributor**: Direct collaboration on roadmap planning
- **Maintainer**: Project governance participation

---

## 📝 License

By contributing to OpenFrame, you agree that your contributions will be licensed under the [Flamingo AI Unified License v1.0](LICENSE.md).

---

<div align="center">
  
**Ready to contribute?** Join our community and help build the future of MSP platforms!

[🚀 Get Started](docs/getting-started/quick-start.md) • [💬 Join Slack](https://www.openmsp.ai/) • [📚 Read Docs](docs/README.md)

</div>