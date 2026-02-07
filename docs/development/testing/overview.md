# Testing Overview

OpenFrame employs a comprehensive testing strategy to ensure reliability, performance, and maintainability. This guide covers testing approaches, tools, and best practices across all layers of the application.

## Testing Philosophy

Our testing strategy is built on these core principles:

### 1. **Test Pyramid**
Following the traditional test pyramid approach:

```text
     /\
    /  \    E2E Tests (Few)
   /____\
  /      \   Integration Tests (Some)  
 /________\
/          \  Unit Tests (Many)
/____________\
```

- **Unit Tests (70%)**: Fast, isolated component tests
- **Integration Tests (20%)**: Service interaction tests  
- **End-to-End Tests (10%)**: Full workflow validation

### 2. **Shift Left Testing**
- Tests written alongside code development
- Early feedback through rapid test execution
- Continuous testing in development workflow

### 3. **Test-Driven Development (TDD)**
- Write tests before implementation (where appropriate)
- Red-Green-Refactor cycle
- Ensures testable code design

### 4. **Behavior-Driven Development (BDD)**
- Tests describe expected behavior
- Readable test specifications
- Business-focused test scenarios

## Testing Technology Stack

### Backend Testing (Java/Spring Boot)

| Framework/Tool | Purpose | Usage |
|---------------|---------|-------|
| **JUnit 5** | Unit testing framework | Core test framework |
| **Mockito** | Mocking framework | Mock dependencies |
| **Spring Boot Test** | Integration testing | Spring context testing |
| **TestContainers** | Integration testing | Database and service testing |
| **WireMock** | API testing | External service mocking |
| **REST Assured** | API testing | REST endpoint testing |
| **Awaitility** | Async testing | Asynchronous operation testing |

### Frontend Testing (Vue.js/TypeScript)

| Framework/Tool | Purpose | Usage |
|---------------|---------|-------|
| **Vitest** | Unit testing | Vue component testing |
| **Vue Test Utils** | Component testing | Vue-specific testing utilities |
| **Cypress** | E2E testing | Full application testing |
| **Playwright** | E2E testing | Cross-browser testing |
| **MSW** | API mocking | Mock service worker for HTTP |
| **Testing Library** | Component testing | User-centric testing utilities |

### Database Testing

| Tool | Purpose | Usage |
|------|---------|-------|
| **Embedded MongoDB** | Unit testing | In-memory MongoDB for tests |
| **Embedded Redis** | Unit testing | In-memory Redis for tests |
| **TestContainers MongoDB** | Integration testing | Real MongoDB in containers |
| **TestContainers Kafka** | Integration testing | Real Kafka in containers |

## Test Categories and Structure

### 1. Unit Tests

**Purpose**: Test individual components in isolation

**Characteristics**:
- Fast execution (< 100ms per test)
- No external dependencies
- High code coverage
- Deterministic results

**Example Structure**:
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
    @DisplayName("Should return device when valid ID is provided")
    void shouldReturnDeviceWhenValidIdProvided() {
        // Given
        String deviceId = "device-123";
        Device mockDevice = createMockDevice(deviceId);
        when(deviceRepository.findById(deviceId)).thenReturn(Optional.of(mockDevice));
        
        // When
        Optional<Device> result = deviceService.findById(deviceId);
        
        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getId()).isEqualTo(deviceId);
        assertThat(result.get().getName()).isEqualTo("Test Device");
    }
    
    @Test
    @DisplayName("Should throw exception when device not found")
    void shouldThrowExceptionWhenDeviceNotFound() {
        // Given
        String deviceId = "nonexistent-device";
        when(deviceRepository.findById(deviceId)).thenReturn(Optional.empty());
        
        // When & Then
        assertThatThrownBy(() -> deviceService.getById(deviceId))
            .isInstanceOf(DeviceNotFoundException.class)
            .hasMessage("Device not found: nonexistent-device");
    }
    
    private Device createMockDevice(String id) {
        return Device.builder()
            .id(id)
            .name("Test Device")
            .status(DeviceStatus.ONLINE)
            .organizationId("org-123")
            .build();
    }
}
```

### 2. Integration Tests

**Purpose**: Test service interactions and external integrations

**Characteristics**:
- Medium execution time (< 5s per test)
- Real database/message broker
- Actual service interactions
- End-to-end data flow validation

**Example Structure**:
```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class DeviceControllerIntegrationTest {
    
    @Container
    static MongoDBContainer mongoDBContainer = new MongoDBContainer("mongo:7.0")
            .withExposedPorts(27017);
    
    @Container
    static GenericContainer<?> redisContainer = new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379);
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Autowired
    private DeviceRepository deviceRepository;
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", mongoDBContainer::getReplicaSetUrl);
        registry.add("spring.redis.host", redisContainer::getHost);
        registry.add("spring.redis.port", redisContainer::getFirstMappedPort);
    }
    
    @Test
    @WithMockUser(authorities = "ADMIN")
    void shouldCreateDeviceSuccessfully() {
        // Given
        CreateDeviceRequest request = CreateDeviceRequest.builder()
            .name("Integration Test Device")
            .type(DeviceType.SERVER)
            .organizationId("org-123")
            .build();
        
        // When
        ResponseEntity<DeviceResponse> response = restTemplate.postForEntity(
            "/api/v1/devices", 
            request, 
            DeviceResponse.class
        );
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getName()).isEqualTo("Integration Test Device");
        
        // Verify database state
        Optional<Device> savedDevice = deviceRepository.findById(response.getBody().getId());
        assertThat(savedDevice).isPresent();
        assertThat(savedDevice.get().getStatus()).isEqualTo(DeviceStatus.PENDING);
    }
    
    @Test
    @WithMockUser(authorities = "READ_ONLY")
    void shouldReturnForbiddenWhenInsufficientPermissions() {
        // Given
        CreateDeviceRequest request = CreateDeviceRequest.builder()
            .name("Unauthorized Device")
            .build();
        
        // When
        ResponseEntity<ErrorResponse> response = restTemplate.postForEntity(
            "/api/v1/devices", 
            request, 
            ErrorResponse.class
        );
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
```

### 3. GraphQL Testing

**Purpose**: Test GraphQL queries, mutations, and data fetchers

```java
@SpringBootTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@DgsTest
class DeviceDataFetcherTest {
    
    @Autowired
    private DgsQueryExecutor dgsQueryExecutor;
    
    @MockBean
    private DeviceService deviceService;
    
    @Test
    void shouldFetchDeviceById() {
        // Given
        Device mockDevice = createMockDevice();
        when(deviceService.findById("device-123")).thenReturn(Optional.of(mockDevice));
        
        String query = """
            query GetDevice($id: ID!) {
                device(id: $id) {
                    id
                    name
                    status
                    organization {
                        id
                        name
                    }
                }
            }
            """;
        
        // When
        ExecutionResult result = dgsQueryExecutor.executeAndExtractJsonPath(
            query, 
            "data.device",
            Map.of("id", "device-123")
        );
        
        // Then
        assertThat(result.<String>getData()).isNotNull();
        assertThat(result.<String>getPath("$.id")).isEqualTo("device-123");
        assertThat(result.<String>getPath("$.name")).isEqualTo("Test Device");
        assertThat(result.<String>getPath("$.status")).isEqualTo("ONLINE");
    }
    
    @Test
    void shouldHandleDeviceNotFound() {
        // Given
        when(deviceService.findById("nonexistent")).thenReturn(Optional.empty());
        
        String query = """
            query GetDevice($id: ID!) {
                device(id: $id) {
                    id
                    name
                }
            }
            """;
        
        // When
        ExecutionResult result = dgsQueryExecutor.executeAndExtractJsonPath(
            query,
            "errors",
            Map.of("id", "nonexistent")
        );
        
        // Then
        assertThat(result.getErrors()).hasSize(1);
        assertThat(result.getErrors().get(0).getMessage()).contains("Device not found");
    }
}
```

### 4. Frontend Component Testing

**Purpose**: Test Vue.js components and user interactions

```typescript
// DeviceCard.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import DeviceCard from '@/components/DeviceCard.vue'
import type { Device } from '@/types/device'

describe('DeviceCard', () => {
  const mockDevice: Device = {
    id: 'device-123',
    name: 'Test Server',
    status: 'ONLINE',
    type: 'SERVER',
    lastSeen: new Date('2024-01-15T10:00:00Z'),
    organization: {
      id: 'org-123',
      name: 'Test Organization'
    }
  }

  it('should render device information correctly', () => {
    // Given
    const wrapper = mount(DeviceCard, {
      props: { device: mockDevice }
    })

    // Then
    expect(wrapper.find('[data-test="device-name"]').text()).toBe('Test Server')
    expect(wrapper.find('[data-test="device-status"]').text()).toBe('ONLINE')
    expect(wrapper.find('[data-test="device-type"]').text()).toBe('SERVER')
  })

  it('should emit edit event when edit button is clicked', async () => {
    // Given
    const wrapper = mount(DeviceCard, {
      props: { device: mockDevice }
    })

    // When
    await wrapper.find('[data-test="edit-button"]').trigger('click')

    // Then
    expect(wrapper.emitted()).toHaveProperty('edit')
    expect(wrapper.emitted('edit')).toHaveLength(1)
    expect(wrapper.emitted('edit')![0]).toEqual([mockDevice])
  })

  it('should show loading state when updating', async () => {
    // Given
    const wrapper = mount(DeviceCard, {
      props: { 
        device: mockDevice,
        loading: true
      }
    })

    // Then
    expect(wrapper.find('[data-test="loading-spinner"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="edit-button"]').attributes('disabled')).toBeDefined()
  })

  it('should display correct status badge color', () => {
    // Test online status
    const onlineWrapper = mount(DeviceCard, {
      props: { 
        device: { ...mockDevice, status: 'ONLINE' }
      }
    })
    expect(onlineWrapper.find('[data-test="status-badge"]').classes()).toContain('badge-success')

    // Test offline status
    const offlineWrapper = mount(DeviceCard, {
      props: { 
        device: { ...mockDevice, status: 'OFFLINE' }
      }
    })
    expect(offlineWrapper.find('[data-test="status-badge"]').classes()).toContain('badge-danger')
  })
})
```

### 5. End-to-End Testing

**Purpose**: Test complete user workflows and system integration

```typescript
// devices.e2e.ts
import { test, expect } from '@playwright/test'

test.describe('Device Management', () => {
  test.beforeEach(async ({ page }) => {
    // Setup test data
    await page.route('**/api/graphql', route => {
      route.fulfill({
        json: {
          data: {
            devices: {
              edges: [
                {
                  node: {
                    id: 'device-123',
                    name: 'Test Server',
                    status: 'ONLINE',
                    type: 'SERVER'
                  }
                }
              ]
            }
          }
        }
      })
    })

    // Navigate to devices page
    await page.goto('/devices')
    await page.waitForLoadState('networkidle')
  })

  test('should display device list', async ({ page }) => {
    // Verify devices are displayed
    await expect(page.locator('[data-test="device-card"]')).toHaveCount(1)
    await expect(page.locator('[data-test="device-name"]')).toContainText('Test Server')
    await expect(page.locator('[data-test="device-status"]')).toContainText('ONLINE')
  })

  test('should create new device', async ({ page }) => {
    // Click create device button
    await page.click('[data-test="create-device-button"]')

    // Fill out device form
    await page.fill('[data-test="device-name-input"]', 'New Test Device')
    await page.selectOption('[data-test="device-type-select"]', 'WORKSTATION')
    await page.fill('[data-test="device-description-input"]', 'Test description')

    // Submit form
    await page.click('[data-test="submit-button"]')

    // Verify success notification
    await expect(page.locator('.toast-success')).toContainText('Device created successfully')
    
    // Verify device appears in list
    await expect(page.locator('[data-test="device-card"]')).toHaveCount(2)
  })

  test('should handle device offline status', async ({ page }) => {
    // Mock device with offline status
    await page.route('**/api/graphql', route => {
      route.fulfill({
        json: {
          data: {
            device: {
              id: 'device-123',
              name: 'Test Server',
              status: 'OFFLINE',
              lastSeen: '2024-01-15T09:00:00Z'
            }
          }
        }
      })
    })

    // Navigate to device details
    await page.click('[data-test="device-card"]:first-child')

    // Verify offline status is displayed
    await expect(page.locator('[data-test="device-status"]')).toContainText('OFFLINE')
    await expect(page.locator('[data-test="last-seen"]')).toContainText('1 hour ago')

    // Verify offline-specific UI elements
    await expect(page.locator('[data-test="offline-warning"]')).toBeVisible()
    await expect(page.locator('[data-test="reconnect-button"]')).toBeVisible()
  })
})
```

## Test Data Management

### 1. Test Fixtures

Create reusable test data:

```java
@Component
public class TestDataFactory {
    
    public static Device createTestDevice() {
        return Device.builder()
            .id("device-" + UUID.randomUUID())
            .name("Test Device")
            .type(DeviceType.WORKSTATION)
            .status(DeviceStatus.ONLINE)
            .organizationId("org-123")
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();
    }
    
    public static Organization createTestOrganization() {
        return Organization.builder()
            .id("org-" + UUID.randomUUID())
            .name("Test Organization")
            .website("https://test-org.com")
            .createdAt(Instant.now())
            .build();
    }
    
    public static User createTestUser(String organizationId) {
        return User.builder()
            .id("user-" + UUID.randomUUID())
            .email("test@example.com")
            .firstName("Test")
            .lastName("User")
            .organizationId(organizationId)
            .roles(List.of(Role.TECHNICIAN))
            .createdAt(Instant.now())
            .build();
    }
}
```

### 2. Database Seeding

```java
@TestConfiguration
public class TestDataConfiguration {
    
    @EventListener
    public void handleApplicationReady(ApplicationReadyEvent event) {
        if (Arrays.asList(environment.getActiveProfiles()).contains("test")) {
            seedTestData();
        }
    }
    
    private void seedTestData() {
        // Create test organization
        Organization testOrg = TestDataFactory.createTestOrganization();
        organizationRepository.save(testOrg);
        
        // Create test users
        User adminUser = TestDataFactory.createTestUser(testOrg.getId());
        adminUser.setRoles(List.of(Role.ADMIN));
        userRepository.save(adminUser);
        
        // Create test devices
        for (int i = 0; i < 5; i++) {
            Device device = TestDataFactory.createTestDevice();
            device.setOrganizationId(testOrg.getId());
            device.setName("Test Device " + (i + 1));
            deviceRepository.save(device);
        }
    }
}
```

### 3. Mock Data for Frontend

```typescript
// src/test/mocks/mockData.ts
export const mockDevices: Device[] = [
  {
    id: 'device-1',
    name: 'Web Server 01',
    type: 'SERVER',
    status: 'ONLINE',
    lastSeen: new Date('2024-01-15T10:00:00Z'),
    organization: {
      id: 'org-1',
      name: 'Acme Corp'
    }
  },
  {
    id: 'device-2',
    name: 'Database Server',
    type: 'SERVER',
    status: 'OFFLINE',
    lastSeen: new Date('2024-01-15T09:00:00Z'),
    organization: {
      id: 'org-1',
      name: 'Acme Corp'
    }
  }
]

export const mockOrganizations: Organization[] = [
  {
    id: 'org-1',
    name: 'Acme Corp',
    website: 'https://acme-corp.com',
    deviceCount: 25,
    activeDevices: 20
  }
]

// MSW handlers for API mocking
export const handlers = [
  rest.post('/api/graphql', (req, res, ctx) => {
    const { query } = req.body as any
    
    if (query.includes('devices')) {
      return res(
        ctx.json({
          data: {
            devices: {
              edges: mockDevices.map(device => ({ node: device }))
            }
          }
        })
      )
    }
    
    if (query.includes('organizations')) {
      return res(
        ctx.json({
          data: {
            organizations: {
              edges: mockOrganizations.map(org => ({ node: org }))
            }
          }
        })
      )
    }
    
    return res(ctx.json({ data: {} }))
  })
]
```

## Test Execution and CI/CD

### Running Tests Locally

#### Backend Tests
```bash
# Run all unit tests
mvn test

# Run specific test class
mvn test -Dtest=DeviceServiceTest

# Run tests with coverage
mvn test jacoco:report

# Run integration tests only
mvn test -Dgroups=integration

# Run tests in parallel
mvn test -T 4

# Skip tests during build
mvn install -DskipTests
```

#### Frontend Tests
```bash
cd openframe/services/openframe-frontend

# Run unit tests
npm run test:unit

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run e2e tests
npm run test:e2e

# Run specific test file
npm run test:unit -- DeviceCard.test.ts
```

### CI/CD Pipeline Integration

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:7.0
        ports:
          - 27017:27017
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379

    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Java 21
      uses: actions/setup-java@v4
      with:
        java-version: '21'
        distribution: 'temurin'
        
    - name: Cache Maven dependencies
      uses: actions/cache@v3
      with:
        path: ~/.m2
        key: ${{ runner.os }}-m2-${{ hashFiles('**/pom.xml') }}
        
    - name: Run unit tests
      run: mvn test -Dspring.profiles.active=test
      
    - name: Run integration tests
      run: mvn test -Dgroups=integration -Dspring.profiles.active=test
      
    - name: Generate test report
      run: mvn jacoco:report
      
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: |
        cd openframe/services/openframe-frontend
        npm ci
        
    - name: Run unit tests
      run: |
        cd openframe/services/openframe-frontend
        npm run test:unit
        
    - name: Run component tests
      run: |
        cd openframe/services/openframe-frontend
        npm run test:component
        
    - name: Build application
      run: |
        cd openframe/services/openframe-frontend
        npm run build

  e2e-tests:
    needs: [backend-tests, frontend-tests]
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Start application stack
      run: docker-compose up -d
      
    - name: Wait for services
      run: ./scripts/wait-for-services.sh
      
    - name: Run E2E tests
      run: |
        cd openframe/services/openframe-frontend
        npm run test:e2e
        
    - name: Upload test artifacts
      uses: actions/upload-artifact@v3
      if: failure()
      with:
        name: playwright-report
        path: openframe/services/openframe-frontend/playwright-report/
```

## Test Quality and Coverage

### Coverage Requirements

- **Unit Tests**: Minimum 80% line coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: Major user journeys covered

### Coverage Monitoring

```bash
# Generate coverage reports
mvn jacoco:report

# View coverage report
open target/site/jacoco/index.html

# Coverage thresholds in pom.xml
<plugin>
  <groupId>org.jacoco</groupId>
  <artifactId>jacoco-maven-plugin</artifactId>
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
</plugin>
```

## Testing Best Practices

### 1. Test Organization

```java
// Use descriptive test names
@Test
@DisplayName("Should return empty list when no devices exist for organization")
void shouldReturnEmptyListWhenNoDevicesExistForOrganization() {
    // Test implementation
}

// Group related tests
@Nested
@DisplayName("Device Creation")
class DeviceCreation {
    
    @Test
    @DisplayName("Should create device with valid data")
    void shouldCreateDeviceWithValidData() {
        // Test implementation
    }
    
    @Test
    @DisplayName("Should reject device with invalid name")
    void shouldRejectDeviceWithInvalidName() {
        // Test implementation
    }
}
```

### 2. Test Data Isolation

```java
@Transactional
@Rollback
class DeviceRepositoryTest {
    
    @BeforeEach
    void setUp() {
        // Clean test data before each test
        deviceRepository.deleteAll();
    }
    
    @Test
    void testDeviceCreation() {
        // Test with fresh data
    }
}
```

### 3. Async Testing

```java
@Test
void shouldProcessEventAsynchronously() {
    // Given
    DeviceEvent event = createTestEvent();
    
    // When
    eventProcessor.processEvent(event);
    
    // Then - Wait for async processing
    await().atMost(Duration.ofSeconds(5))
           .until(() -> eventRepository.existsByEventId(event.getId()));
    
    // Verify final state
    Event savedEvent = eventRepository.findByEventId(event.getId());
    assertThat(savedEvent.getStatus()).isEqualTo(EventStatus.PROCESSED);
}
```

### 4. Error Testing

```java
@Test
void shouldHandleExternalServiceFailure() {
    // Given
    when(externalService.getData()).thenThrow(new ServiceUnavailableException());
    
    // When & Then
    assertThatThrownBy(() -> businessService.processData())
        .isInstanceOf(DataProcessingException.class)
        .hasMessage("Failed to process data due to external service failure")
        .hasCauseInstanceOf(ServiceUnavailableException.class);
    
    // Verify fallback behavior
    verify(fallbackService).handleFailure(any());
}
```

## Performance Testing

### Load Testing Setup

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class PerformanceTest {
    
    @Test
    void shouldHandleConcurrentDeviceRequests() throws InterruptedException {
        int threadCount = 50;
        int requestsPerThread = 100;
        CountDownLatch latch = new CountDownLatch(threadCount);
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        
        List<Future<Void>> futures = new ArrayList<>();
        
        for (int i = 0; i < threadCount; i++) {
            Future<Void> future = executor.submit(() -> {
                try {
                    for (int j = 0; j < requestsPerThread; j++) {
                        ResponseEntity<String> response = restTemplate.getForEntity(
                            "/api/v1/devices", String.class);
                        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
                    }
                } finally {
                    latch.countDown();
                }
                return null;
            });
            futures.add(future);
        }
        
        // Wait for all requests to complete
        latch.await(30, TimeUnit.SECONDS);
        
        // Verify no exceptions occurred
        for (Future<Void> future : futures) {
            assertThatNoException().isThrownBy(future::get);
        }
    }
}
```

## Troubleshooting Tests

### Common Issues

#### Flaky Tests
```java
// Use deterministic timestamps
@Test
void shouldCalculateMetricsCorrectly() {
    // Use fixed time for testing
    Clock fixedClock = Clock.fixed(Instant.parse("2024-01-15T10:00:00Z"), ZoneOffset.UTC);
    when(clockProvider.getClock()).thenReturn(fixedClock);
    
    // Test with predictable time
}

// Avoid thread timing issues
@Test
void shouldHandleAsyncOperation() {
    // Use explicit synchronization instead of Thread.sleep()
    await().atMost(Duration.ofSeconds(10))
           .pollInterval(Duration.ofMillis(100))
           .until(() -> operationCompleted());
}
```

#### Database Issues
```java
// Ensure proper test isolation
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class RepositoryTest {
    
    @Container
    static MongoDBContainer mongodb = new MongoDBContainer("mongo:7.0");
    
    // Tests automatically get fresh database
}
```

## Next Steps

Continue improving your testing skills:

1. **[Contributing Guidelines](../contributing/guidelines.md)** - Learn about code quality standards
2. **[Local Development](../setup/local-development.md)** - Set up your development environment  
3. **[Architecture Overview](../architecture/overview.md)** - Understand the system design

## Resources

- **[JUnit 5 Documentation](https://junit.org/junit5/docs/current/user-guide/)**
- **[Mockito Documentation](https://javadoc.io/doc/org.mockito/mockito-core/latest/org/mockito/Mockito.html)**
- **[Spring Boot Testing](https://docs.spring.io/spring-boot/docs/current/reference/html/spring-boot-features.html#boot-features-testing)**
- **[Vue Test Utils](https://vue-test-utils.vuejs.org/)**
- **[Playwright Documentation](https://playwright.dev/)**

---

**Happy testing!** 🧪 A solid testing strategy ensures OpenFrame remains reliable and maintainable as it evolves.