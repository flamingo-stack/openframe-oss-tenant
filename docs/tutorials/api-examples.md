# API Usage Examples

This guide provides practical examples for using the OpenFrame platform APIs. OpenFrame offers a unified layer for data, APIs, automation, and AI through its distributed microservices architecture.

## Main API Endpoints

OpenFrame provides several key API endpoints through its microservices:

### Core Services
- **API Gateway**: `https://your-openframe-instance/api/v1`
- **GraphQL API**: `https://your-openframe-instance/graphql`
- **Management API**: `https://your-openframe-instance/management/v1`
- **WebSocket Gateway**: `wss://your-openframe-instance/ws`

### Service-Specific Endpoints
- **Stream Processing**: `https://your-openframe-instance/stream/v1`
- **Analytics**: `https://your-openframe-instance/analytics/v1`
- **Events**: `https://your-openframe-instance/events/v1`

## Authentication

OpenFrame uses JWT tokens with OAuth2/OpenID Connect for authentication.

### Obtaining an Access Token

```bash
# Request access token
curl -X POST "https://your-openframe-instance/api/v1/auth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your-username",
    "password": "your-password",
    "grant_type": "password"
  }'
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

### Using Tokens in Requests

```bash
# Include JWT token in Authorization header
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  "https://your-openframe-instance/api/v1/users/profile"
```

### Refreshing Tokens

```bash
curl -X POST "https://your-openframe-instance/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "your-refresh-token"
  }'
```

## Common Use Cases

### 1. User Management

#### Get User Profile
```javascript
// JavaScript/Node.js example
const axios = require('axios');

const getUserProfile = async (token) => {
  try {
    const response = await axios.get(
      'https://your-openframe-instance/api/v1/users/profile',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching user profile:', error.response?.data);
    throw error;
  }
};
```

#### Update User Settings
```javascript
const updateUserSettings = async (token, settings) => {
  try {
    const response = await axios.put(
      'https://your-openframe-instance/api/v1/users/settings',
      settings,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating settings:', error.response?.data);
    throw error;
  }
};

// Usage
await updateUserSettings(token, {
  notifications: true,
  theme: 'dark',
  timezone: 'UTC'
});
```

### 2. GraphQL API Usage

#### Basic GraphQL Query
```javascript
const executeGraphQLQuery = async (token, query, variables = {}) => {
  try {
    const response = await axios.post(
      'https://your-openframe-instance/graphql',
      {
        query,
        variables
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('GraphQL Error:', error.response?.data);
    throw error;
  }
};

// Example: Fetch services with status
const query = `
  query GetServices($limit: Int, $status: String) {
    services(limit: $limit, status: $status) {
      id
      name
      status
      version
      lastUpdated
      metrics {
        cpuUsage
        memoryUsage
        uptime
      }
    }
  }
`;

const result = await executeGraphQLQuery(token, query, {
  limit: 10,
  status: 'active'
});
```

#### GraphQL Mutation Example
```javascript
const createServiceMutation = `
  mutation CreateService($input: ServiceInput!) {
    createService(input: $input) {
      id
      name
      status
      createdAt
    }
  }
`;

const newService = await executeGraphQLQuery(token, createServiceMutation, {
  input: {
    name: 'my-new-service',
    type: 'microservice',
    config: {
      port: 8080,
      environment: 'production'
    }
  }
});
```

### 3. Real-time Data with WebSockets

```javascript
const WebSocket = require('ws');

const connectToWebSocket = (token) => {
  const ws = new WebSocket('wss://your-openframe-instance/ws', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  ws.on('open', () => {
    console.log('Connected to OpenFrame WebSocket');
    
    // Subscribe to service events
    ws.send(JSON.stringify({
      type: 'subscribe',
      channel: 'service-events',
      filters: {
        eventType: ['deployment', 'alert', 'metric_update']
      }
    }));
  });

  ws.on('message', (data) => {
    const event = JSON.parse(data);
    console.log('Received event:', event);
    
    switch (event.type) {
      case 'deployment':
        handleDeploymentEvent(event);
        break;
      case 'alert':
        handleAlert(event);
        break;
      case 'metric_update':
        updateMetrics(event);
        break;
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  return ws;
};
```

### 4. Stream Processing Events

#### Publishing Events
```javascript
const publishEvent = async (token, eventData) => {
  try {
    const response = await axios.post(
      'https://your-openframe-instance/stream/v1/events',
      {
        eventType: 'user_action',
        source: 'web-app',
        timestamp: new Date().toISOString(),
        data: eventData
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error publishing event:', error.response?.data);
    throw error;
  }
};

// Usage
await publishEvent(token, {
  userId: '12345',
  action: 'login',
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...'
});
```

#### Querying Analytics Data
```javascript
const getAnalytics = async (token, query) => {
  try {
    const response = await axios.post(
      'https://your-openframe-instance/analytics/v1/query',
      {
        query: query.sql,
        timeRange: {
          start: query.startTime,
          end: query.endTime
        },
        groupBy: query.groupBy || [],
        filters: query.filters || {}
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Analytics query error:', error.response?.data);
    throw error;
  }
};

// Usage
const analyticsData = await getAnalytics(token, {
  sql: 'SELECT COUNT(*) as event_count FROM events WHERE eventType = ?',
  startTime: '2024-01-01T00:00:00Z',
  endTime: '2024-01-31T23:59:59Z',
  filters: {
    eventType: 'user_login'
  }
});
```

## Error Handling Patterns

### Standard Error Response Format

OpenFrame APIs return consistent error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "email",
        "message": "Email format is invalid"
      }
    ],
    "timestamp": "2024-01-15T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### Comprehensive Error Handling

```javascript
class OpenFrameAPIClient {
  constructor(baseURL, token) {
    this.baseURL = baseURL;
    this.token = token;
    this.axios = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    this.axios.interceptors.response.use(
      response => response,
      error => {
        const errorInfo = this.handleError(error);
        return Promise.reject(errorInfo);
      }
    );
  }

  handleError(error) {
    if (!error.response) {
      // Network error
      return {
        type: 'NETWORK_ERROR',
        message: 'Network connection failed',
        originalError: error
      };
    }

    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 400:
        return {
          type: 'VALIDATION_ERROR',
          message: data.error?.message || 'Bad request',
          details: data.error?.details || [],
          code: data.error?.code
        };
      
      case 401:
        return {
          type: 'AUTHENTICATION_ERROR',
          message: 'Authentication required',
          shouldRefreshToken: true
        };
      
      case 403:
        return {
          type: 'AUTHORIZATION_ERROR',
          message: 'Insufficient permissions',
          requiredPermissions: data.error?.requiredPermissions
        };
      
      case 404:
        return {
          type: 'NOT_FOUND',
          message: data.error?.message || 'Resource not found'
        };
      
      case 429:
        return {
          type: 'RATE_LIMIT_ERROR',
          message: 'Rate limit exceeded',
          retryAfter: error.response.headers['retry-after']
        };
      
      case 500:
        return {
          type: 'SERVER_ERROR',
          message: 'Internal server error',
          requestId: data.error?.requestId
        };
      
      default:
        return {
          type: 'UNKNOWN_ERROR',
          message: data.error?.message || 'Unknown error occurred',
          status
        };
    }
  }

  async makeRequest(method, endpoint, data = null) {
    try {
      const response = await this.axios({
        method,
        url: endpoint,
        data
      });
      return response.data;
    } catch (error) {
      // Handle token refresh for 401 errors
      if (error.type === 'AUTHENTICATION_ERROR' && error.shouldRefreshToken) {
        await this.refreshToken();
        // Retry the request
        return this.makeRequest(method, endpoint, data);
      }
      throw error;
    }
  }

  async refreshToken() {
    // Implementation for token refresh
    // Update this.token and axios headers
  }
}
```

### Retry Logic with Exponential Backoff

```javascript
class RetryableRequest {
  static async withRetry(requestFn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        // Don't retry on client errors (4xx) except 429
        if (error.type && !this.isRetryableError(error)) {
          throw error;
        }
        
        if (attempt < maxRetries) {
          const delay = this.calculateDelay(attempt, baseDelay, error);
          console.log(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1})`);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }
  
  static isRetryableError(error) {
    const retryableTypes = [
      'NETWORK_ERROR',
      'SERVER_ERROR',
      'RATE_LIMIT_ERROR'
    ];
    return retryableTypes.includes(error.type);
  }
  
  static calculateDelay(attempt, baseDelay, error) {
    // Use Retry-After header for rate limit errors
    if (error.type === 'RATE_LIMIT_ERROR' && error.retryAfter) {
      return parseInt(error.retryAfter) * 1000;
    }
    
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return exponentialDelay + jitter;
  }
  
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage
const client = new OpenFrameAPIClient('https://your-openframe-instance', token);

const result = await RetryableRequest.withRetry(
  () => client.makeRequest('GET', '/api/v1/services'),
  3, // max retries
  1000 // base delay in ms
);
```

## Best Practices

### 1. Authentication Management

```javascript
class TokenManager {
  constructor() {
    this.token = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  async ensureValidToken() {
    if (!this.token || this.isTokenExpired()) {
      await this.refreshAccessToken();
    }
    return this.token;
  }

  isTokenExpired() {
    if (!this.tokenExpiry) return true;
    return Date.now() >= this.tokenExpiry - 60000; // Refresh 1 min before expiry
  }

  async refreshAccessToken() {
    // Implementation for token refresh
  }
}
```

### 2. Rate Limiting Compliance

```javascript
class RateLimitedClient {
  constructor(baseURL, token) {
    this.client = new OpenFrameAPIClient(baseURL, token);
    this.requestQueue = [];
    this.isProcessing = false;
    this.rateLimitInfo = {
      remaining: 1000,
      resetTime: Date.now() + 3600000 // 1 hour
    };
  }

  async makeRequest(method, endpoint, data) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ method, endpoint, data, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      if (