# Contributing to OpenFrame OSS Tenant

Thank you for your interest in contributing to **OpenFrame OSS Tenant** — the tenant-facing service and deployment repository for [OpenFrame](https://openframe.ai), Flamingo's unified AI-driven MSP platform. It assembles the Spring Boot backend services, Kafka Connect configuration, and Kubernetes/Helm manifests into an operable tenant environment, built on top of the shared `com.openframe.oss` libraries published by [OpenFrame OSS Library](https://github.com/flamingo-stack/openframe-oss-lib).

This guide covers setting up a development environment, the branching and pull request workflow, code style, running and writing tests, reporting security issues, and where to find more documentation.

---

## Community and communication

This project does **not** use GitHub Issues or GitHub Discussions for feature requests, bug reports, or general discussion. All of that happens in the OpenMSP Slack community:

- [https://www.openmsp.ai/](https://www.openmsp.ai/)
- [Join Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

GitHub pull requests remain the mechanism for proposing and reviewing code changes against this repository, at [github.com/flamingo-stack/openframe-oss-tenant/pulls](https://github.com/flamingo-stack/openframe-oss-tenant/pulls). If a change addresses a discussion from OpenMSP Slack, reference it in the pull request description in prose — there is no issue to link it to.

---

## How this repository fits the ecosystem

OpenFrame OSS Tenant publishes nine Maven artifacts under `com.openframe` (`openframe-api`, `openframe-authorization-server`, `openframe-client`, `openframe-config`, `openframe-external-api`, `openframe-gateway`, `openframe-management`, `openframe-stream`, `openframe-test`, all `1.0.0-SNAPSHOT`) plus the `openframe_client` Cargo crate (`0.1.0`). It depends on the `com.openframe.oss:*` artifacts and `openframe_agent_lib`, all pinned at the same version from [OpenFrame OSS Library](https://github.com/flamingo-stack/openframe-oss-lib). The repository graph records no downstream consumer of anything this repository publishes, with full coverage — meaning that absence is conclusive for the organization's managed repositories.

A practical consequence: a public API change here does not ripple into other repositories in the organization's graph the way a change to `openframe-oss-lib` itself would. Before changing behavior, check whether the logic you want to change is actually implemented in this repository's `src/main/java` (or `clients/openframe-client/src/`) or inherited from the pinned library — shared behavior (auth flows, data access, security, messaging) usually belongs upstream in `openframe-oss-lib`, not here.

If you are touching the CLI surface exposed by the separately maintained [OpenFrame CLI](https://github.com/flamingo-stack/openframe-cli) tool, consult that repository's own [installation guide](https://github.com/flamingo-stack/openframe-cli#installation) and [documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs) — it is not part of this codebase, and CLI commands are never documented as living under a local `./cli/` subdirectory here.

---

## Setting up a development environment

Do not try to piece a setup together from scratch — follow the dedicated guides, which are kept current with the repository's actual structure:

1. [Prerequisites](./docs/getting-started/prerequisites.md) — tools you need before you start.
2. [Quick Start](./docs/getting-started/quick-start.md) and [First Steps](./docs/getting-started/first-steps.md) — get something running quickly.
3. [Environment Setup](./docs/development/setup/environment.md) — JDK/Rust toolchain, IDE configuration, environment variables.
4. [Local Development](./docs/development/setup/local-development.md) — cloning, building, running services and the Rust client locally, hot reload, and debugging.
5. [Architecture Overview](./docs/development/architecture/README.md) — how the services, data stores, and messaging backbone fit together before you start changing code.

In short: the backend is a multi-module Maven project rooted at `pom.xml` (Spring Boot `4.1.1`, Java `25`, Spring Cloud `2025.1.3`), and the Rust client lives at `clients/openframe-client/`, with its build requiring the `OPENFRAME_VERSION` environment variable (consumed by `openframe-agent-lib`'s build script). See [Environment Setup](./docs/development/setup/environment.md) for the full toolchain list and [Local Development](./docs/development/setup/local-development.md) for exact build and run commands.

---

## Development workflow

### Branches

Work happens on a feature branch off `main`, the repository's default branch. There is no enforced prefix convention beyond the reserved prefixes the automated pipelines use for their own purposes — avoid starting a branch name with any of these, since the automation treats them specially:

- `ai-fix/` — reserved for automated fix branches.
- `setup/` — reserved for pipeline setup branches.
- `code-documentation/` — reserved for the documentation pipeline's own pull requests.

A scheduled job (`.github/workflows/cleanup.yml`) deletes unprotected branches with no commits for 60 days. Keep long-lived feature branches rebased or merge them promptly to avoid losing work to this cleanup. Avoid pushing directly to `main`; pushing to `main` (or a manual dispatch) triggers `.github/workflows/release.yml`, which resolves a version, builds only the changed images/clients/chart, and publishes a GitHub Release.

Scope your branch to one logical change: CI's path-filtered change-detection job (`.github/workflows/changes.yaml`) decides which service images, the Rust client, or the Helm chart are affected by your diff. A branch mixing unrelated service changes makes the diff harder to review and can trigger a wider rebuild surface than intended.

### Commits

No commit-message linter or enforced template is defined in this repository's workflows. In its absence, follow conventional, descriptive practice consistent with how the codebase documents itself:

- Write a short, imperative-mood summary line (for example, "Add retry to Kafka producer config", not "Added" or "Adding").
- Keep the summary line focused on **what** changed; use the body to explain **why**, especially for anything touching shared configuration (`configs/base/`), service bootstrap classes, or Helm chart image pins.
- Reference the relevant service or module in the summary when a change is scoped to one (`openframe-stream:`, `openframe-gateway:`, `clients/openframe-client:`) so reviewers and the change-detection matrix context are obvious at a glance.
- Call out version bumps explicitly — reference the property changed (for example `openframe.libs.version`, `spring-boot.version`) — so a reviewer can cross-check the upstream changelog.
- For security-motivated dependency overrides (the `jackson-bom.version`, `bcprov-lts8on.version`, and similar pins in the root `pom.xml`), state the CVE class being avoided in the commit body, following the style of the existing inline comments, so a future contributor does not silently remove a deliberate pin.
- If a change depends on an unmerged PR in another repository in this ecosystem (for example `openframe-oss-lib`), note that dependency explicitly in the commit body or PR description.
- Avoid bundling unrelated changes (for example, a Helm chart version bump and a Java service change) into a single commit; split them so change detection and CODEOWNERS routing stay accurate per path.

### Opening a pull request

1. Branch from `main`, make your change, and ensure it builds locally — see [Local Development](./docs/development/setup/local-development.md) for the exact Maven and Cargo commands.
2. Push your branch and open the pull request against `main` at [github.com/flamingo-stack/openframe-oss-tenant/pulls](https://github.com/flamingo-stack/openframe-oss-tenant/pulls).
3. CI runs change detection (`.github/workflows/changes.yaml`) to determine which service images, the Rust client, or the Helm chart are affected, based on path filters per component.
4. `.github/CODEOWNERS` routes the review request automatically based on the paths you changed:

   | Path | Owning team |
   |---|---|
   | `openframe/` | `@flamingo-stack/backend-engineers` |
   | `clients/openframe-client/` | `@flamingo-stack/client-engineers` |
   | `configs/` | `@flamingo-stack/backend-engineers` |
   | `configs/base/` | additionally `@flamingo-stack/tech-leads` and `@flamingo-stack/tech-heads-of` (last-match-wins CODEOWNERS pattern) |
   | `manifests/` | `@flamingo-stack/devops-engineers` |
   | `.github/CODEOWNERS` itself | `@flamingo-stack/devops-engineers` |

   A pull request touching `configs/base/` requires sign-off from both a tech lead and a head-of, reflecting that this file drives shared Spring configuration (MongoDB, Redis Cluster, Cassandra, Pinot connection endpoints) consumed by every backend service.

5. **Automated code review.** Pull requests are also reviewed by an automated reviewer (`.github/workflows/flamingo-code-review.yml`). It does not review automatically the instant a PR is opened — opening, reopening, or marking ready-for-review posts an invitation comment with a checkbox; checking it (or commenting `@flamingo-review`, or adding the `flamingo-review` label from the sidebar) starts the first pass. Pushing new commits to an already-reviewed PR does not re-trigger a review by itself — comment `@flamingo-review` (incremental, since the last reviewed commit) or `@flamingo-review full` (re-reads the whole cumulative diff) when you want another pass. The `flamingo-review-always` label subscribes a specific PR to continuous per-push review, for higher-risk changes. The review only runs for pull requests whose head branch is in this repository (not a fork), and comment-triggered reviews only honor commands from users with `OWNER`, `MEMBER`, or `COLLABORATOR` association.
6. Merge once required reviews and checks pass. There is no GitHub Issues workflow to link a PR to — if the change addresses a discussion from OpenMSP Slack, reference it in the PR description in prose.

---

## Code style and conventions

### Java services

- **Java 25**, Spring Boot `4.1.1`, Spring Cloud `2025.1.3` — set once in the parent `pom.xml` `<properties>`. Do not override these per-module; bump them in the parent only.
- Each service module's `pom.xml` is deliberately thin: it declares its `*-service-core` dependency, `spring-cloud-starter-config`, and `spring-boot-starter`, then inherits everything else (plugin management, dependency management, exclusions for `log4j-to-slf4j` / `log4j-api`) from the root `pom.xml`. Keep new modules consistent with this shape rather than re-declaring versions.
- **Every `com.openframe.oss` artifact must reference the centralized `openframe.libs.version` property** rather than a hardcoded version string — this is enforced as an active review rule on every `pom.xml` in this repository. A version bump to a `com.openframe.oss:*` library should be its own reviewable change.
- **Lombok** is available project-wide and wired into the annotation-processor path explicitly in `maven-compiler-plugin` configuration, because JDK 23+ does not auto-discover annotation processors from the classpath. If you add a new annotation processor, it must be listed the same way.
- Configuration properties introduced by this codebase must be namespaced under `openframe.oss-tenant.*` or `openframe.*` in YAML (`configs/base/*.yml`) and in `@ConditionalOnProperty` / `@Value` annotations — not placed at the top level or under an ad-hoc prefix, since that would conflict with property resolution from the shared libraries.
- Kafka topic names must be declared under `openframe.oss-tenant.kafka.topics.inbound.<logical-name>.name` or `openframe.oss-tenant.kafka.topics.outbound.<logical-name>` in the service's base YAML config. Do not hardcode topic strings inside `@KafkaListener` or `KafkaTemplate` calls — use the property placeholder.
- Each service has a single Spring Boot entry point class (for example `ApiApplication`, `GatewayApplication`, `StreamApplication`). Keep bootstrap logic in that class minimal; service-specific wiring belongs in `@Configuration` classes, mirroring the existing modules.
- Logging: the parent POM pulls in `slf4j-api` and `logback-classic`/`logback-core` plus `logstash-logback-encoder` for structured JSON logging. Use SLF4J loggers, not `System.out`/`println`.
- Services depending on `pinot-java-client` must not override or remove the root POM's managed exclusions for log4j and server-side Pinot transitives.

### Rust client

- The agent binary at `clients/openframe-client` is a thin wrapper (`src/main.rs`) over `openframe-agent-lib`, pulled as a pinned git dependency (tag `v0.0.5`) in `clients/openframe-client/Cargo.toml`. Prefer adding behavior to the upstream library crate unless it is genuinely specific to this binary's packaging.
- Format with `rustfmt` and lint with `clippy` before opening a PR — both are installed as components in the CI rust-setup step and are the formatter/linter configured in `.vscode/settings.json`.
- CI enforces `RUSTFLAGS=-D warnings` and runs clippy with `--deny clippy::all`; a warning introduced locally will fail CI. Do not suppress a warning with `#[allow(...)]` without a comment explaining why the suppression is justified.
- Every fallible call that returns `anyhow::Result` must attach a `.context("Failed to <verb> <component>")` description before propagating with `?` — a bare `?` is not acceptable on initialization paths.
- `Regex` values must be compiled exactly once via a `static` initializer (`once_cell::sync::Lazy` or `lazy_static!`), never constructed inline inside a function body.
- Writes to JSON state files that another process may concurrently read must use an atomic tmp-then-rename pattern (write to a `.tmp` file, then `fs::rename`), not a bare `fs::write`.

### Helm / Kubernetes manifests

- Manifests are organized by wave: `manifests/apps` (app-of-apps), `manifests/platform` (platform-wide services, wave 0), `manifests/datasources` (backing stores, wave 0), and `manifests/tenant` (the tenant application chart). Follow the existing `Chart.yaml` / `values.yaml` pattern for any new chart.
- Ownership of `manifests/` is with `@flamingo-stack/devops-engineers` per `.github/CODEOWNERS` — route infrastructure changes through that review path.
- Any new `docker buildx build` step added to a workflow under `.github/workflows/` must wrap the build with `nick-fields/retry@v4` (`max_attempts: 3`, `retry_wait_seconds: 5`, `timeout_minutes: 30`), passing the build command via `command:` rather than `run:` — matching the existing pattern in `.github/workflows/release.yml`.

### Shared configuration

- `configs/base/application.yml` holds configuration shared by every service: MongoDB, Redis Cluster, Cassandra, and Pinot connection settings. Service-specific files hold per-service overrides such as Kafka/NATS endpoints and gateway routes.
- `configs/` is owned by `@flamingo-stack/backend-engineers`, and `configs/base/` specifically requires review from `@flamingo-stack/tech-leads` and `@flamingo-stack/tech-heads-of` — expect that extra review step on any change under `configs/base/`.

---

## Running and writing tests

Day-to-day build, run, and test commands are kept current in [Local Development](./docs/development/setup/local-development.md) rather than duplicated here. In short:

- **Java services** build and test through the Maven reactor rooted at `pom.xml`; build a single service plus its dependencies with Maven's `-pl ... -am` reactor flags, as described in [Local Development](./docs/development/setup/local-development.md).
- **Rust client** tests run via `cargo test` (`clients/openframe-client` ships a `Makefile` with `make test`, `make lint`, `make clippy`, and `make fmt-check` targets, also described in [Local Development](./docs/development/setup/local-development.md)).

Before requesting review, confirm:

- The Java and Rust builds succeed for the modules you touched.
- No new Rust compiler warnings or clippy findings were introduced (`RUSTFLAGS=-D warnings` and `--deny clippy::all` are enforced in CI).
- New or changed Spring configuration properties are namespaced under `openframe.oss-tenant.*` or `openframe.*`, not top-level or ad-hoc prefixed.
- New Kafka topic names are declared in the service's YAML config, never hardcoded in `@KafkaListener`/`KafkaTemplate` calls.
- Dependency versions on `com.openframe.oss:*` artifacts and `openframe-agent-lib` are not bumped incidentally — a version bump should be its own reviewable change.
- Logging uses SLF4J, not ad-hoc `System.out`.
- Changes to publicly consumed classes (Spring `@RestController`s, service entry points, configuration classes) are checked for existing callers before renaming or removing anything, since downstream consumption is not always visible from within this repository alone.
- No default credentials, tokens, or secrets are committed; real credentials for local environments are left to the developer's own environment configuration.

See [Contributing Guidelines](./docs/development/contributing/guidelines.md) for the full review checklist (general, Java services, Rust client, manifests/CI, and documentation/secrets sections).

---

## Reporting security issues

Security vulnerabilities must **not** be filed as a public GitHub issue, pull request description, or discussion, and must not be posted to the OpenMSP Slack community. Follow the process in [SECURITY.md](./SECURITY.md): email **security@flamingo.run** with the affected component, a description of the issue and its impact, and reproduction steps. The policy commits to acknowledgement within 3 business days, an initial assessment within 10 business days, and progress updates at least every 30 days until resolution.

---

## Where to find more documentation

- [Development documentation hub](./docs/development/README.md) — environment setup, local development, architecture, and security for this repository.
- [Documentation home](./docs/README.md) — the full documentation set.

For questions or help beyond this document, the project is coordinated through the [OpenMSP Slack community](https://www.openmsp.ai/) rather than GitHub Issues or Discussions.
