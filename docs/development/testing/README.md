# Testing Overview

This document covers the test structure, how to run tests, and guidelines for writing new tests in the OpenFrame OSS Tenant platform.

---

## Test Structure & Organization

The repository uses a layered testing approach across the Maven multi-module project:

```text
openframe-oss-tenant/
├── openframe/services/
│   ├── openframe-api/
│   │   └── src/test/java/com/openframe/api/
│   │       ├── config/TestConfig.java
│   │       ├── TestConstants.java
│   │       └── util/TestAuthenticationManager.java
│   └── openframe-test/
│       └── src/main/java/com/openframe/test/
│           ├── tests/          # Integration test suites
│           ├── api/            # REST API client helpers
│           ├── pages/          # UI page objects (Playwright)
│           └── data/           # Test data generators
└── openframe-oss-lib/ (deps)
    ├── openframe-api-service-core/src/test/
    ├── openframe-data-mongo-sync/src/test/
    └── openframe-data-nats/src/test/
```

### Test Categories

| Category | Framework | Location | Purpose |
|----------|-----------|----------|---------|
| **Unit Tests** | JUnit 5 + Mockito | `src/test/java` (each module) | Test individual classes in isolation |
| **Integration Tests** | Spring Boot Test + Testcontainers | `openframe-test` module | Full API flow tests against real infrastructure |
| **MongoDB Integration** | Flapdoodle Embedded Mongo | `src/test/java` (data modules) | Repository and MongoDB query tests |
| **UI Tests** | Playwright (via Java) | `openframe-test/tests/ui` | End-to-end browser flows |

---

## Integration Test Framework (`openframe-test`)

The `openframe-test` module is a standalone integration test runner with its own Spring Boot application context:

### Key Components

| Class | Purpose |
|-------|---------|
| `TestRunner` | Main test execution orchestrator |
| `EnvironmentConfig` | Test environment URL and credentials configuration |
| `AuthFlow` / `AuthFlowOSS` | Authentication helpers for OSS deployments |
| `TestAuthenticationManager` | Mock authentication for unit tests |

### Test Suites Available

| Test Class | Covers |
|-----------|--------|
| `OwnerRegistrationTest` | Tenant registration flow |
| `UserInvitationsTest` | User invite and accept flow |
| `OrganizationsTest` | Organization CRUD operations |
| `DevicesTest` | Device listing and filtering |
| `TicketsTest` | Ticket creation and management |
| `KnowledgeBaseTest` | KB article CRUD |
| `LogsTest` | Log querying |
| `ScriptsTest` | Script execution |
| `AuthTokensTest` | JWT token lifecycle |
| `ResetPasswordTest` | Password reset flow |

### UI Test Suites

| Test Class | Covers |
|-----------|--------|
| `DeviceRemoteTest` | Remote desktop/shell via browser |
| `DeviceTagTest` | Tag assignment UI |
| `MonitoringTest` | Monitoring policy UI |

---

## Running Tests

### Unit Tests (Single Module)

```bash
# Run unit tests for a specific service
mvn test -pl openframe/services/openframe-api

# Run unit tests for the API library
mvn test -pl openframe-oss-lib/openframe-api-service-core
```

### All Unit Tests

```bash
# Run all unit tests across all modules
mvn test
```

### Integration Tests (`openframe-test`)

The integration tests require a running OpenFrame stack. Configure the target environment:

```bash
# Set environment variables for integration tests
export TEST_BASE_URL=http://localhost:8080
export TEST_ADMIN_EMAIL=admin@test.com
export TEST_ADMIN_PASSWORD=your-test-password

# Run integration tests
mvn test -pl openframe/services/openframe-test
```

### MongoDB Integration Tests

MongoDB-specific tests use Flapdoodle Embedded MongoDB for in-process testing:

```bash
# Run data layer integration tests
mvn test -pl openframe-oss-lib/openframe-data-mongo-sync
```

### NATS Integration Tests

```bash
mvn test -pl openframe-oss-lib/openframe-data-nats
```

---

## Writing New Tests

### Unit Test Guidelines

Use JUnit 5 with Mockito for unit tests. Tests should be fast (no network, no database):

```java
@ExtendWith(MockitoExtension.class)
class DeviceServiceTest {

    @Mock
    private MachineRepository machineRepository;

    @InjectMocks
    private DeviceServiceImpl deviceService;

    @Test
    void shouldReturnDevice_whenFound() {
        // Given
        var machine = new Machine();
        machine.setId("machine-123");
        when(machineRepository.findById("machine-123"))
            .thenReturn(Optional.of(machine));

        // When
        var result = deviceService.findById("machine-123");

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getId()).isEqualTo("machine-123");
    }
}
```

### Spring Boot Integration Tests

For tests requiring the Spring context:

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class ApiKeyControllerTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void shouldReturn401_whenNoApiKey() {
        var response = restTemplate.getForEntity(
            "/external-api/v1/devices",
            String.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
```

### MongoDB Repository Tests

Base class for MongoDB integration tests:

```java
@SpringBootTest
@ActiveProfiles("test")
class DeviceRepositoryTest extends BaseMongoIntegrationTest {

    @Autowired
    private MachineRepository machineRepository;

    @Test
    void shouldFindMachinesByTenantId() {
        // Use test fixtures from the shared NotificationFixtures pattern
        var machine = createTestMachine("tenant-1");
        machineRepository.save(machine);

        var results = machineRepository.findByTenantId("tenant-1");
        assertThat(results).isNotEmpty();
    }
}
```

### Test Naming Conventions

Follow the `should_ExpectedBehavior_when_StateUnderTest` pattern:

```text
shouldReturnEmpty_whenNoDevicesFound()
shouldThrow_whenInvalidApiKey()
shouldCreate_whenValidRequest()
shouldEnrich_whenTenantResolved()
```

---

## Test Configuration

### `TestConfig.java`

The `openframe-api` module provides a `TestConfig` for configuring test beans:

```java
@TestConfiguration
public class TestConfig {
    @Bean
    public TestAuthenticationManager testAuthenticationManager() {
        return new TestAuthenticationManager();
    }
}
```

### Test Data Generators

The `openframe-test` module provides generator classes for creating test entities:

| Generator | Creates |
|-----------|--------|
| `AuthGenerator` | Test authentication tokens |
| `DeviceGenerator` | Test machine/device objects |
| `OrganizationGenerator` | Test organizations |
| `TicketGenerator` | Test tickets |
| `UserGenerator` | Test users |

Usage:

```java
@Autowired
private DeviceGenerator deviceGenerator;

// In your test
var device = deviceGenerator.createDevice("test-org");
```

---

## Coverage Requirements

The platform targets the following coverage levels:

| Tier | Target Coverage | Type |
|------|----------------|------|
| Service layer | 80%+ | Unit tests |
| Repository layer | 70%+ | Integration tests |
| Controller layer | 60%+ | Integration tests |
| Stream handlers | 75%+ | Unit tests |

### Running Coverage Reports

```bash
# Generate JaCoCo coverage report
mvn test jacoco:report

# View coverage report
open target/site/jacoco/index.html
```

---

## CI/CD Testing

Tests are organized to support progressive CI execution:

1. **Fast unit tests** — run on every commit (< 2 min)
2. **Service integration tests** — run on PR merge (< 10 min)
3. **Full integration suite** — run on release branches (< 30 min)
4. **UI tests** — run on staging environment before production deploy

---

## Notification Integration Tests

The platform includes extensive notification system integration tests:

```bash
# Run notification-specific integration tests
mvn test -pl openframe-oss-lib/openframe-data-mongo-sync \
  -Dtest="NotificationContextDispatchIT,CustomNotificationRepositoryPaginationIT"
```

Performance tests are also available for the notification system:

```bash
mvn test -Dtest="NotificationLoadTestIT" \
  -pl openframe-oss-lib/openframe-data-mongo-sync
```
