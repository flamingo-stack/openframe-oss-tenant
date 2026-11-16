# Contributing to OpenFrame OSS Tenant

Thank you for your interest in contributing to **OpenFrame OSS Tenant** — the deployable, self-hosted tenant distribution of [OpenFrame](https://openframe.ai) ([flamingo.run/openframe](https://www.flamingo.run/openframe)), built by [Flamingo](https://flamingo.run). This repository assembles Spring Boot backend services (`openframe-api`, `openframe-gateway`, `openframe-authorization-server`, `openframe-external-api`, `openframe-client`, `openframe-stream`, `openframe-management`, `openframe-config`, `openframe-test`), the Kubernetes/Argo CD manifests that deploy them, shared runtime configuration, and the Rust `openframe-client` agent under `clients/openframe-client`.

This guide covers setting up a development environment, the development workflow (branches, commits, pull requests, reviews), code style, running and writing tests, reporting security issues, and where to find more documentation.

## Community and communication

This project does **not** use GitHub Issues or GitHub Discussions for feature requests, bug reports, or general discussion. Coordination and support happen in the OpenMSP Slack community:

- [https://www.openmsp.ai/](https://www.openmsp.ai/)
- [Join Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

GitHub pull requests remain the mechanism for proposing and reviewing code changes. Before opening a larger pull request, consider discussing the change in Slack first. Reference the relevant Slack conversation in your PR description instead of inventing a GitHub Issue or Discussion number.

## How this repository fits the ecosystem

Per the organization's repository graph (coverage: full), OpenFrame OSS Tenant publishes nine Maven artifacts under `com.openframe` (all `1.0.0-SNAPSHOT`) plus the `openframe_client` Cargo crate (`0.1.0`). It pins 22 Maven artifacts and one Cargo crate (`openframe_agent_lib`, tag `v0.0.5`) from the [OpenFrame OSS Library](https://github.com/flamingo-stack/openframe-oss-lib) at version `7.0.11`. No repository in the organization is recorded as consuming artifacts published from here — this repository sits at the end of the dependency chain, assembling the library into a deployable product rather than being built upon by others.

A practical consequence: most domain logic (API resolvers, authorization flows, client registration, gateway routing, stream processing) lives upstream in OpenFrame OSS Library, not in this repository. Before writing new logic here, check whether it belongs in the OSS Library instead. The Rust agent build depends directly on that library too: `clients/openframe-client/Cargo.toml` pins `openframe-agent-lib` to tag `v0.0.5` of the OpenFrame OSS Library git repository, and `clients/openframe-client/src/main.rs` is a thin wrapper that calls into it.

If you are touching the CLI surface exposed by the separately maintained [openframe-cli](https://github.com/flamingo-stack/openframe-cli) tool, consult that repository's own [installation guide](https://github.com/flamingo-stack/openframe-cli#installation) and [documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs) — it is not part of this codebase, and changes to it belong there.

## Setting up a development environment

Do not try to piece a setup together from scratch here — follow the dedicated guides, which are kept current with the repository's actual structure:

1. [Introduction](./docs/getting-started/introduction.md) and [Prerequisites](./docs/getting-started/prerequisites.md) — orientation and tools you need before you start.
2. [Quick Start](./docs/getting-started/quick-start.md) and [First Steps](./docs/getting-started/first-steps.md) — get something running quickly.
3. [Environment Setup](./docs/development/setup/environment.md) — JDK/Rust toolchain, IDE configuration (VS Code launch configs and tasks), and environment variables.
4. [Local Development](./docs/development/setup/local-development.md) — building, running services and the Rust agent locally, and debugging.
5. [Architecture Overview](./docs/development/architecture/README.md) — how the gateway, authorization server, API, client, management, and stream services fit together before you start changing code.

In short: the backend is a Maven multi-module project rooted at `pom.xml` (Spring Boot `4.1.1`, Java `25`, Spring Cloud `2025.1.3`), and the Rust agent lives at `clients/openframe-client/`, with its build requiring the `OPENFRAME_VERSION` environment variable passed through to `openframe-agent-lib`'s build script. See [Environment Setup](./docs/development/setup/environment.md) for the full toolchain list and IDE configuration — it is not duplicated here.

## Development workflow

### Branches

Branch naming is not rigidly enforced by a single documented scheme, but align with the ownership boundaries defined in `.github/CODEOWNERS` and keep these constraints in mind:

- **Default branch is `main`.** Open pull requests against [flamingo-stack/openframe-oss-tenant](https://github.com/flamingo-stack/openframe-oss-tenant/pulls) rather than pushing directly to `main`.
- **Avoid reserved branch prefixes.** `ai-fix/`, `setup/`, and `code-documentation/` are reserved for automated review-fix branches, the hub's setup automation, and automated documentation pull requests respectively.
- **Scope your branch to one ownership area where practical** — for example `openframe/` (backend services, owned by `@flamingo-stack/backend-engineers`), `clients/openframe-client/` (the Rust agent, owned by `@flamingo-stack/client-engineers`), `configs/` (owned by `@flamingo-stack/backend-engineers`, with `configs/base/` additionally requiring sign-off from `@flamingo-stack/tech-leads` and `@flamingo-stack/tech-heads-of`), or `manifests/` (Kubernetes/Argo CD, owned by `@flamingo-stack/devops-engineers`). Name your branch so the area it touches and your intent are clear — for example `backend/<short-description>` for an `openframe/services` change, `client/<short-description>` for the Rust agent, or `manifests/<short-description>` for Helm/Argo CD work.

### Commits

No commit-lint enforcement is visible in this repository's workflows, but keep commits reviewable and bisectable:

- Write a short, imperative summary line (for example, "Gate tenant-scoped repository with ConditionalOnProperty" rather than "Fixed stuff").
- Scope the subject to the module or service you changed when it helps reviewers, e.g. `openframe-gateway: add route for /clients/**` or `clients/openframe-client: bump openframe-agent-lib to v0.0.5`.
- Keep refactors that are "part of the feature" (extracting duplication, adding a missing layer) in the same PR/commit series as the feature that required them, rather than deferring cleanup.
- Reference the relevant OpenMSP Slack discussion thread in the PR description rather than a GitHub Issue number, since this project does not use GitHub Issues.
- Avoid bundling unrelated areas (for example, a `configs/base` change and an unrelated `manifests/tenant` change) in a single commit — CODEOWNERS reviews by path, and mixed commits make scoped review harder.

### Opening a pull request

1. Branch from `main` (the repository's default branch).
2. Keep the change scoped to one area of ownership where possible, so CODEOWNERS review stays meaningful.
3. Open the PR against `flamingo-stack/openframe-oss-tenant` at [github.com/flamingo-stack/openframe-oss-tenant/pulls](https://github.com/flamingo-stack/openframe-oss-tenant/pulls).
4. GitHub requests review automatically from the relevant CODEOWNERS team(s) based on the paths you touched.
5. A push to the repository's default branch (outside `docs/**` and `**.md`) triggers the code-graph rebuild, which keeps the generated ecosystem reference current for every PR opened afterward.
6. Changes to `manifests/**`, `openframe/**`, `integrated-tools/**`, `pom.xml`, or `clients/**` on `main` trigger the release workflow, which builds images, the Rust client binaries, and the Helm chart, and can cut a tagged release via manual dispatch.

### Automated code review

This repository runs **🦩 Flamingo Code Review** against every pull request. Key things to know as a contributor:

- A pull request does **not** get reviewed automatically the moment it is opened, reopened, or marked ready for review — those events only post an **invitation** comment with a checkbox.
- To request the first (or a repeat) review, check the box in that summary comment, or comment `@flamingo-review` on the PR, or apply the `flamingo-review` label from the sidebar. `@flamingo-review full` (or checking "Review the whole diff again") re-reads the whole cumulative diff instead of only the delta since the last review.
- Adding the `flamingo-review-always` label subscribes a PR to review on every push — useful for a large or risky refactor.
- Only comments from users with `OWNER`, `MEMBER`, or `COLLABORATOR` association can trigger a review via comment; checkbox edits must come from a human, not a bot.
- `.github/workflows/flamingo-code-review.yml` is generated by the Flamingo hub and is byte-identical across every reviewed repository — never edit it by hand; it carries its own "do not edit by hand" header.

### Stale branch cleanup

A scheduled cleanup workflow deletes unprotected branches with no commits in the last 60 days. Delete or merge your branch promptly after merge to avoid relying on this; it is a safety net, not a workflow step to depend on.

### Reviews — ownership (CODEOWNERS)

`.github/CODEOWNERS` assigns review ownership by path, using **last-match-wins** (more specific patterns win over broader ones):

| Path | Owning team |
|---|---|
| `/openframe/` | `@flamingo-stack/backend-engineers` |
| `/clients/openframe-client/` | `@flamingo-stack/client-engineers` |
| `/configs/` | `@flamingo-stack/backend-engineers` |
| `/configs/base/` | `@flamingo-stack/tech-leads` and `@flamingo-stack/tech-heads-of` (stricter than the rest of `/configs/`, since this is the shared Spring Cloud Config that every service reads) |
| `/manifests/` | `@flamingo-stack/devops-engineers` |
| `/.github/CODEOWNERS` | `@flamingo-stack/devops-engineers` |

Because CODEOWNERS uses last-match-wins, a pull request touching `configs/base/application.yml` requires the tech-leads/tech-heads-of approval even though the broader `/configs/` rule also matches.

### Review checklist

Before requesting review (or checking the reviewer's invitation box), verify:

**Scope and ownership**
- [ ] The change is scoped to one ownership area where practical (`openframe/`, `clients/openframe-client/`, `configs/`, or `manifests/`), matching `.github/CODEOWNERS`.
- [ ] If you touched `configs/base/`, you understand it needs sign-off from `@flamingo-stack/tech-leads` or `@flamingo-stack/tech-heads-of`.

**Java services**
- [ ] Constructor injection via `@RequiredArgsConstructor` and `@Slf4j` — no field injection (`@Autowired`) or manual `Logger` fields.
- [ ] No nested method calls passed directly as arguments (extract to named locals first).
- [ ] No `null` returned or passed; `Optional` used only as a pipeline return type, never stored or accepted as a parameter.
- [ ] No magic numbers/strings — named constants instead.
- [ ] No `@Value` property has an inline default; grouped configuration uses `@ConfigurationProperties`.
- [ ] Tenant-scoped repositories/services carry `@ConditionalOnProperty(name = "openframe.tenant-isolation.enabled", havingValue = "true")` where applicable.
- [ ] Kafka topic names come from `openframe.oss-tenant.kafka.topics.*` configuration, not hardcoded strings; `openframe-stream` listeners use `ossTenantKafkaListenerContainerFactory`.
- [ ] `@Document` Mongo classes implement `TenantScoped` (if tenant data) and carry the full Lombok quartet (`@Data @Builder @NoArgsConstructor @AllArgsConstructor`).
- [ ] New or changed domain errors are dedicated exception types, handled in a centralized `@RestControllerAdvice`.
- [ ] Test `@TestConfiguration` classes mock infrastructure beans (`MongoTemplate`, `RedisTemplate`, `KafkaTemplate`, `CassandraTemplate`, Pinot `Connection`, etc.) with `@Bean @Primary`; `PasswordEncoder` stays a real `BCryptPasswordEncoder`.

**Rust client**
- [ ] `cargo clippy` is clean for the files you touched.
- [ ] Any `openframe-agent-lib` version bump in `clients/openframe-client/Cargo.toml` is intentional and matches a real tagged release of [openframe-oss-lib](https://github.com/flamingo-stack/openframe-oss-lib).

**CI workflows**
- [ ] `actions/checkout` steps you added or touched set `persist-credentials: false`.
- [ ] Any new `docker buildx build` step is wrapped in `nick-fields/retry@v4` with the standard retry configuration, uses `command:` (not `run:`), and targets `linux/amd64,linux/arm64`.
- [ ] You have not hand-edited `.github/workflows/flamingo-code-review.yml`.
- [ ] Any script fetched from the Flamingo hub at CI runtime is downloaded via the shared verification function, never `curl | bash`.
- [ ] The release job still gates GitHub Release creation on manual dispatch only.

**Shared library consumption**
- [ ] If you bumped `<openframe.libs.version>` in `pom.xml`, it points to a real published version of [openframe-oss-lib](https://github.com/flamingo-stack/openframe-oss-lib) (not a lingering `999-SNAPSHOT` left over from local development — see [Local shared-library development](./docs/development/setup/environment.md) for that workflow).

**General**
- [ ] The PR description explains the change and links the relevant OpenMSP Slack discussion, since this repository tracks no GitHub Issues.
- [ ] You ran or reviewed the automated **🦩 Flamingo Code Review** findings on the PR before merging.
- [ ] Anything concerning the `openframe-cli` tool is referenced against its own repository ([flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)), never assumed to live in a local subdirectory of this repository.

## Code style and conventions

Code style in this repository is enforced by the automated reviewer (**🦩 Flamingo Code Review**) running against a published rule catalog, scoped to the languages and paths your PR touches. The conventions below summarize the rules most relevant to day-to-day contributions; they apply across the Java services under `openframe/services`, the Rust client under `clients/openframe-client`, and the CI workflows under `.github/workflows`.

### Java services (`openframe/services/**`)

The parent `pom.xml` targets **Java 25** and Spring Boot `4.1.1` (via `spring-boot-starter-parent`), with Spring Cloud `2025.1.3` and Lombok `1.18.48`. Keep these conventions when touching Java code:

- **Constructor injection only.** Spring-managed beans (`@Service`, `@Component`, `@DgsComponent`) declare dependencies as `private final` fields with Lombok's `@RequiredArgsConstructor`, and use `@Slf4j` for logging. Field injection via `@Autowired` and hand-rolled `Logger` fields are not permitted.
- **No null returns, no checked exceptions.** Methods return a real object or throw; `null` is never returned or passed. Exceptions are unchecked (`RuntimeException` subclasses), with no `throws` clauses in signatures.
- **`Optional` is a return type only**, consumed as a pipeline (`map`/`filter`/`ifPresent`/`orElseThrow`), never stored in a field or accepted as a parameter, and `.get()` is never called directly.
- **No magic literals.** Numbers and strings with meaning become named `private static final` constants.
- **No nested method calls as arguments.** Extract each call to a named local variable before passing it on — this is PMD-enforced and fails the build. Exemptions are limited to logger arguments, annotation values, and enum constants.
- **One-line lambdas.** Multi-line lambda bodies are extracted into named methods; prefer method references.
- **Small, single-responsibility classes.** If a class is hard to unit-test with mocks, it is doing too much — split it.
- **Compound conditions get a name.** Any condition using `&&`, `||`, a ternary, or a stream chain is extracted into a named private predicate method.
- **No Javadoc blocks.** Code documents itself through naming. A comment is only justified when it explains a non-obvious *why*.
- **`@Value` properties never have inline defaults** (`@Value("${openframe.timeout}")`, not `@Value("${openframe.timeout:30}")`) — missing configuration must fail fast at startup. Prefer `@ConfigurationProperties` with Lombok `@Data` for grouped configuration.
- **Tenant isolation gates.** Repository implementations and services assuming single-tenant pod context (using `TenantAwareMongoTemplate`, `TenantScopedCassandraTemplate`, etc.) carry `@ConditionalOnProperty(name = "openframe.tenant-isolation.enabled", havingValue = "true")`. Spring Data repository *interfaces* are exempt.
- **Kafka conventions.** Topic names are configured under `openframe.oss-tenant.kafka.topics.{inbound|outbound}.<logical-name>` in the service's `configs/base/*.yml` file, never hardcoded; `@KafkaListener` methods in `openframe-stream` specify `containerFactory = "ossTenantKafkaListenerContainerFactory"`.
- **MongoDB documents** implementing per-tenant data implement the `TenantScoped` marker interface, and `@Document` classes need the full Lombok quartet.
- **Test configuration.** `@TestConfiguration` classes mock every infrastructure bean with `@Bean @Primary` and `Mockito.mock()`. `PasswordEncoder` is the one exception that stays a real `BCryptPasswordEncoder`.

Reuse existing Spring/JDK utilities (`CollectionUtils.isEmpty`, `StringUtils.hasText`, `Objects.requireNonNull`) instead of hand-rolled null/empty checks, and refactor duplication as part of the current change rather than deferring it.

### Shared library versioning (`pom.xml`)

The OpenFrame OSS Library dependency (`com.openframe.oss:*`, currently `7.0.11`) is centralized in the `<openframe.libs.version>` property in the root `pom.xml`. When developing against an unreleased library change, use the local `999-SNAPSHOT` handshake: build and `install` the library locally as `999-SNAPSHOT`, point `<openframe.libs.version>` at `999-SNAPSHOT` for local testing, and never commit a version bump, a new snapshot release, or a rewritten dependency coordinate for that workflow. See [Environment Setup](./docs/development/setup/environment.md) for the full procedure.

### Rust client (`clients/openframe-client`)

`clients/openframe-client/Cargo.toml` defines the `openframe-client` binary (crate `openframe_client`, edition 2021), which depends on `openframe-agent-lib` pinned to tag `v0.0.5` from [openframe-oss-lib](https://github.com/flamingo-stack/openframe-oss-lib). `.vscode/settings.json` configures `rust-analyzer` to check on save using `clippy` with all features enabled — keep code clippy-clean before pushing. See [Environment Setup](./docs/development/setup/environment.md) for the VS Code tasks available for local iteration.

### CI workflow conventions (`.github/workflows/**`)

Changes to GitHub Actions workflows in this repository are themselves reviewed against the catalog:

- Every `actions/checkout` step sets `persist-credentials: false`.
- `docker buildx build` steps run inside `nick-fields/retry@v4` with `max_attempts: 3`, `retry_wait_seconds: 5`, `timeout_minutes: 30`, and the build command passed via `command:`, not `run:`.
- Docker builds target `--platform linux/amd64,linux/arm64`, and release builds add `--provenance=false --sbom=true` (the GHCR OCI layout this org uses does not support provenance attestation manifests).
- The `release` job stays gated so that GitHub Release creation happens only on manual workflow dispatch, never automatically from a push.
- `.github/workflows/flamingo-code-review.yml` is generated by the Flamingo hub and must never be hand-edited.
- Any script a workflow fetches from the Flamingo hub at CI runtime goes through the shared verification function, checked against the hub's manifest digest — never `curl | bash`, and never a hash pinned directly in workflow YAML.

Review the active, CI-enforced rule catalog before large changes — it evolves and this document only summarizes the rules most commonly hit.

## Running and writing tests

Full detail on test organization, running suites locally and in CI, writing new tests, and coverage expectations lives in [Testing](./docs/development/testing/README.md). A short summary:

- **Java unit/slice tests** live under each service module's `src/test/java` (for example `openframe/services/openframe-api/src/test/java/com/openframe/api/`). Follow the established pattern: a `@TestConfiguration` class (modeled on `TestConfig.java`) mocks every infrastructure bean (`MongoTemplate`, `RedisTemplate`, `KafkaTemplate`, `CassandraTemplate`, Pinot `Connection`, repositories) with `@Bean @Primary`, and shared fixtures/helpers live in `TestConstants`- and `TestUtils`-style holders. `spring-security-test`, Mockito, and `spring-boot-starter-test` are already on the test classpath for every module through the parent POM.
- Run the full reactor build with tests from the repository root with `mvn test`, or scope to one module with `mvn test -pl openframe/services/openframe-api`.
- **The end-to-end test service** (`openframe-test`) is a JUnit Platform launcher, not a web service — its own source is minimal (`TestApplication`, `SummaryLogger`); the actual test classes, page objects, and flows it discovers come from the upstream `com.openframe.oss:openframe-test-service-core` library artifact. It runs tagged passes (`registration`, then `oss`, then `reset`) against a deployed tenant and reports outcomes to Slack. New functional end-to-end coverage belongs upstream in `openframe-oss-lib`, not in this repository's `openframe-test` module.
- **Helm chart tests** for the `manifests/app-of-apps` chart live under `manifests/app-of-apps/tests/`, written for the `helm unittest` plugin, asserting against rendered `templates/argocd-apps.yaml` and `templates/projects.yaml` output.
- There is no numeric coverage gate (no JaCoCo plugin declared) — coverage is enforced through code-review rules (classes that are hard to unit-test with mocks are a design smell to fix) and through the `@TestConfiguration` mocking pattern that keeps module-level tests runnable without live infrastructure.

Because no downstream repository consumes this repository's published artifacts, the Java unit tests, the `openframe-test` end-to-end suites, and the Helm chart tests are the full safety net for this stack — see [Testing](./docs/development/testing/README.md) for the complete picture, and [Local Development](./docs/development/setup/local-development.md) for running services against which to exercise them.

## Reporting a security issue

Do **not** open a public GitHub issue, pull request, or community-channel post for a security problem. Report it privately following [SECURITY.md](./SECURITY.md) — in short, email **security@flamingo.run** with the affected repository/component, version or commit, a description of impact, and reproduction steps. See [SECURITY.md](./SECURITY.md) for full scope, response timelines, and coordinated-disclosure terms, and the [Security](./docs/development/security/README.md) development doc for this repository's specific security model (authentication boundaries, tenant isolation, secrets handling).

## Where to find more documentation

- [Documentation index](./docs/README.md) — the entry point for all documentation in this repository.
- [Development](./docs/development/README.md) — the entry point for development documentation (setup, architecture, testing, contributing, security).
- [Architecture Overview](./docs/development/architecture/README.md) — how the service modules, shared config, and Kubernetes manifests relate.
- [Getting Started: Introduction](./docs/getting-started/introduction.md), [Prerequisites](./docs/getting-started/prerequisites.md), [Quick Start](./docs/getting-started/quick-start.md), [First Steps](./docs/getting-started/first-steps.md) — if you have not yet installed or run the project.

For questions or help beyond this documentation, reach the team through the [OpenMSP Slack community](https://www.openmsp.ai/).
