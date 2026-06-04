# Contributing Guidelines

Thank you for contributing to OpenFrame OSS Tenant! This guide covers code style conventions, branch naming, the pull request process, commit message format, and the review checklist.

---

## Community First

All contributions, issues, and feature requests are managed through the **OpenMSP Slack community** — not GitHub Issues or Discussions.

> **Join OpenMSP Slack:** [https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
>
> **Community Website:** [https://www.openmsp.ai/](https://www.openmsp.ai/)

Before submitting a PR for a significant change, discuss it in Slack to align on the approach.

---

## Code Style and Conventions

### Java

The project uses **Google Java Style** conventions with some project-specific adjustments.

Key rules:

| Rule | Standard |
|------|---------|
| Indentation | 4 spaces (no tabs) |
| Line length | 120 characters max |
| Import ordering | Static first, then alphabetical |
| Annotations | One per line |
| Braces | K&R style (opening brace on same line) |

**Lombok usage:**

Use Lombok annotations to reduce boilerplate:

```java
// DTOs and domain objects
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateOrganizationRequest {
    @NotBlank
    private String name;
    
    @Valid
    private ContactInformationDto contactInfo;
}

// Logging
@Slf4j
public class MyService {
    public void doSomething() {
        log.info("Doing something");
    }
}
```

**Service layer pattern:**

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class OrganizationCommandService {
    
    private final OrganizationRepository organizationRepository;
    private final EventPublisher eventPublisher;
    
    public OrganizationResponse createOrganization(
            CreateOrganizationRequest request,
            AuthPrincipal principal) {
        // ... implementation
    }
}
```

**Controller pattern:**

```java
@RestController
@RequestMapping("/api/organizations")
@RequiredArgsConstructor
public class OrganizationController {
    
    private final OrganizationCommandService commandService;
    
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrganizationResponse create(
            @Valid @RequestBody CreateOrganizationRequest request,
            @AuthenticationPrincipal AuthPrincipal principal) {
        return commandService.createOrganization(request, principal);
    }
}
```

### TypeScript / JavaScript (Frontend)

The frontend follows the project's ESLint and Prettier configuration.

Key conventions:

| Rule | Standard |
|------|---------|
| Indentation | 2 spaces |
| Quotes | Single quotes |
| Semicolons | Required |
| Line length | 100 characters |
| Component files | PascalCase (e.g., `DeviceCard.tsx`) |
| Utility files | kebab-case (e.g., `device-utils.ts`) |
| Hooks | `use-` prefix (e.g., `use-devices.ts`) |

**React component pattern:**

```typescript
import { type FC } from 'react';

interface DeviceCardProps {
  deviceId: string;
  hostname: string;
  status: 'ONLINE' | 'OFFLINE';
}

export const DeviceCard: FC<DeviceCardProps> = ({ deviceId, hostname, status }) => {
  return (
    <div className="device-card">
      <span>{hostname}</span>
      <span>{status}</span>
    </div>
  );
};
```

**Custom hook pattern:**

```typescript
import { useQuery } from '@tanstack/react-query';

export const useDevices = (filter?: DeviceFilter) => {
  return useQuery({
    queryKey: ['devices', filter],
    queryFn: () => fetchDevices(filter),
  });
};
```

---

## Branch Naming

All branches should follow this naming convention:

```text
<type>/<short-description>
```

| Type | When to use | Example |
|------|-------------|---------|
| `feature/` | New feature or enhancement | `feature/add-monitoring-tab` |
| `fix/` | Bug fix | `fix/device-heartbeat-offline-detection` |
| `chore/` | Maintenance, dependencies, tooling | `chore/upgrade-spring-boot-3-3` |
| `docs/` | Documentation changes | `docs/update-contributing-guide` |
| `refactor/` | Code restructuring without behavior change | `refactor/extract-tenant-service` |
| `test/` | Adding or updating tests | `test/add-ticket-service-coverage` |
| `hotfix/` | Critical production fix | `hotfix/fix-jwt-validation-regression` |

**Branch naming rules:**
- Use lowercase and hyphens only
- Keep the description short (3–5 words)
- Reference a Slack thread or feature context in the PR description

---

## Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```text
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation change |
| `style` | Formatting, missing semicolons (no logic change) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `test` | Adding or updating tests |
| `chore` | Build process, dependency updates, tooling |
| `perf` | Performance improvement |
| `ci` | CI/CD configuration changes |

### Scopes

Use the service or module name:

```text
feat(api): add device filter by organization
fix(gateway): correct JWT issuer cache expiry
refactor(stream): extract event enrichment service
test(management): add scheduler integration tests
chore(deps): upgrade spring-boot to 3.3.1
```

### Examples

```text
feat(tickets): add AI-powered ticket summarization

Integrates Claude AI via @ai-sdk/anthropic to generate
ticket summaries when a ticket is created or updated.

Closes #slack-thread-link
```

```text
fix(auth): prevent duplicate tenant registration

Adds uniqueness validation on tenant domain during registration.
Previously, concurrent registration requests could create
duplicate tenant records.
```

---

## Pull Request Process

### Before Opening a PR

1. Ensure your branch is up to date with `main`:
   ```bash
   git fetch origin
   git rebase origin/main
   ```

2. Run the full test suite:
   ```bash
   mvn clean verify
   ```

3. Run linting (frontend):
   ```bash
   cd openframe/services/openframe-frontend
   npm run lint
   ```

4. Ensure the build passes:
   ```bash
   mvn clean install -DskipTests
   ```

### PR Description Template

When opening a PR, include:

```markdown
## Summary
Brief description of what this PR does.

## Changes
- List of specific changes made
- Related service or module

## Testing
- How the changes were tested
- New tests added (if any)

## Notes
- Any breaking changes
- Deployment considerations
- Related Slack discussion link
```

### PR Size Guidelines

| Size | Lines Changed | Notes |
|------|--------------|-------|
| Small | < 100 lines | Preferred — easy to review |
| Medium | 100–500 lines | Acceptable with clear scope |
| Large | > 500 lines | Consider splitting into smaller PRs |

> Large PRs take longer to review and are more likely to have merge conflicts. Break large features into smaller, independently mergeable PRs where possible.

---

## Code Review Checklist

### For PR Authors

Before marking a PR ready for review:

- [ ] All CI checks pass (build, tests, lint)
- [ ] Self-reviewed the diff for obvious issues
- [ ] Added tests for new functionality
- [ ] Updated documentation if behavior changed
- [ ] No debug code, `TODO` comments, or commented-out code in production paths
- [ ] No secrets, credentials, or sensitive data in the diff
- [ ] Commit messages follow Conventional Commits format
- [ ] Branch is rebased on latest `main`

### For Reviewers

When reviewing a PR:

- [ ] Code logic is correct and handles edge cases
- [ ] New code follows existing patterns and conventions
- [ ] Tests adequately cover the new/changed code
- [ ] No security vulnerabilities introduced (see [Security Guidelines](../security/README.md))
- [ ] Multi-tenant scoping is preserved in any new data access
- [ ] API contracts are backward-compatible (or migration path documented)
- [ ] Performance impact is considered for hot paths
- [ ] Error messages are user-friendly and don't expose internals

---

## Development Workflow

```mermaid
flowchart LR
    Idea["Discuss in Slack"] --> Branch["Create feature branch"]
    Branch --> Code["Implement changes"]
    Code --> Test["Run tests locally"]
    Test --> PR["Open Pull Request"]
    PR --> Review["Code Review"]
    Review -->|"Changes requested"| Code
    Review -->|"Approved"| Merge["Merge to main"]
    Merge --> Deploy["Deploy / Release"]
```

---

## License

By contributing to OpenFrame OSS Tenant, you agree that your contributions will be licensed under the same license as the project. Please ensure you have the right to contribute any code you submit.
