# OpenFrame JWT Library

A JWT (JSON Web Token) authentication and authorization library for the OpenFrame microservices ecosystem.

## Purpose

* Implements JWT (JSON Web Token) functionality for OpenFrame services
* Provides token generation, validation, and claim extraction
* Integrates with Spring Security for authentication
* Supports both user and client credential authentication models
* Manages RSA key pairs for token signing and verification

## Key Components

### Core Classes

- `JwtService`: Central service for generating, validating, and parsing JWT tokens
- `JwtConfig`: Configuration class that loads RSA keys and JWT properties
- `JwtSecurityConfig`: Spring configuration for JWT encoder/decoder beans
- `KeyConfig`: Utility class for RSA key loading and conversion

### Security Adapters

- `UserSecurity`: Adapts OpenFrame User model to Spring Security's UserDetails
- `OAuthClientSecurity`: Adapts OpenFrame OAuthClient model to UserDetails

## Configuration

Add the following to your application properties or YAML:

```yaml
jwt:
  issuer: openframe
  audience: openframe-web
  publicKey:
    value: |
      -----BEGIN PUBLIC KEY-----
      [YOUR_PUBLIC_KEY]
      -----END PUBLIC KEY-----
  privateKey:
    value: |
      -----BEGIN PRIVATE KEY-----
      [YOUR_PRIVATE_KEY]
      -----END PRIVATE KEY-----

security:
  oauth2:
    token:
      access:
        expiration-seconds: 3600
```

## Usage Examples

### Token Generation

```java
@Autowired
private JwtService jwtService;

// For user authentication
public String generateUserToken(User user) {
    UserSecurity userSecurity = new UserSecurity(user);
    return jwtService.generateToken(userSecurity);
}

// For client authentication
public String generateClientToken(OAuthClient client) {
    OAuthClientSecurity clientSecurity = new OAuthClientSecurity(client);
    return jwtService.generateToken(clientSecurity);
}

// For custom claims
public String generateCustomToken(String subject, Map<String, Object> claims) {
    JwtClaimsSet.Builder claimsBuilder = JwtClaimsSet.builder()
        .issuer("https://auth.openframe.com")
        .subject(subject)
        .issuedAt(Instant.now())
        .expiresAt(Instant.now().plusSeconds(3600));
    
    claims.forEach(claimsBuilder::claim);
    
    return jwtService.generateToken(claimsBuilder.build());
}
```

### Token Validation

```java
@Autowired
private JwtService jwtService;

// Validate a user token
public boolean validateUserToken(String token, User user) {
    UserSecurity userSecurity = new UserSecurity(user);
    return jwtService.isTokenValid(token, userSecurity);
}

// Validate a client token
public boolean validateClientToken(String token, OAuthClient client) {
    OAuthClientSecurity clientSecurity = new OAuthClientSecurity(client);
    return jwtService.isTokenValid(token, clientSecurity);
}
```

### Extracting Claims

```java
@Autowired
private JwtService jwtService;

// Extract the username
String username = jwtService.extractUsername(token);

// Extract the client ID
String clientId = jwtService.extractClientId(token);

// Extract the grant type
String grantType = jwtService.extractGrantType(token);
```

## Integration with OpenFrame Services

The JWT library serves two primary functions across the OpenFrame ecosystem:

- **Token Generation**: Used by OpenFrame services (API, Client) to generate JWT tokens for authentication
- **Token Validation**: Used by the OpenFrame Gateway to verify and validate tokens for incoming requests

This separation of concerns allows services to issue tokens while the gateway handles centralized authentication and authorization before routing requests.

## Security Considerations

- RSA keys should be rotated periodically
- Private keys must be kept secure and not exposed
- Token expiration should be set appropriately based on security requirements
- Consider implementing token revocation for highly sensitive operations

## Logging

The library uses SLF4J for logging with the following levels:
- DEBUG: Detailed information about token processing
- ERROR: Failed token validations or processing errors


## Maven Configuration

```xml
<dependency>
    <groupId>com.openframe</groupId>
    <artifactId>openframe-jwt</artifactId>
    <version>1.0.0-SNAPSHOT</version>
</dependency>
```

## Project Structure

```
openframe-jwt
├── src/main/java/com/openframe/security
│   ├── adapter
│   │   ├── OAuthClientSecurity.java
│   │   └── UserSecurity.java
│   ├── config
│   │   └── JwtSecurityConfig.java
│   └── jwt
│       ├── JwtConfig.java
│       ├── JwtService.java
│       └── KeyConfig.java
├── pom.xml
└── README.md
```
