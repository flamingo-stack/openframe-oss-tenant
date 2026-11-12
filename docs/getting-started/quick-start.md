
# Quick Start

This guide gets the OpenFrame OSS Tenant backend building and a service running locally in about five minutes, using the Maven build for the Java services and Cargo for the Rust agent. It assumes you already have Java 25, Maven, and Rust/Cargo installed.

> **Scope:** OpenFrame OSS Tenant publishes nine Spring Boot services (`openframe-api`, `openframe-authorization-server`, `openframe-client`, `openframe-config`, `openframe-external-api`, `openframe-gateway`, `openframe-management`, `openframe-stream`, `openframe-test`) and the `openframe-client` Rust agent crate. A full multi-tenant deployment also needs the datasources and platform charts under `manifests/` (MongoDB, Cassandra, Kafka, NATS, Pinot, Redis Cluster, ZooKeeper) — that full-stack setup belongs in local development docs, not this quick start. For the bigger picture of how these pieces fit together, see [Introduction](./introduction.md).

## TL;DR — 5-Minute Setup

### 1. Clone the repository

```bash
git clone https://github.com/flamingo-stack/openframe-oss-tenant.git
cd openframe-oss-tenant
```

### 2. Build the Java backend services

The root `pom.xml` is a Maven multi-module parent (`com.openframe:openframe-parent`) that aggregates all nine services as modules. Building from the root compiles every module in dependency order:

```bash
mvn clean install -DskipTests
```

This resolves the Spring Boot 4.1 BOM, Spring Cloud `2025.1.3`, and the pinned `com.openframe.oss:*` artifacts (version `7.0.11`) that come from the upstream [OpenFrame OSS Library](https://github.com/flamingo-stack/openframe-oss-lib) — the one upstream dependency this repository declares in its ecosystem graph.

> Each service's Dockerfile (for example `openframe/services/openframe-api/Dockerfile`) builds the same way inside a container, using `eclipse-temurin:25-jdk-alpine-3.23` and a scoped `mvn clean package -pl openframe/services/openframe-api -am` invocation — useful as a reference if `mvn install` behaves differently than the CI image.

### 3. Build the Rust agent (optional for a pure-backend quick start)

The `openframe-client` crate under `clients/openframe-client/` is a thin binary that delegates all logic to the `openframe-agent-lib` crate, pulled from `https://github.com/flamingo-stack/openframe-oss-lib` at tag `v0.0.5` (see `clients/openframe-client/Cargo.toml`). Its build script requires `OPENFRAME_VERSION` to be set:

```bash
cd clients/openframe-client
OPENFRAME_VERSION=0.0.0-dev cargo build --release
cd ../..
```

A `Makefile` is also provided at `clients/openframe-client/Makefile` with `make build`, `make test`, `make lint`, `make fmt`, and `make clippy` targets, all of which forward `OPENFRAME_VERSION` for you (defaulting to `0.0.0-dev` if unset).

### 4. Run a service

Each service reads its own `application.yml` (for example `openframe/services/openframe-api/src/main/resources/application.yml`), which sets `spring.application.name` and points at a Spring Cloud Config server via `spring.config.import`, defaulting to `http://openframe-config.microservices.svc.cluster.local:8888`. Shared cross-service defaults (MongoDB, Redis Cluster, Cassandra, Pinot connection endpoints) live in `configs/base/application.yml`. Without a reachable config server or datasources, a service will start with incomplete configuration — this quick start validates that the build and Spring context boot, not a fully wired platform.

```bash
mvn spring-boot:run -pl openframe/services/openframe-api
```

> For a complete, datasource-backed local environment (MongoDB, Kafka, NATS, Redis Cluster, Cassandra, Pinot, and config server wiring), see [Local Development](../development/setup/local-development.md) and [Environment Setup](../development/setup/environment.md).

## Basic "Hello World" Example

The simplest way to see the platform's bootstrap behavior is to start `openframe-api`, whose entry point logs a line as it boots.

`openframe/services/openframe-api/src/main/java/com/openframe/api/ApiApplication.java` is annotated `@SpringBootApplication` with an explicit `@ComponentScan` across `com.openframe.api`, `com.openframe.data`, `com.openframe.core`, `com.openframe.notification`, and `com.openframe.kafka`, and its `main()` logs `"Starting OpenFrame API"` via Lombok's `@Slf4j` before calling `SpringApplication.run(...)`:

```java
@SpringBootApplication
@ComponentScan(basePackages = {
        "com.openframe.api",
        "com.openframe.data",
        "com.openframe.core",
        "com.openframe.notification",
        "com.openframe.kafka"
})
@Slf4j
public class ApiApplication {

    public static void main(String[] args) {
        log.info("Starting OpenFrame API");
        SpringApplication.run(ApiApplication.class, args);
    }
}
```

Run it directly:

```bash
mvn spring-boot:run -pl openframe/services/openframe-api
```

Or run the packaged jar (built by `mvn clean install`), the same way `openframe/services/openframe-api/Dockerfile` does it in the container image:

```bash
java -jar openframe/services/openframe-api/target/openframe-api-*.jar
```

Every other service in this repository follows the same shape: a `@SpringBootApplication` class with a service-specific `@ComponentScan` list, found at:

- `openframe/services/openframe-authorization-server/src/main/java/com/openframe/authz/OpenFrameAuthorizationServerApplication.java` (also `@EnableDiscoveryClient`)
- `openframe/services/openframe-client/src/main/java/com/openframe/client/ClientApplication.java` (excludes `CassandraHealthIndicator`)
- `openframe/services/openframe-config/src/main/java/com/openframe/config/ConfigServerApplication.java`
- `openframe/services/openframe-external-api/src/main/java/com/openframe/external/ExternalApiApplication.java`
- `openframe/services/openframe-gateway/src/main/java/com/openframe/gateway/GatewayApplication.java`
- `openframe/services/openframe-management/src/main/java/com/openframe/management/ManagementApplication.java` (also excludes `CassandraHealthIndicator`)
- `openframe/services/openframe-stream/src/main/java/com/openframe/stream/StreamApplication.java` (`@EnableKafka`)

### Rust agent "hello world"

The Rust side is intentionally minimal. `clients/openframe-client/src/main.rs` is a thin wrapper:

```rust
fn main() -> anyhow::Result<()> {
    openframe::run()
}
```

All agent behavior — device registration, script execution, self-update — lives in the `openframe` crate from `openframe-oss-lib`; this repository only owns the binary entry point and its Cargo/build wiring. After building (`OPENFRAME_VERSION=0.0.0-dev cargo build --release`), you can inspect the binary:

```bash
./clients/openframe-client/target/release/openframe-client --help
```

## Expected Output

**Java service (`openframe-api`):** a successful `mvn spring-boot:run` prints the Spring Boot banner, the `"Starting OpenFrame API"` log line from `ApiApplication`, and then Spring context startup logs. If `spring.config.import` cannot reach a config server, you will see a config-import warning but the service continues (the import is marked `optional:`); if required datasources (MongoDB, Redis Cluster, Cassandra, Pinot, Kafka, NATS — see `configs/base/application.yml` and the per-service files under `configs/base/`) are unreachable, downstream beans that depend on them will fail to initialize. This is expected for a bare quick-start run outside the full manifest stack.

**Rust agent:** `cargo build --release` produces `clients/openframe-client/target/release/openframe-client`. Running `--help` prints the CLI usage without needing any backend connectivity, since argument parsing happens before any network call.

**Maven root build:** `mvn clean install -DskipTests` compiles all nine modules listed in the root `pom.xml` (`openframe-config`, `openframe-api`, `openframe-client`, `openframe-stream`, `openframe-management`, `openframe-gateway`, `openframe-external-api`, `openframe-authorization-server`, `openframe-test`) and installs their jars into your local `.m2` repository, confirming the module graph and dependency resolution succeed.

## Next Steps

Once the build is confirmed working, continue with:

- [Prerequisites](./prerequisites.md) — language toolchains, credentials, and infrastructure needed before deeper work.
- [First Steps](./first-steps.md) — a guided walk through the platform beyond the bare build.
- [Local Development](../development/setup/local-development.md) and [Environment Setup](../development/setup/environment.md) — wiring up the datasources (MongoDB, Cassandra, Kafka, NATS, Pinot, Redis Cluster) and config server so services boot with full functionality, not just a Spring context.
- [Architecture Overview](../reference/architecture/overview.md) and [Ecosystem](../reference/architecture/ecosystem.md) — how the gateway, API, authorization server, client service, stream service, and Rust agent fit together, and what each service publishes and depends on.
- [Architecture Diagrams](../diagrams/architecture/README.md) — visual references for the component relationships and the script-execution data flow.
- [Testing](../development/testing/README.md) and [Contributing Guidelines](../development/contributing/guidelines.md) — once you're ready to make changes.
- [Security](../development/security/README.md) — authentication, JWT, and encryption configuration used across services.

For the OpenFrame CLI tooling referenced by agent installation workflows, see the external [openframe-cli repository](https://github.com/flamingo-stack/openframe-cli) and its [installation instructions](https://github.com/flamingo-stack/openframe-cli#installation) — that CLI is maintained separately from this repository.

[![Getting Started with OpenFrame - Organization Setup Basics](https://img.youtube.com/vi/-_56_qYvMWk/maxresdefault.jpg)](https://www.youtube.com/watch?v=-_56_qYvMWk)

> This repository has no GitHub Issues or Discussions. For questions while getting started, join the [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) or visit [openmsp.ai](https://www.openmsp.ai/).
