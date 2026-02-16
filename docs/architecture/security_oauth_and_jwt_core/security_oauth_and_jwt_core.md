# Security Oauth And Jwt Core

## Overview

The **Security Oauth And Jwt Core** module provides the foundational security building blocks for authentication and authorization across the OpenFrame platform. It encapsulates:

- JWT encoding and decoding infrastructure
- RSA key loading and configuration
- OAuth2 BFF (Backend-for-Frontend) flows
- PKCE utilities for secure public client flows
- Token handling constants and conventions
- Development ticket exchange support

This module is consumed by higher-level services such as the Gateway, Authorization Server, API services, and Frontend applications to enforce secure, standards-based authentication.

---

## Architectural Role in the Platform

At runtime, the Security Oauth And Jwt Core module sits between:

- The **Authorization Server** (which issues tokens)
- The **Gateway / API Services** (which validate tokens)
- The **Frontend / BFF layer** (which manages OAuth flows and cookies)

### High-Level Security Flow

```mermaid
flowchart TD
    Browser["Browser / Frontend App"] -->|"/oauth/login"| BFF["OAuth BFF Controller"]
    BFF -->|"Redirect with PKCE + state"| AuthServer["Authorization Server"]
    AuthServer -->|"Authorization Code"| BFF
    BFF -->|"Token Exchange"| AuthServer
    AuthServer -->|"JWT Access + Refresh Tokens"| BFF
    BFF -->|"HTTP-Only Cookies"| Browser

    Browser -->|"API Request with Cookie"| Gateway["Gateway Service"]
    Gateway -->|"JWT Validation"| JwtDecoder["Jwt Decoder"]
    JwtDecoder --> Gateway
    Gateway --> Api["Downstream API Service"]
```

The module ensures:

- Tokens are cryptographically signed using RSA
- Public clients use PKCE for secure authorization code exchange
- State parameters prevent CSRF attacks
- Access and refresh tokens are consistently handled across services

---

## Core Components

### 1. JwtSecurityConfig

**Class:** `JwtSecurityConfig`  
**Package:** `com.openframe.security.config`

This configuration class wires Spring Security JWT infrastructure.

#### Responsibilities

- Creates a `JwtEncoder` backed by an RSA key pair
- Creates a `JwtDecoder` backed by the configured RSA public key
- Integrates with Spring Security OAuth2 Resource Server support

#### Internal Flow

```mermaid
flowchart LR
    JwtConfig["JwtConfig"] -->|"loadPublicKey()"| JwtSecurityConfig
    JwtConfig -->|"loadPrivateKey()"| JwtSecurityConfig
    JwtSecurityConfig -->|"build RSAKey"| JWKSet["JWK Set"]
    JWKSet --> JwtEncoder["Nimbus JwtEncoder"]
    JwtSecurityConfig --> JwtDecoder["Nimbus JwtDecoder"]
```

- The encoder signs JWTs using the private key.
- The decoder validates JWT signatures using the public key.

This separation allows services to:

- Issue tokens (Authorization Server)
- Validate tokens (Gateway, APIs)

without exposing private keys to all services.

---

### 2. JwtConfig

**Class:** `JwtConfig`  
**Package:** `com.openframe.security.jwt`

This component binds to `jwt.*` configuration properties and is responsible for loading RSA keys and token metadata.

#### Key Responsibilities

- Load RSA public key
- Load RSA private key (PKCS8)
- Provide issuer and audience metadata
- Decode PEM-formatted keys

#### Configuration Example

```yaml
jwt:
  issuer: https://auth.example.com
  audience: openframe-api
  public-key:
    value: |
      -----BEGIN PUBLIC KEY-----
      ...
      -----END PUBLIC KEY-----
  private-key:
    value: |
      -----BEGIN PRIVATE KEY-----
      ...
      -----END PRIVATE KEY-----
```

The private key is stripped of header/footer markers and Base64-decoded before being converted into an `RSAPrivateKey`.

---

### 3. SecurityConstants

**Class:** `SecurityConstants`  
**Package:** `com.openframe.security.oauth`

Defines shared constants used across OAuth and BFF flows.

#### Key Constants

- `ACCESS_TOKEN`
- `REFRESH_TOKEN`
- `ACCESS_TOKEN_HEADER`
- `REFRESH_TOKEN_HEADER`
- `AUTHORIZATION_QUERY_PARAM`

These ensure consistent naming of:

- Cookie names
- HTTP header names
- Query parameters

across Gateway, BFF, and frontend integrations.

---

### 4. PKCEUtils

**Class:** `PKCEUtils`  
**Package:** `com.openframe.security.pkce`

Provides cryptographic utilities for PKCE (Proof Key for Code Exchange).

#### Responsibilities

- Generate secure `state` values (128-bit)
- Generate secure `code_verifier` values (256-bit)
- Generate `code_challenge` using SHA-256
- Base64URL encode values (no padding)

#### PKCE Flow

```mermaid
flowchart TD
    Verifier["Generate Code Verifier"] --> Challenge["SHA-256 Hash"]
    Challenge --> Encode["Base64URL Encode"]
    Encode --> CodeChallenge["Code Challenge"]
```

Security guarantees:

- Protects against authorization code interception
- Ensures only the original client can exchange the code
- Uses `SecureRandom` for cryptographic entropy

---

### 5. OAuthBffController

**Class:** `OAuthBffController`  
**Package:** `com.openframe.security.oauth.controller`

This is the reactive Backend-for-Frontend controller handling OAuth flows.

It is conditionally enabled via:

```yaml
openframe:
  gateway:
    oauth:
      enable: true
```

#### Exposed Endpoints

- `GET /oauth/login`
- `GET /oauth/continue`
- `GET /oauth/callback`
- `POST /oauth/refresh`
- `GET /oauth/logout`
- `GET /oauth/dev-exchange`

#### Login Flow

```mermaid
sequenceDiagram
    participant Browser
    participant BFF as "OAuth BFF Controller"
    participant Auth as "Authorization Server"

    Browser->>BFF: GET /oauth/login
    BFF->>Auth: Redirect with state + PKCE
    Auth->>Browser: Redirect to login
    Browser->>Auth: Authenticate
    Auth->>BFF: Redirect with code + state
    BFF->>Auth: Exchange code for tokens
    Auth->>BFF: access_token + refresh_token
    BFF->>Browser: Set cookies + redirect
```

#### Responsibilities

- Builds authorization redirect URLs
- Generates state JWTs
- Stores state in secure cookies
- Exchanges authorization code for tokens
- Sets HTTP-only auth cookies
- Refreshes tokens
- Revokes refresh tokens on logout
- Handles error redirects safely

All token operations are delegated to an `OAuthBffService`, keeping the controller focused on HTTP orchestration.

---

### 6. InMemoryOAuthDevTicketStore

**Class:** `InMemoryOAuthDevTicketStore`  
**Package:** `com.openframe.security.oauth.service`

A development-only ticket exchange mechanism.

#### Purpose

Allows temporary exposure of tokens via short-lived tickets for:

- Local development
- Debugging
- Tooling integration

#### Behavior

```mermaid
flowchart LR
    Tokens["TokenResponse"] -->|"createTicket"| Store["In-Memory Map"]
    Client["Dev Client"] -->|"/dev-exchange"| Store
    Store -->|"consumeTicket"| Tokens
```

- Stores tokens in a concurrent map
- Generates a UUID ticket
- Removes entry upon consumption

Enabled only when development ticket support is active.

---

### 7. DefaultRedirectTargetResolver

**Class:** `DefaultRedirectTargetResolver`  
**Package:** `com.openframe.security.oauth.service.redirect`

Resolves the final redirect target after successful OAuth flow.

#### Resolution Strategy

1. Use explicitly requested redirect target if present
2. Otherwise, use HTTP `Referer` header
3. Fallback to `/`

This provides safe and predictable redirection while allowing flexibility for multi-tenant flows.

---

## Security Design Principles

The Security Oauth And Jwt Core module enforces several key principles:

### 1. Cryptographic Isolation

- Private keys are only required in token-issuing contexts
- Public keys are sufficient for validation
- RSA-based signing ensures asymmetric trust model

### 2. PKCE Everywhere for Public Clients

- Mandatory code verifier
- SHA-256 challenge method
- CSRF protection via state parameter

### 3. Cookie-Based Token Handling

- Access and refresh tokens stored in HTTP-only cookies
- Optional development headers for debugging
- Explicit cookie clearing on logout

### 4. Reactive, Non-Blocking Design

- Uses `Mono` for all asynchronous flows
- Compatible with WebFlux-based services

---

## Integration Points

This module integrates with:

- Authorization services for token issuance
- Gateway services for JWT validation
- API services for resource protection
- Frontend applications via BFF endpoints

It provides the reusable primitives necessary to build a secure, multi-tenant OAuth2 + JWT-based authentication system across the entire OpenFrame ecosystem.

---

## Summary

The **Security Oauth And Jwt Core** module is the cryptographic and OAuth backbone of the platform. It centralizes:

- RSA key management
- JWT encoding and decoding
- PKCE utilities
- OAuth BFF orchestration
- Token lifecycle management

By isolating these responsibilities into a dedicated core module, OpenFrame ensures consistent, secure, and standards-compliant authentication behavior across all services.