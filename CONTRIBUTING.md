# Contributing to OpenFrame

Welcome to the OpenFrame community! We're excited that you're interested in contributing to the unified AI-powered MSP platform. This guide will help you understand how to contribute effectively to OpenFrame.

## 🤝 Code of Conduct

OpenFrame is committed to providing a welcoming and inclusive environment. We expect all contributors to:

- **Be Respectful**: Treat all community members with respect and professionalism
- **Be Collaborative**: Work together constructively and accept feedback gracefully
- **Be Inclusive**: Welcome newcomers and help them get started
- **Be Patient**: Remember that everyone has different experience levels

## 🚀 Getting Started

### 1. Join Our Community

Connect with the OpenFrame community before contributing:

- **OpenMSP Slack**: Join our active community at https://www.openmsp.ai/
- **Direct Invite**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
- **Introduce Yourself**: Share your background in the `#introductions` channel

> **Important**: We don't use GitHub Issues or GitHub Discussions. All support, feature requests, and community interaction happens through our OpenMSP Slack community.

### 2. Set Up Your Development Environment

Follow our development guides to get started:

1. **[Environment Setup](./docs/development/setup/environment.md)** - Install required tools and configure your IDE
2. **[Local Development](./docs/development/setup/local-development.md)** - Run OpenFrame locally
3. **[Architecture Overview](./docs/development/architecture/README.md)** - Understand the system design

## 📋 Types of Contributions

We welcome various types of contributions:

### 🐛 **Bug Reports**
- Search existing discussions in Slack before reporting
- Provide clear reproduction steps
- Include environment details (Java version, OS, etc.)
- Share relevant logs or screenshots

### ✨ **Feature Requests**
- Discuss ideas in the `#feature-requests` Slack channel
- Explain the use case and problem being solved
- Consider alternative approaches
- Get community feedback before implementation

### 🔧 **Code Contributions**
- Bug fixes and improvements
- New feature implementations
- Performance optimizations
- Test coverage improvements
- Documentation enhancements

### 📚 **Documentation**
- API documentation improvements
- User guide enhancements
- Developer documentation updates
- Code comment improvements

## 🛠 Development Workflow

### Branch Strategy

OpenFrame uses a structured branching approach:

```bash
main                    # Production-ready code
├── develop            # Integration branch
├── feature/OF-123     # Feature branches
├── bugfix/OF-456      # Bug fix branches
└── hotfix/OF-789      # Critical fixes
```

### Making Changes

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/openframe-oss-tenant.git
   cd openframe-oss-tenant
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/OF-123-your-feature-name
   ```

3. **Make Your Changes**
   - Follow the coding standards below
   - Write comprehensive tests
   - Update documentation as needed

4. **Test Your Changes**
   ```bash
   # Run all tests
   mvn test
   
   # Run integration tests
   mvn test -Pintegration
   
   # Check test coverage
   mvn test jacoco:report
   ```

5. **Commit Your Changes**
   ```bash
   git commit -m "feat(devices): add device status filtering
   
   - Add DeviceStatusFilter enum
   - Implement filtering in DeviceService  
   - Add corresponding tests
   - Update API documentation
   
   Closes #123"
   ```

## 📝 Code Standards

### Java Code Style

We follow Google Java Style with OpenFrame-specific conventions:

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class DeviceService {
    
    private final DeviceRepository deviceRepository;
    private final EventPublisher eventPublisher;
    
    /**
     * Creates a new device for the authenticated tenant.
     * 
     * @param request the device creation request
     * @param principal the authenticated user principal
     * @return the created device with generated metadata
     * @throws ValidationException if the request is invalid
     */
    @Transactional
    public Device createDevice(CreateDeviceRequest request, AuthPrincipal principal) {
        log.info("Creating device: {} for tenant: {}", request.getName(), principal.getTenantId());
        
        validateRequest(request);
        
        Device device = Device.builder()
            .name(request.getName())
            .type(request.getType())
            .tenantId(principal.getTenantId())
            .status(DeviceStatus.PENDING)
            .createdAt(Instant.now())
            .build();
            
        Device savedDevice = deviceRepository.save(device);
        eventPublisher.publishEvent(new DeviceCreatedEvent(savedDevice));
        
        return savedDevice;
    }
    
    private void validateRequest(CreateDeviceRequest request) {
        if (request.getName() == null || request.getName().trim().isEmpty()) {
            throw new ValidationException("Device name is required");
        }
    }
}
```

### Testing Standards

Write comprehensive tests for all new code:

```java
@ExtendWith(MockitoExtension.class)
@DisplayName("DeviceService")
class DeviceServiceTest {
    
    @Mock
    private DeviceRepository deviceRepository;
    
    @Mock
    private EventPublisher eventPublisher;
    
    @InjectMocks
    private DeviceService deviceService;
    
    @Nested
    @DisplayName("createDevice")
    class CreateDevice {
        
        @Test
        @DisplayName("should create device with valid request")
        void shouldCreateDeviceWithValidRequest() {
            // Given
            CreateDeviceRequest request = CreateDeviceRequest.builder()
                .name("Test Device")
                .type(DeviceType.DESKTOP)
                .build();
                
            AuthPrincipal principal = AuthPrincipal.builder()
                .tenantId("test-tenant")
                .build();
                
            Device expectedDevice = Device.builder()
                .name("Test Device")
                .tenantId("test-tenant")
                .status(DeviceStatus.PENDING)
                .build();
                
            when(deviceRepository.save(any(Device.class))).thenReturn(expectedDevice);
            
            // When
            Device result = deviceService.createDevice(request, principal);
            
            // Then
            assertThat(result)
                .isNotNull()
                .hasFieldOrPropertyWithValue("name", "Test Device")
                .hasFieldOrPropertyWithValue("tenantId", "test-tenant")
                .hasFieldOrPropertyWithValue("status", DeviceStatus.PENDING);
                
            verify(eventPublisher).publishEvent(any(DeviceCreatedEvent.class));
        }
    }
}
```

## 💬 Commit Message Format

Use Conventional Commits for consistent commit messages:

### Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code formatting (no logic changes)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks

### Examples
```bash
# Feature
feat(auth): add multi-tenant JWT validation

Implement tenant-aware JWT issuer resolution for secure
multi-tenant authentication across all services.

Closes #456

# Bug fix
fix(gateway): resolve request timeout issues

Fix edge case where long-running requests were timing out
due to incorrect gateway configuration.

Fixes #789

# Breaking change
feat(api)!: change device creation endpoint structure

BREAKING CHANGE: Device creation now requires 'organizationId' field.
Update client applications to include organization context.

See MIGRATION.md for upgrade instructions.
```

## 🔍 Pull Request Process

### 1. Before Submitting

- [ ] Code follows style guidelines
- [ ] All tests pass locally
- [ ] Documentation updated for new features
- [ ] Self-review completed
- [ ] Breaking changes documented

### 2. Pull Request Template

Use this template when creating pull requests:

```markdown
## Description
Brief description of changes and why they're needed.

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)  
- [ ] Breaking change (fix/feature causing existing functionality to break)
- [ ] Documentation update
- [ ] Performance improvement

## Related Issues
Discuss in OpenMSP Slack: [Link to thread]

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated  
- [ ] Manual testing completed
- [ ] All tests pass locally

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review of code completed
- [ ] Code is commented for complex logic
- [ ] Documentation updated
- [ ] No new warnings introduced
```

### 3. Review Process

#### Getting Reviews
- Request review from maintainers
- Address feedback promptly
- Be open to suggestions and changes
- Test reviewer suggestions before implementing

#### Review Criteria
Reviewers will check for:
- **Code Quality**: Clean, readable, maintainable code
- **Security**: No security vulnerabilities introduced
- **Performance**: Acceptable performance impact
- **Tests**: Comprehensive test coverage
- **Documentation**: Updated for new features

## 🏗 Architecture Guidelines

### Multi-Tenant Design
All new features must support multi-tenancy:

```java
// Always include tenant context
public Device getDevice(String deviceId, String tenantId) {
    return deviceRepository.findByIdAndTenantId(deviceId, tenantId)
        .orElseThrow(() -> new DeviceNotFoundException(deviceId));
}

// Use tenant-aware queries
@Query("SELECT d FROM Device d WHERE d.tenantId = :tenantId AND d.status = :status")
List<Device> findByTenantAndStatus(String tenantId, DeviceStatus status);
```

### Security Best Practices
- Always validate tenant access
- Use parameterized queries
- Sanitize user inputs
- Implement proper authentication checks
- Follow principle of least privilege

### Performance Considerations
- Use pagination for large datasets
- Implement proper caching strategies
- Avoid N+1 query problems
- Use async processing for heavy operations

## 📊 Quality Metrics

We maintain high quality standards:

### Code Coverage
- Minimum 80% line coverage for new code
- 90%+ coverage for critical business logic
- Tests should cover happy path and edge cases

### Performance Benchmarks
- API response times < 200ms for 95th percentile
- Database queries optimized with proper indexes
- Memory usage monitored and optimized

### Security Standards
- All endpoints properly authenticated
- Input validation on all user data
- SQL injection prevention
- XSS protection implemented

## 🏆 Recognition

We appreciate our contributors:

### Monthly Recognition
- **Contributor Spotlight**: Featured in community newsletter
- **Special Badges**: Recognition in Slack and GitHub
- **Swag**: OpenFrame merchandise for significant contributions

### Long-term Opportunities
- **Speaking Opportunities**: Present at OpenMSP events
- **Mentorship Roles**: Help guide new contributors
- **Architecture Input**: Influence platform direction

## 📚 Resources

### Development Resources
- **[Environment Setup Guide](./docs/development/setup/environment.md)**
- **[Local Development Guide](./docs/development/setup/local-development.md)**
- **[Architecture Documentation](./docs/architecture/README.md)**
- **[Security Guidelines](./docs/development/security/README.md)**

### External Resources
- **Spring Boot**: https://spring.io/projects/spring-boot
- **Spring Security**: https://spring.io/projects/spring-security
- **MongoDB**: https://docs.mongodb.com/
- **Apache Kafka**: https://kafka.apache.org/documentation/

### Community Resources
- **OpenFrame Website**: https://openframe.ai
- **Flamingo Platform**: https://www.flamingo.run/openframe
- **OpenMSP Community**: https://www.openmsp.ai/

## 🆘 Getting Help

### Where to Ask
- **General Questions**: `#general` channel in Slack
- **Development Help**: `#development` channel in Slack
- **Architecture Discussions**: `#architecture` channel in Slack
- **Feature Ideas**: `#feature-requests` channel in Slack

### Mentorship Program
New contributors can request mentorship:
1. Join the OpenMSP Slack community
2. Express interest in the `#development` channel
3. Get matched with an experienced contributor
4. Start with guided contributions

## 📄 License

By contributing to OpenFrame, you agree that your contributions will be licensed under the Flamingo AI Unified License v1.0, the same license that covers the project.

---

Thank you for contributing to OpenFrame! Your contributions help build the future of open-source MSP automation. Together, we're creating powerful, accessible technology for managed service providers worldwide. 🚀

**Questions?** Join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) and connect with our development team!