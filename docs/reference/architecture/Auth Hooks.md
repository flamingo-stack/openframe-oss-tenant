# Auth Hooks Documentation

## Overview
The Auth Hooks module provides functionality for managing authentication state and tenant information within the Flamingo platform. It utilizes various hooks to interact with the authentication API and manage user sessions.

## Core Functionality
- **TenantInfo:** This component manages the tenant information and authentication state, ensuring that users can log in and access their respective tenant data.

## Key Features
- **Persistent State Management:** Utilizes local storage to maintain user authentication state across sessions.
- **OAuth Integration:** Supports OAuth for third-party authentication providers.
- **Error Handling:** Provides user-friendly error messages during authentication failures.

## Usage
Refer to the source code for implementation details:
```typescript
// Example usage of TenantInfo
const { tenantInfo, discoverTenants } = useAuth();
```

## Conclusion
The Auth Hooks module is essential for managing user authentication and tenant information, providing a seamless experience for users.