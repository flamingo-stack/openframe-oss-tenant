# Contributing to OpenFrame OSS Tenant

Thank you for your interest in contributing to OpenFrame! We welcome contributions from developers of all experience levels. This guide will help you get started.

## 🤝 How to Contribute

We manage all development discussions and coordination through our **OpenMSP Slack Community**:

- **Join our community**: [https://www.openmsp.ai/](https://www.openmsp.ai/)
- **Slack invite**: [Join OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

**Important**: We don't use GitHub Issues or GitHub Discussions. All questions, bug reports, feature requests, and development coordination happens on Slack.

## 🚀 Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Java:** OpenJDK 21.0.1+
- **Node.js:** 18+ with npm
- **Rust:** 1.70+ with Cargo
- **Docker:** 24.0+ with Docker Compose
- **Git:** 2.42+
- **GitHub account** with access to GitHub Packages

### Development Environment Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/openframe-oss-tenant.git
   cd openframe-oss-tenant
   ```

2. **Set up GitHub authentication:**
   ```bash
   export GITHUB_ACTOR=your-github-username
   export GITHUB_TOKEN=your-github-personal-access-token
   ```
   
   Your GitHub token needs `read:packages` scope for Maven dependencies.

3. **Build the backend services:**
   ```bash
   mvn clean install
   ```

4. **Set up frontend development:**
   ```bash
   cd openframe/services/openframe-frontend
   npm install
   npm run dev
   ```

5. **Build the Rust client:**
   ```bash
   cd ../../client
   cargo build --release
   ```

6. **Run tests to verify setup:**
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

## 🏗️ Project Structure

Understanding the codebase structure will help you navigate and contribute effectively:

```text
openframe-oss-tenant/
├── openframe/
│   ├── services/           # Spring Boot microservices
│   │   ├── openframe-api/
│   │   ├── openframe-authorization-server/
│   │   ├── openframe-gateway/
│   │   ├── openframe-frontend/
│   │   └── ...
│   └── client/            # Rust system agent
├── openframe-oss-lib/     # Core library modules
│   ├── openframe-api-service-core/
│   ├── openframe-gateway-service-core/
│   ├── openframe-authorization-service-core/
│   └── ...
└── clients/
    └── openframe-chat/    # Desktop AI chat client
```

### Key Components

- **Backend Services**: Spring Boot microservices in `openframe/services/`
- **Core Libraries**: Shared functionality in `openframe-oss-lib/`
- **Frontend**: Next.js application in `openframe/services/openframe-frontend/`
- **Rust Client**: System agent in `client/`
- **Chat Client**: Tauri + React desktop app in `clients/openframe-chat/`

## 📝 Development Workflow

### 1. Planning Your Contribution

Before starting work:

1. **Join our Slack community** and introduce yourself in the `#general` channel
2. **Discuss your idea** in the appropriate channel:
   - `#backend-dev` for Spring Boot services
   - `#frontend-dev` for React/Next.js work
   - `#rust-dev` for client/agent development
   - `#ai-integrations` for AI/ML features
3. **Get feedback** from maintainers and community members

### 2. Creating Your Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b bugfix/issue-description
```

### 3. Making Changes

#### Backend Development (Java/Spring Boot)

- Follow Spring Boot best practices
- Use reactive patterns where appropriate (WebFlux)
- Maintain multi-tenant security patterns
- Add appropriate tests (unit and integration)
- Update documentation for API changes

#### Frontend Development (TypeScript/React/Next.js)

- Use TypeScript for all new code
- Follow React best practices and hooks patterns
- Maintain accessibility standards
- Add component tests where appropriate
- Use the existing design system

#### Rust Development

- Follow Rust idioms and best practices
- Use async/await patterns with Tokio
- Add comprehensive error handling
- Include unit and integration tests
- Update documentation for API changes

### 4. Testing Your Changes

Always test your changes thoroughly:

```bash
# Backend tests
mvn test

# Frontend tests and type checking
cd openframe/services/openframe-frontend
npm run test
npm run type-check

# Rust tests
cd client
cargo test
```

### 5. Committing Changes

We follow conventional commit standards:

```bash
git commit -m "feat: add new device management endpoint"
git commit -m "fix: resolve JWT token refresh issue"
git commit -m "docs: update API documentation"
```

Commit message types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

## 🧪 Code Standards

### Java/Spring Boot

- Use Java 21 features appropriately
- Follow Spring Boot conventions
- Maintain reactive patterns in gateway and streaming services
- Use appropriate annotations (`@Component`, `@Service`, etc.)
- Handle security contexts properly in multi-tenant code

### TypeScript/React

- Use strict TypeScript configuration
- Follow React functional component patterns
- Use proper state management (React hooks, Context API)
- Maintain type safety throughout
- Follow accessibility best practices

### Rust

- Use `cargo fmt` for formatting
- Run `cargo clippy` and fix all warnings
- Use appropriate error types and handling
- Follow async patterns with Tokio
- Document public APIs

## 📖 Documentation

When contributing, please:

1. **Update relevant documentation** in the `/docs` folder
2. **Add inline code comments** for complex logic
3. **Update API documentation** for any API changes
4. **Include README updates** if adding new features

## 🐛 Reporting Bugs

Found a bug? Here's how to report it:

1. **Join our Slack community**: [https://www.openmsp.ai/](https://www.openmsp.ai/)
2. **Search existing discussions** in relevant channels to avoid duplicates
3. **Post in the appropriate channel** with:
   - Clear description of the issue
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Java version, etc.)
   - Screenshots if applicable

## 💡 Suggesting Features

Have an idea for a new feature?

1. **Join our Slack community** and discuss in `#feature-requests`
2. **Describe your use case** and the problem you're trying to solve
3. **Get community feedback** before starting implementation
4. **Consider the impact** on multi-tenancy and security

## 🔍 Code Review Process

1. **Submit your Pull Request** with:
   - Clear title and description
   - Reference to Slack discussion
   - List of changes made
   - Testing notes

2. **Respond to feedback** promptly and professionally

3. **Update your PR** based on reviewer comments

4. **Maintain your feature** after it's merged

## 🎯 Types of Contributions Welcome

We welcome various types of contributions:

- **Bug fixes** and stability improvements
- **New features** and enhancements
- **Documentation** improvements
- **Performance** optimizations
- **Security** enhancements
- **Testing** improvements
- **Integration** with new tools
- **UI/UX** improvements

## 🔒 Security Contributions

For security-related contributions:

1. **Do not open public issues** for security vulnerabilities
2. **Email security@flamingo.run** for sensitive issues
3. **Discuss security enhancements** in the `#security` Slack channel
4. **Follow responsible disclosure** practices

## 📞 Getting Help

Need help with your contribution?

- **Slack community**: Most active place for getting help
- **Documentation**: Check `/docs` folder for guides
- **Code examples**: Look at existing implementations
- **Maintainer contact**: Reach out in Slack `#general`

## 📜 License

By contributing to OpenFrame OSS Tenant, you agree that your contributions will be licensed under the [Flamingo AI Unified License v1.0](LICENSE.md).

## 🙏 Recognition

All contributors are recognized in:
- Repository contributors list
- Release notes for significant contributions
- Community shoutouts in Slack

Thank you for contributing to OpenFrame! Together, we're building the future of MSP platforms.

---

**Questions?** Join our community: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> team
</div>