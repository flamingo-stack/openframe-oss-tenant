# API Endpoints

This document provides a comprehensive reference for all OpenFrame API endpoints.

## Base URL

```
https://api.openframe.io/v1
```

## Common Headers

```http
Authorization: Bearer <token>
Content-Type: application/json
Accept: application/json
```

## Response Format

```json
{
  "data": {},
  "meta": {
    "page": 1,
    "per_page": 10,
    "total": 100
  },
  "errors": []
}
```

## Endpoints

### Authentication

#### Login
```http
POST /auth/login
```

Request:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "data": {
    "token": "jwt_token",
    "refresh_token": "refresh_token",
    "expires_in": 3600
  }
}
```

#### Refresh Token
```http
POST /auth/refresh
```

Request:
```json
{
  "refresh_token": "refresh_token"
}
```

### Devices

#### List Devices
```http
GET /devices
```

Query Parameters:
- `page`: Page number (default: 1)
- `per_page`: Items per page (default: 10)
- `status`: Filter by status
- `type`: Filter by device type

Response:
```json
{
  "data": [
    {
      "id": "device_id",
      "name": "Device Name",
      "type": "workstation",
      "status": "online",
      "last_seen": "2024-03-20T10:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 10,
    "total": 100
  }
}
```

#### Get Device
```http
GET /devices/{device_id}
```

Response:
```json
{
  "data": {
    "id": "device_id",
    "name": "Device Name",
    "type": "workstation",
    "status": "online",
    "details": {
      "os": "Windows 10",
      "ip": "192.168.1.100",
      "last_seen": "2024-03-20T10:00:00Z"
    }
  }
}
```

### Alerts

#### List Alerts
```http
GET /alerts
```

Query Parameters:
- `severity`: Filter by severity (critical, high, medium, low)
- `status`: Filter by status (open, closed, acknowledged)
- `start_date`: Filter by start date
- `end_date`: Filter by end date

Response:
```json
{
  "data": [
    {
      "id": "alert_id",
      "title": "Alert Title",
      "severity": "high",
      "status": "open",
      "created_at": "2024-03-20T10:00:00Z",
      "device_id": "device_id"
    }
  ],
  "meta": {
    "page": 1,
    "per_page": 10,
    "total": 100
  }
}
```

### Reports

#### Generate Report
```http
POST /reports
```

Request:
```json
{
  "type": "security",
  "format": "pdf",
  "parameters": {
    "start_date": "2024-03-01",
    "end_date": "2024-03-20",
    "include_devices": true
  }
}
```

Response:
```json
{
  "data": {
    "report_id": "report_id",
    "status": "processing",
    "download_url": "https://api.openframe.io/v1/reports/report_id/download"
  }
}
```

### Settings

#### Get Settings
```http
GET /settings
```

Response:
```json
{
  "data": {
    "notifications": {
      "email": true,
      "slack": false
    },
    "security": {
      "mfa_enabled": true,
      "session_timeout": 3600
    }
  }
}
```

#### Update Settings
```http
PUT /settings
```

Request:
```json
{
  "notifications": {
    "email": true,
    "slack": true
  },
  "security": {
    "mfa_enabled": true,
    "session_timeout": 7200
  }
}
```

## Error Responses

### 400 Bad Request
```json
{
  "errors": [
    {
      "code": "INVALID_PARAMETER",
      "message": "Invalid parameter value",
      "field": "email"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "errors": [
    {
      "code": "INVALID_TOKEN",
      "message": "Invalid or expired token"
    }
  ]
}
```

### 403 Forbidden
```json
{
  "errors": [
    {
      "code": "INSUFFICIENT_PERMISSIONS",
      "message": "User does not have required permissions"
    }
  ]
}
```

### 404 Not Found
```json
{
  "errors": [
    {
      "code": "RESOURCE_NOT_FOUND",
      "message": "Requested resource not found"
    }
  ]
}
```

## Rate Limiting

Rate limits are applied per endpoint:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1616239022
```

## Next Steps

- [WebSocket](websocket.md) - Real-time API documentation
- [Integration](integration.md) - Integration patterns and examples 