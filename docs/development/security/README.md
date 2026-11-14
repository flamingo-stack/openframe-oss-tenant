[![Getting Started with OpenFrame - Organization Setup Basics](https://img.youtube.com/vi/-_56_qYvMWk/maxresdefault.jpg)](https://www.youtube.com/watch?v=-_56_qYvMWk)

# Security

This document describes the security model that applies to the OpenFrame OSS Tenant repository: how the tenant services authenticate and authorize requests, how secrets and encrypted data are handled, how input is validated at the gateway and service boundaries, common pitfalls to avoid, how security is reviewed and tested, and how environment variables and secrets are managed across the Helm manifests and Spring configuration in this repository.

OpenFrame OSS Tenant is a **service** repository (bash, java, rust) that assembles independently deployable Spring Boot services. It does not implement authentication/authorization protocols, encryption primitives, or input-validation frameworks itself — those behaviors are supplied by the pinned `com.openframe.oss` libraries (version `7.0.11`) published from [OpenFrame OSS Library](https://github.com/flamingo-stack/openframe-oss-lib), most notably `openframe-security-core` and `openframe-security-oauth`. This repository's security surface is therefore mostly about **composition and configuration**: which packages each service scans, which routes the gateway exposes, and which values are injected through environment variables and `configs/base/*.yml`.

> This repository has no recorded downstream consumers in the organization's dependency graph (coverage: full), and no custom code-review rules are currently registered for it. The guidance below is derived from the services' actual bootstrap classes, shared configuration files, and the organization-wide [Security Policy](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/SECURITY.md).

## 1. How the tenant is secured, end to end

```mermaid
flowchart LR
    User["Browser or API consumer"] --> Gateway["OpenFrame Gateway"]
    Gateway -->|"Path /sas/**"| Authz["Authorization Server"]
    Gateway -->|"Path /api/**"| Api["OpenFrame API"]
    Gateway -->|"Path /clients/**"| Client["OpenFrame Client"]
    Gateway -->|"Path /api-docs/**"| ExternalApi["External API"]
    Gateway -->|"Path /**"| Frontend["OpenFrame Frontend"]
    Config["OpenFrame Config Server"] --> Api
    Config --> Authz
    Config --> Client
    Config --> ExternalApi
    Config --> Gateway
    Authz --> Mongo["MongoDB"]
    Authz --> Redis["Redis Cluster"]
    Gateway --> Redis
```

Every tenant service is a separate Spring Boot application (see `openframe/services/*/src/main/java/.../*Application.java`), bootstrapped independently and wired together only through the gateway's routing rules and the shared configuration in `configs/base/`. Security-relevant composition is expressed through two mechanisms repeated across services:

- `@ComponentScan` boundaries, which decide which `com.openframe.*` packages (including security-related ones shipped by the upstream library) are loaded into each service's Spring context.
- Shared and per-service YAML under `configs/base/`, which supplies secrets, encryption keys, token lifetimes, and datastore locations through environment-variable placeholders.

## 2. Authentication and authorization patterns

### 2.1 Authorization Server as the identity boundary

[`OpenFrameAuthorizationServerApplication`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-authorization-server/src/main/java/com/openframe/authz/OpenFrameAuthorizationServerApplication.java) is the OAuth2/OpenID Connect authorization boundary for the whole tenant. It is annotated with:

```java
@SpringBootApplication
@EnableDiscoveryClient
@ComponentScan(
        basePackages = {
                "com.openframe.authz", "com.openframe.core", "com.openframe.data", "com.openframe.notification"
        }
)
public class OpenFrameAuthorizationServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(OpenFrameAuthorizationServerApplication.class, args);
    }
}
```

This service pulls in `com.openframe.oss:openframe-authorization-service-core` and `com.openframe.oss:openframe-data-redis` (both pinned at `7.0.11`) to implement the actual OAuth2 protocol, token issuance, and Redis-backed session/authorization state. The bootstrap class itself contains no authentication logic — all protocol behavior comes from the upstream library.

Key facts about how authorization is wired in this repository:

- The gateway routes `/sas/**` to the authorization server's in-cluster service, per the `gateway_route` entry in `configs/base/openframe-gateway.yml`. The authorization server runs with context path `/sas` and does not strip that prefix.
- Other tenant services (`openframe-api`, `openframe-client`, `openframe-external-api`) treat the authorization server as the source of truth for tokens; the gateway's JWT validation is configured against the authorization-server's issuer base, so that base must always match where tokens are actually issued.
- Google and Microsoft are the supported federated identity providers, configured through OAuth/OIDC endpoint settings and redirect URIs built from `TENANT_HOST_URL` (defaulting to `https://localhost` when unset — **a value that must be overridden in any real deployment**).
- Token lifetimes are centrally defined under `security.oauth2.token` in `configs/base/application.yml`:

```yaml
security:
  oauth2:
    token:
      access:
        expiration-seconds: 3600  # 10 minute
      refresh:
        expiration-seconds: 604800  # 1 week (7 * 24 * 60 * 60)
        max-refresh-count: 10080    # Maximum refreshes in a week (7 * 24 * 60)
```

> The inline comment says "10 minute" but the configured value is `3600` seconds (1 hour). Treat the numeric value, not the comment, as ground truth when reasoning about token lifetime, and correct the comment if you touch this block.

### 2.2 Authentication manager seams in tests

The API service's test harness shows the authentication seam that production code plugs into. [`TestAuthenticationManager`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-api/src/test/java/com/openframe/api/util/TestAuthenticationManager.java) implements Spring Security's `AuthenticationManager` and deliberately always fails:

```java
public class TestAuthenticationManager implements AuthenticationManager {
    @Override
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        throw new BadCredentialsException("Test authentication failed");
    }
}
```

This is useful as a negative-path fixture (verifying that protected endpoints correctly reject unauthenticated or badly-authenticated requests) but it is **not** a template for production authentication — production authentication flows come from `spring-security-test`'s support utilities (declared as a test-scope dependency in the parent `pom.xml`) plus the upstream `openframe-security-core` / `openframe-security-oauth` artifacts.

### 2.3 Spring Security auto-configuration is deliberately excluded then re-enabled per concern

`configs/base/application.yml` excludes both the Spring Boot 3-era and Spring Boot 4-era names of the OAuth2 resource-server auto-configuration, for both servlet and reactive stacks:

```yaml
spring:
  autoconfigure:
    exclude:
      - org.springframework.boot.autoconfigure.security.oauth2.resource.servlet.OAuth2ResourceServerAutoConfiguration
      - org.springframework.boot.security.oauth2.server.resource.autoconfigure.OAuth2ResourceServerAutoConfiguration
      - org.springframework.boot.autoconfigure.security.oauth2.resource.reactive.ReactiveOAuth2ResourceServerAutoConfiguration
      - org.springframework.boot.security.oauth2.server.resource.autoconfigure.reactive.ReactiveOAuth2ResourceServerAutoConfiguration
```

The comment in that file explains why: this is a **Spring Boot 3 → Spring Boot 4 transition measure**. Each class name is listed under both its Spring Boot 3 and Spring Boot 4 package, and Spring Boot silently skips names it does not recognize, so both entries can coexist until every service has moved to Spring Boot 4. **Do not remove either variant of a name until all services are confirmed on Spring Boot 4** (the parent `pom.xml` currently pins `spring-boot-starter-parent` at `4.1.1`), or the exclusion could silently stop applying to a service still running the older autoconfiguration name.

Because resource-server autoconfiguration is excluded, JWT/OAuth2 validation is instead composed explicitly by the upstream `openframe-security-oauth` library and the gateway's own JWT validation configuration — if you are adding a new protected endpoint, confirm which filter chain actually applies rather than assuming Spring Boot's defaults are active.

### 2.4 Gateway as the single ingress and policy point

[`GatewayApplication`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-gateway/src/main/java/com/openframe/gateway/GatewayApplication.java) is the reactive edge service. Per the architecture reference, it applies routing, OAuth integration, JWT validation, CORS, rate-limit configuration, and backend HTTP client policy — making it the natural place to review when changing any cross-cutting security control, because every external request to `/api/**`, `/clients/**`, `/sas/**`, `/api-docs/**`, and the frontend path passes through it first (`configs/base/openframe-gateway.yml`).

> **When adding a new route or service**, update `configs/base/openframe-gateway.yml` deliberately, and confirm the new path requires authentication unless it is explicitly meant to be public. The gateway is the only layer standing between the tenant's internal service mesh and the outside world.

## 3. Data encryption and secure storage

### 3.1 Symmetric encryption configuration

`configs/base/application.yml` defines a shared encryption key and salt, consumed by services (notably the authorization server) for encrypting sensitive values at rest:

```yaml
security:
  encryption:
    password: ${ENCRYPTION_PASSWORD:kdCJxik7VWRlG5L8jKHBeJQK5unssi7u1uHOd01b75ilr8n}
    salt: ${ENCRYPTION_SALT:74f62c51327175b05abe1ad78030565c}
```

> **Critical:** the fallback values shown above are committed in the repository and are therefore public. They exist only so the stack can boot in a local/dev environment without extra setup. **Every real deployment must override `ENCRYPTION_PASSWORD` and `ENCRYPTION_SALT` with deployment-specific secrets** injected through the environment (Kubernetes Secret, sealed secret, or equivalent) — never rely on the in-repo default outside of local development. The authorization-server architecture notes make the same point explicitly: "Treat these settings as secrets and provide deployment-specific values."

### 3.2 Transport and dependency-level cryptography hardening

The parent `pom.xml` pins several cryptography- and transport-adjacent libraries above the versions that would otherwise be pulled in transitively, specifically to close HIGH/CRITICAL CVEs flagged by vulnerability scanning (Trivy, per the inline comment):

```xml
<!-- Security overrides on top of the Spring Boot BOM: versions with fixes for HIGH/CRITICAL CVEs flagged by Trivy.
     Jackson stays on the BOM's minor line: 3.2 rejects the chat MessageData type id / type property overlap. -->
<jackson-bom.version>3.1.7</jackson-bom.version>
<jackson-2-bom.version>2.21.7</jackson-2-bom.version>
<tomcat.version>11.0.26</tomcat.version>
<freemarker.version>2.3.35</freemarker.version>
<plexus-utils.version>3.6.2</plexus-utils.version>
<bcprov-lts8on.version>2.73.13</bcprov-lts8on.version>
<libthrift.version>0.25.0</libthrift.version>
<async-http-client.version>3.0.14</async-http-client.version>
<lz4-java.version>1.8.1</lz4-java.version>
<!-- kafka-clients 4 moved to the at.yawk.lz4 fork; 1.10.1 has a HIGH CVE -->
<kafka-lz4-java.version>1.12.0</kafka-lz4-java.version>
```

Notably, `bcprov-lts8on` (Bouncy Castle, the JVM cryptography provider many TLS and JWT libraries depend on transitively) is explicitly pinned via `<dependencyManagement>` rather than left to whatever version a dependency happens to request. When bumping any dependency that touches TLS, JWT signing, or hashing, check whether it pulls in an older `bcprov-lts8on`, `libthrift`, or `async-http-client` version and whether the pin above still needs to apply.

Renovate (`renovate.json`) is explicitly restricted to only auto-update `com.openframe.oss` Maven packages, the `@flamingo-stack/openframe-frontend-core` npm package, the FleetMDM and MeshCentral Helm charts, and `clients/openframe-client` Rust dependencies — **all other Maven dependencies are disabled for automated updates** (`"matchPackageNames": ["!/^com\\.openframe\\.oss/"]`, `"enabled": false`). This means the cryptography-related overrides above are **manually maintained**: when a new CVE affects a pinned library, a human must bump the version in `pom.xml` rather than waiting for a bot PR.

### 3.3 Secure storage at the datastore layer

Credentials for backing datastores are embedded in connection strings rather than passed as discrete structured secrets. For example, the MongoDB URI in `configs/base/application.yml`:

```yaml
spring:
  mongodb:
    uri: &mongo-uri mongodb://openframe:password123456789@mongodb-0.mongodb.datasources.svc.cluster.local:27017/openframe?authSource=admin&connectTimeoutMS=10000&socketTimeoutMS=10000&serverSelectionTimeoutMS=10000
```

> This is another committed default intended for local/dev bring-up. Any shared, staging, or production environment must replace this URI (ideally via an injected environment variable or a Kubernetes Secret mounted into the pod) rather than running with the in-repo credential. The same applies to the MySQL, Cassandra, Redis, and Kafka connection details defined elsewhere under `configs/base/` and `manifests/datasources/*/values.yaml`.

### 3.4 Tenant isolation as a data-boundary control

`configs/base/application.yml` enables tenant isolation even though this is a single-tenant OSS deployment:

```yaml
openframe:
  tenant-isolation:
    enabled: true
  redis:
    tenant-id: default
```

The accompanying comment explains this is required because the shared OpenFrame OSS libraries (version 6.16+) register components — notifications, tickets, knowledge base, and others — that constructor-require `@TenantAwareRepository` beans. Those beans are only created by `TenantAwareSyncConfig` when `tenant-isolation.enabled` is `true`; the non-isolated `MongoSyncConfig` variant deliberately excludes them. Disabling this flag would leave required beans unsatisfiable and every Java service would crash-loop at startup, and it would also reintroduce the `openframe_client_configuration` E11000 duplicate-key failure that tenant-aware reads/writes agreeing on a tenant ID resolves. **Do not disable `tenant-isolation.enabled` in this repository's configuration** without confirming the pinned `openframe-oss-lib` version's compatibility.

## 4. Input validation and sanitization

This repository does not define request-validation annotations or sanitization filters directly — those live in the scanned `com.openframe.*` packages supplied by the pinned OSS library, and in gateway-level policy. What this repository controls is **where validation is expected to happen** and **what must reach it unmodified**:

- The gateway (`configs/base/openframe-gateway.yml`) is the single point where every inbound path (`/sas/**`, `/api/**`, `/clients/**`, `/api-docs/**`, `/**`) is matched against a route before being forwarded. Because it is the common entry point, it is also the natural place for coarse-grained request shape policy (size limits, header stripping, path normalization) — review gateway configuration changes with that in mind.
- Each service's `@ComponentScan` list (for example `ApiApplication`'s scan of `com.openframe.api`, `com.openframe.data`, `com.openframe.core`, `com.openframe.notification`, `com.openframe.kafka`) determines which validators, converters, and request-mapping controllers are actually active. Adding a new package root to a scan, or removing one, can silently include or exclude validation logic that previously applied — the API service's own architecture notes call this "a runtime contract."
- The authorization server builds redirect and password-reset URLs from the `TENANT_HOST_URL` environment variable. Because these URLs are constructed from external configuration and exposed to the identity provider and to end users (SSO redirect URIs, password-reset emails), `TENANT_HOST_URL` must always be an explicit, trusted HTTPS origin in any non-local environment — never left at its `https://localhost` fallback.
- Debezium and Kafka message payloads consumed by the stream service are handled generically: [`LogsEventListener`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-stream/src/main/java/com/openframe/stream/listener/LogsEventListener.java) delegates typed Debezium messages to a generic JSON message processor and logs processing failures at the consumer boundary rather than crashing the consumer thread. When extending stream processing, keep this fail-safe pattern: malformed or unexpected event payloads should be logged and skipped, not allowed to take down the consumer.

Because actual validation code lives upstream in `openframe-oss-lib`, if you need to confirm exactly what a validator does or does not reject, that repository — not this one — is the place to look.

## 5. Common security vulnerabilities and mitigations

| Area | Risk in this repository's context | Mitigation already in place / expected |
| --- | --- | --- |
| Hardcoded defaults in `configs/base/*.yml` | `ENCRYPTION_PASSWORD`, `ENCRYPTION_SALT`, the MongoDB URI, and `TENANT_HOST_URL` all ship with public fallback values | Override every one of these through environment variables or Kubernetes secrets in any shared/staging/production deployment; never deploy with repository defaults |
| Stale Spring Boot 3/4 autoconfiguration exclusions | Removing only one of the two listed class names per excluded autoconfiguration could silently re-enable default OAuth2 resource-server behavior on a service still running the other Spring Boot version | Keep both the Spring Boot 3 and Spring Boot 4 class names listed together until every service is confirmed migrated |
| Gateway/authorization-server issuer mismatch | If the authorization-server's configured base URL and the gateway's expected JWT issuer base diverge, JWT validation at the gateway can fail or, worse, validate against an unintended issuer | Keep `TENANT_HOST_URL`/authorization-server base and the gateway's issuer configuration in `configs/base/openframe-gateway.yml` in sync whenever either changes |
| Unreviewed component-scan changes | Adding or removing a `@ComponentScan` package root changes which controllers, security filters, and validators are loaded, with no compile-time signal | Treat scan-list changes as security-relevant and review them as carefully as a dependency bump |
| Outdated transitive cryptography libraries | Because Renovate only auto-updates `com.openframe.oss`, frontend-core, FleetMDM/MeshCentral charts, and `openframe-client` Rust deps, CVEs in `bcprov-lts8on`, `libthrift`, Tomcat, or other pinned libraries will not be caught by automation | Periodically re-check the `<properties>` block in `pom.xml` against current CVE advisories and bump pins manually |
| Public disclosure of a real vulnerability | Filing a public GitHub issue/PR/discussion for a security problem exposes it to all users before a fix ships | This organization does not use GitHub Issues/Discussions for anything (including security); report vulnerabilities privately as described in section 7 |
| Unsafe NATS JetStream stream additions | The management service's [`NoAdditionalStreamConfigurationProvider`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-management/src/main/java/com/openframe/management/initializer/NoAdditionalStreamConfigurationProvider.java) intentionally adds no optional stream definitions beyond what the upstream library already configures | Do not introduce ad hoc stream definitions in tenant code without understanding what the shared library already provisions |

## 6. Security testing and code review guidelines

### 6.1 Test infrastructure in this repository

- `spring-security-test` is declared as a test-scope dependency in the parent `pom.xml`, alongside `spring-boot-starter-test`, `mockito-core`, and `mockito-junit-jupiter`. Use it (together with fixtures like [`TestAuthenticationManager`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-api/src/test/java/com/openframe/api/util/TestAuthenticationManager.java)) to exercise both the "authenticated and authorized" and "rejected" paths for any new protected endpoint.
- The API service's test profile (`openframe/services/openframe-api/src/test/resources/application-test.yml`) disables MongoDB, Redis, Cassandra, and Kafka autoconfiguration and substitutes a test JWT secret:

```yaml
jwt:
  secret: test-secret-key
  expiration: 3600000
```

  This value is intentionally test-only. **Never reuse `test-secret-key` or any value that resembles it outside of the test profile** — it exists purely so unit/integration tests can construct and validate JWTs without reaching a real signing key or external identity provider.

- [`TestConfig`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-api/src/test/java/com/openframe/api/config/TestConfig.java), [`TestConstants`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-api/src/test/java/com/openframe/api/TestConstants.java), and [`TestUtils`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-api/src/test/java/com/openframe/api/TestUtils.java) provide the shared scaffolding for API-service tests; extend these rather than hand-rolling new security fixtures per test class, so authentication/authorization assumptions stay consistent across the test suite.
- [`openframe-test`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-test/src/main/java/com/openframe/test/TestApplication.java) and its [`SummaryLogger`](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/openframe/services/openframe-test/src/main/java/com/openframe/test/SummaryLogger.java) module exist to support cross-service test orchestration and depends on `com.openframe.oss:openframe-test-service-core`.

### 6.2 Dependency and image review

- Because this is a Maven multi-module repository rooted at `pom.xml`, any new module must be added to `<modules>` and should inherit, not duplicate, the shared security-relevant `<properties>` (Jackson, Tomcat, Bouncy Castle, etc.) so the manually-maintained CVE pins apply uniformly.
- Container images for every service are built and published by `.github/workflows/release.yml` to `ghcr.io/flamingo-stack/openframe-oss-tenant/<service>`. Review changes to that workflow carefully, since it is also where the `app-of-apps` Helm chart is published (`oci://ghcr.io/flamingo-stack/openframe-oss-tenant/app-of-apps`) — a compromised release workflow can affect every tenant service and the full deployment topology at once.
- For code review guidance beyond security specifically — branching, review expectations, and commit practices — see the [contributing guidelines](../contributing/guidelines.md). For how to run the test suite locally, see [testing](../testing/README.md).

### 6.3 Reporting a vulnerability found during review

If a security review (yours or an external researcher's) surfaces a real vulnerability in this repository, it must **not** be filed as a public GitHub issue, pull request description, or discussion, and must not be posted to the OpenMSP Slack community. Per the organization's [Security Policy](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/SECURITY.md), email **security@flamingo.run** with the affected component (`openframe-oss-tenant` and the specific service/path), a description of the issue and its impact, and reproduction steps. The policy commits to acknowledgement within 3 business days, an initial assessment within 10 business days, and progress updates at least every 30 days until resolution.

## 7. Environment variables and secrets management

### 7.1 Environment variables defined in this repository's configuration

The table below lists the environment-variable placeholders found in `configs/base/application.yml`, together with their committed fallback and why each matters:

| Variable | Default in `configs/base/application.yml` | Notes |
| --- | --- | --- |
| `ENCRYPTION_PASSWORD` | `kdCJxik7VWRlG5L8jKHBeJQK5unssi7u1uHOd01b75ilr8n` | Symmetric encryption key; override in every non-local deployment |
| `ENCRYPTION_SALT` | `74f62c51327175b05abe1ad78030565c` | Paired salt for the encryption key above; override alongside it |
| `REDIS_CLUSTER_NODES` | the three in-cluster `redis-cluster-*.redis-cluster-headless.datasources.svc.cluster.local:6379` addresses | Only needs overriding if Redis is deployed outside the default `datasources` namespace topology |
| `SPRING_CONFIG_URL` | `http://openframe-config.platform.svc.cluster.local:8888` (shared logging) / `http://openframe-config.microservices.svc.cluster.local:8888` (per-service `config.import`) | Points services at the config server for centrally managed configuration, including the shared logback configuration |
| `RELEASE_VERSION` | `v1` | Used to version the management endpoint base path (`/management/<release version>`) |
| `OPENFRAME_CLUSTER_ID` | `cluster-id` | Identifies the cluster instance; used by the shared delivery/presence engine |

Per-service application files additionally reference `SPRING_CONFIG_URL` with a different default host (`openframe-config.microservices.svc.cluster.local:8888` in `openframe-api/src/main/resources/application.yml`, `openframe-authorization-server/src/main/resources/application.yml`, and `openframe-client/src/main/resources/application.yml`) versus the shared `application.yml`'s `openframe-config.platform.svc.cluster.local:8888`. Both point at the same logical config server under different Kubernetes namespace conventions (`platform` versus `microservices`); confirm which namespace your deployment actually uses for `openframe-config` before assuming either default is correct, and set `SPRING_CONFIG_URL` explicitly if there is any ambiguity.

The authorization-server architecture additionally relies on `TENANT_HOST_URL`, which defaults to `https://localhost` and is used to construct SSO redirect URIs and password-reset links — this must be set to the real externally reachable HTTPS origin in any deployed environment.

### 7.2 Where secrets should live instead of the repository

None of the values above should be left at their repository defaults outside local development. The expected pattern for this repository's Kubernetes/Argo CD delivery model (see `manifests/apps/values.yaml` and the per-component `manifests/*/values.yaml` files) is to inject real values as Kubernetes Secrets or sealed/external secrets consumed by the relevant Helm chart's `values.yaml`, rather than editing the committed YAML defaults. When adding a new secret-shaped configuration key, follow the existing `${ENV_VAR:default}` Spring placeholder convention so the same chart can be deployed safely across environments by supplying different secret values, while still functioning for local development with its built-in default.

### 7.3 Renovate and supply-chain secrets

`renovate.json` configures `hostRules` for `maven.pkg.github.com` (GitHub Packages Maven registry) and a `registryAliases` entry for `github-packages`. Credentials for that registry are supplied to Renovate's own runner configuration, not committed in this file — do not add registry tokens or credentials directly to `renovate.json` or any tracked configuration file.

## Related topics

For the broader service architecture this security model sits inside of, see the [architecture overview](../architecture/README.md) and the generated [ecosystem reference](../../reference/architecture/ecosystem.md). For local environment setup, including which environment variables need to be supplied before running services, see [environment setup](../setup/environment.md) and [local development](../setup/local-development.md). Per-service detail on the authorization server, gateway, and API composition roots is in the [authorization server core](../../reference/architecture/authorization-server-core/authorization-server-core.md), [gateway service core](../../reference/architecture/gateway-service-core/gateway-service-core.md), and [API service core](../../reference/architecture/api-service-core/api-service-core.md) reference pages.
