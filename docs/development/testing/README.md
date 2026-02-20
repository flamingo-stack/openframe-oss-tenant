# Testing Overview

Comprehensive testing is essential for maintaining the quality and reliability of OpenFrame's multi-tenant MSP platform. This guide covers testing strategies, frameworks, patterns, and execution for all layers of the system.

## Testing Philosophy

OpenFrame follows a test-driven development (TDD) approach with comprehensive coverage across all system layers:

```mermaid
flowchart TD
    subgraph "Testing Pyramid"
        UI[UI/E2E Tests]
        Integration[Integration Tests]
        Unit[Unit Tests]
    end
    
    Unit --> Integration
    Integration --> UI
    
    subgraph "Test Types"
        Functional[Functional Tests]
        Performance[Performance Tests]
        Security[Security Tests]
        Contract[Contract Tests]
    end
    
    subgraph "Test Scope"
        Component[Component Tests]
        Service[Service Tests]
        System[System Tests]
    end
    
    style Unit fill:#e8f5e8
    style Integration fill:#fff3e0
    style UI fill:#ffebee
```

## Testing Strategy

### Test Structure and Organization

OpenFrame organizes tests following Maven's standard directory structure with additional categorization:

```text
src/
├── test/java/
│   ├── unit/                    # Fast, isolated unit tests
│   ├── integration/             # Integration tests with external dependencies
│   ├── contract/               # Consumer-driven contract tests
│   └── performance/            # Performance and load tests
└── test/resources/
    ├── application-test.yml    # Test configuration
    ├── test-data/             # Test fixtures and sample data
    └── containers/            # Docker compose for integration tests
```

### Testing Framework Stack

| Layer | Framework | Purpose |
|-------|-----------|---------|
| **Unit Tests** | JUnit 5, Mockito | Fast, isolated component testing |
| **Integration Tests** | Spring Boot Test, Testcontainers | Real dependency integration |
| **Contract Tests** | Pact | API contract verification |
| **E2E Tests** | Selenium WebDriver, REST Assured | Full system testing |
| **Performance Tests** | JMeter, Gatling | Load and stress testing |
| **Security Tests** | OWASP ZAP, Spring Security Test | Vulnerability testing |

## Unit Testing

### Unit Test Structure

OpenFrame unit tests follow the Arrange-Act-Assert (AAA) pattern:

```java
@ExtendWith(MockitoExtension.class)
class OrganizationServiceTest {
    
    @Mock
    private OrganizationRepository organizationRepository;
    
    @Mock
    private UserService userService;
    
    @Mock
    private EventPublisher eventPublisher;
    
    @InjectMocks
    private OrganizationService organizationService;
    
    @Test
    @DisplayName("Should create organization with valid data")
    void shouldCreateOrganization_WithValidData() {
        // Arrange
        CreateOrganizationRequest request = CreateOrganizationRequest.builder()
            .name("Acme Corp")
            .domain("acme-corp")
            .adminEmail("admin@acme.com")
            .build();
        
        Organization savedOrganization = Organization.builder()
            .id("org-123")
            .name("Acme Corp")
            .domain("acme-corp")
            .status(OrganizationStatus.ACTIVE)
            .build();
        
        when(organizationRepository.save(any(Organization.class)))
            .thenReturn(savedOrganization);
        when(userService.createAdminUser(any(), any()))
            .thenReturn(createMockUser());
        
        // Act
        Organization result = organizationService.createOrganization(request);
        
        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Acme Corp");
        assertThat(result.getDomain()).isEqualTo("acme-corp");
        assertThat(result.getStatus()).isEqualTo(OrganizationStatus.ACTIVE);
        
        verify(organizationRepository).save(argThat(org -> 
            org.getName().equals("Acme Corp") && 
            org.getDomain().equals("acme-corp")));
        verify(eventPublisher).publishEvent(any(OrganizationCreatedEvent.class));
    }
    
    @Test
    @DisplayName("Should throw exception when domain already exists")
    void shouldThrowException_WhenDomainAlreadyExists() {
        // Arrange
        CreateOrganizationRequest request = CreateOrganizationRequest.builder()
            .name("Duplicate Corp")
            .domain("existing-domain")
            .adminEmail("admin@duplicate.com")
            .build();
        
        when(organizationRepository.existsByDomain("existing-domain"))
            .thenReturn(true);
        
        // Act & Assert
        assertThrows(DuplicateDomainException.class, () ->
            organizationService.createOrganization(request));
        
        verify(organizationRepository, never()).save(any());
        verify(eventPublisher, never()).publishEvent(any());
    }
    
    private User createMockUser() {
        return User.builder()
            .id("user-123")
            .email("admin@acme.com")
            .status(UserStatus.ACTIVE)
            .build();
    }
}
```

### Parameterized Tests

For testing multiple scenarios:

```java
class ValidationServiceTest {
    
    @ParameterizedTest
    @DisplayName("Should validate organization names correctly")
    @ValueSource(strings = {
        "Acme Corporation",
        "IT Solutions LLC", 
        "Tech-Innovators Inc",
        "Global_Services_Ltd"
    })
    void shouldAcceptValidOrganizationNames(String validName) {
        // Act & Assert
        assertDoesNotThrow(() -> validationService.validateOrganizationName(validName));
    }
    
    @ParameterizedTest
    @DisplayName("Should reject invalid organization names")
    @CsvSource({
        "'', 'Name cannot be empty'",
        "'A', 'Name too short'",
        "'<script>alert()', 'Invalid characters'",
        "'Very long name that exceeds the maximum allowed length for organization names', 'Name too long'"
    })
    void shouldRejectInvalidOrganizationNames(String invalidName, String expectedMessage) {
        // Act & Assert
        ValidationException exception = assertThrows(
            ValidationException.class,
            () -> validationService.validateOrganizationName(invalidName)
        );
        
        assertThat(exception.getMessage()).contains(expectedMessage);
    }
    
    @ParameterizedTest
    @DisplayName("Should validate tenant domains correctly")
    @MethodSource("provideValidDomains")
    void shouldAcceptValidDomains(String domain, boolean expected) {
        // Act
        boolean result = validationService.isValidDomain(domain);
        
        // Assert
        assertThat(result).isEqualTo(expected);
    }
    
    static Stream<Arguments> provideValidDomains() {
        return Stream.of(
            Arguments.of("acme-corp", true),
            Arguments.of("it-solutions", true),
            Arguments.of("123invalid", false),
            Arguments.of("admin", false), // reserved
            Arguments.of("api", false)    // reserved
        );
    }
}
```

## Integration Testing

### Spring Boot Integration Tests

OpenFrame uses `@SpringBootTest` for comprehensive integration testing:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class OrganizationControllerIntegrationTest {
    
    @Container
    static MongoDBContainer mongodb = new MongoDBContainer("mongo:7.0")
            .withReuse(true);
    
    @Container
    static GenericContainer<?> redis = new GenericContainer<>("redis:7.2-alpine")
            .withExposedPorts(6379)
            .withReuse(true);
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Autowired
    private OrganizationRepository organizationRepository;
    
    @Autowired
    private TestSecurityConfigurer securityConfigurer;
    
    @BeforeEach
    void setUp() {
        organizationRepository.deleteAll();
    }
    
    @Test
    @DisplayName("Should create organization via REST API")
    void shouldCreateOrganization_ViaRestApi() {
        // Arrange
        CreateOrganizationRequest request = CreateOrganizationRequest.builder()
            .name("Integration Test Corp")
            .domain("integration-test")
            .adminEmail("admin@integration.test")
            .build();
        
        HttpHeaders headers = securityConfigurer.createAuthHeaders("TENANT_ADMIN");
        HttpEntity<CreateOrganizationRequest> entity = new HttpEntity<>(request, headers);
        
        // Act
        ResponseEntity<OrganizationResponse> response = restTemplate.exchange(
            "/api/v1/organizations",
            HttpMethod.POST,
            entity,
            OrganizationResponse.class
        );
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getName()).isEqualTo("Integration Test Corp");
        
        // Verify database state
        Optional<Organization> savedOrg = organizationRepository
            .findByDomain("integration-test");
        assertThat(savedOrg).isPresent();
        assertThat(savedOrg.get().getName()).isEqualTo("Integration Test Corp");
    }
    
    @Test
    @DisplayName("Should return 409 when creating organization with duplicate domain")
    void shouldReturn409_WhenDuplicateDomain() {
        // Arrange - create existing organization
        Organization existing = Organization.builder()
            .name("Existing Corp")
            .domain("existing-domain")
            .tenantId("tenant-123")
            .status(OrganizationStatus.ACTIVE)
            .build();
        organizationRepository.save(existing);
        
        CreateOrganizationRequest request = CreateOrganizationRequest.builder()
            .name("Duplicate Corp")
            .domain("existing-domain")
            .adminEmail("admin@duplicate.test")
            .build();
        
        HttpHeaders headers = securityConfigurer.createAuthHeaders("TENANT_ADMIN");
        HttpEntity<CreateOrganizationRequest> entity = new HttpEntity<>(request, headers);
        
        // Act
        ResponseEntity<ErrorResponse> response = restTemplate.exchange(
            "/api/v1/organizations",
            HttpMethod.POST,
            entity,
            ErrorResponse.class
        );
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().getMessage()).contains("Domain already exists");
    }
}
```

### GraphQL Integration Tests

Testing GraphQL endpoints with Spring Boot:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class DeviceGraphQLIntegrationTest {
    
    @Container
    static MongoDBContainer mongodb = new MongoDBContainer("mongo:7.0");
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Autowired
    private DeviceRepository deviceRepository;
    
    @Test
    @DisplayName("Should query devices via GraphQL")
    void shouldQueryDevices_ViaGraphQL() {
        // Arrange - create test data
        Device device1 = createTestDevice("Device 1", DeviceStatus.ONLINE);
        Device device2 = createTestDevice("Device 2", DeviceStatus.OFFLINE);
        deviceRepository.saveAll(Arrays.asList(device1, device2));
        
        String query = """
            query GetDevices($filter: DeviceFilterInput) {
                devices(filter: $filter) {
                    id
                    name
                    status
                    lastSeen
                    organization {
                        id
                        name
                    }
                }
            }
            """;
        
        Map<String, Object> variables = Map.of(
            "filter", Map.of("status", "ONLINE")
        );
        
        GraphQLRequest graphQLRequest = GraphQLRequest.builder()
            .query(query)
            .variables(variables)
            .build();
        
        HttpHeaders headers = createAuthHeaders();
        HttpEntity<GraphQLRequest> entity = new HttpEntity<>(graphQLRequest, headers);
        
        // Act
        ResponseEntity<GraphQLResponse> response = restTemplate.exchange(
            "/graphql",
            HttpMethod.POST,
            entity,
            GraphQLResponse.class
        );
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        
        List<Map<String, Object>> devices = response.getBody()
            .getData().get("devices");
        
        assertThat(devices).hasSize(1);
        assertThat(devices.get(0).get("name")).isEqualTo("Device 1");
        assertThat(devices.get(0).get("status")).isEqualTo("ONLINE");
    }
    
    private Device createTestDevice(String name, DeviceStatus status) {
        return Device.builder()
            .id(UUID.randomUUID().toString())
            .name(name)
            .status(status)
            .tenantId("test-tenant")
            .organizationId("test-org")
            .lastSeen(Instant.now())
            .build();
    }
}
```

## Contract Testing

### Consumer-Driven Contract Tests

Using Spring Cloud Contract for API contract testing:

```groovy
// contracts/organization_should_return_created_org.groovy
package contracts

org.springframework.cloud.contract.spec.Contract.make {
    description "Should return created organization"
    
    request {
        method POST
        url "/api/v1/organizations"
        headers {
            contentType(applicationJson())
            header("Authorization", "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9...")
        }
        body(
            name: "Test Organization",
            domain: "test-org",
            adminEmail: "admin@test.org"
        )
    }
    
    response {
        status OK()
        headers {
            contentType(applicationJson())
        }
        body(
            id: anyNonBlankString(),
            name: "Test Organization",
            domain: "test-org",
            status: "ACTIVE",
            createdAt: anyIso8601WithOffset()
        )
    }
}
```

### Consumer Contract Test

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
@AutoConfigureStubRunner(
    stubsMode = StubRunnerProperties.StubsMode.LOCAL,
    ids = "com.openframe:openframe-api:+:stubs:8080"
)
class OrganizationApiConsumerTest {
    
    @StubRunnerPort("openframe-api")
    private int apiPort;
    
    private RestTemplate restTemplate = new RestTemplate();
    
    @Test
    void shouldCreateOrganization() {
        // Arrange
        CreateOrganizationRequest request = new CreateOrganizationRequest();
        request.setName("Test Organization");
        request.setDomain("test-org");
        request.setAdminEmail("admin@test.org");
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth("test-jwt-token");
        
        HttpEntity<CreateOrganizationRequest> entity = new HttpEntity<>(request, headers);
        
        // Act
        ResponseEntity<OrganizationResponse> response = restTemplate.exchange(
            "http://localhost:" + apiPort + "/api/v1/organizations",
            HttpMethod.POST,
            entity,
            OrganizationResponse.class
        );
        
        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getName()).isEqualTo("Test Organization");
        assertThat(response.getBody().getDomain()).isEqualTo("test-org");
        assertThat(response.getBody().getStatus()).isEqualTo("ACTIVE");
    }
}
```

## Performance Testing

### JMeter Load Tests

OpenFrame includes JMeter test plans for performance validation:

```xml
<!-- api-load-test.jmx -->
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2">
    <hashTree>
        <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="OpenFrame API Load Test">
            <elementProp name="TestPlan.arguments" elementType="Arguments" guiclass="ArgumentsPanel">
                <collectionProp name="Arguments.arguments">
                    <elementProp name="host" elementType="Argument">
                        <stringProp name="Argument.name">host</stringProp>
                        <stringProp name="Argument.value">localhost</stringProp>
                    </elementProp>
                    <elementProp name="port" elementType="Argument">
                        <stringProp name="Argument.name">port</stringProp>
                        <stringProp name="Argument.value">8080</stringProp>
                    </elementProp>
                </collectionProp>
            </elementProp>
        </TestPlan>
        
        <hashTree>
            <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="API Users">
                <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
                <elementProp name="ThreadGroup.main_controller" elementType="LoopController">
                    <boolProp name="LoopController.continue_forever">false</boolProp>
                    <stringProp name="LoopController.loops">10</stringProp>
                </elementProp>
                <stringProp name="ThreadGroup.num_threads">50</stringProp>
                <stringProp name="ThreadGroup.ramp_time">10</stringProp>
            </ThreadGroup>
            
            <hashTree>
                <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="Get Organizations">
                    <elementProp name="HTTPsampler.Arguments" elementType="Arguments">
                        <collectionProp name="Arguments.arguments"/>
                    </elementProp>
                    <stringProp name="HTTPSampler.domain">${host}</stringProp>
                    <stringProp name="HTTPSampler.port">${port}</stringProp>
                    <stringProp name="HTTPSampler.path">/api/v1/organizations</stringProp>
                    <stringProp name="HTTPSampler.method">GET</stringProp>
                    <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
                </HTTPSamplerProxy>
            </hashTree>
        </hashTree>
    </hashTree>
</jmeterTestPlan>
```

### Gatling Performance Tests

```scala
import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class OpenFrameApiSimulation extends Simulation {
  
  val httpProtocol = http
    .baseUrl("http://localhost:8080")
    .acceptHeader("application/json")
    .authorizationHeader("Bearer test-jwt-token")
    
  val scn = scenario("OpenFrame API Load Test")
    .exec(
      http("Get Organizations")
        .get("/api/v1/organizations")
        .check(status.is(200))
        .check(jsonPath("$[*].id").exists)
    )
    .pause(1)
    .exec(
      http("Get Devices") 
        .get("/api/v1/devices")
        .check(status.is(200))
    )
    .pause(2)
    .exec(
      http("GraphQL Query")
        .post("/graphql")
        .body(StringBody("""{"query": "{ organizations { id name } }"}"""))
        .asJson
        .check(status.is(200))
        .check(jsonPath("$.data.organizations").exists)
    )
    
  setUp(
    scn.inject(
      rampUsers(100) during (30 seconds),
      constantUsers(50) during (60 seconds)
    )
  ).protocols(httpProtocol)
   .assertions(
     global.responseTime.max.lt(2000),
     global.responseTime.mean.lt(500),
     global.successfulRequests.percent.gt(95)
   )
}
```

### Microbenchmarks with JMH

For fine-grained performance testing:

```java
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
@State(Scope.Benchmark)
public class EncryptionServiceBenchmark {
    
    private EncryptionService encryptionService;
    private String testData;
    
    @Setup
    public void setup() {
        encryptionService = new EncryptionService();
        testData = "This is test data for encryption benchmarking";
    }
    
    @Benchmark
    public String benchmarkEncryption() {
        return encryptionService.encrypt(testData);
    }
    
    @Benchmark
    public String benchmarkDecryption() {
        String encrypted = encryptionService.encrypt(testData);
        return encryptionService.decrypt(encrypted);
    }
}
```

## Security Testing

### Security Integration Tests

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@WithMockUser(username = "test-user", roles = {"DEVICE_MANAGER"})
class SecurityIntegrationTest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Test
    @DisplayName("Should prevent SQL injection attacks")
    void shouldPreventSqlInjection() {
        String maliciousInput = "'; DROP TABLE organizations; --";
        
        ResponseEntity<String> response = restTemplate.getForEntity(
            "/api/v1/organizations?search=" + maliciousInput,
            String.class
        );
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        // Verify no SQL injection occurred
        assertThat(response.getBody()).doesNotContain("error");
    }
    
    @Test
    @DisplayName("Should prevent XSS attacks")
    void shouldPreventXssAttacks() {
        CreateOrganizationRequest request = CreateOrganizationRequest.builder()
            .name("<script>alert('XSS')</script>")
            .domain("xss-test")
            .adminEmail("admin@xss.test")
            .build();
        
        ResponseEntity<String> response = restTemplate.postForEntity(
            "/api/v1/organizations",
            request,
            String.class
        );
        
        // Should reject malicious input
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }
    
    @Test
    @DisplayName("Should enforce rate limiting")
    void shouldEnforceRateLimiting() {
        String endpoint = "/api/v1/organizations";
        
        // Make requests up to the limit
        for (int i = 0; i < 100; i++) {
            ResponseEntity<String> response = restTemplate.getForEntity(endpoint, String.class);
            assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        }
        
        // Next request should be rate limited
        ResponseEntity<String> response = restTemplate.getForEntity(endpoint, String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
    }
}
```

## End-to-End Testing

### Selenium WebDriver Tests

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@Testcontainers
class OpenFrameE2ETest {
    
    @Container
    static BrowserWebDriverContainer<?> chrome = new BrowserWebDriverContainer<>()
            .withCapabilities(new ChromeOptions());
    
    private WebDriver driver;
    
    @BeforeEach
    void setUp() {
        driver = chrome.getWebDriver();
    }
    
    @Test
    @DisplayName("Should complete full user registration and login flow")
    void shouldCompleteRegistrationAndLoginFlow() {
        // Navigate to registration page
        driver.get("http://localhost:3000/auth/register");
        
        // Fill registration form
        WebElement orgNameInput = driver.findElement(By.name("organizationName"));
        orgNameInput.sendKeys("E2E Test Corporation");
        
        WebElement domainInput = driver.findElement(By.name("domain"));
        domainInput.sendKeys("e2e-test-corp");
        
        WebElement emailInput = driver.findElement(By.name("adminEmail"));
        emailInput.sendKeys("admin@e2etest.com");
        
        WebElement passwordInput = driver.findElement(By.name("password"));
        passwordInput.sendKeys("SecurePassword123!");
        
        // Submit registration
        WebElement submitButton = driver.findElement(By.cssSelector("button[type='submit']"));
        submitButton.click();
        
        // Wait for redirect to dashboard
        WebDriverWait wait = new WebDriverWait(driver, Duration.ofSeconds(10));
        wait.until(ExpectedConditions.urlContains("/dashboard"));
        
        // Verify successful registration
        WebElement welcomeMessage = wait.until(
            ExpectedConditions.presenceOfElementLocated(
                By.cssSelector("[data-testid='welcome-message']")
            )
        );
        
        assertThat(welcomeMessage.getText()).contains("Welcome to OpenFrame");
        
        // Test navigation to devices page
        WebElement devicesLink = driver.findElement(By.cssSelector("[data-testid='nav-devices']"));
        devicesLink.click();
        
        wait.until(ExpectedConditions.urlContains("/devices"));
        
        // Verify devices page loads
        WebElement devicesTitle = wait.until(
            ExpectedConditions.presenceOfElementLocated(
                By.cssSelector("h1")
            )
        );
        
        assertThat(devicesTitle.getText()).isEqualTo("Devices");
    }
}
```

## Test Data Management

### Test Fixtures

```java
@Component
public class TestDataFactory {
    
    public Organization createTestOrganization(String domain) {
        return Organization.builder()
            .id(UUID.randomUUID().toString())
            .name("Test Organization " + domain)
            .domain(domain)
            .tenantId("test-tenant-" + domain)
            .status(OrganizationStatus.ACTIVE)
            .createdAt(Instant.now())
            .build();
    }
    
    public Device createTestDevice(String organizationId, DeviceStatus status) {
        return Device.builder()
            .id(UUID.randomUUID().toString())
            .name("Test Device " + UUID.randomUUID().toString().substring(0, 8))
            .organizationId(organizationId)
            .status(status)
            .deviceType(DeviceType.WORKSTATION)
            .operatingSystem("Windows 11")
            .lastSeen(Instant.now())
            .build();
    }
    
    public User createTestUser(String organizationId, Role role) {
        return User.builder()
            .id(UUID.randomUUID().toString())
            .email("test-" + UUID.randomUUID().toString().substring(0, 8) + "@test.com")
            .organizationId(organizationId)
            .role(role)
            .status(UserStatus.ACTIVE)
            .createdAt(Instant.now())
            .build();
    }
}
```

### Database Test Configuration

```java
@TestConfiguration
public class TestDatabaseConfiguration {
    
    @Bean
    @Primary
    public MongoTemplate testMongoTemplate() {
        return new MongoTemplate(mongoClient(), "openframe_test");
    }
    
    @Bean
    public MongoTransactionManager testTransactionManager() {
        return new MongoTransactionManager(mongoDbFactory());
    }
    
    @EventListener
    public void handleApplicationReady(ApplicationReadyEvent event) {
        // Clean test database on startup
        MongoTemplate mongoTemplate = event.getApplicationContext()
            .getBean("testMongoTemplate", MongoTemplate.class);
        mongoTemplate.getDb().drop();
    }
}
```

## Test Coverage and Quality

### JaCoCo Configuration

```xml
<!-- pom.xml -->
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.8</version>
    <executions>
        <execution>
            <id>prepare-agent</id>
            <goals>
                <goal>prepare-agent</goal>
            </goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals>
                <goal>report</goal>
            </goals>
        </execution>
        <execution>
            <id>check</id>
            <goals>
                <goal>check</goal>
            </goals>
            <configuration>
                <rules>
                    <rule>
                        <element>CLASS</element>
                        <limits>
                            <limit>
                                <counter>LINE</counter>
                                <value>COVEREDRATIO</value>
                                <minimum>0.80</minimum>
                            </limit>
                        </limits>
                    </rule>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

### SonarQube Quality Gates

```properties
# sonar-project.properties
sonar.projectKey=openframe-oss-tenant
sonar.projectName=OpenFrame OSS Tenant
sonar.projectVersion=1.0.0

sonar.sources=src/main/java
sonar.tests=src/test/java
sonar.java.binaries=target/classes
sonar.java.test.binaries=target/test-classes

# Coverage
sonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml
sonar.junit.reportPaths=target/surefire-reports

# Quality Gates
sonar.coverage.line.minimum=80
sonar.duplicated_lines_density.maximum=3
sonar.maintainability_rating.maximum=A
sonar.reliability_rating.maximum=A
sonar.security_rating.maximum=A
```

## Running Tests

### Maven Test Commands

```bash
# Run all tests
mvn test

# Run only unit tests
mvn test -Dtest="*Test"

# Run only integration tests
mvn test -Dtest="*IntegrationTest"

# Run tests with coverage
mvn clean test jacoco:report

# Run performance tests
mvn test -Dtest="*PerformanceTest"

# Run specific test class
mvn test -Dtest="OrganizationServiceTest"

# Run specific test method
mvn test -Dtest="OrganizationServiceTest#shouldCreateOrganization_WithValidData"

# Skip tests during build
mvn install -DskipTests

# Run tests with specific profile
mvn test -Pintegration-test
```

### Gradle Test Commands

```bash
# Run all tests
./gradlew test

# Run integration tests
./gradlew integrationTest

# Generate test report
./gradlew test jacocoTestReport

# Run performance tests
./gradlew performanceTest

# Run tests continuously
./gradlew test --continuous
```

### IDE Test Execution

**IntelliJ IDEA:**
- Right-click test class/method → Run Test
- Use `Ctrl+Shift+F10` to run tests
- View coverage with `Ctrl+Shift+F6`

**VS Code:**
- Use Java Test Runner extension
- Click play button next to test methods
- Use Command Palette: "Java: Run Tests"

## Continuous Integration

### GitHub Actions Test Workflow

```yaml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      mongodb:
        image: mongo:7.0
        ports:
          - 27017:27017
        options: >-
          --health-cmd "mongosh --eval 'db.runCommand({ping: 1})'"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7.2-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Java 21
      uses: actions/setup-java@v3
      with:
        java-version: '21'
        distribution: 'temurin'
    
    - name: Cache Maven dependencies
      uses: actions/cache@v3
      with:
        path: ~/.m2
        key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}
        restore-keys: ${{ runner.os }}-m2
    
    - name: Run unit tests
      run: mvn test -Dtest="*Test"
    
    - name: Run integration tests
      run: mvn test -Dtest="*IntegrationTest"
    
    - name: Generate test report
      run: mvn jacoco:report
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        file: target/site/jacoco/jacoco.xml
        fail_ci_if_error: true
```

## Testing Best Practices

### Test Organization

1. **Follow AAA Pattern**: Arrange, Act, Assert
2. **Use Descriptive Names**: Test names should explain what is being tested
3. **Keep Tests Independent**: Each test should be able to run in isolation
4. **Use Test Data Builders**: Create reusable test data factories

### Test Performance

1. **Use `@DirtiesContext` Sparingly**: Only when necessary to avoid slow tests
2. **Mock External Dependencies**: Keep unit tests fast and isolated
3. **Use Test Slices**: `@WebMvcTest`, `@DataMongoTest` for focused testing
4. **Parallel Execution**: Configure Maven Surefire for parallel test execution

### Test Maintenance

1. **Regular Test Review**: Remove obsolete tests and update test data
2. **Test Coverage Monitoring**: Maintain minimum coverage thresholds
3. **Flaky Test Management**: Identify and fix unstable tests promptly
4. **Documentation**: Comment complex test scenarios and setup

## Troubleshooting Common Test Issues

### Container Startup Issues

```bash
# Check if containers are running
docker ps

# View container logs
docker logs openframe-mongodb-test
docker logs openframe-redis-test

# Restart containers
docker-compose -f docker-compose.test.yml restart
```

### Memory Issues During Tests

```bash
# Increase JVM memory for tests
export MAVEN_OPTS="-Xmx2g -XX:MaxPermSize=256m"

# Or configure in pom.xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-surefire-plugin</artifactId>
    <configuration>
        <argLine>-Xmx2g</argLine>
    </configuration>
</plugin>
```

### Test Database Issues

```java
// Clean database before each test
@BeforeEach
void cleanDatabase() {
    mongoTemplate.getDb().drop();
}

// Use test transactions
@Transactional
@Rollback
@Test
void testMethod() {
    // Test implementation
}
```

## Further Reading

- **JUnit 5 User Guide**: https://junit.org/junit5/docs/current/user-guide/
- **Spring Boot Testing**: https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.testing
- **Testcontainers**: https://www.testcontainers.org/
- **Mockito Documentation**: https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html

## Community Support

Testing discussions and support are available in the OpenMSP Slack community:
- **Join**: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
- **Website**: https://www.openmsp.ai/

Quality testing ensures OpenFrame remains reliable, secure, and performant. When in doubt, write more tests! 🧪