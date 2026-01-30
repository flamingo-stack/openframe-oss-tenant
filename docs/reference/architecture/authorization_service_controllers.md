# Authorization Service Controllers

## Overview

The **Authorization Service Controllers** module provides the HTTP endpoint layer for OpenFrame's OAuth 2.0 authorization server, handling user authentication, tenant registration, invitation-based user onboarding, and password management workflows. This module implements RESTful controllers that orchestrate multi-tenant authentication flows, SSO integration, and secure user lifecycle management.

**Key Responsibilities:**
- User login and authentication UI endpoints
- Multi-tenant registration (standard and SSO-based)
- Invitation-based user registration with SSO support
- Password reset request and confirmation workflows
- OAuth 2.0 authorization flow integration
- Secure cookie-based state management for SSO flows

**Related Modules:**
- [Authorization Service Configuration](authorization_service_configuration.md) - Security and OAuth 2.0 server configuration
- [Authorization Service Services](authorization_service_services.md) - Business logic for authentication and authorization
- [Authorization Service](authorization_service.md) - Parent module overview

---

## Architecture

### Component Overview

```mermaid
flowchart TD
    Client["Client Application"] -->|"HTTP Requests"| Controllers["Controller Layer"]
    
    subgraph Controllers["Authorization Controllers"]
        LoginCtrl["LoginController"]
        TenantRegCtrl["TenantRegistrationController"]
        InviteCtrl["InvitationRegistrationController"]
        PwdResetCtrl["PasswordResetController"]
    end
    
    subgraph Services["Service Layer"]
        TenantRegSvc["TenantRegistrationService"]
        SsoTenantSvc["SsoTenantRegistrationService"]
        InviteRegSvc["InvitationRegistrationService"]
        SsoInviteSvc["SsoInvitationService"]
        PwdResetSvc["PasswordResetService"]
    end
    
    subgraph Security["Security Components"]
        AuthState["AuthStateUtils"]
        Redirects["Redirects"]
        SsoConstants["SsoRegistrationConstants"]
    end
    
    LoginCtrl -->|"Render Views"| Views["Thymeleaf Templates"]
    TenantRegCtrl -->|"Register Tenant"| TenantRegSvc
    TenantRegCtrl -->|"SSO Registration"| SsoTenantSvc
    TenantRegCtrl -->|"State Management"| AuthState
    TenantRegCtrl -->|"Redirect"| Redirects
    
    InviteCtrl -->|"Accept Invitation"| InviteRegSvc
    InviteCtrl -->|"SSO Accept"| SsoInviteSvc
    InviteCtrl -->|"State Management"| AuthState
    
    PwdResetCtrl -->|"Reset Password"| PwdResetSvc
    
    Services -->|"Persist Data"| DataLayer["Data Layer (MongoDB)"]
    Services -->|"OAuth 2.0 Flow"| OAuth["Spring Authorization Server"]
    
    SsoTenantSvc -->|"Set Cookie"| Cookies["HTTP Cookies"]
    SsoInviteSvc -->|"Set Cookie"| Cookies
```

### Controller Responsibilities

```mermaid
flowchart LR
    subgraph LoginController["LoginController"]
        L1["GET /login"]
        L2["GET /"]
        L1 -->|"Render"| LoginPage["login.html"]
        L2 -->|"Render"| IndexPage["index.html"]
    end
    
    subgraph TenantRegistrationController["TenantRegistrationController"]
        T1["POST /oauth/register"]
        T2["GET /oauth/register/sso"]
        T1 -->|"JSON"| TenantData["Tenant Object"]
        T2 -->|"Redirect"| SsoProvider["SSO Provider"]
    end
    
    subgraph InvitationRegistrationController["InvitationRegistrationController"]
        I1["POST /invitations/accept"]
        I2["GET /invitations/accept/sso"]
        I1 -->|"JSON"| UserData["AuthUser Object"]
        I2 -->|"Redirect"| SsoProvider
    end
    
    subgraph PasswordResetController["PasswordResetController"]
        P1["POST /password-reset/request"]
        P2["POST /password-reset/confirm"]
        P1 -->|"202 ACCEPTED"| EmailSent["Reset Email Sent"]
        P2 -->|"204 NO_CONTENT"| PwdUpdated["Password Updated"]
    end
```

---

## Core Components

### 1. LoginController

**Purpose:** Provides UI endpoints for user authentication and application entry point.

**Endpoints:**

| Method | Path | Description | Response |
|--------|------|-------------|----------|
| `GET` | `/login` | Login page with error/logout messages | HTML view |
| `GET` | `/` | Application index/welcome page | HTML view |

**Key Features:**
- Error message display for failed authentication
- Logout confirmation messages
- Integration with Spring Security authentication flow
- Thymeleaf template rendering

**Request Flow:**

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant LoginController
    participant SpringSecurity
    participant Template
    
    User->>Browser: Navigate to /login
    Browser->>LoginController: GET /login
    LoginController->>LoginController: Check error/logout params
    
    alt Has error parameter
        LoginController->>Template: Add errorMessage
    end
    
    alt Has logout parameter
        LoginController->>Template: Add logoutMessage
    end
    
    LoginController->>Template: Render login.html
    Template-->>Browser: HTML Response
    Browser-->>User: Display Login Form
    
    User->>Browser: Submit Credentials
    Browser->>SpringSecurity: POST /login
    SpringSecurity->>SpringSecurity: Authenticate
    
    alt Authentication Failed
        SpringSecurity-->>Browser: Redirect to /login?error
    else Authentication Success
        SpringSecurity-->>Browser: Redirect to Application
    end
```

**Code Example:**

```java
@Controller
public class LoginController {

    @GetMapping("/login")
    public String login(Model model,
                        @RequestParam(value = "error", required = false) String error,
                        @RequestParam(value = "logout", required = false) String logout) {

        if (error != null) {
            model.addAttribute("errorMessage", "Invalid credentials");
        }

        if (logout != null) {
            model.addAttribute("logoutMessage", "Logged out successfully");
        }

        return "login";
    }

    @GetMapping("/")
    public String index(Model model) {
        model.addAttribute("message", "OpenFrame Multi-Tenant Authorization");
        return "index";
    }
}
```

---

### 2. TenantRegistrationController

**Purpose:** Handles new tenant (organization) registration via standard form submission or SSO integration.

**Endpoints:**

| Method | Path | Description | Request Body | Response |
|--------|------|-------------|--------------|----------|
| `POST` | `/oauth/register` | Register new tenant | `TenantRegistrationRequest` | `Tenant` (JSON) |
| `GET` | `/oauth/register/sso` | Initiate SSO-based registration | Query params | 303 Redirect |

**Key Features:**
- Multi-tenant organization creation
- SSO provider integration (Google, Microsoft, etc.)
- Secure cookie-based state management
- OAuth 2.0 authorization code flow integration
- HMAC-signed cookies for SSO state validation

**Standard Registration Flow:**

```mermaid
sequenceDiagram
    participant Client
    participant Controller as TenantRegistrationController
    participant Service as TenantRegistrationService
    participant DB as MongoDB
    
    Client->>Controller: POST /oauth/register
    Note over Client,Controller: TenantRegistrationRequest JSON
    
    Controller->>Service: registerTenant(request)
    Service->>Service: Validate tenant data
    Service->>Service: Create admin user
    Service->>Service: Generate OAuth client
    Service->>DB: Save Tenant
    Service->>DB: Save AuthUser
    Service->>DB: Save RegisteredClient
    
    DB-->>Service: Confirmation
    Service-->>Controller: Tenant object
    Controller-->>Client: 200 OK + Tenant JSON
```

**SSO Registration Flow:**

```mermaid
sequenceDiagram
    participant Client
    participant Controller as TenantRegistrationController
    participant SsoService as SsoTenantRegistrationService
    participant AuthState as AuthStateUtils
    participant OAuth as Spring OAuth2
    participant Provider as SSO Provider
    
    Client->>Controller: GET /oauth/register/sso?provider=google
    Controller->>AuthState: clearAuthState()
    Note over AuthState: Clear existing session
    
    Controller->>SsoService: startRegistration(request)
    SsoService->>SsoService: Generate HMAC token
    SsoService->>SsoService: Build OAuth authorize URL
    SsoService-->>Controller: SsoAuthorizeData
    
    Controller->>Controller: buildSsoRegistrationCookie()
    Note over Controller: HttpOnly, Secure, TTL=300s
    
    Controller->>Client: 303 See Other + Set-Cookie
    Note over Controller,Client: Location: /oauth2/authorization/{provider}
    
    Client->>OAuth: Follow redirect
    OAuth->>Provider: OAuth authorize request
    Provider-->>Client: Login page
    
    Client->>Provider: Authenticate
    Provider->>OAuth: Authorization code
    OAuth->>OAuth: Exchange code for token
    OAuth->>OAuth: Validate SSO cookie
    OAuth->>SsoService: Complete registration
    SsoService->>SsoService: Create tenant + user
```

**Cookie Security:**

```java
private Cookie buildSsoRegistrationCookie(String value, int ttlSeconds) {
    Cookie cookie = new Cookie(COOKIE_SSO_REG, value);
    cookie.setHttpOnly(true);  // Prevent XSS attacks
    cookie.setSecure(true);    // HTTPS only
    cookie.setPath("/");       // Available to all paths
    cookie.setMaxAge(ttlSeconds); // Short-lived (5 minutes)
    return cookie;
}
```

**Request/Response Examples:**

**Standard Registration:**

```json
// POST /oauth/register
{
  "tenantName": "Acme Corporation",
  "adminEmail": "admin@acme.com",
  "adminPassword": "SecureP@ssw0rd",
  "organizationDomain": "acme.com"
}

// Response: 200 OK
{
  "id": "tenant_123",
  "name": "Acme Corporation",
  "domain": "acme.com",
  "createdAt": "2024-01-15T10:30:00Z",
  "status": "ACTIVE"
}
```

**SSO Registration:**

```text
GET /oauth/register/sso?provider=google&tenantName=Acme%20Corp

Response: 303 See Other
Location: /oauth2/authorization/google
Set-Cookie: SSO_REG=hmac_token_value; HttpOnly; Secure; Max-Age=300; Path=/
```

---

### 3. InvitationRegistrationController

**Purpose:** Handles user registration via email invitation, supporting both password-based and SSO-based onboarding.

**Endpoints:**

| Method | Path | Description | Request Body | Response |
|--------|------|-------------|--------------|----------|
| `POST` | `/invitations/accept` | Accept invitation with password | `InvitationRegistrationRequest` | `AuthUser` (JSON) |
| `GET` | `/invitations/accept/sso` | Accept invitation via SSO | Query params | 303 Redirect |

**Key Features:**
- Token-based invitation validation
- User creation within existing tenant
- SSO provider integration for invited users
- Secure state management with HMAC cookies
- Automatic tenant association

**Standard Invitation Flow:**

```mermaid
sequenceDiagram
    participant User
    participant Email
    participant Controller as InvitationRegistrationController
    participant Service as InvitationRegistrationService
    participant DB as MongoDB
    
    User->>Email: Receive invitation email
    Note over Email: Contains invitation token
    
    User->>Controller: POST /invitations/accept
    Note over User,Controller: {token, password, firstName, lastName}
    
    Controller->>Service: registerByInvitation(request)
    Service->>DB: Find invitation by token
    Service->>Service: Validate token expiry
    Service->>Service: Validate tenant exists
    Service->>Service: Create AuthUser
    Service->>DB: Save AuthUser
    Service->>DB: Mark invitation as used
    
    DB-->>Service: Confirmation
    Service-->>Controller: AuthUser object
    Controller-->>User: 200 OK + AuthUser JSON
```

**SSO Invitation Flow:**

```mermaid
sequenceDiagram
    participant User
    participant Controller as InvitationRegistrationController
    participant SsoService as SsoInvitationService
    participant AuthState as AuthStateUtils
    participant OAuth as Spring OAuth2
    participant Provider as SSO Provider
    
    User->>Controller: GET /invitations/accept/sso?token=xyz&provider=google
    Controller->>AuthState: clearAuthState()
    
    Controller->>SsoService: startAccept(request)
    SsoService->>SsoService: Validate invitation token
    SsoService->>SsoService: Generate HMAC cookie value
    SsoService->>SsoService: Build OAuth authorize URL
    SsoService-->>Controller: SsoAuthorizeData
    
    Controller->>Controller: Create SSO_INVITE cookie
    Note over Controller: HttpOnly, Secure, TTL=300s
    
    Controller->>User: 303 See Other + Set-Cookie
    Note over Controller,User: Location: /oauth2/authorization/{provider}
    
    User->>OAuth: Follow redirect
    OAuth->>Provider: OAuth authorize request
    Provider-->>User: Login page
    
    User->>Provider: Authenticate with SSO
    Provider->>OAuth: Authorization code
    OAuth->>OAuth: Exchange code for token
    OAuth->>OAuth: Validate SSO_INVITE cookie
    OAuth->>SsoService: Complete invitation accept
    SsoService->>SsoService: Create user in tenant
```

**Request/Response Examples:**

**Standard Invitation Accept:**

```json
// POST /invitations/accept
{
  "token": "inv_abc123xyz",
  "password": "SecureP@ssw0rd",
  "firstName": "John",
  "lastName": "Doe"
}

// Response: 200 OK
{
  "id": "user_456",
  "email": "john.doe@acme.com",
  "firstName": "John",
  "lastName": "Doe",
  "tenantId": "tenant_123",
  "roles": ["USER"],
  "createdAt": "2024-01-15T11:00:00Z"
}
```

**SSO Invitation Accept:**

```text
GET /invitations/accept/sso?token=inv_abc123xyz&provider=microsoft

Response: 303 See Other
Location: /oauth2/authorization/microsoft
Set-Cookie: SSO_INVITE=hmac_token_value; HttpOnly; Secure; Max-Age=300; Path=/
```

---

### 4. PasswordResetController

**Purpose:** Manages password reset workflows including token generation and password update confirmation.

**Endpoints:**

| Method | Path | Description | Request Body | Response |
|--------|------|-------------|--------------|----------|
| `POST` | `/password-reset/request` | Request password reset | `ResetRequest` | 202 ACCEPTED |
| `POST` | `/password-reset/confirm` | Confirm password reset | `ResetConfirm` | 204 NO_CONTENT |

**Key Features:**
- Email-based password reset tokens
- Token expiration validation
- Secure password hashing
- Case-insensitive email handling
- Asynchronous email delivery

**Password Reset Flow:**

```mermaid
sequenceDiagram
    participant User
    participant Controller as PasswordResetController
    participant Service as PasswordResetService
    participant DB as MongoDB
    participant Email as Email Service
    
    User->>Controller: POST /password-reset/request
    Note over User,Controller: {email: "user@acme.com"}
    
    Controller->>Service: createResetToken(email)
    Service->>DB: Find user by email
    
    alt User exists
        Service->>Service: Generate reset token
        Service->>Service: Set expiration (1 hour)
        Service->>DB: Save reset token
        Service->>Email: Send reset email
        Note over Email: Contains reset link with token
    else User not found
        Service->>Service: Silent failure (security)
    end
    
    Service-->>Controller: void
    Controller-->>User: 202 ACCEPTED
    Note over User: Always returns 202 (prevent email enumeration)
    
    User->>Email: Receive reset email
    User->>User: Click reset link
    
    User->>Controller: POST /password-reset/confirm
    Note over User,Controller: {token: "reset_xyz", newPassword: "NewP@ss"}
    
    Controller->>Service: resetPassword(token, newPassword)
    Service->>DB: Find token
    Service->>Service: Validate token expiry
    Service->>Service: Hash new password
    Service->>DB: Update user password
    Service->>DB: Invalidate reset token
    
    DB-->>Service: Confirmation
    Service-->>Controller: void
    Controller-->>User: 204 NO_CONTENT
```

**Security Considerations:**

```mermaid
flowchart TD
    Request["Password Reset Request"] --> EmailCheck{User Exists?}
    
    EmailCheck -->|Yes| GenerateToken["Generate Reset Token"]
    EmailCheck -->|No| SilentFail["Silent Failure"]
    
    GenerateToken --> SendEmail["Send Reset Email"]
    SilentFail --> Return202["Return 202 ACCEPTED"]
    SendEmail --> Return202
    
    Return202 --> UserAction["User Receives Email"]
    
    UserAction --> ConfirmRequest["POST /password-reset/confirm"]
    ConfirmRequest --> ValidateToken{Token Valid?}
    
    ValidateToken -->|Yes| CheckExpiry{Token Expired?}
    ValidateToken -->|No| Error401["401 Unauthorized"]
    
    CheckExpiry -->|No| UpdatePassword["Update Password"]
    CheckExpiry -->|Yes| Error401
    
    UpdatePassword --> InvalidateToken["Invalidate Token"]
    InvalidateToken --> Return204["204 NO_CONTENT"]
    
    style SilentFail fill:#ff9999
    style Error401 fill:#ff9999
    style Return204 fill:#99ff99
```

**Request/Response Examples:**

**Request Reset:**

```json
// POST /password-reset/request
{
  "email": "user@acme.com"
}

// Response: 202 ACCEPTED
// (No body - prevents email enumeration)
```

**Confirm Reset:**

```json
// POST /password-reset/confirm
{
  "token": "reset_abc123xyz",
  "newPassword": "NewSecureP@ssw0rd123"
}

// Response: 204 NO_CONTENT
// (No body - password updated successfully)
```

---

## Data Flow

### Complete Registration and Authentication Flow

```mermaid
flowchart TD
    Start["New Organization"] --> RegChoice{Registration Method?}
    
    RegChoice -->|Standard| StdReg["POST /oauth/register"]
    RegChoice -->|SSO| SsoReg["GET /oauth/register/sso"]
    
    StdReg --> CreateTenant["Create Tenant + Admin User"]
    SsoReg --> SsoFlow["OAuth 2.0 Flow"]
    SsoFlow --> CreateTenant
    
    CreateTenant --> TenantActive["Tenant Active"]
    
    TenantActive --> InviteUsers["Admin Invites Users"]
    InviteUsers --> SendInvites["Email Invitations Sent"]
    
    SendInvites --> UserChoice{User Registration?}
    
    UserChoice -->|Standard| StdInvite["POST /invitations/accept"]
    UserChoice -->|SSO| SsoInvite["GET /invitations/accept/sso"]
    
    StdInvite --> CreateUser["Create User in Tenant"]
    SsoInvite --> SsoUserFlow["OAuth 2.0 Flow"]
    SsoUserFlow --> CreateUser
    
    CreateUser --> UserActive["User Active"]
    
    UserActive --> Login["User Logs In"]
    Login --> LoginPage["GET /login"]
    LoginPage --> Authenticate["Spring Security Auth"]
    
    Authenticate --> AuthSuccess{Success?}
    AuthSuccess -->|Yes| AccessApp["Access Application"]
    AuthSuccess -->|No| LoginError["GET /login?error"]
    
    AccessApp --> ForgotPwd{Forgot Password?}
    ForgotPwd -->|Yes| ResetRequest["POST /password-reset/request"]
    ForgotPwd -->|No| UseApp["Use Application"]
    
    ResetRequest --> ResetEmail["Receive Reset Email"]
    ResetEmail --> ResetConfirm["POST /password-reset/confirm"]
    ResetConfirm --> Login
```

### SSO State Management

```mermaid
flowchart LR
    subgraph Client["Client Browser"]
        Cookie["HTTP Cookie"]
    end
    
    subgraph Controller["Controller Layer"]
        StartFlow["Start SSO Flow"]
        SetCookie["Set HMAC Cookie"]
    end
    
    subgraph OAuth["OAuth 2.0 Flow"]
        Authorize["Authorization Request"]
        Callback["Callback Handler"]
    end
    
    subgraph Validation["State Validation"]
        ReadCookie["Read Cookie"]
        VerifyHMAC["Verify HMAC"]
        ValidateExpiry["Check Expiry"]
    end
    
    StartFlow --> SetCookie
    SetCookie --> Cookie
    Cookie --> Authorize
    Authorize --> Provider["SSO Provider"]
    Provider --> Callback
    Callback --> ReadCookie
    ReadCookie --> Cookie
    Cookie --> VerifyHMAC
    VerifyHMAC --> ValidateExpiry
    ValidateExpiry --> Complete["Complete Registration"]
```

---

## Integration Points

### 1. Service Layer Dependencies

```mermaid
flowchart TD
    subgraph Controllers["Controller Layer"]
        LC["LoginController"]
        TRC["TenantRegistrationController"]
        IRC["InvitationRegistrationController"]
        PRC["PasswordResetController"]
    end
    
    subgraph Services["Service Layer"]
        TRS["TenantRegistrationService"]
        STRS["SsoTenantRegistrationService"]
        IRS["InvitationRegistrationService"]
        SIS["SsoInvitationService"]
        PRS["PasswordResetService"]
    end
    
    subgraph Infrastructure["Infrastructure"]
        Email["Email Service"]
        OAuth["OAuth 2.0 Server"]
        DB["MongoDB"]
    end
    
    TRC -->|"Standard Registration"| TRS
    TRC -->|"SSO Registration"| STRS
    IRC -->|"Standard Invitation"| IRS
    IRC -->|"SSO Invitation"| SIS
    PRC -->|"Password Reset"| PRS
    
    TRS --> DB
    STRS --> OAuth
    STRS --> DB
    IRS --> DB
    SIS --> OAuth
    SIS --> DB
    PRS --> DB
    PRS --> Email
```

### 2. Security Integration

```mermaid
flowchart TD
    Request["HTTP Request"] --> SecurityFilter["Spring Security Filter Chain"]
    
    SecurityFilter --> AuthCheck{Requires Auth?}
    
    AuthCheck -->|No| PublicEndpoints["Public Endpoints"]
    AuthCheck -->|Yes| AuthFilter["Authentication Filter"]
    
    PublicEndpoints --> Controllers["Controllers"]
    
    AuthFilter --> ValidateToken{Valid Token?}
    ValidateToken -->|Yes| Controllers
    ValidateToken -->|No| Unauthorized["401 Unauthorized"]
    
    Controllers --> AuthState["AuthStateUtils"]
    Controllers --> Redirects["Redirect Utilities"]
    
    subgraph PublicEndpoints["Public Endpoints"]
        PE1["/login"]
        PE2["/oauth/register"]
        PE3["/invitations/accept"]
        PE4["/password-reset/*"]
    end
```

### 3. OAuth 2.0 Integration

```mermaid
sequenceDiagram
    participant User
    participant Controller
    participant SpringOAuth as Spring Authorization Server
    participant Provider as External SSO Provider
    participant DB as MongoDB
    
    User->>Controller: GET /oauth/register/sso?provider=google
    Controller->>Controller: Generate HMAC state
    Controller->>User: Set-Cookie + Redirect
    
    User->>SpringOAuth: GET /oauth2/authorization/google
    SpringOAuth->>Provider: Authorization Request
    Provider-->>User: Login Page
    
    User->>Provider: Authenticate
    Provider->>SpringOAuth: Authorization Code
    
    SpringOAuth->>Provider: Exchange code for token
    Provider-->>SpringOAuth: Access Token + ID Token
    
    SpringOAuth->>Controller: Callback with user info
    Controller->>Controller: Validate HMAC cookie
    Controller->>DB: Create tenant + user
    DB-->>Controller: Success
    Controller-->>User: Redirect to application
```

---

## API Reference

### LoginController

#### GET /login

**Description:** Display login page with optional error/logout messages.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `error` | Query | No | Indicates authentication failure |
| `logout` | Query | No | Indicates successful logout |

**Response:** HTML view (`login.html`)

**Example:**

```text
GET /login?error
GET /login?logout
```

#### GET /

**Description:** Display application index page.

**Response:** HTML view (`index.html`)

---

### TenantRegistrationController

#### POST /oauth/register

**Description:** Register a new tenant with admin user.

**Request Body:**

```typescript
interface TenantRegistrationRequest {
  tenantName: string;
  adminEmail: string;
  adminPassword: string;
  organizationDomain?: string;
}
```

**Response:** `200 OK`

```typescript
interface Tenant {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
  status: string;
}
```

**Validation:**
- `tenantName`: Required, 3-100 characters
- `adminEmail`: Required, valid email format
- `adminPassword`: Required, minimum 8 characters, complexity rules
- `organizationDomain`: Optional, valid domain format

#### GET /oauth/register/sso

**Description:** Initiate SSO-based tenant registration.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `provider` | Query | Yes | SSO provider (google, microsoft, etc.) |
| `tenantName` | Query | Yes | Organization name |

**Response:** `303 See Other`

**Headers:**
- `Location`: OAuth 2.0 authorization endpoint
- `Set-Cookie`: `SSO_REG` cookie with HMAC state

**Example:**

```text
GET /oauth/register/sso?provider=google&tenantName=Acme%20Corp

Response:
303 See Other
Location: /oauth2/authorization/google
Set-Cookie: SSO_REG=hmac_value; HttpOnly; Secure; Max-Age=300; Path=/
```

---

### InvitationRegistrationController

#### POST /invitations/accept

**Description:** Accept invitation and create user account.

**Request Body:**

```typescript
interface InvitationRegistrationRequest {
  token: string;
  password: string;
  firstName: string;
  lastName: string;
}
```

**Response:** `200 OK`

```typescript
interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  roles: string[];
  createdAt: string;
}
```

**Validation:**
- `token`: Required, valid invitation token
- `password`: Required, minimum 8 characters
- `firstName`: Required, 1-50 characters
- `lastName`: Required, 1-50 characters

**Error Responses:**
- `400 Bad Request`: Invalid token or validation failure
- `404 Not Found`: Invitation not found or expired
- `409 Conflict`: User already exists

#### GET /invitations/accept/sso

**Description:** Accept invitation via SSO provider.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `token` | Query | Yes | Invitation token |
| `provider` | Query | Yes | SSO provider |

**Response:** `303 See Other`

**Headers:**
- `Location`: OAuth 2.0 authorization endpoint
- `Set-Cookie`: `SSO_INVITE` cookie with HMAC state

---

### PasswordResetController

#### POST /password-reset/request

**Description:** Request password reset token via email.

**Request Body:**

```typescript
interface ResetRequest {
  email: string;
}
```

**Response:** `202 ACCEPTED`

**Note:** Always returns 202 to prevent email enumeration attacks.

**Example:**

```json
POST /password-reset/request
{
  "email": "user@example.com"
}

Response: 202 ACCEPTED
```

#### POST /password-reset/confirm

**Description:** Confirm password reset with token.

**Request Body:**

```typescript
interface ResetConfirm {
  token: string;
  newPassword: string;
}
```

**Response:** `204 NO_CONTENT`

**Validation:**
- `token`: Required, valid reset token
- `newPassword`: Required, minimum 8 characters, complexity rules

**Error Responses:**
- `400 Bad Request`: Invalid token or password validation failure
- `401 Unauthorized`: Token expired or invalid
- `404 Not Found`: Token not found

---

## Security Considerations

### 1. Cookie Security

**HMAC-Signed Cookies:**

```mermaid
flowchart LR
    Data["State Data"] --> HMAC["HMAC-SHA256"]
    Secret["Secret Key"] --> HMAC
    HMAC --> Token["Signed Token"]
    Token --> Cookie["HTTP Cookie"]
    
    Cookie --> Attributes["Cookie Attributes"]
    
    subgraph Attributes["Security Attributes"]
        A1["HttpOnly: true"]
        A2["Secure: true"]
        A3["SameSite: Lax"]
        A4["Max-Age: 300s"]
    end
```

**Cookie Attributes:**
- `HttpOnly`: Prevents JavaScript access (XSS protection)
- `Secure`: HTTPS-only transmission
- `SameSite`: CSRF protection
- `Max-Age`: Short-lived (5 minutes for SSO flows)

### 2. Password Security

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character

**Password Storage:**
- BCrypt hashing with salt
- Cost factor: 12 (configurable)
- Never stored in plain text

### 3. Token Security

**Reset Token Generation:**

```mermaid
flowchart TD
    Generate["Generate Random Token"] --> Hash["SHA-256 Hash"]
    Hash --> Store["Store Hash in DB"]
    Store --> Email["Send Token via Email"]
    
    Email --> UserClick["User Clicks Link"]
    UserClick --> Validate["Validate Token"]
    
    Validate --> CheckExpiry{Expired?}
    CheckExpiry -->|No| CheckUsed{Already Used?}
    CheckExpiry -->|Yes| Reject["Reject Request"]
    
    CheckUsed -->|No| UpdatePassword["Update Password"]
    CheckUsed -->|Yes| Reject
    
    UpdatePassword --> InvalidateToken["Invalidate Token"]
```

**Token Properties:**
- Cryptographically random (256 bits)
- One-time use only
- Expiration: 1 hour
- Stored as hash in database

### 4. CSRF Protection

**State Parameter Validation:**

```mermaid
flowchart TD
    Request["OAuth Request"] --> GenerateState["Generate State"]
    GenerateState --> HMAC["HMAC Sign"]
    HMAC --> Cookie["Store in Cookie"]
    Cookie --> Redirect["Redirect to Provider"]
    
    Redirect --> Callback["OAuth Callback"]
    Callback --> ReadCookie["Read Cookie"]
    ReadCookie --> VerifyHMAC["Verify HMAC"]
    
    VerifyHMAC --> Match{State Matches?}
    Match -->|Yes| Process["Process Callback"]
    Match -->|No| Reject["Reject Request"]
```

### 5. Rate Limiting

**Recommended Limits:**

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| `/password-reset/request` | 3 requests | 1 hour | Prevent email spam |
| `/password-reset/confirm` | 5 attempts | 15 minutes | Prevent brute force |
| `/oauth/register` | 10 requests | 1 hour | Prevent abuse |
| `/invitations/accept` | 5 attempts | 15 minutes | Prevent brute force |

---

## Error Handling

### Standard Error Responses

```typescript
interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}
```

### Common Error Scenarios

```mermaid
flowchart TD
    Request["HTTP Request"] --> Validate{Validation}
    
    Validate -->|Invalid| Error400["400 Bad Request"]
    Validate -->|Valid| Authorize{Authorization}
    
    Authorize -->|Unauthorized| Error401["401 Unauthorized"]
    Authorize -->|Authorized| Process{Process}
    
    Process -->|Not Found| Error404["404 Not Found"]
    Process -->|Conflict| Error409["409 Conflict"]
    Process -->|Success| Success["2xx Success"]
    
    Error400 --> ErrorResponse["ErrorResponse JSON"]
    Error401 --> ErrorResponse
    Error404 --> ErrorResponse
    Error409 --> ErrorResponse
```

### Error Examples

**Validation Error:**

```json
POST /oauth/register
{
  "tenantName": "A",
  "adminEmail": "invalid-email",
  "adminPassword": "weak"
}

Response: 400 Bad Request
{
  "timestamp": "2024-01-15T10:30:00Z",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed: tenantName must be at least 3 characters; adminEmail must be valid; adminPassword must meet complexity requirements",
  "path": "/oauth/register"
}
```

**Token Expired:**

```json
POST /password-reset/confirm
{
  "token": "expired_token",
  "newPassword": "NewP@ssw0rd"
}

Response: 401 Unauthorized
{
  "timestamp": "2024-01-15T10:30:00Z",
  "status": 401,
  "error": "Unauthorized",
  "message": "Reset token has expired",
  "path": "/password-reset/confirm"
}
```

---

## Configuration

### Application Properties

```yaml
# Server Configuration
server:
  port: 9000
  servlet:
    session:
      cookie:
        http-only: true
        secure: true
        same-site: lax

# Security Configuration
openframe:
  security:
    password:
      min-length: 8
      require-uppercase: true
      require-lowercase: true
      require-digit: true
      require-special: true
    
    reset-token:
      expiration-hours: 1
      length: 32
    
    sso:
      cookie-ttl-seconds: 300
      hmac-secret: ${SSO_HMAC_SECRET}
    
    rate-limit:
      password-reset-request:
        max-attempts: 3
        window-hours: 1
      password-reset-confirm:
        max-attempts: 5
        window-minutes: 15

# Email Configuration
spring:
  mail:
    host: ${SMTP_HOST}
    port: ${SMTP_PORT}
    username: ${SMTP_USERNAME}
    password: ${SMTP_PASSWORD}
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true

# Template Configuration
spring:
  thymeleaf:
    cache: false
    prefix: classpath:/templates/
    suffix: .html
```

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SSO_HMAC_SECRET` | HMAC secret for SSO state | Yes | - |
| `SMTP_HOST` | Email server host | Yes | - |
| `SMTP_PORT` | Email server port | Yes | - |
| `SMTP_USERNAME` | Email username | Yes | - |
| `SMTP_PASSWORD` | Email password | Yes | - |
| `PASSWORD_RESET_URL` | Base URL for reset links | Yes | - |
| `INVITATION_URL` | Base URL for invitation links | Yes | - |

---

## Testing

### Unit Test Examples

**LoginController Test:**

```java
@WebMvcTest(LoginController.class)
class LoginControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void testLoginPageWithError() throws Exception {
        mockMvc.perform(get("/login").param("error", ""))
            .andExpect(status().isOk())
            .andExpect(view().name("login"))
            .andExpect(model().attribute("errorMessage", "Invalid credentials"));
    }

    @Test
    void testLoginPageWithLogout() throws Exception {
        mockMvc.perform(get("/login").param("logout", ""))
            .andExpect(status().isOk())
            .andExpect(view().name("login"))
            .andExpect(model().attribute("logoutMessage", "Logged out successfully"));
    }
}
```

**TenantRegistrationController Test:**

```java
@WebMvcTest(TenantRegistrationController.class)
class TenantRegistrationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TenantRegistrationService registrationService;

    @Test
    void testRegisterTenant() throws Exception {
        TenantRegistrationRequest request = new TenantRegistrationRequest();
        request.setTenantName("Acme Corp");
        request.setAdminEmail("admin@acme.com");
        request.setAdminPassword("SecureP@ss123");

        Tenant tenant = new Tenant();
        tenant.setId("tenant_123");
        tenant.setName("Acme Corp");

        when(registrationService.registerTenant(any())).thenReturn(tenant);

        mockMvc.perform(post("/oauth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value("tenant_123"))
            .andExpect(jsonPath("$.name").value("Acme Corp"));
    }
}
```

### Integration Test Examples

**Password Reset Flow Test:**

```java
@SpringBootTest
@AutoConfigureMockMvc
class PasswordResetIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private PasswordResetService passwordResetService;

    @Test
    void testCompletePasswordResetFlow() throws Exception {
        // Request reset
        mockMvc.perform(post("/password-reset/request")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"user@example.com\"}"))
            .andExpect(status().isAccepted());

        // Simulate token retrieval (in real scenario, from email)
        String token = passwordResetService.getLatestTokenForEmail("user@example.com");

        // Confirm reset
        mockMvc.perform(post("/password-reset/confirm")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"token\":\"" + token + "\",\"newPassword\":\"NewP@ss123\"}"))
            .andExpect(status().isNoContent());
    }
}
```

---

## Monitoring and Observability

### Metrics

**Key Metrics to Track:**

```mermaid
flowchart TD
    subgraph Metrics["Controller Metrics"]
        M1["Request Count"]
        M2["Response Time"]
        M3["Error Rate"]
        M4["Success Rate"]
    end
    
    subgraph Business["Business Metrics"]
        B1["Tenant Registrations"]
        B2["User Invitations Accepted"]
        B3["Password Resets Requested"]
        B4["SSO vs Standard Auth"]
    end
    
    subgraph Security["Security Metrics"]
        S1["Failed Login Attempts"]
        S2["Invalid Token Attempts"]
        S3["Rate Limit Violations"]
        S4["CSRF Rejections"]
    end
```

**Prometheus Metrics:**

```yaml
# Request metrics
http_server_requests_seconds_count{uri="/oauth/register",method="POST",status="200"}
http_server_requests_seconds_sum{uri="/oauth/register",method="POST",status="200"}

# Business metrics
tenant_registrations_total{method="standard"}
tenant_registrations_total{method="sso"}
invitation_acceptances_total{method="standard"}
invitation_acceptances_total{method="sso"}
password_resets_total{status="requested"}
password_resets_total{status="confirmed"}

# Security metrics
authentication_failures_total{endpoint="/login"}
invalid_token_attempts_total{type="reset"}
rate_limit_violations_total{endpoint="/password-reset/request"}
```

### Logging

**Log Levels:**

```java
// INFO - Successful operations
log.info("Tenant registered successfully: tenantId={}", tenant.getId());
log.info("User accepted invitation: userId={}, tenantId={}", user.getId(), user.getTenantId());

// WARN - Security events
log.warn("Invalid password reset token attempt: email={}", email);
log.warn("Rate limit exceeded for password reset: ip={}", request.getRemoteAddr());

// ERROR - Failures
log.error("Failed to send password reset email: email={}", email, exception);
log.error("SSO registration failed: provider={}, error={}", provider, error);
```

**Structured Logging Example:**

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "INFO",
  "logger": "com.openframe.authz.controller.TenantRegistrationController",
  "message": "Tenant registered successfully",
  "tenantId": "tenant_123",
  "tenantName": "Acme Corp",
  "registrationMethod": "sso",
  "ssoProvider": "google",
  "traceId": "abc123xyz"
}
```

---

## Best Practices

### 1. Controller Design

✅ **DO:**
- Keep controllers thin - delegate to services
- Use DTOs for request/response
- Validate input with `@Valid`
- Return appropriate HTTP status codes
- Use `@ResponseStatus` for clarity

❌ **DON'T:**
- Put business logic in controllers
- Return domain entities directly
- Ignore validation
- Use generic 200 OK for everything

### 2. Security

✅ **DO:**
- Always use HTTPS in production
- Set secure cookie attributes
- Validate all input
- Use HMAC for state management
- Implement rate limiting

❌ **DON'T:**
- Store sensitive data in cookies
- Trust client-side validation
- Expose internal error details
- Allow unlimited requests

### 3. Error Handling

✅ **DO:**
- Return consistent error format
- Log errors with context
- Use appropriate status codes
- Provide helpful error messages

❌ **DON'T:**
- Expose stack traces to clients
- Return generic "error" messages
- Ignore validation errors
- Log sensitive data

### 4. API Design

✅ **DO:**
- Use RESTful conventions
- Version your APIs
- Document all endpoints
- Provide examples

❌ **DON'T:**
- Mix REST and RPC styles
- Break backward compatibility
- Leave endpoints undocumented
- Use inconsistent naming

---

## Troubleshooting

### Common Issues

#### 1. SSO Registration Fails

**Symptoms:**
- Redirect to SSO provider fails
- "Invalid state" error after callback

**Diagnosis:**

```bash
# Check cookie is set
curl -v https://auth.openframe.ai/oauth/register/sso?provider=google

# Verify HMAC secret is configured
echo $SSO_HMAC_SECRET

# Check OAuth client configuration
kubectl get secret oauth-clients -o yaml
```

**Solutions:**
- Verify `SSO_HMAC_SECRET` is set and consistent
- Check cookie domain matches application domain
- Ensure HTTPS is enabled
- Verify OAuth client credentials

#### 2. Password Reset Email Not Received

**Symptoms:**
- User doesn't receive reset email
- 202 response but no email

**Diagnosis:**

```bash
# Check email service logs
kubectl logs -l app=authorization-service | grep "password-reset"

# Verify SMTP configuration
kubectl get configmap email-config -o yaml

# Test SMTP connectivity
telnet smtp.example.com 587
```

**Solutions:**
- Verify SMTP credentials
- Check email service is running
- Verify email address is valid
- Check spam folder

#### 3. Invitation Token Invalid

**Symptoms:**
- "Invalid token" error when accepting invitation
- Token expired message

**Diagnosis:**

```bash
# Check token in database
mongo openframe --eval 'db.invitations.find({token: "inv_xyz"})'

# Verify token expiration
mongo openframe --eval 'db.invitations.find({token: "inv_xyz"}).forEach(i => print(i.expiresAt))'
```

**Solutions:**
- Verify token hasn't expired
- Check token hasn't been used
- Ensure invitation exists in database
- Regenerate invitation if needed

---

## Related Documentation

- [Authorization Service](authorization_service.md) - Parent module overview
- [Authorization Service Configuration](authorization_service_configuration.md) - Security and OAuth 2.0 configuration
- [Authorization Service Services](authorization_service_services.md) - Business logic layer
- [API Service REST Controllers](api_service_rest_controllers.md) - Similar controller patterns
- [Security Core](security_core.md) - JWT and security utilities

---

## Additional Resources

### Spring Security OAuth 2.0
- [Spring Authorization Server Documentation](https://docs.spring.io/spring-authorization-server/docs/current/reference/html/)
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)

### Multi-Tenancy
- [Multi-Tenant Architecture Patterns](https://docs.microsoft.com/en-us/azure/architecture/guide/multitenant/overview)

### Security Best Practices
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

---

**Questions or Issues?**  
Join our OpenMSP Slack community: https://www.openmsp.ai/  
Slack invite: https://join.slack.com/t/openmsp/shared_invite/zt-36bl7mx0h-3~U2nFH6nqHqoTPXMaHEHA
