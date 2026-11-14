# Contributing to OpenFrame OSS Tenant

Thank you for your interest in contributing to **OpenFrame OSS Tenant** — the multi-service, multi-tenant open-source foundation of the OpenFrame platform, built by [Flamingo](https://flamingo.run). This repository bundles the Spring Boot backend services (`openframe-api`, `openframe-gateway`, `openframe-authorization-server`, `openframe-external-api`, `openframe-client`, `openframe-stream`, `openframe-management`, `openframe-config`, `openframe-test`), the Kubernetes/Argo CD manifests that deploy them, and the Rust `openframe-client` agent under `clients/openframe-client`.

This guide covers setting up a development environment, the branching and pull request workflow, code style, running and writing tests, reporting security issues, and where to find more documentation.

## Community and communication

**This project does not use GitHub Issues or GitHub Discussions** for feature requests, bug reports, or general discussion. Coordination and support happen in the OpenMSP Slack community:

- [https://www.openmsp.ai/](https://www.openmsp.ai/)
- [Join Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)

GitHub pull requests remain the mechanism for proposing and reviewing code changes. Before opening a larger pull request, consider discussing the change in Slack first. Do not reference invented GitHub Issue or Discussion numbers in commits or PR titles — reference the relevant Slack conversation instead, if one exists.

## How this repository fits the ecosystem

Per the organization's repository graph (`get_repo_ecosystem`, coverage: full), OpenFrame OSS Tenant is a **service** that publishes nine Maven artifacts under `com.openframe` (all `1.0.0-SNAPSHOT`) plus the `openframe_client` Cargo crate (`0.1.0`). It pins 22 Maven artifacts and one Cargo crate (`openframe_agent_lib`, tag `v0.0.5`) from the [OpenFrame OSS Library](https://github.com/flamingo-stack/openframe-oss-lib) at version `7.0.11`. No repository in the organization is recorded as consuming artifacts published from here — this repository sits at the end of the dependency chain, assembling the library into a deployable product rather than being built upon by others.

A practical consequence: most domain logic (API resolvers, authorization flows, client registration, gateway routing, stream processing) lives upstream in OpenFrame OSS Library, not in this repository. Before writing new logic here, check whether it belongs in the OSS Library instead. The Rust agent build depends directly on that library too: `clients/openframe-client/Cargo.toml` pins `openframe-agent-lib` to tag `v0.0.5` of `https://github.com/flamingo-stack/openframe-oss-lib.git`, and `clients/openframe-client/src/main.rs` is a thin wrapper that calls into it.

If you are touching the CLI surface exposed by the separately maintained [openframe-cli](https://github.com/flamingo-stack/openframe-cli) tool, consult that repository's own [installation guide](https://github.com/flamingo-stack/openframe-cli#installation) and [documentation](https://github.com/flamingo-stack/openframe-cli/tree/main/docs) — it is not part of this codebase, and changes to it belong there.

## Setting up a development environment

Do not try to piece a setup together from scratch here — follow the dedicated guides, which are kept current with the repository's actual structure:

1. [Introduction](./docs/getting-started/introduction.md) and [Prerequisites](./docs/getting-started/prerequisites.md) — orientation and tools you need before you start.
2. [Quick Start](./docs/getting-started/quick-start.md) and [First Steps](./docs/getting-started/first-steps.md) — get something running quickly.
3. [Environment Setup](./docs/development/setup/environment.md) — JDK/Rust toolchain, IDE configuration (VS Code launch configs and tasks), and environment variables.
4. [Local Development](./docs/development/setup/local-development.md) — cloning, building, running services and the Rust agent locally, hot reload/watch mode, and debugging.
5. [Architecture Overview](./docs/development/architecture/README.md) — how the gateway, authorization server, API, client, management, and stream services fit together before you start changing code.

In short: the backend is a Maven multi-module project rooted at `pom.xml` (Spring Boot `4.1.1`, Java `25`, Spring Cloud `2025.1.3`), and the Rust agent lives at `clients/openframe-client/`, with its build requiring the `OPENFRAME_VERSION` environment variable passed through to `openframe-agent-lib`'s build script. See [Environment Setup](./docs/development/setup/environment.md) for the full toolchain list and [Local Development](./docs/development/setup/local-development.md) for exact build and run commands — they are not duplicated here.

## Development workflow

### Branches

Branch naming is not rigidly enforced by a single documented scheme, but keep these constraints in mind:

- **Default branch is `main`.** The release workflow (`.github/workflows/release.yml`) triggers on pushes to `main` that touch `manifests/**`, `openframe/**`, `integrated-tools/**`, `pom.xml`, or `clients/**`, building and publishing container images and the `app-of-apps` Helm chart. Land changes through a pull request rather than pushing directly.
- **Avoid reserved branch prefixes.** `ai-fix/*` is reserved for automated review-fix branches, `setup/*` for the hub's setup automation, and `code-documentation/*` for automated documentation pull requests (`DOCS_BRANCH_PREFIX` in `.github/workflows/code-documentation.yml`).
- **Scope your branch to one logical change.** Use a descriptive branch name that signals scope and intent — for example, a backend change under `openframe/services/openframe-api` or a deployment change under `manifests/`. Keeping one logical change per branch keeps the CODEOWNERS-driven review scoped to one team where possible, and makes `git log --oneline` across `openframe/services/*`, `clients/openframe-client`, and `manifests/*` easier to triage.

### Commits

No commit-message template is enforced mechanically, but observed workflow history favors a clear, imperative, single-purpose style:

- **Imperative mood, present tense** — "Add gateway route for external API" rather than "Added" or "Adds".
- **Name the module or manifest touched** in the summary line, since this is a multi-module monorepo.
- **Explain the "why" in the body for anything non-obvious** — a version bump that fixes a CVE, a chart dependency change, an Argo CD sync-wave adjustment. The parent `pom.xml` models this convention itself: every non-obvious pin (for example `kafka-lz4-java.version`) carries an inline comment explaining *why* that version, not just what it is. Commit messages should carry the same reasoning.
- **One logical change per commit** where practical, so a bisect across services stays useful.

```text
Example commit message shape:

Pin lz4-java to the at.yawk.lz4 fork for kafka-clients 4

kafka-clients 4 moved to the at.yawk.lz4 fork; the upstream
org.lz4:lz4-java 1.10.1 carries a HIGH CVE. Pins
kafka-lz4-java.version in the parent POM.
```

Because GitHub Issues and Discussions are not used here, do not reference issue numbers in commit messages or PR titles — reference the OpenMSP Slack discussion instead if one exists.

### Opening a pull request

1. **Branch from `main`.** Make your change and confirm it builds locally — see [Local Development](./docs/development/setup/local-development.md) for the exact Maven and Cargo commands.
2. **Keep the change scoped to what CODEOWNERS can review together.** A PR spanning `openframe/services/openframe-api` and `manifests/tenant` requires sign-off from both `@flamingo-stack/backend-engineers` and `@flamingo-stack/devops-engineers`; splitting it in two is usually faster to merge.
3. **Let CI run.** On every push (except documentation-only changes, excluded via `paths-ignore: ['docs/**', '**.md']`), the `code-graph` job in `.github/workflows/code-documentation.yml` re-indexes the code graph that both the documentation pipeline and the automated code reviewer read. Pull requests also run `.github/workflows/flamingo-code-review.yml`, the automated review pipeline.
4. **Request a review pass explicitly.** Review is not automatic on every commit:
   - A first pass happens on PR open, reopen, or ready-for-review as an **invitation** comment with a checkbox.
   - Checking that box, adding the `flamingo-review` label, or commenting `@flamingo-review` requests a pass on the commits since the last review.
   - Commenting `@flamingo-review full` (or checking the "review the whole diff again" box) re-reviews the entire cumulative diff.
   - Adding the `flamingo-review-always` label subscribes the PR to review on every push — reserve this for unusually risky refactors.
5. **Resolve findings or explain why not.** Treat automated findings as you would a human reviewer's comment: fix the code, or reply with the reasoning for leaving it as-is.
6. **Merge once required checks pass and CODEOWNERS have approved.** There is no issue tracker to close on merge — if the change was discussed on Slack, note that in the PR description for traceability.

### Reviews — ownership (CODEOWNERS)

[`.github/CODEOWNERS`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/.github/CODEOWNERS) assigns review ownership by path, using **last-match-wins**:

| Path | Owning team |
|---|---|
| `/openframe/` | `@flamingo-stack/backend-engineers` |
| `/clients/openframe-client/` | `@flamingo-stack/client-engineers` |
| `/configs/` | `@flamingo-stack/backend-engineers` |
| `/configs/base/` | `@flamingo-stack/tech-leads` and `@flamingo-stack/tech-heads-of` (stricter than the rest of `/configs/`, since this is the shared Spring Cloud Config that every service reads) |
| `/manifests/` | `@flamingo-stack/devops-engineers` |
| `/.github/CODEOWNERS` | `@flamingo-stack/devops-engineers` |

Because CODEOWNERS uses last-match-wins, a pull request touching `configs/base/application.yml` requires the tech-leads/tech-heads-of approval even though the broader `/configs/` rule also matches — a PR that touches both `configs/base` and an unrelated service pulls in the stricter reviewer set for the whole PR.

### Review checklist

Before requesting review, and again while reviewing someone else's PR, check:

- **CODEOWNERS coverage is correct.** If the PR touches `/configs/base/`, confirm a tech lead or head-of has approved, not just a backend engineer.
- **No phantom imports.** Every new import resolves to a local file, a declared Maven/Cargo dependency, or a symbol another managed repository publishes — this is checked automatically in code review.
- **Version pins are deliberate.** If a dependency version changed in `pom.xml` or `Cargo.toml`, is there a comment or commit message explaining why (CVE fix, feature need, compatibility constraint)? Match the existing inline-comment pattern in the parent POM (e.g. on `jackson-bom.version`, `bcprov-lts8on.version`).
- **Module boundaries respected.** Does new logic belong in this repository's thin service wiring, or should it live in the upstream OpenFrame OSS Library instead?
- **Lombok/annotation-processor wiring untouched or deliberately extended.** A new Java module's `pom.xml` must inherit from the parent so it gets Lombok and `spring-boot-configuration-processor` annotation processing automatically — JDK 23+ no longer auto-discovers annotation processors on the classpath.
- **Helm/Argo CD changes keep sync waves consistent.** If an image tag, chart dependency, or new Argo CD application was added under `manifests/`, does it respect the existing wave ordering in `manifests/apps/values.yaml` (platform and datasource waves before tenant workloads)?
- **Datasource endpoints match `configs/base/application.yml`.** A new service reading Mongo, Redis, Kafka, NATS, Cassandra, or Pinot should reuse the shared connection settings already defined there rather than hardcoding a new endpoint.
- **Gateway routes stay consistent.** A new route exposed through the gateway should fit the existing prefix convention in `configs/base/openframe-gateway.yml` (`/sas/**` to the authorization server, `/api/**` to the API service, `/api-docs/**` to the external API, `/clients/**` to the client service, `/**` to the frontend).
- **No GitHub Issue/Discussion references invented.** Reference the OpenMSP Slack conversation instead where relevant.
- **Rust changes are clippy-clean and formatted.** Run `cargo clippy` and `cargo fmt` before pushing.
- **External CLI changes stay external.** Anything concerning the `openframe-cli` tool is referenced against its own repository ([flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)), never assumed to live in a local subdirectory of this repository.

## Code style and conventions

### Java / Spring Boot services

All nine Maven modules (`openframe-config`, `openframe-api`, `openframe-client`, `openframe-stream`, `openframe-management`, `openframe-gateway`, `openframe-external-api`, `openframe-authorization-server`, `openframe-test`) share a single parent `pom.xml` that extends `spring-boot-starter-parent` `4.1.1`. Conventions to follow:

- **Target Java 25** (`java.version` in the parent POM) and let the parent manage dependency versions. Do not pin a library version at the module level unless the parent POM does not already manage it.
- **Lombok is required, not optional,** for annotation processing — the parent POM explicitly lists `lombok` and `spring-boot-configuration-processor` under `maven-compiler-plugin`'s `annotationProcessorPaths`. A new module that skips this configuration will fail to compile Lombok-annotated classes.
- **Most domain logic lives upstream** in the OpenFrame OSS Library (`com.openframe.oss:*`, pinned at `7.0.11`). This repository's service modules are thin: they wire up the Spring Boot application class, pull in the relevant `*-service-core` artifact, and add service-specific configuration. Before writing new logic here, check whether it belongs in the OSS Library instead.
- **Module `pom.xml` files stay minimal.** Each service module's own POM only declares the parent, the relevant OSS Library artifact(s), and any Spring Cloud/Spring Boot starters it needs directly. Resist adding transitive dependencies a module doesn't use directly.
- **An import must resolve.** Any import a pull request adds must resolve to a local file, a declared Maven/Cargo dependency, or a symbol another managed repository publishes. An unresolved import is a phantom reference that will fail the build, and is checked automatically in code review.
- **Security-sensitive dependency versions** in the root `pom.xml` (`jackson-bom.version`, `jackson-2-bom.version`, `tomcat.version`, `bcprov-lts8on.version`, `libthrift.version`, and others) are pinned deliberately above what the Spring Boot BOM would otherwise resolve, to close known HIGH/CRITICAL CVEs. Do not revert these overrides to the BOM default without checking the comment that explains why each one exists.

### Rust client (`clients/openframe-client`)

The endpoint agent is a thin binary (`src/main.rs`) over the `openframe-agent-lib` crate pinned by tag in `clients/openframe-client/Cargo.toml`. Keep this binary thin — agent behavior (registration, command execution, tool management, logging) belongs in `openframe-agent-lib` upstream, not in `main.rs`. Rules enforced on Rust files under `clients/`:

- **Every fallible call that returns `anyhow::Result` must attach `.context("Failed to <verb> <component>")`** before propagating with `?`. A bare `?` is not acceptable on initialization paths.
- **`Regex` values must be compiled exactly once** via a `static` initializer (`once_cell::sync::Lazy` or `lazy_static!`), never constructed inline inside a function body.
- **Writes to JSON state files that another process may concurrently read must use an atomic tmp-then-rename pattern**, not a bare `fs::write` — a concurrent reader can otherwise observe a torn/partial JSON.
- **All code must compile without warnings.** CI sets `RUSTFLAGS=-D warnings` globally, and clippy runs with `--deny clippy::all` across `--benches --tests --examples --all-features`. Do not suppress a warning with `#[allow(...)]` without a comment explaining why the suppression is justified.
- Run `cargo clippy` and `cargo fmt` before submitting — the `.vscode/tasks.json` tasks `rust-clippy`, `rust-check`, and `rust-build` mirror what CI expects, and `.vscode/settings.json` enables `rust-analyzer.checkOnSave.command: "clippy"` with format-on-save for `[rust]` files.
- Bumping `openframe-agent-lib` to a new tag is a deliberate upgrade, not a side effect of an unrelated change — call it out explicitly in the PR description.

### Shell scripts and manifests

Shell scripts are concentrated in datasource bootstrap logic (for example `manifests/datasources/mongodb/scripts/mongo-init.sh`). Keep them idempotent (safe to re-run against an already-initialized datasource) and quote variables defensively, since they run as Kubernetes init/readiness hooks.

Helm charts and Argo CD application definitions under `manifests/` follow the existing `Chart.yaml`/`values.yaml` pairing per component. When changing an image tag or chart dependency version, update `values.yaml` and `Chart.yaml` together and confirm the change against `manifests/apps/values.yaml`, which declares the Argo CD sync wave each component belongs to — getting the wave wrong can deploy a tenant workload before its datasource is ready.

### Global formatting

`.vscode/settings.json` fixes `files.eol: "\n"` and 2-space indentation (spaces, not tabs) as the repository default, with Rust overriding to 4-space tabs for `[rust]` files. Match these settings regardless of which editor you use.

## Running and writing tests

This repository does not document a single unified test command in the development material beyond what each toolchain already provides:

- **Rust client:** from `clients/openframe-client`, `cargo test` (the `rust-test` VS Code task, and the default test task) runs the test suite. `cargo clippy` and `cargo fmt` should be run alongside tests before submitting, matching what CI enforces (`RUSTFLAGS=-D warnings`, `clippy --deny clippy::all`).
- **Java services:** standard Maven test execution applies per module, built from the root multi-module `pom.xml`. The `openframe-api` module's test resources (`openframe/services/openframe-api/src/test/resources/application-test.yml`) show the repository's pattern for isolating security-adjacent infrastructure in tests — disable datastores a test doesn't exercise (Redis, Cassandra, Kafka) rather than pointing it at a real one, and use an explicit, obviously-fake test secret (for example the `jwt.secret: test-secret-key` value already used there) rather than anything resembling a production credential.
- Test fixtures such as `openframe/services/openframe-api/src/test/java/com/openframe/api/util/TestAuthenticationManager.java` and the shared wiring in `openframe/services/openframe-api/src/test/java/com/openframe/api/config/TestConfig.java` exist for the API service's test suite — check these before adding new authentication or authorization test fixtures to avoid duplicating a manager or constant set.

For the full local build/run/debug workflow (including VS Code's preconfigured launch configurations and `rust-build`/`rust-test`/`rust-watch` tasks), see [Local Development](./docs/development/setup/local-development.md).

## Reporting security issues

**Do not report a security vulnerability through a GitHub Issue, pull request, or Slack channel.** Follow the process in [`SECURITY.md`](./SECURITY.md): email **security@flamingo.run** with the affected product/repository, version or commit, a description of the issue, and reproduction steps. See `SECURITY.md` for acknowledgement timelines, scope, and the coordinated-disclosure policy.

For development-time security practices specific to this repository (tenant isolation, JWT/OAuth handling, encryption configuration, input validation, dependency CVE hygiene), see [Security](./docs/development/security/README.md).

## Where to find more documentation

- [Development documentation index](./docs/development/README.md) — the map across environment setup, local development, architecture, security, and contributing guidelines.
- [Documentation home](./docs/README.md) — the top-level documentation index for this repository.

