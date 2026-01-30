# Authorization Service Services Module

## Overview

The **Authorization Service Services** module provides the core business logic layer for OpenFrame's OAuth 2.0/OIDC authorization server. This module implements critical security services including tenant-specific JWT signing key management and OAuth 2.0 authorization persistence with PKCE support.

**Key Capabilities:**
- **Tenant-Specific JWT Signing Keys**: Automatic generation, storage, and retrieval of RSA key pairs per tenant
- **OAuth 2.0 Authorization Persistence**: MongoDB-backed storage for authorization codes, access tokens, and refresh tokens
- **PKCE Support**: Full Proof Key for Code Exchange implementation for secure public client flows
- **Key Rotation Support**: Infrastructure for tenant key lifecycle management
- **Encrypted Private Key Storage**: Secure storage of RSA private keys using platform encryption service

**Related Modules:**
- [Authorization Service Configuration](authorization_service_configuration.md) - OAuth 2.0 server configuration that uses these services
- [Authorization Service Controllers](authorization_service_controllers.md) - Web controllers that trigger authorization flows
- [Authorization Service](authorization_service.md) - Parent module overview
- [Data Layer Mongo](data_layer_mongo.md) - MongoDB repositories for persistence
- [Security Core](security_core.md) - Shared security utilities and JWT configuration

---

## Architecture Overview

```mermaid
flowchart TD
    AuthServer["Authorization Server<br/>Config"] -->|"1. Request Signing Key"| TenantKeyService["TenantKeyService"]
    AuthServer -->|"2. Save/Load Authorization"| MongoAuthzService["MongoAuthorizationService"]
    
    TenantKeyService -->|"3. Query Active Key"| TenantKeyRepo[("TenantKeyRepository<br/>MongoDB")]
    TenantKeyService -->|"4. Generate if Missing"| KeyPairGen["AuthenticationKeyPairGenerator"]
    TenantKeyService -->|"5. Encrypt Private Key"| EncryptionSvc["EncryptionService"]
    TenantKeyService -->|"6. Parse PEM"| PemUtil["PemUtil"]
    
    MongoAuthzService -->|"7. Persist Authorization"| AuthzRepo[("MongoOAuth2AuthorizationRepository<br/>MongoDB")]
    MongoAuthzService -->|"8. Map Domain/Entity"| AuthzMapper["MongoAuthorizationMapper"]
    MongoAuthzService -->|"9. Load Client Config"| ClientRepo["RegisteredClientRepository"]
    
    KeyPairGen -->|"Generate RSA 2048"| RSAKeyPair["RSA Key Pair<br/>Public + Private PEM"]
    EncryptionSvc -->|"AES-256 Encryption"| EncryptedKey["Encrypted Private Key"]
    
    subgraph tenant_key_flow["Tenant Key Management Flow"]
        TenantKeyService
        TenantKeyRepo
        KeyPairGen
        EncryptionSvc
        PemUtil
    end
    
    subgraph authz_persistence_flow["Authorization Persistence Flow"]
        MongoAuthzService
        AuthzRepo
        AuthzMapper
        ClientRepo
    end
    
    style TenantKeyService fill:#4A90E2
    style MongoAuthzService fill:#4A90E2
    style TenantKeyRepo fill:#F39C12
    style AuthzRepo fill:#F39C12
```

### Service Interaction Flow

```mermaid
sequenceDiagram
    participant Client as Client Application
    participant AuthServer as Authorization Server
    participant TenantKey as TenantKeyService
    participant MongoAuthz as MongoAuthorizationService
    participant Encryption as EncryptionService
    participant KeyRepo as TenantKeyRepository
    participant AuthzRepo as OAuth2AuthorizationRepository
    participant Mongo as MongoDB

    Client->>AuthServer: POST /oauth2/authorize
    Note over Client,AuthServer: Authorization Code Flow with PKCE
    
    AuthServer->>TenantKey: getOrCreateActiveKey(tenantId)
    TenantKey->>KeyRepo: countByTenantIdAndActiveTrue(tenantId)
    KeyRepo->>Mongo: Query active keys
    Mongo-->>KeyRepo: count = 0
    KeyRepo-->>TenantKey: No active key found
    
    TenantKey->>TenantKey: Generate RSA 2048 Key Pair
    Note over TenantKey: AuthenticationKeyPairGenerator
    
    TenantKey->>Encryption: encryptClientSecret(privatePem)
    Encryption-->>TenantKey: Encrypted Private Key
    
    TenantKey->>KeyRepo: save(TenantKey)
    KeyRepo->>Mongo: Insert tenant_keys document
    Note over Mongo: {tenantId, keyId, publicPem,<br/>privateEncrypted, active: true}
    
    TenantKey-->>AuthServer: RSAKey (kid, public, private)
    
    AuthServer->>AuthServer: Generate Authorization Code
    Note over AuthServer: Store PKCE code_challenge
    
    AuthServer->>MongoAuthz: save(OAuth2Authorization)
    MongoAuthz->>MongoAuthz: Map to MongoOAuth2Authorization
    Note over MongoAuthz: Preserve PKCE parameters in metadata
    
    MongoAuthz->>AuthzRepo: save(entity)
    AuthzRepo->>Mongo: Insert oauth2_authorizations document
    Note over Mongo: {id, clientId, authorizationCode,<br/>pkce metadata, state}
    
    MongoAuthz-->>AuthServer: Authorization saved
    AuthServer-->>Client: 302 Redirect with code
    
    Client->>AuthServer: POST /oauth2/token<br/>(code + code_verifier)
    AuthServer->>MongoAuthz: findByToken(code, "code")
    MongoAuthz->>AuthzRepo: findByAuthorizationCodeValue(code)
    AuthzRepo->>Mongo: Query by authorizationCodeValue
    Mongo-->>AuthzRepo: MongoOAuth2Authorization entity
    
    MongoAuthz->>MongoAuthz: Map to OAuth2Authorization
    Note over MongoAuthz: Restore PKCE metadata
    MongoAuthz-->>AuthServer: OAuth2Authorization with PKCE
    
    AuthServer->>AuthServer: Verify PKCE code_verifier
    Note over AuthServer: SHA256(code_verifier) == code_challenge
    
    AuthServer->>TenantKey: getOrCreateActiveKey(tenantId)
    TenantKey->>KeyRepo: findFirstByTenantIdAndActiveTrue(tenantId)
    KeyRepo->>Mongo: Query active key
    Mongo-->>KeyRepo: TenantKey document
    KeyRepo-->>TenantKey: Existing key
    
    TenantKey->>Encryption: decryptClientSecret(privateEncrypted)
    Encryption-->>TenantKey: Private Key PEM
    
    TenantKey->>TenantKey: Parse PEM to RSAPrivateKey
    TenantKey-->>AuthServer: RSAKey for signing
    
    AuthServer->>AuthServer: Sign JWT with tenant key
    Note over AuthServer: kid header matches tenant keyId
    
    AuthServer->>MongoAuthz: save(OAuth2Authorization)<br/>(update with tokens)
    MongoAuthz->>AuthzRepo: save(entity)
    AuthzRepo->>Mongo: Update with access_token, refresh_token
    
    AuthServer-->>Client: JWT Access Token + Refresh Token
```

---

## Core Components

### 1. TenantKeyService

**Purpose:** Manages tenant-specific RSA key pairs for JWT signing, providing automatic key generation, secure storage, and retrieval.

**Location:** `com.openframe.authz.keys.TenantKeyService`

**Key Responsibilities:**
- Retrieve active signing key for a tenant
- Generate new RSA 2048-bit key pairs when no active key exists
- Encrypt private keys before storage using platform encryption service
- Decrypt private keys for JWT signing operations
- Detect and warn about multiple active keys (potential misconfiguration)
- Support future key rotation workflows

#### Key Methods

##### `getOrCreateActiveKey(String tenantId): RSAKey`

Retrieves the active signing key for a tenant, generating a new one if none exists.

**Flow:**
1. Query `TenantKeyRepository` for active keys by tenant ID
2. Warn if multiple active keys detected (count > 1)
3. If no active key found:
   - Generate new RSA 2048-bit key pair via `AuthenticationKeyPairGenerator`
   - Encrypt private key PEM using `EncryptionService`
   - Create `TenantKey` document with unique `keyId` (kid)
   - Save to MongoDB with `active: true`
4. Parse public/private PEM to Java `RSAPublicKey`/`RSAPrivateKey`
5. Return Nimbus `RSAKey` with kid for JWT signing

**Example Usage:**

```java
@Service
public class JwtTokenService {
    private final TenantKeyService tenantKeyService;
    
    public String generateToken(String tenantId, Map<String, Object> claims) {
        RSAKey signingKey = tenantKeyService.getOrCreateActiveKey(tenantId);
        
        // Use signingKey to sign JWT
        JWSSigner signer = new RSASSASigner(signingKey);
        JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.RS256)
            .keyID(signingKey.getKeyID()) // kid header
            .build();
        
        // ... sign and return JWT
    }
}
```

**Key Generation Details:**

```java
private TenantKey createAndStore(String tenantId) {
    // 1. Generate RSA key pair
    AuthenticationKeyPair pair = keyPairGenerator.generate();
    // Returns: { publicPem: "-----BEGIN PUBLIC KEY-----...", 
    //            privatePem: "-----BEGIN PRIVATE KEY-----..." }
    
    // 2. Encrypt private key
    String enc = encryptionService.encryptClientSecret(pair.privatePem());
    
    // 3. Create document
    TenantKey doc = new TenantKey();
    doc.setId(randomUUID().toString());
    doc.setTenantId(tenantId);
    doc.setKeyId("kid-" + randomUUID()); // JWT kid header
    doc.setPublicPem(pair.publicPem());
    doc.setPrivateEncrypted(enc); // AES-256 encrypted
    doc.setActive(true);
    doc.setCreatedAt(Instant.now());
    
    // 4. Persist to MongoDB
    tenantKeyRepository.save(doc);
    return doc;
}
```

#### Dependencies

| Dependency | Purpose | Module |
|------------|---------|--------|
| `TenantKeyRepository` | MongoDB repository for tenant keys | [Data Layer Mongo](data_layer_mongo.md) |
| `EncryptionService` | AES-256 encryption/decryption of private keys | Core Services |
| `AuthenticationKeyPairGenerator` | RSA 2048-bit key pair generation | Authorization Service Core |
| `PemUtil` | PEM format parsing to Java `RSAPublicKey`/`RSAPrivateKey` | Authorization Service Core |

#### Data Model

**TenantKey Document (MongoDB `tenant_keys` collection):**

```json
{
  "_id": "550e8400-e29b-41d4-a716-446655440000",
  "tenantId": "acme-corp",
  "keyId": "kid-7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "publicPem": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----",
  "privateEncrypted": "AES256:iv:ciphertext:tag",
  "active": true,
  "createdAt": "2024-01-15T10:30:00Z"
}
```

#### Security Considerations

**Private Key Protection:**
- Private keys are **never stored in plaintext**
- Encrypted using platform `EncryptionService` (AES-256-GCM)
- Decrypted only in-memory during JWT signing operations
- Encryption keys managed by platform key management system

**Key Rotation Support:**
- `active` flag allows multiple keys per tenant (old keys for verification, new for signing)
- Future enhancement: Automatic key rotation based on age or usage count
- Multiple active keys trigger warning logs for operational visibility

**Logging:**
- Key generation events logged with tenant ID and kid
- Multiple active key warnings for troubleshooting
- No sensitive key material logged

---

### 2. MongoAuthorizationService

**Purpose:** Implements Spring Security's `OAuth2AuthorizationService` interface to persist OAuth 2.0 authorizations (authorization codes, access tokens, refresh tokens) in MongoDB with full PKCE support.

**Location:** `com.openframe.authz.service.auth.MongoAuthorizationService`

**Key Responsibilities:**
- Save OAuth 2.0 authorizations to MongoDB
- Retrieve authorizations by ID or token value
- Support all OAuth 2.0 token types (authorization code, access token, refresh token)
- Preserve PKCE parameters (`code_challenge`, `code_challenge_method`) in authorization metadata
- Map between Spring Security domain objects and MongoDB entities
- Remove expired or revoked authorizations

#### Key Methods

##### `save(OAuth2Authorization authorization): void`

Persists an OAuth 2.0 authorization to MongoDB, preserving all PKCE parameters.

**Flow:**
1. Extract PKCE parameters from `OAuth2AuthorizationRequest` attributes
2. Extract PKCE metadata from authorization code token metadata
3. Map Spring Security `OAuth2Authorization` to `MongoOAuth2Authorization` entity
4. Save entity to MongoDB via `MongoOAuth2AuthorizationRepository`
5. Log PKCE parameters for debugging (code_challenge, code_challenge_method)

**PKCE Parameter Preservation:**

```java
@Override
public void save(OAuth2Authorization authorization) {
    log.debug("Saving authorization: {}", authorization.getId());

    // Extract PKCE from authorization request
    OAuth2AuthorizationRequest request = authorization.getAttribute(
        OAuth2AuthorizationRequest.class.getName()
    );
    if (request != null) {
        log.debug("PKCE in request before save: {}", 
            request.getAdditionalParameters());
        // Contains: {code_challenge: "...", code_challenge_method: "S256"}
    }

    // Extract PKCE from authorization code metadata
    OAuth2Authorization.Token<OAuth2AuthorizationCode> code = 
        authorization.getToken(OAuth2AuthorizationCode.class);
    if (code != null) {
        log.debug("PKCE in code metadata before save: {}", 
            code.getMetadata());
        // Metadata contains PKCE parameters for verification
    }

    // Map and save
    MongoOAuth2Authorization entity = MongoAuthorizationMapper.toEntity(authorization);
    repository.save(entity);

    // Verify PKCE persisted correctly
    if (entity.getArAdditional() != null) {
        log.debug("PKCE in entity additional params: {}", 
            entity.getArAdditional());
    }
}
```

##### `findByToken(String token, OAuth2TokenType tokenType): OAuth2Authorization`

Retrieves an authorization by token value, supporting all token types.

**Flow:**
1. Determine token type (access token, refresh token, authorization code, state)
2. Query appropriate MongoDB field via repository
3. Map `MongoOAuth2Authorization` entity back to Spring Security domain object
4. Restore PKCE parameters from entity metadata
5. Load associated `RegisteredClient` configuration
6. Return fully reconstructed `OAuth2Authorization`

**Token Type Handling:**

```java
@Override
public OAuth2Authorization findByToken(String token, OAuth2TokenType tokenType) {
    log.debug("Finding authorization by token: {}, type: {}", token, tokenType);

    Optional<MongoOAuth2Authorization> found;
    
    if (tokenType == null) {
        // Try all token types
        found = repository.findByAccessTokenValue(token)
                .or(() -> repository.findByRefreshTokenValue(token))
                .or(() -> repository.findByAuthorizationCodeValue(token))
                .or(() -> repository.findByState(token));
    } else if (OAuth2TokenType.ACCESS_TOKEN.equals(tokenType)) {
        found = repository.findByAccessTokenValue(token);
    } else if (OAuth2TokenType.REFRESH_TOKEN.equals(tokenType)) {
        found = repository.findByRefreshTokenValue(token);
    } else if (AUTH_CODE.equals(tokenType)) {
        found = repository.findByAuthorizationCodeValue(token);
    } else {
        found = Optional.empty();
    }

    return found.map(entity -> {
        OAuth2Authorization auth = MongoAuthorizationMapper.toDomain(
            entity, registeredClientRepository
        );

        // Verify PKCE restoration
        OAuth2AuthorizationRequest request = auth.getAttribute(
            OAuth2AuthorizationRequest.class.getName()
        );
        if (request != null) {
            log.debug("PKCE in request: {}", 
                request.getAdditionalParameters());
        }

        return auth;
    }).orElse(null);
}
```

##### `findById(String id): OAuth2Authorization`

Retrieves an authorization by its unique ID.

**Usage:** Primarily for internal Spring Security operations and authorization management.

##### `remove(OAuth2Authorization authorization): void`

Removes an authorization from MongoDB.

**Usage:** Called when authorization codes are consumed, tokens are revoked, or authorizations expire.

#### Dependencies

| Dependency | Purpose | Module |
|------------|---------|--------|
| `MongoOAuth2AuthorizationRepository` | MongoDB repository for OAuth 2.0 authorizations | [Data Layer Mongo](data_layer_mongo.md) |
| `RegisteredClientRepository` | Loads OAuth 2.0 client configurations | [Authorization Service Configuration](authorization_service_configuration.md) |
| `MongoAuthorizationMapper` | Bidirectional mapping between domain and entity | Authorization Service Core |

#### Data Model

**MongoOAuth2Authorization Entity (MongoDB `oauth2_authorizations` collection):**

```json
{
  "_id": "auth-550e8400-e29b-41d4-a716-446655440000",
  "registeredClientId": "openframe-web-client",
  "principalName": "user@acme.com",
  "authorizationGrantType": "authorization_code",
  "authorizedScopes": ["openid", "profile", "email"],
  
  "state": "random-state-value",
  
  "authorizationCodeValue": "code-abc123...",
  "authorizationCodeIssuedAt": "2024-01-15T10:30:00Z",
  "authorizationCodeExpiresAt": "2024-01-15T10:35:00Z",
  "authorizationCodeMetadata": {
    "code_challenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    "code_challenge_method": "S256"
  },
  
  "accessTokenValue": "eyJhbGciOiJSUzI1NiIsImtpZCI6ImtpZC03Yzll...",
  "accessTokenIssuedAt": "2024-01-15T10:30:05Z",
  "accessTokenExpiresAt": "2024-01-15T11:30:05Z",
  "accessTokenMetadata": {
    "token.type": "Bearer"
  },
  "accessTokenType": "Bearer",
  "accessTokenScopes": ["openid", "profile", "email"],
  
  "refreshTokenValue": "refresh-xyz789...",
  "refreshTokenIssuedAt": "2024-01-15T10:30:05Z",
  "refreshTokenExpiresAt": "2024-01-22T10:30:05Z",
  
  "arAdditional": {
    "code_challenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    "code_challenge_method": "S256"
  },
  
  "attributes": {
    "tenant_id": "acme-corp",
    "user_id": "user-123"
  }
}
```

**Key Fields:**

| Field | Description | PKCE Relevance |
|-------|-------------|----------------|
| `authorizationCodeValue` | Authorization code issued to client | Used to exchange for tokens |
| `authorizationCodeMetadata` | Metadata for authorization code | **Stores PKCE `code_challenge` and `code_challenge_method`** |
| `arAdditional` | Additional parameters from authorization request | **Backup storage for PKCE parameters** |
| `accessTokenValue` | JWT access token | Signed with tenant-specific key |
| `refreshTokenValue` | Refresh token for token renewal | Long-lived token |
| `state` | OAuth 2.0 state parameter | CSRF protection |

#### PKCE Flow Integration

**Authorization Request (Step 1):**

```text
GET /oauth2/authorize?
  response_type=code
  &client_id=openframe-web-client
  &redirect_uri=https://app.openframe.ai/callback
  &scope=openid profile email
  &state=random-state
  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
  &code_challenge_method=S256
```

**Service saves authorization with PKCE:**

```java
OAuth2Authorization authorization = OAuth2Authorization.withRegisteredClient(client)
    .principalName("user@acme.com")
    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
    .attribute(OAuth2AuthorizationRequest.class.getName(), authorizationRequest)
    .token(authorizationCode, metadata -> {
        metadata.put("code_challenge", "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
        metadata.put("code_challenge_method", "S256");
    })
    .build();

mongoAuthorizationService.save(authorization);
```

**Token Request (Step 2):**

```text
POST /oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=code-abc123...
&redirect_uri=https://app.openframe.ai/callback
&client_id=openframe-web-client
&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
```

**Service retrieves and verifies PKCE:**

```java
OAuth2Authorization authorization = mongoAuthorizationService.findByToken(
    code, new OAuth2TokenType("code")
);

// Spring Security automatically verifies:
// SHA256(code_verifier) == code_challenge
// If verification fails, token request is rejected
```

#### Security Considerations

**PKCE Enforcement:**
- PKCE parameters preserved across authorization code flow
- `code_challenge` stored in authorization code metadata
- `code_verifier` verified during token exchange
- Prevents authorization code interception attacks

**Token Security:**
- Authorization codes are single-use (removed after token exchange)
- Access tokens are short-lived (typically 1 hour)
- Refresh tokens are long-lived but can be revoked
- All tokens indexed for efficient lookup and revocation

**Logging:**
- Authorization save/load operations logged with IDs
- PKCE parameters logged for debugging (not sensitive)
- Token values never logged (sensitive)

---

## Integration Points

### 1. Authorization Server Configuration

The services are integrated into Spring Authorization Server configuration:

```java
@Configuration
public class AuthorizationServerConfig {
    
    @Bean
    public OAuth2AuthorizationService authorizationService(
        MongoOAuth2AuthorizationRepository repository,
        RegisteredClientRepository clientRepository
    ) {
        return new MongoAuthorizationService(repository, clientRepository);
    }
    
    @Bean
    public JWKSource<SecurityContext> jwkSource(TenantKeyService tenantKeyService) {
        return (jwkSelector, context) -> {
            String tenantId = extractTenantId(context);
            RSAKey key = tenantKeyService.getOrCreateActiveKey(tenantId);
            return jwkSelector.select(new JWKSet(key));
        };
    }
    
    @Bean
    public JwtEncoder jwtEncoder(JWKSource<SecurityContext> jwkSource) {
        return new NimbusJwtEncoder(jwkSource);
    }
}
```

### 2. Token Generation Flow

```mermaid
sequenceDiagram
    participant Client
    participant AuthServer as Authorization Server
    participant MongoAuthz as MongoAuthorizationService
    participant TenantKey as TenantKeyService
    participant JwtEncoder as JWT Encoder

    Client->>AuthServer: POST /oauth2/token<br/>(code + code_verifier)
    
    AuthServer->>MongoAuthz: findByToken(code, "code")
    MongoAuthz-->>AuthServer: OAuth2Authorization with PKCE
    
    AuthServer->>AuthServer: Verify PKCE code_verifier
    Note over AuthServer: SHA256(code_verifier) == code_challenge
    
    AuthServer->>TenantKey: getOrCreateActiveKey(tenantId)
    TenantKey-->>AuthServer: RSAKey (kid, public, private)
    
    AuthServer->>JwtEncoder: encode(claims, tenantKey)
    Note over JwtEncoder: Sign JWT with RS256<br/>kid header = tenant keyId
    JwtEncoder-->>AuthServer: JWT Access Token
    
    AuthServer->>MongoAuthz: save(authorization)<br/>(update with tokens)
    
    AuthServer-->>Client: Access Token + Refresh Token
```

### 3. JWT Token Structure

**JWT Header:**

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "kid-7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```

**JWT Payload:**

```json
{
  "sub": "user@acme.com",
  "aud": "openframe-web-client",
  "iss": "https://auth.openframe.ai/acme-corp",
  "exp": 1705320605,
  "iat": 1705317005,
  "tenant_id": "acme-corp",
  "userId": "user-123",
  "roles": ["ROLE_USER", "ROLE_ADMIN"],
  "scope": "openid profile email"
}
```

**JWT Signature:**

```text
RSASSA-PKCS1-v1_5 using SHA-256
Signed with tenant-specific RSA private key
Verified with tenant-specific RSA public key (from JWK endpoint)
```

### 4. JWK Endpoint

The tenant key service enables the JWKS endpoint for token verification:

**Request:**

```bash
GET https://auth.openframe.ai/acme-corp/.well-known/jwks.json
```

**Response:**

```json
{
  "keys": [
    {
      "kty": "RSA",
      "kid": "kid-7c9e6679-7425-40de-944b-e07fc1f90ae7",
      "use": "sig",
      "alg": "RS256",
      "n": "xGOr-H7A-PWgQjZJPZ...",
      "e": "AQAB"
    }
  ]
}
```

**Usage by Resource Servers:**

```java
// Gateway Service, API Service, etc.
@Bean
public JwtDecoder jwtDecoder() {
    return NimbusJwtDecoder.withJwkSetUri(
        "https://auth.openframe.ai/{tenantId}/.well-known/jwks.json"
    ).build();
}
```

---

## Data Flow Diagrams

### Complete Authorization Code Flow with PKCE

```mermaid
flowchart TD
    Start["Client Application"] -->|"1. Generate code_verifier"| CodeVerifier["code_verifier<br/>(random 43-128 chars)"]
    CodeVerifier -->|"2. SHA256 hash"| CodeChallenge["code_challenge<br/>(base64url encoded)"]
    
    CodeChallenge -->|"3. Authorization Request"| AuthEndpoint["GET /oauth2/authorize<br/>+ code_challenge"]
    AuthEndpoint -->|"4. User Login"| UserAuth["User Authentication"]
    
    UserAuth -->|"5. Generate Authorization Code"| AuthCode["Authorization Code"]
    AuthCode -->|"6. Save with PKCE"| MongoAuthz1["MongoAuthorizationService.save()"]
    MongoAuthz1 -->|"7. Store in MongoDB"| MongoDB1[("MongoDB<br/>oauth2_authorizations")]
    
    MongoDB1 -->|"8. Return code"| Redirect["302 Redirect<br/>?code=...&state=..."]
    Redirect -->|"9. Token Request"| TokenEndpoint["POST /oauth2/token<br/>+ code + code_verifier"]
    
    TokenEndpoint -->|"10. Load Authorization"| MongoAuthz2["MongoAuthorizationService.findByToken()"]
    MongoAuthz2 -->|"11. Query by code"| MongoDB2[("MongoDB<br/>oauth2_authorizations")]
    MongoDB2 -->|"12. Return with PKCE"| AuthzObj["OAuth2Authorization<br/>+ code_challenge"]
    
    AuthzObj -->|"13. Verify PKCE"| PKCEVerify{"Verify PKCE<br/>code_verifier"}
    PKCEVerify -->|"No"| Error["400 Bad Request<br/>invalid_grant"]
    PKCEVerify -->|"Yes"| TenantKey["TenantKeyService.getOrCreateActiveKey()"]
    
    TenantKey -->|"14. Load/Generate Key"| MongoDB3[("MongoDB<br/>tenant_keys")]
    MongoDB3 -->|"15. Return RSA Key"| SignJWT["Sign JWT<br/>with tenant key"]
    
    SignJWT -->|"16. Generate Tokens"| Tokens["Access Token<br/>+ Refresh Token"]
    Tokens -->|"17. Update Authorization"| MongoAuthz3["MongoAuthorizationService.save()"]
    MongoAuthz3 -->|"18. Store tokens"| MongoDB4[("MongoDB<br/>oauth2_authorizations")]
    
    MongoDB4 -->|"19. Return tokens"| Response["200 OK<br/>{access_token, refresh_token}"]
    Response -->|"20. Use access_token"| APICall["API Requests<br/>Authorization: Bearer ..."]
    
    style CodeChallenge fill:#50C878
    style PKCEVerify fill:#F39C12
    style Tokens fill:#50C878
    style Error fill:#E74C3C
```

### Key Rotation Flow (Future Enhancement)

```mermaid
flowchart TD
    Scheduler["Key Rotation<br/>Scheduler"] -->|"1. Check key age"| CheckAge{Key older than<br/>90 days?}
    CheckAge -->|"No"| End["End"]
    CheckAge -->|"Yes"| GenerateNew["TenantKeyService<br/>Generate New Key"]
    
    GenerateNew -->|"2. Create new key"| NewKey["New RSA Key<br/>active: true"]
    NewKey -->|"3. Save to MongoDB"| MongoDB1[("MongoDB<br/>tenant_keys")]
    
    MongoDB1 -->|"4. Mark old key"| OldKey["Old Key<br/>active: false<br/>validUntil: now + 24h"]
    OldKey -->|"5. Update MongoDB"| MongoDB2[("MongoDB<br/>tenant_keys")]
    
    MongoDB2 -->|"6. Publish event"| Event["KeyRotationEvent"]
    Event -->|"7. Notify services"| Services["Gateway, API Services"]
    Services -->|"8. Refresh JWK cache"| JWKRefresh["Reload JWKS endpoint"]
    
    JWKRefresh -->|"9. Verify both keys"| Verify["Verify old tokens<br/>with old key<br/>Sign new tokens<br/>with new key"]
    
    Verify -->|"10. After 24h"| Cleanup["Delete old key"]
    Cleanup -->|"11. Remove from MongoDB"| MongoDB3[("MongoDB<br/>tenant_keys")]
    
    style NewKey fill:#50C878
    style OldKey fill:#F39C12
    style Cleanup fill:#E74C3C
```

---

## Configuration

### Application Properties

```yaml
# MongoDB Configuration
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/openframe
      database: openframe

# Encryption Service Configuration
openframe:
  security:
    encryption:
      algorithm: AES/GCM/NoPadding
      key-size: 256
      master-key: ${ENCRYPTION_MASTER_KEY} # From environment

# OAuth2 Authorization Server
spring:
  security:
    oauth2:
      authorizationserver:
        issuer: https://auth.openframe.ai/{tenantId}
        
# Key Generation Configuration
openframe:
  authz:
    keys:
      algorithm: RSA
      key-size: 2048
      rotation-days: 90 # Future enhancement
```

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `ENCRYPTION_MASTER_KEY` | Master key for encrypting tenant private keys | Yes | - |
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `OAUTH2_ISSUER_BASE_URL` | Base URL for OAuth2 issuer | Yes | - |

---

## Monitoring and Observability

### Key Metrics

**TenantKeyService Metrics:**

```java
@Timed(value = "tenant.key.generation", description = "Time to generate tenant key")
public RSAKey getOrCreateActiveKey(String tenantId) {
    // ... implementation
}

// Metrics exposed:
// - tenant_key_generation_seconds_count
// - tenant_key_generation_seconds_sum
// - tenant_key_generation_seconds_max
// - tenant_key_cache_hits_total
// - tenant_key_cache_misses_total
// - tenant_key_active_count (gauge per tenant)
```

**MongoAuthorizationService Metrics:**

```java
@Timed(value = "oauth2.authorization.save", description = "Time to save authorization")
public void save(OAuth2Authorization authorization) {
    // ... implementation
}

@Timed(value = "oauth2.authorization.find", description = "Time to find authorization")
public OAuth2Authorization findByToken(String token, OAuth2TokenType tokenType) {
    // ... implementation
}

// Metrics exposed:
// - oauth2_authorization_save_seconds_count
// - oauth2_authorization_find_seconds_count
// - oauth2_authorization_total (counter by type: code, access_token, refresh_token)
// - oauth2_authorization_active_count (gauge)
```

### Logging

**TenantKeyService Logs:**

```text
INFO  c.o.a.keys.TenantKeyService - No active signing key found for tenantId='acme-corp'. Generating a new key...
INFO  c.o.a.keys.TenantKeyService - Generated new signing key for tenantId='acme-corp' with kid='kid-7c9e6679' createdAt='2024-01-15T10:30:00Z'
DEBUG c.o.a.keys.TenantKeyService - Using active signing key for tenantId='acme-corp' with kid='kid-7c9e6679' createdAt='2024-01-15T10:30:00Z'
WARN  c.o.a.keys.TenantKeyService - Multiple active signing keys detected for tenantId='acme-corp' (count=2) - this may cause kid mismatches
```

**MongoAuthorizationService Logs:**

```text
DEBUG c.o.a.s.a.MongoAuthorizationService - Saving authorization: auth-550e8400-e29b-41d4-a716-446655440000
DEBUG c.o.a.s.a.MongoAuthorizationService - PKCE in request before save: {code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM, code_challenge_method=S256}
DEBUG c.o.a.s.a.MongoAuthorizationService - PKCE in entity additional params: {code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM, code_challenge_method=S256}
DEBUG c.o.a.s.a.MongoAuthorizationService - Finding authorization by token: code-abc123..., type: code
DEBUG c.o.a.s.a.MongoAuthorizationService - PKCE in request: {code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM, code_challenge_method=S256}
```

### Health Checks

```java
@Component
public class AuthorizationServiceHealthIndicator implements HealthIndicator {
    
    private final TenantKeyRepository tenantKeyRepository;
    private final MongoOAuth2AuthorizationRepository authorizationRepository;
    
    @Override
    public Health health() {
        try {
            // Check MongoDB connectivity
            long keyCount = tenantKeyRepository.count();
            long authzCount = authorizationRepository.count();
            
            return Health.up()
                .withDetail("tenant_keys_count", keyCount)
                .withDetail("authorizations_count", authzCount)
                .build();
        } catch (Exception e) {
            return Health.down()
                .withException(e)
                .build();
        }
    }
}
```

**Health Endpoint Response:**

```json
{
  "status": "UP",
  "components": {
    "authorizationService": {
      "status": "UP",
      "details": {
        "tenant_keys_count": 15,
        "authorizations_count": 342
      }
    }
  }
}
```

---

## Security Best Practices

### 1. Private Key Protection

**DO:**
- ✅ Always encrypt private keys before storage
- ✅ Use strong encryption (AES-256-GCM)
- ✅ Rotate encryption master keys periodically
- ✅ Decrypt private keys only in-memory during signing
- ✅ Use secure key management systems (AWS KMS, Azure Key Vault, etc.)

**DON'T:**
- ❌ Store private keys in plaintext
- ❌ Log private key material
- ❌ Expose private keys via APIs
- ❌ Share private keys across tenants

### 2. PKCE Enforcement

**DO:**
- ✅ Require PKCE for all public clients (SPAs, mobile apps)
- ✅ Validate `code_challenge_method` is `S256` (SHA-256)
- ✅ Preserve PKCE parameters across authorization flow
- ✅ Reject token requests with invalid `code_verifier`

**DON'T:**
- ❌ Allow `plain` code challenge method (insecure)
- ❌ Skip PKCE verification for any client type
- ❌ Reuse authorization codes after token exchange

### 3. Token Lifecycle Management

**DO:**
- ✅ Use short-lived access tokens (1 hour or less)
- ✅ Use long-lived refresh tokens with rotation
- ✅ Implement token revocation endpoints
- ✅ Clean up expired authorizations periodically
- ✅ Index token values for efficient lookup

**DON'T:**
- ❌ Issue long-lived access tokens
- ❌ Allow unlimited refresh token usage
- ❌ Store tokens without expiration
- ❌ Skip token validation in resource servers

### 4. Multi-Tenant Isolation

**DO:**
- ✅ Use separate signing keys per tenant
- ✅ Include `tenant_id` in JWT claims
- ✅ Validate tenant context in all operations
- ✅ Isolate tenant data in MongoDB queries

**DON'T:**
- ❌ Share signing keys across tenants
- ❌ Allow cross-tenant token usage
- ❌ Skip tenant validation in authorization flows

---

## Troubleshooting

### Common Issues

#### 1. Multiple Active Keys Warning

**Symptom:**

```text
WARN c.o.a.keys.TenantKeyService - Multiple active signing keys detected for tenantId='acme-corp' (count=2) - this may cause kid mismatches
```

**Cause:** Multiple keys marked as `active: true` for the same tenant.

**Solution:**

```bash
# Connect to MongoDB
mongo openframe

# Find duplicate active keys
db.tenant_keys.find({ tenantId: "acme-corp", active: true })

# Deactivate old keys (keep only the newest)
db.tenant_keys.updateMany(
  { 
    tenantId: "acme-corp", 
    active: true,
    createdAt: { $lt: ISODate("2024-01-15T00:00:00Z") }
  },
  { $set: { active: false } }
)
```

#### 2. PKCE Verification Failed

**Symptom:**

```text
400 Bad Request
{
  "error": "invalid_grant",
  "error_description": "PKCE verification failed"
}
```

**Cause:** `code_verifier` doesn't match stored `code_challenge`.

**Debug Steps:**

```bash
# Check authorization in MongoDB
db.oauth2_authorizations.findOne({ authorizationCodeValue: "code-abc123..." })

# Verify PKCE parameters exist
{
  "authorizationCodeMetadata": {
    "code_challenge": "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    "code_challenge_method": "S256"
  }
}

# Verify code_verifier in client request
# SHA256(code_verifier) should equal code_challenge
```

**Common Causes:**
- Client using wrong `code_verifier`
- PKCE parameters not preserved during authorization save
- Authorization code expired or already used

#### 3. JWT Signature Verification Failed

**Symptom:**

```text
401 Unauthorized
{
  "error": "invalid_token",
  "error_description": "An error occurred while attempting to decode the Jwt: Signed JWT rejected: Invalid signature"
}
```

**Cause:** Resource server using wrong public key or kid mismatch.

**Debug Steps:**

```bash
# 1. Decode JWT header
echo "eyJhbGciOiJSUzI1NiIsImtpZCI6ImtpZC03Yzll..." | base64 -d
# Output: {"alg":"RS256","kid":"kid-7c9e6679-7425-40de-944b-e07fc1f90ae7"}

# 2. Check JWKS endpoint
curl https://auth.openframe.ai/acme-corp/.well-known/jwks.json

# 3. Verify kid matches
# JWT kid should match one of the keys in JWKS response

# 4. Check tenant key in MongoDB
db.tenant_keys.findOne({ tenantId: "acme-corp", keyId: "kid-7c9e6679-7425-40de-944b-e07fc1f90ae7" })
```

**Solutions:**
- Refresh JWK cache in resource servers
- Verify tenant ID in JWT issuer matches JWKS endpoint
- Check for multiple active keys (deactivate old ones)

#### 4. Authorization Not Found

**Symptom:**

```text
400 Bad Request
{
  "error": "invalid_grant",
  "error_description": "Invalid authorization code"
}
```

**Cause:** Authorization code not found in MongoDB or already consumed.

**Debug Steps:**

```bash
# Check if authorization exists
db.oauth2_authorizations.findOne({ authorizationCodeValue: "code-abc123..." })

# Check if authorization expired
db.oauth2_authorizations.findOne({
  authorizationCodeValue: "code-abc123...",
  authorizationCodeExpiresAt: { $gt: new Date() }
})
```

**Common Causes:**
- Authorization code already used (single-use)
- Authorization code expired (typically 5 minutes)
- Authorization not saved correctly
- MongoDB connection issues

---

## Testing

### Unit Tests

**TenantKeyService Tests:**

```java
@SpringBootTest
class TenantKeyServiceTest {
    
    @Autowired
    private TenantKeyService tenantKeyService;
    
    @Autowired
    private TenantKeyRepository tenantKeyRepository;
    
    @Test
    void shouldGenerateNewKeyWhenNoneExists() {
        String tenantId = "test-tenant";
        
        RSAKey key = tenantKeyService.getOrCreateActiveKey(tenantId);
        
        assertThat(key).isNotNull();
        assertThat(key.getKeyID()).startsWith("kid-");
        assertThat(key.toRSAPublicKey()).isNotNull();
        assertThat(key.toRSAPrivateKey()).isNotNull();
        
        // Verify saved to MongoDB
        Optional<TenantKey> saved = tenantKeyRepository
            .findFirstByTenantIdAndActiveTrue(tenantId);
        assertThat(saved).isPresent();
        assertThat(saved.get().getKeyId()).isEqualTo(key.getKeyID());
    }
    
    @Test
    void shouldReuseExistingActiveKey() {
        String tenantId = "test-tenant";
        
        RSAKey key1 = tenantKeyService.getOrCreateActiveKey(tenantId);
        RSAKey key2 = tenantKeyService.getOrCreateActiveKey(tenantId);
        
        assertThat(key1.getKeyID()).isEqualTo(key2.getKeyID());
        
        // Verify only one key in MongoDB
        long count = tenantKeyRepository.countByTenantIdAndActiveTrue(tenantId);
        assertThat(count).isEqualTo(1);
    }
}
```

**MongoAuthorizationService Tests:**

```java
@SpringBootTest
class MongoAuthorizationServiceTest {
    
    @Autowired
    private MongoAuthorizationService authorizationService;
    
    @Autowired
    private MongoOAuth2AuthorizationRepository repository;
    
    @Test
    void shouldSaveAndRetrieveAuthorizationWithPKCE() {
        OAuth2Authorization authorization = createAuthorizationWithPKCE();
        
        authorizationService.save(authorization);
        
        OAuth2Authorization retrieved = authorizationService.findById(authorization.getId());
        
        assertThat(retrieved).isNotNull();
        
        // Verify PKCE parameters preserved
        OAuth2AuthorizationRequest request = retrieved.getAttribute(
            OAuth2AuthorizationRequest.class.getName()
        );
        assertThat(request.getAdditionalParameters())
            .containsEntry("code_challenge", "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
            .containsEntry("code_challenge_method", "S256");
    }
    
    @Test
    void shouldFindAuthorizationByCode() {
        OAuth2Authorization authorization = createAuthorizationWithCode("code-abc123");
        authorizationService.save(authorization);
        
        OAuth2Authorization retrieved = authorizationService.findByToken(
            "code-abc123", new OAuth2TokenType("code")
        );
        
        assertThat(retrieved).isNotNull();
        assertThat(retrieved.getId()).isEqualTo(authorization.getId());
    }
}
```

### Integration Tests

**End-to-End Authorization Flow:**

```java
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
class AuthorizationFlowIntegrationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Test
    void shouldCompleteAuthorizationCodeFlowWithPKCE() throws Exception {
        // 1. Generate PKCE parameters
        String codeVerifier = generateCodeVerifier();
        String codeChallenge = generateCodeChallenge(codeVerifier);
        
        // 2. Authorization request
        MvcResult authResult = mockMvc.perform(get("/oauth2/authorize")
                .param("response_type", "code")
                .param("client_id", "test-client")
                .param("redirect_uri", "http://localhost:3000/callback")
                .param("scope", "openid profile")
                .param("state", "random-state")
                .param("code_challenge", codeChallenge)
                .param("code_challenge_method", "S256"))
            .andExpect(status().is3xxRedirection())
            .andReturn();
        
        String location = authResult.getResponse().getHeader("Location");
        String code = extractCodeFromRedirect(location);
        
        // 3. Token request
        mockMvc.perform(post("/oauth2/token")
                .param("grant_type", "authorization_code")
                .param("code", code)
                .param("redirect_uri", "http://localhost:3000/callback")
                .param("client_id", "test-client")
                .param("code_verifier", codeVerifier))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.access_token").exists())
            .andExpect(jsonPath("$.refresh_token").exists())
            .andExpect(jsonPath("$.token_type").value("Bearer"));
    }
}
```

---

## Future Enhancements

### 1. Automatic Key Rotation

**Goal:** Automatically rotate tenant signing keys based on age or usage.

**Implementation:**

```java
@Scheduled(cron = "0 0 2 * * *") // Daily at 2 AM
public void rotateExpiredKeys() {
    List<TenantKey> expiredKeys = tenantKeyRepository
        .findByActiveTrueAndCreatedAtBefore(
            Instant.now().minus(90, ChronoUnit.DAYS)
        );
    
    for (TenantKey oldKey : expiredKeys) {
        // Generate new key
        TenantKey newKey = createAndStore(oldKey.getTenantId());
        
        // Mark old key for verification only
        oldKey.setActive(false);
        oldKey.setValidUntil(Instant.now().plus(24, ChronoUnit.HOURS));
        tenantKeyRepository.save(oldKey);
        
        // Publish rotation event
        eventPublisher.publishEvent(new KeyRotationEvent(
            oldKey.getTenantId(), oldKey.getKeyId(), newKey.getKeyId()
        ));
    }
}
```

### 2. Key Performance Caching

**Goal:** Cache tenant keys in-memory to reduce MongoDB queries.

**Implementation:**

```java
@Service
public class CachedTenantKeyService {
    
    private final TenantKeyService delegate;
    private final Cache<String, RSAKey> keyCache;
    
    public RSAKey getOrCreateActiveKey(String tenantId) {
        return keyCache.get(tenantId, () -> delegate.getOrCreateActiveKey(tenantId));
    }
    
    @EventListener
    public void onKeyRotation(KeyRotationEvent event) {
        keyCache.invalidate(event.getTenantId());
    }
}
```

### 3. Authorization Cleanup Job

**Goal:** Periodically remove expired authorizations to prevent database bloat.

**Implementation:**

```java
@Scheduled(cron = "0 0 3 * * *") // Daily at 3 AM
public void cleanupExpiredAuthorizations() {
    Instant cutoff = Instant.now().minus(7, ChronoUnit.DAYS);
    
    long deleted = repository.deleteByAccessTokenExpiresAtBefore(cutoff);
    log.info("Cleaned up {} expired authorizations", deleted);
}
```

### 4. Multi-Region Key Replication

**Goal:** Replicate tenant keys across regions for high availability.

**Implementation:**

```java
@EventListener
public void onKeyGeneration(KeyGenerationEvent event) {
    // Replicate to secondary regions
    replicationService.replicateKey(
        event.getTenantId(),
        event.getKeyId(),
        List.of("us-west-2", "eu-west-1")
    );
}
```

---

## Related Documentation

- [Authorization Service](authorization_service.md) - Parent module overview
- [Authorization Service Configuration](authorization_service_configuration.md) - OAuth 2.0 server configuration
- [Authorization Service Controllers](authorization_service_controllers.md) - Web controllers for authentication flows
- [Data Layer Mongo](data_layer_mongo.md) - MongoDB repositories and documents
- [Security Core](security_core.md) - Shared security utilities
- [Gateway Service](gateway_service.md) - JWT token validation
- [API Service](api_service.md) - Resource server consuming JWT tokens

---

## Additional Resources

### OAuth 2.0 and OIDC Standards

- [RFC 6749: OAuth 2.0 Authorization Framework](https://datatracker.ietf.org/doc/html/rfc6749)
- [RFC 7636: Proof Key for Code Exchange (PKCE)](https://datatracker.ietf.org/doc/html/rfc7636)
- [RFC 7519: JSON Web Token (JWT)](https://datatracker.ietf.org/doc/html/rfc7519)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)

### Spring Security Documentation

- [Spring Authorization Server Reference](https://docs.spring.io/spring-authorization-server/docs/current/reference/html/)
- [Spring Security OAuth 2.0 Resource Server](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/index.html)
- [Spring Security JWT](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html)

### OpenFrame Resources

- [OpenFrame Documentation](https://www.flamingo.run/openframe)
- [OpenMSP Community Slack](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA)
- [GitHub Repository](https://github.com/openframe)

---

**Questions or Issues?**

For questions about the Authorization Service Services module, please reach out on the [OpenMSP Slack community](https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA).
