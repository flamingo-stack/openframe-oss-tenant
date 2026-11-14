# Contributing Guidelines

OpenFrame OSS Tenant is the tenant-facing service and deployment repository for [OpenFrame](https://openframe.ai), Flamingo's unified AI-driven MSP platform. It assembles the Spring Boot backend services, Kafka Connect configuration, and Kubernetes/Helm manifests into an operable tenant environment, built on top of the shared `com.openframe.oss` libraries published by [OpenFrame OSS Library](https://github.com/flamingo-stack/openframe-oss-lib).

This document describes how to propose and land a change in this repository: code style, branching, commit messages, the pull request process, and what the review checklist (human and automated) looks for.

> **No GitHub Issues or Discussions.** Planning, bug reports, and feature discussion for OpenFrame happen in the [OpenMSP Slack community](https://www.openmsp.ai/) ([invite link](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)), not in this repository's issue tracker.

Before you start, read [Environment Setup](../setup/environment.md) and [Local Development](../setup/local-development.md) for how to get the stack running, and the [Architecture Overview](../architecture/README.md) for how the services fit together.

## Repository Shape

This is a multi-module Maven project (parent [`pom.xml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/pom.xml)) plus a Rust client crate, deployed through Helm/Argo CD manifests:

| Area | What lives there |
|---|---|
| `openframe/services/*` | Nine Spring Boot modules: `openframe-api`, `openframe-authorization-server`, `openframe-client`, `openframe-config`, `openframe-external-api`, `openframe-gateway`, `openframe-management`, `openframe-stream`, `openframe-test` |
| `clients/openframe-client` | Rust agent binary (Cargo crate `openframe-client`), built over `openframe-agent-lib` |
| `configs/base/*.yml` | Spring Cloud Config files served to every service |
| `manifests/apps`, `manifests/platform`, `manifests/datasources`, `manifests/tenant` | Argo CD app-of-apps and Helm charts |
| `.github/workflows/*` | CI: change detection, release build/publish, automated code review, automated documentation |

Each service module declares the `com.openframe.oss:*-service-core` artifact it builds on (version `7.0.11`, see each module's `pom.xml`, e.g. [`openframe/services/openframe-api/pom.xml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-api/pom.xml)). Changes to shared behavior (auth flows, data access, security) usually belong in the upstream [openframe-oss-lib](https://github.com/flamingo-stack/openframe-oss-lib) repository, not here — check whether the logic you want to change is actually implemented in this repository's `src/main/java` or inherited from the pinned library before you start.

## Code Style and Conventions

### Java services

- **Java 25**, Spring Boot `4.1.1`, Spring Cloud `2025.1.3` — set once in the parent `pom.xml` `<properties>`. Do not override these per-module; bump them in the parent only.
- Each service module's `pom.xml` is deliberately thin: it declares its `*-service-core` dependency, `spring-cloud-starter-config`, and `spring-boot-starter`, then inherits everything else (plugin management, dependency management, exclusions for `log4j-to-slf4j` / `log4j-api`) from the root `pom.xml`. Keep new modules consistent with this shape rather than re-declaring versions.
- **Lombok** is available project-wide (`org.projectlombok:lombok`) and is wired into the annotation-processor path explicitly in `maven-compiler-plugin` configuration, because JDK 23+ does not auto-discover annotation processors from the classpath. If you add a new annotation processor, it must be listed the same way.
- Configuration properties introduced by this codebase must be namespaced under `openframe.oss-tenant.*` or `openframe.*` in YAML (`configs/base/*.yml`) and in `@ConditionalOnProperty` / `@Value` annotations — not placed at the top level or under an ad-hoc prefix, since that would conflict with property resolution from the shared libraries.
- Kafka topic names must be declared under `openframe.oss-tenant.kafka.topics.inbound.<logical-name>.name` or `openframe.oss-tenant.kafka.topics.outbound.<logical-name>` in the service's base YAML config (see `configs/base/application.yml`, `configs/base/openframe-api.yml`, etc.). Do not hardcode topic strings inside `@KafkaListener` or `KafkaTemplate` calls — use the property placeholder.
- Each service has a single Spring Boot entry point class (for example `ApiApplication`, `GatewayApplication`, `StreamApplication` under `openframe/services/<service>/src/main/java/...`). Keep bootstrap logic in that class minimal; service-specific wiring belongs in `@Configuration` classes, mirroring the existing modules.
- Logging: the parent POM pulls in `slf4j-api` and `logback-classic`/`logback-core` plus `logstash-logback-encoder` for structured JSON logging. Use SLF4J loggers, not `System.out`/`println`.

### Rust client

- The agent binary at `clients/openframe-client` is a thin wrapper (`src/main.rs`) over `openframe-agent-lib`, pulled as a pinned git dependency (tag `v0.0.5`) in `clients/openframe-client/Cargo.toml`. Prefer adding behavior to the upstream library crate unless it is genuinely specific to this binary's packaging.
- Format with `rustfmt` and lint with `clippy` before opening a PR — both are installed as components in the CI rust-setup step and are the formatter/linter configured in `.vscode/settings.json` (`editor.defaultFormatter": "rust-lang.rust-analyzer"`, `editor.formatOnSave": true`).
- `cargo build` / `cargo test` / `cargo clippy` run from the `client` working directory per the VS Code tasks in `.vscode/tasks.json` during local development; CI builds per-target in the release workflow's `build_clients` job using `make build TARGET=... OPENFRAME_VERSION=...`.

### Helm / Kubernetes manifests

- Manifests are organized by wave: `manifests/apps` (app-of-apps), `manifests/platform` (platform-wide services, wave 0), `manifests/datasources` (backing stores, wave 0), and `manifests/tenant` (the tenant application chart). Follow the existing `Chart.yaml` / `values.yaml` pattern for any new chart (chart dependency pinned by version, images referenced through `ghcr.io/flamingo-stack/registry/...` mirrors where applicable).
- Ownership of `manifests/` is with `@flamingo-stack/devops-engineers` per `.github/CODEOWNERS` — route infrastructure changes through that review path.

### Shared configuration

- `configs/base/application.yml` holds configuration shared by every service: MongoDB, Redis Cluster, Cassandra, and Pinot connection settings. Service-specific files (`configs/base/openframe-api.yml`, `configs/base/openframe-client.yml`, `configs/base/openframe-external-api.yml`, `configs/base/openframe-management.yml`, `configs/base/openframe-stream.yml`, `configs/base/openframe-gateway.yml`) hold per-service overrides such as Kafka/NATS endpoints and gateway routes.
- `configs/` is owned by `@flamingo-stack/backend-engineers`, and `configs/base/` specifically requires review from `@flamingo-stack/tech-leads` and `@flamingo-stack/tech-heads-of` (last-match-wins CODEOWNERS pattern) — expect that extra review step on any change under `configs/base/`.

## Branch Naming and PR Process

### Branches

- Work happens on a feature branch off `main`, the repository's default branch. There is no enforced prefix convention documented in this repository beyond the reserved prefixes the automated pipelines use for their own purposes — avoid starting a branch name with any of these, since the automation treats them specially:
  - `ai-fix/` — reserved for automated fix branches
  - `setup/` — reserved for pipeline setup branches
  - `code-documentation/` — reserved for the documentation pipeline's own PRs (`DOCS_BRANCH_PREFIX` in `.github/workflows/code-documentation.yml`)
- Stale branches are swept automatically: a scheduled job in `.github/workflows/cleanup.yml` deletes unprotected branches with no commits for 60 days. Keep long-lived feature branches rebased or merge them promptly to avoid losing work to this cleanup.

### Opening a Pull Request

1. Push your branch and open a PR against `main`.
2. CI runs change detection (`.github/workflows/changes.yaml`) to determine which service images, the Rust client, or the Helm chart are affected by your diff, based on path filters per component (for example, a change under `openframe/services/openframe-api/**` or the root `pom.xml` affects the `openframe-api` image; a change under `clients/openframe-client/**` affects the Rust client build).
3. Pushing to `main` (or a manual dispatch) triggers `.github/workflows/release.yml`, which resolves a version, builds only the changed images/clients/chart, and publishes a GitHub Release — this only applies to `main`, not to your feature branch.
4. Request review according to `.github/CODEOWNERS`:
   - `openframe/` → `@flamingo-stack/backend-engineers`
   - `clients/openframe-client/` → `@flamingo-stack/client-engineers`
   - `configs/` → `@flamingo-stack/backend-engineers` (and `configs/base/` additionally needs `@flamingo-stack/tech-leads` + `@flamingo-stack/tech-heads-of`)
   - `manifests/` → `@flamingo-stack/devops-engineers`
   - `.github/CODEOWNERS` itself → `@flamingo-stack/devops-engineers`
5. Merge once required reviews and checks pass. There is no GitHub Issues workflow to link a PR to — if the change addresses a discussion from OpenMSP Slack, reference it in the PR description in prose.

### Automated code review

Pull requests in this repository are also reviewed by an automated reviewer (`.github/workflows/flamingo-code-review.yml`). A few things to know as a contributor:

- It does **not** review automatically the instant a PR is opened. Opening, reopening, or marking ready-for-review posts an **invitation comment** with a checkbox; checking it (or commenting `@flamingo-review`, or adding the `flamingo-review` label from the sidebar) starts the first pass.
- Pushing new commits to an already-reviewed PR does **not** re-trigger a review by itself — comment `@flamingo-review` (incremental, since the last reviewed commit) or `@flamingo-review full` (re-reads the whole cumulative diff) when you want another pass.
- The `flamingo-review-always` label subscribes a specific PR to continuous per-push review, for higher-risk changes.
- The review only runs for pull requests whose head branch is in this repository (not a fork), and comment-triggered reviews only honor commands from users with `OWNER`, `MEMBER`, or `COLLABORATOR` association.

## Commit Message Format

No commit-message linter or enforced template is defined in this repository's workflows. In its absence, follow conventional, descriptive practice consistent with how the codebase documents itself:

- Write a short, imperative-mood summary line (for example, "Add retry to Kafka producer config", not "Added" or "Adding").
- Keep the summary line focused on **what** changed; use the body to explain **why**, especially for anything touching shared configuration (`configs/base/`), service bootstrap classes, or Helm chart image pins.
- Reference the relevant service or module in the summary when a change is scoped to one (`openframe-stream:`, `openframe-gateway:`, `clients/openframe-client:`) so that reviewers and the change-detection matrix context are obvious at a glance.
- If a change depends on an unmerged PR in another repository in this ecosystem (for example `openframe-oss-lib`), note that dependency explicitly in the commit body or PR description — the multi-repo CI tooling that supports a `Depends-On:` relationship is driven by the hub, not a commit trailer defined in this repository.
- Avoid bundling unrelated changes (for example, a Helm chart version bump and a Java service change) into a single commit; split them so change detection and CODEOWNERS routing stay accurate per path.

## Review Checklist

Use this list before requesting review, and expect reviewers (human and the automated reviewer) to check the same points:

### General
- [ ] The change is scoped to the module/path it touches; unrelated files are not modified.
- [ ] New or changed Spring configuration properties are namespaced under `openframe.oss-tenant.*` or `openframe.*`, not top-level or ad-hoc prefixed (see `configs/base/application.yml` for the existing pattern).
- [ ] New Kafka topic names are declared under `openframe.oss-tenant.kafka.topics.inbound.<name>.name` / `...outbound.<name>` in the service's YAML config, never hardcoded in `@KafkaListener`/`KafkaTemplate` calls.
- [ ] Dependency versions on `com.openframe.oss:*` artifacts and `openframe-agent-lib` are not bumped incidentally — a version bump should be its own reviewable change, since every service pins the same `openframe.libs.version` (`7.0.11`) in the parent `pom.xml`.
- [ ] Logging uses SLF4J (`logback-classic`/`logstash-logback-encoder`), not ad-hoc `System.out`.

### Java services
- [ ] Module `pom.xml` stays minimal: service-specific `*-service-core` dependency plus `spring-cloud-starter-config` / `spring-boot-starter`, inheriting the rest from the parent — no duplicated version properties.
- [ ] Any new annotation processor is added to the explicit `annotationProcessorPaths` list in `maven-compiler-plugin` configuration (JDK 25 will not auto-discover it).
- [ ] The service's single `*Application.java` entry point stays a thin bootstrap class; business wiring lives in dedicated configuration/service classes.

### Rust client
- [ ] `cargo fmt` and `cargo clippy` were run (see `.vscode/tasks.json` for the equivalent local tasks `rust-check` / `rust-clippy` / `rust-test`).
- [ ] New functionality that belongs conceptually to the agent runtime (not this binary's packaging) is proposed against `openframe-agent-lib` upstream instead of being duplicated in `clients/openframe-client`.

### Manifests / CI
- [ ] Helm chart or image version bumps under `manifests/` are reviewed by `@flamingo-stack/devops-engineers` per CODEOWNERS.
- [ ] Any new `docker buildx build` step added to a workflow under `.github/workflows/` wraps the build with `nick-fields/retry@v4` (`max_attempts: 3`, `retry_wait_seconds: 5`, `timeout_minutes: 30`), passing the build command via `command:` rather than `run:` — matching the existing pattern in `.github/workflows/release.yml`.
- [ ] If the change affects which services/images/clients get built, confirm the path filters in `.github/workflows/changes.yaml` still correctly scope it (the `IMAGES`, `CLIENTS`, and `ADDONS` definitions there).

### Documentation and secrets
- [ ] No default credentials, tokens, or secrets are committed; real credentials for local environments are left to the developer's own environment configuration.
- [ ] Changes to publicly consumed classes (Spring `@RestController`s, service entry points, configuration classes) are checked for existing callers before renaming or removing anything, since downstream consumption is not always visible from within this repository alone.

## External Tooling

The [OpenFrame CLI](https://github.com/flamingo-stack/openframe-cli) is maintained as a separate repository and is not part of this codebase; if a contribution needs a CLI change, open it against that repository instead (see its [installation guide](https://github.com/flamingo-stack/openframe-cli#installation) and [docs](https://github.com/flamingo-stack/openframe-cli/tree/main/docs)).

For environment setup before you start contributing, see [Environment Setup](../setup/environment.md); for running the stack day to day, see [Local Development](../setup/local-development.md); for how the services and deployment topology fit together, see the [Architecture Overview](../architecture/README.md) and the generated [Ecosystem reference](../../reference/architecture/ecosystem.md).

[![Getting Started with OpenFrame - Organization Setup Basics](https://img.youtube.com/vi/-_56_qYvMWk/maxresdefault.jpg)](https://www.youtube.com/watch?v=-_56_qYvMWk)
