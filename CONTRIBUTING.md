# Contributing to OpenFrame OSS Tenant

Thank you for your interest in contributing to OpenFrame OSS Tenant! This guide covers everything you need to know about code style, branch naming, the pull request process, commit message format, and the review checklist.

---

## 💬 Community and Communication

> **Important:** OpenFrame OSS Tenant does **not** use GitHub Issues or GitHub Discussions. All development discussions, bug reports, and feature requests are handled in the **OpenMSP Slack community**.

- **Join OpenMSP Slack:** [https://www.openmsp.ai/](https://www.openmsp.ai/)
- **Direct invite:** [Join Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

Before opening a pull request, we encourage you to discuss the change in Slack first — especially for larger features or refactors.

---

## 🛠️ Development Setup

Before contributing, set up your development environment:

1. Follow the [Prerequisites](./docs/getting-started/prerequisites.md) guide to install required tools
2. Follow the [Local Development](./docs/development/setup/local-development.md) guide to clone and build the project
3. Review the [Architecture Overview](./docs/development/architecture/README.md) to understand how services interconnect

---

## 📐 Code Style and Conventions

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

**Formatting:** The Java codebase follows the default IntelliJ IDEA Java formatting.

### Rust (`openframe-client`)

Follow standard Rust conventions as enforced by `rustfmt` and `clippy`.

```bash
# Format
cargo fmt

# Lint (warnings are errors)
OPENFRAME_VERSION=0.0.0-dev cargo clippy -- -D warnings

# Run both before committing
cargo fmt && OPENFRAME_VERSION=0.0.0-dev cargo clippy -- -D warnings
```

**Naming conventions:**
- Functions and variables: `snake_case`
- Types and traits: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Modules: `snake_case`

### TypeScript / React (`openframe-chat`)

The project uses [Biome](https://biomejs.dev/) for both formatting and linting (replaces ESLint + Prettier).

```bash
cd clients/openframe-chat

# Format and lint check
npx biome check .

# Auto-fix
npx biome check --write .
```

**Conventions:**
- React components: `PascalCase` filenames and function names
- Hooks: `use` prefix (e.g., `useChat`, `useChatMessages`)
- Services: camelCase filenames (e.g., `chatApiService.ts`)
- Types/interfaces: `PascalCase`
- Use TypeScript strict mode
- Prefer named exports for hooks and utilities; default export for page/component files

---

## 🌿 Branch Naming

Use descriptive branch names that reflect the purpose of the change:

```text
feat/add-script-scheduling-api
feat/openframe-chat-approval-flow
fix/agent-token-refresh-race-condition
fix/tenant-isolation-in-device-query
refactor/extract-nats-publisher-interface
docs/update-architecture-diagram
chore/upgrade-spring-boot-3.3.1
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

## 📝 Commit Message Format

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
```

```text
fix(openframe-client): prevent token refresh during shutdown

The token refresh run manager now checks the shutdown flag before
scheduling the next refresh to avoid errors during graceful shutdown.
```

```text
chore(deps): upgrade openframe-libs to 5.65.0
```

**Type reference:**

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

**Scope examples:** `api`, `gateway`, `auth`, `openframe-client`, `openframe-chat`, `stream`, `management`

---

## 🔀 Pull Request Process

### Before Opening a PR

1. **Build successfully:**
   - Java: `mvn clean install -DskipTests`
   - Rust: `OPENFRAME_VERSION=0.0.0-dev cargo build`
   - TypeScript: `npm run build`
2. **Run tests:**
   - Java: `mvn test`
   - Rust: `OPENFRAME_VERSION=0.0.0-dev cargo test`
   - TypeScript: `npx tsc --noEmit`
3. **Lint/format:**
   - Rust: `cargo fmt && OPENFRAME_VERSION=0.0.0-dev cargo clippy -- -D warnings`
   - TypeScript: `npx biome check --write .`
4. **Test your changes manually** against a running instance if possible

### PR Description Template

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

## ✅ Review Checklist

Use this checklist when reviewing or submitting PRs:

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

## 🔒 Security

When contributing, keep these security principles in mind:

- **Never commit secrets or credentials** — use environment variables or `.env` files (which must be in `.gitignore`)
- **All new API endpoints** must enforce tenant isolation
- **MongoDB queries** must go through `TenantAwareMongoTemplate` or equivalent tenant-scoped access
- **User input** must be validated with `@Valid` and custom validators; never passed raw to queries

Security issues should be reported via the **OpenMSP Slack community** — not through public GitHub issues.

For full security guidelines, see the [Security Documentation](./docs/development/security/README.md).

---

## 📦 Dependency Updates

### Shared Java Libraries (`openframe-libs`)

When updating `openframe.libs.version` in `pom.xml`:

1. Update the version in the root `pom.xml`
2. Build all services: `mvn clean install -DskipTests`
3. Run tests: `mvn test`
4. Document any API changes from the library in the PR description

### Frontend Dependencies (`openframe-chat`)

```bash
cd clients/openframe-chat
npm update
npm install
npx tsc --noEmit
npx biome check .
```

---

## 📄 License

By contributing to OpenFrame OSS Tenant, you agree that your contributions will be licensed under the same license as the project. See the [repository](https://github.com/flamingo-stack/openframe-oss-tenant) for license details.

---

<div align="center">
  Questions? Join the <a href="https://www.openmsp.ai/"><b>OpenMSP Slack community</b></a> — we're happy to help.
</div>
