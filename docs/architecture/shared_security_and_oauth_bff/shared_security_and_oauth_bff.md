# Shared Security And Oauth Bff

The **Shared Security And Oauth Bff** module provides reusable security primitives and a Backend-for-Frontend (BFF) implementation for OAuth2/OIDC flows across the OpenFrame platform.

It centralizes:

- JWT encoding and decoding (RSA-based)
- PKCE utilities for secure OAuth flows
- OAuth2 BFF endpoints for login, callback, refresh, logout
- Development ticket exchange for local and integration scenarios
- Redirect and forwarded header customization hooks

This module is consumed primarily by the Gateway layer and integrates with the Authorization Server and other platform services.

---

## 1. Architectural Overview

At a high level, the Shared Security And Oauth Bff module sits between the frontend and the Authorization Server, handling secure token exchange and cookie management.

```mermaid
flowchart LR
    Frontend["Frontend Application"] -->|"/oauth/login"| BFF["OAuth BFF Controller"]
    BFF -->|"Authorize Redirect"| AuthServer["Authorization Server"]
    AuthServer -->|"code + state"| BFF
    BFF -->|"Set Auth Cookies"| Frontend

    BFF -->|"JWT Encode/Decode"| JwtLayer["JWT Security Config"]
    BFF -->|"PKCE + State"| Pkce["PKCE Utils"]
    BFF -->|"Dev Ticket"| DevStore["OAuth Dev Ticket Store"]
```

### Key Responsibilities

- **Stateless JWT security configuration** via `JwtSecurityConfig` and `JwtConfig`
- **PKCE-compliant OAuth flows** via `PKCEUtils`
- **Reactive OAuth BFF endpoints** via `OAuthBffController`
- **Secure cookie-based token storage** (through `CookieService` integration)
- **Development-mode token exchange** via `InMemoryOAuthDevTicketStore`

---

## 2. Internal Component Architecture

```mermaid
flowchart TD
    JwtConfigNode["JwtConfig"] --> JwtSecurityConfigNode["JwtSecurityConfig"]
    JwtSecurityConfigNode --> JwtEncoder["JwtEncoder Bean"]
    JwtSecurityConfigNode --> JwtDecoder["JwtDecoder Bean"]

    OAuthController["OAuthBffController"] --> OAuthService["OAuthBffService"]
    OAuthController --> DevTicketStore["OAuthDevTicketStore"]
    OAuthController --> CookieServiceNode["CookieService"]

    PKCE["PKCEUtils"] --> OAuthService
    RedirectResolver["DefaultRedirectTargetResolver"] --> OAuthService
    ForwardedHeaders["ForwardedHeadersContributor"] --> OAuthService
```

The module can be logically divided into the following layers:

1. **JWT Infrastructure Layer**
2. **OAuth BFF Web Layer**
3. **PKCE and Security Utilities**
4. **Redirect and Header Customization Hooks**
5. **Development Support Layer**

---

## 3. JWT Infrastructure

### Core Components

- `JwtSecurityConfig`
- `JwtConfig`

### JwtConfig

`JwtConfig` is a Spring `@ConfigurationProperties` service bound to the `jwt.*` prefix.

It provides:

- RSA public key loading
- RSA private key loading (PKCS8)
- Issuer and audience configuration

Example configuration:

```yaml
jwt:
  issuer: https://auth.example.com
  audience: openframe-api
  public-key:
    value: "-----BEGIN PUBLIC KEY-----..."
  private-key:
    value: "-----BEGIN PRIVATE KEY-----..."
```

### JwtSecurityConfig

Defines:

- `JwtEncoder` using `NimbusJwtEncoder`
- `JwtDecoder` using `NimbusJwtDecoder`

```mermaid
flowchart LR
    JwtConfigNode["JwtConfig"] -->|"Load RSA Keys"| JwtSecurityConfigNode["JwtSecurityConfig"]
    JwtSecurityConfigNode --> Encoder["NimbusJwtEncoder"]
    JwtSecurityConfigNode --> Decoder["NimbusJwtDecoder"]
```

This enables consistent token encoding/verification across services.

---

## 4. OAuth BFF Controller

### Core Component

- `OAuthBffController`

The `OAuthBffController` exposes reactive OAuth endpoints under `/oauth`.

### Endpoints

| Endpoint | Method | Purpose |
|-----------|--------|----------|
| `/oauth/login` | GET | Initiates OAuth flow with PKCE + state |
| `/oauth/continue` | GET | Continues OAuth flow without clearing session |
| `/oauth/callback` | GET | Exchanges code for tokens and sets cookies |
| `/oauth/refresh` | POST | Refreshes tokens via cookie or header |
| `/oauth/logout` | GET | Revokes refresh token and clears cookies |
| `/oauth/dev-exchange` | GET | Exchanges dev ticket for tokens |

### OAuth Login Flow

```mermaid
sequenceDiagram
    participant Browser
    participant BFF as "OAuth BFF"
    participant Auth as "Authorization Server"

    Browser->>BFF: GET /oauth/login
    BFF->>Auth: Redirect with code_challenge + state
    Auth->>Browser: Redirect to /oauth/callback
    Browser->>BFF: GET /oauth/callback?code=...&state=...
    BFF->>Auth: Token Exchange
    BFF->>Browser: Set-Cookie access_token + refresh_token
```

### Security Features

- PKCE (`S256` challenge)
- CSRF protection via state
- Signed state JWT
- Secure HttpOnly cookies
- Optional dev headers for local development

---

## 5. PKCE Utilities

### Core Component

- `PKCEUtils`

Responsibilities:

- Generate secure `state` (128-bit)
- Generate `code_verifier` (256-bit)
- Compute SHA-256 `code_challenge`
- URL-safe Base64 encoding (no padding)

```mermaid
flowchart TD
    Verifier["Code Verifier"] --> Hash["SHA-256"]
    Hash --> Encode["Base64URL"]
    Encode --> Challenge["Code Challenge"]
```

This ensures compliance with OAuth 2.1 and public client best practices.

---

## 6. Redirect and Header Handling

### DefaultRedirectTargetResolver

Provides fallback redirect resolution:

1. `redirectTo` request parameter
2. HTTP `Referer` header
3. `/` root path

This allows safe and flexible frontend redirection.

### NoopForwardedHeadersContributor

A default implementation that performs no header manipulation.

Designed to be overridden in environments requiring:

- Reverse proxy forwarding
- Custom host reconstruction
- Multi-tenant routing

---

## 7. Development Ticket Store

### Core Component

- `InMemoryOAuthDevTicketStore`

Purpose:

- Create short-lived tickets for token exchange
- Allow local frontend apps to retrieve tokens via `/oauth/dev-exchange`

```mermaid
flowchart LR
    BFF["OAuth BFF"] -->|"createTicket"| DevStore["InMemory Store"]
    Browser["Browser"] -->|"/oauth/dev-exchange"| BFF
    BFF -->|"consumeTicket"| DevStore
```

This is enabled only when `openframe.gateway.oauth.dev-ticket-enabled=true`.

---

## 8. Integration with Platform Services

The Shared Security And Oauth Bff module integrates with:

- [Authorization Server Core](../authorization_server_core/authorization_server_core.md)
- [Gateway Service Core](../gateway_service_core/gateway_service_core.md)
- [Data Persistence Mongo](../data_persistence_mongo/data_persistence_mongo.md)

### Integration Flow

```mermaid
flowchart LR
    Frontend --> Gateway["Gateway Service"]
    Gateway --> BFF["Shared Security And Oauth Bff"]
    BFF --> AuthServer["Authorization Server"]
    AuthServer --> Mongo["Mongo Persistence"]
```

- The **Authorization Server** handles user authentication and token issuance.
- The **BFF layer** performs PKCE, state validation, cookie management, and token refresh.
- The **Gateway** validates JWTs using the configured decoder.

---

## 9. Security Model Summary

- RSA-signed JWTs
- PKCE S256 mandatory
- CSRF protection via state
- HttpOnly cookie token storage
- Refresh token rotation support
- Tenant-aware flows
- Optional dev-mode exchange

---

## 10. When to Extend This Module

You should extend or customize this module when:

- Adding new OAuth providers
- Introducing custom redirect validation
- Supporting additional tenant resolution strategies
- Replacing the in-memory dev ticket store with Redis or database-backed storage
- Adding custom forwarded header reconstruction for edge deployments

---

# Conclusion

The **Shared Security And Oauth Bff** module provides the foundational security building blocks for OpenFrame's OAuth2-based authentication architecture. It enforces modern security best practices (PKCE, RSA JWT, secure cookies) while remaining flexible and extensible for multi-tenant and distributed deployments.
