# Testing Overview

OpenFrame employs a comprehensive testing strategy covering unit, integration, and end-to-end testing across all components. This guide explains our testing philosophy, structure, and best practices.

## Testing Philosophy

Our testing approach follows the **Test Pyramid** principle with emphasis on:

- **Fast Feedback**: Quick unit tests provide immediate feedback
- **Confidence**: Integration tests verify component interactions  
- **User Experience**: End-to-end tests validate complete user workflows
- **Quality Gates**: Automated testing prevents regression

```mermaid
pyramid
    title Testing Pyramid
    top "E2E Tests"
    middle "Integration Tests" 
    bottom "Unit Tests"
```

## Test Structure & Organization

### Test Directory Structure

```
openframe/
├── services/
│   ├── openframe-api/
│   │   ├── src/test/java/               # Unit & Integration tests
│   │   │   ├── unit/                    # Fast unit tests
│   │   │   ├── integration/             # Service integration tests
│   │   │   └── testcontainers/          # Database integration tests
│   │   └── src/test/resources/          # Test configurations
│   └── openframe-frontend/
│       ├── src/__tests__/               # Vue component tests
│       ├── cypress/                     # E2E tests
│       └── vitest.config.ts             # Test configuration
├── openframe-e2e-tests/                # Full system E2E tests
│   ├── src/test/java/                   # REST Assured tests
│   └── playwright/                      # Browser automation tests
└── clients/
    └── openframe-client/
        ├── src/                         # Rust unit tests (inline)
        └── tests/                       # Integration tests
```

## Unit Testing

### Java Service Unit Tests

We use **JUnit 5**, **Mockito**, and **Spring Boot Test** for Java unit testing.

#### Test Structure Example

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
    @DisplayName("Should find device by ID for current tenant")
    void shouldFindDeviceByIdForCurrentTenant() {
        // Given
        String tenantId = "tenant-123";
        String deviceId = "device-456";
        Device expectedDevice = Device.builder()
            .id(deviceId)
            .tenantId(tenantId)
            .name("Test Device")
            .build();
        
        when(deviceRepository.findByIdAndTenantId(deviceId, tenantId))
            .thenReturn(Optional.of(expectedDevice));
        
        // When
        try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
            tenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            
            Device result = deviceService.findById(deviceId);
            
            // Then
            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(deviceId);
            assertThat(result.getTenantId()).isEqualTo(tenantId);
        }
    }
    
    @Test
    @DisplayName("Should throw exception when device not found")
    void shouldThrowExceptionWhenDeviceNotFound() {
        // Given
        String tenantId = "tenant-123";
        String deviceId = "nonexistent-device";
        
        when(deviceRepository.findByIdAndTenantId(deviceId, tenantId))
            .thenReturn(Optional.empty());
        
        // When & Then
        try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
            tenantContext.when(TenantContext::getCurrentTenant).thenReturn(tenantId);
            
            assertThatThrownBy(() -> deviceService.findById(deviceId))
                .isInstanceOf(DeviceNotFoundException.class)
                .hasMessage("Device not found: " + deviceId);
        }
    }
}
```

#### Testing Multi-Tenant Logic

```java
@Test
@DisplayName("Should only return devices for current tenant")
void shouldOnlyReturnDevicesForCurrentTenant() {
    // Given
    String currentTenant = "tenant-123";
    String otherTenant = "tenant-456";
    
    List<Device> tenantDevices = List.of(
        createDevice("device-1", currentTenant),
        createDevice("device-2", currentTenant)
    );
    
    when(deviceRepository.findByTenantId(currentTenant))
        .thenReturn(tenantDevices);
    
    // When
    try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
        tenantContext.when(TenantContext::getCurrentTenant).thenReturn(currentTenant);
        
        List<Device> result = deviceService.findAll();
        
        // Then
        assertThat(result).hasSize(2);
        assertThat(result).allMatch(device -> device.getTenantId().equals(currentTenant));
    }
}
```

### Frontend Unit Tests (Vue.js)

We use **Vitest**, **Vue Test Utils**, and **Testing Library** for frontend testing.

#### Vue Component Test Example

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
    ipAddress: '192.168.1.100',
    osType: 'Linux',
    lastSeen: new Date('2024-01-01T10:00:00Z')
  }

  it('should render device information correctly', () => {
    // Given
    const wrapper = mount(DeviceCard, {
      props: { device: mockDevice }
    })

    // Then
    expect(wrapper.find('[data-testid="device-name"]').text()).toBe('Test Server')
    expect(wrapper.find('[data-testid="device-status"]').text()).toBe('ONLINE')
    expect(wrapper.find('[data-testid="device-ip"]').text()).toBe('192.168.1.100')
  })

  it('should emit device-selected event when clicked', async () => {
    // Given
    const wrapper = mount(DeviceCard, {
      props: { device: mockDevice }
    })

    // When
    await wrapper.find('[data-testid="device-card"]').trigger('click')

    // Then
    expect(wrapper.emitted('device-selected')).toBeTruthy()
    expect(wrapper.emitted('device-selected')![0]).toEqual([mockDevice])
  })

  it('should show offline status with correct styling', () => {
    // Given
    const offlineDevice = { ...mockDevice, status: 'OFFLINE' }
    const wrapper = mount(DeviceCard, {
      props: { device: offlineDevice }
    })

    // Then
    const statusElement = wrapper.find('[data-testid="device-status"]')
    expect(statusElement.text()).toBe('OFFLINE')
    expect(statusElement.classes()).toContain('status-offline')
  })
})
```

#### Composables Testing

```typescript
// useDevices.test.ts  
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDevices } from '@/composables/useDevices'
import { createTestingPinia } from '@pinia/testing'

describe('useDevices', () => {
  beforeEach(() => {
    createTestingPinia({
      createSpy: vi.fn
    })
  })

  it('should load devices on mount', async () => {
    // Given
    const mockGraphQL = vi.fn().mockResolvedValue({
      data: {
        devices: [
          { id: '1', name: 'Device 1' },
          { id: '2', name: 'Device 2' }
        ]
      }
    })

    // When
    const { devices, loading, loadDevices } = useDevices()
    await loadDevices()

    // Then  
    expect(loading.value).toBe(false)
    expect(devices.value).toHaveLength(2)
  })
})
```

### Rust Unit Tests

Rust tests are written inline with the code using `#[cfg(test)]` modules:

```rust
// src/services/device_service.rs
impl DeviceService {
    pub fn new(api_client: ApiClient) -> Self {
        Self { api_client }
    }
    
    pub async fn get_device(&self, device_id: &str) -> Result<Device, Error> {
        self.api_client
            .get(&format!("/devices/{}", device_id))
            .await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockall::predicate::*;

    #[tokio::test]
    async fn test_get_device_success() {
        // Given
        let mut mock_client = ApiClient::new();
        mock_client
            .expect_get()
            .with(eq("/devices/123"))
            .times(1)
            .returning(|_| {
                Ok(Device {
                    id: "123".to_string(),
                    name: "Test Device".to_string(),
                    status: DeviceStatus::Online,
                })
            });

        let service = DeviceService::new(mock_client);

        // When
        let result = service.get_device("123").await;

        // Then
        assert!(result.is_ok());
        let device = result.unwrap();
        assert_eq!(device.id, "123");
        assert_eq!(device.name, "Test Device");
    }

    #[tokio::test]
    async fn test_get_device_not_found() {
        // Given
        let mut mock_client = ApiClient::new();
        mock_client
            .expect_get()
            .with(eq("/devices/999"))
            .times(1)
            .returning(|_| Err(Error::NotFound));

        let service = DeviceService::new(mock_client);

        // When
        let result = service.get_device("999").await;

        // Then
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), Error::NotFound));
    }
}
```

## Integration Testing

### Database Integration Tests

We use **TestContainers** to test with real databases:

```java
@SpringBootTest
@Testcontainers
class DeviceRepositoryIntegrationTest {
    
    @Container
    static MongoDBContainer mongoContainer = new MongoDBContainer("mongo:7.0")
            .withExposedPorts(27017);
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", mongoContainer::getReplicaSetUrl);
    }
    
    @Autowired
    private DeviceRepository deviceRepository;
    
    @Test
    @DisplayName("Should save and retrieve device correctly")
    void shouldSaveAndRetrieveDevice() {
        // Given
        Device device = Device.builder()
            .tenantId("tenant-123")
            .name("Integration Test Device")
            .status(DeviceStatus.ONLINE)
            .build();
        
        // When
        Device saved = deviceRepository.save(device);
        Optional<Device> retrieved = deviceRepository.findById(saved.getId());
        
        // Then
        assertThat(retrieved).isPresent();
        assertThat(retrieved.get().getName()).isEqualTo("Integration Test Device");
        assertThat(retrieved.get().getTenantId()).isEqualTo("tenant-123");
    }
    
    @Test
    @DisplayName("Should enforce tenant isolation in queries")
    void shouldEnforceTenantIsolation() {
        // Given - Create devices for different tenants
        Device tenant1Device = createDevice("tenant-1", "Device 1");
        Device tenant2Device = createDevice("tenant-2", "Device 2");
        
        deviceRepository.save(tenant1Device);
        deviceRepository.save(tenant2Device);
        
        // When - Query for tenant-1 devices only
        List<Device> tenant1Devices = deviceRepository.findByTenantId("tenant-1");
        
        // Then - Should only return tenant-1 devices
        assertThat(tenant1Devices).hasSize(1);
        assertThat(tenant1Devices.get(0).getTenantId()).isEqualTo("tenant-1");
    }
}
```

### Service Integration Tests

Test service interactions with **@SpringBootTest**:

```java
@SpringBootTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb",
    "spring.jpa.hibernate.ddl-auto=create-drop"
})
class DeviceServiceIntegrationTest {
    
    @Autowired
    private DeviceService deviceService;
    
    @Autowired
    private OrganizationService organizationService;
    
    @Test
    @Transactional
    @DisplayName("Should create device with organization context")
    void shouldCreateDeviceWithOrganizationContext() {
        // Given
        Organization org = organizationService.create(createOrganization("Test Org"));
        CreateDeviceRequest request = CreateDeviceRequest.builder()
            .name("Test Device")
            .organizationId(org.getId())
            .build();
        
        // When
        try (MockedStatic<TenantContext> tenantContext = mockStatic(TenantContext.class)) {
            tenantContext.when(TenantContext::getCurrentTenant).thenReturn("tenant-123");
            
            Device device = deviceService.createDevice(request);
            
            // Then
            assertThat(device).isNotNull();
            assertThat(device.getName()).isEqualTo("Test Device");
            assertThat(device.getOrganizationId()).isEqualTo(org.getId());
            assertThat(device.getTenantId()).isEqualTo("tenant-123");
        }
    }
}
```

### API Integration Tests

Test GraphQL APIs with **@GraphQLTest**:

```java
@SpringBootTest
@AutoConfigureGraphQlTester
class DeviceGraphQLIntegrationTest {
    
    @Autowired
    private GraphQlTester graphQlTester;
    
    @MockBean
    private DeviceService deviceService;
    
    @Test
    @WithMockUser(roles = "USER")
    @DisplayName("Should query devices via GraphQL")
    void shouldQueryDevicesViaGraphQL() {
        // Given
        List<Device> mockDevices = List.of(
            createDevice("device-1", "Server 1"),
            createDevice("device-2", "Server 2")
        );
        
        when(deviceService.findDevices(any(), any())).thenReturn(mockDevices);
        
        // When & Then
        graphQlTester
            .documentName("devices-query")
            .variable("organizationId", "org-123")
            .execute()
            .path("devices")
            .entityList(Device.class)
            .hasSize(2)
            .path("devices[0].name")
            .entity(String.class)
            .isEqualTo("Server 1");
    }
}
```

## End-to-End Testing

### Full System E2E Tests

We use **REST Assured** for API-based E2E testing:

```java
// DevicesE2ETest.java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestMethodOrder(OrderAnnotation.class)
class DevicesE2ETest {
    
    @LocalServerPort
    private int port;
    
    private String baseUrl;
    private String authToken;
    
    @BeforeEach
    void setUp() {
        baseUrl = "http://localhost:" + port;
        RestAssured.baseURI = baseUrl;
        authToken = authenticateAndGetToken();
    }
    
    @Test
    @Order(1)
    @DisplayName("Should create organization and device")
    void shouldCreateOrganizationAndDevice() {
        // Create organization
        CreateOrganizationRequest orgRequest = CreateOrganizationRequest.builder()
            .name("E2E Test Organization")
            .contactEmail("test@example.com")
            .build();
        
        ValidatableResponse orgResponse = given()
            .header("Authorization", "Bearer " + authToken)
            .contentType(ContentType.JSON)
            .body(orgRequest)
        .when()
            .post("/api/organizations")
        .then()
            .statusCode(201);
            
        String organizationId = orgResponse.extract().path("id");
        
        // Create device
        CreateDeviceRequest deviceRequest = CreateDeviceRequest.builder()
            .name("E2E Test Device")
            .organizationId(organizationId)
            .build();
        
        given()
            .header("Authorization", "Bearer " + authToken)
            .contentType(ContentType.JSON)
            .body(deviceRequest)
        .when()
            .post("/api/devices")
        .then()
            .statusCode(201)
            .body("name", equalTo("E2E Test Device"))
            .body("organizationId", equalTo(organizationId));
    }
    
    @Test  
    @Order(2)
    @DisplayName("Should query devices via GraphQL")
    void shouldQueryDevicesViaGraphQL() {
        String graphqlQuery = """
            query GetDevices($organizationId: String!) {
                devices(filter: { organizationId: $organizationId }) {
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
        
        GraphQLRequest request = new GraphQLRequest(graphqlQuery, 
            Map.of("organizationId", "org-123"));
        
        given()
            .header("Authorization", "Bearer " + authToken)
            .contentType(ContentType.JSON)
            .body(request)
        .when()
            .post("/graphql")
        .then()
            .statusCode(200)
            .body("data.devices", hasSize(greaterThan(0)))
            .body("data.devices[0].name", notNullValue())
            .body("data.devices[0].organization.name", notNullValue());
    }
}
```

### Frontend E2E Tests (Cypress)

```typescript
// cypress/e2e/devices.cy.ts
describe('Devices Management', () => {
  beforeEach(() => {
    cy.login('admin@example.com', 'password123')
    cy.visit('/devices')
  })

  it('should display devices list', () => {
    cy.get('[data-testid="devices-table"]').should('be.visible')
    cy.get('[data-testid="device-row"]').should('have.length.at.least', 1)
  })

  it('should create new device', () => {
    cy.get('[data-testid="add-device-button"]').click()
    
    cy.get('[data-testid="device-name-input"]').type('New Test Device')
    cy.get('[data-testid="organization-select"]').select('Test Organization')
    cy.get('[data-testid="device-type-select"]').select('SERVER')
    
    cy.get('[data-testid="save-device-button"]').click()
    
    cy.get('[data-testid="success-message"]')
      .should('contain', 'Device created successfully')
    
    cy.get('[data-testid="devices-table"]')
      .should('contain', 'New Test Device')
  })

  it('should filter devices by status', () => {
    cy.get('[data-testid="status-filter"]').select('ONLINE')
    
    cy.get('[data-testid="device-row"]').each(($row) => {
      cy.wrap($row)
        .find('[data-testid="device-status"]')
        .should('contain', 'ONLINE')
    })
  })

  it('should navigate to device details', () => {
    cy.get('[data-testid="device-row"]').first().click()
    
    cy.url().should('include', '/devices/')
    cy.get('[data-testid="device-details"]').should('be.visible')
    cy.get('[data-testid="device-metrics"]').should('be.visible')
  })
})
```

## Running Tests

### Command Line Execution

```bash
# Unit tests only
mvn test

# Integration tests
mvn test -Dgroups=integration

# All tests including E2E
mvn verify

# Specific test class
mvn test -Dtest=DeviceServiceTest

# Specific test method
mvn test -Dtest=DeviceServiceTest#shouldFindDeviceById

# Run with specific profile
mvn test -Dspring.profiles.active=test

# Generate coverage report
mvn clean verify jacoco:report
```

### Frontend Tests

```bash
cd openframe/services/openframe-frontend

# Unit tests
npm run test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E tests in headless mode
npm run test:e2e:headless
```

### Rust Tests

```bash
cd clients/openframe-client

# Unit tests
cargo test

# Integration tests
cargo test --test integration

# With output
cargo test -- --nocapture

# Specific test
cargo test test_get_device

# With coverage
cargo tarpaulin --all-features --workspace
```

## Test Configuration

### Application Test Properties

```yaml
# application-test.yml
spring:
  datasource:
    url: jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop
    show-sql: true
    
  data:
    mongodb:
      host: localhost
      port: 0  # Use random port for TestContainers
      
logging:
  level:
    com.openframe: DEBUG
    org.springframework.test: DEBUG
    
test:
  tenant:
    default: test-tenant-123
  auth:
    mock-enabled: true
```

### Test Containers Configuration

```java
@TestConfiguration
public class TestContainersConfig {
    
    @Bean
    @ServiceConnection
    public MongoDBContainer mongoDBContainer() {
        return new MongoDBContainer("mongo:7.0")
            .withStartupTimeout(Duration.ofMinutes(2));
    }
    
    @Bean  
    @ServiceConnection
    public GenericContainer<?> redisContainer() {
        return new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379)
            .withStartupTimeout(Duration.ofMinutes(1));
    }
}
```

## Coverage Requirements

### Coverage Thresholds

```xml
<!-- pom.xml - JaCoCo configuration -->
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <executions>
        <execution>
            <id>check</id>
            <goals>
                <goal>check</goal>
            </goals>
            <configuration>
                <rules>
                    <rule>
                        <element>BUNDLE</element>
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

### Frontend Coverage

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      },
      exclude: [
        'src/**/*.stories.ts',
        'src/**/*.test.ts',
        'src/types/**/*'
      ]
    }
  }
})
```

## Testing Best Practices

### ✅ DO's

1. **Write Tests First**: Follow TDD when possible
2. **Test Behavior**: Focus on what the code does, not how
3. **Use Descriptive Names**: Test names should explain the scenario
4. **Follow AAA Pattern**: Arrange, Act, Assert structure
5. **Mock External Dependencies**: Isolate units under test
6. **Test Edge Cases**: Null values, empty collections, boundary conditions
7. **Verify Multi-Tenant Isolation**: Always test tenant boundaries

### ❌ DON'Ts  

1. **Don't Test Implementation Details**: Test public interfaces
2. **Don't Write Flaky Tests**: Ensure tests are deterministic  
3. **Don't Skip Test Cleanup**: Clean up resources after tests
4. **Don't Test Third-Party Code**: Focus on your business logic
5. **Don't Ignore Test Failures**: Fix or remove failing tests
6. **Don't Mock Everything**: Use real objects when reasonable

### Example Test Structure

```java
@DisplayName("DeviceService - Device Management")
class DeviceServiceTest {
    
    @Nested
    @DisplayName("Finding devices")
    class FindingDevices {
        
        @Test
        @DisplayName("Should return devices for current tenant only")
        void shouldReturnDevicesForCurrentTenantOnly() {
            // Given - Arrange test data
            // When - Execute the operation  
            // Then - Assert expected outcomes
        }
        
        @Test
        @DisplayName("Should throw exception when tenant has no access")
        void shouldThrowExceptionWhenTenantHasNoAccess() {
            // Test implementation
        }
    }
    
    @Nested  
    @DisplayName("Creating devices")
    class CreatingDevices {
        // Creation-related tests
    }
}
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up JDK 21
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
        run: mvn test
        
      - name: Generate coverage report
        run: mvn jacoco:report
        
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      mongodb:
        image: mongo:7.0
        ports:
          - 27017:27017
    steps:
      - uses: actions/checkout@v4
      - name: Run integration tests
        run: mvn verify -Dgroups=integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Start application stack
        run: docker-compose up -d
      - name: Run E2E tests
        run: mvn test -Dgroups=e2e
```

## Next Steps

With comprehensive testing knowledge:

1. **[Contributing Guidelines](../contributing/guidelines.md)** - Learn the contribution workflow
2. **[API Documentation](../../reference/api/)** - Explore detailed API specifications  
3. **Practice**: Start writing tests for existing functionality

---

**🧪 Comprehensive testing ensures OpenFrame's reliability and maintainability.** Following these patterns and practices will help you contribute high-quality, well-tested code to the platform.