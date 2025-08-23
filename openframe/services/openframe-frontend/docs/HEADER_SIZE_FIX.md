# Fix for "Request header is too large" Error

## Problem
The error `java.lang.IllegalArgumentException: Request header is too large` occurs when the HTTP request headers exceed Tomcat's default limit of 8KB.

## Root Cause
- Accumulated cookies from authentication attempts
- Multiple JWT tokens stored as cookies
- Browser sending all cookies with every request
- Default Tomcat header size limit (8192 bytes) is too small for modern applications

## Solutions

### 1. Immediate Fix - Clear Browser Data
Navigate to: http://localhost:4000/clear-cookies.html

Or manually:
1. Open browser developer tools (F12)
2. Go to Application tab
3. Clear all cookies for localhost
4. Clear localStorage
5. Use incognito/private mode

### 2. Backend Configuration Fix (Recommended)

Add to your Spring Boot application properties:

```yaml
# application.yml for openframe-api service
server:
  tomcat:
    max-http-header-size: 32768  # 32KB instead of default 8KB
    max-http-post-size: 2097152  # 2MB
  max-http-request-header-size: 32768  # For newer Spring Boot versions
```

Or in application.properties:
```properties
server.tomcat.max-http-header-size=32768
server.tomcat.max-http-post-size=2097152
server.max-http-request-header-size=32768
```

### 3. Gateway Configuration
If using Spring Cloud Gateway, add:
```yaml
spring:
  cloud:
    gateway:
      httpclient:
        max-header-size: 32768
```

### 4. Kubernetes ConfigMap Update
Update the ConfigMap for openframe-api:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: openframe-api-config
data:
  application.yml: |
    server:
      tomcat:
        max-http-header-size: 32768
```

### 5. Prevention Strategies

1. **Cookie Management**:
   - Implement cookie expiration
   - Use HTTP-only, Secure, SameSite attributes
   - Limit cookie size and number

2. **Token Strategy**:
   - Use shorter JWT tokens
   - Store tokens in Authorization header instead of cookies for some endpoints
   - Implement token cleanup on logout

3. **Frontend Best Practices**:
   ```javascript
   // Clear old auth data on login page
   useEffect(() => {
     // Clean up any stale auth data
     document.cookie.split(";").forEach(c => {
       const name = c.split("=")[0].trim();
       if (name.startsWith("access_") || name.startsWith("refresh_")) {
         document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
       }
     });
   }, []);
   ```

## Testing

After applying fixes:
1. Restart backend services
2. Clear browser data
3. Test login flow
4. Monitor header sizes in browser dev tools

## Monitoring

Add logging to track header sizes:
```java
@Component
public class HeaderSizeFilter implements Filter {
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) {
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        int headerSize = httpRequest.getHeader("Cookie") != null ? 
            httpRequest.getHeader("Cookie").length() : 0;
        
        if (headerSize > 4096) {
            log.warn("Large cookie header detected: {} bytes", headerSize);
        }
        
        chain.doFilter(request, response);
    }
}
```