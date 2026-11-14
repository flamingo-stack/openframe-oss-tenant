ic# Contributing Guidelines

OpenFrame OSS Tenant is a **service** repository (bash, java, rust) that assembles Spring Boot entry points, shared configuration, and Kubernetes/Argo CD manifests into the deployable OpenFrame tenant stack. Most domain logic is consumed from the [OpenFrame OSS Library](https://github.com/flamingo-stack/openframe-oss-lib) (pinned at `7.0.11` for Maven artifacts, `v0.0.5` for the Rust agent library). This repository itself publishes nine Maven artifacts (`com.openframe:openframe-api`, `openframe-authorization-server`, `openframe-client`, `openframe-config`, `openframe-external-api`, `openframe-gateway`, `openframe-management`, `openframe-stream`, `openframe-test`) and one Cargo crate (`openframe_client`). No other repository is recorded as a downstream consumer of these artifacts, so changes here are evaluated primarily against the automated review rules and against the services that live in this repository.

This document describes how to propose, format, and get a change merged. For environment setup, see [Development](../README.md) and [Environment Setup](../setup/environment.md). For the system's overall shape, see [Architecture Overview](../architecture/README.md) and the generated [Ecosystem](../../reference/architecture/ecosystem.md) reference.

> This project does not use GitHub Issues or GitHub Discussions. Planning, support, and feature discussion happen on the [OpenMSP Slack community](https://www.openmsp.ai/).

## Table of contents

- [Code style and conventions](#code-style-and-conventions)
- [Branch naming and PR process](#branch-naming-and-pr-process)
- [Commit message format](#commit-message-format)
- [Review checklist](#review-checklist)

## Code style and conventions

Code style in this repository is enforced by an automated reviewer (**🦩 Flamingo Code Review**) running against a published rule catalog. The rules below are the ones most relevant to day-to-day contributions; they are drawn from the active, CI-enforced catalog for this repository and apply across the Java services under `openframe/services`, the Rust client under `clients/openframe-client`, and the CI workflows under `.github/workflows`.

### Java services (`openframe/services/**`)

The parent `pom.xml` targets **Java 25** and Spring Boot `4.1.1` (via `spring-boot-starter-parent`), with Spring Cloud `2025.1.3` and Lombok `1.18.48`. Keep these conventions when touching Java code:

- **Constructor injection only.** Spring-managed beans (`@Service`, `@Component`, `@DgsComponent`) must declare dependencies as `private final` fields with Lombok's `@RequiredArgsConstructor`, and must use `@Slf4j` for logging. Field injection via `@Autowired` and hand-rolled `Logger` fields are not permitted.
- **No null returns, no checked exceptions.** Methods return a real object or throw; `null` is never returned or passed. Exceptions must be unchecked (`RuntimeException` subclasses), with no `throws` clauses in signatures. Domain errors get dedicated exception types, handled centrally in one `@RestControllerAdvice`.
- **`Optional` is a return type only**, consumed as a pipeline (`map`/`filter`/`ifPresent`/`orElseThrow`), never stored in a field or accepted as a parameter, and `.get()` is never called directly.
- **No magic literals.** Numbers and strings with meaning become named `private static final` constants.
- **No nested method calls as arguments.** Extract each call to a named local variable before passing it on — this is PMD-enforced (`NoMethodCallAsArgument`, priority 1, fails the build). Exemptions are limited to logger arguments, annotation values, and enum constants, and any per-call suppression needs a `@SuppressWarnings("PMD.NoMethodCallAsArgument")` plus a justification comment.
- **One-line lambdas.** Multi-line lambda bodies must be extracted into named methods; prefer method references.
- **Small, single-responsibility classes.** If a class is hard to unit-test with mocks, it is doing too much — split it. A class longer than a screen and a half is a smell.
- **Compound conditions get a name.** Any condition using `&&`, `||`, a ternary, or a stream chain must be extracted into a named private predicate method.
- **No Javadoc blocks.** Code documents itself through naming. A comment is only justified when it explains a non-obvious *why* (a hidden invariant or a workaround), never a *what*.
- **`@Value` properties never have inline defaults** (`@Value("${openframe.timeout}")`, not `@Value("${openframe.timeout:30}")`) — missing configuration must fail fast at startup. Prefer `@ConfigurationProperties` with Lombok `@Data` for grouped configuration.
- **Tenant isolation gates.** Repository implementations and services that assume a single-tenant pod context (using `TenantAwareMongoTemplate`, `TenantScopedCassandraTemplate`, etc.) must carry `@ConditionalOnProperty(name = "openframe.tenant-isolation.enabled", havingValue = "true")`. Spring Data repository *interfaces* are exempt from this gate.
- **Kafka conventions.** Topic names are configured under `openframe.oss-tenant.kafka.topics.{inbound|outbound}.<logical-name>` in the service's `configs/base/*.yml` file, never hardcoded; `@KafkaListener` methods in `openframe-stream` must specify `containerFactory = "ossTenantKafkaListenerContainerFactory"`.
- **MongoDB documents** implementing per-tenant data must implement the `TenantScoped` marker interface, and `@Document` classes need the full Lombok quartet: `@Data @Builder @NoArgsConstructor @AllArgsConstructor`.
- **Test configuration.** `@TestConfiguration` classes must mock every infrastructure bean (`MongoTemplate`, `RedisTemplate`, `KafkaTemplate`, `CassandraTemplate`, Pinot `Connection`, etc.) with `@Bean @Primary` and `Mockito.mock()`. `PasswordEncoder` is the one exception that should stay a real `BCryptPasswordEncoder`.

Reuse existing Spring/JDK utilities (`CollectionUtils.isEmpty`, `StringUtils.hasText`, `Objects.requireNonNull`) instead of hand-rolled null/empty checks, and when duplication starts to form, refactor it as part of the current change rather than deferring it.

### Shared library versioning (`pom.xml`)

The OpenFrame OSS Library dependency (`com.openframe.oss:*`, currently `7.0.11`) is centralized in the `<openframe.libs.version>` property in the root `pom.xml`. When developing against an unreleased library change, use the local `999-SNAPSHOT` handshake: build and `install` the library locally as `999-SNAPSHOT`, point `<openframe.libs.version>` at `999-SNAPSHOT` for local testing, and never commit a version bump, a new snapshot release, or a rewritten dependency coordinate for that workflow.

### Rust client (`clients/openframe-client`)

`clients/openframe-client/Cargo.toml` defines the `openframe-client` binary (crate `openframe_client`, edition 2021), which depends on `openframe-agent-lib` pinned to tag `v0.0.5` from [openframe-oss-lib](https://github.com/flamingo-stack/openframe-oss-lib). Use the VS Code tasks in `.vscode/tasks.json` for local iteration: `rust-build` (debug build), `rust-build-release`, `rust-test`, `rust-check`, and `rust-clippy`. `.vscode/settings.json` configures `rust-analyzer` to check on save using `clippy` with all features enabled — keep code clippy-clean before pushing.

### CI workflow conventions (`.github/workflows/**`)

Changes to GitHub Actions workflows in this repository are themselves reviewed against the catalog:

- Every `actions/checkout` step must set `persist-credentials: false`.
- `docker buildx build` steps must run inside `nick-fields/retry@v4` with `max_attempts: 3`, `retry_wait_seconds: 5`, `timeout_minutes: 30`, and the build command passed via `command:`, not `run:` — see the `build_images` job in `.github/workflows/release.yml` for the established pattern.
- Docker builds target `--platform linux/amd64,linux/arm64` and release builds add `--provenance=false --sbom=true` (the GHCR OCI layout this org uses does not support provenance attestation manifests).
- The `release` job in `.github/workflows/release.yml` must stay gated so that GitHub Release creation happens only on `workflow_dispatch`, never automatically from a push; the file must keep the name `release.yml`.
- `.github/workflows/flamingo-code-review.yml` is generated by the Flamingo hub and is byte-identical across every reviewed repository — never edit it by hand; it carries its own "do not edit by hand" header.
- Any script a workflow fetches from the Flamingo hub at CI runtime must go through the shared `download_and_verify` function, checked against the hub's manifest digest — never `curl | bash`, and never a hash pinned directly in workflow YAML.

Run `get_code_rules` (or ask the reviewer via `@flamingo-review`, see below) for the full, current rule set before large changes — the catalog evolves and this document only summarizes the rules most commonly hit.

## Branch naming and PR process

### Branch naming

Branch names are not constrained by a fixed enum in this repository, but align with ownership boundaries defined in `.github/CODEOWNERS`:

- `/openframe/` (all backend services) is owned by `@flamingo-stack/backend-engineers`.
- `/clients/openframe-client/` (the Rust agent) is owned by `@flamingo-stack/client-engineers`.
- `/configs/` is owned by `@flamingo-stack/backend-engineers`, with `/configs/base/` requiring sign-off from `@flamingo-stack/tech-leads` and `@flamingo-stack/tech-heads-of` (last-match-wins: more specific patterns listed below broader ones).
- `/manifests/` (Kubernetes/Argo CD) is owned by `@flamingo-stack/devops-engineers`.
- `.github/CODEOWNERS` itself is owned by `@flamingo-stack/devops-engineers`.

Name your branch so the area it touches and the author's intent are clear, for example `backend/<short-description>` for an `openframe/services` change, `client/<short-description>` for the Rust agent, or `manifests/<short-description>` for Helm/Argo CD work. Avoid branch names starting with `ai-fix/`, `setup/`, or `code-documentation/` — these prefixes are reserved by the automated documentation and review tooling in `.github/workflows/code-documentation.yml`.

### Opening a pull request

1. Branch from `main` (the repository's default branch).
2. Keep the change scoped to one area of ownership where possible, so CODEOWNERS review stays meaningful.
3. Open the PR against `flamingo-stack/openframe-oss-tenant` at [github.com/flamingo-stack/openframe-oss-tenant/pulls](https://github.com/flamingo-stack/openframe-oss-tenant/pulls).
4. GitHub requests review automatically from the relevant CODEOWNERS team(s) based on the paths you touched.
5. A push to the repository's default branch (outside `docs/**` and `**.md`) triggers the code-graph rebuild in `.github/workflows/code-documentation.yml`, which keeps the generated [Ecosystem](../../reference/architecture/ecosystem.md) reference current for every PR opened afterward.
6. Changes to `manifests/**`, `openframe/**`, `integrated-tools/**`, `pom.xml`, or `clients/**` on `main` trigger `.github/workflows/release.yml`, which builds images, the Rust client binaries, and the Helm chart, and can cut a tagged release via `workflow_dispatch`.

### Automated code review

This repository runs **🦩 Flamingo Code Review** (`.github/workflows/flamingo-code-review.yml`) against every pull request. Key things to know as a contributor:

- A pull request does **not** get reviewed automatically the moment it is opened, reopened, or marked ready for review — those events only post an **invitation** comment with a checkbox.
- To request the first (or a repeat) review, check the box in that summary comment, or comment `@flamingo-review` on the PR, or apply the `flamingo-review` label from the sidebar. `@flamingo-review full` (or checking "Review the whole diff again") re-reads the whole cumulative diff instead of only the delta since the last review.
- Adding the `flamingo-review-always` label subscribes a PR to review on every push (`synchronize`) — useful for a large or risky refactor.
- Only comments from users with `OWNER`, `MEMBER`, or `COLLABORATOR` association can trigger a review via comment; checkbox edits must come from a human, not a bot.
- The reviewer runs with the active rule catalog described above (`get_code_rules`), scoped to the languages and paths your PR touches.

### Stale branch cleanup

`.github/workflows/cleanup.yml` runs on a schedule and deletes unprotected branches with no commits in the last 60 days. Delete or merge your branch promptly after merge to avoid relying on this; it is a safety net, not a workflow step to depend on.

## Commit message format

There is no commit-lint enforcement visible in this repository's workflows, but keep commits reviewable and bisectable:

- Write a short, imperative summary line (for example, `Gate tenant-scoped repository with ConditionalOnProperty` rather than `Fixed stuff`).
- Scope the subject to the module or service you changed when it helps reviewers, e.g. `openframe-gateway: add route for /clients/**` or `clients/openframe-client: bump openframe-agent-lib to v0.0.5`.
- Keep refactors that are "part of the feature" (extracting duplication, adding a missing layer) in the same PR/commit series as the feature that required them, per the repository's own convention of not deferring cleanup.
- Reference the relevant OpenMSP Slack discussion thread in the PR description rather than a GitHub Issue number, since this project does not use GitHub Issues.
- Avoid bundling unrelated areas (for example, a `configs/base` change and an unrelated `manifests/tenant` change) in a single commit — CODEOWNERS reviews by path, and mixed commits make scoped review harder.

## Review checklist

Before requesting review (or checking the reviewer's invitation box), verify:

**Scope and ownership**
- [ ] The change is scoped to one ownership area where practical (`openframe/`, `clients/openframe-client/`, `configs/`, or `manifests/`), matching `.github/CODEOWNERS`.
- [ ] If you touched `configs/base/`, you understand it needs sign-off from `@flamingo-stack/tech-leads` or `@flamingo-stack/tech-heads-of`.

**Java services**
- [ ] No field injection (`@Autowired`) or manual `Logger` fields — constructor injection via `@RequiredArgsConstructor` and `@Slf4j`.
- [ ] No nested method calls passed directly as arguments (extract to named locals first).
- [ ] No `null` returned or passed; `Optional` used only as a pipeline return type.
- [ ] No magic numbers/strings — named constants instead.
- [ ] No `@Value` property has an inline default; grouped configuration uses `@ConfigurationProperties`.
- [ ] Tenant-scoped repositories/services carry `@ConditionalOnProperty(name = "openframe.tenant-isolation.enabled", havingValue = "true")` where applicable.
- [ ] Kafka topic names come from `openframe.oss-tenant.kafka.topics.*` configuration, not hardcoded strings; `openframe-stream` listeners use `ossTenantKafkaListenerContainerFactory`.
- [ ] `@Document` Mongo classes implement `TenantScoped` (if tenant data) and carry the full Lombok quartet.
- [ ] New or changed domain errors are dedicated exception types, handled in the centralized `@RestControllerAdvice`.
- [ ] Test `@TestConfiguration` classes mock infrastructure beans with `@Bean @Primary`.

**Rust client**
- [ ] `cargo clippy` is clean for the files you touched.
- [ ] Any `openframe-agent-lib` version bump in `clients/openframe-client/Cargo.toml` is intentional and matches a real tagged release of [openframe-oss-lib](https://github.com/flamingo-stack/openframe-oss-lib).

**CI workflows**
- [ ] `actions/checkout` steps you added or touched set `persist-credentials: false`.
- [ ] Any new `docker buildx build` step is wrapped in `nick-fields/retry@v4` with the standard retry configuration, uses `command:` (not `run:`), and targets `linux/amd64,linux/arm64`.
- [ ] You have not hand-edited `.github/workflows/flamingo-code-review.yml`.
- [ ] Any script fetched from the Flamingo hub at CI runtime is downloaded via `download_and_verify`, never `curl | bash`.
- [ ] The `release` job still gates GitHub Release creation on `workflow_dispatch` only.

**Shared library consumption**
- [ ] If you bumped `<openframe.libs.version>` in `pom.xml`, it points to a real published version of [openframe-oss-lib](https://github.com/flamingo-stack/openframe-oss-lib) (not a lingering `999-SNAPSHOT` from local development).

**General**
- [ ] The PR description explains the change and links the relevant OpenMSP Slack discussion, since this repository tracks no GitHub Issues.
- [ ] You ran or reviewed the automated **🦩 Flamingo Code Review** findings on the PR before merging.

For broader context on how this repository fits the rest of the platform — the gateway's routes, the datasources it depends on, and the services it publishes — see [Architecture Overview](../architecture/README.md) and the [Ecosystem reference](../../reference/architecture/ecosystem.md). For environment setup before your first contribution, see [Environment Setup](../setup/environment.md) and [Local Development](../setup/local-development.md).

[![Getting Started with OpenFrame - Organization Setup Basics](https://img.youtube.com/vi/-_56_qYvMWk/maxresdefault.jpg)](https://www.youtube.com/watch?v=-_56_qYvMWk)
