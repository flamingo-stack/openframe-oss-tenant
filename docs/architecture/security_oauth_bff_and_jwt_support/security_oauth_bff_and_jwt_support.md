# Security Oauth Bff And Jwt Support

## Overview

The **Security Oauth Bff And Jwt Support** module provides the foundational security building blocks for the OpenFrame platform. It delivers:

- ✅ RSA-based JWT encoding and decoding
- ✅ OAuth2 Authorization Code + PKCE support
- ✅ Backend-for-Frontend (BFF) OAuth flows
- ✅ Secure cookie-based token handling
- ✅ Development ticket exchange for local workflows

This module acts as the glue between:

- The Authorization Server
- The Gateway layer
- Frontend tenant applications
- Downstream API services

It standardizes how tokens are generated, validated, transported, refreshed, and revoked across the system.

---

## Architectural Positioning

At a high level, this module sits between the frontend and the authorization server, while also providing JWT infrastructure for service-to-service security.

```mermaid
flowchart LR
    Frontend["Frontend Tenant App"] -->|"/oauth/login"| BFF["OAuth BFF Controller"]
    BFF -->|"Authorization Code + PKCE"| AuthServer["Authorization Server"]
    AuthServer -->|"JWT Tokens"| BFF
    BFF -->|"HttpOnly Cookies"| Browser["User Browser"]

    Browser -->|"Access Token Cookie"| Gateway["Gateway Service"]
    Gateway -->|"JWT Validation"| JwtConfig["JWT Security Config"]
    JwtConfig -->|"RSA Public Key"| Services["API Services"]
```

### Responsibilities

| Layer | Responsibility |
|--------|----------------|
| OAuth BFF | Manages browser-based OAuth flows securely |
| PKCE Utils | Generates cryptographically secure PKCE artifacts |
| JWT Config | Loads RSA keys and configures token issuer/audience |
| Jwt Security Config | Provides Spring JWT encoder/decoder beans |
| Dev Ticket Store | Enables local development token exchange |

---

# Core Components

## 1. JWT Infrastructure

### JwtConfig

`JwtConfig` loads RSA public and private keys from configuration properties (`jwt.*`).

It is responsible for:

- Parsing PEM-formatted private keys
- Converting Base64 content into `RSAPrivateKey`
- Loading `RSAPublicKey`
- Providing issuer and audience configuration

Example configuration structure:

```yaml
jwt:
  issuer: https://auth.openframe.local
  audience: openframe-api
  publicKey:
    value: "-----BEGIN PUBLIC KEY-----..."
  privateKey:
    value: "-----BEGIN PRIVATE KEY-----..."
```

### JwtSecurityConfig

`JwtSecurityConfig` wires Spring Security JWT components:

- `JwtEncoder` using Nimbus + RSA private key
- `JwtDecoder` using RSA public key

```mermaid
flowchart TD
    JwtConfig["JwtConfig"] -->|"loadPublicKey()"| Decoder["JwtDecoder"]
    JwtConfig -->|"loadPrivateKey()"| Encoder["JwtEncoder"]
    Encoder -->|"sign JWT"| Token["Access Token"]
    Decoder -->|"verify signature"| Validation["Token Validation"]
```

This ensures:

- Tokens are signed with the private key
- Services validate with the public key
- No symmetric secrets are shared between services

---

## 2. OAuth Backend-for-Frontend (BFF)

### OAuthBffController

`OAuthBffController` exposes reactive endpoints under `/oauth`.

Enabled via:

```text
openframe.gateway.oauth.enable=true
```

### Supported Endpoints

| Endpoint | Purpose |
|-----------|----------|
| `/oauth/login` | Initiates OAuth flow |
| `/oauth/continue` | Continues flow after SSO |
| `/oauth/callback` | Exchanges authorization code |
| `/oauth/refresh` | Refreshes tokens |
| `/oauth/logout` | Revokes refresh token |
| `/oauth/dev-exchange` | Dev-only ticket exchange |

---

### OAuth Login Flow

```mermaid
sequenceDiagram
    participant Browser
    participant BFF as OAuth BFF
    participant Auth as Authorization Server

    Browser->>BFF: GET /oauth/login?tenantId=abc
    BFF->>Auth: Redirect with PKCE + state
    Auth->>Browser: Redirect back with code + state
    Browser->>BFF: GET /oauth/callback
    BFF->>Auth: Exchange code for tokens
    Auth->>BFF: access_token + refresh_token
    BFF->>Browser: Set HttpOnly cookies
```

### Security Mechanisms

- ✅ PKCE (Proof Key for Code Exchange)
- ✅ State parameter (CSRF protection)
- ✅ HttpOnly cookies for token storage
- ✅ Optional dev ticket exchange
- ✅ Automatic refresh token rotation

---

## 3. PKCE Support

### PKCEUtils

`PKCEUtils` provides cryptographically secure helpers:

- `generateState()` → 128-bit random CSRF state
- `generateCodeVerifier()` → 256-bit verifier
- `generateCodeChallenge()` → SHA-256 Base64URL encoded

```mermaid
flowchart TD
    Verifier["Code Verifier"] -->|"SHA-256"| Hash["Hash"]
    Hash -->|"Base64URL"| Challenge["Code Challenge"]
```

Security properties:

- Uses `SecureRandom`
- Uses SHA-256 digest
- URL-safe Base64 encoding without padding

This prevents authorization code interception attacks.

---

## 4. Cookie & Token Handling

The BFF model ensures:

- Tokens never exposed to JavaScript
- Stored as secure, HttpOnly cookies
- Automatically attached to requests
- Cleared on logout

### Token Sources

Tokens can be retrieved from:

- `access_token` cookie
- `refresh_token` cookie
- `Access-Token` header (dev mode)
- `Refresh-Token` header (dev mode)

Defined in:

```text
SecurityConstants
- ACCESS_TOKEN
- REFRESH_TOKEN
- ACCESS_TOKEN_HEADER
- REFRESH_TOKEN_HEADER
```

---

## 5. Dev Ticket Exchange

### InMemoryOAuthDevTicketStore

Used for local development only.

Flow:

```mermaid
flowchart LR
    Tokens["TokenResponse"] -->|"createTicket()"| Store["InMemory Store"]
    DevClient["Dev Client"] -->|"/oauth/dev-exchange"| Store
    Store -->|"consumeTicket()"| DevClient
```

- Stores tokens in memory
- Generates UUID-based ticket
- One-time consumption
- Disabled in production when `dev-ticket-enabled=false`

This allows frontend debugging without compromising secure cookie policies.

---

## 6. Redirect Resolution

### DefaultRedirectTargetResolver

Resolves post-authentication redirect target:

Priority order:

1. `redirectTo` query parameter
2. HTTP Referer header
3. `/` fallback

This ensures safe and deterministic redirection.

---

# Security Model Summary

```mermaid
flowchart TD
    subgraph BrowserLayer["Browser"]
        Cookies["HttpOnly Cookies"]
    end

    subgraph BFFLayer["OAuth BFF"]
        PKCE["PKCE Utils"]
        State["State JWT"]
    end

    subgraph TokenLayer["JWT Infrastructure"]
        Encoder["JwtEncoder"]
        Decoder["JwtDecoder"]
    end

    Cookies -->|"access_token"| Decoder
    PKCE --> State
    Encoder --> Cookies
```

### Core Guarantees

- 🔐 Asymmetric JWT signing (RSA)
- 🛡 CSRF protection via state parameter
- 🔒 PKCE prevents code injection attacks
- 🍪 HttpOnly cookies protect tokens from XSS
- 🔁 Refresh flow supports silent session renewal

---

# How It Fits in the Platform

The **Security Oauth Bff And Jwt Support** module is reused by:

- Gateway services for token validation
- API services for JWT decoding
- Authorization server for issuing compatible tokens
- Frontend apps via secure OAuth flows

It centralizes all cross-cutting security concerns into one reusable library, ensuring:

- Consistent token semantics
- Reduced duplication
- Secure defaults
- Pluggable extension points

---

# When to Extend This Module

You should extend this module when:

- Adding a new OAuth provider
- Changing token claim structure
- Introducing custom redirect policies
- Replacing in-memory dev ticket storage
- Supporting additional JWT algorithms

Avoid modifying it when implementing business-level authorization logic — that belongs in higher-level services.

---

# Conclusion

The **Security Oauth Bff And Jwt Support** module provides a production-grade OAuth2 + JWT foundation for OpenFrame.

It combines:

- Reactive OAuth BFF patterns
- RSA-backed JWT security
- PKCE-based flow hardening
- Secure cookie-based session handling

Together, these components ensure a modern, secure, and scalable authentication architecture across the entire OpenFrame ecosystem.
