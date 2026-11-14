# Security

This document describes the security model of OpenFrame OSS Tenant: how authentication and authorization are implemented across its services, how secrets and sensitive data are handled, how input is validated, common vulnerability classes and their mitigations, and how to report or test for security issues in this repository.

OpenFrame OSS Tenant (`flamingo-stack/openframe-oss-tenant`) is the deployable, self-hosted tenant distribution for OpenFrame. Most of the security-relevant implementation — the authorization server, JWT signing, OAuth BFF flows, and gateway security — is implemented in the **OpenFrame OSS Library** (`flamingo-stack/openframe-oss-lib`) and consumed here as pinned Maven and Cargo dependencies at version `7.0.11` / `v0.0.5`. This repository owns the tenant-specific service entry points, shared runtime configuration (`configs/base/`), Kubernetes/Helm manifests, and the release pipeline that builds and publishes service images.

> For the full dependency graph and published artifacts, see [`../../reference/architecture/ecosystem.md`](../../reference/architecture/ecosystem.md) and the repository overview at [`../../reference/architecture/README.md`](../../reference/architecture/README.md).

## How security responsibility is split

Because the security-sensitive code lives upstream, this repository's job is mostly **composition and configuration**: which library versions are pinned, which Spring profiles and properties are set in `configs/base/`, and which network paths the gateway exposes. Reviewing a security change in this repository usually means reviewing a configuration value or a dependency bump, not the cryptographic or authentication code itself.

```mermaid
flowchart LR
    Lib["OpenFrame OSS Library (openframe-oss-lib)"] -->|"maven / cargo 7.0.11 / v0.0.5"| Tenant["OpenFrame OSS Tenant (this repository)"]
    Tenant --> Config["configs/base/*.yml"]
    Tenant --> Manifests["manifests/ (Helm, ArgoCD)"]
    Tenant --> Services["openframe/services/* entry points"]
    Config --> Runtime["Running tenant services"]
    Manifests --> Runtime
    Services --> Runtime
```

No downstream repository is recorded as consuming this one (full coverage across the organization's graph), so this repository is the terminal deployment artifact for the tenant stack.

## Authentication and authorization patterns

### OAuth 2.0 / OpenID Connect authorization server

The `openframe-authorization-server` service (entry point: [`OpenFrameAuthorizationServerApplication.java`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-authorization-server/src/main/java/com/openframe/authz/OpenFrameAuthorizationServerApplication.java)) assembles `com.openframe.oss:openframe-authorization-service-core`. It implements:

- Multi-tenant OAuth 2.0 / OIDC token issuance, with tenant-scoped RSA signing keys resolved per request (a missing tenant context is treated as a hard failure, not a fallback to a shared key).
- Password login, external SSO (Google, Microsoft, Apple), invitation-based registration, and tenant discovery.
- Two ordered Spring Security filter chains: a higher-priority chain for OAuth2/OIDC/JWKS endpoints, and a default chain for login pages, password form login, and SSO callbacks.
- Redis-backed sessions (via Spring Session) so login state survives restarts and horizontal scaling, with tenant-namespaced Redis keys.

Details and diagrams of this flow are documented in [`../../reference/architecture/openframe-authorization-service-core/openframe-authorization-service-core.md`](../../reference/architecture/openframe-authorization-service-core/openframe-authorization-service-core.md), with deep dives in [`authentication_and_sso_flows.md`](../../reference/architecture/openframe-authorization-service-core/authentication_and_sso_flows.md), [`oauth_tokens_and_client_registration.md`](../../reference/architecture/openframe-authorization-service-core/oauth_tokens_and_client_registration.md), and [`security_and_tenant_context.md`](../../reference/architecture/openframe-authorization-service-core/security_and_tenant_context.md).

Key invariants maintainers should preserve (see the upstream module docs for the full list):

1. Tenant context must be resolved **before** security decisions are made; filter order is Spring Session → tenant-context filter → forwarded-prefix filter → `ForwardedHeaderFilter`.
2. JWKS resolution must fail outright when no tenant is resolved — never silently sign with a default or shared key.
3. SSO decoder caching keys on registration id, client id, JWK set URI, *and* issuer URI, so one tenant's OIDC configuration can never validate another tenant's tokens.
4. Password login refuses inactive tenants before it even looks up a user, and SSO-provisioned users with no usable password hash can never authenticate with an empty password.

### JWT signing and verification (shared core)

`com.openframe.oss:openframe-security-core` (documented in [`../../reference/architecture/openframe-security-core/openframe-security-core.md`](../../reference/architecture/openframe-security-core/openframe-security-core.md)) supplies the shared `JwtEncoder`/`JwtDecoder` Spring beans used across services: RSA-based signing, PEM public-key parsing (`KeyConfig`), and an in-memory JWK set built at startup. It intentionally has no opinion on token claims, tenant policy, or HTTP authorization rules — those stay in the authorization server and gateway.

### Gateway and browser/mobile OAuth (BFF)

The `openframe-gateway` service (entry point: [`GatewayApplication.java`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-gateway/src/main/java/com/openframe/gateway/GatewayApplication.java)) is the single externally reachable entry point. Its route table, defined in [`configs/base/openframe-gateway.yml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/configs/base/openframe-gateway.yml), maps:

| Path prefix | Destination |
|---|---|
| `/sas/**` | `openframe-authorization-server` |
| `/api-docs/**` | `openframe-external-api` (Swagger/OpenAPI docs) |
| `/api/**` | `openframe-api` |
| `/clients/**` | `openframe-client` |
| `/**` (remaining) | `openframe-frontend` (SPA) |

`com.openframe.oss:openframe-security-oauth`, documented in [`../../reference/architecture/openframe-security-oauth/openframe-security-oauth.md`](../../reference/architecture/openframe-security-oauth/openframe-security-oauth.md), implements the browser/mobile backend-for-frontend layer under `/oauth/**`: authorization-code + PKCE redirects, state-signed cookies, access/refresh token cookies, native Apple exchange, and one-time development/mobile ticket handoff. Its allow-list checks on native redirect targets (`signup-continue`, `join-return`) are a key security boundary — review any change to `RedirectTargetResolver` or the allow-list configuration carefully, since it gates whether an opaque token/ticket can be appended to an arbitrary native URI.

### Managed-endpoint (agent) authentication

The `openframe-client` service and the Rust endpoint agent (`openframe_agent_lib`, published from this repository as `openframe_client` 0.1.0 via `clients/openframe-client/src/main.rs`) use a separate, device-oriented OAuth flow:

- `POST /api/agents/register`, `/reinstall`, `/uninstall` under `AgentController` — require `X-Initial-Key` and, for reinstall/uninstall, `X-Machine-Id` + `X-Client-Secret` headers.
- `POST /oauth/token` under `AgentAuthController` — issues/renews agent access and refresh tokens (`client_credentials` and `refresh_token` grants).

See [`../../reference/architecture/openframe-client-core-java/registration_and_authentication.md`](../../reference/architecture/openframe-client-core-java/registration_and_authentication.md) for the full registration/token sequence, and the agent-side counterpart in [`../../reference/architecture/openframe-client-core/agent-auth-service/agent-auth-service.md`](../../reference/architecture/openframe-client-core/agent-auth-service/agent-auth-service.md) and [`../../reference/architecture/openframe-client-core/auth-clients/auth-clients.md`](../../reference/architecture/openframe-client-core/auth-clients/auth-clients.md).

```mermaid
sequenceDiagram
    participant Agent as "Endpoint Agent"
    participant Gateway as "OpenFrame Gateway"
    participant ClientSvc as "openframe-client"
    participant Auth as "AgentAuthService"

    Agent->>Gateway: POST /clients/oauth/token (client credentials or refresh)
    Gateway->>ClientSvc: Forward request
    ClientSvc->>Auth: Validate grant and credentials
    Auth-->>ClientSvc: AgentTokenResponse (access and refresh tokens)
    ClientSvc-->>Agent: Signed JWT access token and refresh token
```

The access token includes `machine_id`, `grant_type`, and `roles` claims; the refresh token includes a bounded `refresh_count` so renewal cannot continue indefinitely without re-authentication. The default access-token lifetime is one hour and the refresh-token lifetime is one week, capped at 10,080 refreshes — configured centrally in [`configs/base/application.yml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/configs/base/application.yml) under `security.oauth2.token`.

On the agent side, `AuthClient` (Rust) never logs token values or client secrets; it reports only the HTTP status of each auth attempt to `DeactivationService` for lifecycle handling. Treat `X-Initial-Key`, `X-Client-Secret`, refresh tokens, and generated JWTs as secrets end to end — none of the controller code inlines them into logs.

### Authorization layers to keep in mind when adding endpoints

- **Tenant isolation**: `openframe.tenant-isolation.enabled: true` in `configs/base/application.yml` is required for every Java service to boot correctly against `openframe-oss-lib >= 6.16` — it enables the `@TenantAwareRepository` beans. Do not disable it; the shared config file documents that doing so crash-loops every service.
- **Administrator-only operations**: library-level ticket filter/statistics services (`TicketFilterService`, documented in [`../../reference/architecture/openframe-api-contracts/openframe-api-contracts.md`](../../reference/architecture/openframe-api-contracts/openframe-api-contracts.md)) explicitly validate administrator access before resolving filter options — a pattern to follow for any new admin-scoped query.
- **Domain existence checks**: `DomainExistenceValidator` in `openframe-api-service-core` defaults to always returning `false` for OSS deployments (see [`../../reference/architecture/openframe-api-service-core/domain-existence-validation/domain-existence-validation.md`](../../reference/architecture/openframe-api-service-core/domain-existence-validation/domain-existence-validation.md)). Any SaaS-specific authoritative check must be supplied as a replacement Spring bean, not by editing the library default.

## Data encryption and secure storage

### Transport and signing keys

- RSA-signed JWTs (`openframe-security-core`) are the standard token format across services; the encoder requires both public and private key material, while the decoder needs only the public key — keep private key material restricted to services that must *issue* tokens (the authorization server), not every service that merely *validates* them.
- `openframe.encryption.password` / `openframe.encryption.salt` in [`configs/base/application.yml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/configs/base/application.yml) back general-purpose encryption used by shared libraries. **The checked-in values are development defaults, not production secrets** — any real deployment must override `ENCRYPTION_PASSWORD` and `ENCRYPTION_SALT` as environment variables rather than relying on the committed fallback.

> **Warning**
> `configs/base/application.yml` also ships a literal MongoDB connection string (`mongodb://openframe:password123456789@...`) as the default. This is an OSS development default meant for local/cluster bring-up, not a production credential. Override it through environment-specific Secrets/values rather than editing the shared file in place.

### Agent-local encryption

The Rust endpoint agent's `EncryptionService` (documented in [`../../reference/architecture/openframe-client-core/encryption-service/encryption-service.md`](../../reference/architecture/openframe-client-core/encryption-service/encryption-service.md)) encrypts local secrets with AES-256-GCM, generates a fresh 12-byte nonce per call via the OS random source, and returns `nonce || ciphertext` as Base64. The module's own documentation flags an important limitation explicitly:

> The implementation currently uses one fixed 32-byte key embedded in source, marked with a TODO to replace it with a generated key. Anyone who can read the binary or source can recover it.

Treat this as a known limitation to track rather than a pattern to copy elsewhere. Any new local-encryption need should source its key from proper key management (platform keystore, injected secret, or equivalent) rather than following this component's current embedded-key approach.

### Datastore credentials

Database and broker locations (MongoDB, Redis Cluster, Cassandra, Kafka, NATS, Pinot) are wired through `configs/base/application.yml` and the datasource manifests under `manifests/datasources/`. Each exposes a Prometheus metrics endpoint (`*-exporter` images) — ensure these remain internal-only (ClusterIP / NetworkPolicy scoped) rather than externally routable through the gateway, since they are not behind the gateway's authentication layer.

## Input validation and sanitization

- HTTP request DTOs across the API surface use Jakarta Bean Validation. For example, `AgentController`'s `/register` and `/reinstall` endpoints apply `@Valid` to the incoming `AgentRegistrationRequest`, and the controller itself is described as intentionally thin — validation and business-rule enforcement live in the delegate service, not the controller. Follow this layering: validate at the HTTP boundary, but keep service-level validation as the real enforcement point, since non-HTTP callers (internal service-to-service calls, scheduled jobs) bypass the controller.
- Device log queries are bounded explicitly by `DeviceLogArgumentContract` (in `openframe-api-contracts`): at most 50 distinct machine/organization identifiers, at most five include/exclude terms of at most 256 UTF-16 code units each, and a time range capped at 30 days. These limits exist to protect downstream Cassandra/Loki queries from unbounded or adversarial input — preserve them when extending log query capabilities.
- Script execution inputs are validated by dedicated validators rather than ad hoc checks: `ScriptPrivilegeValidator` only allows `ELEVATED_USER` execution when the target platform list is exactly Windows, and `ScriptTimeoutValidator` rejects nonpositive timeouts and timeouts above the configured maximum. New RMM or script-dispatch features should route through equivalent dedicated validators rather than inlining checks in a data fetcher or controller.
- Software-bundle mutation inputs (`CreateSoftwareBundleInput`, `UpdateSoftwareBundleInput`) validate a nonempty, subject-safe set of target machine identifiers and nested package data before any execution record is created — persistence of execution rows always happens **before** publishing work to agents, so a result can never arrive for an execution the platform has no record of.
- PEM key parsing (`KeyConfig.toRSAPublicKey`) strips headers/footers and whitespace before Base64 decoding, and fails fast (throws) on invalid key material rather than falling back to an unverified mode — preserve that fail-closed behavior in any related code.

## Common security vulnerabilities and mitigations

| Risk | Mitigation already in place | What to watch for when changing code |
|---|---|---|
| Cross-tenant signing-key or session leakage | Per-tenant RSA key resolution; SSO decoder cache keyed on provider + client + JWKS URI + issuer; tenant-namespaced Redis session keys | Never add a "default tenant" or shared-key fallback path to JWKS resolution |
| Session fixation across login redirects | Redis-backed Spring Session with hash-tagged keys supporting session-key rename at login; `JSESSIONID` pinned to the servlet context path | Don't widen session cookie scope or remove the rename-on-login behavior |
| CSRF on login/OAuth endpoints | CSRF protection scoped specifically to `POST /login`; CORS disabled on the authorization-server default chain | Keep CSRF narrowly targeted rather than globally disabling it |
| Open-redirect via native mobile handoff | `RedirectTargetResolver.isAllowedRedirectUri` allow-list enforced on `signup-continue` and `join-return` | Any new native redirect endpoint must go through the same allow-list contract |
| Stale/invalid refresh token clearing a valid session | `/oauth/refresh` only clears auth cookies when the refresh token is **missing**; an invalid/unknown supplied token returns 401 **without** clearing cookies | Preserve this asymmetry — it protects a freshly rotated browser token from a concurrent stale refresh request |
| Replay of Apple native authorization code | Discovery/registration endpoints deliberately avoid spending the Apple authorization code; only the subsequent native token exchange consumes it, providing replay protection | Do not consume the code earlier in the flow for convenience |
| Stale Apple tokens for deleted users | `AppleTokenRevocationScheduler` periodically revokes tokens for missing/deleted users (5 min initial delay, 1 hour sweep by default), retrying failures on the next sweep | Keep failed revocations retried rather than dropped |
| Unbounded/expensive log or device queries | `DeviceLogArgumentContract` enforces identifier count, term count/length, and a 30-day window | Don't bypass the contract for a "simpler" ad hoc query path |
| Disclosure of error internals | `AgentAuthController` returns a generic `server_error` body for unexpected exceptions and logs details server-side only | Don't propagate raw exception messages or stack traces to API responses |
| Script/command injection via RMM | Privilege and timeout validators gate script execution requests before dispatch | Extend validators rather than relaxing them for new execution types |
| Dependency CVEs | `pom.xml` pins several transitive dependencies above the Spring Boot BOM specifically to clear HIGH/CRITICAL CVEs (Jackson, Tomcat, Bouncy Castle `bcprov-lts8on`, `libthrift`, `async-http-client`, `lz4-java`, Freemarker, `plexus-utils`) | When bumping the parent Spring Boot BOM, re-check whether these manual overrides are still needed or now redundant |

### Dependency and supply-chain hygiene

`renovate.json` constrains automated dependency updates deliberately:

- Only `com.openframe.oss:*` Maven artifacts are auto-updated and grouped under the `openframe-libs` label; all other Maven dependencies are explicitly disabled from automatic updates (`"enabled": false` for everything not matching `^com\.openframe\.oss`).
- `com.openframe:openframe-parent` itself is excluded from lookups to avoid resolution errors.
- The `@flamingo-stack/openframe-frontend-core` npm package is the only auto-updated npm dependency.
- FleetMDM and MeshCentral Helm charts are each tracked in their own grouped PR; all other Helm charts are disabled from automatic updates.
- Rust (`clients/openframe-client/**`) dependencies are tracked as one grouped PR.

This means a new third-party Maven, npm, or Helm dependency will **not** receive automated security updates unless it falls into one of these explicitly enabled patterns — a reviewer should flag any new dependency outside these groups as needing a manual update plan.

## Security testing and code review guidelines

- Follow the test layering already established in `openframe-api`: `TestConfig`, `TestAuthenticationManager`, `TestUtils`, and `TestConstants` under `openframe/services/openframe-api/src/test/java/com/openframe/api/` provide a reusable base for authentication-related tests. `TestAuthenticationManager` always throws `BadCredentialsException`, giving tests a deterministic "authentication fails" path without depending on a real credential store.
- `application-test.yml` for `openframe-api` disables Mongo, Redis, Cassandra, and Kafka auto-configuration and supplies a fixed test JWT secret (`jwt.secret: test-secret-key`) — this isolates authentication-adjacent unit tests from real infrastructure. When adding security-relevant tests, prefer extending this profile rather than wiring real datastores into unit tests.
- Shared end-to-end and integration test infrastructure comes from `com.openframe.oss:openframe-test-service-core`, consumed here as the `openframe-test` module (see [`../../reference/architecture/openframe-test-service-core/openframe-test-service-core.md`](../../reference/architecture/openframe-test-service-core/openframe-test-service-core.md)); use it for any new end-to-end authentication or SSO-flow test rather than building a parallel harness.
- Before changing authentication, token, or tenant-isolation code, re-read the "Operational Invariants" and "Maintenance Notes" sections of the relevant upstream module docs linked throughout this document — they encode security properties that are easy to violate with an otherwise-reasonable refactor (for example, moving a status-report call, relaxing a redirect allow-list, or changing a cache key).
- Treat this repository and `openframe-oss-lib` as one review boundary for security changes: a configuration change here (for example, an `application.yml` property) can silently alter the security behavior implemented upstream, so a reviewer should check both the property's default and the upstream module's documented behavior for that property.
- For details on the general testing approach and tools used across this repository, see [`../testing/README.md`](../testing/README.md).

### Reporting a vulnerability

This project does not use GitHub Issues or Discussions for vulnerability reports. Security issues must be reported privately, per the organization's security policy:

- Email **security@flamingo.run** — do not open a public issue, pull request, or community-channel post for a security problem.
- Include the affected repository/component, version or commit, a description of impact, and reproduction steps.
- The organization acknowledges reports within 3 business days and provides an initial severity assessment within 10 business days, using CVSS to prioritize fixes.
- Coordinated disclosure is expected: researchers should allow a reasonable period (targeted at 90 days) before public disclosure.
- In scope: the source code of public `flamingo-stack` repositories (including this one and its agent/installers), OpenFrame SaaS, and the Flamingo websites. Out of scope: third-party/supplier services, self-hosted deployments operated by someone else, and vulnerabilities in upstream projects (Fleet, MeshCentral, osquery) not caused by how OpenFrame integrates them.
- General community discussion and support happen on the OpenMSP Slack community (https://www.openmsp.ai/), not on GitHub.

## Environment variables and secrets management

Runtime configuration in this repository follows a layered model: a Spring Cloud Config Server (`openframe-config`, entry point [`ConfigServerApplication.java`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-config/src/main/java/com/openframe/config/ConfigServerApplication.java)) serves shared properties to every other service, which import it via `spring.config.import: "optional:configserver:${SPRING_CONFIG_URL:...}"` — see for example [`openframe-api/src/main/resources/application.yml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-api/src/main/resources/application.yml). Shared defaults live in [`configs/base/application.yml`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/configs/base/application.yml) and per-service files such as `configs/base/openframe-api.yml`, `configs/base/openframe-client.yml`, `configs/base/openframe-gateway.yml`, `configs/base/openframe-management.yml`, and `configs/base/openframe-stream.yml`.

Key environment-overridable settings seen in the shared configuration:

| Variable | Used for | Default behavior |
|---|---|---|
| `SPRING_CONFIG_URL` | Points services at the Config Server | Defaults to the in-cluster Config Server address |
| `REDIS_CLUSTER_NODES` | Redis Cluster node list | Defaults to the in-cluster `redis-cluster-*` headless service names |
| `ENCRYPTION_PASSWORD`, `ENCRYPTION_SALT` | General-purpose encryption key material | Defaults to a checked-in development value — **must** be overridden outside local/dev use |
| `OPENFRAME_CLUSTER_ID` | Cluster identity used by the delivery engine | Defaults to a placeholder string |
| `RELEASE_VERSION` | Actuator endpoint path versioning | Used to build `management.endpoints.web.base-path` |

Operational guidance:

- Never commit a production value for `ENCRYPTION_PASSWORD`, `ENCRYPTION_SALT`, the MongoDB URI's credentials, or any OAuth client secret into `configs/base/` — these files are shared across every deployment built from this repository, so a committed secret is effectively public to anyone with repository access.
- Prefer environment-variable overrides (as the `${VAR:default}` placeholders already model) or Kubernetes Secrets referenced from the Helm values files under `manifests/tenant/`, `manifests/platform/`, and `manifests/datasources/`, rather than editing the shared YAML defaults in place.
- Actuator endpoints are deliberately narrowed: `configs/base/application.yml` exposes only `health,info,metrics,prometheus` and sets `access: read-only` for the `prometheus`, `health`, and `metrics` endpoints, with the default access level for all other management endpoints set to `read-only`. Do not widen this exposure (for example, enabling `env` or `shutdown`) without an explicit security review, since actuator endpoints are reachable within the cluster network.
- Logging configuration is itself fetched remotely (`logging.config` pointing at the Config Server's `/logging/shared-logback-spring-logfmt.xml`); avoid introducing `DEBUG`-level logging for `org.springframework.security` or `com.openframe.security` packages in shared config, since elevated security-related log verbosity can leak token or credential fragments into centralized logs.
- The `.github/workflows/release.yml` pipeline publishes container images to `ghcr.io/flamingo-stack/openframe-oss-tenant/*` and the `app-of-apps` Helm chart to the same registry namespace — treat registry credentials and the release workflow's secrets as part of the deployment's trust boundary, since a compromised release pipeline can ship a malicious image under the organization's published name.

For general environment setup (not specific to security), see [`../setup/environment.md`](../setup/environment.md) and [`../setup/local-development.md`](../setup/local-development.md). For the overall architecture this security model sits within, see [`../architecture/README.md`](../architecture/README.md) and [`../../reference/architecture/README.md`](../../reference/architecture/README.md).
