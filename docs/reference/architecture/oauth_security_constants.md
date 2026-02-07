# OAuth Security Constants

This document describes shared OAuth2-related constants defined in the **security_shared_core** module.

---

## Component

### SecurityConstants

**Component ID**
- `deps.openframe-oss-lib.openframe-security-core.src.main.java.com.openframe.security.oauth.SecurityConstants.SecurityConstants`

**Responsibility**

- Centralizes string constants used across OAuth2 and token-based security flows
- Prevents duplication and naming inconsistencies between services

---

## Defined Constants

```text
AUTHORIZATION_QUERY_PARAM = authorization
ACCESS_TOKEN              = access_token
REFRESH_TOKEN             = refresh_token
ACCESS_TOKEN_HEADER       = Access-Token
REFRESH_TOKEN_HEADER      = Refresh-Token
```

---

## Usage Context

These constants are commonly referenced by:

- OAuth2 authorization endpoints
- Gateway authentication filters
- API services extracting tokens from headers
- BFF layers handling browser-based authentication

Using a shared constants class ensures **protocol compatibility and consistency** across the platform.
