# Contributing to OpenFrame

Thank you for your interest in contributing to OpenFrame! This guide will help you get started with contributing to the unified AI-powered MSP platform.

## 🌟 Welcome Contributors!

OpenFrame is built by a passionate community of developers, MSP professionals, and open-source enthusiasts. We welcome contributions from developers of all experience levels, whether you're fixing a typo, adding a feature, or improving documentation.

## 🗨️ Community First

**Important**: We manage all discussions, support, and coordination through our OpenMSP Slack community. Please join us there for the best experience:

**🔗 Join OpenMSP Slack**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA

> 📝 **Note**: We don't use GitHub Issues or GitHub Discussions. All feature requests, bug reports, design discussions, and community support happen in Slack.

## 🚀 Quick Start for Contributors

### 1. Join the Community
- Join our [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- Introduce yourself in `#introductions`
- Browse `#openframe-dev` for development discussions

### 2. Set Up Your Development Environment
Follow our comprehensive setup guides:
- [Environment Setup](./docs/development/setup/environment.md) - IDEs, tools, and extensions
- [Local Development](./docs/development/setup/local-development.md) - Clone, build, and run locally

### 3. Find Your First Contribution
- Check `#openframe-dev` in Slack for current needs
- Look for "good first issue" discussions
- Browse the codebase for TODO comments
- Improve documentation or add tests

## 🛠 Development Workflow

### Prerequisites
Make sure you have the required tools installed:
- **Java:** OpenJDK 21.0.1+
- **Node.js:** 18+ with npm
- **Rust:** 1.70+ with Cargo
- **Docker:** 24.0+ with Docker Compose
- **Git:** 2.42+

### GitHub Authentication Setup
OpenFrame depends on private GitHub packages. Set up authentication:

```bash
export GITHUB_ACTOR=your-github-username  
export GITHUB_TOKEN=your-github-token
```

### Standard Development Flow

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/openframe-oss-tenant.git
   cd openframe-oss-tenant
   git remote add upstream https://github.com/flamingo-stack/openframe-oss-tenant.git
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-awesome-feature
   ```

3. **Make Your Changes**
   - Follow our [code style guidelines](#code-style)
   - Add tests for new functionality
   - Update documentation as needed

4. **Test Your Changes**
   ```bash
   # Backend tests
   mvn test
   
   # Frontend tests
   cd openframe/services/openframe-frontend
   npm run test
   npm run type-check
   
   # Rust tests
   cd clients/openframe-client
   cargo test
   ```

5. **Commit and Push**
   ```bash
   git add .
   git commit -m "feat: add awesome new feature"
   git push origin feature/your-awesome-feature
   ```

6. **Open Pull Request**
   - Create a PR from your fork to the main repository
   - Reference any related Slack discussions
   - Provide clear description of changes

## 📋 Code Style Guidelines

### Java Standards
- **Java Version**: Use Java 21 features (records, sealed classes, pattern matching)
- **Spring Boot**: Follow Spring conventions and best practices
- **Naming**: Use descriptive names, follow camelCase conventions
- **Documentation**: Add Javadoc for public APIs

```java
// ✅ Good: Use records for DTOs
public record UserResponse(String id, String name, String email) {}

// ✅ Good: Constructor injection
@Service
public class UserService {
    private final UserRepository userRepository;
    
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}
```

### TypeScript/Vue Standards
- **TypeScript**: Use strict mode, define proper types
- **Vue 3**: Use Composition API with `<script setup>`
- **Components**: Follow PascalCase for components, camelCase for props
- **State**: Use Pinia stores with TypeScript

```vue
<script setup lang="ts">
interface Props {
  readonly userId: string
  readonly editable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  editable: false
})

const userStore = useUserStore()
const { user, loading } = storeToRefs(userStore)
</script>
```

### Rust Standards
- **Error Handling**: Use `Result` types and proper error propagation
- **Async**: Use Tokio for async operations
- **Dependencies**: Keep dependencies minimal and well-justified
- **Documentation**: Add doc comments for public functions

```rust
use anyhow::{Context, Result};

pub async fn fetch_user_data(id: &str) -> Result<UserData> {
    let response = reqwest::get(&format!("/api/users/{}", id))
        .await
        .context("Failed to fetch user data")?;
        
    let user_data = response.json().await
        .context("Failed to parse user data")?;
        
    Ok(user_data)
}
```

## 🧪 Testing Requirements

We follow a test pyramid approach:

### Test Coverage Expectations
- **Unit Tests**: 70% - Test individual functions and components
- **Integration Tests**: 20% - Test service interactions  
- **End-to-End Tests**: 10% - Test critical user workflows

### Testing Commands
```bash
# Run all tests
mvn test                               # Java backend
npm run test                           # Frontend  
cargo test                            # Rust client

# Run specific test suites
mvn test -Dtest=UserServiceTest        # Specific Java test
npm run test -- UserComponent.test.ts # Specific frontend test
cargo test --package openframe-client # Specific Rust package
```

### Writing Good Tests
- Write clear, descriptive test names
- Use the Arrange-Act-Assert pattern
- Mock external dependencies
- Test both happy path and error cases

## 📝 Documentation Standards

### Code Documentation
- **Java**: Use Javadoc for public APIs
- **TypeScript**: Use TSDoc comments
- **Rust**: Use doc comments (`///`)

### README and Guides
- Use clear, concise language
- Include code examples
- Test all commands and scripts
- Update table of contents

### API Documentation
- Document all GraphQL schema changes
- Include example queries and responses
- Update OpenAPI specs for REST endpoints

## 🔄 Pull Request Process

### Before Submitting
- [ ] Run all tests locally
- [ ] Update documentation
- [ ] Discuss major changes in Slack first
- [ ] Ensure commits follow conventional commit format

### PR Guidelines
1. **Clear Title**: Use descriptive titles (`feat:`, `fix:`, `docs:`, `refactor:`)
2. **Detailed Description**: Explain what and why, not just how
3. **Link Discussions**: Reference related Slack conversations
4. **Screenshots**: Include UI changes if applicable
5. **Breaking Changes**: Clearly document any breaking changes

### Review Process
- Maintainers will review within 2-3 business days
- Address feedback promptly
- Keep discussions respectful and constructive
- Be open to suggestions and improvements

## 🏗 Project Structure for Contributors

```
openframe-oss-tenant/
├── openframe/                    # Main Java project
│   ├── services/                # Microservices
│   │   ├── openframe-api/       # GraphQL API service
│   │   ├── openframe-gateway/   # API Gateway
│   │   ├── openframe-frontend/  # Vue.js frontend
│   │   └── openframe-client/    # Agent management
│   └── libs/                    # Shared Java libraries
├── clients/                     # Client applications
│   └── openframe-client/        # Rust system agent
├── manifests/                   # Kubernetes manifests
├── integrated-tools/            # Docker configs for tools
├── scripts/                     # Development scripts
└── docs/                        # Documentation
```

## 🎯 Contribution Ideas

### Good First Issues
- Fix typos or improve documentation
- Add unit tests for existing code
- Improve error messages
- Add logging statements
- Update dependencies

### Intermediate Contributions  
- Add new GraphQL endpoints
- Create Vue components
- Implement Rust client features
- Add integration tests
- Improve performance

### Advanced Contributions
- Design new microservices
- Add AI/ML integrations
- Implement security features
- Add monitoring capabilities
- Create deployment automation

## 🛡 Security Contributions

If you find a security vulnerability:

1. **DO NOT** open a public issue
2. Email us at: security@flamingo.run
3. Provide detailed reproduction steps
4. Allow reasonable time for response

We appreciate responsible disclosure and will acknowledge security contributions appropriately.

## 🏷 Commit Message Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for consistent commit messages:

### Format
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes

### Examples
```bash
feat(auth): add OAuth2 integration with Authentik
fix(api): resolve null pointer exception in user service
docs(readme): update installation instructions
test(client): add integration tests for agent registration
```

## 🌈 Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Assume good intentions

### Communication Best Practices
- Use clear, professional language
- Be patient with questions and feedback
- Share knowledge and help others grow
- Celebrate successes and learn from failures

## 🔗 Getting Help

### Resources
- **Slack Community**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
- **Documentation**: [Development Docs](./docs/development/README.md)
- **Architecture Guide**: [Architecture Overview](./docs/development/architecture/overview.md)
- **OpenFrame Website**: https://www.flamingo.run/openframe

### Slack Channels
- `#openframe-dev` - Development discussions
- `#help-wanted` - Looking for contributors
- `#general` - General OpenMSP discussions
- `#introductions` - New member introductions

## 🎉 Recognition

Contributors are recognized in several ways:
- Listed in our [Contributors](https://github.com/flamingo-stack/openframe-oss-tenant/graphs/contributors) page
- Acknowledged in release notes for significant contributions
- Featured in community showcases
- Invited to exclusive contributor events

## 📞 Contact

For questions about contributing:
- **Primary**: Join our Slack community
- **Security Issues**: security@flamingo.run
- **General Inquiries**: hello@flamingo.run

---

Thank you for contributing to OpenFrame! Together, we're building the future of MSP tooling with open-source innovation and AI-powered automation. 🚀

<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> team and our amazing contributors
</div>