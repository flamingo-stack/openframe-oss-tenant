# Controllers

## Overview
Controllers expose REST APIs used by OpenFrame client agents to authenticate, register, and retrieve tool binaries.

---

## AgentAuthController
**Path:** `/oauth/token`

### Responsibilities
- Issues OAuth-compatible access tokens for client agents
- Supports client credentials and refresh token flows

### Key Behavior
- Delegates token issuance to `AgentAuthService`
- Returns structured error responses for invalid credentials

---

## AgentController
**Path:** `/api/agents/register`

### Responsibilities
- Registers new client agents into the platform
- Validates initial registration secrets

### Input
- `X-Initial-Key` header
- `AgentRegistrationRequest` payload

### Output
- `AgentRegistrationResponse` with assigned machine identity

---

## ToolAgentFileController
**Path:** `/tool-agent/{assetId}`

### Responsibilities
- Serves tool agent binaries based on OS type

### Notes
- Current implementation is **temporary** and returns classpath resources
- Intended to be replaced by artifact repository integration
