# Testing Overview

This guide covers OpenFrame's comprehensive testing strategy, including unit tests, integration tests, end-to-end tests, and testing best practices. Learn how to run tests, write new test cases, and maintain high code quality.

## Testing Strategy

OpenFrame employs a multi-layered testing approach to ensure reliability, security, and performance:

```mermaid
pyramid
    title Testing Pyramid
    
    "E2E Tests" : 10
    "Integration Tests" : 30  
    "Unit Tests" : 60
```

### Testing Layers

| Test Type | Coverage | Tools | Purpose |
|-----------|----------|--------|---------|
| **Unit Tests** | 60% | JUnit 5, Mockito, Jest | Individual component logic |
| **Integration Tests** | 30% | TestContainers, Spring Boot Test | Service interactions |
| **End-to-End Tests** | 10% | Playwright, REST Assured | Complete user workflows |

## Test Structure and Organization

### Backend Test Structure

```text
src/test/java/
├── unit/                           # Unit tests
│   ├── service/                    # Service layer tests
│   ├── controller/                 # Controller tests
│   ├── repository/                 # Repository tests
│   └── util/                      # Utility tests
├── integration/                    # Integration tests
│   ├── api/                       # API integration tests
│   ├── database/                  # Database integration
│   └── messaging/                 # Kafka/NATS integration
└── e2e/                           # End-to-end tests
    ├── user-flows/                # Complete user journeys
    └── api-contracts/             # API contract tests
```

### Frontend Test Structure

```text
src/__tests__/
├── components/                     # Component tests
├── hooks/                         # Custom hooks tests
├── pages/                         # Page component tests
├── services/                      # Service layer tests
├── utils/                         # Utility function tests
└── integration/                   # Integration tests
    ├── api/                       # API integration
    └── auth/                      # Authentication flows
```

## Running Tests

### Backend Tests (Maven)

#### Unit Tests
```bash
# Run all unit tests
mvn test

# Run specific test class
mvn test -Dtest=UserServiceTest

# Run tests for specific module
mvn test -pl openframe/services/openframe-api

# Run tests with coverage
mvn test jacoco:report

# Skip tests during build
mvn clean install -DskipTests
```

#### Integration Tests
```bash
# Run integration tests (requires Docker)
mvn verify -Pintegration-tests

# Run with TestContainers (isolated)
mvn verify -Pcontainer-tests

# Run specific integration test
mvn verify -Dit.test=DeviceIntegrationTest
```

#### Test Profiles

**application-test.yml:**
```yaml
spring:
  datasource:
    url: jdbc:h2:mem:testdb
  jpa:
    hibernate:
      ddl-auto: create-drop
  
  kafka:
    bootstrap-servers: ${spring.embedded.kafka.brokers}
  
  data:
    mongodb:
      host: localhost
      port: 0  # Use random port with @DataMongoTest

logging:
  level:
    org.springframework.test: DEBUG
    org.testcontainers: INFO
```

### Frontend Tests (Jest/Vitest)

```bash
cd openframe/services/openframe-frontend

# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test UserProfile.test.tsx

# Run integration tests
npm run test:integration
```

### End-to-End Tests

```bash
# Install dependencies
npm install -g @playwright/test

# Run e2e tests
npm run test:e2e

# Run with specific browser
npm run test:e2e -- --project=chromium

# Run in headed mode (visible browser)
npm run test:e2e -- --headed
```

## Writing Unit Tests

### Backend Unit Tests (JUnit 5 + Mockito)

#### Service Layer Testing

```java
@ExtendWith(MockitoExtension.class)
class UserServiceTest {
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private PasswordEncoder passwordEncoder;
    
    @Mock
    private TenantContext tenantContext;
    
    @InjectMocks
    private UserService userService;
    
    @BeforeEach
    void setUp() {
        when(tenantContext.getCurrentTenant()).thenReturn("tenant-123");
    }
    
    @Test
    @DisplayName("Should create user with encrypted password")
    void shouldCreateUserWithEncryptedPassword() {
        // Given
        CreateUserRequest request = CreateUserRequest.builder()
            .email("john.doe@example.com")
            .firstName("John")
            .lastName("Doe")
            .password("SecurePass123!")
            .build();
            
        String hashedPassword = "$2a$10$hashedPassword";
        when(passwordEncoder.encode("SecurePass123!")).thenReturn(hashedPassword);
        
        User savedUser = User.builder()
            .id("user-123")
            .email("john.doe@example.com")
            .firstName("John")
            .lastName("Doe")
            .password(hashedPassword)
            .tenantId("tenant-123")
            .build();
            
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        
        // When
        UserResponse result = userService.createUser(request);
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.getEmail()).isEqualTo("john.doe@example.com");
        assertThat(result.getFirstName()).isEqualTo("John");
        assertThat(result.getLastName()).isEqualTo("Doe");
        
        verify(passwordEncoder).encode("SecurePass123!");
        verify(userRepository).save(argThat(user -> 
            user.getPassword().equals(hashedPassword) &&
            user.getTenantId().equals("tenant-123")
        ));
    }
    
    @Test
    @DisplayName("Should throw exception when user already exists")
    void shouldThrowExceptionWhenUserAlreadyExists() {
        // Given
        CreateUserRequest request = CreateUserRequest.builder()
            .email("existing@example.com")
            .build();
            
        when(userRepository.existsByEmailAndTenantId("existing@example.com", "tenant-123"))
            .thenReturn(true);
        
        // When & Then
        assertThatThrownBy(() -> userService.createUser(request))
            .isInstanceOf(UserAlreadyExistsException.class)
            .hasMessage("User with email 'existing@example.com' already exists");
            
        verify(userRepository, never()).save(any(User.class));
    }
}
```

#### Controller Testing

```java
@WebMvcTest(UserController.class)
@ActiveProfiles("test")
class UserControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private UserService userService;
    
    @MockBean
    private JwtDecoder jwtDecoder;
    
    @Test
    @DisplayName("Should create user and return 201")
    @WithMockUser(roles = "ADMIN")
    void shouldCreateUserAndReturn201() throws Exception {
        // Given
        CreateUserRequest request = new CreateUserRequest();
        request.setEmail("john.doe@example.com");
        request.setFirstName("John");
        request.setLastName("Doe");
        
        UserResponse response = UserResponse.builder()
            .id("user-123")
            .email("john.doe@example.com")
            .firstName("John")
            .lastName("Doe")
            .build();
            
        when(userService.createUser(any(CreateUserRequest.class))).thenReturn(response);
        
        // When & Then
        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "email": "john.doe@example.com",
                        "firstName": "John",
                        "lastName": "Doe",
                        "password": "SecurePass123!"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value("user-123"))
            .andExpect(jsonPath("$.email").value("john.doe@example.com"))
            .andExpect(jsonPath("$.firstName").value("John"))
            .andExpect(jsonPath("$.lastName").value("Doe"));
    }
    
    @Test
    @DisplayName("Should return 400 for invalid request")
    @WithMockUser(roles = "ADMIN")
    void shouldReturn400ForInvalidRequest() throws Exception {
        mockMvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "email": "invalid-email",
                        "firstName": "",
                        "lastName": "Doe"
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.errors").isArray())
            .andExpect(jsonPath("$.errors[*]").value(hasItems(
                containsString("Invalid email format"),
                containsString("First name is required")
            )));
    }
}
```

### Frontend Unit Tests (Jest/Vitest + React Testing Library)

#### Component Testing

```typescript
// UserProfile.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { UserProfile } from './UserProfile';
import { AuthContext } from '@/contexts/AuthContext';

const mockAuthContext = {
  user: {
    id: '1',
    email: 'john.doe@example.com',
    firstName: 'John',
    lastName: 'Doe',
    roles: ['USER'],
  },
  updateProfile: vi.fn(),
  isLoading: false,
};

describe('UserProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display user information', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <UserProfile />
      </AuthContext.Provider>
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
  });

  it('should update profile on form submission', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <UserProfile />
      </AuthContext.Provider>
    );

    const editButton = screen.getByRole('button', { name: /edit profile/i });
    fireEvent.click(editButton);

    const firstNameInput = screen.getByLabelText(/first name/i);
    fireEvent.change(firstNameInput, { target: { value: 'Jane' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockAuthContext.updateProfile).toHaveBeenCalledWith({
        firstName: 'Jane',
        lastName: 'Doe',
      });
    });
  });

  it('should show validation errors for invalid input', async () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <UserProfile />
      </AuthContext.Provider>
    );

    const editButton = screen.getByRole('button', { name: /edit profile/i });
    fireEvent.click(editButton);

    const firstNameInput = screen.getByLabelText(/first name/i);
    fireEvent.change(firstNameInput, { target: { value: '' } });

    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/first name is required/i)).toBeInTheDocument();
    });
  });
});
```

#### Hook Testing

```typescript
// useUserProfile.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useUserProfile } from './useUserProfile';
import * as apiClient from '@/lib/api-client';

vi.mock('@/lib/api-client');

describe('useUserProfile', () => {
  const mockApiClient = apiClient as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch user profile on mount', async () => {
    const mockProfile = {
      id: '1',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    mockApiClient.getCurrentUser.mockResolvedValue(mockProfile);

    const { result } = renderHook(() => useUserProfile());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.profile).toEqual(mockProfile);
    expect(mockApiClient.getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('should update profile', async () => {
    const initialProfile = {
      id: '1',
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
    };

    const updatedProfile = {
      ...initialProfile,
      firstName: 'Jane',
    };

    mockApiClient.getCurrentUser.mockResolvedValue(initialProfile);
    mockApiClient.updateProfile.mockResolvedValue(updatedProfile);

    const { result } = renderHook(() => useUserProfile());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateProfile({ firstName: 'Jane' });
    });

    expect(result.current.profile?.firstName).toBe('Jane');
    expect(mockApiClient.updateProfile).toHaveBeenCalledWith({ firstName: 'Jane' });
  });
});
```

## Integration Testing

### Database Integration Tests

```java
@DataMongoTest
@ActiveProfiles("test")
class UserRepositoryIntegrationTest {
    
    @Autowired
    private TestEntityManager entityManager;
    
    @Autowired
    private UserRepository userRepository;
    
    @Test
    @DisplayName("Should find users by organization and role")
    void shouldFindUsersByOrganizationAndRole() {
        // Given
        String tenantId = "tenant-123";
        String organizationId = "org-456";
        
        User admin = User.builder()
            .email("admin@example.com")
            .tenantId(tenantId)
            .organizationId(organizationId)
            .roles(Set.of("ADMIN"))
            .build();
            
        User user = User.builder()
            .email("user@example.com")
            .tenantId(tenantId)
            .organizationId(organizationId)
            .roles(Set.of("USER"))
            .build();
            
        User otherTenant = User.builder()
            .email("other@example.com")
            .tenantId("other-tenant")
            .organizationId(organizationId)
            .roles(Set.of("ADMIN"))
            .build();
            
        userRepository.saveAll(List.of(admin, user, otherTenant));
        
        // When
        List<User> admins = userRepository.findByTenantIdAndOrganizationIdAndRolesContaining(
            tenantId, organizationId, "ADMIN");
        
        // Then
        assertThat(admins).hasSize(1);
        assertThat(admins.get(0).getEmail()).isEqualTo("admin@example.com");
    }
}
```

### API Integration Tests with TestContainers

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestMethodOrder(OrderAnnotation.class)
@Testcontainers
class UserApiIntegrationTest {
    
    @Container
    static MongoDBContainer mongodb = new MongoDBContainer("mongo:5.0")
            .withReuse(true);
    
    @Container
    static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.0.1"))
            .withReuse(true);
    
    @Container
    static RedisContainer redis = new RedisContainer("redis:7.0-alpine")
            .withReuse(true);
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Autowired
    private UserRepository userRepository;
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", mongodb::getReplicaSetUrl);
        registry.add("spring.kafka.bootstrap-servers", kafka::getBootstrapServers);
        registry.add("spring.redis.host", redis::getHost);
        registry.add("spring.redis.port", redis::getFirstMappedPort);
    }
    
    @Test
    @Order(1)
    @DisplayName("Should create user via API")
    void shouldCreateUserViaApi() {
        // Given
        String token = generateAdminToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        
        CreateUserRequest request = CreateUserRequest.builder()
            .email("integration@example.com")
            .firstName("Integration")
            .lastName("Test")
            .password("SecurePass123!")
            .build();
            
        HttpEntity<CreateUserRequest> entity = new HttpEntity<>(request, headers);
        
        // When
        ResponseEntity<UserResponse> response = restTemplate.postForEntity(
            "/api/users", entity, UserResponse.class);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().getEmail()).isEqualTo("integration@example.com");
        
        // Verify in database
        Optional<User> savedUser = userRepository.findByEmail("integration@example.com");
        assertThat(savedUser).isPresent();
        assertThat(savedUser.get().getFirstName()).isEqualTo("Integration");
    }
    
    @Test
    @Order(2)
    @DisplayName("Should retrieve user by ID")
    void shouldRetrieveUserById() {
        // Given
        String token = generateUserToken();
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        
        User existingUser = userRepository.findByEmail("integration@example.com")
            .orElseThrow();
            
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        
        // When
        ResponseEntity<UserResponse> response = restTemplate.exchange(
            "/api/users/" + existingUser.getId(), 
            HttpMethod.GET, 
            entity, 
            UserResponse.class);
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().getId()).isEqualTo(existingUser.getId());
    }
}
```

### Frontend API Integration Tests

```typescript
// api-client.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { apiClient } from '@/lib/api-client';
import { setupTestServer } from '@/test/utils/test-server';

describe('API Client Integration', () => {
  let server: any;

  beforeAll(async () => {
    server = await setupTestServer();
  });

  afterAll(async () => {
    await server.close();
  });

  it('should authenticate and fetch user profile', async () => {
    // Given
    const credentials = {
      email: 'test@example.com',
      password: 'password123',
    };

    // When
    const authResponse = await apiClient.login(credentials);
    expect(authResponse.token).toBeDefined();

    // Set token for subsequent requests
    apiClient.setAuthToken(authResponse.token);

    // Then
    const profile = await apiClient.getCurrentUser();
    expect(profile.email).toBe('test@example.com');
  });

  it('should handle API errors gracefully', async () => {
    // Given
    apiClient.setAuthToken('invalid-token');

    // When & Then
    await expect(apiClient.getCurrentUser()).rejects.toThrow(/unauthorized/i);
  });
});
```

## End-to-End Testing

### Playwright E2E Tests

```typescript
// e2e/user-management.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    
    // Login as admin
    await page.fill('[data-testid="email-input"]', 'admin@test.com');
    await page.fill('[data-testid="password-input"]', 'admin123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create new user', async ({ page }) => {
    // Navigate to users page
    await page.click('[data-testid="users-nav-link"]');
    await expect(page).toHaveURL('/settings');
    
    // Click add user button
    await page.click('[data-testid="add-user-button"]');
    
    // Fill user form
    await page.fill('[data-testid="user-email-input"]', 'newuser@test.com');
    await page.fill('[data-testid="user-firstname-input"]', 'New');
    await page.fill('[data-testid="user-lastname-input"]', 'User');
    await page.selectOption('[data-testid="user-role-select"]', 'USER');
    
    // Submit form
    await page.click('[data-testid="create-user-button"]');
    
    // Verify success
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('text=newuser@test.com')).toBeVisible();
  });

  test('should edit existing user', async ({ page }) => {
    // Navigate to users and find user
    await page.click('[data-testid="users-nav-link"]');
    
    const userRow = page.locator('[data-testid="user-row"]').filter({ 
      hasText: 'newuser@test.com' 
    });
    
    // Click edit button
    await userRow.locator('[data-testid="edit-user-button"]').click();
    
    // Update user details
    await page.fill('[data-testid="user-firstname-input"]', 'Updated');
    
    // Save changes
    await page.click('[data-testid="save-user-button"]');
    
    // Verify update
    await expect(page.locator('text=Updated User')).toBeVisible();
  });

  test('should delete user', async ({ page }) => {
    // Navigate and find user
    await page.click('[data-testid="users-nav-link"]');
    
    const userRow = page.locator('[data-testid="user-row"]').filter({ 
      hasText: 'Updated User' 
    });
    
    // Click delete button
    await userRow.locator('[data-testid="delete-user-button"]').click();
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Verify user is removed
    await expect(page.locator('text=Updated User')).not.toBeVisible();
  });
});
```

## Test Data Management

### Test Data Builders

```java
public class UserTestDataBuilder {
    
    private String id = "user-" + UUID.randomUUID();
    private String email = "test@example.com";
    private String firstName = "Test";
    private String lastName = "User";
    private String tenantId = "tenant-123";
    private Set<String> roles = Set.of("USER");
    private boolean active = true;
    
    public static UserTestDataBuilder aUser() {
        return new UserTestDataBuilder();
    }
    
    public UserTestDataBuilder withEmail(String email) {
        this.email = email;
        return this;
    }
    
    public UserTestDataBuilder withRoles(String... roles) {
        this.roles = Set.of(roles);
        return this;
    }
    
    public UserTestDataBuilder withTenant(String tenantId) {
        this.tenantId = tenantId;
        return this;
    }
    
    public UserTestDataBuilder inactive() {
        this.active = false;
        return this;
    }
    
    public User build() {
        return User.builder()
            .id(id)
            .email(email)
            .firstName(firstName)
            .lastName(lastName)
            .tenantId(tenantId)
            .roles(roles)
            .active(active)
            .createdAt(LocalDateTime.now())
            .build();
    }
}

// Usage in tests
@Test
void shouldFindActiveAdmins() {
    // Given
    User activeAdmin = aUser()
        .withEmail("admin@test.com")
        .withRoles("ADMIN")
        .build();
        
    User inactiveAdmin = aUser()
        .withEmail("inactive@test.com")
        .withRoles("ADMIN")
        .inactive()
        .build();
        
    userRepository.saveAll(List.of(activeAdmin, inactiveAdmin));
    
    // When
    List<User> activeAdmins = userRepository.findActiveUsersByRole("ADMIN");
    
    // Then
    assertThat(activeAdmins).hasSize(1);
    assertThat(activeAdmins.get(0).getEmail()).isEqualTo("admin@test.com");
}
```

### Database Seeding for Tests

```java
@Component
@Profile("test")
public class TestDataSeeder {
    
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    
    @EventListener
    public void onApplicationReady(ApplicationReadyEvent event) {
        seedTestData();
    }
    
    private void seedTestData() {
        Organization testOrg = Organization.builder()
            .id("test-org-123")
            .name("Test Organization")
            .slug("test-org")
            .tenantId("tenant-123")
            .build();
            
        organizationRepository.save(testOrg);
        
        User adminUser = User.builder()
            .id("admin-123")
            .email("admin@test.com")
            .firstName("Admin")
            .lastName("User")
            .password("$2a$10$hashedpassword")
            .tenantId("tenant-123")
            .organizationId("test-org-123")
            .roles(Set.of("ADMIN"))
            .active(true)
            .build();
            
        userRepository.save(adminUser);
    }
}
```

## Coverage Requirements

### Coverage Targets

| Component | Minimum Coverage | Target Coverage |
|-----------|-----------------|----------------|
| Service Layer | 85% | 95% |
| Controller Layer | 80% | 90% |
| Repository Layer | 75% | 85% |
| Utility Classes | 90% | 95% |
| Overall Project | 80% | 90% |

### Coverage Configuration

**Maven (JaCoCo):**
```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.8</version>
    <executions>
        <execution>
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

**Frontend (Vitest):**
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
        branches: 75,
        statements: 80,
      },
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
});
```

### Generating Coverage Reports

```bash
# Backend coverage
mvn clean test jacoco:report

# View HTML report
open target/site/jacoco/index.html

# Frontend coverage
npm run test:coverage

# View HTML report  
open coverage/index.html
```

This comprehensive testing overview provides the foundation for maintaining high code quality in OpenFrame. The next sections cover contributing guidelines and development workflows.