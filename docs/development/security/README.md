
# Security

OpenFrame OSS Tenant is the multi-service, multi-tenant backend of the OpenFrame platform: a Spring Cloud Gateway, an OAuth2/OIDC authorization server, several Spring Boot services (API, External API, Client, Stream, Management, Config), and a Rust system agent (`openframe-client`). This document describes the authentication and authorization model, how secrets and sensitive data are handled, input-validation and common-vulnerability guidance, and how security is enforced in code review for this repository.

For how the services fit together end-to-end, see [the architecture overview](../../reference/architecture/overview.md) and [the ecosystem reference](../../reference/architecture/ecosystem.md). For the environment variables that configure a local or cluster deployment, see [the environment setup guide](../setup/environment.md).

> **Reporting a vulnerability:** do not open a public GitHub issue, pull request, or community Slack message for a security problem. Email **security@flamingo.run** instead. The organization's security policy (coordinated disclosure, scope, supported versions) is published at [https://www.flamingo.run/trust-center](https://www.flamingo.run/trust-center).

## 1. Authentication and authorization patterns

### 1.1 Centralized OAuth2/OIDC authorization server

`openframe-authorization-server` (Maven artifact `com.openframe:openframe-authorization-server`) is the single source of truth for authentication across the platform. Its entry point, `OpenFrameAuthorizationServerApplication` (`openframe/services/openframe-authorization-server/src/main/java/com/openframe/authz/OpenFrameAuthorizationServerApplication.java`), is a `@SpringBootApplication` with `@EnableDiscoveryClient` that component-scans `com.openframe.authz`, `com.openframe.core`, `com.openframe.data`, and `com.openframe.notification` — pulling in shared authentication, persistence, and notification logic from the upstream [OpenFrame OSS Library](https://github.com/flamingo-stack/openframe-oss-lib).

Per the architecture reference, this server is responsible for:
- Multi-tenant OAuth2/OIDC token issuance (RSA-signed JWTs).
- SSO integrations (Google, Microsoft).

### 1.2 Gateway-level enforcement

`openframe-gateway` (Spring Cloud Gateway, port 8081) is the single entry point for all client traffic and is where JWT validation and routing security are enforced before a request reaches a backend service. Its route table, defined in `configs/base/openframe-gateway.yml`, maps path prefixes to backend services:

| Route ID | Path | Target |
|---|---|---|
| `sas` | `/sas/**` | `openframe-authorization-server.tenant.svc.cluster.local` |
| `swagger-api-docs` | `/api-docs/**` | `openframe-external-api.tenant.svc.cluster.local` |
| `openframe-api` | `/api/**` | `openframe-api.tenant.svc.cluster.local` |
| `openframe-client` | `/clients/**` | `openframe-client.tenant.svc.cluster.local` |
| `openframe-ui-spa` | `/**` | `openframe-frontend.tenant.svc.cluster.local` |

Because the gateway is the only component with an externally reachable path, every other service can assume requests arriving on its internal cluster address have already passed gateway-level checks — but each service must still independently validate its own JWTs and authorization rules (defense in depth), since internal cluster networking is not itself a trust boundary.

### 1.3 Shared OAuth2 token lifetimes

Token lifetime and refresh policy are centralized in `configs/base/application.yml` under `security.oauth2`, shared by every service that imports the base config:

```yaml
security:
  oauth2:
    token:
      access:
        expiration-seconds: 3600  # access token lifetime
      refresh:
        expiration-seconds: 604800   # 1 week
        max-refresh-count: 10080     # cap on refreshes within that week
```

Do not raise `access.expiration-seconds` without a corresponding review of session-invalidation paths — a longer-lived access token widens the window an attacker has if a token is leaked.

### 1.4 Resource-server auto-configuration transition

`configs/base/application.yml` excludes both the Spring Boot 3 and Spring Boot 4 names of the OAuth2 resource-server auto-configuration classes:

```yaml
spring:
  autoconfigure:
    exclude:
      - org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration
      - org.springframework.boot.security.oauth2.server.resource.autoconfigure.OAuth2ResourceServerAutoConfiguration
      - org.springframework.boot.autoconfigure.security.oauth2.resource.reactive.ReactiveOAuth2ResourceServerAutoConfiguration
      - org.springframework.boot.security.oauth2.server.resource.autoconfigure.reactive.ReactiveOAuth2ResourceServerAutoConfiguration
```

This is a deliberate transition shim: services are migrating from Spring Boot 3 to Spring Boot 4 (the parent POM already pins `spring-boot-starter-parent` 4.1.1), and Spring Boot silently ignores an exclude entry it doesn't recognize, so both old and new class names are listed together. If you add a service-specific security configuration that re-enables one of these auto-configurations, confirm you are not reintroducing a resource-server bean that conflicts with the platform's own JWT validation filters.

### 1.5 Custom `AuthenticationProvider` beans are forbidden

This is an **active, enforced code-review rule** (`OPENFRAM-002-12`, severity `error`) for this repository, applying to `**/*Config.java`, `**/*SecurityConfig.java`, and `**/*AuthenticationProvider.java`:

> Registering a custom `AuthenticationProvider` as a `@Bean` causes Spring Boot to make it the global `AuthenticationManager`'s *only* provider, silently bypassing the `DaoAuthenticationProvider` wired to `UserDetailsService` and breaking all password logins with `ProviderNotFoundException`.

**Do not** do this:

```java
// WRONG — silently replaces the global AuthenticationManager's provider list
@Bean
public AuthenticationProvider myCustomProvider() {
    return new MyCustomAuthenticationProvider();
}
```

**Do** construct the custom provider inline and wire it directly through the security DSL, scoped to the one endpoint that needs it:

```java
// CORRECT — wired directly into the filter chain, does not touch the global AuthenticationManager
@Bean
public SecurityFilterChain authorizationServerSecurityFilterChain(HttpSecurity http) throws Exception {
    OAuth2AuthorizationServerConfigurer authorizationServerConfigurer =
            OAuth2AuthorizationServerConfigurer.authorizationServer();

    http.with(authorizationServerConfigurer, (authorizationServer) ->
            authorizationServer.tokenEndpoint(tokenEndpoint ->
                    tokenEndpoint.authenticationProvider(new MyCustomAuthenticationProvider())));

    return http.build();
}
```

If you are writing or reviewing a `SecurityConfig` in `openframe-authorization-server`, `openframe-gateway`, or any other service, check for a stray `@Bean`-annotated `AuthenticationProvider` first — it is the most common way password login breaks in this codebase.

### 1.6 Testing authentication failure paths

The API service ships a dedicated test double for exercising authentication-failure behavior: `TestAuthenticationManager` (`openframe/services/openframe-api/src/test/java/com/openframe/api/util/TestAuthenticationManager.java`). It implements Spring Security's `AuthenticationManager` and always throws `BadCredentialsException`, regardless of the credentials supplied:

```java
package com.openframe.api.util;

public class TestAuthenticationManager implements AuthenticationManager {
    @Override
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        throw new BadCredentialsException("Test authentication failed");
    }
}
```

Use it (typically wired as a `@Primary` test bean, alongside `TestConfig` in `openframe/services/openframe-api/src/test/java/com/openframe/api/config/TestConfig.java`) whenever a test needs to assert that a protected endpoint correctly rejects an unauthenticated or invalid-credential request, rather than mocking a successful login path by accident.

### 1.7 Tenant isolation as an authorization boundary

Multi-tenancy is enforced in the data layer, not only at the API boundary. `configs/base/application.yml` sets:

```yaml
openframe:
  tenant-isolation:
    enabled: true
  redis:
    tenant-id: default
```

The accompanying comment in that file explains why this matters: OSS single-tenant deployments still run the shared libraries (from `openframe-oss-lib`) in tenant-isolation mode starting at library version 6.16, because those libraries register services (notifications, tickets, knowledge base) that constructor-require `@TenantAwareRepository` beans. Those beans are only satisfied when `openframe.tenant-isolation.enabled` is `true` — leaving it `false` causes every dependent service to crash-loop at startup rather than silently losing isolation, which is the safer failure mode.

This is reinforced by an **active, enforced code-review rule** (`OPENFRAM-002-6`, severity `error`) scoped to `**/document/**/*.java`:

> All MongoDB `@Document` classes that hold tenant-specific data must implement the `TenantScoped` marker interface. This is the mechanism the platform uses to enforce tenant isolation at the repository layer via `TenantAwareMongoTemplate`. A document that stores a `tenantId` field but does not implement `TenantScoped` will bypass the isolation checks.

When adding a new `@Document` class under a `document/` package in any service, implement `TenantScoped` whenever the document carries tenant-specific data — a `tenantId` field alone does not trigger the isolation checks; only the marker interface does.

## 2. Data encryption and secure storage

### 2.1 Field-level encryption configuration

The shared `security.encryption` block in `configs/base/application.yml` configures the symmetric encryption used for sensitive fields at rest:

```yaml
security:
  encryption:
    password: ${ENCRYPTION_PASSWORD:kdCJxik7VWRlG5L8jKHBeJQK5unssi7u1uHOd01b75ilr8n}
    salt: ${ENCRYPTION_SALT:74f62c51327175b05abe1ad78030565c}
```

> **Both values have inline defaults in the shared base config.** Those defaults exist so the platform boots in a local/dev context without extra setup, but they are **not** safe for any shared, staging, or production environment. Every real deployment must override `ENCRYPTION_PASSWORD` and `ENCRYPTION_SALT` with values injected from a secret store, never left at the checked-in default. Treat the presence of these two environment variables in a deployment's secret configuration as a release gate.

### 2.2 Dependency-level cryptography hardening

The root `pom.xml` pins several cryptography- and serialization-adjacent dependencies above the versions the Spring Boot BOM would otherwise select, specifically to stay ahead of HIGH/CRITICAL CVEs:

| Dependency | Pinned version | Why |
|---|---|---|
| `org.bouncycastle:bcprov-lts8on` | `2.73.13` | Cryptography provider (BouncyCastle) — pinned to a version past known CVEs |
| `com.fasterxml.jackson` (BOM) | `jackson-bom` 3.1.7 / `jackson-2-bom` 2.21.7 | Jackson stays on the 3.2-minus minor line because 3.2 rejects a type-id/type-property overlap the platform's chat `MessageData` type relies on |
| `org.apache.tomcat.embed` | `11.0.26` | Embedded servlet container |
| `org.codehaus.plexus:plexus-utils` | `3.6.2` | Build/runtime utility library |
| `org.apache.thrift:libthrift` | `0.25.0` | Serialization |
| `org.lz4:lz4-java` / `at.yawk.lz4:lz4-java` | `1.8.1` / `1.12.0` | Compression — the Kafka-clients fork is pinned separately because the version Kafka 4 brings in by default (`1.10.1`) carries a HIGH CVE |

The comments directly above these properties in `pom.xml` state the intent explicitly: *"Security overrides on top of the Spring Boot BOM: versions with fixes for HIGH/CRITICAL CVEs flagged by Trivy."* When you bump a dependency anywhere in this POM, check whether it is one of these pinned overrides before letting a transitive resolution silently downgrade it — Trivy scanning in CI is the mechanism that originally forced each of these pins, and reverting one reopens a known CVE.

### 2.3 Secure storage of datastore credentials

Datastore connection strings are themselves sensitive and are composed in `configs/base/application.yml` using a YAML anchor so the value is defined once and reused:

```yaml
spring:
  mongodb:
    uri: &mongo-uri mongodb://openframe:password123456789@mongodb-0.mongodb.datasources.svc.cluster.local:27017/openframe?authSource=admin&...
```

As with the encryption password and salt, this URI's checked-in credential is a local/dev default. Any environment beyond local development should override the MongoDB connection details (and the equivalent Redis Cluster, Cassandra, Kafka, and NATS endpoints also defined in this file and in each service's `configs/base/openframe-*.yml`) through environment-specific secrets rather than relying on the value baked into the shared config.

### 2.4 Redis, Cassandra, Kafka, and NATS endpoints

The same `application.yml` centralizes every datasource endpoint consumed by the services in this repository — Redis Cluster nodes, Cassandra contact points, and the Pinot controller/broker URLs — and per-service files (`configs/base/openframe-api.yml`, `configs/base/openframe-client.yml`, `configs/base/openframe-external-api.yml`, `configs/base/openframe-management.yml`, `configs/base/openframe-stream.yml`) add the Kafka bootstrap servers and NATS server address each service needs. Treat any change to these addresses as a networking/security change, not a cosmetic config change: they define which services can reach which datastore, and in a cluster deployment that reachability is also a trust boundary enforced by Kubernetes network policy at the `datasources` and `tenant` namespace level (see the Argo CD app-of-apps wiring referenced in the ecosystem reference).

## 3. Input validation and sanitization

This repository has no application-level input-validation framework documented in the material inlined above beyond what Spring Boot and Spring Security provide by default (Bean Validation annotations on request DTOs, GraphQL schema-level typing in `openframe-api`). In the absence of repository-specific guidance here, apply these defaults consistently across every service:

- **Validate at the boundary.** Every REST controller and GraphQL resolver in `openframe-api`, `openframe-external-api`, and `openframe-client` (service) should validate incoming payloads against their declared schema/DTO shape before any business logic runs — reject malformed or out-of-range input with a 4xx response rather than letting it propagate into a datastore write.
- **Treat the external API as hostile input.** `openframe-external-api` is the public, rate-limited surface (API key managed) described in the architecture reference — it is the service most likely to receive adversarial input, and its handlers should be the most defensively written in the codebase.
- **Never trust a tenant ID from the request body alone.** Tenant-scoping (section 1.7) depends on the authenticated principal's tenant, not a client-supplied value; a resolver or controller that reads `tenantId` from the request payload and uses it directly to scope a query reintroduces a cross-tenant data leak even if the underlying document correctly implements `TenantScoped`.
- **Validate script and command input at the agent boundary.** The Rust agent (`openframe-client`, `clients/openframe-client/src/main.rs`) executes scripts dispatched from the platform (bash/PowerShell/Python/Nushell, per the architecture reference's script-execution sequence). The dispatch path — API → Gateway → `openframe-client` service → NATS → agent — is the sensitive one: anything that lets an unauthorized caller reach the dispatch endpoint is equivalent to arbitrary remote code execution on every managed device. Authorization checks on that dispatch path deserve the same scrutiny as the authentication flow itself.

## 4. Common security vulnerabilities and mitigations

| Vulnerability class | Where it applies in this repository | Mitigation already in place / to apply |
|---|---|---|
| Broken authentication (silently bypassed login) | Any `SecurityConfig`/`AuthenticationProvider` in `openframe-authorization-server` or other services | Rule `OPENFRAM-002-12` — never register a custom `AuthenticationProvider` as a `@Bean`; wire it inline through the DSL (section 1.5) |
| Cross-tenant data leakage | Any new `@Document` class under a `document/` package | Rule `OPENFRAM-002-6` — implement `TenantScoped`; keep `openframe.tenant-isolation.enabled: true` (section 1.7) |
| Hardcoded/default secrets reaching production | `security.encryption.password`/`salt`, the MongoDB URI's embedded credential, in `configs/base/application.yml` | Override via environment variables (`ENCRYPTION_PASSWORD`, `ENCRYPTION_SALT`) in every non-local environment (section 2.1) |
| Known-CVE transitive dependencies | Any dependency not explicitly pinned in the root `pom.xml`'s `dependencyManagement` | The parent POM already overrides BouncyCastle, Jackson, Tomcat, Plexus Utils, Thrift, async-http-client, and both lz4-java forks past flagged CVEs; keep these pins when upgrading (section 2.2) |
| Excess session/token lifetime | `security.oauth2.token` in `configs/base/application.yml` | Review `access.expiration-seconds` and `refresh.expiration-seconds`/`max-refresh-count` together before changing either (section 1.3) |
| Unauthorized script/command dispatch to managed devices | The API → Gateway → `openframe-client` service → NATS → agent path | Authorization must be enforced at every hop, not only at the Gateway; see section 3 |
| Gateway route path confusion | `configs/base/openframe-gateway.yml` | The frontend route (`/**`) is intentionally listed last/most-general; keep more specific path predicates (`/api/**`, `/clients/**`, `/sas/**`, `/api-docs/**`) registered and matched before the catch-all |

For dependency CVEs specifically, Renovate (`renovate.json`) is configured to track and open PRs for `com.openframe.oss` Maven packages, `@flamingo-stack/openframe-frontend-core`, the pinned FleetMDM and MeshCentral Helm charts, and — grouped into a single PR — every dependency under `clients/openframe-client/**` for the Rust agent. All other Maven, npm, and Helm dependencies are deliberately left unmanaged by Renovate in this repository (each rule's `enabled: false` entries exclude everything not explicitly whitelisted), so a CVE in an unlisted transitive dependency will not be caught automatically — the manual pins in `pom.xml`'s `dependencyManagement` (section 2.2) are the current compensating control for that gap.

## 5. Security testing and code review guidelines

### 5.1 Enforced code-review rules

Two code-review rules tagged `severity: error` are actively enforced against this repository today (both described in detail in sections 1.5 and 1.7 above):

- **`OPENFRAM-002-12`** — custom `AuthenticationProvider` beans must not be registered via `@Bean`.
- **`OPENFRAM-002-6`** — tenant-scoped MongoDB `@Document` classes must implement `TenantScoped`.

Both are `tier: judged`, meaning they are evaluated by the automated reviewer against code you change, not merely documented as guidance. Before opening a pull request that touches a `*Config.java`, `*SecurityConfig.java`, `*AuthenticationProvider.java`, or any file under a `document/` package, check your change against these two rules first.

### 5.2 Test infrastructure for security scenarios

- `TestAuthenticationManager` (section 1.6) exists specifically to test rejection paths — use it rather than mocking a loosely-defined `AuthenticationManager` stub when a test needs to assert a 401/403 response.
- `openframe-api`'s test configuration (`openframe/services/openframe-api/src/test/java/com/openframe/api/config/TestConfig.java`) and test utilities (`TestConstants.java`, `TestUtils.java`) centralize fixtures for authentication-related tests in that service; extend these rather than duplicating test security configuration per test class.
- The test-only configuration `openframe/services/openframe-api/src/test/resources/application-test.yml` disables Kafka, Redis, Cassandra, and Spring Cloud Config, and supplies a non-production `jwt.secret: test-secret-key`. This value must never be reused outside tests — it is deliberately weak and predictable so tests are deterministic, not because weak secrets are acceptable anywhere else.
- `openframe-test` (`com.openframe:openframe-test`) is the shared test-support Maven module used across services; `SummaryLogger` and `TestApplication` in that module back cross-service test reporting.

### 5.3 Vulnerability disclosure and supported versions

The organization's security policy (see `SECURITY.md` at the repository root) defines the full disclosure process. Key points for contributors to this repository:

- Report vulnerabilities to **security@flamingo.run**, never through a public issue, pull request, or Slack message.
- In scope: the source code in public `flamingo-stack` GitHub repositories (including this one), OpenFrame SaaS, and the Flamingo websites.
- Out of scope: self-hosted deployments operated by someone else (report those to their operator, unless the root cause is in this repository's code, in which case report the code issue here) and vulnerabilities in upstream projects OpenFrame bundles (Fleet, MeshCentral, osquery) that are not caused by how OpenFrame uses them.
- Supported versions receiving security fixes: the running OpenFrame SaaS service (fixed by Flamingo automatically) and the latest release of self-hosted OpenFrame, its agent, and its desktop/mobile apps.
- Flamingo AI does not run a paid bug-bounty program but credits reporters publicly with their consent.

## 6. Environment variables and secrets management

### 6.1 Variables defined with defaults in shared config

`configs/base/application.yml` is imported (via Spring Cloud Config, served by `openframe-config`) by every Java service in this repository. It defines the following environment-driven values, each with a checked-in default that is safe only for local development:

| Variable | Purpose | Default (local-only, override in every other environment) |
|---|---|---|
| `ENCRYPTION_PASSWORD` | Symmetric encryption password for sensitive fields | `kdCJxik7VWRlG5L8jKHBeJQK5unssi7u1uHOd01b75ilr8n` |
| `ENCRYPTION_SALT` | Salt paired with `ENCRYPTION_PASSWORD` | `74f62c51327175b05abe1ad78030565c` |
| `REDIS_CLUSTER_NODES` | Redis Cluster node list | the three in-cluster `redis-cluster-*.redis-cluster-headless.datasources.svc.cluster.local:6379` addresses |
| `OPENFRAME_CLUSTER_ID` | Identifies this cluster to the shared libraries | `cluster-id` |
| `SPRING_CONFIG_URL` | Address of the Config Server each service imports from | `http://openframe-config.platform.svc.cluster.local:8888` (also referenced with a `microservices` namespace variant in some per-service `application.yml` files) |
| `RELEASE_VERSION` | Used to version the Actuator management base path | `v1` |

> All of these are read with Spring's `${VAR:default}` placeholder syntax, so the default only applies when the environment variable is genuinely unset. Confirm your deployment's secret injection mechanism actually sets `ENCRYPTION_PASSWORD` and `ENCRYPTION_SALT` — a misconfigured secret mount that silently falls through to the default is indistinguishable from "working" until the encrypted data is inspected.

### 6.2 Per-service configuration imports

Each service's own `src/main/resources/application.yml` (for example `openframe/services/openframe-api/src/main/resources/application.yml`, `openframe/services/openframe-authorization-server/src/main/resources/application.yml`, and `openframe/services/openframe-client/src/main/resources/application.yml`) sets only its `spring.application.name` and imports the rest of its configuration from the Config Server:

```yaml
spring:
  application:
    name: openframe-api
  config:
    import: "optional:configserver:${SPRING_CONFIG_URL:http://openframe-config.microservices.svc.cluster.local:8888}"
```

The `optional:` prefix means a service will still start if the Config Server is unreachable, falling back to whatever local defaults exist — useful for isolated testing, but a reminder that a production deployment must ensure `openframe-config` is actually reachable, or a service may silently boot with stale or default security settings rather than failing closed.

### 6.3 Build-time secrets for the Rust agent

The agent crate (`clients/openframe-client/src/main.rs`) is a thin wrapper around the shared `openframe` crate published from the [OpenFrame OSS Library](https://github.com/flamingo-stack/openframe-oss-lib). Its build requires `OPENFRAME_VERSION` at build time:

```bash
OPENFRAME_VERSION=0.0.0-dev cargo build --release
```

This is a version string, not a secret, but it illustrates the pattern the agent follows for its other feature-gated build-time inputs (`OPENFRAME_CHAT_VERSION`, `MESHCENTRAL_AGENT_VERSION`, `FLEETMDM_AGENT_VERSION`, `OSQUERY_VERSION`, per the architecture reference) — all forwarded through the library's `build.rs`. None of these should ever carry a credential; if a future build-time variable needs to carry one, it must be injected by the CI pipeline's secret store, never committed to a `.env` file or workflow step in plaintext.

### 6.4 General secrets-management rules for this repository

1. **Never commit a real secret value.** The defaults visible in `configs/base/application.yml` are known-local placeholders by design — do not add a new placeholder that looks production-plausible, since that increases the chance someone mistakes it for a real value and reuses it.
2. **Prefer the Config Server over hardcoding.** Every service already imports from `openframe-config`; new configuration — especially anything secret — belongs there (backed by whatever secret store the cluster's Config Server is wired to), not inlined in a service's own `application.yml`.
3. **Keep Renovate's dependency scope in mind when patching a CVE.** Because `renovate.json` disables automatic updates for every Maven/npm/Helm package except the explicitly whitelisted `com.openframe.oss`, `@flamingo-stack/openframe-frontend-core`, FleetMDM, and MeshCentral entries, a security patch to any other dependency must be applied manually in `pom.xml`'s `dependencyManagement` (the existing CVE-driven pins in section 2.2 are the template to follow).
4. **Route datastore and token-lifetime changes through review.** Both are read from the shared `configs/base/application.yml`, consumed by every service — a change here has platform-wide blast radius, unlike a change scoped to one service's own resources.

## Related material

For the surrounding system (which services call which, and the full delivery chain from source to the `ghcr.io/flamingo-stack/openframe-oss-tenant/*` container images), see [the architecture overview](../../reference/architecture/overview.md) and [the ecosystem reference](../../reference/architecture/ecosystem.md), plus [the architecture diagrams](../../diagrams/architecture/README.md). For how to configure environment variables for local development, see [the environment setup guide](../setup/environment.md) and [the local development guide](../setup/local-development.md). For the test suite that exercises this behavior, see [the testing guide](../testing/README.md), and for the review process this document's rules are enforced under, see [the contributing guidelines](../contributing/guidelines.md).
