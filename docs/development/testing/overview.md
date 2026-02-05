# Testing Overview

This guide provides a comprehensive overview of OpenFrame's testing strategy, including test structure, running tests, writing new tests, and maintaining code quality standards.

## Testing Philosophy

OpenFrame follows a **multi-layered testing approach** that ensures reliability, maintainability, and confidence in deployments:

- **Unit Tests**: Fast, isolated tests for individual components
- **Integration Tests**: Test service interactions and database operations
- **E2E Tests**: End-to-end user workflow validation  
- **Contract Tests**: API contract validation between services
- **Performance Tests**: Load and performance validation

## Test Structure and Organization

### Backend Testing Structure

```text
openframe/services/openframe-api/
├── src/
│   ├── main/java/              # Production code
│   └── test/java/              # Test code
│       ├── unit/               # Unit tests
│       ├── integration/        # Integration tests
│       └── e2e/               # End-to-end tests
└── src/test/resources/         # Test configurations and data
    ├── application-test.yml    # Test application config
    ├── test-data/             # Test fixtures
    └── contracts/             # API contracts
```

### Frontend Testing Structure

```text
openframe/services/openframe-frontend/
├── src/
│   ├── app/                   # Application code
│   └── __tests__/             # Test files
│       ├── unit/              # Component unit tests
│       ├── integration/       # Integration tests
│       └── e2e/              # End-to-end tests
├── cypress/                   # Cypress E2E tests
│   ├── e2e/
│   ├── fixtures/
│   └── support/
└── jest.config.js            # Jest configuration
```

### Rust Client Testing

```text
clients/openframe-client/
├── src/
│   ├── lib.rs
│   └── **/*.rs               # Source files with inline tests
├── tests/                    # Integration tests
│   ├── integration_test.rs
│   └── fixtures/
└── Cargo.toml               # Test dependencies
```

## Running Tests

### Backend Tests (Java/Maven)

#### All Tests

```bash
# Run all tests across all modules
mvn test

# Run tests with coverage report
mvn test jacoco:report

# Run tests in parallel (faster)
mvn test -T 4
```

#### Specific Test Types

```bash
# Unit tests only
mvn test -Dtest="**/*UnitTest"

# Integration tests only  
mvn test -Dtest="**/*IntegrationTest"

# Specific test class
mvn test -Dtest="DeviceServiceTest"

# Specific test method
mvn test -Dtest="DeviceServiceTest#shouldCreateDevice"
```

#### Service-Specific Tests

```bash
# Test specific service
mvn test -pl openframe-api-service-core

# Test multiple services
mvn test -pl openframe-api-service-core,openframe-gateway-service-core
```

#### Test Profiles

```bash
# Integration tests with real database
mvn test -P integration-tests

# Performance tests
mvn test -P performance-tests

# All tests including slow ones
mvn test -P all-tests
```

### Frontend Tests (Next.js/Jest)

#### Unit and Integration Tests

```bash
cd openframe/services/openframe-frontend

# Run all tests
npm run test

# Watch mode (re-run on changes)
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test file
npm run test -- DeviceList.test.tsx

# Tests matching pattern
npm run test -- --testNamePattern="should render device list"
```

#### E2E Tests with Cypress

```bash
# Run Cypress interactively
npm run cypress:open

# Run Cypress headlessly
npm run cypress:run

# Run specific E2E test
npm run cypress:run -- --spec "cypress/e2e/device-management.cy.ts"
```

### Rust Client Tests

```bash
cd clients/openframe-client

# Run all tests
cargo test

# Run tests with output
cargo test -- --nocapture

# Run specific test
cargo test test_device_registration

# Run integration tests only
cargo test --test '*'

# Run with backtrace on failure
RUST_BACKTRACE=1 cargo test
```

### Cross-Service Integration Tests

```bash
# Run full integration test suite
cd openframe-e2e-tests
mvn test -P integration-tests

# Specific integration test scenario
mvn test -Dtest="DeviceManagementIntegrationTest"
```

## Test Categories and Examples

### Unit Tests

Unit tests validate individual components in isolation with mocked dependencies.

#### Java Unit Test Example

```java
@ExtendWith(MockitoExtension.class)
class DeviceServiceUnitTest {

    @Mock
    private DeviceRepository deviceRepository;
    
    @Mock 
    private OrganizationService organizationService;
    
    @InjectMocks
    private DeviceService deviceService;

    @Test
    void shouldCreateDevice() {
        // Given
        CreateDeviceRequest request = CreateDeviceRequest.builder()
            .name("Test Device")
            .deviceType(DeviceType.SERVER)
            .organizationId("org-123")
            .build();
            
        Organization organization = Organization.builder()
            .id("org-123")
            .name("Test Org")
            .build();
            
        Device savedDevice = Device.builder()
            .id("device-123") 
            .name("Test Device")
            .deviceType(DeviceType.SERVER)
            .status(DeviceStatus.ONLINE)
            .build();

        when(organizationService.findById("org-123")).thenReturn(organization);
        when(deviceRepository.save(any(Device.class))).thenReturn(savedDevice);

        // When
        Device result = deviceService.createDevice(request);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Test Device");
        assertThat(result.getDeviceType()).isEqualTo(DeviceType.SERVER);
        
        verify(deviceRepository).save(argThat(device -> 
            device.getName().equals("Test Device") &&
            device.getDeviceType() == DeviceType.SERVER
        ));
    }

    @Test
    void shouldThrowExceptionWhenOrganizationNotFound() {
        // Given
        CreateDeviceRequest request = CreateDeviceRequest.builder()
            .organizationId("nonexistent")
            .build();
            
        when(organizationService.findById("nonexistent"))
            .thenThrow(new OrganizationNotFoundException("Organization not found"));

        // When/Then
        assertThatThrownBy(() -> deviceService.createDevice(request))
            .isInstanceOf(OrganizationNotFoundException.class)
            .hasMessage("Organization not found");
            
        verify(deviceRepository, never()).save(any());
    }
}
```

#### React Component Unit Test Example

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeviceList } from '@/components/devices/DeviceList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockDevices = [
  {
    id: 'device-1',
    name: 'Web Server',
    deviceType: 'SERVER',
    status: 'ONLINE',
    lastSeen: new Date().toISOString(),
  },
  {
    id: 'device-2', 
    name: 'Database Server',
    deviceType: 'SERVER',
    status: 'OFFLINE',
    lastSeen: new Date(Date.now() - 3600000).toISOString(),
  }
];

// Mock the API hook
jest.mock('@/hooks/api/useDevices', () => ({
  useDevices: () => ({
    data: mockDevices,
    isLoading: false,
    error: null,
  }),
}));

describe('DeviceList', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const renderComponent = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <DeviceList {...props} />
      </QueryClientProvider>
    );
  };

  it('should render device list', () => {
    renderComponent();

    expect(screen.getByText('Web Server')).toBeInTheDocument();
    expect(screen.getByText('Database Server')).toBeInTheDocument();
  });

  it('should show online status badge', () => {
    renderComponent();

    const onlineStatus = screen.getByText('ONLINE');
    expect(onlineStatus).toHaveClass('status-online');
  });

  it('should filter devices by status', async () => {
    renderComponent();

    const statusFilter = screen.getByLabelText('Status Filter');
    fireEvent.change(statusFilter, { target: { value: 'ONLINE' } });

    await waitFor(() => {
      expect(screen.getByText('Web Server')).toBeInTheDocument();
      expect(screen.queryByText('Database Server')).not.toBeInTheDocument();
    });
  });

  it('should handle device click', () => {
    const onDeviceClick = jest.fn();
    renderComponent({ onDeviceClick });

    fireEvent.click(screen.getByText('Web Server'));

    expect(onDeviceClick).toHaveBeenCalledWith('device-1');
  });
});
```

### Integration Tests

Integration tests validate interactions between components, including database operations and external service calls.

#### Spring Boot Integration Test Example

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("integration-test")
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class DeviceControllerIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;
    
    @Autowired
    private DeviceRepository deviceRepository;
    
    @Autowired  
    private OrganizationRepository organizationRepository;
    
    @BeforeEach
    void setUp() {
        deviceRepository.deleteAll();
        organizationRepository.deleteAll();
        
        // Create test organization
        Organization organization = Organization.builder()
            .id("test-org")
            .name("Test Organization")
            .build();
        organizationRepository.save(organization);
    }

    @Test
    void shouldCreateDeviceViaAPI() {
        // Given
        CreateDeviceRequest request = CreateDeviceRequest.builder()
            .name("Integration Test Device")
            .deviceType(DeviceType.WORKSTATION)
            .organizationId("test-org")
            .build();

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(getTestJwtToken());
        
        HttpEntity<CreateDeviceRequest> entity = new HttpEntity<>(request, headers);

        // When
        ResponseEntity<DeviceResponse> response = restTemplate.postForEntity(
            "/api/v1/devices", 
            entity, 
            DeviceResponse.class
        );

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getName()).isEqualTo("Integration Test Device");

        // Verify database state
        List<Device> devices = deviceRepository.findAll();
        assertThat(devices).hasSize(1);
        assertThat(devices.get(0).getName()).isEqualTo("Integration Test Device");
    }

    @Test 
    void shouldReturnDevicesWithPagination() {
        // Given - create test devices
        createTestDevices(15);

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(getTestJwtToken());
        
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        // When
        ResponseEntity<PagedResponse<DeviceResponse>> response = restTemplate.exchange(
            "/api/v1/devices?page=0&size=10",
            HttpMethod.GET,
            entity,
            new ParameterizedTypeReference<PagedResponse<DeviceResponse>>() {}
        );

        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getContent()).hasSize(10);
        assertThat(response.getBody().getTotalElements()).isEqualTo(15);
        assertThat(response.getBody().getTotalPages()).isEqualTo(2);
    }
    
    private void createTestDevices(int count) {
        for (int i = 0; i < count; i++) {
            Device device = Device.builder()
                .name("Test Device " + i)
                .deviceType(DeviceType.SERVER)
                .organizationId("test-org")
                .build();
            deviceRepository.save(device);
        }
    }
    
    private String getTestJwtToken() {
        // Generate test JWT token for authentication
        return "test.jwt.token";
    }
}
```

#### GraphQL Integration Test Example

```java
@SpringBootTest
@AutoConfigureTestDatabase
@TestPropertySource(properties = "spring.jpa.hibernate.ddl-auto=create-drop")
class DeviceGraphQLIntegrationTest {

    @Autowired
    private WebTestClient webTestClient;

    @Test
    void shouldQueryDevicesWithGraphQL() {
        // Given
        String query = """
            query GetDevices($first: Int, $filter: DeviceFilterInput) {
              devices(first: $first, filter: $filter) {
                edges {
                  node {
                    id
                    name
                    deviceType
                    status
                    organization {
                      name
                    }
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
                totalCount
              }
            }
            """;

        Map<String, Object> variables = Map.of(
            "first", 10,
            "filter", Map.of("status", "ONLINE")
        );

        // When/Then
        webTestClient
            .post()
            .uri("/graphql")
            .header("Authorization", "Bearer " + getTestJwtToken())
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(Map.of(
                "query", query,
                "variables", variables
            ))
            .exchange()
            .expectStatus().isOk()
            .expectBody()
            .jsonPath("$.data.devices.edges").isArray()
            .jsonPath("$.data.devices.totalCount").isNumber()
            .jsonPath("$.errors").doesNotExist();
    }
}
```

### End-to-End Tests

E2E tests validate complete user workflows across the entire application.

#### Cypress E2E Test Example

```typescript
// cypress/e2e/device-management.cy.ts
describe('Device Management', () => {
  beforeEach(() => {
    // Login as test user
    cy.login('test@example.com', 'password');
    cy.visit('/devices');
  });

  it('should display device list', () => {
    cy.get('[data-testid="device-list"]').should('be.visible');
    cy.get('[data-testid="device-item"]').should('have.length.at.least', 1);
  });

  it('should create new device', () => {
    // Click create device button
    cy.get('[data-testid="create-device-btn"]').click();

    // Fill device form
    cy.get('[data-testid="device-name-input"]').type('Test Device');
    cy.get('[data-testid="device-type-select"]').select('SERVER');
    cy.get('[data-testid="organization-select"]').select('Test Organization');

    // Submit form
    cy.get('[data-testid="submit-device-btn"]').click();

    // Verify device was created
    cy.get('[data-testid="success-message"]').should('contain', 'Device created successfully');
    cy.get('[data-testid="device-list"]').should('contain', 'Test Device');
  });

  it('should filter devices by status', () => {
    // Apply status filter
    cy.get('[data-testid="status-filter"]').select('ONLINE');

    // Verify filtered results
    cy.get('[data-testid="device-item"]').each(($item) => {
      cy.wrap($item).should('contain', 'ONLINE');
    });
  });

  it('should navigate to device details', () => {
    // Click on first device
    cy.get('[data-testid="device-item"]').first().click();

    // Verify navigation to details page
    cy.url().should('include', '/devices/');
    cy.get('[data-testid="device-details"]').should('be.visible');
  });

  it('should handle device actions', () => {
    // Open device actions menu
    cy.get('[data-testid="device-item"]').first().within(() => {
      cy.get('[data-testid="actions-menu"]').click();
    });

    // Restart device
    cy.get('[data-testid="restart-device-action"]').click();

    // Confirm action
    cy.get('[data-testid="confirm-restart-btn"]').click();

    // Verify action success
    cy.get('[data-testid="success-message"]').should('contain', 'Device restart initiated');
  });
});
```

#### Java E2E Test with TestContainers

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class DeviceManagementE2ETest {

    @Container
    static MongoDBContainer mongoDBContainer = new MongoDBContainer("mongo:7.0")
            .withExposedPorts(27017);
            
    @Container  
    static KafkaContainer kafkaContainer = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.4.0"));

    @DynamicPropertySource
    static void setProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", mongoDBContainer::getReplicaSetUrl);
        registry.add("spring.kafka.bootstrap-servers", kafkaContainer::getBootstrapServers);
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Test
    void shouldCompleteDeviceRegistrationWorkflow() {
        // 1. Register organization
        OrganizationResponse org = createOrganization("Test MSP");

        // 2. Create agent registration secret
        AgentRegistrationResponse secret = createAgentSecret(org.getId());

        // 3. Simulate agent registration
        AgentRegistrationRequest agentRequest = AgentRegistrationRequest.builder()
            .secret(secret.getSecret())
            .deviceName("E2E Test Device")
            .deviceType(DeviceType.WORKSTATION)
            .build();

        ResponseEntity<DeviceResponse> deviceResponse = restTemplate.postForEntity(
            "/api/v1/agents/register",
            agentRequest,
            DeviceResponse.class
        );

        assertThat(deviceResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        // 4. Verify device appears in device list
        ResponseEntity<PagedResponse<DeviceResponse>> devicesResponse = restTemplate.exchange(
            "/api/v1/devices",
            HttpMethod.GET,
            createAuthenticatedEntity(),
            new ParameterizedTypeReference<PagedResponse<DeviceResponse>>() {}
        );

        assertThat(devicesResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(devicesResponse.getBody().getContent())
            .extracting(DeviceResponse::getName)
            .contains("E2E Test Device");

        // 5. Simulate heartbeat and verify device status
        sendHeartbeat(deviceResponse.getBody().getId());

        // Wait for async processing
        await().atMost(10, TimeUnit.SECONDS).untilAsserted(() -> {
            DeviceResponse device = getDevice(deviceResponse.getBody().getId());
            assertThat(device.getStatus()).isEqualTo(DeviceStatus.ONLINE);
        });
    }
}
```

### Contract Tests

Contract tests ensure API compatibility between services.

```java
@ExtendWith(PactVerificationSpringBootTest.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@PactVerification(provider = "device-service", consumer = "frontend-app")
class DeviceServiceContractTest {

    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void pactVerificationTestTemplate(PactVerificationContext context) {
        context.verifyInteraction();
    }

    @BeforeEach
    void setupTestTarget(PactVerificationContext context) {
        context.setTarget(new HttpTestTarget("localhost", 8081));
    }

    @State("devices exist")
    void devicesExist() {
        // Setup test data for contract verification
        createTestDevices(5);
    }

    @State("no devices exist")  
    void noDevicesExist() {
        // Clean up test data
        deviceRepository.deleteAll();
    }
}
```

## Writing New Tests

### Test Naming Conventions

Use descriptive test names that follow the pattern: `should[ExpectedBehavior]When[Condition]`

```java
// Good test names
@Test
void shouldReturnDeviceWhenIdExists() { }

@Test
void shouldThrowExceptionWhenDeviceNotFound() { }

@Test
void shouldFilterDevicesByStatusWhenFilterProvided() { }

// Avoid generic names
@Test
void testGetDevice() { } // Too generic

@Test
void deviceTest() { } // Meaningless
```

### Test Data Builders

Use the builder pattern for creating test data:

```java
public class DeviceTestDataBuilder {
    private String id = "test-device-id";
    private String name = "Test Device";
    private DeviceType deviceType = DeviceType.WORKSTATION;
    private DeviceStatus status = DeviceStatus.ONLINE;
    private String organizationId = "test-org";

    public static DeviceTestDataBuilder aDevice() {
        return new DeviceTestDataBuilder();
    }

    public DeviceTestDataBuilder withId(String id) {
        this.id = id;
        return this;
    }

    public DeviceTestDataBuilder withName(String name) {
        this.name = name;
        return this;
    }

    public DeviceTestDataBuilder offline() {
        this.status = DeviceStatus.OFFLINE;
        return this;
    }

    public Device build() {
        return Device.builder()
            .id(id)
            .name(name)
            .deviceType(deviceType)
            .status(status)
            .organizationId(organizationId)
            .build();
    }
}

// Usage in tests
@Test
void shouldUpdateDeviceStatus() {
    Device device = aDevice()
        .withName("Test Server")
        .offline()
        .build();
    
    // Test implementation
}
```

### Test Configuration

#### Test Application Configuration

```yaml
# src/test/resources/application-test.yml
spring:
  datasource:
    url: jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true
  kafka:
    bootstrap-servers: ${spring.embedded.kafka.brokers}
  data:
    mongodb:
      uri: ${spring.embedded.mongodb.uri}

logging:
  level:
    com.openframe: DEBUG
    org.springframework.web: DEBUG

openframe:
  jwt:
    secret: test-secret-key-for-testing-only
  encryption:
    key: test-encryption-key-123456789012
```

#### Test Profiles

```java
// Development tests - fast, use mocks
@ActiveProfiles("test")
class DeviceServiceUnitTest { }

// Integration tests - real databases  
@ActiveProfiles("integration-test")
class DeviceServiceIntegrationTest { }

// E2E tests - full stack
@ActiveProfiles("e2e-test")
class DeviceManagementE2ETest { }
```

## Code Quality and Coverage

### Code Coverage Requirements

OpenFrame maintains the following coverage targets:

| Test Type | Minimum Coverage | Target Coverage |
|-----------|-----------------|-----------------|
| **Unit Tests** | 80% | 90% |
| **Integration Tests** | 60% | 75% |
| **Overall Coverage** | 75% | 85% |

### Coverage Reports

```bash
# Generate coverage report
mvn test jacoco:report

# View coverage report
open target/site/jacoco/index.html

# Coverage with SonarQube
mvn sonar:sonar -Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml
```

### Quality Gates

Automated quality checks run on every pull request:

```yaml
# .github/workflows/test.yml
name: Test and Quality
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Tests
        run: mvn test
        
      - name: Check Coverage
        run: |
          mvn jacoco:report jacoco:check
          
      - name: Run SonarQube
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        run: mvn sonar:sonar
```

### Code Quality Standards

#### Checkstyle Configuration

OpenFrame uses Google Java Style Guide:

```xml
<!-- checkstyle.xml -->
<module name="Checker">
    <module name="TreeWalker">
        <module name="google-checks"/>
        <module name="SuppressionCommentFilter"/>
    </module>
</module>
```

#### PMD Rules

```xml
<!-- pmd.xml -->
<ruleset>
    <rule ref="category/java/bestpractices.xml"/>
    <rule ref="category/java/codestyle.xml"/>  
    <rule ref="category/java/design.xml"/>
    <rule ref="category/java/errorprone.xml"/>
    <rule ref="category/java/performance.xml"/>
</ruleset>
```

## Continuous Testing

### Pre-commit Hooks

```bash
# Install pre-commit hooks
pip install pre-commit
pre-commit install

# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: test-java
        name: Java Tests
        entry: mvn test -q
        language: system
        pass_filenames: false
        
      - id: test-frontend
        name: Frontend Tests  
        entry: npm test
        language: system
        files: ^openframe/services/openframe-frontend/
```

### CI/CD Pipeline Integration

```bash
# Pipeline stages
1. Build → 2. Unit Tests → 3. Integration Tests → 4. E2E Tests → 5. Deploy

# Parallel test execution
mvn test -T 4  # 4 parallel threads
```

## Performance Testing

### Load Testing with JMeter

```xml
<!-- device-load-test.jmx -->
<TestPlan>
  <ThreadGroup>
    <stringProp name="ThreadGroup.num_threads">100</stringProp>
    <stringProp name="ThreadGroup.ramp_time">30</stringProp>
    <stringProp name="ThreadGroup.duration">300</stringProp>
  </ThreadGroup>
  
  <HTTPSamplerProxy>
    <stringProp name="HTTPSampler.path">/api/v1/devices</stringProp>
    <stringProp name="HTTPSampler.method">GET</stringProp>
  </HTTPSamplerProxy>
</TestPlan>
```

### Database Performance Tests

```java
@Test
@Timeout(value = 5, unit = TimeUnit.SECONDS)
void shouldQueryDevicesWithinTimeLimit() {
    // Create large dataset
    createTestDevices(10000);
    
    // Measure query performance
    StopWatch stopWatch = new StopWatch();
    stopWatch.start();
    
    Page<Device> devices = deviceService.findDevices(PageRequest.of(0, 100));
    
    stopWatch.stop();
    
    assertThat(devices.getContent()).hasSize(100);
    assertThat(stopWatch.getTotalTimeMillis()).isLessThan(1000); // < 1 second
}
```

## Next Steps

To get started with testing in OpenFrame:

1. **Set up your testing environment** following the [development setup guide](../setup/environment.md)
2. **Run existing tests** to verify your environment
3. **Write your first test** using the examples and patterns shown above
4. **Contribute to test coverage** by adding tests for untested code
5. **Review the [contributing guidelines](../contributing/guidelines.md)** for testing standards

## Testing Resources

- **JUnit 5 Documentation**: https://junit.org/junit5/docs/current/user-guide/
- **Mockito Documentation**: https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html
- **Spring Boot Testing**: https://spring.io/guides/gs/testing-web/
- **React Testing Library**: https://testing-library.com/docs/react-testing-library/intro/
- **Cypress Documentation**: https://docs.cypress.io/

---

**Testing Questions?** Join the [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA) `#testing` channel to discuss testing strategies and get help with test implementation.