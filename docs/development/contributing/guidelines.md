# Contributing Guidelines

Welcome to OpenFrame! We're excited to have you contribute to this open-source MSP platform. This guide covers everything you need to know about contributing code, documentation, and feedback to the project.

## Code of Conduct

OpenFrame follows the [Contributor Covenant](https://www.contributor-covenant.org/) code of conduct. We are committed to providing a welcoming and inspiring community for all contributors.

### Our Values

- **Inclusivity**: Everyone is welcome, regardless of background or experience level
- **Respect**: Treat all community members with kindness and professionalism  
- **Collaboration**: Work together constructively and share knowledge openly
- **Quality**: Strive for excellence in code, documentation, and communication
- **Innovation**: Embrace new ideas and creative solutions

## Getting Started

### Before You Contribute

1. **Join the Community**: Connect with us on [Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
2. **Read the Documentation**: Familiarize yourself with the project architecture
3. **Set Up Development Environment**: Follow our [Environment Setup](../setup/environment.md) guide
4. **Explore Issues**: Browse GitHub Issues for beginner-friendly tasks

### Types of Contributions

We welcome various types of contributions:

| Contribution Type | Examples | Getting Started |
|------------------|----------|----------------|
| **Bug Fixes** | Fix crashes, incorrect behavior | Look for `bug` label in issues |
| **Features** | Add new functionality | Discuss in GitHub Discussions first |
| **Documentation** | Improve guides, fix typos | Look for `documentation` label |
| **Testing** | Add tests, improve coverage | Check test coverage reports |
| **Performance** | Optimize code, reduce memory usage | Profile and benchmark improvements |
| **Security** | Fix vulnerabilities, improve security | Report via security email |

## Development Workflow

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
cd openframe-oss-tenant

# Add upstream remote
git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git
```

### 2. Create a Feature Branch

```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

### 3. Make Your Changes

Follow these guidelines while developing:

#### Code Style

**Java Code Style:**
```java
// Follow Google Java Style Guide
// Use meaningful variable names
public class OrganizationService {
    
    private final OrganizationRepository organizationRepository;
    private final UserService userService;
    
    public OrganizationService(OrganizationRepository organizationRepository, 
                              UserService userService) {
        this.organizationRepository = organizationRepository;
        this.userService = userService;
    }
    
    /**
     * Creates a new organization with the provided details.
     *
     * @param request The organization creation request
     * @return The created organization response
     * @throws DuplicateOrganizationException if organization name already exists
     */
    public OrganizationResponse createOrganization(CreateOrganizationRequest request) {
        // Implementation
    }
}
```

**TypeScript/Vue Code Style:**
```typescript
// Use TypeScript for type safety
interface OrganizationFormData {
  name: string
  contactPerson: ContactPerson
  address?: Address
}

// Vue 3 Composition API
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useOrganizationStore } from '@/stores/organizationStore'

const organizationStore = useOrganizationStore()
const formData = ref<OrganizationFormData>({
  name: '',
  contactPerson: {
    name: '',
    email: ''
  }
})

const isFormValid = computed(() => 
  formData.value.name.length > 0 && 
  formData.value.contactPerson.email.includes('@')
)

async function submitForm(): Promise<void> {
  try {
    await organizationStore.createOrganization(formData.value)
    // Handle success
  } catch (error) {
    // Handle error
  }
}
</script>
```

#### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
# Format
<type>[optional scope]: <description>

[optional body]

[optional footer]

# Examples
feat(auth): add SSO integration with Google Workspace
fix(devices): resolve agent connection timeout issue
docs(api): update GraphQL schema documentation
test(organizations): add integration tests for CRUD operations
refactor(frontend): migrate to Vue 3 Composition API
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting (no logic changes)
- `refactor`: Code restructuring (no feature changes)
- `test`: Adding or updating tests
- `chore`: Build, CI, or tool changes

### 4. Write Tests

All contributions must include appropriate tests:

#### Backend Testing

```java
// Unit test for service layer
@ExtendWith(MockitoExtension.class)
class OrganizationServiceTest {

    @Mock
    private OrganizationRepository organizationRepository;

    @InjectMocks
    private OrganizationService organizationService;

    @Test
    @DisplayName("Should create organization successfully with valid data")
    void shouldCreateOrganizationWithValidData() {
        // Given
        CreateOrganizationRequest request = CreateOrganizationRequest.builder()
            .name("Test Organization")
            .build();

        Organization savedOrg = Organization.builder()
            .id("org-123")
            .name("Test Organization")
            .build();

        when(organizationRepository.save(any(Organization.class)))
            .thenReturn(savedOrg);

        // When
        OrganizationResponse result = organizationService.createOrganization(request);

        // Then
        assertThat(result.getId()).isEqualTo("org-123");
        assertThat(result.getName()).isEqualTo("Test Organization");
        verify(organizationRepository).save(any(Organization.class));
    }
}
```

#### Frontend Testing

```typescript
// Vue component test
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import OrganizationForm from '@/components/OrganizationForm.vue'

describe('OrganizationForm', () => {
  it('emits create event with form data when submitted', async () => {
    // Given
    const wrapper = mount(OrganizationForm)
    
    await wrapper.find('[data-test="name-input"]').setValue('Test Organization')
    await wrapper.find('[data-test="contact-name"]').setValue('John Doe')
    await wrapper.find('[data-test="contact-email"]').setValue('john@example.com')

    // When
    await wrapper.find('form').trigger('submit.prevent')

    // Then
    expect(wrapper.emitted('create')).toBeTruthy()
    const emittedData = wrapper.emitted('create')?.[0][0]
    expect(emittedData).toMatchObject({
      name: 'Test Organization',
      contactPerson: {
        name: 'John Doe',
        email: 'john@example.com'
      }
    })
  })
})
```

#### Test Coverage Requirements

- **Unit Tests**: 80% line coverage minimum
- **Integration Tests**: Critical user flows covered
- **E2E Tests**: Main user journeys tested
- **Security Tests**: Authentication and authorization scenarios

### 5. Documentation

Update documentation for your changes:

#### Code Documentation

```java
/**
 * Service for managing organizations in the OpenFrame platform.
 * 
 * <p>This service provides CRUD operations for organizations and handles
 * tenant isolation to ensure data security across multiple tenants.
 * 
 * @author Your Name
 * @since 0.4.0
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrganizationService {
    
    /**
     * Creates a new organization with the provided details.
     * 
     * <p>Validates the organization name for uniqueness within the tenant
     * and sets up default configuration for the organization.
     *
     * @param request The organization creation request containing name and contact details
     * @return The created organization with generated ID and timestamps
     * @throws DuplicateOrganizationException if an organization with the same name exists
     * @throws ValidationException if the request contains invalid data
     */
    public OrganizationResponse createOrganization(CreateOrganizationRequest request) {
        // Implementation
    }
}
```

#### API Documentation

```typescript
/**
 * GraphQL query to retrieve organizations with optional filtering.
 * 
 * @example
 * ```graphql
 * query GetOrganizations($filter: OrganizationFilterInput) {
 *   organizations(filter: $filter) {
 *     totalCount
 *     edges {
 *       node {
 *         id
 *         name
 *         contactPerson {
 *           name
 *           email
 *         }
 *       }
 *     }
 *   }
 * }
 * ```
 */
interface OrganizationQuery {
  organizations: OrganizationConnection
}
```

#### User Documentation

Update relevant user guides and API references:

- Update tutorial files if user-facing behavior changes
- Add examples to API documentation
- Update troubleshooting guides if needed
- Include screenshots for UI changes

### 6. Submit Your Pull Request

#### Pre-submission Checklist

Before submitting, ensure:

```bash
# ✅ Code compiles without warnings
mvn clean compile -DskipTests

# ✅ All tests pass
mvn test

# ✅ Code style is correct
mvn spotless:check

# ✅ Frontend builds successfully
cd openframe/services/openframe-frontend
npm run build
npm run type-check
npm run lint

# ✅ No security vulnerabilities
mvn org.owasp:dependency-check-maven:check
```

#### Pull Request Template

```markdown
## Description
Brief description of the changes and why they were made.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update

## Related Issues
Fixes #123
Relates to #456

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated  
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published
```

## Review Process

### What to Expect

1. **Automated Checks**: GitHub Actions will run tests and security scans
2. **Code Review**: Maintainers will review your code and provide feedback
3. **Discussion**: You may need to make changes based on feedback
4. **Approval**: Once approved, your PR will be merged

### Review Timeline

- **Initial Response**: Within 48 hours
- **Simple Bug Fixes**: 1-3 days
- **Small Features**: 3-7 days  
- **Large Features**: 1-2 weeks
- **Complex Changes**: May require design discussion first

### Review Criteria

Reviewers will check:

- **Functionality**: Does the code work as intended?
- **Testing**: Are appropriate tests included and passing?
- **Security**: Are there any security implications?
- **Performance**: Will this impact system performance?
- **Documentation**: Is documentation updated?
- **Style**: Does code follow project conventions?

## Advanced Contribution Guidelines

### Large Feature Development

For significant features:

1. **GitHub Discussion**: Start a discussion to gather feedback
2. **Design Document**: Create a design document for complex features
3. **Prototype**: Build a prototype or proof-of-concept
4. **Incremental PRs**: Break large features into smaller, reviewable PRs

#### Design Document Template

```markdown
# Feature: [Feature Name]

## Summary
Brief description of the feature.

## Motivation
Why is this feature needed?

## Detailed Design

### Architecture Changes
How will this affect the overall architecture?

### API Changes
What new APIs will be added or changed?

### Database Changes
What schema changes are needed?

### Security Considerations
What security implications exist?

## Implementation Plan

### Phase 1: Foundation
- [ ] Core service implementation
- [ ] Database schema changes

### Phase 2: API
- [ ] REST/GraphQL endpoints
- [ ] Authentication integration

### Phase 3: Frontend
- [ ] UI components
- [ ] User workflows

## Testing Plan
How will this feature be tested?

## Rollout Plan
How will this be deployed safely?
```

### Security Contributions

For security-related contributions:

1. **Report First**: Report security issues via email before creating public issues
2. **Security Review**: All security changes require additional security review
3. **CVE Process**: Follow responsible disclosure for vulnerabilities

### Performance Contributions

For performance improvements:

1. **Benchmark**: Include before/after performance benchmarks
2. **Profiling**: Provide profiling data showing improvements
3. **Load Testing**: Include load test results for significant changes

## Community Guidelines

### Communication Channels

| Channel | Purpose | Response Time |
|---------|---------|---------------|
| **GitHub Issues** | Bug reports, feature requests | 1-3 days |
| **GitHub Discussions** | Design discussions, questions | 1-2 days |
| **Slack** | Quick questions, community chat | Few hours |
| **Email** | Security issues, sensitive topics | 24 hours |

### Mentorship Program

New contributors can request mentorship:

1. **Comment on Issue**: Comment on beginner-friendly issues asking for guidance
2. **Slack Mentorship**: Request a mentor in the #mentorship Slack channel
3. **Pair Programming**: Schedule pair programming sessions with maintainers

### Recognition

We recognize contributors through:

- **Contributors Page**: Listed in project documentation
- **Release Notes**: Contributions highlighted in releases
- **Slack Shoutouts**: Recognition in community channels
- **Contributor Badge**: Special badge in community platforms

## Tools and Resources

### Development Tools

```bash
# Install development dependencies
npm install -g @commitlint/cli @commitlint/config-conventional
npm install -g lint-staged husky

# Set up pre-commit hooks
npx husky install
npx husky add .husky/pre-commit "lint-staged"
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit ${1}'
```

### Useful Scripts

```bash
# scripts/dev/format-code.sh
#!/bin/bash
echo "Formatting Java code..."
mvn spotless:apply

echo "Formatting TypeScript/Vue code..."
cd openframe/services/openframe-frontend
npm run format
cd ../../../

echo "Code formatting complete!"

# scripts/dev/run-tests.sh
#!/bin/bash
echo "Running backend tests..."
mvn test

echo "Running frontend tests..."
cd openframe/services/openframe-frontend
npm run test:unit
cd ../../../

echo "All tests complete!"
```

### Learning Resources

- **Spring Boot Documentation**: https://spring.io/projects/spring-boot
- **Vue 3 Documentation**: https://vuejs.org/guide/
- **GraphQL Documentation**: https://graphql.org/learn/
- **MongoDB Documentation**: https://docs.mongodb.com/
- **Apache Kafka Documentation**: https://kafka.apache.org/documentation/

## Frequently Asked Questions

### Q: How do I find good first issues?
**A:** Look for issues labeled with `good first issue` or `help wanted`. These are specifically chosen for new contributors.

### Q: Can I work on multiple issues at once?
**A:** We recommend focusing on one issue at a time, especially when starting. Once you're comfortable with the codebase, you can work on multiple issues.

### Q: How long should I wait for review?
**A:** Initial response within 48 hours. If you haven't heard back within a week, feel free to ping the reviewers or ask in Slack.

### Q: What if I disagree with review feedback?
**A:** Start a discussion in the PR. Explain your reasoning and be open to different perspectives. Maintainers are happy to explain their suggestions.

### Q: Can I contribute if I'm not an experienced developer?
**A:** Absolutely! We welcome contributors of all skill levels. Start with documentation, testing, or simple bug fixes to get familiar with the codebase.

### Q: How do I stay updated with project changes?
**A:** Watch the GitHub repository, join our Slack community, and follow release notes for major updates.

## Getting Help

If you need help with contributing:

1. **Check Documentation**: Look through our development guides
2. **Search Issues**: See if someone else has asked the same question
3. **Ask in Discussions**: Create a GitHub Discussion for design questions
4. **Join Slack**: Get real-time help from the community
5. **Contact Maintainers**: Reach out directly for sensitive issues

---

Thank you for contributing to OpenFrame! Your contributions help make IT management more accessible and powerful for organizations worldwide. 🚀