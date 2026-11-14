# Contributing Guidelines

OpenFrame OSS Tenant assembles the deployable, tenant-oriented OpenFrame platform: Spring Boot services under `openframe/services`, a Rust endpoint agent under `clients/openframe-client`, shared Spring Cloud Config under `configs/base`, and the Helm/Argo CD deployment topology under `manifests`. These guidelines explain how to propose and land a change in this repository.

> **No GitHub Issues or Discussions.** This project does not use GitHub Issues or GitHub Discussions for planning or support. Coordination, feature discussion, and questions happen on the [OpenMSP Slack community](https://www.openmsp.ai/) ([join link](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)). Open a pull request directly for code changes; use Slack for everything else.

Before contributing, it helps to read the [repository architecture overview](../architecture/README.md) and the [local development setup](../setup/local-development.md), which cover how the services, the Rust client, and the Helm manifests fit together.

## Repository shape and ownership

This is a polyglot monorepo: Java/Spring Boot services, a Rust client, bash deployment scripts, and Kubernetes/Helm manifests. Ownership is enforced through [`.github/CODEOWNERS`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/.github/CODEOWNERS):

| Path | Owning team |
|---|---|
| `/openframe/` | `@flamingo-stack/backend-engineers` |
| `/clients/openframe-client/` | `@flamingo-stack/client-engineers` |
| `/configs/` | `@flamingo-stack/backend-engineers` |
| `/configs/base/` | `@flamingo-stack/tech-leads` and `@flamingo-stack/tech-heads-of` (stricter than the rest of `/configs/`, since this is the shared Spring Cloud Config that every service reads) |
| `/manifests/` | `@flamingo-stack/devops-engineers` |
| `/.github/CODEOWNERS` | `@flamingo-stack/devops-engineers` |

CODEOWNERS uses **last-match-wins**: a pull request touching `configs/base/application.yml` requires the tech-leads/tech-heads-of approval even though the broader `/configs/` rule also matches. Keep this in mind when batching changes — a PR that touches both `configs/base` and an unrelated service pulls in the stricter reviewer set for the whole PR.

The `openframe-cli` tooling referenced from local workflows lives in a separate, externally maintained repository ([flamingo-stack/openframe-cli](https://github.com/flamingo-stack/openframe-cli)); changes to the CLI itself belong there, not in this repository.

## Code style and conventions

### Java / Spring Boot services

All nine Maven modules (`openframe-config`, `openframe-api`, `openframe-client`, `openframe-stream`, `openframe-management`, `openframe-gateway`, `openframe-external-api`, `openframe-authorization-server`, `openframe-test`) share a single parent [`pom.xml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/pom.xml) that in turn extends `spring-boot-starter-parent` 4.1.1. Follow these conventions when adding or editing Java code:

- **Target Java 25** (`java.version` in the parent POM) and let the parent manage dependency versions. Do not pin a library version at the module level unless the parent POM does not already manage it (see the `dependencyManagement` block for `plexus-utils`, `bcprov-lts8on`, `libthrift`, `async-http-client`, `lz4-java`, and the `at.yawk.lz4` fork, all pinned there specifically to stay past known HIGH/CRITICAL CVEs).
- **Lombok is required**, not optional, for annotation processing — the parent POM explicitly lists `lombok` and `spring-boot-configuration-processor` under `maven-compiler-plugin`'s `annotationProcessorPaths` because JDK 23+ no longer auto-discovers annotation processors on the classpath. A new module that skips this configuration will fail to compile Lombok-annotated classes.
- **Most domain logic lives upstream.** The actual business logic for API resolvers, authorization flows, client registration, gateway routing, and stream processing is implemented in the OpenFrame OSS Library (`com.openframe.oss:*`, pinned at `7.0.11`) and consumed as a dependency — for example `openframe-api-service-core` in [`openframe/services/openframe-api/pom.xml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-api/pom.xml) or `openframe-client-core` in [`openframe/services/openframe-client/pom.xml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-client/pom.xml). Before writing new logic in this repository, check whether it belongs in the OSS Library instead — this repository's service modules are thin: they wire up the Spring Boot application class (for example [`ApiApplication.java`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-api/src/main/java/com/openframe/api/ApiApplication.java)), pull in the relevant `*-service-core` artifact, and add service-specific configuration.
- **Module `pom.xml` files stay minimal.** Each service module's own POM only declares the parent, the relevant OSS Library artifact(s), and any Spring Cloud / Spring Boot starters it needs directly (see `openframe-config/pom.xml`, which has a single dependency). Resist adding transitive dependencies a module module doesn't use directly.
- **An import must resolve.** Any import a pull request adds must resolve to a local file, a declared Maven/Cargo dependency, or a symbol another managed repository publishes. An import that resolves nowhere is a phantom reference that will fail the build — this is checked automatically in code review.

### Rust client

The endpoint agent in `clients/openframe-client` is a thin binary (`src/main.rs`) over the `openframe-agent-lib` crate pinned by tag in [`clients/openframe-client/Cargo.toml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/clients/openframe-client/Cargo.toml):

```toml
[dependencies]
openframe-agent-lib = { git = "https://github.com/flamingo-stack/openframe-oss-lib.git", tag = "v0.0.5" }
```

- Keep this binary thin. Agent behavior (registration, command execution, tool management, logging) belongs in `openframe-agent-lib` upstream, not in `main.rs`.
- Run `cargo clippy` and `cargo fmt` before submitting — the `.vscode/tasks.json` tasks `rust-clippy`, `rust-check`, and `rust-build` mirror what CI expects, and `.vscode/settings.json` enables `rust-analyzer.checkOnSave.command: "clippy"` with `editor.formatOnSave` for the `[rust]` language.
- Bumping `openframe-agent-lib` to a new tag is a deliberate upgrade, not a side effect of an unrelated change — call it out explicitly in the PR description.

### Shell scripts and manifests

Shell scripts in this repository are concentrated in datasource bootstrap logic, for example `manifests/datasources/mongodb/scripts/mongo-init.sh` and `manifests/datasources/mongodb-meshcentral/scripts/meshcentral-mongodb-init.sh`. Keep them idempotent (safe to re-run against an already-initialized datasource) and quote variables defensively, since they run as Kubernetes init/readiness hooks.

Helm charts and Argo CD application definitions under `manifests/` follow the existing `Chart.yaml` / `values.yaml` pairing per component (see `manifests/datasources/kafka`, `manifests/datasources/redis-cluster`, `manifests/tenant`). When changing an image tag or chart dependency version, update `values.yaml` and `Chart.yaml` together and confirm the change against [`manifests/apps/values.yaml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/manifests/apps/values.yaml), which declares the Argo CD sync wave each component belongs to — getting the wave wrong can deploy a tenant workload before its datasource is ready.

### Global formatting

[`.vscode/settings.json`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/.vscode/settings.json) fixes `files.eol: "\n"`, 2-space indentation (`editor.tabSize: 2`, spaces not tabs) as the repository default, with Rust overriding to 4-space tabs for `[rust]` files. Match these settings regardless of which editor you use.

## Branch naming and PR process

This repository has no documented mandatory branch-naming scheme beyond what the CI pipelines already reserve — avoid these prefixes for your own branches since the automation treats them specially:

- `ai-fix/*` — reserved for automated review-fix branches.
- `setup/*` — reserved for the hub's setup automation.
- `code-documentation/*` — reserved for automated documentation pull requests (`DOCS_BRANCH_PREFIX` in `.github/workflows/code-documentation.yml`).

Use a descriptive branch name that signals scope and intent, for example `backend-engineers` style changes under `openframe/services/openframe-api` or `devops-engineers` style changes under `manifests/`. Keep one logical change per branch so the CODEOWNERS-driven review stays scoped to one team where possible.

### Opening a pull request

1. **Branch from `main`.** The release workflow (`.github/workflows/release.yml`) triggers off pushes to `main` that touch `manifests/**`, `openframe/**`, `integrated-tools/**`, `pom.xml`, or `clients/**` — merging to `main` is what ships new container images and the `app-of-apps` Helm chart.
2. **Keep the change scoped to what CODEOWNERS can review together.** A PR spanning `openframe/services/openframe-api` and `manifests/tenant` requires sign-off from both `@flamingo-stack/backend-engineers` and `@flamingo-stack/devops-engineers`; splitting it in two is usually faster to merge.
3. **Let CI run.** On every push to the repository (except documentation-only changes, which are deliberately excluded via `paths-ignore: ['docs/**', '**.md']`), the `code-graph` job in `.github/workflows/code-documentation.yml` re-indexes the code graph that both the documentation pipeline and the automated code reviewer read. Pull requests also run `.github/workflows/flamingo-code-review.yml`, the automated review pipeline.
4. **Requesting a review pass explicitly.** The review workflow is *not* automatic on every commit — reviewing every push was deliberately avoided because it is the largest avoidable cost in an AI review pipeline and trains authors to ignore the bot. Instead:
   - A first pass happens on PR open, reopen, or ready-for-review as an **invitation** comment with a checkbox.
   - Checking that box, or adding the `flamingo-review` label, or commenting `@flamingo-review` on the PR requests a pass on the new commits since the last review.
   - Commenting `@flamingo-review full` (or checking the "review the whole diff again" box) re-reviews the entire cumulative diff, overriding the incremental anchor.
   - Adding the `flamingo-review-always` label subscribes the PR to review on every push — reserve this for unusually risky refactors.
5. **Resolve findings or explain why not.** Treat automated findings as you would a human reviewer's comment: fix the code, or reply with the reasoning for leaving it as-is.
6. **Merge once required checks pass and CODEOWNERS have approved.** This repository has no issue tracker to close on merge — if the change was discussed on Slack, it's good practice to note that in the PR description for traceability, since there is no linked issue to carry that context.

Because GitHub Issues and Discussions are not used here, do not reference issue numbers in commit messages or PR titles; reference the OpenMSP Slack discussion instead if one exists.

## Commit message format

This repository does not enforce a Conventional Commits prefix mechanically, but commit messages in the observed workflow history favor a clear, imperative, single-purpose style. Follow this baseline:

- **Imperative mood, present tense** — "Add gateway route for external API" rather than "Added" or "Adds".
- **Scope the summary line to what changed**, ideally naming the module or manifest touched, since this is a multi-module monorepo and `git log --oneline` is the fastest way to triage history across `openframe/services/*`, `clients/openframe-client`, and `manifests/*`.
- **Explain the "why" in the body for anything non-obvious** — version bumps that fix a CVE, a chart dependency change, an Argo CD sync-wave adjustment. The parent `pom.xml` itself models this convention: every non-obvious pin (for example `kafka-lz4-java.version`) carries an inline comment explaining *why* that version, not just what it is — commit messages should carry the same reasoning for changes that aren't self-explanatory from the diff alone.
- **One logical change per commit** where practical, so a `git bisect` across services stays useful.

```text
Example commit message shape:

Pin lz4-java to the at.yawk.lz4 fork for kafka-clients 4

kafka-clients 4 moved to the at.yawk.lz4 fork; the upstream
org.lz4:lz4-java 1.10.1 carries a HIGH CVE. Pins
kafka-lz4-java.version in the parent POM.
```

## Review checklist

Before requesting review, and again while reviewing someone else's PR, check the following:

- [ ] **CODEOWNERS coverage is correct.** Does the PR touch `/configs/base/`? Confirm a tech lead or head of has approved, not just a backend engineer — the broader `/configs/` rule does not substitute for the stricter `configs/base/` rule.
- [ ] **No phantom imports.** Every new import resolves to a local file, a declared dependency version (Maven `dependencyManagement`, Cargo `[dependencies]`), or a symbol another managed repository publishes. An unresolved import will fail the build.
- [ ] **Version pins are deliberate.** If a dependency version changed in `pom.xml` or `Cargo.toml`, is there a comment or commit message explaining why (CVE fix, feature need, compatibility constraint)? The parent POM's existing inline comments (e.g., on `jackson-bom.version`, `json-path.version`) are the pattern to match.
- [ ] **Module boundaries respected.** Does new logic belong in this repository's thin service wiring, or should it live in the upstream OpenFrame OSS Library instead? Logic duplicated from an OSS Library artifact that this repository already depends on is a signal the wrong layer was touched.
- [ ] **Lombok/annotation-processor wiring untouched or deliberately extended.** If a new Java module was added, does its `pom.xml` inherit from the parent (`relativePath` to `../../../pom.xml` for a module two levels under `openframe/services`) so it gets the Lombok and `spring-boot-configuration-processor` annotation processing automatically?
- [ ] **Helm/Argo CD changes keep sync waves consistent.** If an image tag, chart dependency, or new Argo CD application was added under `manifests/`, does it respect the existing wave ordering in `manifests/apps/values.yaml` (platform and datasource waves before tenant workloads)?
- [ ] **Datasource endpoints match `configs/base/application.yml`.** A new service reading Mongo, Redis, Kafka, NATS, Cassandra, or Pinot should reuse the shared connection settings already defined there rather than hardcoding a new endpoint.
- [ ] **Gateway routes stay consistent.** If a new route or service is exposed through the gateway, does it fit the existing prefix convention in `configs/base/openframe-gateway.yml` (`/sas/**` to the authorization server, `/api/**` to the API service, `/api-docs/**` to the external API, `/clients/**` to the client service, `/**` to the frontend)?
- [ ] **CI will exercise the change.** Confirm the modified paths fall under what `.github/workflows/changes.yaml` tracks for the affected image or client, so the release workflow actually rebuilds the right container or Rust binary.
- [ ] **No GitHub Issue/Discussion references invented.** Since this project does not use GitHub Issues or Discussions, don't link to ones that don't exist; reference the OpenMSP Slack conversation instead where relevant.
- [ ] **Rust changes are clippy-clean and formatted.** Run `cargo clippy` and `cargo fmt` (or rely on `editor.formatOnSave` with `rust-analyzer`) before pushing.

## Getting help

For questions about contribution scope, architecture decisions, or anything that would otherwise be a GitHub Discussion, use the [OpenMSP Slack community](https://www.openmsp.ai/) ([invite link](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)). For a broader orientation to the platform before your first contribution, see the [introduction](../../getting-started/introduction.md), [prerequisites](../../getting-started/prerequisites.md), and the [development documentation index](../README.md).
