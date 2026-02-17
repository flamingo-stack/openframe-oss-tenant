# Security Core And Oauth Bff

The **Security Core And Oauth Bff** module provides the foundational security building blocks for OpenFrame services, combining:

- ✅ JWT encoding and decoding infrastructure
- ✅ PKCE utilities for OAuth 2.1 compliant flows
- ✅ Backend-for-Frontend (BFF) OAuth orchestration
- ✅ Secure cookie-based token handling
- ✅ Redirect resolution and state validation

This module acts as the **security glue layer** between:

- The [Authorization Server Core](../authorization-server-core/authorization-server-core.md)
- The [Gateway Service Core](../gateway-service-core/gateway-service-core.md)
- The tenant frontend application

It ensures secure token issuance, validation, refresh, revocation, and redirect handling across multi-tenant environments.

---

# Architecture Overview

```mermaid
flowchart LR
    subgraph Frontend["Tenant Frontend App"]
        Browser["Browser Client"]
    end

    subgraph BFF["Security Core And Oauth Bff"]
        OAuthController["OAuthBffController"]
        PKCE["PKCEUtils"]
        JwtConfigNode["JwtConfig"]
        JwtSecurity["JwtSecurityConfig"]
        RedirectResolver["DefaultRedirectTargetResolver"]
    end

    subgraph AuthServer["Authorization Server Core"]
        AuthEndpoints["OAuth2 Authorization Endpoints"]
        TokenEndpoint["Token Endpoint"]
    end

    Browser -->|"/oauth/login"| OAuthController
    OAuthController -->|"PKCE + state"| PKCE
    OAuthController -->|"Redirect to authorize"| AuthEndpoints
    AuthEndpoints -->|"Authorization Code"| OAuthController
    OAuthController -->|"Token Exchange"| TokenEndpoint
    OAuthController -->|"Issue Cookies"| Browser

    JwtSecurity --> JwtConfigNode
```

---

# Core Responsibilities

## 1. JWT Infrastructure

Provides centralized RSA-based JWT encoding and decoding used by multiple services.

### Components

- `JwtSecurityConfig`
- `JwtConfig`

### Responsibilities

- Load RSA public/private keys from configuration
- Configure `JwtEncoder` using Nimbus JWK infrastructure
- Configure `JwtDecoder` using public key validation
- Centralize issuer and audience configuration

### JWT Bean Configuration Flow

```mermaid
flowchart TD
    ConfigProps["Application Properties"] --> JwtConfigNode["JwtConfig"]
    JwtConfigNode -->|"loadPublicKey()"| PublicKey["RSAPublicKey"]
    JwtConfigNode -->|"loadPrivateKey()"| PrivateKey["RSAPrivateKey"]

    PublicKey --> JwtEncoderNode["NimbusJwtEncoder"]
    PrivateKey --> JwtEncoderNode
    PublicKey --> JwtDecoderNode["NimbusJwtDecoder"]
```

This design ensures:

- 🔐 Strong asymmetric signing (RSA)
- 🔎 Public-key based validation
- 🧩 Reusability across services
- 🔁 Consistent token verification strategy

---

## 2. PKCE and OAuth Security Utilities

### PKCEUtils

Implements RFC 7636 (Proof Key for Code Exchange) utilities.

Functions:

- `generateState()` – 128-bit CSRF protection token
- `generateCodeVerifier()` – 256-bit PKCE verifier
- `generateCodeChallenge()` – SHA-256 challenge
- URL-safe Base64 encoding

### PKCE Flow

```mermaid
sequenceDiagram
    participant Browser
    participant BFF as "OAuthBffController"
    participant Auth as "Authorization Server"

    Browser->>BFF: GET /oauth/login
    BFF->>BFF: generateState()
    BFF->>BFF: generateCodeVerifier()
    BFF->>BFF: generateCodeChallenge()
    BFF->>Auth: Redirect with challenge
    Auth->>Browser: Login
    Auth->>BFF: Callback with code
    BFF->>Auth: Exchange code + verifier
```

Security guarantees:

- ✅ Prevents authorization code interception
- ✅ Mitigates CSRF
- ✅ Fully OAuth 2.1 aligned

---

## 3. OAuth Backend For Frontend (BFF)

The **OAuthBffController** provides a secure browser-facing authentication layer.

Instead of exposing access tokens to JavaScript, tokens are:

- Stored in HttpOnly cookies
- Refreshed via backend endpoint
- Revoked via server-side logic

### Endpoints

| Endpoint | Purpose |
|-----------|----------|
| `/oauth/login` | Initiates PKCE + state + redirect |
| `/oauth/continue` | Contination flow after SSO |
| `/oauth/callback` | Handles authorization code exchange |
| `/oauth/refresh` | Refresh access token |
| `/oauth/logout` | Revoke refresh token + clear cookies |
| `/oauth/dev-exchange` | Dev-only token header exchange |

---

## Login Flow

```mermaid
flowchart TD
    A["User Click Login"] --> B["/oauth/login"]
    B --> C["Generate State + PKCE"]
    C --> D["Set OAuth State Cookie"]
    D --> E["Redirect to Authorization Server"]
```

### Key Features

- Clears stale session cookies
- Builds signed state JWT
- Stores state in secure cookie
- Redirects to tenant-aware authorization endpoint

---

## Callback Flow

```mermaid
flowchart TD
    Code["Authorization Code"] --> Callback["/oauth/callback"]
    Callback --> ValidateState["Validate State Cookie"]
    ValidateState --> Exchange["Exchange Code for Tokens"]
    Exchange --> SetCookies["Set Access + Refresh Cookies"]
    SetCookies --> RedirectUser["Redirect to Target"]
```

Error handling includes:

- Automatic redirect fallback
- URL-safe error messaging
- State cleanup

---

## Token Refresh Strategy

The refresh endpoint:

- Accepts refresh token from cookie or header
- Supports tenant-aware refresh
- Sets updated cookies on success
- Returns `401` if invalid

This design allows:

- Silent background refresh
- Token rotation
- Reduced exposure of tokens to frontend JavaScript

---

## Logout Strategy

- Clears authentication cookies
- Revokes refresh token server-side
- Supports tenant lookup if tenantId omitted

This prevents token reuse and session fixation.

---

## 4. Redirect Resolution

### DefaultRedirectTargetResolver

Resolves safe redirect targets by evaluating:

1. Explicit `redirectTo` parameter
2. HTTP `Referer` header
3. Fallback to `/`

This prevents:

- Broken redirect flows
- Missing post-login navigation
- Unsafe null redirects

The resolver is replaceable via Spring conditional bean override.

---

# Security Design Principles

## 1. Backend-Only Token Handling

Access and refresh tokens are never exposed to:

- Local storage
- Session storage
- Frontend JavaScript

They are stored via secure cookies handled by `CookieService`.

---

## 2. Multi-Tenant Awareness

The module integrates with:

- Tenant-specific issuer resolution
- Dynamic OAuth client lookup
- Tenant-based refresh flows

This enables secure isolation across OpenFrame tenants.

---

## 3. RSA-Based Token Integrity

All JWT operations use:

- RSA private key for signing
- RSA public key for validation

Ensuring:

- No shared symmetric secrets
- Strong verification boundaries
- Scalable distributed validation

---

## 4. Dev Ticket Mode

When enabled:

- Temporary dev tickets can expose tokens via headers
- Intended only for development environments
- Disabled in production deployments

This feature accelerates integration testing without weakening production security.

---

# Configuration Properties

Example configuration structure:

```yaml
jwt:
  issuer: https://auth.openframe.local
  audience: openframe-api
  public-key:
    value: "-----BEGIN PUBLIC KEY-----..."
  private-key:
    value: "-----BEGIN PRIVATE KEY-----..."

openframe:
  gateway:
    oauth:
      enable: true
      state-cookie-ttl-seconds: 180
      dev-ticket-enabled: false
```

---

# Integration Points

| Module | Role |
|--------|------|
| Authorization Server Core | Issues authorization codes and tokens |
| Gateway Service Core | Protects API endpoints using JWT validation |
| API Service Core | Consumes validated JWT claims |
| Tenant Frontend App | Initiates OAuth login via BFF |

---

# Summary

The **Security Core And Oauth Bff** module is the cornerstone of OpenFrame's authentication architecture.

It provides:

- 🔐 RSA-based JWT infrastructure
- 🔁 Secure token refresh and revocation
- 🧠 PKCE-compliant OAuth flows
- 🌐 Safe redirect orchestration
- 🧩 Multi-tenant support
- 🧪 Development flexibility with dev tickets

By combining cryptographic correctness, OAuth best practices, and BFF architecture patterns, this module ensures secure, scalable, and frontend-safe authentication across the OpenFrame ecosystem.
