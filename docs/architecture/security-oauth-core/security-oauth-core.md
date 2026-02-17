# Security Oauth Core

The **Security Oauth Core** module provides the foundational building blocks for JWT-based security and OAuth2 flows across the OpenFrame platform. It centralizes:

- RSA-based JWT encoding and decoding
- Externalized JWT configuration (keys, issuer, audience)
- OAuth2 token naming conventions
- PKCE (Proof Key for Code Exchange) utilities for secure authorization flows

This module is intentionally lightweight and reusable. It is consumed by higher-level services such as:

- [Authorization Service Core](../authorization-service-core/authorization-service-core.md)
- [Gateway Service Core](../gateway-service-core/gateway-service-core.md)
- [API Service Core](../api-service-core/api-service-core.md)

It does **not** expose HTTP endpoints itself. Instead, it supplies cryptographic and protocol utilities used by other security-aware modules.

---

## Architectural Overview

At a high level, Security Oauth Core sits at the bottom of the security stack and is responsible for key management and token primitives.

```mermaid
flowchart TD
    subgraph Applications["Platform Applications"]
        APIApp["API Application"]
        AuthApp["Authorization Server Application"]
        GatewayApp["Gateway Application"]
    end

    subgraph Services["Core Services"]
        AuthService["Authorization Service Core"]
        ApiService["API Service Core"]
        GatewayService["Gateway Service Core"]
    end

    subgraph SecurityCore["Security Oauth Core"]
        JwtSecurityConfigNode["JwtSecurityConfig"]
        JwtConfigNode["JwtConfig"]
        PkceUtilsNode["PKCEUtils"]
        SecurityConstantsNode["SecurityConstants"]
    end

    APIApp --> ApiService
    AuthApp --> AuthService
    GatewayApp --> GatewayService

    ApiService --> JwtSecurityConfigNode
    AuthService --> JwtSecurityConfigNode
    GatewayService --> JwtSecurityConfigNode

    AuthService --> PkceUtilsNode
    ApiService --> SecurityConstantsNode
```

### Responsibilities

| Component | Responsibility |
|------------|----------------|
| `JwtSecurityConfig` | Registers `JwtEncoder` and `JwtDecoder` beans using RSA keys |
| `JwtConfig` | Loads RSA keys and JWT properties from configuration |
| `SecurityConstants` | Defines OAuth token and header constants |
| `PKCEUtils` | Implements PKCE state, verifier, and challenge generation |

---

## JWT Infrastructure

JWT support in Security Oauth Core is built around Spring Security’s OAuth2 JWT abstraction and Nimbus JOSE implementation.

### JwtSecurityConfig

`JwtSecurityConfig` is a Spring `@Configuration` class that wires:

- `JwtEncoder`
- `JwtDecoder`

It uses RSA keys loaded from `JwtConfig` to:

- Sign JWTs with the private key
- Validate JWTs with the public key

```mermaid
flowchart LR
    JwtConfigNode["JwtConfig"] -->|"loadPublicKey()"| JwtDecoderNode["JwtDecoder"]
    JwtConfigNode -->|"loadPublicKey()"| RsaKeyNode["RSAKey"]
    JwtConfigNode -->|"loadPrivateKey()"| RsaKeyNode
    RsaKeyNode --> JwkSetNode["JWKSet"]
    JwkSetNode --> JwtEncoderNode["JwtEncoder"]
```

#### Encoder Flow

1. Load RSA public key
2. Load RSA private key
3. Build `RSAKey`
4. Wrap in `JWKSet`
5. Create `NimbusJwtEncoder`

#### Decoder Flow

1. Load RSA public key
2. Create `NimbusJwtDecoder`

This separation ensures:

- Signing requires private key access
- Verification requires only public key access

---

## JWT Configuration

### JwtConfig

`JwtConfig` is a `@ConfigurationProperties(prefix = "jwt")` bean that externalizes:

- Public key
- Private key
- Issuer
- Audience

It converts PEM-encoded RSA keys into Java security types.

### Example Configuration

```yaml
jwt:
  issuer: https://auth.openframe.local
  audience: openframe-api
  publicKey:
    value: |
      -----BEGIN PUBLIC KEY-----
      MIIBIjANBgkqh...
      -----END PUBLIC KEY-----
  privateKey:
    value: |
      -----BEGIN PRIVATE KEY-----
      MIIEvQIBADANBgkqh...
      -----END PRIVATE KEY-----
```

### Private Key Loading Logic

The private key loader:

1. Removes PEM headers and footers
2. Strips whitespace
3. Base64-decodes the key
4. Uses `PKCS8EncodedKeySpec`
5. Constructs `RSAPrivateKey` via `KeyFactory`

This ensures compatibility with standard PKCS#8 PEM formats.

---

## OAuth Token Constants

### SecurityConstants

`SecurityConstants` centralizes naming conventions for OAuth2 tokens and headers.

```text
Query Parameter:
- authorization

Headers:
- Access-Token
- Refresh-Token

Token Types:
- access_token
- refresh_token
```

This prevents hard-coded string duplication across modules such as:

- [Gateway Service Core](../gateway-service-core/gateway-service-core.md)
- [API Service Core](../api-service-core/api-service-core.md)

---

## PKCE Support

### PKCEUtils

`PKCEUtils` provides utilities required for secure OAuth2 Authorization Code flows with PKCE.

It implements:

- `generateState()` → CSRF protection
- `generateCodeVerifier()` → High-entropy secret
- `generateCodeChallenge()` → SHA-256 derived challenge
- `urlEncode()` → UTF-8 URL encoding

### PKCE Flow

```mermaid
sequenceDiagram
    participant Client
    participant AuthServer as "Authorization Server"

    Client->>Client: generateCodeVerifier()
    Client->>Client: generateCodeChallenge(verifier)
    Client->>Client: generateState()
    Client->>AuthServer: /authorize?code_challenge=...&state=...
    AuthServer->>Client: Redirect with authorization_code
    Client->>AuthServer: /token with code + code_verifier
    AuthServer->>AuthServer: Verify SHA256(verifier) matches challenge
    AuthServer->>Client: access_token + refresh_token
```

### Security Characteristics

| Feature | Security Benefit |
|----------|------------------|
| 128-bit state | Prevents CSRF attacks |
| 256-bit verifier | Prevents code interception attacks |
| SHA-256 challenge | Ensures verifier integrity |
| Base64URL encoding | URL-safe without padding |

This functionality is typically used by the [Authorization Service Core](../authorization-service-core/authorization-service-core.md) during OAuth2 flows.

---

## Integration with Other Modules

Security Oauth Core is consumed by multiple platform layers:

### Authorization Service Core

- Uses PKCE utilities for OAuth2 flows
- Uses JWT encoder for issuing tokens
- Uses JWT decoder for validation

See: [Authorization Service Core](../authorization-service-core/authorization-service-core.md)

### Gateway Service Core

- Validates JWTs for inbound API requests
- Applies security filters using decoded tokens

See: [Gateway Service Core](../gateway-service-core/gateway-service-core.md)

### API Service Core

- Relies on JWT decoding for authenticated user context
- Uses token constants for header parsing

See: [API Service Core](../api-service-core/api-service-core.md)

---

## Design Principles

Security Oauth Core follows several important principles:

1. **Separation of Concerns** – No controllers or HTTP endpoints
2. **Cryptographic Isolation** – Centralized key handling
3. **Configuration-Driven** – Keys and claims are externalized
4. **Stateless Token Model** – Designed for distributed systems
5. **Standards Compliance** – OAuth2, OIDC, PKCE, RSA, JWK

---

## Summary

The **Security Oauth Core** module provides:

- RSA-based JWT encoding and decoding
- Configurable issuer and audience management
- OAuth2 token constant definitions
- Secure PKCE utilities for authorization flows

It acts as the cryptographic and protocol foundation for authentication and authorization across the OpenFrame platform, ensuring consistent, secure, and standards-compliant behavior across all services.