# OpenFrame Auth Server Microservice Design

## 📦 Service Overview: `openframe-auth-server`

### Service Purpose
Dedicated microservice running Spring Authorization Server to handle:
- User authentication & authorization
- OAuth2/OIDC flows 
- JWT token issuance with RBAC claims
- Client registration & management
- Session management

## 🏗️ Project Structure

```
openframe/services/openframe-auth-server/
├── src/main/java/com/openframe/auth/
│   ├── OpenFrameAuthServerApplication.java
│   ├── config/
│   │   ├── AuthorizationServerConfig.java        # Main Spring AuthZ config
│   │   ├── SecurityConfig.java                   # Security configuration
│   │   ├── JwtCustomizerConfig.java             # Custom JWT claims
│   │   └── ClientConfig.java                    # OAuth2 clients setup
│   ├── service/
│   │   ├── UserDetailsService.java              # User authentication
│   │   ├── RbacClaimsService.java               # Generate RBAC claims
│   │   ├── OrganizationService.java             # Multi-tenant logic
│   │   └── ClientManagementService.java         # OAuth2 clients
│   ├── repository/
│   │   ├── UserRepository.java
│   │   ├── OrganizationRepository.java
│   │   ├── RoleRepository.java
│   │   └── OAuth2ClientRepository.java
│   ├── model/
│   │   ├── User.java
│   │   ├── Organization.java
│   │   ├── Role.java
│   │   └── Permission.java
│   └── controller/
│       ├── AuthController.java                  # Custom auth endpoints
│       ├── UserManagementController.java        # User CRUD
│       └── ClientManagementController.java      # OAuth2 client CRUD
├── src/main/resources/
│   ├── application.yml                          # Service configuration
│   └── db/migration/                           # Flyway migrations
└── pom.xml
```

## 🔧 Core Configuration

### 1. Authorization Server Configuration

```java
@Configuration
@EnableAuthorizationServer
public class AuthorizationServerConfig {

    @Bean
    @Order(1)
    public SecurityFilterChain authorizationServerSecurityFilterChain(
            HttpSecurity http) throws Exception {
        OAuth2AuthorizationServerConfiguration.applyDefaultSecurity(http);
        
        http.getConfigurer(OAuth2AuthorizationServerConfigurer.class)
            .oidc(Customizer.withDefaults())
            .tokenEndpoint(tokenEndpoint -> 
                tokenEndpoint.accessTokenRequestConverter(
                    new CustomAccessTokenRequestConverter()))
            .authorizationEndpoint(authorizationEndpoint ->
                authorizationEndpoint.consentPage("/oauth2/consent"));
        
        return http
            .exceptionHandling(exceptions -> exceptions
                .defaultAuthenticationEntryPointFor(
                    new LoginUrlAuthenticationEntryPoint("/login"),
                    new MediaTypeRequestMatcher(MediaType.TEXT_HTML)))
            .oauth2ResourceServer(OAuth2ResourceServerConfigurer::jwt)
            .build();
    }

    @Bean
    @Order(2)
    public SecurityFilterChain defaultSecurityFilterChain(
            HttpSecurity http) throws Exception {
        return http
            .authorizeHttpRequests(authorize -> authorize
                .requestMatchers("/actuator/health").permitAll()
                .anyRequest().authenticated())
            .formLogin(Customizer.withDefaults())
            .build();
    }

    @Bean
    public UserDetailsService userDetailsService() {
        return new OpenFrameUserDetailsService(userRepository, rbacClaimsService);
    }
}
```

### 2. JWT Customizer with RBAC Claims

```java
@Component
public class OpenFrameJwtCustomizer implements OAuth2TokenCustomizer<JwtEncodingContext> {
    
    private final RbacClaimsService rbacClaimsService;
    
    @Override
    public void customize(JwtEncodingContext context) {
        if (OAuth2TokenType.ACCESS_TOKEN.equals(context.getTokenType())) {
            Authentication principal = context.getPrincipal();
            String userId = principal.getName();
            
            // Get RBAC claims for this user
            RbacClaims rbacClaims = rbacClaimsService.generateClaims(userId);
            
            JwtClaimsSet.Builder claims = context.getClaims();
            
            // Add OpenFrame-specific claims
            claims.claim("organization_id", rbacClaims.getOrganizationId());
            claims.claim("organization_type", rbacClaims.getOrganizationType());
            claims.claim("roles", rbacClaims.getRoles());
            claims.claim("permissions", rbacClaims.getPermissions());
            claims.claim("client_access", rbacClaims.getClientAccess());
            claims.claim("module_access", rbacClaims.getModuleAccess());
            claims.claim("accessible_clients", rbacClaims.getAccessibleClients());
        }
    }
}
```

### 3. RBAC Claims Service

```java
@Service
@Transactional(readOnly = true)
public class RbacClaimsService {
    
    private final UserRepository userRepository;
    private final RedisTemplate<String, Object> redisTemplate;
    
    @Cacheable(value = "rbac-claims", key = "#userId")
    public RbacClaims generateClaims(String userId) {
        User user = userRepository.findByIdWithRoles(userId)
            .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        
        return RbacClaims.builder()
            .userId(user.getId())
            .organizationId(user.getOrganization().getId())
            .organizationType(user.getOrganization().getType())
            .roles(extractRoles(user))
            .permissions(extractPermissions(user))
            .clientAccess(extractClientAccess(user))
            .moduleAccess(extractModuleAccess(user))
            .accessibleClients(extractAccessibleClients(user))
            .build();
    }
    
    @CacheEvict(value = "rbac-claims", key = "#userId")
    public void evictUserClaims(String userId) {
        // Cache invalidation when user permissions change
    }
}
```

## 🔌 Integration with Other Services

### 1. Service Dependencies

```yaml
# application.yml
spring:
  application:
    name: openframe-auth-server
  datasource:
    url: jdbc:postgresql://postgres:5432/openframe_auth
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
  
  data:
    redis:
      host: redis
      port: 6379
      
  security:
    oauth2:
      authorizationserver:
        issuer: ${AUTH_SERVER_ISSUER:http://localhost:8090}
        
openframe:
  auth:
    jwt:
      key-store: classpath:jwks.json
      key-store-password: ${JWT_KEYSTORE_PASSWORD}
      key-alias: openframe-jwt-key
    
  cors:
    allowed-origins:
      - http://localhost:3000  # openframe-ui
      - http://localhost:8100  # openframe-gateway
      
server:
  port: 8090
```

### 2. Database Schema

```sql
-- Core RBAC tables
CREATE TABLE organizations (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- MSP, CLIENT, DEPARTMENT
    parent_id VARCHAR(36) REFERENCES organizations(id),
    domain VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    organization_id VARCHAR(36) REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    user_id VARCHAR(36) REFERENCES users(id),
    role_id VARCHAR(36) REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
    role_id VARCHAR(36) REFERENCES roles(id),
    permission_id VARCHAR(36) REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
);

-- Client access control
CREATE TABLE user_client_access (
    user_id VARCHAR(36) REFERENCES users(id),
    client_organization_id VARCHAR(36) REFERENCES organizations(id),
    access_level VARCHAR(50) NOT NULL, -- FULL, READ, NONE
    PRIMARY KEY (user_id, client_organization_id)
);

-- Module access control  
CREATE TABLE user_module_access (
    user_id VARCHAR(36) REFERENCES users(id),
    module_type VARCHAR(50) NOT NULL, -- RMM, MDM, ADMIN
    access_level VARCHAR(50) NOT NULL, -- FULL, READ, NONE
    PRIMARY KEY (user_id, module_type)
);

-- OAuth2 clients
CREATE TABLE oauth2_clients (
    id VARCHAR(100) PRIMARY KEY,
    client_id VARCHAR(100) UNIQUE NOT NULL,
    client_secret VARCHAR(255),
    client_name VARCHAR(255) NOT NULL,
    redirect_uris TEXT[], -- Array of redirect URIs
    scopes TEXT[], -- Array of scopes
    grant_types TEXT[], -- Array of grant types
    organization_id VARCHAR(36) REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🚀 Deployment & Operations

### 1. Docker Configuration

```dockerfile
# Dockerfile
FROM eclipse-temurin:21-jre-alpine

RUN addgroup -S openframe && adduser -S openframe -G openframe
USER openframe

COPY target/openframe-auth-server.jar /app/auth-server.jar

EXPOSE 8090

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q -O /dev/null http://localhost:8090/actuator/health || exit 1

ENTRYPOINT ["java", "-jar", "/app/auth-server.jar"]
```

### 2. Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openframe-auth-server
  namespace: openframe
spec:
  replicas: 3
  selector:
    matchLabels:
      app: openframe-auth-server
  template:
    metadata:
      labels:
        app: openframe-auth-server
    spec:
      containers:
      - name: auth-server
        image: openframe/auth-server:latest
        ports:
        - containerPort: 8090
        env:
        - name: DB_USERNAME
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8090
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8090
---
apiVersion: v1
kind: Service
metadata:
  name: openframe-auth-server
  namespace: openframe
spec:
  selector:
    app: openframe-auth-server
  ports:
  - port: 8090
    targetPort: 8090
```

## 🔄 Inter-Service Communication

### 1. Token Validation by Resource Servers

```java
// In openframe-api, openframe-management, etc.
@Configuration
@EnableWebSecurity
public class ResourceServerConfig {
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwkSetUri("http://openframe-auth-server:8090/oauth2/jwks")
                    .jwtAuthenticationConverter(new OpenFrameJwtAuthenticationConverter())))
            .build();
    }
}
```

### 2. Claims Extraction in Resource Servers

```java
@Component
public class OpenFrameJwtAuthenticationConverter 
    implements Converter<Jwt, AbstractAuthenticationToken> {
    
    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        Collection<GrantedAuthority> authorities = extractAuthorities(jwt);
        
        OpenFramePrincipal principal = OpenFramePrincipal.builder()
            .userId(jwt.getSubject())
            .email(jwt.getClaimAsString("email"))
            .organizationId(jwt.getClaimAsString("organization_id"))
            .organizationType(jwt.getClaimAsString("organization_type"))
            .roles(jwt.getClaimAsStringList("roles"))
            .permissions(jwt.getClaimAsStringList("permissions"))
            .clientAccess(jwt.getClaimAsMap("client_access"))
            .moduleAccess(jwt.getClaimAsMap("module_access"))
            .accessibleClients(jwt.getClaimAsStringList("accessible_clients"))
            .authorities(authorities)
            .build();
        
        return new JwtAuthenticationToken(jwt, authorities, principal);
    }
}
```

## 📊 Monitoring & Observability

### 1. Health Checks

```java
@Component
public class AuthServerHealthIndicator implements HealthIndicator {
    
    @Override
    public Health health() {
        // Check database connectivity
        // Check Redis connectivity  
        // Check JWT signing capabilities
        return Health.up()
            .withDetail("database", "healthy")
            .withDetail("redis", "healthy")
            .withDetail("jwt-signing", "operational")
            .build();
    }
}
```

### 2. Metrics

```java
@Component
public class AuthServerMetrics {
    
    private final Counter authenticationAttempts;
    private final Counter authenticationFailures;
    private final Timer tokenIssuanceTime;
    
    public AuthServerMetrics(MeterRegistry meterRegistry) {
        this.authenticationAttempts = Counter.builder("auth.attempts.total")
            .register(meterRegistry);
        this.authenticationFailures = Counter.builder("auth.failures.total")
            .register(meterRegistry);
        this.tokenIssuanceTime = Timer.builder("auth.token.issuance.time")
            .register(meterRegistry);
    }
}
```

## 🔐 Security Considerations

### 1. JWT Key Management

```java
@Configuration
public class JwtKeyConfig {
    
    @Bean
    public JWKSource<SecurityContext> jwkSource() {
        KeyPair keyPair = generateRsaKey();
        RSAKey rsaKey = new RSAKey.Builder((RSAPublicKey) keyPair.getPublic())
            .privateKey((RSAPrivateKey) keyPair.getPrivate())
            .keyID(UUID.randomUUID().toString())
            .build();
        JWKSet jwkSet = new JWKSet(rsaKey);
        return new ImmutableJWKSet<>(jwkSet);
    }
    
    @Bean
    public JwtDecoder jwtDecoder(JWKSource<SecurityContext> jwkSource) {
        return OAuth2AuthorizationServerConfiguration.jwtDecoder(jwkSource);
    }
}
```

### 2. CORS Configuration

```java
@Configuration
public class CorsConfig {
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of(
            "http://localhost:3000",  // Frontend dev
            "https://openframe.example.com"  // Production
        ));
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/oauth2/**", configuration);
        return source;
    }
}
```

## 📈 Scaling Considerations

### 1. Stateless Design
- JWT tokens are self-contained (no server-side session storage)
- RBAC claims cached in Redis for performance
- Horizontal scaling supported out-of-the-box

### 2. Performance Optimizations
- Connection pooling for database
- Redis clustering for high availability
- JWT claims caching with TTL
- Async processing where possible

### 3. High Availability
- Multiple replicas in Kubernetes
- Database replication
- Redis clustering
- Circuit breakers for external dependencies 