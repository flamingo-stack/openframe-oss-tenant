<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://shdrojejslhgnojzkzak.supabase.co/storage/v1/object/public/public/doc-orchestrator/logos/1771371901777-lc3cse-logo-openframe-full-dark-bg.png">
    <source media="(prefers-color-scheme: light)" srcset="https://shdrojejslhgnojzkzak.supabase.co/storage/v1/object/public/public/doc-orchestrator/logos/1771372526604-k3y1w-logo-openframe-full-light-bg.png">
    <img alt="OpenFrame" src="https://shdrojejslhgnojzkzak.supabase.co/storage/v1/object/public/public/doc-orchestrator/logos/1771372526604-k3y1w-logo-openframe-full-light-bg.png" width="400">
  </picture>
</div>

# Contributing to OpenFrame OSS Tenant

Thank you for your interest in contributing to OpenFrame! This guide covers everything you need to know to contribute code, documentation, and ideas to the project.

---

## 🌐 Community First

All contributions, questions, bug reports, and feature discussions happen in the **OpenMSP Slack Community**:

- **Join Slack**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- **Community Hub**: [openmsp.ai](https://www.openmsp.ai/)

> ⚠️ **Important**: We do **not** use GitHub Issues or GitHub Discussions. All issue tracking, feature requests, and support happen in the OpenMSP Slack — specifically in the `#openframe-dev` channel.

---

## 🏁 Getting Started

1. Read the [Introduction](./docs/getting-started/introduction.md) to understand the platform
2. Set up your [local development environment](./docs/development/setup/local-development.md)
3. Join [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) and introduce yourself in `#openframe-dev`
4. Look for good first tasks by asking in the `#openframe-dev` channel

---

## 🌿 Branch Naming Conventions

Use the following naming pattern for all branches:

```text
<type>/<short-description>
```

### Branch Types

| Prefix | Description | Example |
|---|---|---|
| `feat/` | New feature | `feat/multi-tenant-sso-microsoft` |
| `fix/` | Bug fix | `fix/jwt-expiry-handling` |
| `refactor/` | Code refactoring | `refactor/device-repository-layer` |
| `chore/` | Build, tooling, dependencies | `chore/upgrade-spring-boot-3.3` |
| `docs/` | Documentation changes | `docs/api-authentication-guide` |
| `test/` | Test additions or fixes | `test/ticket-service-integration` |
| `perf/` | Performance improvement | `perf/mongo-query-optimization` |

### Branch Naming Rules

- Use **lowercase** and **hyphens** only — no underscores or camelCase
- Keep the description **short and descriptive** (3–6 words)
- Reference the affected component or area: `feat/gateway-rate-limit-by-tier`

---

## 📝 Commit Message Format

Follow the **[Conventional Commits](https://www.conventionalcommits.org/)** specification:

```text
<type>(<scope>): <short description>

[optional body]

[optional footer(s)]
```

### Commit Types

| Type | When to Use |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `refactor` | Code restructuring (no feature/bug change) |
| `test` | Adding or updating tests |
| `docs` | Documentation only |
| `chore` | Build process, tooling, CI changes |
| `perf` | Performance improvement |
| `style` | Formatting, whitespace (no logic change) |

### Scope (Optional)

The scope is the affected component:

```text
feat(gateway): add per-tier rate limiting
fix(auth): handle expired refresh tokens gracefully
refactor(api): extract device filter to service class
test(stream): add Kafka deserialization integration test
```

### Commit Examples

```text
feat(auth): add Microsoft SSO tenant registration flow

Implements the full SSO registration flow for Microsoft Azure AD,
including tenant discovery and invitation acceptance via SSO.
```

```text
fix(gateway): prevent null pointer on missing tenant header

The TenantContextFilter was not handling requests without the
X-Tenant-Id header on the /health endpoint. Added null check.
```

```text
chore: upgrade spring-boot to 3.3.1

Also updates spring-cloud-dependencies to 2023.0.4.
```

---

## 🎨 Code Style & Conventions

### Java (Backend)

**Formatting:**
- Use **4-space indentation** (no tabs)
- Maximum line length: **120 characters**
- Opening braces on the same line (`{`)
- One blank line between methods

**Naming Conventions:**
- Classes: `PascalCase` — `DeviceFilterService`
- Methods / Fields: `camelCase` — `findByTenantId()`
- Constants: `UPPER_SNAKE_CASE` — `MAX_RETRY_ATTEMPTS`
- Packages: `lowercase` — `com.openframe.api.service`

**Lombok Usage:**

```java
// Prefer Lombok annotations for boilerplate
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Slf4j
public class DeviceFilterRequest {
    private String tenantId;
    private String organizationId;
}
```

**Logging:**

```java
// Use SLF4J via @Slf4j — parameterized logging only
log.debug("Processing device {} for tenant {}", deviceId, tenantId); // ✅
log.debug("Processing device " + deviceId);                           // ❌
```

**Exception Handling:**
- Use typed exceptions from `openframe-exception` (`NotFoundException`, `BadRequestException`, etc.)
- Never catch-and-swallow exceptions
- Always log the exception when catching it

**Multi-Tenancy Rule — Critical:**

```java
// ✅ Always use repository layer — tenantId is enforced automatically
repository.findAllByTenantId(tenantId);

// ❌ Never query MongoDB directly without tenantId scoping
mongoTemplate.find(new Query(), MyDocument.class);
```

### TypeScript / React (Frontend)

**Formatting:**
- Prettier handles formatting automatically — run `npm run format` before committing
- Use TypeScript strict mode
- Prefer functional components with hooks

**Naming Conventions:**
- Components: `PascalCase` — `DeviceCard.tsx`
- Hooks: `camelCase` with `use` prefix — `useDeviceFilters.ts`
- Utilities: `camelCase` — `deviceTransform.ts`
- Types / Interfaces: `PascalCase` — `DeviceFilterInput`

**Import Organization:**

```typescript
// 1. External libraries
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal imports (absolute paths)
import { DeviceCard } from '@/components/ui/device-card';
import { useDevices } from '@/app/(app)/devices/hooks/use-devices';

// 3. Types
import type { Device } from '@/app/(app)/devices/types/device.types';
```

---

## 🔄 Pull Request Process

### Before Opening a PR

- [ ] Code compiles without warnings
- [ ] All existing tests pass: `mvn test`
- [ ] New functionality includes tests
- [ ] Documentation updated where needed
- [ ] No hardcoded credentials or secrets
- [ ] Follows multi-tenancy patterns (no cross-tenant data access)
- [ ] Frontend code passes `npm run lint` and `npx tsc --noEmit`

### PR Title Format

Follow the same format as commit messages:

```text
feat(auth): add Microsoft SSO tenant registration flow
```

### PR Description Template

```markdown
## Summary
Brief description of what this PR does.

## Changes
- List of specific changes made
- Another change

## Testing
- How was this tested?
- What test cases were added?

## Notes (optional)
- Any breaking changes?
- Migration notes?
```

### PR Size Guidelines

- **Prefer small, focused PRs** — easier to review and less risky
- A good PR touches 1 concern, 1 service
- If a PR is growing large, split it into smaller incremental PRs

---

## 👀 Code Review

### For Authors

1. Self-review your diff before requesting a review
2. Address all review comments before re-requesting
3. Explain your reasoning when disagreeing with a comment
4. Mark comments resolved once addressed

### For Reviewers

**Correctness:**
- [ ] Does the code do what it says it does?
- [ ] Are edge cases handled?
- [ ] Is error handling appropriate?

**Security:**
- [ ] No hardcoded secrets or credentials
- [ ] Input validation is present
- [ ] Multi-tenant isolation is preserved
- [ ] Role-based access is correctly applied

**Quality:**
- [ ] Is the code readable and maintainable?
- [ ] Are there appropriate tests?
- [ ] Is logging adequate (not too much, not too little)?

**Architecture:**
- [ ] Does it follow the repository's patterns (processor pattern, repository layer, etc.)?
- [ ] Are new dependencies justified?

---

## 🧪 Testing Requirements

All PRs must include appropriate tests:

| Change Type | Required Tests |
|---|---|
| New service method | Unit test |
| New REST endpoint | Integration test (MockMvc) |
| New GraphQL resolver | Integration test (DGS) |
| Database schema change | Repository integration test |
| New domain model | Unit + repository test |
| Bug fix | Regression test covering the bug |

**Running tests:**

```bash
# All tests
mvn test

# Specific module
mvn test -pl openframe/services/openframe-api

# Specific test class
mvn test -pl openframe/services/openframe-api -Dtest=AgentRegistrationServiceTest

# Skip tests for fast builds
mvn clean install -DskipTests
```

---

## 📚 Documentation Requirements

Update documentation when:
- Adding a new API endpoint
- Changing authentication or authorization rules
- Adding a new configuration property
- Changing database schema (new collections or fields)
- Adding a new service or major component

---

## 📦 Dependency Management

### Adding Java Dependencies

1. Check if the dependency already exists in the parent POM
2. Add to `dependencyManagement` in `pom.xml` if new
3. Use `${version.property}` for version management
4. Prefer dependencies already used in `openframe-oss-lib`

### Adding Frontend Dependencies

```bash
cd openframe/services/openframe-frontend
npm install <package> --save
```

Justify new dependencies in the PR description — explain why they are needed and why an existing package cannot be used.

---

## 🔐 Security Checklist

Before every PR, verify:

- [ ] No hardcoded credentials, tokens, or secrets
- [ ] All DTOs have input validation annotations
- [ ] MongoDB queries go through the repository layer (not raw `MongoTemplate`)
- [ ] New endpoints have appropriate role annotations
- [ ] Sensitive data is not logged
- [ ] New API keys or tokens follow the hash-and-store pattern
- [ ] Multi-tenant isolation is preserved for new data models
- [ ] Exception handlers do not expose internal details to clients

> Report security vulnerabilities **privately** via [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA). Do not open public GitHub issues for security vulnerabilities.

---

## 🚀 Release Process

Releases are managed by the OpenFrame core team. Contributors do not need to manage versioning or releases directly. Share release-related feedback in the **OpenMSP Slack**.

---

## 📬 Getting Help

If you are stuck or have questions:

- **OpenMSP Slack**: [Join here](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) — ask in `#openframe-dev`
- **OpenFrame Website**: [openframe.ai](https://openframe.ai)
- **Flamingo Platform**: [flamingo.run](https://flamingo.run)

---

<div align="center">
  Built with 💛 by the <a href="https://www.flamingo.run/about"><b>Flamingo</b></a> team
</div>
