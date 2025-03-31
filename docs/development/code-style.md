# Code Style Guide

This document outlines coding standards and practices for OpenFrame's Java-based microservices architecture.

## Java Style Guide

### 1. General Guidelines

```java
// Good
@Service
@RequiredArgsConstructor
@Slf4j
public class EventDataService {
    private final ExternalApplicationEventRepository mongoEventRepository;
    private final EventStreamRepository cassandraEventRepository;

    public void processEvent(EventMessage event) {
        log.debug("Processing event: {}", event.getId());
        try {
            validateEvent(event);
            saveEvent(event);
            log.info("Successfully processed event: {}", event.getId());
        } catch (Exception e) {
            log.error("Failed to process event: {}", event.getId(), e);
            throw new EventProcessingException("Failed to process event", e);
        }
    }
}

// Bad
@Service
public class EventDataService {
    @Autowired
    private ExternalApplicationEventRepository mongoEventRepository;
    @Autowired
    private EventStreamRepository cassandraEventRepository;

    public void processEvent(EventMessage event) {
        System.out.println("Processing event: " + event.getId());
        try {
            validateEvent(event);
            saveEvent(event);
            System.out.println("Successfully processed event: " + event.getId());
        } catch (Exception e) {
            System.err.println("Failed to process event: " + event.getId());
            throw new RuntimeException(e);
        }
    }
}
```

### 2. Naming Conventions

```java
// Classes
public class EventProcessor {
    private final EventRepository repository;
    private static final int MAX_RETRIES = 3;
}

// Interfaces
public interface EventService {
    void processEvent(Event event);
}

// Enums
public enum EventType {
    SYSTEM_EVENT,
    USER_EVENT,
    AUDIT_EVENT
}

// Constants
public class Constants {
    private static final String API_VERSION = "v1";
    private static final String BASE_PATH = "/api";
}
```

### 3. Package Structure

```
com.openframe
├── api
│   ├── controller
│   ├── service
│   ├── repository
│   └── model
├── core
│   ├── service
│   ├── model
│   └── exception
├── data
│   ├── repository
│   ├── model
│   └── service
└── security
    ├── config
    ├── service
    └── model
```

### 4. Dependencies

```xml
<!-- Good: Using Spring Boot parent and managed dependencies -->
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.2.x</version>
</parent>

<dependencies>
    <!-- Spring Boot Starters -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    
    <!-- OpenFrame Internal Dependencies -->
    <dependency>
        <groupId>com.openframe</groupId>
        <artifactId>openframe-core</artifactId>
    </dependency>
    
    <!-- Monitoring -->
    <dependency>
        <groupId>io.micrometer</groupId>
        <artifactId>micrometer-registry-prometheus</artifactId>
    </dependency>
</dependencies>
```

### 5. Configuration

```yaml
# application.yml
spring:
  application:
    name: openframe-api
  data:
    mongodb:
      uri: ${MONGODB_URI}
    cassandra:
      keyspace-name: openframe
      contact-points: ${CASSANDRA_CONTACT_POINTS}

management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
  endpoint:
    health:
      show-details: always

logging:
  level:
    root: INFO
    com.openframe: DEBUG
```

### 6. Exception Handling

```java
@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    
    @ExceptionHandler(EventProcessingException.class)
    public ResponseEntity<ErrorResponse> handleEventProcessingException(
            EventProcessingException ex) {
        log.error("Event processing failed", ex);
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse(ex.getMessage()));
    }
    
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            ValidationException ex) {
        log.warn("Validation failed", ex);
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(new ErrorResponse(ex.getMessage()));
    }
}
```

### 7. Testing

```java
@SpringBootTest
class EventServiceTest {
    
    @Autowired
    private EventService eventService;
    
    @MockBean
    private EventRepository eventRepository;
    
    @Test
    void shouldProcessEventSuccessfully() {
        // Given
        Event event = new Event("test-event");
        when(eventRepository.save(any(Event.class)))
            .thenReturn(event);
        
        // When
        Event result = eventService.processEvent(event);
        
        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo("test-event");
        verify(eventRepository).save(event);
    }
}
```

### 8. Logging

```java
@Slf4j
@Service
public class EventService {
    
    public void processEvent(Event event) {
        log.debug("Starting event processing: {}", event.getId());
        try {
            // Processing logic
            log.info("Event processed successfully: {}", event.getId());
        } catch (Exception e) {
            log.error("Failed to process event: {}", event.getId(), e);
            throw new EventProcessingException("Event processing failed", e);
        }
    }
}
```

### 9. Security

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**").permitAll()
                .requestMatchers("/api/**").authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
            )
            .build();
    }
}
```

## Best Practices

1. **Dependency Injection**
   - Use constructor injection with `@RequiredArgsConstructor`
   - Avoid field injection with `@Autowired`

2. **Immutability**
   - Use `final` fields where possible
   - Use immutable collections
   - Use builder pattern for complex objects

3. **Error Handling**
   - Use custom exceptions
   - Include meaningful error messages
   - Log exceptions with context

4. **Testing**
   - Write unit tests for all business logic
   - Use integration tests for external dependencies
   - Follow AAA pattern (Arrange, Act, Assert)

5. **Documentation**
   - Document public APIs
   - Include Javadoc for complex methods
   - Keep README files up to date

6. **Performance**
   - Use appropriate data structures
   - Implement caching where beneficial
   - Monitor and optimize database queries

## Tools and Automation

### 1. Maven Configuration

```xml
<build>
    <plugins>
        <plugin>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-maven-plugin</artifactId>
        </plugin>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <configuration>
                <source>21</source>
                <target>21</target>
            </configuration>
        </plugin>
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-checkstyle-plugin</artifactId>
            <configuration>
                <configLocation>google_checks.xml</configLocation>
            </configuration>
        </plugin>
    </plugins>
</build>
```

### 2. IDE Configuration

```xml
<!-- .idea/codeStyles/Project.xml -->
<component name="ProjectCodeStyleConfiguration">
    <code_scheme name="Project" version="173">
        <JavaCodeStyleSettings>
            <option name="CLASS_COUNT_TO_USE_IMPORT_ON_DEMAND" value="999" />
            <option name="NAMES_COUNT_TO_USE_IMPORT_ON_DEMAND" value="999" />
            <option name="PACKAGES_TO_USE_IMPORT_ON_DEMAND">
                <array />
            </option>
        </JavaCodeStyleSettings>
    </code_scheme>
</component>
```

## Next Steps

- [Development Setup](setup.md) - Set up your environment
- [Architecture](architecture.md) - Understand the codebase
- [Contributing](contributing.md) - Learn how to contribute
- [Testing](testing.md) - Learn about testing 