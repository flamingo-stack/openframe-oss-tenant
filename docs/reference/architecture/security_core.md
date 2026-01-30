# Security Core Module

## Overview

The **security_core** module is the foundational security library for the OpenFrame platform, providing comprehensive JWT-based authentication, OAuth2 security primitives, and secure cookie management. This module serves as the core security infrastructure used across all OpenFrame services including the API service, authorization service, gateway service, and external API service.

As a shared library, security_core establishes the security standards and provides reusable components that ensure consistent authentication and authorization patterns throughout the OpenFrame ecosystem.

## Purpose

The security_core module provides:

- **JWT Token Management**: Encoding, decoding, and validation of JWT tokens using RSA key pairs
- **Authentication Principal Extraction**: Automatic extraction of user/agent identity from JWT claims
- **OAuth2 Security Primitives**: PKCE utilities, state management, and OAuth2 constants
- **Secure Cookie Management**: HTTP-only, secure cookie handling for token storage
- **Multi-Actor Support**: Differentiation between human users (ADMIN) and machine agents (AGENT)
- **Multi-Tenant Security**: Tenant isolation through JWT claims validation

## Architecture Overview

The security_core module is organized into five functional sub-modules:

```mermaid
flowchart TD
    SecurityCore["Security Core Module"]
    
    SecurityCore --> JwtManagement["JWT Management"]
    SecurityCore --> Authentication["Authentication"]
    SecurityCore --> OAuth["OAuth2 Primitives"]
    SecurityCore --> Cookies["Cookie Management"]
    SecurityCore --> Config["Security Configuration"]
    
    JwtManagement --> JwtConfig["JWT Configuration"]
    JwtManagement --> JwtService["JWT Service"]
    JwtManagement --> KeyConfig["Key Configuration"]
    
    Authentication --> AuthPrincipal["Auth Principal"]
    Authentication --> ActorType["Actor Type"]
    Authentication --> Resolver["Argument Resolver"]
    
    OAuth --> PKCEUtils["PKCE Utils"]
    OAuth --> SecurityConstants["Security Constants"]
    
    Cookies --> CookieService["Cookie Service"]
    
    Config --> JwtSecurityConfig["JWT Security Config"]
    
    style SecurityCore fill:#e1f5ff
    style JwtManagement fill:#fff4e1
    style Authentication fill:#f0e1ff
    style OAuth fill:#e1ffe1
    style Cookies fill:#ffe1e1
    style Config fill:#ffe1f5
```

### Module Dependencies

The security_core module integrates with other OpenFrame modules:

```mermaid
flowchart LR
    SecurityCore["Security Core"]
    
    ApiService["API Service"]
    AuthzService["Authorization Service"]
    GatewayService["Gateway Service"]
    ExternalApi["External API"]
    ClientService["Client Service"]
    
    ApiService -->|"uses JWT validation"| SecurityCore
    AuthzService -->|"uses JWT generation"| SecurityCore
    GatewayService -->|"uses JWT validation<br/>& cookie management"| SecurityCore
    ExternalApi -->|"uses JWT validation"| SecurityCore
    ClientService -->|"uses JWT validation"| SecurityCore
    
    SecurityCore -->|"stores tokens"| Cookies["HTTP Cookies"]
    SecurityCore -->|"validates"| JWT["JWT Tokens"]
    
    style SecurityCore fill:#e1f5ff
    style ApiService fill:#fff4e1
    style AuthzService fill:#f0e1ff
    style GatewayService fill:#e1ffe1
    style ExternalApi fill:#ffe1e1
    style ClientService fill:#ffe1f5
```

## Sub-Modules

### 1. JWT Management

Handles all JWT token operations including encoding, decoding, and RSA key management.

**Core Components:**
- `JwtConfig`: Configuration properties for JWT keys, issuer, and audience
- `JwtService`: Service for encoding and decoding JWT tokens
- `KeyConfig`: RSA key pair configuration and loading
- `JwtSecurityConfig`: Spring Security configuration for JWT beans

**Key Features:**
- RSA-based JWT signing and verification
- Public/private key pair management from PEM format
- Integration with Spring Security OAuth2 JWT support
- Configurable issuer and audience validation

**Related Documentation:** [JWT Management](./security_core_jwt_management.md)

### 2. Authentication

Provides authentication principal extraction and actor type management for multi-actor scenarios.

**Core Components:**
- `AuthPrincipal`: Represents authenticated user or agent with claims
- `ActorType`: Enum distinguishing ADMIN (human) vs AGENT (machine)
- `AuthPrincipalArgumentResolver`: Spring MVC resolver for automatic principal injection

**Key Features:**
- Automatic JWT claim extraction to structured principal
- Support for user attributes (email, name, roles, scopes)
- Multi-tenant claim extraction (tenant_id, tenant_domain)
- Agent-specific claims (machine_id)
- Actor type determination based on roles

**Related Documentation:** [Authentication](./security_core_authentication.md)

### 3. OAuth2 Primitives

Provides OAuth2 security utilities including PKCE (Proof Key for Code Exchange) and security constants.

**Core Components:**
- `PKCEUtils`: Utilities for generating OAuth2 PKCE parameters
- `SecurityConstants`: Constants for OAuth2 token headers and parameters

**Key Features:**
- Cryptographically secure state generation
- PKCE code verifier and challenge generation
- SHA-256 based code challenge computation
- Standard OAuth2 constant definitions

**Related Documentation:** [OAuth2 Primitives](./security_core_oauth_primitives.md)

### 4. Cookie Management

Manages secure HTTP cookie operations for token storage and OAuth2 state management.

**Core Components:**
- `CookieService`: Service for creating, reading, and clearing secure cookies

**Key Features:**
- HTTP-only, secure cookie creation
- Configurable cookie domain and SameSite policy
- Access token and refresh token cookie management
- OAuth2 state cookie management with TTL
- Cookie clearing for logout operations
- Support for both domain-scoped and host-only cookies

**Related Documentation:** [Cookie Management](./security_core_cookie_management.md)

### 5. Security Configuration

Provides Spring Security configuration for JWT encoding and decoding beans.

**Core Components:**
- `JwtSecurityConfig`: Spring configuration for JWT encoder and decoder beans

**Key Features:**
- Automatic JWT encoder bean creation with RSA keys
- Automatic JWT decoder bean creation with public key
- Integration with Nimbus JOSE+JWT library
- Spring Security OAuth2 resource server support

**Related Documentation:** [Security Configuration](./security_core_configuration.md)

## Security Flow

### JWT Token Validation Flow

```mermaid
flowchart TD
    Start["Incoming Request"] --> HasToken{"Token Present?"}
    
    HasToken -->|"No"| Unauthorized["401 Unauthorized"]
    HasToken -->|"Yes"| ExtractToken["Extract Token<br/>(Cookie or Header)"]
    
    ExtractToken --> DecodeToken["JwtService.decodeToken()"]
    
    DecodeToken --> ValidateSignature{"Valid Signature?"}
    ValidateSignature -->|"No"| Unauthorized
    ValidateSignature -->|"Yes"| ValidateExpiry{"Token Expired?"}
    
    ValidateExpiry -->|"Yes"| Unauthorized
    ValidateExpiry -->|"No"| ExtractClaims["Extract JWT Claims"]
    
    ExtractClaims --> CreatePrincipal["AuthPrincipal.fromJwt()"]
    
    CreatePrincipal --> DetermineActor["Determine Actor Type<br/>(ADMIN or AGENT)"]
    
    DetermineActor --> InjectPrincipal["Inject AuthPrincipal<br/>into Controller"]
    
    InjectPrincipal --> ProcessRequest["Process Request"]
    
    ProcessRequest --> End["Return Response"]
    
    style Start fill:#e1f5ff
    style End fill:#e1ffe1
    style Unauthorized fill:#ffe1e1
    style CreatePrincipal fill:#fff4e1
    style DetermineActor fill:#f0e1ff
```

### OAuth2 PKCE Flow

```mermaid
sequenceDiagram
    participant Client as Client Application
    participant PKCEUtils as PKCE Utils
    participant AuthServer as Authorization Server
    participant TokenEndpoint as Token Endpoint
    
    Client->>PKCEUtils: generateState()
    PKCEUtils-->>Client: state (random)
    
    Client->>PKCEUtils: generateCodeVerifier()
    PKCEUtils-->>Client: code_verifier (random)
    
    Client->>PKCEUtils: generateCodeChallenge(verifier)
    PKCEUtils->>PKCEUtils: SHA-256 hash
    PKCEUtils-->>Client: code_challenge
    
    Client->>AuthServer: Authorization Request<br/>(state, code_challenge)
    AuthServer-->>Client: Authorization Code
    
    Client->>TokenEndpoint: Token Request<br/>(code, code_verifier)
    TokenEndpoint->>TokenEndpoint: Verify challenge matches verifier
    TokenEndpoint-->>Client: Access Token + Refresh Token
    
    Note over Client,TokenEndpoint: PKCE prevents authorization code interception attacks
```

### Cookie-Based Authentication Flow

```mermaid
flowchart TD
    Start["User Login"] --> Authenticate["Authenticate User"]
    
    Authenticate --> GenerateTokens["Generate JWT Tokens<br/>(Access + Refresh)"]
    
    GenerateTokens --> CreateCookies["CookieService.addAuthCookies()"]
    
    CreateCookies --> AccessCookie["Create access_token Cookie<br/>(Path: /, HttpOnly, Secure)"]
    CreateCookies --> RefreshCookie["Create refresh_token Cookie<br/>(Path: /oauth, HttpOnly, Secure)"]
    
    AccessCookie --> SetHeaders["Set-Cookie Headers"]
    RefreshCookie --> SetHeaders
    
    SetHeaders --> BrowserStores["Browser Stores Cookies"]
    
    BrowserStores --> SubsequentRequest["Subsequent Request"]
    
    SubsequentRequest --> AutoSend["Browser Auto-Sends Cookies"]
    
    AutoSend --> ExtractCookie["CookieService.getAccessTokenFromCookies()"]
    
    ExtractCookie --> ValidateToken["Validate JWT Token"]
    
    ValidateToken --> Authorized["Request Authorized"]
    
    style Start fill:#e1f5ff
    style Authorized fill:#e1ffe1
    style CreateCookies fill:#fff4e1
    style ValidateToken fill:#f0e1ff
```

## Integration with Other Modules

### API Service Integration

The [API Service](./api_service.md) uses security_core for:
- JWT token validation on all REST and GraphQL endpoints
- `AuthPrincipal` extraction in controllers via `@AuthenticationPrincipal`
- Multi-tenant request isolation using tenant claims

**Example Usage:**
```java
@RestController
public class UserController {
    
    @GetMapping("/api/users/me")
    public UserDTO getCurrentUser(@AuthenticationPrincipal AuthPrincipal principal) {
        // principal.getId() - user ID from JWT
        // principal.getTenantId() - tenant isolation
        // principal.getActorType() - ADMIN or AGENT
        return userService.findById(principal.getId());
    }
}
```

### Authorization Service Integration

The [Authorization Service](./authorization_service.md) uses security_core for:
- JWT token generation during OAuth2 flows
- PKCE parameter generation for secure authorization
- Cookie management for session and token storage
- OAuth2 state cookie management

**Example Usage:**
```java
@Service
public class TokenService {
    
    private final JwtService jwtService;
    private final CookieService cookieService;
    
    public TokenResponse generateTokens(User user) {
        JwtClaimsSet claims = buildClaims(user);
        String accessToken = jwtService.generateToken(claims);
        String refreshToken = jwtService.generateToken(refreshClaims);
        
        HttpHeaders headers = new HttpHeaders();
        cookieService.addAuthCookies(headers, accessToken, refreshToken);
        
        return new TokenResponse(accessToken, refreshToken, headers);
    }
}
```

### Gateway Service Integration

The [Gateway Service](./gateway_service.md) uses security_core for:
- JWT token validation before routing requests
- Cookie extraction from incoming requests
- Token refresh using refresh token cookies
- CORS and security header management

**Example Usage:**
```java
@Component
public class JwtAuthenticationFilter implements GatewayFilter {
    
    private final CookieService cookieService;
    private final JwtService jwtService;
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String token = cookieService.getAccessTokenFromCookies(exchange);
        
        if (token != null) {
            Jwt jwt = jwtService.decodeToken(token);
            // Validate and forward request
        }
        
        return chain.filter(exchange);
    }
}
```

### External API Integration

The [External API](./external_api.md) uses security_core for:
- API key and JWT token validation
- `AuthPrincipal` extraction for tenant-scoped queries
- Actor type validation for agent-specific endpoints

### Client Service Integration

The [Client Service](./client_service.md) uses security_core for:
- Agent authentication token validation
- Machine ID extraction from JWT claims
- Agent registration token generation

## Configuration

### Application Properties

The security_core module requires the following configuration properties:

```yaml
# JWT Configuration
jwt:
  public-key:
    value: |
      -----BEGIN PUBLIC KEY-----
      MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
      -----END PUBLIC KEY-----
  private-key:
    value: |
      -----BEGIN PRIVATE KEY-----
      MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
      -----END PRIVATE KEY-----
  issuer: "https://auth.openframe.ai"
  audience: "openframe-api"

# Token Expiration
security:
  oauth2:
    token:
      access:
        expiration-seconds: 3600  # 1 hour
      refresh:
        expiration-seconds: 2592000  # 30 days

# Cookie Configuration
openframe:
  security:
    cookie:
      domain: ".openframe.ai"  # Domain for cookie scope
      secure: true  # Require HTTPS
      same-site: "Lax"  # CSRF protection
```

### RSA Key Generation

Generate RSA key pairs for JWT signing:

```bash
# Generate private key
openssl genrsa -out private_key.pem 2048

# Extract public key
openssl rsa -in private_key.pem -pubout -out public_key.pem

# View keys
cat private_key.pem
cat public_key.pem
```

### Environment-Specific Configuration

**Development:**
```yaml
openframe:
  security:
    cookie:
      secure: false  # Allow HTTP for local development
      domain: null  # Host-only cookies
```

**Production:**
```yaml
openframe:
  security:
    cookie:
      secure: true  # Require HTTPS
      domain: ".openframe.ai"  # Cross-subdomain cookies
      same-site: "Strict"  # Maximum CSRF protection
```

## Security Considerations

### JWT Token Security

1. **RSA Key Management**
   - Private keys must be kept secure and never exposed
   - Use environment variables or secret management systems
   - Rotate keys periodically (recommended: every 90 days)
   - Use minimum 2048-bit RSA keys

2. **Token Expiration**
   - Access tokens: Short-lived (1 hour recommended)
   - Refresh tokens: Longer-lived (30 days recommended)
   - Implement token refresh mechanism
   - Revoke refresh tokens on logout

3. **Claim Validation**
   - Always validate issuer (`iss`) claim
   - Always validate audience (`aud`) claim
   - Validate expiration (`exp`) claim
   - Validate not-before (`nbf`) claim if present

### Cookie Security

1. **Cookie Attributes**
   - Always use `HttpOnly` to prevent XSS attacks
   - Use `Secure` flag in production (HTTPS only)
   - Set appropriate `SameSite` policy (Lax or Strict)
   - Scope cookies to specific paths when possible

2. **Cookie Domain**
   - Use domain-scoped cookies for cross-subdomain SSO
   - Use host-only cookies for single-domain applications
   - Clear both domain and host-only cookies on logout

3. **Token Storage**
   - Access tokens: Path `/` for API access
   - Refresh tokens: Path `/oauth` to limit exposure
   - OAuth state: Path `/oauth` with short TTL

### PKCE Security

1. **Code Verifier**
   - Minimum 43 characters (256 bits of entropy)
   - Use cryptographically secure random generator
   - Never transmit code verifier to authorization server

2. **Code Challenge**
   - Always use SHA-256 method (not plain)
   - Transmit challenge to authorization server
   - Server validates verifier matches challenge

3. **State Parameter**
   - Use cryptographically secure random generator
   - Minimum 128 bits of entropy
   - Validate state on callback to prevent CSRF

### Multi-Tenant Security

1. **Tenant Isolation**
   - Always validate `tenant_id` claim in JWT
   - Filter all database queries by tenant ID
   - Prevent cross-tenant data access
   - Validate tenant domain matches request

2. **Actor Type Validation**
   - Validate actor type (ADMIN vs AGENT) for endpoint access
   - Agents should only access machine-specific endpoints
   - Admins should not access agent-only endpoints
   - Gateway enforces role-based access control

## Best Practices

### JWT Token Usage

```java
// ✅ DO: Use AuthPrincipal for automatic claim extraction
@GetMapping("/api/resource")
public ResponseEntity<?> getResource(@AuthenticationPrincipal AuthPrincipal principal) {
    String userId = principal.getId();
    String tenantId = principal.getTenantId();
    // Use extracted claims
}

// ❌ DON'T: Manually parse JWT in controllers
@GetMapping("/api/resource")
public ResponseEntity<?> getResource(@RequestHeader("Authorization") String authHeader) {
    String token = authHeader.substring(7);
    Jwt jwt = jwtService.decodeToken(token);  // Avoid manual parsing
    // ...
}
```

### Cookie Management

```java
// ✅ DO: Use CookieService for consistent cookie handling
public void handleLogin(HttpHeaders headers, String accessToken, String refreshToken) {
    cookieService.addAuthCookies(headers, accessToken, refreshToken);
}

// ✅ DO: Clear all auth cookies on logout
public void handleLogout(HttpHeaders headers) {
    cookieService.addClearAuthCookies(headers);
    cookieService.addClearSasCookies(headers);
}

// ❌ DON'T: Manually create cookies
public void handleLogin(HttpHeaders headers, String accessToken) {
    String cookie = "access_token=" + accessToken + "; HttpOnly";  // Avoid manual creation
    headers.add("Set-Cookie", cookie);
}
```

### PKCE Flow

```java
// ✅ DO: Generate PKCE parameters for OAuth2 flows
public String initiateOAuthFlow() {
    String state = PKCEUtils.generateState();
    String codeVerifier = PKCEUtils.generateCodeVerifier();
    String codeChallenge = PKCEUtils.generateCodeChallenge(codeVerifier);
    
    // Store state and verifier in session/database
    storeOAuthState(state, codeVerifier);
    
    // Build authorization URL with challenge
    return buildAuthUrl(state, codeChallenge);
}

// ✅ DO: Validate state and use verifier for token exchange
public TokenResponse handleCallback(String code, String state) {
    String codeVerifier = retrieveCodeVerifier(state);
    return exchangeCodeForToken(code, codeVerifier);
}
```

### Tenant Isolation

```java
// ✅ DO: Always filter by tenant ID
@GetMapping("/api/devices")
public List<Device> getDevices(@AuthenticationPrincipal AuthPrincipal principal) {
    String tenantId = principal.getTenantId();
    return deviceRepository.findByTenantId(tenantId);
}

// ❌ DON'T: Query without tenant filtering
@GetMapping("/api/devices")
public List<Device> getDevices() {
    return deviceRepository.findAll();  // Cross-tenant data leak!
}
```

## Testing

### Unit Testing JWT Operations

```java
@SpringBootTest
class JwtServiceTest {
    
    @Autowired
    private JwtService jwtService;
    
    @Test
    void testTokenGeneration() {
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .subject("user123")
            .claim("tenant_id", "tenant456")
            .claim("roles", List.of("ADMIN"))
            .build();
        
        String token = jwtService.generateToken(claims);
        assertNotNull(token);
        
        Jwt decoded = jwtService.decodeToken(token);
        assertEquals("user123", decoded.getSubject());
        assertEquals("tenant456", decoded.getClaimAsString("tenant_id"));
    }
}
```

### Testing AuthPrincipal Extraction

```java
@WebMvcTest(UserController.class)
class UserControllerTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Test
    @WithMockUser(username = "user123")
    void testAuthPrincipalInjection() throws Exception {
        mockMvc.perform(get("/api/users/me")
                .header("Authorization", "Bearer " + generateTestToken()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value("user123"));
    }
}
```

### Testing PKCE Utilities

```java
class PKCEUtilsTest {
    
    @Test
    void testCodeVerifierAndChallenge() {
        String verifier = PKCEUtils.generateCodeVerifier();
        assertNotNull(verifier);
        assertTrue(verifier.length() >= 43);
        
        String challenge = PKCEUtils.generateCodeChallenge(verifier);
        assertNotNull(challenge);
        assertNotEquals(verifier, challenge);
    }
    
    @Test
    void testStateGeneration() {
        String state1 = PKCEUtils.generateState();
        String state2 = PKCEUtils.generateState();
        
        assertNotNull(state1);
        assertNotNull(state2);
        assertNotEquals(state1, state2);  // Should be unique
    }
}
```

## Troubleshooting

### Common Issues

**Issue: JWT Signature Validation Fails**
```text
Error: Invalid JWT signature
```

**Solution:**
- Verify public key matches private key used for signing
- Check key format (PEM with proper headers)
- Ensure no whitespace issues in key configuration
- Verify issuer and audience claims match configuration

**Issue: Cookie Not Being Sent**
```text
Error: Access token cookie not found
```

**Solution:**
- Check cookie domain matches request domain
- Verify `Secure` flag matches protocol (HTTPS required if true)
- Check `SameSite` policy allows cross-site requests
- Verify cookie path matches request path

**Issue: PKCE Validation Fails**
```text
Error: Code verifier does not match challenge
```

**Solution:**
- Ensure code verifier is stored and retrieved correctly
- Verify SHA-256 is used for challenge generation
- Check state parameter matches to retrieve correct verifier
- Ensure no URL encoding issues with verifier

**Issue: Cross-Tenant Data Access**
```text
Error: User accessing data from different tenant
```

**Solution:**
- Always extract tenant ID from `AuthPrincipal`
- Filter all queries by tenant ID
- Validate tenant ID in JWT matches request context
- Implement tenant isolation at database level

## Related Documentation

- [API Service](./api_service.md) - REST and GraphQL API using security_core
- [Authorization Service](./authorization_service.md) - OAuth2 server using security_core
- [Gateway Service](./gateway_service.md) - API gateway with JWT validation
- [Security OAuth](./security_oauth.md) - OAuth2 BFF and device flow extensions
- [External API](./external_api.md) - External API with API key and JWT auth

## Additional Resources

### Spring Security OAuth2

- [Spring Security OAuth2 Resource Server](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/index.html)
- [Spring Security JWT](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html)

### OAuth2 and PKCE

- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)

### JWT Standards

- [JWT RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)
- [JWS RFC 7515](https://datatracker.ietf.org/doc/html/rfc7515)
- [JWK RFC 7517](https://datatracker.ietf.org/doc/html/rfc7517)

---

**Module Version:** 1.0  
**Last Updated:** 2024  
**Maintained By:** OpenFrame Security Team
