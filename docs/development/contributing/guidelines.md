# Contributing Guidelines

Thank you for contributing to OpenFrame OSS Tenant! This guide covers code style, branch naming, the pull request process, commit message format, and the review checklist.

---

## Community and Communication

> **Important:** OpenFrame OSS Tenant does **not** use GitHub Issues or GitHub Discussions. All development discussions, bug reports, and feature requests are handled in the **OpenMSP Slack community**.

- **Join OpenMSP Slack:** [https://www.openmsp.ai/](https://www.openmsp.ai/)
- **Direct invite:** [Join Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

---

## Code Style and Conventions

### Java / Spring Boot Services

The codebase follows standard Java conventions with Lombok for boilerplate reduction.

**Key conventions:**
- Use `@Slf4j` for logging (via Lombok)
- Use `@Builder`, `@Data`, `@Value` annotations appropriately
- Prefer constructor injection over field injection (for testability)
- Use record types for immutable DTOs where appropriate (Java 21)
- Follow Spring naming conventions: `*Service`, `*Repository`, `*Controller`, `*DataFetcher`

**Package structure:**
```text
com.openframe.<service>.
├── config/        # Spring configuration classes
├── controller/    # REST controllers
├── datafetcher/   # GraphQL DGS data fetchers
├── dataloader/    # GraphQL DGS data loaders
├── dto/           # Data transfer objects
├── exception/     # Custom exceptions and handlers
├── mapper/        # MapStruct or manual mappers
└── service/       # Business logic services
```

**Formatting:** The Java codebase follows the default IntelliJ IDEA Java formatting. No external formatter is enforced via CI currently; use IntelliJ's built-in formatter.

### Rust (openframe-client)

Follow standard Rust conventions as enforced by `rustfmt` and `clippy`.

```bash
# Format
cargo fmt

# Lint
OPENFRAME_VERSION=0.0.0-dev cargo clippy -- -D warnings

# Both before committing
cargo fmt && OPENFRAME_VERSION=0.0.0-dev cargo clippy -- -D warnings
```

**Naming conventions:**
- Functions and variables: `snake_case`
- Types and traits: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Modules: `snake_case`

---

## Branch Naming

Use descriptive branch names that reflect the purpose of the change:

```text
# Feature branches
feat/add-script-scheduling-api

# Bug fixes
fix/agent-token-refresh-race-condition
fix/tenant-isolation-in-device-query

# Refactoring
refactor/extract-nats-publisher-interface

# Documentation
docs/update-architecture-diagram

# Chores / maintenance
chore/upgrade-spring-boot-3.3.1
chore/update-openframe-libs-5.65.0
```

**Format:** `<type>/<short-description-in-kebab-case>`

| Type | When to Use |
|---|---|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code restructuring without behavior change |
| `docs` | Documentation updates |
| `chore` | Dependency updates, CI, tooling |
| `test` | Adding or fixing tests |
| `perf` | Performance improvements |

---

## Commit Message Format

OpenFrame OSS Tenant uses [Conventional Commits](https://www.conventionalcommits.org/) format:

```text
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

**Examples:**

```text
feat(api): add script schedule assignment endpoint

Adds GraphQL mutation for assigning scripts to device groups with
configurable cron triggers. Validates against existing schedule conflicts.

Closes #123
```

```text
fix(openframe-client): prevent token refresh during shutdown

The token refresh run manager now checks the shutdown flag before
scheduling the next refresh to avoid errors during graceful shutdown.
```

```text
chore(deps): upgrade openframe-libs to 5.65.0
```

**Types:**

| Type | Description |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code refactoring |
| `docs` | Documentation only |
| `test` | Tests only |
| `chore` | Build, CI, dependencies |
| `perf` | Performance improvement |
| `style` | Formatting only (no logic change) |

**Scope examples:** `api`, `gateway`, `auth`, `openframe-client`, `stream`, `management`

---

## Pull Request Process

### Before Opening a PR

1. **Build successfully:** `mvn clean install -DskipTests` (for Java) or `OPENFRAME_VERSION=0.0.0-dev cargo build` (for Rust)
2. **Run tests:** `mvn test` or `OPENFRAME_VERSION=0.0.0-dev cargo test`
3. **Lint/format:** `cargo fmt && OPENFRAME_VERSION=0.0.0-dev cargo clippy` (Rust)
4. **Test your changes manually** against a running instance if possible

### PR Description

A good PR description includes:

- **What** was changed and why
- **How** to test the change
- Any **breaking changes** or migration notes
- Links to related Slack discussions

**Template:**

```markdown
## Summary
Brief description of what this PR changes and why.

## Changes
- List of specific changes made

## Testing
How to verify this change works correctly.

## Breaking Changes
Any breaking changes and migration path (if applicable).
```

### PR Size Guidelines

- **Prefer small, focused PRs** — one logical change per PR
- Large refactors should be broken into a series of smaller PRs when possible
- Data migrations (Mongock change units) should be in separate PRs

---

## Review Checklist

Use this checklist when reviewing PRs:

### Correctness
- [ ] Logic is correct and handles edge cases
- [ ] Error handling is appropriate (exceptions caught, logged, propagated correctly)
- [ ] No unintended side effects or race conditions

### Security
- [ ] No secrets or credentials committed to the repository
- [ ] New API endpoints have proper tenant isolation
- [ ] User input is validated with `@Valid` or equivalent
- [ ] MongoDB queries go through tenant-scoped templates

### Testing
- [ ] New code has appropriate unit/integration tests
- [ ] Tests cover happy path and key error scenarios
- [ ] Tests are deterministic (no time-dependent or order-dependent tests)

### Code Quality
- [ ] Code follows existing conventions (naming, package structure)
- [ ] No unnecessary complexity introduced
- [ ] Lombok / Rust idioms used appropriately
- [ ] No dead code or unused imports

### Documentation
- [ ] New services or significant features have code-level documentation
- [ ] Breaking changes are clearly documented in the PR description
- [ ] New environment variables are documented

### Spring Boot Specific
- [ ] New configurations are defined in `application.yml`, not hardcoded
- [ ] Async operations use `@Async` or reactive patterns consistently
- [ ] New Mongock migrations (`@ChangeUnit`) follow the naming convention

### Rust Specific
- [ ] `OPENFRAME_VERSION=0.0.0-dev cargo clippy -- -D warnings` passes with no warnings
- [ ] Error handling uses `anyhow::Result` or `thiserror` appropriately
- [ ] `Arc`/`Mutex` usage is minimal and necessary

---

## Dependency Updates

When updating the shared `openframe-libs` version (`openframe.libs.version` in `pom.xml`):

1. Update the version in the root `pom.xml`
2. Build all services: `mvn clean install -DskipTests`
3. Run tests: `mvn test`
4. Document any API changes from the library in the PR description

---

## License

By contributing to OpenFrame OSS Tenant, you agree that your contributions will be licensed under the same license as the project. See the [repository](https://github.com/flamingo-stack/openframe-oss-tenant) for license details.
