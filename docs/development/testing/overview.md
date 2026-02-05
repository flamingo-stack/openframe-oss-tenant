# Testing Overview

OpenFrame follows a comprehensive testing strategy that ensures reliability, maintainability, and confidence in deployments. This guide covers our testing approach, tools, and best practices across the entire platform.

## Testing Philosophy

Our testing strategy follows the **Testing Pyramid** principle with emphasis on:
- **Fast feedback loops** through unit and integration tests
- **High confidence** through comprehensive test coverage
- **Realistic testing** using TestContainers and real dependencies
- **Automated testing** integrated into CI/CD pipelines

```mermaid
pyramid
    title Testing Pyramid
    "E2E Tests" : 10
    "Integration Tests" : 30
    "Unit Tests" : 60
```

## Testing Stack

### Backend Testing (Java/Spring Boot)

| Testing Type | Framework | Purpose |
|--------------|-----------|---------|
| **Unit Tests** | JUnit 5 + Mockito | Service logic, utilities, validation |
| **Integration Tests** | Spring Boot Test + TestContainers | Service interactions, database operations |
| **Contract Tests** | Spring Cloud Contract | API contract verification |
| **Performance Tests** | JMeter / K6 | Load testing and performance profiling |

### Frontend Testing (Vue.js/TypeScript)

| Testing Type | Framework | Purpose |
|--------------|-----------|---------|
| **Unit Tests** | Vitest + Vue Test Utils | Component logic, composables, utilities |
| **Component Tests** | Vue Testing Library | Component integration and behavior |
| **E2E Tests** | Playwright | User journeys and browser interaction |
| **Visual Tests** | Chromatic / Percy | UI regression detection |

### Infrastructure Testing

| Testing Type | Tool | Purpose |
|--------------|------|---------|
| **Container Tests** | TestContainers | Database and service integration |
| **API Tests** | REST Assured / Bruno | External API integration |
| **Security Tests** | OWASP ZAP / Snyk | Vulnerability scanning |

## Backend Testing Strategy

### Unit Testing

Unit tests focus on **individual components** in isolation, with external dependencies mocked.

#### Test Structure and Naming

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private OrganizationService organizationService;
    
    @InjectMocks
    private UserService userService;
    
    @Test
    @DisplayName("Should create user successfully when valid data provided")
    void shouldCreateUserSuccessfully_WhenValidDataProvided() {
        // Given
        CreateUserRequest request = createValidUserRequest();
        Organization organization = createTestOrganization();
        User expectedUser = createExpectedUser();
        
        when(organizationService.findById(request.getOrganizationId()))
            .thenReturn(organization);
        when(userRepository.save(any(User.class)))
            .thenReturn(expectedUser);
        
        // When
        UserResponse result = userService.createUser(request);
        
        // Then
        assertThat(result)
            .isNotNull()
            .extracting(UserResponse::getName, UserResponse::getEmail)
            .containsExactly(expectedUser.getName(), expectedUser.getEmail());
            
        verify(userRepository).save(argThat(user -> 
            user.getName().equals(request.getName()) &&
            user.getEmail().equals(request.getEmail())
        ));
    }
    
    @Test
    @DisplayName("Should throw exception when organization not found")
    void shouldThrowException_WhenOrganizationNotFound() {
        // Given
        CreateUserRequest request = createValidUserRequest();
        when(organizationService.findById(request.getOrganizationId()))
            .thenThrow(new OrganizationNotFoundException("Organization not found"));
        
        // When & Then
        assertThatThrownBy(() -> userService.createUser(request))
            .isInstanceOf(OrganizationNotFoundException.class)
            .hasMessage("Organization not found");
            
        verify(userRepository, never()).save(any());
    }
}
```

#### Test Data Builders

Use the **Builder Pattern** for complex test data:

```java
public class UserTestDataBuilder {
    
    private String name = "John Doe";
    private String email = "john.doe@example.com";
    private UserRole role = UserRole.USER;
    private String organizationId = "org_123";
    
    public static UserTestDataBuilder aUser() {
        return new UserTestDataBuilder();
    }
    
    public UserTestDataBuilder withName(String name) {
        this.name = name;
        return this;
    }
    
    public UserTestDataBuilder withEmail(String email) {
        this.email = email;
        return this;
    }
    
    public UserTestDataBuilder withRole(UserRole role) {
        this.role = role;
        return this;
    }
    
    public UserTestDataBuilder withOrganizationId(String organizationId) {
        this.organizationId = organizationId;
        return this;
    }
    
    public User build() {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setRole(role);
        user.setOrganizationId(organizationId);
        user.setCreatedAt(Instant.now());
        user.setUpdatedAt(Instant.now());
        return user;
    }
    
    public CreateUserRequest buildRequest() {
        return CreateUserRequest.builder()
            .name(name)
            .email(email)
            .role(role)
            .organizationId(organizationId)
            .build();
    }
}
```

Usage in tests:
```java
@Test
void shouldCreateAdminUser_WhenAdminRoleSpecified() {
    // Given
    User adminUser = aUser()
        .withName("Admin User")
        .withEmail("admin@acme.com")
        .withRole(UserRole.ADMIN)
        .build();
        
    CreateUserRequest request = aUser()
        .withRole(UserRole.ADMIN)
        .buildRequest();
    
    // Test implementation...
}
```

### Integration Testing

Integration tests verify **service interactions** with real database and messaging components using TestContainers.

#### TestContainers Configuration

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class UserServiceIntegrationTest {
    
    @Container
    static MongoDBContainer mongoDBContainer = new MongoDBContainer("mongo:7.0")
        .withReuse(true);
    
    @Container
    static GenericContainer<?> redisContainer = new GenericContainer<>("redis:7-alpine")
        .withExposedPorts(6379)
        .withReuse(true);
        
    @Container
    static KafkaContainer kafkaContainer = new KafkaContainer(
        DockerImageName.parse("confluentinc/cp-kafka:7.4.0")
    ).withReuse(true);
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", mongoDBContainer::getReplicaSetUrl);
        registry.add("spring.data.redis.host", redisContainer::getHost);
        registry.add("spring.data.redis.port", () -> redisContainer.getMappedPort(6379));
        registry.add("spring.kafka.bootstrap-servers", kafkaContainer::getBootstrapServers);
    }
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private TestKafkaTemplate<String, Object> kafkaTemplate;
    
    @Test
    @DisplayName("Should persist user to database and publish event")
    void shouldPersistUserAndPublishEvent() {
        // Given
        CreateUserRequest request = aUser()
            .withEmail("integration@test.com")
            .buildRequest();
        
        // When
        ResponseEntity<UserResponse> response = restTemplate.postForEntity(
            "/api/users", request, UserResponse.class);
        
        // Then - HTTP Response
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        
        // Then - Database Persistence
        Optional<User> savedUser = userRepository.findByEmail("integration@test.com");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getName()).isEqualTo(request.getName());
        
        // Then - Event Publishing
        ConsumerRecord<String, Object> publishedEvent = kafkaTemplate.receive(
            "user-events", Duration.ofSeconds(5));
        assertThat(publishedEvent).isNotNull();
        assertThat(publishedEvent.key()).isEqualTo(savedUser.get().getId());
    }
}
```

#### GraphQL Integration Testing

```java
@SpringBootTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class DeviceGraphQLIntegrationTest extends BaseIntegrationTest {
    
    @Autowired
    private WebTestClient webTestClient;
    
    @Test
    @DisplayName("Should return paginated devices for organization")
    void shouldReturnPaginatedDevicesForOrganization() {
        // Given
        Organization org = createAndSaveOrganization();
        List<Device> devices = createAndSaveDevices(org.getId(), 5);
        
        String query = """
            query GetDevices($organizationId: ID!, $first: Int!) {
              devices(organizationId: $organizationId, first: $first) {
                edges {
                  node {
                    id
                    name
                    deviceType
                    status
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }
            """;
        
        // When
        WebTestClient.ResponseSpec response = webTestClient
            .post()
            .uri("/graphql")
            .contentType(MediaType.APPLICATION_JSON)
            .bodyValue(Map.of(
                "query", query,
                "variables", Map.of(
                    "organizationId", org.getId(),
                    "first", 3
                )
            ))
            .exchange();
        
        // Then
        response
            .expectStatus().isOk()
            .expectBody()
            .jsonPath("$.data.devices.edges").isArray()
            .jsonPath("$.data.devices.edges.length()").isEqualTo(3)
            .jsonPath("$.data.devices.pageInfo.hasNextPage").isEqualTo(true)
            .jsonPath("$.data.devices.edges[0].node.name").isNotEmpty();
    }
}
```

### Performance Testing

#### JMeter Test Plans

Create JMeter test plans for API load testing:

```xml
<!-- DeviceAPI-LoadTest.jmx -->
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2">
  <hashTree>
    <TestPlan testname="Device API Load Test">
      <elementProp name="TestPlan.arguments" elementType="Arguments" guiclass="ArgumentsPanel">
        <collectionProp name="Arguments.arguments">
          <elementProp name="baseUrl" elementType="Argument">
            <stringProp name="Argument.name">baseUrl</stringProp>
            <stringProp name="Argument.value">http://localhost:8080</stringProp>
          </elementProp>
        </collectionProp>
      </elementProp>
    </TestPlan>
    
    <hashTree>
      <ThreadGroup testname="Device Queries Thread Group">
        <stringProp name="ThreadGroup.num_threads">50</stringProp>
        <stringProp name="ThreadGroup.ramp_time">30</stringProp>
        <stringProp name="ThreadGroup.duration">300</stringProp>
        
        <hashTree>
          <HTTPSamplerProxy testname="Get Devices GraphQL">
            <stringProp name="HTTPSampler.domain">${baseUrl}</stringProp>
            <stringProp name="HTTPSampler.path">/graphql</stringProp>
            <stringProp name="HTTPSampler.method">POST</stringProp>
            <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
          </HTTPSamplerProxy>
        </hashTree>
      </ThreadGroup>
    </hashTree>
  </hashTree>
</jmeterTestPlan>
```

#### K6 Performance Tests

```javascript
// device-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 20 }, // Ramp up
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 50 }, // Ramp to 50 users  
    { duration: '5m', target: 50 }, // Stay at 50 users
    { duration: '2m', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests under 1s
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export default function () {
  // GraphQL query for devices
  const query = `
    query GetDevices($first: Int!) {
      devices(first: $first) {
        edges {
          node {
            id
            name
            deviceType
            status
          }
        }
      }
    }
  `;
  
  const response = http.post(`${BASE_URL}/graphql`, JSON.stringify({
    query: query,
    variables: { first: 10 }
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + getAuthToken(),
    },
  });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has data': (r) => {
      const body = JSON.parse(r.body);
      return body.data && body.data.devices;
    },
  });
  
  sleep(1);
}

function getAuthToken() {
  // Implementation to get auth token
  return 'test-token';
}
```

Run performance tests:
```bash
# K6 performance test
k6 run --vus 50 --duration 5m device-load-test.js

# JMeter performance test
jmeter -n -t DeviceAPI-LoadTest.jmx -l results.jtl
```

## Frontend Testing Strategy

### Component Unit Testing

```typescript
// UserCard.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import UserCard from '@/components/UserCard.vue'
import { User, UserRole } from '@/types/user'

describe('UserCard', () => {
  const mockUser: User = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    role: UserRole.ADMIN,
    organizationId: 'org_1',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  it('renders user information correctly', () => {
    const wrapper = mount(UserCard, {
      props: {
        user: mockUser
      }
    })

    expect(wrapper.text()).toContain('John Doe')
    expect(wrapper.text()).toContain('john@example.com')
    expect(wrapper.find('[data-testid="user-role"]').text()).toBe('ADMIN')
  })

  it('emits edit event when edit button clicked', async () => {
    const wrapper = mount(UserCard, {
      props: {
        user: mockUser
      }
    })

    await wrapper.find('[data-testid="edit-button"]').trigger('click')

    expect(wrapper.emitted('edit')).toBeTruthy()
    expect(wrapper.emitted('edit')![0]).toEqual([mockUser])
  })

  it('shows loading state when deleting user', async () => {
    const wrapper = mount(UserCard, {
      props: {
        user: mockUser,
        isDeleting: true
      }
    })

    expect(wrapper.find('[data-testid="loading-spinner"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="delete-button"]').attributes('disabled')).toBeDefined()
  })
})
```

### Composables Testing

```typescript
// useDevices.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDevices } from '@/composables/useDevices'
import { useDevicesStore } from '@/stores/devices'

// Mock GraphQL client
vi.mock('@/lib/graphql-client', () => ({
  apolloClient: {
    query: vi.fn()
  }
}))

describe('useDevices', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('fetches devices and updates store', async () => {
    const mockDevices = [
      { id: '1', name: 'Device 1', status: 'ONLINE' },
      { id: '2', name: 'Device 2', status: 'OFFLINE' }
    ]

    const { apolloClient } = await import('@/lib/graphql-client')
    vi.mocked(apolloClient.query).mockResolvedValue({
      data: {
        devices: {
          edges: mockDevices.map(device => ({ node: device }))
        }
      }
    })

    const { devices, loading, fetchDevices } = useDevices()
    const store = useDevicesStore()

    expect(loading.value).toBe(false)
    expect(devices.value).toEqual([])

    await fetchDevices('org_1')

    expect(loading.value).toBe(false)
    expect(devices.value).toEqual(mockDevices)
    expect(store.devices).toEqual(mockDevices)
  })

  it('handles fetch error gracefully', async () => {
    const { apolloClient } = await import('@/lib/graphql-client')
    vi.mocked(apolloClient.query).mockRejectedValue(new Error('Network error'))

    const { devices, error, fetchDevices } = useDevices()

    await fetchDevices('org_1')

    expect(devices.value).toEqual([])
    expect(error.value).toBe('Failed to fetch devices')
  })
})
```

### End-to-End Testing

```typescript
// e2e/device-management.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Device Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin user
    await page.goto('/auth/login')
    await page.fill('[data-testid="email-input"]', 'admin@test.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    
    // Wait for dashboard to load
    await expect(page).toHaveURL('/dashboard')
  })

  test('should display devices list', async ({ page }) => {
    await page.goto('/devices')
    
    // Wait for devices to load
    await expect(page.locator('[data-testid="devices-table"]')).toBeVisible()
    
    // Check table headers
    await expect(page.locator('th')).toContainText(['Name', 'Type', 'Status', 'Last Seen'])
    
    // Check at least one device row
    await expect(page.locator('[data-testid="device-row"]').first()).toBeVisible()
  })

  test('should filter devices by status', async ({ page }) => {
    await page.goto('/devices')
    
    // Open filter dropdown
    await page.click('[data-testid="status-filter"]')
    await page.click('[data-testid="filter-online"]')
    
    // Verify filtering applied
    await expect(page.locator('[data-testid="device-status"]')).toContainText('ONLINE')
    
    // Verify URL updated with filter
    await expect(page).toHaveURL(/.*status=online.*/)
  })

  test('should navigate to device details', async ({ page }) => {
    await page.goto('/devices')
    
    // Click on first device
    const firstDevice = page.locator('[data-testid="device-row"]').first()
    const deviceName = await firstDevice.locator('[data-testid="device-name"]').textContent()
    
    await firstDevice.click()
    
    // Verify navigation to device details
    await expect(page).toHaveURL(/\/devices\/details\/.*/)
    await expect(page.locator('[data-testid="device-detail-name"]')).toContainText(deviceName!)
  })

  test('should search devices', async ({ page }) => {
    await page.goto('/devices')
    
    // Enter search term
    await page.fill('[data-testid="device-search"]', 'laptop')
    await page.press('[data-testid="device-search"]', 'Enter')
    
    // Wait for search results
    await expect(page.locator('[data-testid="device-row"]')).toContainText('laptop', { ignoreCase: true })
    
    // Verify URL updated with search
    await expect(page).toHaveURL(/.*search=laptop.*/)
  })
})
```

## Running Tests

### Backend Test Execution

```bash
# Run all tests
mvn test

# Run specific test class
mvn test -Dtest=UserServiceTest

# Run tests with specific profile
mvn test -Dspring.profiles.active=test

# Run integration tests only
mvn test -Dtest=*IntegrationTest

# Run tests with coverage report
mvn test jacoco:report

# Skip unit tests, run integration tests only
mvn verify -DskipUnitTests=true
```

### Frontend Test Execution

```bash
cd openframe/services/openframe-frontend

# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run E2E tests (requires running services)
npm run e2e

# Run E2E tests in headless mode
npm run e2e:headless

# Type checking
npm run type-check
```

### CI/CD Integration

#### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

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
      
      - name: Run backend tests
        run: |
          mvn clean test -B
          mvn jacoco:report
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: ./target/site/jacoco/jacoco.xml

  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: 'openframe/services/openframe-frontend/package-lock.json'
      
      - name: Install dependencies
        run: |
          cd openframe/services/openframe-frontend
          npm ci
      
      - name: Run frontend tests
        run: |
          cd openframe/services/openframe-frontend
          npm run test:coverage
          npm run type-check
      
      - name: Run E2E tests
        run: |
          cd openframe/services/openframe-frontend
          npm run build
          npm run preview &
          npx wait-on http://localhost:4173
          npm run e2e:headless

  integration-tests:
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
      
      - name: Start services with Docker Compose
        run: |
          docker compose up -d
          sleep 30  # Wait for services to be ready
      
      - name: Run integration tests
        run: mvn verify -DskipUnitTests=true
      
      - name: Cleanup
        run: docker compose down
```

## Test Coverage Goals

### Coverage Targets

| Component | Unit Test Coverage | Integration Coverage | E2E Coverage |
|-----------|-------------------|---------------------|--------------|
| **Service Layer** | 85%+ | 70%+ | - |
| **Controller Layer** | 75%+ | 85%+ | - |
| **Repository Layer** | 60%+ | 90%+ | - |
| **Frontend Components** | 80%+ | - | 60%+ |
| **Frontend Composables** | 90%+ | - | - |
| **Critical User Journeys** | - | - | 95%+ |

### Coverage Reports

```bash
# Generate backend coverage report
mvn clean test jacoco:report
open target/site/jacoco/index.html

# Generate frontend coverage report  
cd openframe/services/openframe-frontend
npm run test:coverage
open coverage/index.html
```

## Best Practices

### Testing Best Practices

1. **AAA Pattern**: Arrange, Act, Assert structure
2. **Descriptive Names**: Test method names should describe the scenario
3. **Independent Tests**: Each test should run independently
4. **Test Data Management**: Use builders and factories for test data
5. **Mock External Dependencies**: Mock external services and APIs

### Performance Testing Guidelines

1. **Baseline Metrics**: Establish performance baselines
2. **Realistic Load**: Use production-like data volumes
3. **Environment Consistency**: Use consistent test environments
4. **Continuous Monitoring**: Run performance tests in CI/CD

### E2E Testing Tips

1. **Page Object Model**: Abstract page interactions
2. **Stable Selectors**: Use `data-testid` attributes
3. **Wait Strategies**: Use proper wait conditions
4. **Test Environment**: Use dedicated E2E environment
5. **Parallel Execution**: Run tests in parallel for speed

---

## Next Steps

1. **[Contributing Guidelines](../contributing/guidelines.md)** - Learn development workflow and code standards
2. **[Local Development Guide](../setup/local-development.md)** - Set up advanced development environment
3. **[Architecture Overview](../architecture/overview.md)** - Understand system design for better testing

---

**Need help with testing?** Join our OpenMSP Slack community: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA