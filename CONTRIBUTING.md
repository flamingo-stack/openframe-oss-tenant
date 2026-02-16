# Contributing to OpenFrame

Welcome to the OpenFrame contributor community! We're excited to have you contribute to building the future of AI-powered MSP platforms. This guide will help you understand our development process, coding standards, and how to make meaningful contributions.

## 🎯 Ways to Contribute

### 1. Code Contributions
- **New Features**: Implement requested features from our roadmap
- **Bug Fixes**: Resolve issues reported by the community
- **Performance Improvements**: Optimize existing functionality
- **Tool Integrations**: Add support for new MSP tools
- **API Enhancements**: Extend GraphQL schema or REST endpoints

### 2. Documentation
- **User Guides**: Improve installation and usage documentation
- **API Documentation**: Enhance API references and examples
- **Architecture Docs**: Document system design and patterns
- **Tutorials**: Create step-by-step learning materials

### 3. Testing & Quality Assurance
- **Test Coverage**: Add unit, integration, and E2E tests
- **Bug Reports**: Submit detailed issue reports
- **Performance Testing**: Load and stress testing
- **Security Testing**: Vulnerability assessments

### 4. Community Support
- **Slack Community**: Answer questions in [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Code Reviews**: Review pull requests from other contributors
- **Mentoring**: Help onboard new contributors

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

1. **Development Environment**: Complete [Environment Setup](./docs/development/setup/environment.md)
2. **Local Development**: Successfully run [Local Development Setup](./docs/development/setup/local-development.md)
3. **Architecture Understanding**: Read [Architecture Overview](./docs/development/architecture/README.md)
4. **Testing Knowledge**: Understand our [Testing Strategy](./docs/development/testing/README.md)

### First Contribution Workflow

```mermaid
flowchart TD
    Fork[Fork Repository] --> Clone[Clone Your Fork]
    Clone --> Issue[Find/Create Issue]
    Issue --> Branch[Create Feature Branch]
    Branch --> Code[Write Code + Tests]
    Code --> Test[Run Test Suite]
    Test --> Commit[Commit Changes]
    Commit --> Push[Push to Fork]
    Push --> PR[Create Pull Request]
    PR --> Review[Code Review]
    Review --> Merge[Merge to Main]
    
    Review -->|Changes Needed| Code
```

## 🔀 Development Workflow

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git

# Verify remotes
git remote -v
```

### 2. Create a Feature Branch

```bash
# Update your fork with latest changes
git checkout main
git fetch upstream
git rebase upstream/main
git push origin main

# Create feature branch with descriptive name
git checkout -b feature/add-fleet-mdm-integration
# OR
git checkout -b fix/organization-validation-bug
# OR  
git checkout -b docs/improve-api-documentation
```

### 3. Development Guidelines

**Code Organization:**
- Keep changes focused and atomic
- Follow existing code patterns and structure
- Add appropriate logging and error handling
- Update relevant documentation
- Include comprehensive tests

**Commit Frequently:**
```bash
# Make small, logical commits with clear messages
git add src/main/java/com/openframe/api/service/OrganizationService.java
git commit -m "feat: add domain uniqueness validation to organization service

- Add validation to ensure domain names are unique within tenant
- Throw DuplicateDomainException when duplicate detected
- Add comprehensive unit tests for validation logic"
```

### 4. Code Quality Checks

```bash
# Run formatting and linting
mvn spotless:apply  # Java code formatting
npm run format      # Frontend code formatting (in frontend directory)

# Run tests
mvn test           # Backend unit tests
mvn test -Dtest=**/*IntegrationTest  # Integration tests
npm run test:unit  # Frontend unit tests (in frontend directory)

# Check test coverage
mvn jacoco:report  # Generate coverage report
```

## 📝 Commit Message Standards

We follow [Conventional Commits](https://conventionalcommits.org/) specification:

```text
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Commit Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(api): add organization search endpoint` |
| `fix` | Bug fix | `fix(ui): resolve device status update issue` |
| `docs` | Documentation | `docs(readme): update installation instructions` |
| `style` | Code style changes | `style(frontend): apply consistent formatting` |
| `refactor` | Code refactoring | `refactor(service): extract common validation logic` |
| `test` | Add or modify tests | `test(api): add integration tests for auth flow` |
| `chore` | Maintenance tasks | `chore(deps): update Spring Boot to 3.3.1` |

### Commit Examples

```bash
# Feature addition
git commit -m "feat(organizations): add domain uniqueness validation

- Implement domain validation service
- Add custom exception for duplicate domains  
- Include validation in organization creation/update flows
- Add comprehensive test coverage

Closes #123"

# Bug fix
git commit -m "fix(devices): resolve null pointer exception in status update

- Add null check for device status field
- Handle edge case when device is not found
- Improve error messaging for client

Fixes #456"

# Documentation update
git commit -m "docs(api): add GraphQL query examples

- Include sample queries for organizations endpoint
- Add pagination and filtering examples
- Update API reference documentation"
```

## 💻 Code Style & Standards

### Java Backend Standards

#### Code Style
```java
// Use clear, descriptive names
public class OrganizationService {
    
    private static final Logger LOGGER = LoggerFactory.getLogger(OrganizationService.class);
    
    private final OrganizationRepository repository;
    private final OrganizationMapper mapper;
    private final ApplicationEventPublisher eventPublisher;
    
    // Constructor injection preferred
    public OrganizationService(OrganizationRepository repository,
                              OrganizationMapper mapper,
                              ApplicationEventPublisher eventPublisher) {
        this.repository = repository;
        this.mapper = mapper;
        this.eventPublisher = eventPublisher;
    }
    
    /**
     * Creates a new organization with domain validation.
     * 
     * @param request The organization creation request
     * @return The created organization response
     * @throws DuplicateDomainException if domain already exists
     */
    @Transactional
    public OrganizationResponse create(CreateOrganizationRequest request) {
        LOGGER.debug("Creating organization with name: {}", request.getName());
        
        // Validate domain uniqueness
        validateDomainUnique(request.getDomain());
        
        // Map and save
        Organization entity = mapper.toEntity(request);
        entity.setTenantId(TenantSecurityContext.getTenantId());
        entity.setCreatedAt(Instant.now());
        
        Organization saved = repository.save(entity);
        
        // Publish event
        eventPublisher.publishEvent(new OrganizationCreatedEvent(saved));
        
        LOGGER.info("Created organization: {} with ID: {}", saved.getName(), saved.getId());
        return mapper.toResponse(saved);
    }
}
```

#### Error Handling
```java
// Use specific exception types
public class DuplicateDomainException extends BusinessException {
    public DuplicateDomainException(String domain) {
        super("Domain '" + domain + "' already exists", "DUPLICATE_DOMAIN");
    }
}

// Global exception handler
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(DuplicateDomainException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateDomain(DuplicateDomainException ex) {
        ErrorResponse error = ErrorResponse.builder()
            .message(ex.getMessage())
            .code(ex.getErrorCode())
            .timestamp(Instant.now())
            .build();
            
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }
}
```

### TypeScript Frontend Standards

#### Component Structure
```typescript
// OrganizationCard.vue
<template>
  <div class="organization-card" :class="{ 'organization-card--inactive': !organization.isActive }">
    <div class="organization-card__header">
      <h3 class="organization-card__name">{{ organization.name }}</h3>
      <StatusBadge :status="organization.status" />
    </div>
    
    <div class="organization-card__content">
      <p class="organization-card__domain">{{ organization.domain }}</p>
      <p class="organization-card__device-count">
        {{ $t('organization.deviceCount', { count: organization.deviceCount }) }}
      </p>
    </div>
    
    <div class="organization-card__actions">
      <Button 
        variant="outline" 
        size="sm" 
        @click="$emit('edit', organization)"
        :aria-label="$t('organization.edit')"
      >
        {{ $t('common.edit') }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineEmits, defineProps } from 'vue'
import type { Organization } from '@/types/organization'
import Button from '@/components/ui/Button.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'

interface Props {
  organization: Organization
}

interface Emits {
  (e: 'edit', organization: Organization): void
  (e: 'delete', organizationId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<style scoped>
.organization-card {
  @apply bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow;
}

.organization-card--inactive {
  @apply opacity-75;
}
</style>
```

## 🔍 Pull Request Process

### Pull Request Template

When creating a pull request, use this structure:

```markdown
## Description
Brief description of the changes and motivation.

Fixes #(issue number)

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement

## Changes Made
- Detailed list of changes
- Include any architectural decisions
- Mention any new dependencies

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed
- [ ] All tests pass locally

## Documentation
- [ ] Code comments updated
- [ ] README updated (if applicable)
- [ ] API documentation updated (if applicable)

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
```

### Review Process

```mermaid
flowchart LR
    PR[Pull Request Created] --> AutoCheck[Automated Checks]
    AutoCheck --> ReviewAssign[Reviewers Assigned]
    ReviewAssign --> Review[Code Review]
    Review --> Approve{Approved?}
    Approve -->|Yes| Merge[Merge to Main]
    Approve -->|No| Changes[Request Changes]
    Changes --> Update[Update PR]
    Update --> Review
    Merge --> Deploy[Deploy to Staging]
```

#### Review Criteria

**Code Quality:**
- [ ] Code follows established patterns and conventions
- [ ] Functions and classes have single responsibilities
- [ ] Error handling is appropriate and comprehensive
- [ ] Security best practices followed

**Testing:**
- [ ] Adequate test coverage for new functionality
- [ ] Tests are meaningful and test the right things
- [ ] Edge cases are covered
- [ ] Integration points are tested

**Documentation:**
- [ ] Code is self-documenting with clear variable/function names
- [ ] Complex logic is commented
- [ ] Public APIs are documented
- [ ] User-facing changes have documentation updates

## 🐛 Issue Reporting

### Bug Report Template

Use this template when reporting bugs:

```markdown
**Bug Description**
A clear and concise description of what the bug is.

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
A clear description of what you expected to happen.

**Actual Behavior**
What actually happened, including any error messages.

**Environment**
- OS: [e.g. macOS 12.6, Ubuntu 20.04, Windows 11]
- Browser: [e.g. Chrome 91, Firefox 89] (if applicable)
- OpenFrame Version: [e.g. v0.5.2]
- Java Version: [e.g. OpenJDK 21]

**Additional Context**
- Relevant log entries
- Screenshots if applicable
- Configuration files (sanitized)
```

### Feature Request Template

```markdown
**Feature Summary**
A brief description of the feature you'd like to see.

**Problem Statement**
What problem does this feature solve? What's the current limitation?

**Proposed Solution**
Describe your proposed solution including:
- How it would work from a user perspective
- Technical approach (if you have thoughts)

**Use Cases**
Specific scenarios where this feature would be valuable:
1. As a [role], I want [goal] so that [benefit]
2. When [situation], I need to [action] because [reason]

**Priority**
- [ ] Low - Nice to have
- [ ] Medium - Would significantly improve workflow
- [ ] High - Blocking current work
- [ ] Critical - Essential for production use
```

## 🏷️ Contribution Focus Areas

### High Priority Areas

1. **Tool Integrations**
   - Fleet MDM advanced features
   - Tactical RMM enhancements
   - New MSP tool connectors
   - Synchronization improvements

2. **AI Features**
   - Mingo AI conversation improvements
   - New AI model integrations
   - Automated troubleshooting
   - Predictive analytics

3. **Performance & Scalability**
   - Database query optimization
   - Caching improvements
   - Real-time update efficiency
   - Large tenant support

4. **Developer Experience**
   - Documentation improvements
   - Development tooling
   - Testing infrastructure
   - API enhancements

### Good First Issues

New contributors should look for issues labeled `good first issue`:

- Documentation updates and fixes
- Simple bug fixes in UI components
- Test coverage improvements
- Code formatting and linting fixes
- Small feature enhancements

## 🏆 Recognition & Becoming a Maintainer

### Contributor Recognition

We recognize contributions through:

- **Contributors Page**: Listed in repository contributors
- **Release Notes**: Contributions highlighted in release notes
- **Community Shoutouts**: Recognition in Slack and social media
- **Direct Feedback**: Personal thanks from maintainers

### Becoming a Maintainer

Active contributors may be invited to become maintainers with:

- Commit access to the repository
- Ability to review and merge pull requests
- Participation in roadmap planning
- Technical decision-making responsibilities

**Maintainer Criteria:**
- Consistent, high-quality contributions over 3+ months
- Deep understanding of OpenFrame architecture
- Positive community interaction and mentoring
- Alignment with project goals and values

## 📞 Getting Help

### Communication Channels

1. **[OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)**: Real-time help and community discussion
2. **[GitHub Issues](https://github.com/flamingo-stack/openframe-oss-tenant/issues)**: Bug reports and feature requests
3. **[GitHub Discussions](https://github.com/flamingo-stack/openframe-oss-tenant/discussions)**: Technical discussions

### Response Times

| Channel | Response Time | Best For |
|---------|---------------|----------|
| **Slack** | Few hours | Quick questions, real-time help |
| **GitHub Issues** | 1-2 business days | Bug reports, feature requests |
| **GitHub Discussions** | 1-2 business days | Technical discussions |
| **Pull Requests** | 2-3 business days | Code review |

> **Note**: We don't use GitHub Issues or GitHub Discussions for general support. Everything is managed on our OpenMSP Slack community for faster response times.

## 📜 Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- **Be respectful** in all interactions
- **Be patient** with newcomers and different skill levels  
- **Be constructive** in feedback and suggestions
- **Be collaborative** and help others learn
- **Be mindful** of time zones and cultural differences

Report any Code of Conduct violations to the maintainers via Slack or email.

## 🎉 Thank You!

Thank you for contributing to OpenFrame! Your contributions help build better tools for MSPs worldwide and advance the adoption of AI-powered automation in IT operations.

Every contribution, no matter how small, makes a difference. Whether you're fixing a typo, adding a test, or implementing a major feature, you're helping create something valuable for the community.

**Happy coding!** 🚀

---

**Ready to contribute?** 

1. **Check our [good first issues](https://github.com/flamingo-stack/openframe-oss-tenant/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)**
2. **Join our [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)** to introduce yourself
3. **Read the [Development Setup Guide](./docs/development/setup/local-development.md)** to get started
4. **Browse the [Architecture Documentation](./docs/architecture/)** to understand the codebase

Let's build the future of MSP automation together!