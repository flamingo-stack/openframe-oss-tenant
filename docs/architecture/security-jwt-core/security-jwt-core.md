# Security Jwt Core

## Overview

The **Security Jwt Core** module provides the foundational JWT and PKCE infrastructure used across the OpenFrame platform. It centralizes:

- RSA-based JWT encoding and decoding
- Externalized JWT configuration (issuer, audience, keys)
- Security-related constants for OAuth2 flows
- PKCE (Proof Key for Code Exchange) utilities for secure OAuth2 authorization code flows

This module is intentionally lightweight and reusable. It does not define full authentication flows itself; instead, it supplies cryptographic and configuration primitives used by higher-level modules such as:

- [Authorization Service Core](authorization-service-core/authorization-service-core.md)
- [Gateway Service Core](gateway-service-core/gateway-service-core.md)
- [Security OAuth BFF](security-oauth-bff/security-oauth-bff.md)

---

## Architectural Role in the Platform

At a high level, Security Jwt Core acts as the cryptographic backbone for token issuance and validation.

```mermaid
flowchart LR
    subgraph auth_server["Authorization Layer"]
        AuthServer["Authorization Service Core"]
    end

    subgraph security_core["Security Jwt Core"]
        JwtSecurityConfig["JwtSecurityConfig"]
        JwtConfig["JwtConfig"]
        PKCEUtils["PKCEUtils"]
        SecurityConstants["SecurityConstants"]
    end

    subgraph edge_layer["Edge Layer"]
        Gateway["Gateway Service Core"]
    end

    AuthServer -->|"uses JwtEncoder"| JwtSecurityConfig
    JwtSecurityConfig --> JwtConfig
    Gateway -->|"uses JwtDecoder"| JwtSecurityConfig
    AuthServer -->|"uses PKCE"| PKCEUtils
```

### Responsibilities

- Provide Spring beans for `JwtEncoder` and `JwtDecoder`
- Load RSA keys from configuration
- Standardize token-related constants (headers, query params)
- Support secure OAuth2 Authorization Code + PKCE flows

---

## Core Components

### 1. JwtSecurityConfig

**Component:**  
`deps.openframe-oss-lib.openframe-security-core.src.main.java.com.openframe.security.config.JwtSecurityConfig.JwtSecurityConfig`

`JwtSecurityConfig` is a Spring `@Configuration` class that wires up:

- `JwtEncoder` (using Nimbus)
- `JwtDecoder` (using RSA public key)

### Encoder Configuration

The encoder:

1. Loads RSA public and private keys from `JwtConfig`
2. Wraps them into a `RSAKey`
3. Publishes a `NimbusJwtEncoder` backed by a `JWKSet`

```mermaid
flowchart TD
    JwtSecurityConfig["JwtSecurityConfig"] -->|"injects"| JwtConfig["JwtConfig"]
    JwtConfig -->|"loadPublicKey()"| RSAPublicKey["RSAPublicKey"]
    JwtConfig -->|"loadPrivateKey()"| RSAPrivateKey["RSAPrivateKey"]
    RSAPublicKey --> RSAKey["RSAKey"]
    RSAPrivateKey --> RSAKey
    RSAKey --> JWKSet["JWKSet"]
    JWKSet --> JwtEncoder["NimbusJwtEncoder"]
```

### Decoder Configuration

The decoder:

- Uses only the RSA public key
- Builds a `NimbusJwtDecoder`
- Verifies JWT signatures using the configured public key

This ensures asymmetric signing:

- ✅ Private key → signing (Authorization Server)
- ✅ Public key → verification (Gateway, APIs)

---

### 2. JwtConfig

**Component:**  
`deps.openframe-oss-lib.openframe-security-core.src.main.java.com.openframe.security.jwt.JwtConfig.JwtConfig`

`JwtConfig` is a Spring Boot `@ConfigurationProperties` service bound to the `jwt.*` prefix.

#### Configuration Model

```text
jwt:
  issuer: https://auth.example.com
  audience: openframe-api
  public-key:
    value: -----BEGIN PUBLIC KEY-----...
  private-key:
    value: -----BEGIN PRIVATE KEY-----...
```

#### Key Responsibilities

- Load RSA public key
- Parse and decode PEM private key
- Provide issuer and audience values

#### Private Key Loading Flow

```mermaid
flowchart TD
    PrivateKeyPem["PEM Private Key"] --> StripHeaders["Remove BEGIN/END markers"]
    StripHeaders --> Base64Decode["Base64 Decode"]
    Base64Decode --> PKCS8Spec["PKCS8EncodedKeySpec"]
    PKCS8Spec --> KeyFactory["KeyFactory RSA"]
    KeyFactory --> RSAPrivateKey["RSAPrivateKey"]
```

This approach ensures:

- Externalized cryptographic material
- Environment-specific key configuration
- No hardcoded secrets in source code

---

### 3. SecurityConstants

**Component:**  
`deps.openframe-oss-lib.openframe-security-core.src.main.java.com.openframe.security.oauth.SecurityConstants.SecurityConstants`

`SecurityConstants` defines shared constants used across OAuth2 and token handling logic.

#### Defined Constants

- `AUTHORIZATION_QUERY_PARAM`
- `ACCESS_TOKEN`
- `REFRESH_TOKEN`
- `ACCESS_TOKEN_HEADER`
- `REFRESH_TOKEN_HEADER`

This ensures consistent naming across:

- Gateway filters
- Controllers
- OAuth BFF layer
- Frontend API clients

---

### 4. PKCEUtils

**Component:**  
`deps.openframe-oss-lib.openframe-security-core.src.main.java.com.openframe.security.pkce.PKCEUtils.PKCEUtils`

`PKCEUtils` implements utilities required for OAuth2 Authorization Code with PKCE.

#### Supported Operations

- `generateState()` – 128-bit random state (CSRF protection)
- `generateCodeVerifier()` – 256-bit secure verifier
- `generateCodeChallenge()` – SHA-256 based challenge
- `urlEncode()` – UTF-8 safe URL encoding

#### PKCE Flow Overview

```mermaid
sequenceDiagram
    participant Client
    participant AuthServer as "Authorization Service"

    Client->>Client: Generate code_verifier
    Client->>Client: Derive code_challenge (SHA-256)
    Client->>AuthServer: Authorization Request with code_challenge
    AuthServer->>Client: Authorization Code
    Client->>AuthServer: Token Request with code_verifier
    AuthServer->>AuthServer: Validate SHA256(code_verifier)
    AuthServer->>Client: Access Token (JWT)
```

Security properties:

- Prevents intercepted authorization codes from being reused
- Protects public clients (SPAs, mobile apps)
- Mitigates authorization code injection attacks

---

## Security Model

Security Jwt Core enables a modern, asymmetric JWT architecture:

```mermaid
flowchart LR
    PrivateKey["RSA Private Key"] -->|"sign"| JWT["JWT"]
    JWT -->|"verify"| PublicKey["RSA Public Key"]
```

### Key Properties

- Asymmetric RSA signing
- Stateless token verification
- Centralized configuration
- PKCE-based OAuth hardening

---

## Integration with Other Modules

### Authorization Service Core

- Uses `JwtEncoder` to sign access tokens
- Uses `PKCEUtils` in OAuth2 flows
- Manages token issuance lifecycle

See:  
[Authorization Service Core](authorization-service-core/authorization-service-core.md)

### Gateway Service Core

- Uses `JwtDecoder` to validate incoming tokens
- Applies JWT validation before routing

See:  
[Gateway Service Core](gateway-service-core/gateway-service-core.md)

### Security OAuth BFF

- Uses PKCE utilities
- Coordinates frontend token exchanges

See:  
[Security OAuth BFF](security-oauth-bff/security-oauth-bff.md)

---

## Design Principles

1. **Separation of concerns** – Cryptography isolated from business logic
2. **Asymmetric trust model** – Private key never exposed outside issuer
3. **Configuration-driven** – Keys and issuer configurable per tenant/environment
4. **OAuth2-compliant** – PKCE and JWT standards adhered to
5. **Reusable core** – Shared across API, Gateway, BFF, and Authorization layers

---

## Summary

The **Security Jwt Core** module is the cryptographic foundation of the OpenFrame security model. It provides:

- RSA-backed JWT encoding and decoding
- Secure key loading and configuration
- Standardized OAuth2 constants
- PKCE utilities for hardened authorization flows

By abstracting token mechanics and cryptographic concerns into a focused core module, the platform ensures consistent, secure, and reusable authentication behavior across all services.