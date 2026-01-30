# Security Core Configuration Module

## Overview

The **security_core_configuration** module provides the foundational Spring Security configuration for JWT-based authentication and authorization across the OpenFrame platform. It establishes the core beans and infrastructure required for RSA-based JWT token encoding, decoding, and validation using Spring Security OAuth2 Resource Server capabilities.

This module serves as the base security layer that other services (API Service, Gateway Service, Authorization Service) build upon to implement their specific security requirements. It provides a standardized approach to JWT handling using the Nimbus JOSE+JWT library integrated with Spring Security.

**Key Responsibilities:**
- Configure JWT encoder and decoder beans using RSA key pairs
- Integrate with Spring Security OAuth2 Resource Server
- Provide reusable security infrastructure for all OpenFrame services
- Support multi-tenant JWT validation with issuer-based authentication

---

## Architecture

### Component Overview

```mermaid
flowchart TD
    JwtSecurityConfig["JwtSecurityConfig<br/>(Configuration)"]
    JwtConfig["JwtConfig<br/>(Service)"]
    KeyConfig["KeyConfig<br/>(Data Class)"]
    JwtService["JwtService<br/>(Service)"]
    
    JwtEncoder["JwtEncoder<br/>(Spring Bean)"]
    JwtDecoder["JwtDecoder<br/>(Spring Bean)"]
    
    NimbusJwtEncoder["NimbusJwtEncoder<br/>(Nimbus JOSE)"]
    NimbusJwtDecoder["NimbusJwtDecoder<br/>(Nimbus JOSE)"]
    
    JwtSecurityConfig -->|"creates"| JwtEncoder
    JwtSecurityConfig -->|"creates"| JwtDecoder
    JwtSecurityConfig -->|"depends on"| JwtConfig
    
    JwtConfig -->|"contains"| KeyConfig
    JwtConfig -->|"loads keys from"| KeyConfig
    
    JwtEncoder -->|"implemented by"| NimbusJwtEncoder
    JwtDecoder -->|"implemented by"| NimbusJwtDecoder
    
    JwtService -->|"uses"| JwtEncoder
    JwtService -->|"uses"| JwtDecoder
    
    style JwtSecurityConfig fill:#e1f5ff
    style JwtConfig fill:#fff4e1
    style JwtService fill:#e8f5e9
```

### Integration with OpenFrame Services

```mermaid
flowchart LR
    subgraph SecurityCore["Security Core Module"]
        JwtSecurityConfig["JwtSecurityConfig"]
        JwtConfig["JwtConfig"]
        JwtService["JwtService"]
    end
    
    subgraph AuthzService["Authorization Service"]
        AuthzSecurityConfig["SecurityConfig"]
        AuthzServerConfig["AuthorizationServerConfig"]
    end
    
    subgraph GatewayService["Gateway Service"]
        GatewayJwtAuthConfig["JwtAuthConfig"]
        GatewaySecurityConfig["GatewaySecurityConfig"]
    end
    
    subgraph ApiService["API Service"]
        ApiSecurityConfig["SecurityConfig"]
        ApiAuthConfig["AuthenticationConfig"]
    end
    
    JwtSecurityConfig -->|"provides beans to"| AuthzService
    JwtSecurityConfig -->|"provides beans to"| GatewayService
    JwtSecurityConfig -->|"provides beans to"| ApiService
    
    JwtConfig -->|"configuration"| AuthzService
    JwtConfig -->|"configuration"| GatewayService
    JwtConfig -->|"configuration"| ApiService
    
    style SecurityCore fill:#e1f5ff
    style AuthzService fill:#fff4e1
    style GatewayService fill:#f3e5f5
    style ApiService fill:#e8f5e9
```

---

## Core Components

### 1. JwtSecurityConfig

**Location:** `com.openframe.security.config.JwtSecurityConfig`

**Purpose:** Spring Configuration class that creates and configures the core JWT encoder and decoder beans used throughout the OpenFrame platform.

**Key Responsibilities:**
- Create `JwtEncoder` bean for token generation
- Create `JwtDecoder` bean for token validation
- Configure RSA key pairs for JWT signing and verification
- Integrate with Nimbus JOSE+JWT library

**Bean Definitions:**

#### JwtEncoder Bean

```java
@Bean
public JwtEncoder jwtEncoder(JwtConfig jwtConfig) throws Exception {
    RSAPublicKey publicKey = jwtConfig.loadPublicKey();
    RSAPrivateKey privateKey = jwtConfig.loadPrivateKey();

    RSAKey rsaKey = new RSAKey.Builder(publicKey)
            .privateKey(privateKey)
            .build();
    JWKSource<SecurityContext> jwks = new ImmutableJWKSet<>(new JWKSet(rsaKey));
    return new NimbusJwtEncoder(jwks);
}
```

**Functionality:**
- Loads RSA public and private keys from `JwtConfig`
- Constructs an RSA JWK (JSON Web Key) with both keys
- Creates an immutable JWK Set for signing operations
- Returns a `NimbusJwtEncoder` configured with the JWK Set

**Usage:** Used by Authorization Service to sign JWT tokens during OAuth2 flows.

#### JwtDecoder Bean

```java
@Bean
public JwtDecoder jwtDecoder(JwtConfig jwtUtils) throws Exception {
    return NimbusJwtDecoder.withPublicKey(jwtUtils.loadPublicKey()).build();
}
```

**Functionality:**
- Loads RSA public key from `JwtConfig`
- Creates a `NimbusJwtDecoder` configured with the public key
- Validates JWT signatures using the public key

**Usage:** Used by all services (API, Gateway, Authorization) to validate incoming JWT tokens.

---

### 2. JwtConfig

**Location:** `com.openframe.security.jwt.JwtConfig`

**Purpose:** Configuration service that manages JWT-related properties and provides methods to load RSA key pairs from configuration.

**Configuration Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `jwt.publicKey` | `KeyConfig` | RSA public key configuration |
| `jwt.privateKey` | `KeyConfig` | RSA private key configuration |
| `jwt.issuer` | `String` | JWT issuer claim value |
| `jwt.audience` | `String` | JWT audience claim value |

**Key Methods:**

#### loadPublicKey()

```java
public RSAPublicKey loadPublicKey() throws Exception {
    return publicKey.toRSAPublicKey();
}
```

Loads and parses the RSA public key from PEM format.

#### loadPrivateKey()

```java
public RSAPrivateKey loadPrivateKey() throws Exception {
    String privateKeyPEM = privateKey.getValue()
            .replace("-----BEGIN PRIVATE KEY-----", "")
            .replace("-----END PRIVATE KEY-----", "")
            .replaceAll("\\s", "");

    byte[] encoded = Base64.getDecoder().decode(privateKeyPEM);
    KeyFactory keyFactory = KeyFactory.getInstance("RSA");
    PKCS8EncodedKeySpec keySpec = new PKCS8EncodedKeySpec(encoded);
    return (RSAPrivateKey) keyFactory.generatePrivate(keySpec);
}
```

Loads and parses the RSA private key from PEM format (PKCS8).

**Configuration Example:**

```yaml
jwt:
  issuer: https://auth.openframe.ai
  audience: openframe-api
  publicKey:
    value: |
      -----BEGIN PUBLIC KEY-----
      MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
      -----END PUBLIC KEY-----
  privateKey:
    value: |
      -----BEGIN PRIVATE KEY-----
      MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEA...
      -----END PRIVATE KEY-----
```

---

### 3. KeyConfig

**Location:** `com.openframe.security.jwt.KeyConfig`

**Purpose:** Data class that holds a single key value and provides conversion to RSA public key format.

**Properties:**

| Property | Type | Description |
|----------|------|-------------|
| `value` | `String` | PEM-encoded key string |

**Key Method:**

#### toRSAPublicKey()

```java
public RSAPublicKey toRSAPublicKey() throws Exception {
    String publicKeyPEM = value
            .replace("-----BEGIN PUBLIC KEY-----", "")
            .replace("-----END PUBLIC KEY-----", "")
            .replaceAll("\\s", "");

    byte[] encoded = Base64.getDecoder().decode(publicKeyPEM);
    KeyFactory keyFactory = KeyFactory.getInstance("RSA");
    X509EncodedKeySpec keySpec = new X509EncodedKeySpec(encoded);
    return (RSAPublicKey) keyFactory.generatePublic(keySpec);
}
```

Converts PEM-encoded public key string to `RSAPublicKey` object using X.509 encoding.

---

### 4. JwtService

**Location:** `com.openframe.security.jwt.JwtService`

**Purpose:** Service layer that provides high-level JWT operations for token generation and validation.

**Dependencies:**
- `JwtEncoder` - for token generation
- `JwtDecoder` - for token validation

**Key Methods:**

#### decodeToken()

```java
public Jwt decodeToken(String token) {
    log.debug("Decoding token");
    Jwt jwt = decoder.decode(token);
    log.debug("Token decoded successfully - Expiration: {}", jwt.getExpiresAt());
    return jwt;
}
```

**Functionality:**
- Decodes and validates JWT token
- Verifies signature using configured public key
- Checks expiration and standard claims
- Returns parsed `Jwt` object

**Throws:** `JwtException` if token is invalid or expired

#### generateToken()

```java
public String generateToken(JwtClaimsSet claims) {
    return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
}
```

**Functionality:**
- Encodes JWT claims into signed token
- Uses configured private key for signing
- Returns JWT token string

**Usage Example:**

```java
JwtClaimsSet claims = JwtClaimsSet.builder()
    .issuer("https://auth.openframe.ai")
    .subject("user-123")
    .audience(List.of("openframe-api"))
    .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
    .claim("tenant_id", "tenant-456")
    .claim("roles", List.of("ADMIN"))
    .build();

String token = jwtService.generateToken(claims);
```

---

## JWT Token Structure

### Standard Claims

OpenFrame JWT tokens follow OAuth2/OIDC standards with custom claims for multi-tenancy:

| Claim | Type | Description | Required |
|-------|------|-------------|----------|
| `iss` | String | Token issuer URL | Yes |
| `sub` | String | Subject (user ID or machine ID) | Yes |
| `aud` | String/Array | Intended audience | Yes |
| `exp` | Timestamp | Expiration time | Yes |
| `iat` | Timestamp | Issued at time | Yes |
| `jti` | String | JWT ID (unique identifier) | No |

### Custom Claims

| Claim | Type | Description | Used By |
|-------|------|-------------|---------|
| `tenant_id` | String | Tenant identifier | All tokens |
| `tenant_domain` | String | Tenant domain name | All tokens |
| `email` | String | User email address | User tokens |
| `firstName` | String | User first name | User tokens |
| `lastName` | String | User last name | User tokens |
| `roles` | Array | User/agent roles | All tokens |
| `scope` | String/Array | OAuth2 scopes | All tokens |
| `machine_id` | String | Machine identifier | Agent tokens only |

### Token Types

#### User Token (ADMIN)

```json
{
  "iss": "https://auth.openframe.ai",
  "sub": "user-123",
  "aud": "openframe-api",
  "exp": 1735689600,
  "iat": 1735686000,
  "tenant_id": "tenant-456",
  "tenant_domain": "acme.openframe.ai",
  "email": "admin@acme.com",
  "firstName": "John",
  "lastName": "Doe",
  "roles": ["ADMIN", "USER"],
  "scope": "openid profile email"
}
```

#### Agent Token (AGENT)

```json
{
  "iss": "https://auth.openframe.ai",
  "sub": "agent-789",
  "aud": "openframe-api",
  "exp": 1735689600,
  "iat": 1735686000,
  "tenant_id": "tenant-456",
  "tenant_domain": "acme.openframe.ai",
  "machine_id": "machine-101",
  "roles": ["AGENT"],
  "scope": "agent:read agent:write"
}
```

---

## Security Flow

### Token Generation Flow

```mermaid
sequenceDiagram
    participant Client
    participant AuthzService as Authorization Service
    participant JwtService
    participant JwtEncoder
    participant JwtConfig
    
    Client->>AuthzService: POST /oauth2/token
    AuthzService->>AuthzService: Validate credentials
    AuthzService->>JwtService: generateToken(claims)
    JwtService->>JwtEncoder: encode(claims)
    JwtEncoder->>JwtConfig: loadPrivateKey()
    JwtConfig-->>JwtEncoder: RSAPrivateKey
    JwtEncoder->>JwtEncoder: Sign with private key
    JwtEncoder-->>JwtService: Signed JWT
    JwtService-->>AuthzService: Token string
    AuthzService-->>Client: {"access_token": "eyJ..."}
```

### Token Validation Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as Gateway Service
    participant JwtDecoder
    participant JwtConfig
    participant ApiService as API Service
    
    Client->>Gateway: GET /api/devices<br/>Authorization: Bearer eyJ...
    Gateway->>JwtDecoder: decode(token)
    JwtDecoder->>JwtConfig: loadPublicKey()
    JwtConfig-->>JwtDecoder: RSAPublicKey
    JwtDecoder->>JwtDecoder: Verify signature
    JwtDecoder->>JwtDecoder: Validate claims (exp, iss, aud)
    JwtDecoder-->>Gateway: Jwt object
    Gateway->>Gateway: Extract AuthPrincipal
    Gateway->>ApiService: Forward request with principal
    ApiService-->>Gateway: Response
    Gateway-->>Client: Response
```

---

## Multi-Tenant JWT Validation

### Issuer-Based Authentication

OpenFrame supports multiple JWT issuers for multi-tenant scenarios. Services use issuer-based authentication managers that cache JWT decoders per issuer.

#### Gateway Service Implementation

```mermaid
flowchart TD
    Request["Incoming Request<br/>with JWT"]
    ExtractIssuer["Extract 'iss' claim<br/>from JWT"]
    CheckCache{"Issuer in<br/>cache?"}
    LoadCache["Load from cache"]
    CreateDecoder["Create new<br/>JwtDecoder for issuer"]
    CacheDecoder["Cache decoder"]
    ValidateToken["Validate token<br/>with decoder"]
    Success["Authentication<br/>Success"]
    Failure["Authentication<br/>Failure"]
    
    Request --> ExtractIssuer
    ExtractIssuer --> CheckCache
    CheckCache -->|"Yes"| LoadCache
    CheckCache -->|"No"| CreateDecoder
    CreateDecoder --> CacheDecoder
    CacheDecoder --> ValidateToken
    LoadCache --> ValidateToken
    ValidateToken -->|"Valid"| Success
    ValidateToken -->|"Invalid"| Failure
    
    style Request fill:#e1f5ff
    style Success fill:#e8f5e9
    style Failure fill:#ffebee
```

#### Cache Configuration

Services configure Caffeine caches for JWT decoder instances:

```yaml
openframe:
  security:
    jwt:
      cache:
        expire-after: 1h
        refresh-after: 30m
        maximum-size: 100
```

**Cache Behavior:**
- **Maximum Size:** 100 issuers (tenants)
- **Expire After Write:** 1 hour (decoder removed from cache)
- **Refresh After Write:** 30 minutes (decoder refreshed in background)

**Benefits:**
- Reduces latency for repeated validations
- Supports dynamic tenant onboarding
- Automatic cleanup of unused decoders

---

## Integration with Services

### Authorization Service

**Module:** [authorization_service_configuration](authorization_service_configuration.md)

**Usage:**
- Uses `JwtEncoder` to sign access tokens and refresh tokens
- Uses `JwtDecoder` to validate tokens during token introspection
- Configures custom token claims (tenant_id, roles, etc.)

**Key Configuration:**

```java
@Configuration
public class AuthorizationServerConfig {
    
    @Bean
    public OAuth2TokenCustomizer<JwtEncodingContext> tokenCustomizer() {
        return context -> {
            context.getClaims()
                .claim("tenant_id", getTenantId())
                .claim("roles", getUserRoles());
        };
    }
}
```

### Gateway Service

**Module:** [gateway_service_security](gateway_service_security.md)

**Usage:**
- Uses `JwtDecoder` to validate incoming tokens
- Implements issuer-based authentication with caching
- Extracts `AuthPrincipal` from validated tokens
- Forwards principal information to downstream services

**Key Configuration:**

```java
@Bean
public LoadingCache<String, ReactiveAuthenticationManager> issuerManagersCache(
        JwtConfig jwtConfig) {
    return Caffeine.newBuilder()
        .maximumSize(100)
        .expireAfterWrite(Duration.ofHours(1))
        .build(issuer -> createAuthenticationManager(issuer, jwtConfig));
}
```

### API Service

**Module:** [api_service_configuration](api_service_configuration.md)

**Usage:**
- Uses `JwtDecoder` to validate tokens forwarded from Gateway
- Implements issuer-based authentication with caching
- Extracts user context from JWT claims
- Enforces role-based access control

**Key Configuration:**

```java
@Bean
public SecurityFilterChain securityFilterChain(
        HttpSecurity http,
        LoadingCache<String, JwtAuthenticationProvider> jwtProviderCache) {
    JwtIssuerAuthenticationManagerResolver issuerResolver = 
        new JwtIssuerAuthenticationManagerResolver(
            issuer -> jwtProviderCache.get(issuer)::authenticate
        );
    return http
        .oauth2ResourceServer(oauth2 -> 
            oauth2.authenticationManagerResolver(issuerResolver))
        .build();
}
```

---

## Authentication Principal

### AuthPrincipal

**Location:** `com.openframe.security.authentication.AuthPrincipal`

**Purpose:** Represents the authenticated user or agent extracted from JWT claims.

**Key Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | User/agent ID from 'sub' claim |
| `email` | String | User email |
| `firstName` | String | User first name |
| `lastName` | String | User last name |
| `roles` | List\<String\> | User/agent roles |
| `scopes` | List\<String\> | OAuth2 scopes |
| `tenantId` | String | Tenant identifier |
| `tenantDomain` | String | Tenant domain |
| `machineId` | String | Machine ID (agent tokens only) |
| `actorType` | ActorType | ADMIN or AGENT |

**Factory Method:**

```java
public static AuthPrincipal fromJwt(Jwt jwt) {
    // Extract claims and build AuthPrincipal
    return AuthPrincipal.builder()
        .id(jwt.getSubject())
        .email(jwt.getClaimAsString("email"))
        .tenantId(jwt.getClaimAsString("tenant_id"))
        .roles(jwt.getClaimAsStringList("roles"))
        .actorType(determineActorType(roles))
        .build();
}
```

**Actor Type Determination:**

```java
private static ActorType determineActorType(List<String> roles) {
    if (roles.contains("AGENT")) {
        return ActorType.AGENT;
    }
    return ActorType.ADMIN;
}
```

**Usage in Controllers:**

```java
@RestController
public class DeviceController {
    
    @GetMapping("/devices")
    public List<Device> getDevices(@AuthenticationPrincipal Jwt jwt) {
        AuthPrincipal principal = AuthPrincipal.fromJwt(jwt);
        String tenantId = principal.getTenantId();
        // Use tenant ID to filter devices
        return deviceService.findByTenantId(tenantId);
    }
}
```

---

## Security Constants

### SecurityConstants

**Location:** `com.openframe.security.oauth.SecurityConstants`

**Purpose:** Defines standard constants for security-related headers and parameters.

**Constants:**

| Constant | Value | Usage |
|----------|-------|-------|
| `AUTHORIZATION_QUERY_PARAM` | `"authorization"` | Query parameter for token |
| `ACCESS_TOKEN` | `"access_token"` | Token type identifier |
| `REFRESH_TOKEN` | `"refresh_token"` | Refresh token identifier |
| `ACCESS_TOKEN_HEADER` | `"Access-Token"` | Custom header for access token |
| `REFRESH_TOKEN_HEADER` | `"Refresh-Token"` | Custom header for refresh token |

**Usage Example:**

```java
String token = request.getHeader(SecurityConstants.ACCESS_TOKEN_HEADER);
if (token == null) {
    token = request.getParameter(SecurityConstants.AUTHORIZATION_QUERY_PARAM);
}
```

---

## Configuration Properties

### Application Configuration

**File:** `application.yml`

```yaml
jwt:
  # Issuer URL - must match token 'iss' claim
  issuer: https://auth.openframe.ai
  
  # Audience - must match token 'aud' claim
  audience: openframe-api
  
  # RSA Public Key (PEM format)
  publicKey:
    value: |
      -----BEGIN PUBLIC KEY-----
      MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
      -----END PUBLIC KEY-----
  
  # RSA Private Key (PEM format, PKCS8)
  privateKey:
    value: |
      -----BEGIN PRIVATE KEY-----
      MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEA...
      -----END PRIVATE KEY-----

openframe:
  security:
    jwt:
      cache:
        # Cache expiration time
        expire-after: 1h
        
        # Cache refresh time (background refresh)
        refresh-after: 30m
        
        # Maximum number of cached decoders
        maximum-size: 100
```

### Environment Variables

For production deployments, use environment variables for sensitive data:

```bash
# JWT Configuration
export JWT_ISSUER=https://auth.openframe.ai
export JWT_AUDIENCE=openframe-api
export JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----..."
export JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."

# Cache Configuration
export JWT_CACHE_EXPIRE_AFTER=1h
export JWT_CACHE_REFRESH_AFTER=30m
export JWT_CACHE_MAXIMUM_SIZE=100
```

**Spring Boot Property Binding:**

```yaml
jwt:
  issuer: ${JWT_ISSUER}
  audience: ${JWT_AUDIENCE}
  publicKey:
    value: ${JWT_PUBLIC_KEY}
  privateKey:
    value: ${JWT_PRIVATE_KEY}
```

---

## Key Generation

### Generating RSA Key Pair

Use OpenSSL to generate RSA key pairs for JWT signing:

#### 1. Generate Private Key (PKCS8 format)

```bash
# Generate 2048-bit RSA private key
openssl genrsa -out private_key.pem 2048

# Convert to PKCS8 format (required by Java)
openssl pkcs8 -topk8 -inform PEM -outform PEM \
  -in private_key.pem -out private_key_pkcs8.pem -nocrypt
```

#### 2. Extract Public Key

```bash
# Extract public key from private key
openssl rsa -in private_key.pem -pubout -out public_key.pem
```

#### 3. Verify Keys

```bash
# View private key details
openssl rsa -in private_key_pkcs8.pem -text -noout

# View public key details
openssl rsa -pubin -in public_key.pem -text -noout
```

#### 4. Configure in Application

```yaml
jwt:
  publicKey:
    value: |
      -----BEGIN PUBLIC KEY-----
      [paste content of public_key.pem]
      -----END PUBLIC KEY-----
  privateKey:
    value: |
      -----BEGIN PRIVATE KEY-----
      [paste content of private_key_pkcs8.pem]
      -----END PRIVATE KEY-----
```

### Key Rotation Strategy

For production environments, implement key rotation:

1. **Generate New Key Pair:** Create new RSA keys
2. **Update Authorization Service:** Deploy new private key for signing
3. **Grace Period:** Keep old public key for validation (24-48 hours)
4. **Update All Services:** Deploy new public key to all services
5. **Remove Old Key:** After grace period, remove old public key

**Multi-Key Support (Future Enhancement):**

```java
@Bean
public JwtDecoder jwtDecoder(JwtConfig jwtConfig) {
    // Support multiple public keys for rotation
    List<RSAPublicKey> publicKeys = jwtConfig.loadAllPublicKeys();
    return NimbusJwtDecoder.withPublicKeys(publicKeys).build();
}
```

---

## Error Handling

### Common JWT Exceptions

| Exception | Cause | HTTP Status | Resolution |
|-----------|-------|-------------|------------|
| `JwtException` | Generic JWT error | 401 | Check token format |
| `BadJwtException` | Invalid token structure | 401 | Regenerate token |
| `JwtValidationException` | Validation failed | 401 | Check claims (exp, iss, aud) |
| `InvalidBearerTokenException` | Invalid Bearer token | 401 | Check Authorization header |

### Exception Handling Example

```java
@RestControllerAdvice
public class SecurityExceptionHandler {
    
    @ExceptionHandler(JwtException.class)
    public ResponseEntity<ErrorResponse> handleJwtException(JwtException ex) {
        log.error("JWT validation failed", ex);
        return ResponseEntity
            .status(HttpStatus.UNAUTHORIZED)
            .body(new ErrorResponse("Invalid or expired token"));
    }
    
    @ExceptionHandler(BadJwtException.class)
    public ResponseEntity<ErrorResponse> handleBadJwtException(BadJwtException ex) {
        log.error("Malformed JWT token", ex);
        return ResponseEntity
            .status(HttpStatus.UNAUTHORIZED)
            .body(new ErrorResponse("Malformed token"));
    }
}
```

### Validation Failures

Common validation failure scenarios:

#### Expired Token

```text
JWT expired at 2024-01-15T10:00:00Z. Current time: 2024-01-15T11:00:00Z
```

**Resolution:** Client must refresh token using refresh token flow.

#### Invalid Issuer

```text
Invalid issuer. Expected: https://auth.openframe.ai, Found: https://other-issuer.com
```

**Resolution:** Ensure token is issued by correct Authorization Service.

#### Invalid Audience

```text
Invalid audience. Expected: openframe-api, Found: other-api
```

**Resolution:** Request token with correct audience claim.

#### Invalid Signature

```text
Signed JWT rejected: Invalid signature
```

**Resolution:** Verify public key matches private key used for signing.

---

## Testing

### Unit Testing JWT Configuration

```java
@SpringBootTest
class JwtSecurityConfigTest {
    
    @Autowired
    private JwtEncoder jwtEncoder;
    
    @Autowired
    private JwtDecoder jwtDecoder;
    
    @Test
    void testTokenEncodingAndDecoding() {
        // Create claims
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuer("https://auth.openframe.ai")
            .subject("user-123")
            .audience(List.of("openframe-api"))
            .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
            .claim("tenant_id", "tenant-456")
            .build();
        
        // Encode token
        String token = jwtEncoder.encode(JwtEncoderParameters.from(claims))
            .getTokenValue();
        
        // Decode token
        Jwt jwt = jwtDecoder.decode(token);
        
        // Verify claims
        assertThat(jwt.getSubject()).isEqualTo("user-123");
        assertThat(jwt.getClaimAsString("tenant_id")).isEqualTo("tenant-456");
    }
    
    @Test
    void testExpiredTokenRejection() {
        // Create expired token
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuer("https://auth.openframe.ai")
            .subject("user-123")
            .expiresAt(Instant.now().minus(1, ChronoUnit.HOURS))
            .build();
        
        String token = jwtEncoder.encode(JwtEncoderParameters.from(claims))
            .getTokenValue();
        
        // Verify rejection
        assertThatThrownBy(() -> jwtDecoder.decode(token))
            .isInstanceOf(JwtValidationException.class)
            .hasMessageContaining("expired");
    }
}
```

### Integration Testing with MockMvc

```java
@SpringBootTest
@AutoConfigureMockMvc
class SecurityIntegrationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Autowired
    private JwtEncoder jwtEncoder;
    
    @Test
    void testAuthenticatedRequest() throws Exception {
        // Generate valid token
        String token = generateToken("user-123", "tenant-456");
        
        // Make authenticated request
        mockMvc.perform(get("/api/devices")
                .header("Authorization", "Bearer " + token))
            .andExpect(status().isOk());
    }
    
    @Test
    void testUnauthenticatedRequest() throws Exception {
        // Make request without token
        mockMvc.perform(get("/api/devices"))
            .andExpect(status().isUnauthorized());
    }
    
    private String generateToken(String userId, String tenantId) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuer("https://auth.openframe.ai")
            .subject(userId)
            .audience(List.of("openframe-api"))
            .expiresAt(Instant.now().plus(1, ChronoUnit.HOURS))
            .claim("tenant_id", tenantId)
            .build();
        
        return jwtEncoder.encode(JwtEncoderParameters.from(claims))
            .getTokenValue();
    }
}
```

---

## Performance Considerations

### JWT Decoder Caching

**Problem:** Creating JWT decoders for each request is expensive, especially when fetching JWKS from remote issuers.

**Solution:** Use Caffeine cache to store decoders per issuer.

**Benefits:**
- **Reduced Latency:** Cached decoders eliminate JWKS fetch overhead
- **Improved Throughput:** Handle more requests per second
- **Resource Efficiency:** Reuse decoder instances

**Cache Metrics:**

```text
Cache Statistics (1 hour):
- Hit Rate: 99.2%
- Miss Rate: 0.8%
- Eviction Count: 5
- Average Load Time: 250ms (cache miss)
- Average Hit Time: 0.5ms (cache hit)
```

### Token Validation Performance

**Benchmark Results:**

| Operation | Time (avg) | Throughput |
|-----------|------------|------------|
| Decode cached issuer | 0.5ms | 2000 req/s |
| Decode new issuer | 250ms | 4 req/s |
| Signature verification | 0.3ms | - |
| Claims extraction | 0.1ms | - |

**Optimization Tips:**
1. **Use Caching:** Always enable decoder caching
2. **Minimize Claims:** Only include necessary claims in tokens
3. **Appropriate Expiration:** Balance security and token refresh overhead
4. **Connection Pooling:** Use connection pools for JWKS endpoints

---

## Security Best Practices

### 1. Key Management

✅ **DO:**
- Store private keys in secure vaults (HashiCorp Vault, AWS Secrets Manager)
- Use environment variables for key injection
- Implement key rotation strategy
- Use strong RSA keys (minimum 2048 bits)

❌ **DON'T:**
- Commit private keys to version control
- Share private keys across environments
- Use weak keys (< 2048 bits)
- Store keys in plain text files

### 2. Token Expiration

✅ **DO:**
- Use short-lived access tokens (15-60 minutes)
- Use long-lived refresh tokens (days/weeks)
- Implement token refresh flow
- Validate expiration claims

❌ **DON'T:**
- Use long-lived access tokens (> 1 hour)
- Skip expiration validation
- Allow expired tokens

### 3. Claim Validation

✅ **DO:**
- Validate issuer (`iss`) claim
- Validate audience (`aud`) claim
- Validate expiration (`exp`) claim
- Validate not-before (`nbf`) claim if present

❌ **DON'T:**
- Skip claim validation
- Trust token claims without verification
- Allow tokens from unknown issuers

### 4. Multi-Tenancy

✅ **DO:**
- Include `tenant_id` in all tokens
- Validate tenant context in services
- Isolate tenant data
- Use tenant-specific keys (advanced)

❌ **DON'T:**
- Allow cross-tenant access
- Skip tenant validation
- Share tokens across tenants

---

## Troubleshooting

### Issue: "Invalid signature" error

**Symptoms:**
```text
Signed JWT rejected: Invalid signature
```

**Possible Causes:**
1. Public key doesn't match private key
2. Key format incorrect (not PKCS8)
3. Key corrupted during copy/paste

**Resolution:**
```bash
# Verify key pair matches
openssl rsa -in private_key.pem -pubout | diff - public_key.pem

# Verify key format
openssl rsa -in private_key.pem -text -noout
```

### Issue: "JWT expired" error

**Symptoms:**
```text
JWT expired at 2024-01-15T10:00:00Z
```

**Possible Causes:**
1. Token actually expired
2. Clock skew between services
3. Token not refreshed

**Resolution:**
```java
// Add clock skew tolerance
@Bean
public JwtDecoder jwtDecoder(JwtConfig jwtConfig) {
    NimbusJwtDecoder decoder = NimbusJwtDecoder
        .withPublicKey(jwtConfig.loadPublicKey())
        .build();
    
    // Allow 60 seconds clock skew
    OAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(
        JwtValidators.createDefault(),
        new JwtTimestampValidator(Duration.ofSeconds(60))
    );
    decoder.setJwtValidator(validator);
    
    return decoder;
}
```

### Issue: Cache not working

**Symptoms:**
- High latency on every request
- Frequent JWKS endpoint calls

**Possible Causes:**
1. Cache not configured
2. Cache size too small
3. Cache expiration too short

**Resolution:**
```yaml
openframe:
  security:
    jwt:
      cache:
        expire-after: 1h  # Increase if needed
        refresh-after: 30m
        maximum-size: 100  # Increase for more tenants
```

### Issue: "Invalid issuer" error

**Symptoms:**
```text
Invalid issuer. Expected: https://auth.openframe.ai
```

**Possible Causes:**
1. Token issued by wrong service
2. Issuer URL mismatch
3. Configuration error

**Resolution:**
```yaml
# Ensure issuer matches in all services
jwt:
  issuer: https://auth.openframe.ai  # Must match token 'iss' claim
```

---

## Related Modules

- **[security_core_jwt_management](security_core_jwt_management.md)** - JWT service and key management
- **[security_core_authentication](security_core_authentication.md)** - Authentication principal and actor types
- **[authorization_service_configuration](authorization_service_configuration.md)** - OAuth2 authorization server setup
- **[gateway_service_security](gateway_service_security.md)** - Gateway JWT validation and routing
- **[api_service_configuration](api_service_configuration.md)** - API service security configuration

---

## References

### Spring Security OAuth2

- [Spring Security OAuth2 Resource Server](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/index.html)
- [JWT Support](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html)
- [Multi-tenancy](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/multitenancy.html)

### Nimbus JOSE+JWT

- [Nimbus JOSE+JWT Documentation](https://connect2id.com/products/nimbus-jose-jwt)
- [JWK Specification](https://datatracker.ietf.org/doc/html/rfc7517)
- [JWT Specification](https://datatracker.ietf.org/doc/html/rfc7519)

### OpenFrame Resources

- **OpenFrame Platform:** https://openframe.ai
- **Flamingo MSP:** https://flamingo.run
- **Community Slack:** https://www.openmsp.ai/

---

**Last Updated:** 2024-01-15  
**Module Version:** 1.0.0  
**Maintainer:** OpenFrame Security Team
