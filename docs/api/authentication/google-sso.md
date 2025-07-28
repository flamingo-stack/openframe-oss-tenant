# Google SSO Authorization Flow with PKCE

This document describes the login flow using Google OAuth2 with PKCE (Proof Key for Code Exchange), suitable for frontend applications (SPA) and a secure backend exchange.

---

## 🔐 Why PKCE?

PKCE enhances OAuth2 security by eliminating the need to expose `client_secret` in frontend apps. It ensures that only the client who initiated the login request can exchange the authorization code for tokens.

---

## 🧭 Login Flow Diagram

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend (SPA)
    participant Google as Google OAuth2
    participant BE as Backend API

    User->>FE: Clicks "Login with Google"
    FE->>FE: Generate code_verifier and code_challenge
    FE->>Google: Redirect to /oauth2/v2/auth with code_challenge and state

    User->>Google: Logs in and consents
    Google-->>FE: Redirect to redirect_uri with code and state

    FE->>FE: Read code from URL and code_verifier from localStorage
    FE->>BE: POST /api/oauth2/google with { code, code_verifier }

    BE->>Google: Exchange code for tokens (POST /token)
    Google-->>BE: Returns access_token and id_token

    BE->>BE: Create or update user, issue JWT/session
    BE-->>FE: Return JWT / session

    FE->>FE: Save token and redirect to /dashboard