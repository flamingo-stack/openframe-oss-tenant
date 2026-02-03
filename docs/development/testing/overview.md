# Testing Overview

OpenFrame employs a comprehensive testing strategy across all layers of the application, from unit tests to end-to-end integration tests. This guide covers testing philosophy, tools, patterns, and best practices used throughout the OpenFrame platform.

## Testing Philosophy

OpenFrame follows a **test pyramid approach** with emphasis on:

- **Fast feedback loops** through unit testing
- **Confidence in integrations** through integration testing  
- **Real-world scenario validation** through E2E testing
- **Continuous testing** in CI/CD pipelines

```mermaid
pyramid
    title OpenFrame Test Pyramid
    
    top "E2E Tests"
    middle "Integration Tests"  
    bottom "Unit Tests"
    
    note top "Browser automation, full user journeys"
    note middle "Service interactions, database integration"
    note bottom "Business logic, individual components"
```

## Testing Stack

### Backend Testing (Java)

| Tool | Purpose | Usage |
|------|---------|-------|
| **JUnit 5** | Unit testing framework | Core testing framework |
| **Mockito** | Mocking framework | Isolating dependencies |
| **TestContainers** | Integration testing | Real databases in tests |
| **Spring Boot Test** | Spring integration testing | Loading application context |
| **WireMock** | HTTP service mocking | External API simulation |
| **AssertJ** | Fluent assertions | Readable test assertions |

### Frontend Testing (TypeScript/Vue)

| Tool | Purpose | Usage |
|------|---------|-------|
| **Vitest** | Test runner | Fast unit/integration tests |
| **Vue Test Utils** | Vue component testing | Component mounting and interaction |
| **jsdom** | DOM simulation | Browser-like environment |
| **MSW** | API mocking | Mock service worker for HTTP |
| **Playwright** | E2E testing | Browser automation |
| **Testing Library** | User-centric testing | DOM queries and interactions |

### Client Agent Testing (Rust)

| Tool | Purpose | Usage |
|------|---------|-------|
| **cargo test** | Built-in test runner | Unit and integration tests |
| **tokio-test** | Async testing | Testing async code |
| **mockall** | Mocking framework | Mock external dependencies |
| **tempfile** | Temporary files | Testing file operations |

## Test Organization

### Directory Structure

```text
openframe/
├── services/
│   ├── openframe-api/
│   │   ├── src/main/java/          # Production code
│   │   └── src/test/java/          # Test code
│   │       ├── unit/               # Unit tests
│   │       ├── integration/        # Integration tests
│   │       └── resources/          # Test resources
│   └── openframe-frontend/
│       ├── src/                    # Production code
│       └── tests/                  # Test code
│           ├── unit/               # Component unit tests
│           ├── integration/        # API integration tests
│           └── e2e/                # End-to-end tests
└── openframe-e2e-tests/           # Cross-service E2E tests
```

### Test Naming Conventions

#### Java Tests
```java
// Unit tests: MethodName_StateUnderTest_ExpectedBehavior
public class DeviceServiceTest {
    
    @Test
    void findById_DeviceExists_ReturnsDevice() { }
    
    @Test
    void findById_DeviceNotFound_ThrowsException() { }
    
    @Test
    void create_ValidDevice_SavesAndReturnsDevice() { }
}

// Integration tests: append "IT" suffix
public class DeviceControllerIT { }
```

#### Frontend Tests
```typescript
// Component tests: describe component, test behavior
describe('DeviceCard.vue', () => {
  it('displays device name and status', () => { })
  
  it('emits edit event when edit button clicked', () => { })
  
  it('shows offline status with red indicator', () => { })
})
```

## Unit Testing Patterns

### Java Unit Testing

#### Service Layer Testing

```java
@ExtendWith(MockitoExtension.class)
class DeviceServiceTest {
    
    @Mock
    private DeviceRepository deviceRepository;
    
    @Mock
    private EventPublisher eventPublisher;
    
    @InjectMocks
    private DeviceService deviceService;
    
    @Test
    void findById_DeviceExists_ReturnsDevice() {
        // Given
        String deviceId = "device-123";
        Device expectedDevice = Device.builder()
            .id(deviceId)
            .name("Test Device")
            .status(DeviceStatus.ONLINE)
            .build();
            
        when(deviceRepository.findById(deviceId))
            .thenReturn(Optional.of(expectedDevice));
        
        // When
        Device result = deviceService.findById(deviceId);
        
        // Then
        assertThat(result)
            .isNotNull()
            .extracting(Device::getName, Device::getStatus)
            .containsExactly("Test Device", DeviceStatus.ONLINE);
    }
    
    @Test
    void create_ValidDevice_PublishesEvent() {
        // Given
        CreateDeviceRequest request = CreateDeviceRequest.builder()
            .name("New Device")
            .organizationId("org-123")
            .build();
            
        Device savedDevice = Device.builder()
            .id("device-456")
            .name(request.getName())
            .organizationId(request.getOrganizationId())
            .status(DeviceStatus.OFFLINE)
            .build();
            
        when(deviceRepository.save(any(Device.class)))
            .thenReturn(savedDevice);
        
        // When
        Device result = deviceService.create(request);
        
        // Then
        assertThat(result).isEqualTo(savedDevice);
        
        verify(eventPublisher).publish(argThat(event -> 
            event instanceof DeviceCreatedEvent &&
            ((DeviceCreatedEvent) event).getDeviceId().equals("device-456")
        ));
    }
}
```

#### Repository Testing with TestContainers

```java
@DataMongoTest
@Testcontainers
class DeviceRepositoryTest {
    
    @Container
    static MongoDBContainer mongodb = new MongoDBContainer("mongo:7.0")
            .withExposedPorts(27017);
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", mongodb::getReplicaSetUrl);
    }
    
    @Autowired
    private DeviceRepository deviceRepository;
    
    @Test
    void findByTenantIdAndStatus_ReturnsMatchingDevices() {
        // Given
        String tenantId = "tenant-123";
        Device onlineDevice = createDevice(tenantId, DeviceStatus.ONLINE);
        Device offlineDevice = createDevice(tenantId, DeviceStatus.OFFLINE);
        Device otherTenantDevice = createDevice("tenant-456", DeviceStatus.ONLINE);
        
        deviceRepository.saveAll(Arrays.asList(
            onlineDevice, offlineDevice, otherTenantDevice));
        
        // When
        List<Device> result = deviceRepository
            .findByTenantIdAndStatus(tenantId, DeviceStatus.ONLINE);
        
        // Then
        assertThat(result)
            .hasSize(1)
            .extracting(Device::getId)
            .containsExactly(onlineDevice.getId());
    }
    
    private Device createDevice(String tenantId, DeviceStatus status) {
        return Device.builder()
            .tenantId(tenantId)
            .name("Test Device")
            .status(status)
            .build();
    }
}
```

### Frontend Unit Testing

#### Vue Component Testing

```typescript
import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import DeviceCard from '@/components/DeviceCard.vue'
import { Device, DeviceStatus } from '@/types/device'

describe('DeviceCard.vue', () => {
  const mockDevice: Device = {
    id: 'device-123',
    name: 'Test Device',
    status: DeviceStatus.ONLINE,
    organizationId: 'org-123',
    lastSeen: new Date().toISOString()
  }

  it('displays device information correctly', () => {
    const wrapper = mount(DeviceCard, {
      props: { device: mockDevice }
    })

    expect(wrapper.find('[data-testid="device-name"]').text())
      .toBe('Test Device')
    expect(wrapper.find('[data-testid="device-status"]').text())
      .toBe('ONLINE')
  })

  it('emits edit event when edit button clicked', async () => {
    const wrapper = mount(DeviceCard, {
      props: { device: mockDevice }
    })

    await wrapper.find('[data-testid="edit-button"]').trigger('click')

    expect(wrapper.emitted('edit')).toBeTruthy()
    expect(wrapper.emitted('edit')![0]).toEqual([mockDevice.id])
  })

  it('shows correct status indicator color', () => {
    const wrapper = mount(DeviceCard, {
      props: { device: mockDevice }
    })

    const statusIndicator = wrapper.find('[data-testid="status-indicator"]')
    expect(statusIndicator.classes()).toContain('status-online')
  })
})
```

#### Composables Testing

```typescript
import { describe, it, expect, vi } from 'vitest'
import { useDevices } from '@/composables/useDevices'
import { createTestingPinia } from '@pinia/testing'

describe('useDevices', () => {
  it('loads devices on mount', async () => {
    const mockDevices = [
      { id: '1', name: 'Device 1', status: 'ONLINE' },
      { id: '2', name: 'Device 2', status: 'OFFLINE' }
    ]

    // Mock GraphQL query
    vi.mocked(useQuery).mockReturnValue({
      result: computed(() => ({ devices: mockDevices })),
      loading: ref(false),
      error: ref(null),
      refetch: vi.fn()
    })

    const { devices, loading, error } = useDevices()

    expect(devices.value).toEqual(mockDevices)
    expect(loading.value).toBe(false)
    expect(error.value).toBe(null)
  })

  it('handles loading state correctly', () => {
    vi.mocked(useQuery).mockReturnValue({
      result: ref(null),
      loading: ref(true),
      error: ref(null),
      refetch: vi.fn()
    })

    const { loading } = useDevices()
    expect(loading.value).toBe(true)
  })
})
```

## Integration Testing

### Backend Integration Testing

#### GraphQL Integration Tests

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(locations = "classpath:application-integration.properties")
class DeviceGraphQLIT {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Autowired
    private DeviceRepository deviceRepository;
    
    @Test
    void getDevices_WithValidJWT_ReturnsDevices() {
        // Given
        String tenantId = "tenant-123";
        Device device = createTestDevice(tenantId);
        deviceRepository.save(device);
        
        String jwt = createValidJWT(tenantId);
        String query = """
            query {
                devices {
                    edges {
                        node {
                            id
                            name
                            status
                        }
                    }
                }
            }
            """;
        
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + jwt);
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        GraphQLRequest request = new GraphQLRequest(query);
        HttpEntity<GraphQLRequest> entity = new HttpEntity<>(request, headers);
        
        // When
        ResponseEntity<GraphQLResponse> response = restTemplate
            .postForEntity("/graphql", entity, GraphQLResponse.class);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getData())
            .extracting("devices.edges")
            .asList()
            .hasSize(1);
    }
}
```

#### Service Integration with External APIs

```java
@SpringBootTest
@WireMockTest
class FleetDMIntegrationTest {
    
    @Autowired
    private FleetDMService fleetDMService;
    
    @RegisterExtension
    static WireMockExtension wireMock = WireMockExtension.newInstance()
        .options(wireMockConfig().port(8089))
        .build();
    
    @Test
    void getHosts_WhenFleetDMReturnsData_ParsesCorrectly() {
        // Given
        wireMock.stubFor(get(urlEqualTo("/api/latest/fleet/hosts"))
            .willReturn(aResponse()
                .withStatus(200)
                .withHeader("Content-Type", "application/json")
                .withBodyFile("fleetdm-hosts-response.json")));
        
        // When
        List<Host> hosts = fleetDMService.getHosts();
        
        // Then
        assertThat(hosts)
            .hasSize(2)
            .extracting(Host::getHostname)
            .containsExactly("host-1", "host-2");
        
        wireMock.verify(getRequestedFor(urlEqualTo("/api/latest/fleet/hosts"))
            .withHeader("Authorization", containing("Bearer")));
    }
}
```

### Frontend Integration Testing

#### API Integration Tests

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setupServer } from 'msw/node'
import { rest } from 'msw'
import { useDevicesQuery } from '@/graphql/queries/devices'

const server = setupServer(
  rest.post('/graphql', (req, res, ctx) => {
    return res(
      ctx.json({
        data: {
          devices: {
            edges: [
              {
                node: {
                  id: 'device-1',
                  name: 'Test Device',
                  status: 'ONLINE'
                }
              }
            ]
          }
        }
      })
    )
  })
)

describe('Devices API Integration', () => {
  beforeEach(() => server.listen())
  afterEach(() => server.resetHandlers())

  it('loads devices from GraphQL API', async () => {
    const { result, loading } = useDevicesQuery()

    // Wait for the query to complete
    await new Promise(resolve => {
      const unwatch = watch(loading, (isLoading) => {
        if (!isLoading) {
          unwatch()
          resolve(true)
        }
      }, { immediate: true })
    })

    expect(result.value?.devices.edges).toHaveLength(1)
    expect(result.value?.devices.edges[0].node.name).toBe('Test Device')
  })
})
```

## End-to-End Testing

### Cross-Service E2E Tests

Located in `openframe-e2e-tests/`, these tests validate complete user journeys:

```java
@SpringBootTest
@TestMethodOrder(OrderAnnotation.class)
class UserRegistrationJourneyIT {
    
    @Autowired
    private AuthHelper authHelper;
    
    @Autowired
    private ApiHelper apiHelper;
    
    private String tenantDomain;
    private String userEmail;
    
    @Test
    @Order(1)
    void registerNewTenant_ShouldCreateTenantAndAdmin() {
        // Given
        tenantDomain = "test-tenant-" + System.currentTimeMillis();
        userEmail = "admin@" + tenantDomain + ".com";
        
        TenantRegistrationRequest request = TenantRegistrationRequest.builder()
            .tenantDomain(tenantDomain)
            .organizationName("Test Organization")
            .firstName("Test")
            .lastName("Admin")
            .email(userEmail)
            .password("SecurePassword123!")
            .build();
        
        // When
        TenantRegistrationResponse response = authHelper
            .registerTenant(request);
        
        // Then
        assertThat(response.getTenantId()).isNotNull();
        assertThat(response.getUserId()).isNotNull();
        assertThat(response.getAccessToken()).isNotNull();
    }
    
    @Test
    @Order(2)
    void loginWithRegisteredUser_ShouldReturnValidTokens() {
        // When
        LoginResponse response = authHelper
            .login(userEmail, "SecurePassword123!");
        
        // Then
        assertThat(response.getAccessToken()).isNotNull();
        assertThat(response.getRefreshToken()).isNotNull();
    }
    
    @Test
    @Order(3)
    void createOrganization_WithValidAuth_ShouldSucceed() {
        // Given
        String accessToken = authHelper
            .login(userEmail, "SecurePassword123!")
            .getAccessToken();
        
        CreateOrganizationRequest request = CreateOrganizationRequest.builder()
            .name("Test Organization")
            .contactEmail("contact@example.com")
            .build();
        
        // When
        OrganizationResponse response = apiHelper
            .createOrganization(request, accessToken);
        
        // Then
        assertThat(response.getId()).isNotNull();
        assertThat(response.getName()).isEqualTo("Test Organization");
    }
}
```

### Frontend E2E Tests with Playwright

```typescript
import { test, expect } from '@playwright/test'

test.describe('Device Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'admin@test.com')
    await page.fill('[data-testid="password-input"]', 'password')
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should display devices list', async ({ page }) => {
    await page.goto('/devices')
    
    // Wait for devices to load
    await expect(page.locator('[data-testid="devices-table"]')).toBeVisible()
    
    // Check that device rows are present
    const deviceRows = page.locator('[data-testid="device-row"]')
    await expect(deviceRows).toHaveCount.greaterThan(0)
  })

  test('should create new device', async ({ page }) => {
    await page.goto('/devices')
    
    // Click add device button
    await page.click('[data-testid="add-device-button"]')
    
    // Fill form
    await page.fill('[data-testid="device-name-input"]', 'Test Device')
    await page.selectOption('[data-testid="device-type-select"]', 'DESKTOP')
    
    // Submit form
    await page.click('[data-testid="save-device-button"]')
    
    // Verify device appears in list
    await expect(page.locator('text=Test Device')).toBeVisible()
  })

  test('should edit existing device', async ({ page }) => {
    await page.goto('/devices')
    
    // Click edit on first device
    await page.click('[data-testid="device-row"]:first-child [data-testid="edit-button"]')
    
    // Change name
    await page.fill('[data-testid="device-name-input"]', 'Updated Device Name')
    await page.click('[data-testid="save-device-button"]')
    
    // Verify name updated
    await expect(page.locator('text=Updated Device Name')).toBeVisible()
  })
})
```

## Test Data Management

### Test Data Builders

```java
public class DeviceTestDataBuilder {
    
    private String id = "device-" + UUID.randomUUID().toString();
    private String tenantId = "tenant-123";
    private String name = "Test Device";
    private DeviceStatus status = DeviceStatus.OFFLINE;
    private String organizationId = "org-123";
    
    public static DeviceTestDataBuilder aDevice() {
        return new DeviceTestDataBuilder();
    }
    
    public DeviceTestDataBuilder withId(String id) {
        this.id = id;
        return this;
    }
    
    public DeviceTestDataBuilder withTenantId(String tenantId) {
        this.tenantId = tenantId;
        return this;
    }
    
    public DeviceTestDataBuilder withName(String name) {
        this.name = name;
        return this;
    }
    
    public DeviceTestDataBuilder online() {
        this.status = DeviceStatus.ONLINE;
        return this;
    }
    
    public Device build() {
        return Device.builder()
            .id(id)
            .tenantId(tenantId)
            .name(name)
            .status(status)
            .organizationId(organizationId)
            .createdAt(Instant.now())
            .build();
    }
}

// Usage in tests
Device device = aDevice()
    .withTenantId("my-tenant")
    .withName("Production Server")
    .online()
    .build();
```

### Database Test Fixtures

```java
@Component
@Profile("test")
public class TestDataInitializer {
    
    @Autowired
    private DeviceRepository deviceRepository;
    
    @Autowired
    private OrganizationRepository organizationRepository;
    
    @EventListener
    @Async
    public void onApplicationReady(ApplicationReadyEvent event) {
        if (Arrays.asList(environment.getActiveProfiles()).contains("test")) {
            initializeTestData();
        }
    }
    
    private void initializeTestData() {
        // Create test organizations
        Organization testOrg = Organization.builder()
            .tenantId("test-tenant")
            .name("Test Organization")
            .contactEmail("test@example.com")
            .build();
        organizationRepository.save(testOrg);
        
        // Create test devices
        List<Device> testDevices = IntStream.range(1, 11)
            .mapToObj(i -> aDevice()
                .withTenantId("test-tenant")
                .withOrganizationId(testOrg.getId())
                .withName("Test Device " + i)
                .build())
            .collect(Collectors.toList());
        deviceRepository.saveAll(testDevices);
    }
}
```

## Test Configuration

### Application Properties for Testing

```yaml
# src/test/resources/application-test.yml
spring:
  profiles:
    active: test
  data:
    mongodb:
      host: localhost
      port: 0  # Use random port with @EmbeddedMongo
  redis:
    host: localhost
    port: 0  # Use embedded Redis
  kafka:
    bootstrap-servers: localhost:9092
    consumer:
      group-id: openframe-test
      auto-offset-reset: earliest

logging:
  level:
    com.openframe: DEBUG
    org.springframework.test: INFO
    org.testcontainers: INFO

openframe:
  security:
    jwt:
      secret: test-jwt-secret-key-for-testing-only
  external:
    fleetdm:
      url: http://localhost:${wiremock.server.port}
      api-key: test-api-key
```

### CI/CD Test Configuration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          java-version: '21'
      - name: Run unit tests
        run: mvn test
      - name: Generate test report
        uses: dorny/test-reporter@v1
        if: success() || failure()
        with:
          name: Unit Test Results
          path: '**/target/surefire-reports/TEST-*.xml'
          reporter: java-junit

  integration-tests:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:7.0
        ports:
          - 27017:27017
      redis:
        image: redis:7.0
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-java@v3
        with:
          java-version: '21'
      - name: Run integration tests
        run: mvn test -Dtest=**/*IT
        env:
          MONGODB_URI: mongodb://localhost:27017/openframe_test
          REDIS_URL: redis://localhost:6379

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install
      - name: Start OpenFrame
        run: ./scripts/run-linux.sh --silent &
      - name: Wait for services
        run: ./scripts/wait-for-services.sh
      - name: Run E2E tests
        run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Best Practices

### General Testing Guidelines

1. **Write tests first** (TDD) for complex business logic
2. **Keep tests independent** - no shared state between tests
3. **Use meaningful test names** that describe the scenario
4. **Test behavior, not implementation** - focus on outcomes
5. **Keep tests fast** - use mocking for external dependencies

### Java Testing Best Practices

```java
// Good: Tests behavior and outcome
@Test
void processPayment_WithValidCard_UpdatesAccountBalance() {
    // Test the business outcome
}

// Bad: Tests internal implementation
@Test
void processPayment_CallsPaymentGatewayService() {
    // Testing how something is done, not what it achieves
}
```

### Frontend Testing Best Practices

```typescript
// Good: Test user interactions and outcomes
it('displays error message when form submission fails', async () => {
  // Simulate user action and verify result
})

// Bad: Test component internals
it('calls updateFormData method when input changes', () => {
  // Testing implementation details
})
```

### Test Coverage Guidelines

| Layer | Target Coverage | Focus |
|-------|-----------------|-------|
| **Unit Tests** | 80%+ | Business logic, edge cases |
| **Integration Tests** | 60%+ | Service interactions, data flows |
| **E2E Tests** | Critical paths | User journeys, core features |

## Running Tests

### Local Development

```bash
# Java unit tests
mvn test

# Java integration tests  
mvn test -Dtest=**/*IT

# Frontend unit tests
cd openframe/services/openframe-frontend
npm run test

# Frontend E2E tests
npm run test:e2e

# All tests
./scripts/run-all-tests.sh
```

### CI Environment

Tests run automatically on:
- **Pull requests** to main branch
- **Push to main** branch
- **Scheduled runs** (nightly)
- **Release preparation**

## Next Steps

Now that you understand OpenFrame's testing strategy:

1. **[Contributing Guidelines](../contributing/guidelines.md)** - Learn how to contribute with proper tests
2. **[Local Development](../setup/local-development.md)** - Set up your testing workflow
3. **[Architecture Overview](../architecture/overview.md)** - Understand what you're testing

## Getting Help

For testing questions and support:

1. **Join our community**: [OpenMSP Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
2. **Ask in #development channel** for testing guidance
3. **Review existing tests** in the codebase for examples
4. **Check CI logs** for test failure debugging