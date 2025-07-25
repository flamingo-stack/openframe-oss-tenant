# Auth Server Routing Strategy

## 🛣️ Traffic Routing Decision Matrix

| Use Case | Route | Reason | Example |
|----------|-------|---------|---------|
| **OAuth2 Authorization** | DIRECT | Browser redirects required | `/oauth2/authorize` |
| **Token Exchange** | DIRECT | PKCE flow integrity | `/oauth2/token` |
| **JWKS Public Keys** | DIRECT | Resource servers need direct access | `/oauth2/jwks` |
| **OpenID Discovery** | DIRECT | Standard requires direct endpoint | `/.well-known/openid-configuration` |
| **User Management** | GATEWAY | Business logic, auth required | `/api/auth/users` |
| **Role Management** | GATEWAY | Admin operations | `/api/auth/roles` |
| **Audit Logs** | GATEWAY | Monitoring, rate limiting | `/api/auth/audit` |

## 🏗️ Dual Port Configuration

### Auth Server Configuration
```yaml
# openframe-auth-server/application.yml
server:
  port: 8090  # OAuth2 flows (direct access)

management:
  server:
    port: 8091  # Admin API (via gateway)
  endpoints:
    web:
      base-path: /admin

openframe:
  auth:
    oauth2:
      port: 8090      # Public OAuth2 endpoints
    admin:
      port: 8091      # Admin/management endpoints
```

### Separate Controllers
```java
// OAuth2 Controller (Port 8090 - Direct)
@RestController
@RequestMapping("/oauth2")
public class OAuth2Controller {
    // Standard OAuth2 endpoints handled by Spring Authorization Server
    // No custom code needed - framework handles this
}

// Admin Controller (Port 8091 - Via Gateway)  
@RestController
@RequestMapping("/admin/auth")
public class AuthManagementController {
    
    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserDto> getUsers() {
        return userService.getAllUsers();
    }
    
    @PostMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public UserDto createUser(@RequestBody CreateUserRequest request) {
        return userService.createUser(request);
    }
    
    @GetMapping("/roles")
    @PreAuthorize("hasRole('ADMIN')")
    public List<RoleDto> getRoles() {
        return roleService.getAllRoles();
    }
}
```

## 🔄 Gateway Routing Configuration

### Gateway Routes
```java
@Configuration
public class GatewayRoutingConfig {
    
    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
            
            // Auth Management API (via gateway)
            .route("auth-management", r -> r
                .path("/api/auth/**")
                .filters(f -> f
                    .rewritePath("/api/auth/(?<segment>.*)", "/admin/auth/${segment}")
                    .addRequestHeader("X-Gateway-Route", "auth-management"))
                .uri("http://openframe-auth-server:8091"))
            
            // Other business APIs
            .route("business-api", r -> r
                .path("/api/**")
                .filters(f -> f
                    .rewritePath("/api/(?<segment>.*)", "/${segment}"))
                .uri("lb://openframe-api"))
                
            .build();
    }
}
```

### Frontend Service Discovery
```javascript
// Frontend configuration
const config = {
  // Direct OAuth2 endpoints (bypass gateway)
  authServer: {
    oauth2: 'http://openframe-auth-server:8090',
    authorization: 'http://openframe-auth-server:8090/oauth2/authorize',
    token: 'http://openframe-auth-server:8090/oauth2/token',
    jwks: 'http://openframe-auth-server:8090/oauth2/jwks',
    userInfo: 'http://openframe-auth-server:8090/userinfo'
  },
  
  // Management APIs (via gateway)
  api: {
    base: 'http://openframe-gateway:8100/api',
    auth: 'http://openframe-gateway:8100/api/auth',
    devices: 'http://openframe-gateway:8100/api/devices',
    users: 'http://openframe-gateway:8100/api/auth/users'
  }
};
```

## 🔐 Security Implications

### 1. Direct OAuth2 Access
```java
// Auth Server Security Config
@Configuration
public class OAuth2SecurityConfig {
    
    @Bean
    @Order(1)
    public SecurityFilterChain oauth2SecurityFilterChain(HttpSecurity http) {
        return http
            .securityMatcher("/oauth2/**", "/.well-known/**", "/login")
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable()) // OAuth2 handles CSRF protection
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/oauth2/**", "/.well-known/**").permitAll()
                .requestMatchers("/login").permitAll()
                .anyRequest().authenticated())
            .oauth2AuthorizationServer(Customizer.withDefaults())
            .build();
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(
            "http://localhost:3000",  // Frontend dev
            "https://app.openframe.com"  // Production frontend
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/oauth2/**", configuration);
        return source;
    }
}
```

### 2. Admin API Security (via Gateway)
```java
// Admin endpoints security
@Configuration
public class AdminSecurityConfig {
    
    @Bean
    @Order(2) 
    public SecurityFilterChain adminSecurityFilterChain(HttpSecurity http) {
        return http
            .securityMatcher("/admin/**")
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/admin/auth/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .build();
    }
}
```

## 🌐 Network & Infrastructure

### 1. Load Balancer Configuration
```yaml
# nginx.conf or cloud load balancer
upstream openframe-auth-oauth2 {
    server openframe-auth-server-1:8090;
    server openframe-auth-server-2:8090;
    server openframe-auth-server-3:8090;
}

upstream openframe-gateway {
    server openframe-gateway-1:8100;
    server openframe-gateway-2:8100;
}

server {
    listen 443 ssl;
    server_name auth.openframe.com;
    
    # OAuth2 endpoints (direct to auth server)
    location /oauth2/ {
        proxy_pass http://openframe-auth-oauth2;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /.well-known/ {
        proxy_pass http://openframe-auth-oauth2;
    }
}

server {
    listen 443 ssl;
    server_name api.openframe.com;
    
    # All other APIs (via gateway)
    location /api/ {
        proxy_pass http://openframe-gateway;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 2. Kubernetes Service Configuration
```yaml
# OAuth2 Service (direct access)
apiVersion: v1
kind: Service
metadata:
  name: openframe-auth-oauth2
  namespace: openframe
spec:
  selector:
    app: openframe-auth-server
  ports:
  - name: oauth2
    port: 8090
    targetPort: 8090
  type: ClusterIP

---
# Admin Service (via gateway)
apiVersion: v1
kind: Service
metadata:
  name: openframe-auth-admin
  namespace: openframe
spec:
  selector:
    app: openframe-auth-server
  ports:
  - name: admin
    port: 8091
    targetPort: 8091
  type: ClusterIP

---
# Ingress for direct OAuth2 access
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: openframe-auth-oauth2
  namespace: openframe
spec:
  rules:
  - host: auth.openframe.com
    http:
      paths:
      - path: /oauth2
        pathType: Prefix
        backend:
          service:
            name: openframe-auth-oauth2
            port:
              number: 8090
      - path: /.well-known
        pathType: Prefix
        backend:
          service:
            name: openframe-auth-oauth2
            port:
              number: 8090
```

## 📊 Traffic Flow Examples

### 1. Login Flow (Direct)
```
1. User clicks "Login" in frontend
2. Frontend → auth.openframe.com/oauth2/authorize (DIRECT)
3. Auth Server → Login page
4. User enters credentials
5. Auth Server → Redirect with authorization code
6. Frontend → auth.openframe.com/oauth2/token (DIRECT)
7. Auth Server → Returns JWT token
8. Frontend stores token, uses for API calls
```

### 2. Admin Operations (via Gateway)
```
1. Admin clicks "Manage Users"
2. Frontend → api.openframe.com/api/auth/users (via GATEWAY)
3. Gateway → Validates JWT token
4. Gateway → Routes to openframe-auth-server:8091/admin/auth/users
5. Auth Server → Returns user list
6. Gateway → Returns response to frontend
```

### 3. Resource Server Validation (Direct)
```
1. Business API receives request with JWT
2. Business API → auth.openframe.com/oauth2/jwks (DIRECT)
3. Business API validates JWT signature
4. Business API extracts RBAC claims
5. Business API processes request
```

## ✅ Best Practices Summary

1. **OAuth2 flows = Direct access** (integrity critical)
2. **Admin/Management = Via Gateway** (rate limiting, monitoring)
3. **Public endpoints = Direct** (JWKS, discovery)
4. **Business APIs = Via Gateway** (centralized routing)
5. **Use separate ports** for clear separation
6. **Configure CORS properly** for OAuth2 endpoints
7. **Monitor both paths** with different metrics
8. **Document clearly** which endpoints use which route 