# Contributing to OpenFrame

Welcome to the OpenFrame project! We're excited to have you contribute to the future of AI-powered MSP operations. This guide will help you get started with contributing code, documentation, and ideas to the OpenFrame ecosystem.

## 🚀 Getting Started

### Before You Contribute

1. **Join the Community**: Join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) for discussions, questions, and coordination
2. **Read the Documentation**: Familiarize yourself with the [project documentation](./docs/README.md) and [development setup](./docs/development/setup/environment.md)
3. **Explore the Codebase**: Clone the repository and run OpenFrame locally to understand the system
4. **Check Existing Issues**: Look at GitHub Issues to find contribution opportunities

### Types of Contributions We Welcome

- 🐛 **Bug Fixes**: Help us identify and fix issues
- ✨ **New Features**: Add functionality to improve the platform
- 📚 **Documentation**: Improve guides, API docs, and tutorials
- 🧪 **Testing**: Enhance test coverage and quality
- 🎨 **UI/UX Improvements**: Make the interface more intuitive
- 🔒 **Security**: Identify and fix security vulnerabilities
- 🚀 **Performance**: Optimize code and system performance

## 📋 Development Process

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git
```

### 2. Set Up Development Environment

Follow our [Development Setup Guide](./docs/development/setup/environment.md) to configure your local environment.

### 3. Create a Feature Branch

Use descriptive branch names:

```bash
# Branch naming convention: <type>/<scope>/<description>
git checkout -b feature/device-management/add-health-monitoring
git checkout -b fix/auth/jwt-refresh-issue  
git checkout -b docs/api/update-device-endpoints
```

### 4. Make Your Changes

- Follow our [coding standards](#coding-standards)
- Write tests for new functionality
- Update documentation as needed
- Ensure all tests pass locally

### 5. Commit Your Changes

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
# Commit message format: <type>(<scope>): <description>
git commit -m "feat(device-api): add health monitoring endpoints"
git commit -m "fix(auth): resolve JWT token refresh infinite loop"
git commit -m "docs(getting-started): update installation instructions"
```

### 6. Push and Create Pull Request

```bash
# Push your branch
git push origin feature/device-management/add-health-monitoring

# Create a pull request on GitHub with:
# - Clear title and description
# - Reference to related issues
# - Screenshots for UI changes
# - Testing information
```

## 🎯 Coding Standards

### Backend (Java/Spring Boot)

**Code Style:**
- Use Java 21 features appropriately
- Follow Spring Boot best practices
- Maintain clear separation of concerns
- Use constructor injection with `@RequiredArgsConstructor`

**Example:**
```java
@Service
@Slf4j
@RequiredArgsConstructor
public class DeviceManagementService {
    
    private final DeviceRepository deviceRepository;
    private final EventPublisher eventPublisher;
    
    @Transactional
    public DeviceDto createDevice(CreateDeviceRequest request) {
        log.debug("Creating device with name: {}", request.getName());
        
        validateDeviceCreationRequest(request);
        Device device = buildDeviceFromRequest(request);
        Device savedDevice = deviceRepository.save(device);
        
        eventPublisher.publishEvent(new DeviceCreatedEvent(savedDevice));
        log.info("Successfully created device with ID: {}", savedDevice.getId());
        
        return deviceMapper.toDto(savedDevice);
    }
}
```

### Frontend (TypeScript/React/Next.js)

**Code Style:**
- Use TypeScript for type safety
- Implement proper error boundaries
- Use React Query for data fetching
- Follow component composition patterns

**Example:**
```typescript
interface DeviceCardProps {
  device: Device;
  onDeviceSelect?: (device: Device) => void;
  isLoading?: boolean;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  onDeviceSelect,
  isLoading = false
}) => {
  const handleClick = () => {
    if (!isLoading && onDeviceSelect) {
      onDeviceSelect(device);
    }
  };

  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all"
      onClick={handleClick}
    >
      {/* Component content */}
    </Card>
  );
};
```

## 🧪 Testing Requirements

### Backend Testing
```bash
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=DeviceManagementServiceTest

# Run with coverage
mvn clean test jacoco:report
```

### Frontend Testing
```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
```

### Test Guidelines
- **Unit Tests**: Test individual components/services in isolation
- **Integration Tests**: Test service interactions and database operations
- **E2E Tests**: Test complete user workflows
- **Minimum Coverage**: Aim for 85%+ code coverage

## 📝 Pull Request Process

### PR Title Format
```text
<type>(<scope>): <description>

Examples:
feat(device-api): add device health monitoring endpoints
fix(auth): resolve JWT token expiration handling  
docs(getting-started): update installation instructions
```

### PR Description Template
```markdown
## Description
Brief description of the changes and why they were made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)  
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing
- [ ] E2E tests

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

## Related Issues
Fixes #(issue number)
```

### Review Process

1. **Automated Checks**: All PRs run automated tests and quality checks
2. **Code Review**: At least one maintainer review is required
3. **Testing**: Changes are tested in a staging environment
4. **Approval**: PRs need approval before merging
5. **Merge**: Maintainers will merge approved PRs

## 🏗️ Architecture Guidelines

### Microservices Principles
- **Single Responsibility**: Each service has a focused purpose
- **Database per Service**: Services own their data
- **API Contracts**: Well-defined interfaces between services
- **Fault Tolerance**: Handle failures gracefully

### Security Considerations
- **Multi-Tenant**: All features must support tenant isolation  
- **Authentication**: Validate JWT tokens properly
- **Authorization**: Check permissions before operations
- **Input Validation**: Validate all user inputs
- **SQL Injection**: Use parameterized queries

### Performance Best Practices
- **Database Optimization**: Use proper indexing and query patterns
- **Caching**: Implement Redis caching for frequently accessed data
- **Async Processing**: Use Kafka for non-blocking operations
- **Resource Management**: Monitor memory and CPU usage

## 🔍 Code Review Guidelines

### For Contributors
- **Self-Review**: Review your code before requesting review
- **Small PRs**: Keep changes focused and reasonably sized
- **Clear Description**: Provide context and testing information
- **Respond Promptly**: Address feedback quickly and professionally

### For Reviewers
- **Be Constructive**: Provide helpful, specific feedback
- **Focus Areas**: Functionality, security, performance, code quality
- **Timely Reviews**: Respond within 2-3 business days
- **Acknowledge Good Work**: Recognize quality contributions

## 🎖️ Recognition

### How We Recognize Contributors

- **All Contributors**: Listed in releases and documentation
- **Regular Contributors**: Invited to contributor meetings
- **Significant Contributors**: Featured in project highlights
- **Maintainers**: Repository permissions and decision-making authority

### Path to Maintainership

1. **Consistent Contributions**: Regular, quality contributions over 3+ months
2. **Community Engagement**: Active participation in discussions
3. **Domain Expertise**: Demonstrated knowledge in specific areas
4. **Code Quality**: Track record of well-tested contributions
5. **Collaboration**: Works well with team and shows good judgment

## 📞 Getting Help

### Community Support
- **Slack**: [OpenMSP Community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **GitHub Discussions**: Technical questions and proposals
- **Documentation**: [Development Docs](./docs/development/README.md)

### Reporting Issues
- **Bug Reports**: Use GitHub Issues with detailed reproduction steps
- **Feature Requests**: Discuss in Slack `#feature-requests` first
- **Security Issues**: Email security@flamingo.run (do not use public issues)

## 📄 Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

### Expected Behavior
- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Collaborate effectively with others

### Unacceptable Behavior
- Harassment or discrimination of any kind
- Personal attacks or trolling
- Publishing private information
- Any behavior that creates a hostile environment

## 🙏 Thank You

Thank you for contributing to OpenFrame! Your efforts help build the future of AI-powered MSP operations and make a real difference for MSP teams worldwide.

**Ready to get started?**
1. Join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
2. Set up your [development environment](./docs/development/setup/environment.md)  
3. Find a "good first issue" on GitHub
4. Start contributing!

---

<div align="center">
  <strong>Together, we're building the future of MSP operations! 🚀</strong>
</div>