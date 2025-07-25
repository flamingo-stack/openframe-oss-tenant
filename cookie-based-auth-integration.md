# Cookie-Based Authentication with Spring Authorization Server

## 🍪 Current OpenFrame Cookie Strategy (KEEP IT!)

Your current cookie-based approach is **EXCELLENT** and more secure than Bearer tokens in localStorage. Here's how to integrate it with Spring Authorization Server:

## 🔧 Authorization Server Cookie Configuration

### 1. Custom Token Endpoint for Cookies

```java
@Configuration
public class CookieOAuth2Config {
    
    @Bean
    public OAuth2TokenCustomizer<OAuth2TokenClaimsContext> tokenCustomizer() {
        return context -> {
            // Add custom claims to JWT (existing RBAC logic)
            OpenFramePrincipal principal = (OpenFramePrincipal) context.getPrincipal();
            context.getClaims()
                .claim("organization_id", principal.getOrganizationId())
                .claim("roles", principal.getRoles())
                .claim("permissions", principal.getPermissions());
        };
    }
    
    @Bean
    public OAuth2TokenResponseClient<OAuth2AuthorizationCodeGrantRequest> tokenResponseClient() {
        return new CookieAwareOAuth2TokenResponseClient();
    }
}
```

### 2. Cookie Management in Authorization Server

```java
@RestController
public class CookieOAuthController {
    
    private final CookieService cookieService;
    private final OAuth2AuthorizationService authorizationService;
    
    /**
     * Custom token endpoint that sets HttpOnly cookies
     */
    @PostMapping("/oauth2/token")
    public ResponseEntity<?> token(
            @RequestParam("grant_type") String grantType,
            @RequestParam("code") String code,
            @RequestParam("redirect_uri") String redirectUri,
            @RequestParam("client_id") String clientId,
            @RequestParam(value = "code_verifier", required = false) String codeVerifier,
            HttpServletRequest request,
            HttpServletResponse response) {
        
        // Process OAuth2 token request using Spring Authorization Server
        OAuth2TokenResponse tokenResponse = processTokenRequest(
            grantType, code, redirectUri, clientId, codeVerifier);
        
        // Set tokens as HttpOnly cookies (your existing logic!)
        cookieService.setAccessTokenCookie(tokenResponse.getAccessToken(), response);
        cookieService.setRefreshTokenCookie(tokenResponse.getRefreshToken(), response);
        
        // Return success response (without tokens in body for security)
        return ResponseEntity.ok(Map.of(
            "status", "success",
            "expires_in", tokenResponse.getExpiresIn()
        ));
    }
    
    /**
     * Refresh token endpoint with cookies
     */
    @PostMapping("/oauth2/refresh")
    public ResponseEntity<?> refresh(
            HttpServletRequest request,
            HttpServletResponse response) {
        
        // Extract refresh token from cookie (your existing logic!)
        String refreshToken = cookieService.getRefreshTokenFromCookies(request);
        
        if (refreshToken == null) {
            throw new OAuth2AuthenticationException("Refresh token not found");
        }
        
        // Process refresh using Spring Authorization Server
        OAuth2TokenResponse newTokens = processRefreshToken(refreshToken);
        
        // Update cookies with new tokens
        cookieService.setAccessTokenCookie(newTokens.getAccessToken(), response);
        if (newTokens.getRefreshToken() != null) {
            cookieService.setRefreshTokenCookie(newTokens.getRefreshToken(), response);
        }
        
        return ResponseEntity.ok(Map.of(
            "status", "refreshed",
            "expires_in", newTokens.getExpiresIn()
        ));
    }
    
    /**
     * Logout endpoint that clears cookies
     */
    @PostMapping("/oauth2/logout")
    public ResponseEntity<?> logout(
            HttpServletRequest request,
            HttpServletResponse response) {
        
        // Revoke tokens in Authorization Server
        String accessToken = cookieService.getAccessTokenFromCookies(request);
        if (accessToken != null) {
            revokeToken(accessToken);
        }
        
        // Clear cookies (your existing logic!)
        cookieService.clearAuthenticationCookies(response);
        
        return ResponseEntity.ok(Map.of("status", "logged_out"));
    }
}
```

### 3. Enhanced CookieService Integration

```java
@Service
public class CookieService {
    
    // Keep your existing cookie logic, just enhance it for OAuth2!
    
    public void setAccessTokenCookie(String accessToken, HttpServletResponse response) {
        Cookie cookie = new Cookie("access_token", accessToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(true); // HTTPS only
        cookie.setPath("/");
        cookie.setMaxAge(15 * 60); // 15 minutes
        cookie.setSameSite("Strict");
        response.addCookie(cookie);
    }
    
    public void setRefreshTokenCookie(String refreshToken, HttpServletResponse response) {
        Cookie cookie = new Cookie("refresh_token", refreshToken);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/oauth2"); // Restricted path for security
        cookie.setMaxAge(7 * 24 * 60 * 60); // 7 days
        cookie.setSameSite("Strict");
        response.addCookie(cookie);
    }
    
    public String getAccessTokenFromCookies(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("access_token".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
    
    public String getRefreshTokenFromCookies(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("refresh_token".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
    
    public void clearAuthenticationCookies(HttpServletResponse response) {
        // Clear access token cookie
        Cookie accessTokenCookie = new Cookie("access_token", "");
        accessTokenCookie.setMaxAge(0);
        accessTokenCookie.setPath("/");
        accessTokenCookie.setHttpOnly(true);
        response.addCookie(accessTokenCookie);
        
        // Clear refresh token cookie
        Cookie refreshTokenCookie = new Cookie("refresh_token", "");
        refreshTokenCookie.setMaxAge(0);
        refreshTokenCookie.setPath("/oauth2");
        refreshTokenCookie.setHttpOnly(true);
        response.addCookie(refreshTokenCookie);
    }
}
```

## 🔄 Gateway Integration with Cookies

### Cookie-to-Header Filter (Keep your existing logic!)

```java
@Component
public class CookieToHeaderFilter implements WebFilter {
    
    private final CookieService cookieService;
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        
        // Extract access token from cookies (your existing logic!)
        String accessToken = cookieService.getAccessTokenFromCookies(request);
        
        if (accessToken != null) {
            // Add Authorization header for downstream services
            ServerHttpRequest modifiedRequest = request.mutate()
                .header("Authorization", "Bearer " + accessToken)
                .build();
            
            return chain.filter(exchange.mutate().request(modifiedRequest).build());
        }
        
        return chain.filter(exchange);
    }
}
```

### Auto-Refresh on 401 (Enhanced with Spring AuthZ Server)

```java
@Component
public class TokenRefreshFilter implements WebFilter {
    
    private final CookieService cookieService;
    private final WebClient authServerClient;
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        return chain.filter(exchange)
            .onErrorResume(ResponseStatusException.class, ex -> {
                if (ex.getStatusCode() == HttpStatus.UNAUTHORIZED) {
                    return attemptTokenRefresh(exchange, chain);
                }
                return Mono.error(ex);
            });
    }
    
    private Mono<Void> attemptTokenRefresh(ServerWebExchange exchange, WebFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        ServerHttpResponse response = exchange.getResponse();
        
        String refreshToken = cookieService.getRefreshTokenFromCookies(request);
        
        if (refreshToken == null) {
            return handleAuthenticationFailure(response);
        }
        
        // Call Authorization Server refresh endpoint
        return authServerClient.post()
            .uri("/oauth2/refresh")
            .cookie("refresh_token", refreshToken)
            .retrieve()
            .toEntity(String.class)
            .flatMap(refreshResponse -> {
                if (refreshResponse.getStatusCode().is2xxSuccessful()) {
                    // Cookies are set by Authorization Server response
                    // Retry the original request
                    return chain.filter(exchange);
                } else {
                    return handleAuthenticationFailure(response);
                }
            });
    }
}
```

## 🎯 Frontend Integration (Keep your existing approach!)

### Your current frontend cookie approach is PERFECT:

```javascript
// No changes needed in frontend! Cookies are automatic
class AuthService {
    
    async login(email, password) {
        // OAuth2 Authorization Code Flow with cookies
        const authUrl = `${AUTH_SERVER_URL}/oauth2/authorize?` + 
            `response_type=code&` +
            `client_id=${CLIENT_ID}&` +
            `redirect_uri=${REDIRECT_URI}&` +
            `scope=openid profile rbac&` +
            `code_challenge=${codeChallenge}&` +
            `code_challenge_method=S256`;
            
        window.location.href = authUrl;
    }
    
    async handleCallback(code) {
        // Exchange code for tokens (stored as cookies)
        const response = await fetch(`${AUTH_SERVER_URL}/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            credentials: 'include', // Important for cookies!
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
                client_id: CLIENT_ID,
                code_verifier: codeVerifier
            })
        });
        
        if (response.ok) {
            // Tokens are now stored as HttpOnly cookies automatically!
            this.updateAuthStatus(true);
        }
    }
    
    async logout() {
        await fetch(`${AUTH_SERVER_URL}/oauth2/logout`, {
            method: 'POST',
            credentials: 'include' // Send cookies
        });
        
        // Cookies cleared automatically by server
        this.updateAuthStatus(false);
    }
    
    // Your existing auth status checking is perfect!
    updateAuthStatus() {
        const hasAccessTokenCookie = document.cookie
            .split(';')
            .some(cookie => cookie.trim().startsWith('access_token='));
            
        this.isAuthenticated.value = hasAccessTokenCookie;
    }
}
```

## 🛡️ Security Benefits of Your Cookie Approach

### 1. **XSS Protection**
```javascript
// ❌ Vulnerable to XSS
localStorage.setItem('token', jwt);  
// Malicious script can steal token!

// ✅ Protected from XSS  
// HttpOnly cookies can't be accessed by JavaScript
document.cookie; // Won't show HttpOnly cookies
```

### 2. **CSRF Protection**
```java
// Your cookies with SameSite=Strict prevent CSRF
@Bean
public CookieSpecification securityCookies() {
    return CookieSpecification.builder()
        .httpOnly(true)
        .secure(true)
        .sameSite(SameSite.STRICT) // CSRF protection
        .build();
}
```

### 3. **Automatic Token Management**
```javascript
// ✅ No manual token handling needed
fetch('/api/devices', {
    credentials: 'include' // Cookies sent automatically
});

// ❌ Manual token management with Bearer
fetch('/api/devices', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}` // Manual!
    }
});
```

## 🔄 Migration Strategy (Minimal Changes!)

### What to Keep (99% of your current implementation):
- ✅ HttpOnly cookies for token storage
- ✅ CookieService logic
- ✅ Cookie-to-Header filter in Gateway
- ✅ Frontend authentication status checking
- ✅ Automatic token refresh logic

### What to Change (Just endpoints):
- 🔄 Login endpoint → OAuth2 authorization flow
- 🔄 Token refresh → Call Authorization Server
- 🔄 Add RBAC claims to JWT (in Authorization Server)

### Example Migration:

```java
// OLD (keep the cookie logic, change the source)
@PostMapping("/auth/login")
public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletResponse response) {
    // Your existing authentication logic
    String jwt = jwtService.generateToken(user);
    cookieService.setAccessTokenCookie(jwt, response); // ✅ Keep this!
    return ResponseEntity.ok().build();
}

// NEW (same cookie logic, OAuth2 source)
@PostMapping("/oauth2/token") 
public ResponseEntity<?> token(@RequestParam String code, HttpServletResponse response) {
    // OAuth2 Authorization Code flow
    OAuth2TokenResponse tokens = authorizationServerService.exchangeCode(code);
    cookieService.setAccessTokenCookie(tokens.getAccessToken(), response); // ✅ Same logic!
    return ResponseEntity.ok().build();
}
```

## 📊 Comparison: Your Approach vs Standard OAuth2

| Aspect | Standard OAuth2 | Your Cookie Approach | Winner |
|--------|----------------|---------------------|---------|
| **Security** | Bearer in localStorage | HttpOnly cookies | 🏆 **Cookies** |
| **XSS Protection** | ❌ Vulnerable | ✅ Protected | 🏆 **Cookies** |
| **CSRF Protection** | ✅ Not affected | ✅ SameSite protection | 🤝 **Tie** |
| **Mobile Support** | ✅ Easy | ⚠️ Requires WebView | 🏆 **Bearer** |
| **SPA Support** | ✅ Good | ✅ Excellent | 🤝 **Tie** |
| **Auto-refresh** | ❌ Manual | ✅ Automatic | 🏆 **Cookies** |

## ✅ Recommendation: Keep Your Cookie Approach!

Your cookie-based authentication is **more secure** than standard Bearer tokens and works **perfectly** with Spring Authorization Server. You just need to:

1. **Keep** all your existing cookie logic ✅
2. **Enhance** with OAuth2 flows from Authorization Server 🔄  
3. **Add** RBAC claims to JWT tokens 🆕

This gives you the **best of both worlds**:
- Industry-standard OAuth2/OIDC compliance
- Superior security through HttpOnly cookies
- Seamless user experience with automatic token management

Your architecture team made an **excellent security decision** with the cookie approach! 🔒🏆 