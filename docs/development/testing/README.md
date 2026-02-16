# Testing Overview

OpenFrame maintains high code quality and reliability through comprehensive testing practices. This guide covers our testing philosophy, test structure, and guidelines for writing effective tests.

## Testing Philosophy

OpenFrame follows a **test-driven development (TDD)** approach with comprehensive test coverage:

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions and external services
- **End-to-End Tests**: Test complete user workflows
- **Security Tests**: Validate security controls and vulnerability prevention
- **Performance Tests**: Ensure system performance under load

## Test Structure and Organization

### Test Hierarchy

```text
src/test/java/
├── unit/                           # Fast, isolated unit tests
│   ├── controller/                 # Controller layer tests
│   ├── service/                    # Business logic tests  
│   ├── repository/                 # Data access tests
│   └── util/                       # Utility class tests
├── integration/                    # Integration tests with external dependencies
│   ├── api/                        # API integration tests
│   ├── database/                   # Database integration tests
│   ├── messaging/                  # Kafka/NATS integration tests
│   └── security/                   # Security integration tests
├── e2e/                           # End-to-end workflow tests
│   ├── user-workflows/            # Complete user journey tests
│   ├── api-workflows/             # API workflow tests
│   └── multi-tenant/              # Multi-tenant isolation tests
└── performance/                   # Load and performance tests
    ├── load/                      # Load testing scenarios
    ├── stress/                    # Stress testing scenarios
    └── benchmark/                 # Benchmark tests
```

### Test Configuration

**Base Test Configuration** (`src/test/resources/application-test.yml`):

```yaml
spring:
  profiles:
    active: test
    
  # Use embedded databases for tests
  data:
    mongodb:
      host: localhost
      port: 0  # Random port
      database: openframe-test
      
  redis:
    host: localhost
    port: 0  # Embedded Redis
    
  # Disable external services in tests
  kafka:
    enabled: false
    
  # Test-specific security settings
  security:
    oauth2:
      resourceserver:
        jwt:
          public-key-location: classpath:test-keys/public-key.pem
          
# Logging configuration for tests
logging:
  level:
    com.openframe: DEBUG
    org.springframework.test: INFO
    org.springframework.security: DEBUG
    
  # Reduce noise from test frameworks
  org.springframework.web.servlet.mvc.method.annotation: WARN
  org.springframework.data.mongodb: WARN
```

## Unit Testing

### Controller Tests

Test REST controllers using MockMvc:

```java
@WebMvcTest(DeviceController.class)
@Import(TestSecurityConfig.class)
class DeviceControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @MockBean
    private DeviceService deviceService;
    
    @MockBean
    private AuthenticationService authService;
    
    @Test
    @WithMockUser(roles = "DEVICE_READ")
    void getDevice_WithValidId_ReturnsDevice() throws Exception {
        // Given
        String deviceId = "device-123";
        DeviceResponse expectedDevice = DeviceResponse.builder()
            .id(deviceId)
            .hostname("test-device")
            .status(DeviceStatus.ONLINE)
            .build();
            
        when(deviceService.getDevice(deviceId)).thenReturn(expectedDevice);
        
        // When & Then
        mockMvc.perform(get("/api/devices/{id}", deviceId)
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(deviceId))
            .andExpected(jsonPath("$.hostname").value("test-device"))
            .andExpected(jsonPath("$.status").value("ONLINE"));
            
        verify(deviceService).getDevice(deviceId);
    }
    
    @Test
    @WithMockUser(roles = "DEVICE_WRITE")
    void createDevice_WithValidRequest_ReturnsCreatedDevice() throws Exception {
        // Given
        CreateDeviceRequest request = CreateDeviceRequest.builder()
            .hostname("new-device")
            .ipAddress("192.168.1.100")
            .organizationId("org-123")
            .build();
            
        DeviceResponse createdDevice = DeviceResponse.builder()
            .id("device-456")
            .hostname("new-device")
            .ipAddress("192.168.1.100")
            .status(DeviceStatus.ONLINE)
            .build();
            
        when(deviceService.createDevice(any(CreateDeviceRequest.class)))
            .thenReturn(createdDevice);
        
        // When & Then
        mockMvc.perform(post("/api/devices")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value("device-456"))
            .andExpect(jsonPath("$.hostname").value("new-device"));
            
        ArgumentCaptor<CreateDeviceRequest> captor = 
            ArgumentCaptor.forClass(CreateDeviceRequest.class);
        verify(deviceService).createDevice(captor.capture());
        
        CreateDeviceRequest capturedRequest = captor.getValue();
        assertThat(capturedRequest.getHostname()).isEqualTo("new-device");
        assertThat(capturedRequest.getIpAddress()).isEqualTo("192.168.1.100");
    }
    
    @Test
    void getDevice_WithoutAuthentication_Returns401() throws Exception {
        mockMvc.perform(get("/api/devices/device-123"))
            .andExpect(status().isUnauthorized());
    }
    
    @Test
    @WithMockUser(roles = "USER")  // Wrong role
    void getDevice_WithoutProperRole_Returns403() throws Exception {
        mockMvc.perform(get("/api/devices/device-123"))
            .andExpect(status().isForbidden());
    }
}
```

### Service Layer Tests

Test business logic with mocked dependencies:

```java
@ExtendWith(MockitoExtension.class)
class DeviceServiceTest {
    
    @Mock
    private DeviceRepository deviceRepository;
    
    @Mock
    private OrganizationService organizationService;
    
    @Mock
    private EventPublisher eventPublisher;
    
    @InjectMocks
    private DeviceServiceImpl deviceService;
    
    @Test
    void createDevice_WithValidRequest_CreatesAndReturnsDevice() {
        // Given
        String tenantId = "tenant-123";
        String organizationId = "org-456";
        
        CreateDeviceRequest request = CreateDeviceRequest.builder()
            .hostname("test-device")
            .ipAddress("192.168.1.100")
            .organizationId(organizationId)
            .build();
            
        Organization organization = Organization.builder()
            .id(organizationId)
            .tenantId(tenantId)
            .name("Test Organization")
            .build();
            
        Device savedDevice = Device.builder()
            .id("device-789")
            .tenantId(tenantId)
            .hostname("test-device")
            .ipAddress("192.168.1.100")
            .organizationId(organizationId)
            .status(DeviceStatus.ONLINE)
            .createdAt(Instant.now())
            .build();
        
        when(organizationService.getOrganization(organizationId)).thenReturn(organization);
        when(deviceRepository.save(any(Device.class))).thenReturn(savedDevice);
        
        // When
        DeviceResponse result = deviceService.createDevice(request);
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo("device-789");
        assertThat(result.getHostname()).isEqualTo("test-device");
        assertThat(result.getIpAddress()).isEqualTo("192.168.1.100");
        assertThat(result.getStatus()).isEqualTo(DeviceStatus.ONLINE);
        
        // Verify interactions
        verify(organizationService).getOrganization(organizationId);
        
        ArgumentCaptor<Device> deviceCaptor = ArgumentCaptor.forClass(Device.class);
        verify(deviceRepository).save(deviceCaptor.capture());
        
        Device capturedDevice = deviceCaptor.getValue();
        assertThat(capturedDevice.getTenantId()).isEqualTo(tenantId);
        assertThat(capturedDevice.getHostname()).isEqualTo("test-device");
        
        // Verify event publishing
        ArgumentCaptor<DeviceCreatedEvent> eventCaptor = 
            ArgumentCaptor.forClass(DeviceCreatedEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        
        DeviceCreatedEvent event = eventCaptor.getValue();
        assertThat(event.getDeviceId()).isEqualTo("device-789");
        assertThat(event.getTenantId()).isEqualTo(tenantId);
    }
    
    @Test
    void createDevice_WithInvalidOrganization_ThrowsException() {
        // Given
        CreateDeviceRequest request = CreateDeviceRequest.builder()
            .hostname("test-device")
            .organizationId("invalid-org")
            .build();
            
        when(organizationService.getOrganization("invalid-org"))
            .thenThrow(new OrganizationNotFoundException("Organization not found"));
        
        // When & Then
        assertThatThrownBy(() -> deviceService.createDevice(request))
            .isInstanceOf(OrganizationNotFoundException.class)
            .hasMessage("Organization not found");
        
        verify(deviceRepository, never()).save(any(Device.class));
        verify(eventPublisher, never()).publishEvent(any());
    }
    
    @Test
    void getDevicesByTenant_WithPagination_ReturnsPagedResults() {
        // Given
        String tenantId = "tenant-123";
        int page = 0;
        int size = 10;
        
        List<Device> devices = Arrays.asList(
            createTestDevice("device-1", "host-1"),
            createTestDevice("device-2", "host-2")
        );
        
        Page<Device> devicePage = new PageImpl<>(devices, PageRequest.of(page, size), 2);
        when(deviceRepository.findByTenantId(eq(tenantId), any(Pageable.class)))
            .thenReturn(devicePage);
        
        // When
        Page<DeviceResponse> result = deviceService.getDevicesByTenant(tenantId, page, size);
        
        // Then
        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getNumber()).isEqualTo(0);
        assertThat(result.getSize()).isEqualTo(10);
        
        DeviceResponse firstDevice = result.getContent().get(0);
        assertThat(firstDevice.getId()).isEqualTo("device-1");
        assertThat(firstDevice.getHostname()).isEqualTo("host-1");
    }
}
```

### Repository Tests

Test data access layer with `@DataMongoTest`:

```java
@DataMongoTest
@Import(TestMongoConfig.class)
class DeviceRepositoryTest {
    
    @Autowired
    private TestEntityManager entityManager;
    
    @Autowired
    private DeviceRepository deviceRepository;
    
    @Test
    void findByTenantIdAndStatus_ReturnsCorrectDevices() {
        // Given
        String tenantId = "tenant-123";
        
        Device onlineDevice = Device.builder()
            .tenantId(tenantId)
            .hostname("online-device")
            .status(DeviceStatus.ONLINE)
            .build();
            
        Device offlineDevice = Device.builder()
            .tenantId(tenantId)
            .hostname("offline-device")
            .status(DeviceStatus.OFFLINE)
            .build();
            
        Device otherTenantDevice = Device.builder()
            .tenantId("other-tenant")
            .hostname("other-device")
            .status(DeviceStatus.ONLINE)
            .build();
        
        deviceRepository.saveAll(Arrays.asList(onlineDevice, offlineDevice, otherTenantDevice));
        
        // When
        List<Device> onlineDevices = deviceRepository
            .findByTenantIdAndStatus(tenantId, DeviceStatus.ONLINE);
        
        // Then
        assertThat(onlineDevices).hasSize(1);
        assertThat(onlineDevices.get(0).getHostname()).isEqualTo("online-device");
    }
    
    @Test
    void findByHostnameContaining_WithCaseInsensitiveSearch_ReturnsMatches() {
        // Given
        Device device1 = createTestDevice("test-SERVER-01");
        Device device2 = createTestDevice("production-server-02");
        Device device3 = createTestDevice("workstation-01");
        
        deviceRepository.saveAll(Arrays.asList(device1, device2, device3));
        
        // When
        List<Device> results = deviceRepository.findByHostnameContainingIgnoreCase("server");
        
        // Then
        assertThat(results).hasSize(2);
        assertThat(results).extracting(Device::getHostname)
            .containsExactlyInAnyOrder("test-SERVER-01", "production-server-02");
    }
    
    @Test
    void customAggregationQuery_ReturnsCorrectCounts() {
        // Given
        String tenantId = "tenant-123";
        createDevicesForOrganization(tenantId, "org-1", 3, DeviceStatus.ONLINE);
        createDevicesForOrganization(tenantId, "org-1", 2, DeviceStatus.OFFLINE);
        createDevicesForOrganization(tenantId, "org-2", 5, DeviceStatus.ONLINE);
        
        // When
        List<DeviceCountByOrganization> counts = deviceRepository
            .countDevicesByOrganizationAndStatus(tenantId, DeviceStatus.ONLINE);
        
        // Then
        assertThat(counts).hasSize(2);
        
        DeviceCountByOrganization org1Count = counts.stream()
            .filter(c -> "org-1".equals(c.getOrganizationId()))
            .findFirst()
            .orElseThrow();
        assertThat(org1Count.getCount()).isEqualTo(3);
        
        DeviceCountByOrganization org2Count = counts.stream()
            .filter(c -> "org-2".equals(c.getOrganizationId()))
            .findFirst()
            .orElseThrow();
        assertThat(org2Count.getCount()).isEqualTo(5);
    }
}
```

## Integration Testing

### API Integration Tests

Test complete API flows with real HTTP requests:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestPropertySource(properties = {
    "spring.profiles.active=integration-test",
    "spring.data.mongodb.database=openframe-integration-test"
})
@Transactional
class DeviceApiIntegrationTest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @Autowired
    private DeviceRepository deviceRepository;
    
    @Autowired
    private JwtTokenUtil jwtTokenUtil;
    
    @LocalServerPort
    private int port;
    
    private String baseUrl;
    private String authToken;
    
    @BeforeEach
    void setUp() {
        baseUrl = "http://localhost:" + port + "/api";
        authToken = jwtTokenUtil.generateTestToken("test-user", "tenant-123", Arrays.asList("DEVICE_READ", "DEVICE_WRITE"));
    }
    
    @AfterEach
    void tearDown() {
        deviceRepository.deleteAll();
    }
    
    @Test
    void createDevice_EndToEndFlow_CreatesDeviceAndReturnsResponse() {
        // Given
        CreateDeviceRequest request = CreateDeviceRequest.builder()
            .hostname("integration-test-device")
            .ipAddress("192.168.1.200")
            .organizationId("org-123")
            .build();
        
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(authToken);
        HttpEntity<CreateDeviceRequest> entity = new HttpEntity<>(request, headers);
        
        // When
        ResponseEntity<DeviceResponse> response = restTemplate.postForEntity(
            baseUrl + "/devices", 
            entity, 
            DeviceResponse.class
        );
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        
        DeviceResponse createdDevice = response.getBody();
        assertThat(createdDevice.getId()).isNotNull();
        assertThat(createdDevice.getHostname()).isEqualTo("integration-test-device");
        assertThat(createdDevice.getIpAddress()).isEqualTo("192.168.1.200");
        assertThat(createdDevice.getStatus()).isEqualTo(DeviceStatus.ONLINE);
        
        // Verify device was saved to database
        Optional<Device> savedDevice = deviceRepository.findById(createdDevice.getId());
        assertThat(savedDevice).isPresent();
        assertThat(savedDevice.get().getTenantId()).isEqualTo("tenant-123");
    }
    
    @Test
    void getDevices_WithPagination_ReturnsCorrectPage() {
        // Given - create test devices
        createTestDevices("tenant-123", 15);
        
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(authToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        
        // When
        ResponseEntity<DevicePageResponse> response = restTemplate.exchange(
            baseUrl + "/devices?page=1&size=5",
            HttpMethod.GET,
            entity,
            DevicePageResponse.class
        );
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        
        DevicePageResponse page = response.getBody();
        assertThat(page.getContent()).hasSize(5);
        assertThat(page.getNumber()).isEqualTo(1);
        assertThat(page.getSize()).isEqualTo(5);
        assertThat(page.getTotalElements()).isEqualTo(15);
        assertThat(page.getTotalPages()).isEqualTo(3);
    }
    
    @Test
    void accessDevice_FromDifferentTenant_Returns403() {
        // Given - create device for different tenant
        Device otherTenantDevice = createTestDevice("other-tenant");
        deviceRepository.save(otherTenantDevice);
        
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(authToken); // token for tenant-123
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        
        // When
        ResponseEntity<String> response = restTemplate.exchange(
            baseUrl + "/devices/" + otherTenantDevice.getId(),
            HttpMethod.GET,
            entity,
            String.class
        );
        
        // Then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}
```

### Database Integration Tests

Test database operations with real database instances:

```java
@SpringBootTest
@TestPropertySource(properties = {
    "spring.profiles.active=integration-test"
})
class DatabaseIntegrationTest {
    
    @Autowired
    private MongoTemplate mongoTemplate;
    
    @Autowired
    private DeviceRepository deviceRepository;
    
    @Autowired
    private OrganizationRepository organizationRepository;
    
    @Test
    void testCrossCollectionQuery_ReturnsCorrectResults() {
        // Given
        String tenantId = "tenant-123";
        
        Organization org1 = createOrganization(tenantId, "org-1", "Organization 1");
        Organization org2 = createOrganization(tenantId, "org-2", "Organization 2");
        organizationRepository.saveAll(Arrays.asList(org1, org2));
        
        Device device1 = createDevice(tenantId, org1.getId(), "device-1");
        Device device2 = createDevice(tenantId, org1.getId(), "device-2");  
        Device device3 = createDevice(tenantId, org2.getId(), "device-3");
        deviceRepository.saveAll(Arrays.asList(device1, device2, device3));
        
        // When - perform aggregation query across collections
        Aggregation aggregation = Aggregation.newAggregation(
            Aggregation.match(Criteria.where("tenantId").is(tenantId)),
            Aggregation.group("organizationId").count().as("deviceCount"),
            Aggregation.lookup("organizations", "_id", "_id", "organization"),
            Aggregation.sort(Sort.Direction.DESC, "deviceCount")
        );
        
        AggregationResults<OrganizationDeviceCount> results = mongoTemplate.aggregate(
            aggregation, "devices", OrganizationDeviceCount.class);
        
        // Then
        List<OrganizationDeviceCount> counts = results.getMappedResults();
        assertThat(counts).hasSize(2);
        
        // Organization 1 should have 2 devices
        OrganizationDeviceCount org1Count = counts.get(0);
        assertThat(org1Count.getOrganizationId()).isEqualTo(org1.getId());
        assertThat(org1Count.getDeviceCount()).isEqualTo(2);
        
        // Organization 2 should have 1 device
        OrganizationDeviceCount org2Count = counts.get(1);
        assertThat(org2Count.getOrganizationId()).isEqualTo(org2.getId());
        assertThat(org2Count.getDeviceCount()).isEqualTo(1);
    }
    
    @Test
    void testTransactionalBehavior_RollsBackOnError() {
        // Given
        String tenantId = "tenant-123";
        
        Organization validOrg = createOrganization(tenantId, "valid-org", "Valid Org");
        organizationRepository.save(validOrg);
        
        // When - attempt to create device with invalid data in transaction
        assertThatThrownBy(() -> {
            deviceService.createDeviceWithInvalidOperation(
                tenantId, validOrg.getId(), "test-device");
        }).isInstanceOf(RuntimeException.class);
        
        // Then - verify no data was saved due to rollback
        List<Device> devices = deviceRepository.findByTenantId(tenantId);
        assertThat(devices).isEmpty();
    }
}
```

## End-to-End Testing

### User Workflow Tests

Test complete user journeys:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestMethodOrder(OrderAnnotation.class)
class UserWorkflowE2ETest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @LocalServerPort
    private int port;
    
    private String baseUrl;
    private String authToken;
    private String organizationId;
    private String deviceId;
    
    @BeforeEach
    void setUp() {
        baseUrl = "http://localhost:" + port;
    }
    
    @Test
    @Order(1)
    void userRegistrationAndLoginFlow() {
        // 1. Register new tenant organization
        TenantRegistrationRequest registrationRequest = TenantRegistrationRequest.builder()
            .organizationName("Test MSP")
            .adminEmail("admin@testmsp.com")
            .adminName("Test Admin")
            .domain("testmsp")
            .build();
        
        ResponseEntity<TenantRegistrationResponse> registrationResponse = 
            restTemplate.postForEntity(
                baseUrl + "/auth/register-tenant",
                registrationRequest,
                TenantRegistrationResponse.class
            );
        
        assertThat(registrationResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        
        // 2. Complete email verification (simulate)
        String verificationToken = registrationResponse.getBody().getVerificationToken();
        
        ResponseEntity<String> verificationResponse = restTemplate.postForEntity(
            baseUrl + "/auth/verify-email?token=" + verificationToken,
            null,
            String.class
        );
        
        assertThat(verificationResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        
        // 3. Login with new credentials
        LoginRequest loginRequest = LoginRequest.builder()
            .email("admin@testmsp.com")
            .password("password123")
            .build();
        
        ResponseEntity<LoginResponse> loginResponse = restTemplate.postForEntity(
            baseUrl + "/auth/login",
            loginRequest,
            LoginResponse.class
        );
        
        assertThat(loginResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        authToken = loginResponse.getBody().getAccessToken();
        assertThat(authToken).isNotNull();
    }
    
    @Test
    @Order(2)
    void createClientOrganizationFlow() {
        // Create a client organization
        CreateOrganizationRequest request = CreateOrganizationRequest.builder()
            .name("Acme Corporation")
            .industry("Technology")
            .contactPerson(ContactPersonDto.builder()
                .name("John Doe")
                .email("john@acme.com")
                .phone("+1-555-0123")
                .build())
            .address(AddressDto.builder()
                .street("123 Business Ave")
                .city("San Francisco")
                .state("CA")
                .zipCode("94105")
                .build())
            .build();
        
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(authToken);
        HttpEntity<CreateOrganizationRequest> entity = new HttpEntity<>(request, headers);
        
        ResponseEntity<OrganizationResponse> response = restTemplate.postForEntity(
            baseUrl + "/api/organizations",
            entity,
            OrganizationResponse.class
        );
        
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        organizationId = response.getBody().getId();
        assertThat(organizationId).isNotNull();
    }
    
    @Test
    @Order(3)
    void deviceRegistrationAndManagementFlow() {
        // 1. Generate agent registration secret
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(authToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        
        ResponseEntity<AgentRegistrationSecretResponse> secretResponse = 
            restTemplate.postForEntity(
                baseUrl + "/api/agent/registration-secret",
                entity,
                AgentRegistrationSecretResponse.class
            );
        
        assertThat(secretResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String registrationSecret = secretResponse.getBody().getSecret();
        
        // 2. Simulate agent registration
        AgentRegistrationRequest agentRequest = AgentRegistrationRequest.builder()
            .hostname("test-workstation")
            .osName("Windows 11")
            .osVersion("22H2")
            .ipAddress("192.168.1.100")
            .macAddress("00:11:22:33:44:55")
            .organizationId(organizationId)
            .secret(registrationSecret)
            .build();
        
        ResponseEntity<AgentRegistrationResponse> agentResponse = 
            restTemplate.postForEntity(
                baseUrl + "/client/register",
                agentRequest,
                AgentRegistrationResponse.class
            );
        
        assertThat(agentResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        deviceId = agentResponse.getBody().getDeviceId();
        
        // 3. Verify device appears in API
        ResponseEntity<DeviceResponse> deviceResponse = restTemplate.exchange(
            baseUrl + "/api/devices/" + deviceId,
            HttpMethod.GET,
            entity,
            DeviceResponse.class
        );
        
        assertThat(deviceResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(deviceResponse.getBody().getHostname()).isEqualTo("test-workstation");
    }
    
    @Test
    @Order(4)
    void deviceMonitoringAndAlertsFlow() {
        // 1. Simulate device heartbeat
        MachineHeartbeatMessage heartbeat = MachineHeartbeatMessage.builder()
            .deviceId(deviceId)
            .timestamp(Instant.now())
            .cpuUsage(45.2)
            .memoryUsage(67.8)
            .diskUsage(23.1)
            .networkInterfaces(Arrays.asList(
                NetworkInterface.builder()
                    .name("Ethernet")
                    .ipAddress("192.168.1.100")
                    .status("UP")
                    .build()
            ))
            .build();
        
        // Publish via NATS (simulate agent)
        natsTemplate.publish("device.heartbeat." + deviceId, heartbeat);
        
        // 2. Wait for processing and verify device status updated
        await().atMost(Duration.ofSeconds(5)).untilAsserted(() -> {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(authToken);
            HttpEntity<Void> entity = new HttpEntity<>(headers);
            
            ResponseEntity<DeviceResponse> response = restTemplate.exchange(
                baseUrl + "/api/devices/" + deviceId,
                HttpMethod.GET,
                entity,
                DeviceResponse.class
            );
            
            assertThat(response.getBody().getLastSeen()).isAfter(Instant.now().minusMinutes(1));
            assertThat(response.getBody().getStatus()).isEqualTo(DeviceStatus.ONLINE);
        });
        
        // 3. Query device metrics via GraphQL
        String graphqlQuery = """
            query GetDeviceMetrics($deviceId: ID!) {
                device(id: $deviceId) {
                    id
                    hostname
                    metrics {
                        cpuUsage
                        memoryUsage
                        diskUsage
                        timestamp
                    }
                }
            }
            """;
        
        GraphQLRequest graphqlRequest = GraphQLRequest.builder()
            .query(graphqlQuery)
            .variables(Map.of("deviceId", deviceId))
            .build();
        
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(authToken);
        HttpEntity<GraphQLRequest> graphqlEntity = new HttpEntity<>(graphqlRequest, headers);
        
        ResponseEntity<GraphQLResponse> graphqlResponse = restTemplate.postForEntity(
            baseUrl + "/graphql",
            graphqlEntity,
            GraphQLResponse.class
        );
        
        assertThat(graphqlResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(graphqlResponse.getBody().getData()).isNotNull();
    }
}
```

## Performance Testing

### Load Testing

Test system performance under realistic load:

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class DeviceApiLoadTest {
    
    @Autowired
    private TestRestTemplate restTemplate;
    
    @LocalServerPort
    private int port;
    
    private String baseUrl;
    private ExecutorService executorService;
    
    @BeforeEach
    void setUp() {
        baseUrl = "http://localhost:" + port + "/api";
        executorService = Executors.newFixedThreadPool(50);
    }
    
    @AfterEach
    void tearDown() {
        executorService.shutdown();
    }
    
    @Test
    void loadTest_DeviceCreation_HandlesHighConcurrency() throws InterruptedException {
        // Given
        int numberOfThreads = 50;
        int requestsPerThread = 20;
        int totalRequests = numberOfThreads * requestsPerThread;
        
        CountDownLatch latch = new CountDownLatch(totalRequests);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);
        List<Long> responseTimes = Collections.synchronizedList(new ArrayList<>());
        
        // When
        for (int i = 0; i < numberOfThreads; i++) {
            final int threadId = i;
            executorService.submit(() -> {
                String authToken = generateAuthTokenForTenant("tenant-" + threadId);
                
                for (int j = 0; j < requestsPerThread; j++) {
                    try {
                        long startTime = System.currentTimeMillis();
                        
                        CreateDeviceRequest request = CreateDeviceRequest.builder()
                            .hostname("load-test-device-" + threadId + "-" + j)
                            .ipAddress("192.168." + (threadId % 255) + "." + (j % 255))
                            .organizationId("org-" + threadId)
                            .build();
                        
                        HttpHeaders headers = new HttpHeaders();
                        headers.setBearerAuth(authToken);
                        HttpEntity<CreateDeviceRequest> entity = new HttpEntity<>(request, headers);
                        
                        ResponseEntity<DeviceResponse> response = restTemplate.postForEntity(
                            baseUrl + "/devices",
                            entity,
                            DeviceResponse.class
                        );
                        
                        long responseTime = System.currentTimeMillis() - startTime;
                        responseTimes.add(responseTime);
                        
                        if (response.getStatusCode().is2xxSuccessful()) {
                            successCount.incrementAndGet();
                        } else {
                            failureCount.incrementAndGet();
                        }
                        
                    } catch (Exception e) {
                        failureCount.incrementAndGet();
                    } finally {
                        latch.countDown();
                    }
                }
            });
        }
        
        // Wait for all requests to complete (max 2 minutes)
        assertThat(latch.await(2, TimeUnit.MINUTES)).isTrue();
        
        // Then - verify performance characteristics
        int totalCompleted = successCount.get() + failureCount.get();
        double successRate = (double) successCount.get() / totalCompleted * 100;
        
        assertThat(successRate).isGreaterThan(95.0); // At least 95% success rate
        
        // Calculate response time statistics
        List<Long> sortedResponseTimes = responseTimes.stream()
            .sorted()
            .collect(Collectors.toList());
        
        if (!sortedResponseTimes.isEmpty()) {
            long averageResponseTime = sortedResponseTimes.stream()
                .mapToLong(Long::longValue)
                .sum() / sortedResponseTimes.size();
            
            long p95ResponseTime = sortedResponseTimes.get((int) (sortedResponseTimes.size() * 0.95));
            long p99ResponseTime = sortedResponseTimes.get((int) (sortedResponseTimes.size() * 0.99));
            
            System.out.printf("Load Test Results:\n");
            System.out.printf("  Total Requests: %d\n", totalRequests);
            System.out.printf("  Success Count: %d (%.2f%%)\n", successCount.get(), successRate);
            System.out.printf("  Failure Count: %d\n", failureCount.get());
            System.out.printf("  Average Response Time: %d ms\n", averageResponseTime);
            System.out.printf("  95th Percentile: %d ms\n", p95ResponseTime);
            System.out.printf("  99th Percentile: %d ms\n", p99ResponseTime);
            
            // Performance assertions
            assertThat(averageResponseTime).isLessThan(500); // Average response < 500ms
            assertThat(p95ResponseTime).isLessThan(1000);    // 95% of requests < 1s
            assertThat(p99ResponseTime).isLessThan(2000);    // 99% of requests < 2s
        }
    }
}
```

## Test Utilities and Helpers

### Test Data Builders

Create reusable test data builders:

```java
public class TestDataBuilder {
    
    public static DeviceBuilder device() {
        return new DeviceBuilder();
    }
    
    public static OrganizationBuilder organization() {
        return new OrganizationBuilder();
    }
    
    public static UserBuilder user() {
        return new UserBuilder();
    }
    
    public static class DeviceBuilder {
        private Device device = Device.builder()
            .id(UUID.randomUUID().toString())
            .tenantId("default-tenant")
            .hostname("test-device")
            .ipAddress("192.168.1.100")
            .status(DeviceStatus.ONLINE)
            .createdAt(Instant.now())
            .build();
        
        public DeviceBuilder withId(String id) {
            device.setId(id);
            return this;
        }
        
        public DeviceBuilder withTenantId(String tenantId) {
            device.setTenantId(tenantId);
            return this;
        }
        
        public DeviceBuilder withHostname(String hostname) {
            device.setHostname(hostname);
            return this;
        }
        
        public DeviceBuilder withStatus(DeviceStatus status) {
            device.setStatus(status);
            return this;
        }
        
        public DeviceBuilder offline() {
            return withStatus(DeviceStatus.OFFLINE);
        }
        
        public Device build() {
            return device;
        }
    }
}

// Usage in tests
@Test
void testDeviceFiltering() {
    // Given
    Device onlineDevice = TestDataBuilder.device()
        .withTenantId("tenant-123")
        .withHostname("online-server")
        .build();
        
    Device offlineDevice = TestDataBuilder.device()
        .withTenantId("tenant-123")
        .withHostname("offline-server")
        .offline()
        .build();
        
    deviceRepository.saveAll(Arrays.asList(onlineDevice, offlineDevice));
    
    // When & Then...
}
```

## Running Tests

### Maven Test Commands

```bash
# Run all tests
mvn test

# Run only unit tests
mvn test -Dtest.groups="unit"

# Run only integration tests
mvn test -Dtest.groups="integration"

# Run specific test class
mvn test -Dtest=DeviceServiceTest

# Run with coverage report
mvn clean test jacoco:report

# Run performance tests
mvn test -Dtest.groups="performance"

# Continuous testing (watch mode)
mvn compile quarkus:dev -Dtests=true
```

### Test Profiles

Configure different test environments:

**Fast Tests** (`application-fast-test.yml`):
```yaml
spring:
  data:
    mongodb:
      host: localhost
      port: 0  # Embedded
  test:
    database:
      replace: any
  cache:
    type: none
```

**Integration Tests** (`application-integration-test.yml`):
```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/openframe-integration-test
  kafka:
    bootstrap-servers: localhost:9092
  redis:
    host: localhost
    port: 6379
```

## Test Coverage Requirements

Maintain high test coverage across all components:

| Component Type | Coverage Requirement | Notes |
|----------------|---------------------|-------|
| **Controllers** | 90%+ | All endpoints and error cases |
| **Services** | 95%+ | Business logic must be thoroughly tested |
| **Repositories** | 85%+ | Query methods and custom logic |
| **Security** | 100% | All security controls must be tested |
| **Utilities** | 90%+ | Helper classes and utilities |

### Coverage Reporting

```xml
<!-- JaCoCo Maven plugin configuration -->
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
            <phase>verify</phase>
            <goals>
                <goal>check</goal>
            </goals>
            <configuration>
                <rules>
                    <rule>
                        <element>BUNDLE</element>
                        <limits>
                            <limit>
                                <counter>INSTRUCTION</counter>
                                <value>COVEREDRATIO</value>
                                <minimum>0.85</minimum>
                            </limit>
                        </limits>
                    </rule>
                </rules>
            </configuration>
        </execution>
    </executions>
</plugin>
```

---

This testing guide provides a comprehensive foundation for maintaining high quality and reliability in OpenFrame. Regular testing, along with continuous integration and deployment practices, ensures that the platform remains stable and secure as it evolves.