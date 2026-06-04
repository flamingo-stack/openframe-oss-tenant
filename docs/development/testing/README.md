# Testing Overview

OpenFrame OSS Tenant includes a comprehensive testing infrastructure spanning unit tests, integration tests, and end-to-end UI tests. The project uses Spring Boot Test, JUnit 5, Mockito, and a dedicated `openframe-test` module for integration testing.

---

## Test Structure

```text
openframe-oss-tenant/
├── openframe/
│   └── services/
│       ├── openframe-api/
│       │   └── src/test/java/com/openframe/api/
│       │       ├── config/              # Test configuration
│       │       ├── util/                # Test utilities
│       │       └── TestConstants.java   # Shared test constants
│       ├── openframe-test/
│       │   └── src/main/java/com/openframe/test/
│       │       ├── tests/               # API integration tests
│       │       ├── tests/ui/            # UI integration tests
│       │       ├── api/                 # API client helpers
│       │       ├── pages/               # Page object models
│       │       ├── data/                # Test data generators
│       │       ├── config/              # Test environment config
│       │       └── runner/              # Test runner infrastructure
└── deps/openframe-oss-lib/
    ├── openframe-api-service-core/
    │   └── src/test/                    # Integration tests for API core
    └── openframe-data-mongo-sync/
        └── src/test/                    # MongoDB integration tests
```

---

## Test Categories

### Unit Tests

Unit tests cover individual components in isolation using Mockito for dependency mocking.

**Key Test Files:**
- `AgentRegistrationServiceTest` — Agent registration logic
- `AgentControllerTest` — Controller request handling
- `PinotQueryBuilderTest` — Query builder correctness
- `MachineTagEventAspectTest` — AOP aspect behavior
- `NotificationContextGraphQlTypeResolverTest` — GraphQL type resolution

### Integration Tests

Integration tests use embedded infrastructure (MongoDB, Redis) via Testcontainers.

**Key Integration Test Bases:**
- `BaseMongoIntegrationTest` — Sets up an embedded MongoDB for repository tests
- `GraphQlIntegrationTestApplication` — Full Spring context for GraphQL tests
- `ServiceIntegrationTestApplication` — Service-level integration testing

### End-to-End API Tests

The `openframe-test` service contains a full E2E test suite against running services:

**Test Coverage Areas:**
- `OwnerRegistrationTest` — Full tenant registration flow
- `UserInvitationsTest` — User invitation and acceptance
- `DevicesTest` — Device management APIs
- `TicketsTest` — Ticket creation, update, transition
- `OrganizationsTest` — Customer organization management
- `KnowledgeBaseTest` — Article and folder lifecycle
- `LogsTest` — Audit log querying
- `ScriptsTest` — Script CRUD and execution
- `AuthTokensTest` — Token issuance and validation

### UI Tests

The `openframe-test` module also includes Playwright-based UI tests:

**Page Object Models:**
- `AuthEntryPage` — Login/signup page
- `DashboardPage` — Main dashboard
- `DevicesPage` / `DeviceDetailsPage` — Device management
- `RemoteDesktopPage` / `RemoteShellPage` — Remote access
- `ScriptsPage` / `RunScriptPage` — Script management
- `MonitoringPage` — Fleet monitoring

---

## Running Tests

### Run All Tests

```bash
# Run all tests across all modules
mvn test

# Run tests with a specific profile
mvn test -Pintegration-tests
```

### Run Tests for a Specific Module

```bash
# API service tests
mvn test -pl openframe/services/openframe-api

# Test service integration tests
mvn test -pl openframe/services/openframe-test

# OSS library tests (in deps)
mvn test -pl openframe-oss-lib/openframe-api-service-core
```

### Run a Specific Test Class

```bash
mvn test -pl openframe/services/openframe-api \
  -Dtest=AgentRegistrationServiceTest

# Run a specific test method
mvn test -pl openframe/services/openframe-api \
  -Dtest=AgentRegistrationServiceTest#testRegisterAgent
```

### Skip Tests (for fast builds)

```bash
# Skip compilation of tests
mvn clean install -DskipTests

# Compile tests but skip execution
mvn clean install -Dmaven.test.skip=false -DskipTests=true
```

---

## Writing New Tests

### Unit Test Template

```java
@ExtendWith(MockitoExtension.class)
class MyServiceTest {

    @Mock
    private MyRepository repository;

    @InjectMocks
    private MyService service;

    @Test
    void whenValidInput_thenReturnsExpectedResult() {
        // Arrange
        when(repository.findByTenantId("tenant-1"))
            .thenReturn(Optional.of(new MyEntity()));

        // Act
        MyResult result = service.process("tenant-1");

        // Assert
        assertThat(result).isNotNull();
        verify(repository).findByTenantId("tenant-1");
    }
}
```

### MongoDB Integration Test Template

```java
@SpringBootTest(classes = ServiceIntegrationTestApplication.class)
class MyRepositoryIT extends BaseMongoIntegrationTest {

    @Autowired
    private MyRepository repository;

    @Test
    void whenSave_thenFindByTenantId() {
        // Given
        MyDocument doc = MyDocument.builder()
            .tenantId("test-tenant")
            .name("Test")
            .build();

        // When
        repository.save(doc);

        // Then
        List<MyDocument> results = repository.findAllByTenantId("test-tenant");
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getName()).isEqualTo("Test");
    }
}
```

### Spring Security Test Template

```java
@SpringBootTest
@AutoConfigureMockMvc
class MyControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @WithMockUser(roles = "ADMIN")
    void adminEndpoint_withAdminRole_returns200() throws Exception {
        mockMvc.perform(get("/api/v1/resource"))
            .andExpect(status().isOk());
    }

    @Test
    void adminEndpoint_withoutAuth_returns401() throws Exception {
        mockMvc.perform(get("/api/v1/resource"))
            .andExpect(status().isUnauthorized());
    }
}
```

### GraphQL Integration Test Template

```java
@SpringBootTest(classes = GraphQlIntegrationTestApplication.class)
class MyDataFetcherIT extends BaseMongoIntegrationTest {

    @Autowired
    private DgsQueryExecutor dgsQueryExecutor;

    @Test
    void queryDevices_returnsPagedResults() {
        // Arrange: seed test data

        // Act
        ExecutionResult result = dgsQueryExecutor.execute("""
            query {
                devices(first: 10) {
                    edges {
                        node {
                            id
                            name
                        }
                    }
                }
            }
            """);

        // Assert
        assertThat(result.getErrors()).isEmpty();
    }
}
```

---

## Test Configuration

### Test Environment Configuration

The `openframe-test-service-core` library provides test configuration:

```java
// EnvironmentConfig — reads from test environment variables
// MongoConfig — configures test MongoDB connection
// UserConfig — pre-configured test users (ADMIN, regular user)
```

Set test environment variables:

```bash
# For integration tests against running services
export TEST_API_URL=http://localhost:8080
export TEST_AUTH_URL=http://localhost:9000
export TEST_MONGODB_URI=mongodb://localhost:27017/openframe_test
```

### Auth Flow in Tests

The test framework supports two auth flows:
- `AuthFlowOSS` — For open-source/self-hosted deployments
- `AuthFlowSAAS` — For SaaS/cloud deployments

```java
// Test base class selects auth flow from environment
@Autowired
private IAuthFlow authFlow;

@BeforeEach
void authenticate() {
    AuthParts auth = authFlow.login(UserConfig.ADMIN_EMAIL, UserConfig.ADMIN_PASSWORD);
    // Use auth.accessToken() in subsequent requests
}
```

---

## Test Data Generators

The `openframe-test-service-core` provides generators for creating realistic test data:

```java
// Available generators
AuthGenerator.createRegistrationRequest()
OrganizationGenerator.createOrganizationRequest("Test Org")
DeviceGenerator.createDevice("tenant-id", "org-id")
TicketGenerator.createTicketInput("Test ticket", assigneeId)
KnowledgeBaseGenerator.createArticleInput("Article title")
ScriptGenerator.createScriptRequest("My Script", ShellType.POWERSHELL)
```

---

## Coverage Requirements

OpenFrame follows these testing principles:
- Unit tests for all service and repository classes
- Integration tests for critical data flows (registration, auth, device management)
- E2E tests for key user journeys (tenant registration, device onboarding, ticket lifecycle)

Run coverage reports:

```bash
# Generate JaCoCo coverage report
mvn test jacoco:report

# View report
open target/site/jacoco/index.html
```

---

## Continuous Integration

Tests run automatically on every push and pull request. The CI pipeline:

1. Builds all modules (`mvn clean install`)
2. Runs unit tests (`mvn test`)
3. Runs integration tests (with Testcontainers for MongoDB, Redis)
4. Generates coverage reports

> Results and failures are reported to the team via **OpenMSP Slack** using the `SlackListener` integration in the test framework.
