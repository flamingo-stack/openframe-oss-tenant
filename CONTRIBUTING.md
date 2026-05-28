<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://shdrojejslhgnojzkzak.supabase.co/storage/v1/object/public/public/doc-orchestrator/logos/1771371901777-lc3cse-logo-openframe-full-dark-bg.png">
    <source media="(prefers-color-scheme: light)" srcset="https://shdrojejslhgnojzkzak.supabase.co/storage/v1/object/public/public/doc-orchestrator/logos/1771372526604-k3y1w-logo-openframe-full-light-bg.png">
    <img alt="OpenFrame" src="https://shdrojejslhgnojzkzak.supabase.co/storage/v1/object/public/public/doc-orchestrator/logos/1771372526604-k3y1w-logo-openframe-full-light-bg.png" width="400">
  </picture>
</div>

# Contributing to OpenFrame OSS Tenant

Thank you for your interest in contributing to OpenFrame OSS Tenant! This document covers everything you need to know about code style, the PR process, commit message format, and the review checklist.

---

## Community First

Before contributing, join the **OpenMSP Slack community** — this is where all development discussions, bug reports, and feature requests happen:

- 💬 **Slack**: [Join OpenMSP](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- 🌐 **Website**: [https://www.openmsp.ai/](https://www.openmsp.ai/)

> **Important:** We do not use GitHub Issues or GitHub Discussions. All coordination happens on Slack.

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:

```bash
git clone https://github.com/<your-username>/openframe-oss-tenant.git
cd openframe-oss-tenant
```

3. **Build** the project to verify your environment:

```bash
mvn clean install -DskipTests
```

4. Follow the [Local Development guide](./docs/development/setup/local-development.md) to get the stack running.

---

## Code Style & Conventions

### Java

The project follows standard Java conventions with some additions:

**Formatting:**
- 4-space indentation (no tabs)
- Maximum line length: 120 characters
- UTF-8 encoding for all files
- Opening braces on the same line (K&R style)

**Naming:**
- Classes: `PascalCase` (e.g., `DeviceService`, `TenantContextFilter`)
- Methods/variables: `camelCase` (e.g., `findDeviceById`, `tenantId`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `MAX_RETRY_ATTEMPTS`)
- Packages: all lowercase (e.g., `com.openframe.api.service`)

**Lombok Usage:**

The project makes extensive use of Lombok annotations:

```java
@Data               // Getters, setters, equals, hashCode, toString
@Builder            // Builder pattern
@RequiredArgsConstructor  // Constructor for final fields
@Slf4j              // Logger field
@NoArgsConstructor  // No-args constructor (required for MongoDB)
@AllArgsConstructor // All-args constructor
```

**Spring Conventions:**

Use constructor injection, not field injection:

```java
@Service
@RequiredArgsConstructor
public class DeviceServiceImpl implements DeviceService {
    private final MachineRepository machineRepository;
    private final OrganizationService organizationService;
}
```

Use `@Transactional` at the service layer, not the repository layer.

**Exception Handling:**

Use the platform's exception hierarchy:

```java
throw new NotFoundException("Device not found: " + deviceId);
throw new BadRequestException("Invalid device status");
throw new ForbiddenException("Access denied to tenant resources");
```

### TypeScript / Next.js (Frontend)

For contributions to `openframe/services/openframe-frontend`:

- **ESLint** + **Prettier** enforce style automatically
- Use `const` over `let` where possible
- Prefer named exports over default exports
- Use TypeScript strict mode — no `any` types

### Rust (Agent Client)

For `clients/openframe-client`:

- Follow standard `rustfmt` formatting (`cargo fmt`)
- Use `clippy` for linting (`cargo clippy`)
- Document public APIs with `///` doc comments
- Prefer `Result<T, E>` over panics

---

## Branch Naming

Use descriptive branch names with a type prefix:

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/description` | `feat/add-fleet-mdm-integration` |
| Bug fix | `fix/description` | `fix/jwt-expiry-validation` |
| Refactor | `refactor/description` | `refactor/device-service-layer` |
| Documentation | `docs/description` | `docs/api-authentication-guide` |
| Hot fix | `hotfix/description` | `hotfix/critical-auth-bypass` |
| Chore | `chore/description` | `chore/update-spring-boot-version` |

---

## Commit Message Format

Follow the **Conventional Commits** specification:

```text
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type | When to Use |
|------|------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code change that is neither a fix nor a feature |
| `test` | Adding or updating tests |
| `docs` | Documentation changes only |
| `chore` | Build process, dependency updates, etc. |
| `perf` | Performance improvement |
| `ci` | CI/CD configuration changes |
| `revert` | Reverts a previous commit |

### Scope Examples

```text
feat(api): add cursor pagination for device listings
fix(gateway): resolve JWT issuer cache invalidation
refactor(stream): extract enrichment logic to separate service
test(auth): add integration tests for tenant registration
docs(security): update OAuth BFF authentication guide
chore(deps): upgrade spring-boot to 3.3.1
```

### Commit Body Example

```text
feat(api): add knowledge base tag filtering

Adds support for filtering knowledge base items by multiple tags
using AND/OR logic. Updates GraphQL schema and adds DataFetcher
with corresponding DataLoader for batch loading.
```

---

## Pull Request Process

### Before Opening a PR

1. **Sync with main branch:**

```bash
git fetch origin
git rebase origin/main
```

2. **Run tests locally:**

```bash
mvn test -pl openframe/services/openframe-api
```

3. **Ensure the full build passes:**

```bash
mvn clean install -DskipTests
```

4. **Check for style issues** using your IDE's code analysis tools (SonarLint recommended).

### PR Description Template

```text
## Summary
Brief description of what this PR changes and why.

## Changes
- List of specific changes made
- Component A: what changed
- Component B: what changed

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing performed

## Notes
Any additional context, breaking changes, or migration steps.
```

### PR Size Guidelines

- **Small PRs** (< 300 lines changed) are preferred — they're easier to review
- Break large changes into logical, independently-reviewable commits
- Each PR should address one concern (one feature, one fix)

---

## Review Checklist

Before approving a PR, reviewers check:

### Code Quality
- [ ] Code follows project conventions (naming, formatting, Lombok usage)
- [ ] No `TODO` comments left in the code
- [ ] Logging is appropriate (not too verbose, sensitive data masked)
- [ ] No hardcoded configuration values

### Architecture
- [ ] Changes respect the layered architecture (controller → service → repository)
- [ ] Dependencies flow in the right direction (no circular dependencies)
- [ ] New endpoints are secured with appropriate role checks
- [ ] Multi-tenant isolation is maintained (tenant context not leaked)

### Security
- [ ] No secrets or credentials in code
- [ ] Input validation using `@Valid` + domain validators
- [ ] No NoSQL injection risks (use repository abstractions)
- [ ] New API routes are covered by RBAC configuration

### Testing
- [ ] Unit tests cover the happy path and key edge cases
- [ ] Integration tests cover API contract
- [ ] Tests are deterministic (no timing dependencies)
- [ ] Test data is cleaned up after tests

### Documentation
- [ ] Public API methods have Javadoc comments
- [ ] Breaking changes are noted in the PR description
- [ ] Complex logic has inline comments explaining the "why"

---

## Security Vulnerability Reporting

If you discover a security vulnerability in OpenFrame OSS Tenant:

1. **Do not** open a GitHub Issue
2. Report privately via the **OpenMSP Slack** community security channel
3. Community: [https://www.openmsp.ai/](https://www.openmsp.ai/)
4. Slack: [Join OpenMSP](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

---

## Working with the OpenFrame OSS Library

The platform depends on `openframe-oss-lib` (version `5.64.0` in the parent POM). This is a separate library containing shared modules such as `openframe-core` and `openframe-data-mongo-common`.

If your contribution requires changes to shared library modules, coordinate with the core team on Slack before making changes — library changes have broad impact across all services.

---

## Release Process

Releases are coordinated by the core team and announced in the OpenMSP Slack community. Individual contributors don't need to manage versioning — focus on the quality of your contribution.

---

## Getting Help

If you're unsure about any of these guidelines:

1. Ask in the **#contributors** channel on OpenMSP Slack
2. Review existing PRs and commits for reference patterns
3. Check the [Architecture documentation](./docs/architecture/README.md) for design guidance

We prioritize being welcoming to new contributors — no question is too basic!

---

<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> team
</div>
