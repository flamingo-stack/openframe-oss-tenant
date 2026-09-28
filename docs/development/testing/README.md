# Testing Overview

This guide covers the test structure, how to run tests, and guidelines for writing new tests in OpenFrame OSS Tenant.

---

## Test Structure and Organization

OpenFrame OSS Tenant uses several testing approaches across its different technology stacks.

### Java / Spring Boot Services

Tests are co-located with each service in the standard Maven structure:

```text
openframe/services/openframe-api/
└── src/
    ├── main/java/com/openframe/api/   # Production code
    └── test/java/com/openframe/api/   # Test code
        ├── *Test.java                 # Unit tests (Mockito)
        └── integration/               # Integration tests (IT suffix)
```

**Testing Frameworks Used:**
- `spring-boot-starter-test` (includes JUnit 5, AssertJ, Hamcrest)
- `spring-security-test` — For testing security-related functionality
- `mockito-core` + `mockito-junit-jupiter` — For mocking dependencies
- Testcontainers (via shared base integration test classes) for MongoDB integration tests

**Test Class Conventions:**
- Unit tests: `*Test.java` (e.g., `ScriptServiceTest.java`)
- Integration tests: `*IT.java` (e.g., `CommandResultListenerIT.java`)
- Base classes for reuse: `BaseMongoIntegrationTest`, `GraphQlIntegrationTestApplication`

### Rust Agent (openframe-client)

Rust tests are written using the built-in test framework (`#[test]` / `#[tokio::test]`):

```text
clients/openframe-client/src/
├── services/
│   └── mod.rs       # Unit tests inline with source using #[cfg(test)]
└── ...
```

---

## Running Tests

### Backend — All Tests

```bash
# Run all tests from the root
mvn test

# Run tests for a specific service
mvn test -pl openframe/services/openframe-api

# Run tests matching a pattern
mvn test -pl openframe/services/openframe-api -Dtest="ScriptServiceTest"

# Run integration tests only
mvn test -pl openframe/services/openframe-api -Dtest="*IT"

# Skip tests (useful for fast builds)
mvn install -DskipTests
```

### Backend — Specific Test Class

```bash
# Run a single test class
mvn test -pl openframe/services/openframe-api \
  -Dtest="com.openframe.api.service.rmm.ScriptServiceTest"

# Run a single test method
mvn test -pl openframe/services/openframe-api \
  -Dtest="ScriptServiceTest#shouldCreateScript"
```

### Rust Agent Tests

```bash
cd clients/openframe-client

# Run all tests
OPENFRAME_VERSION=0.0.0-dev cargo test

# Run tests with output (useful for debugging)
OPENFRAME_VERSION=0.0.0-dev cargo test -- --nocapture

# Run a specific test
OPENFRAME_VERSION=0.0.0-dev cargo test test_name

# Run tests matching a pattern
OPENFRAME_VERSION=0.0.0-dev cargo test service
```

---

## Test Infrastructure

### MongoDB Integration Tests

Many integration tests rely on an embedded MongoDB or Testcontainers MongoDB. The shared base class `BaseMongoIntegrationTest` provides the configured test application context:

```java
// Example: Extending the base integration test
@SpringBootTest(classes = IntegrationTestApplication.class)
class MyRepositoryIT extends BaseMongoIntegrationTest {

    @Autowired
    private MyRepository myRepository;

    @Test
    void shouldFindByTenantId() {
        // Test runs against real MongoDB (via Testcontainers)
    }
}
```

### Security Test Utilities

The `TestAuthenticationManager` provides convenience methods for creating authenticated test contexts:

```java
// Setting up a test with a specific tenant context
@WithMockUser(username = "test-user")
@Test
void shouldReturnTenantScopedResults() {
    // JWT principal is mocked; tenant context is available
}
```

### End-to-End Test Service

The `openframe-test` service (`openframe/services/openframe-test`) provides a full E2E test runner (`TestRunner`) with test suites for:

- Owner registration flows
- Device management
- Script execution
- Organization management
- Ticket operations
- User invitations

These tests run against a deployed OpenFrame instance (not locally), using `EnvironmentConfig` to point at the target environment.

---

## Writing New Tests

### Unit Test (Spring Boot / Mockito)

```java
@ExtendWith(MockitoExtension.class)
class ScriptServiceTest {

    @Mock
    private ScriptRepository scriptRepository;

    @InjectMocks
    private ScriptService scriptService;

    @Test
    void shouldCreateScript_givenValidInput() {
        // Arrange
        var input = CreateScriptInput.builder()
            .name("My Script")
            .content("echo hello")
            .build();
        when(scriptRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        // Act
        var result = scriptService.createScript(input, mockPrincipal());

        // Assert
        assertThat(result.getName()).isEqualTo("My Script");
        verify(scriptRepository).save(any(Script.class));
    }
}
```

### Integration Test (Spring Boot + MongoDB)

```java
@SpringBootTest(classes = IntegrationTestApplication.class)
class ScriptRepositoryIT extends BaseMongoIntegrationTest {

    @Autowired
    private ScriptRepository scriptRepository;

    @Test
    void shouldPersistAndRetrieveScript() {
        var script = Script.builder()
            .tenantId("test-tenant")
            .name("test-script")
            .build();

        scriptRepository.save(script);

        var found = scriptRepository.findByIdAndTenantId(script.getId(), "test-tenant");
        assertThat(found).isPresent();
    }
}
```

### GraphQL Integration Test (DGS)

```java
@SpringBootTest(classes = GraphQlIntegrationTestApplication.class)
class ScriptDataFetcherTest {

    @Autowired
    private DgsQueryExecutor dgsQueryExecutor;

    @Test
    void shouldReturnScripts() {
        var result = dgsQueryExecutor.executeAndExtractJsonPath(
            "{ scripts { edges { node { name } } } }",
            "$.data.scripts.edges[*].node.name"
        );
        assertThat(result).isNotEmpty();
    }
}
```

### Rust Unit Test

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn should_compare_versions_correctly() {
        let result = VersionComparator::is_newer("1.2.0", "1.1.0");
        assert!(result);
    }

    #[tokio::test]
    async fn should_parse_script_args() {
        let args = ScriptArgsTokenizer::tokenize("arg1 \"arg with spaces\" arg3");
        assert_eq!(args.len(), 3);
        assert_eq!(args[1], "arg with spaces");
    }
}
```

---

## Coverage Requirements

While no hard coverage thresholds are enforced in CI at this time, the following guidelines apply:

| Component | Target Coverage |
|---|---|
| Service layer (business logic) | High — unit test all service methods |
| Repository layer | Integration tests preferred over mocks |
| GraphQL data fetchers | Integration tests with DGS test framework |
| Controllers/REST endpoints | Integration tests using `MockMvc` or `WebTestClient` |
| Rust services | Unit + integration tests for all public functions |

### Checking Java Test Coverage

```bash
# Generate JaCoCo coverage report
mvn test jacoco:report -pl openframe/services/openframe-api

# View report at:
# openframe/services/openframe-api/target/site/jacoco/index.html
```

---

## Test Data and Fixtures

The `openframe-test-service-core` library provides reusable test data generators:

| Generator | Purpose |
|---|---|
| `AuthGenerator` | Creates test auth tokens and user contexts |
| `DeviceGenerator` | Creates test machine/device records |
| `ScriptGenerator` | Creates test script definitions |
| `OrganizationGenerator` | Creates test organization records |
| `TicketGenerator` | Creates test ticket records |

---

## Common Test Pitfalls

- **Tenant isolation in tests:** Always set the tenant context before making service calls that involve MongoDB. Use `TestAuthenticationManager` or mock the `AuthPrincipal`.
- **NATS in tests:** Integration tests that involve NATS messaging should mock the `NatsMessagePublisher` rather than connecting to a real NATS server unless an embedded NATS is available.
- **Kafka in tests:** Use `@EmbeddedKafka` from Spring Kafka Test for tests involving Kafka producers/consumers.
- **MongoDB TTL indexes:** Integration tests should not rely on TTL-based document expiry timing.
