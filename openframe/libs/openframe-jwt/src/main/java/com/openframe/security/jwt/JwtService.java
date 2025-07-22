package com.openframe.security.jwt;

import com.openframe.security.adapter.OAuthClientSecurity;
import com.openframe.security.adapter.UserSecurity;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpCookie;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.server.ServerWebExchange;

import java.time.Instant;
import java.util.function.Function;

@Service
@RequiredArgsConstructor
@Slf4j
public class JwtService {

    public static final String ACCESS_TOKEN_COOKIE = "access_token";
    public static final String REFRESH_TOKEN_COOKIE = "refresh_token";
    
    private final JwtEncoder encoder;
    private final JwtDecoder decoder;

    @Value("${security.oauth2.token.access.expiration-seconds}")
    private int accessTokenExpirationSeconds;

    @Value("${security.oauth2.token.refresh.expiration-seconds}")
    private int refreshTokenExpirationSeconds;

    @Value("${openframe.security.cookie.domain:#{null}}")
    private String cookieDomain;

    @Value("${openframe.security.cookie.secure:false}")
    private boolean cookieSecure;
    
    public Jwt decodeToken(String token) {
        log.debug("Decoding token");
        Jwt jwt = decoder.decode(token);
        log.debug("Token decoded successfully - Expiration: {}", jwt.getExpiresAt());
        return jwt;
    }

    private <T> T extractClaim(String token, Function<Jwt, T> claimsResolver) {
        final Jwt jwt = decodeToken(token);
        return claimsResolver.apply(jwt);
    }

    public String generateToken(UserDetails userDetails) {
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuer("https://auth.openframe.com")
            .subject(userDetails.getUsername())
            .claim("email", userDetails.getUsername())
            .claim("given_name", userDetails instanceof UserSecurity ? ((UserSecurity) userDetails).getUser().getFirstName() : null)
            .claim("family_name", userDetails instanceof UserSecurity ? ((UserSecurity) userDetails).getUser().getLastName() : null)
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(accessTokenExpirationSeconds))
            .build();
        
        return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }
    
    public String generateToken(JwtClaimsSet claims) {
        return encoder.encode(JwtEncoderParameters.from(claims)).getTokenValue();
    }

    public String extractGrantType(String token) {
        log.debug("Extracting grantType from token");
        try {
            Jwt jwt = decoder.decode(token);
            String grantType = jwt.getClaimAsString("grant_type");
            log.debug("Extracted grantType from token: {}", grantType);
            return grantType;
        } catch (Exception e) {
            log.error("Failed to extract grantType from token: {}", e.getMessage());
            return null;
        }
    }

    public String extractClientId(String token) {
        log.debug("Extracting clientId from token");
        try {
            Jwt jwt = decoder.decode(token);
            String clientId = jwt.getClaimAsString("sub");
            log.debug("Extracted clientId from token: {}", clientId);
            return clientId;
        } catch (Exception e) {
            log.error("Failed to extract clientId from token: {}", e.getMessage());
            return null;
        }
    }
    
    public String extractUsername(String token) {
        log.debug("Extracting username from token");
        try {
            Jwt jwt = decoder.decode(token);
            String email = jwt.getClaimAsString("email");
            log.debug("Extracted email from token: {}", email);
            return email;
        } catch (Exception e) {
            log.error("Failed to extract email from token: {}", e.getMessage());
            return null;
        }
    }
    
    public boolean isTokenValid(String token, UserDetails userDetails) {
        log.debug("Validating token for user: {}", userDetails.getUsername());
        try {
            Jwt jwt = decoder.decode(token);
            if (userDetails instanceof UserSecurity) {
                String tokenEmail = jwt.getClaimAsString("email");
                log.debug("Token email: {}, User email: {}", tokenEmail, userDetails.getUsername());

                boolean emailValid = tokenEmail != null && tokenEmail.equals(userDetails.getUsername());
                boolean notExpired = !jwt.getExpiresAt().isBefore(Instant.now());

                log.debug("Email valid: {}, Not expired: {}", emailValid, notExpired);
                return emailValid && notExpired;
            }
            if (userDetails instanceof OAuthClientSecurity) {
                String tokenClientId = jwt.getClaimAsString("sub");
                log.debug("Token client id: {}, User client id: {}", tokenClientId, userDetails.getUsername());

                boolean clientIdVerified = tokenClientId != null && tokenClientId.equals(userDetails.getUsername());
                boolean notExpired = !jwt.getExpiresAt().isBefore(Instant.now());

                log.debug("Client id valid: {}, Not expired: {}", clientIdVerified, notExpired);
                return clientIdVerified && notExpired;
            }
            return false;
        } catch (Exception e) {
            log.error("Token validation failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Get JWT access token from reactive ServerWebExchange cookies
     * This is automatically sent by browser on every request
     */
    public String getTokenFromCookies(ServerWebExchange exchange) {
        ServerHttpRequest request = exchange.getRequest();
        MultiValueMap<String, HttpCookie> cookies = request.getCookies();

        HttpCookie cookie = cookies.getFirst(ACCESS_TOKEN_COOKIE);
        if (cookie != null) {
            log.debug("Found access token in cookies");
            return cookie.getValue();
        }

        log.debug("No access token cookie found");
        return null;
    }

    /**
     * Get JWT token from servlet request cookies
     */
    public String getTokenFromCookies(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (ACCESS_TOKEN_COOKIE.equals(cookie.getName())) {
                    log.debug("Found access token in servlet cookies");
                    return cookie.getValue();
                }
            }
        }

        log.debug("No access token servlet cookie found");
        return null;
    }

    /**
     * Get refresh token from servlet request cookies - ONLY for refresh endpoint usage
     * Refresh token cookie has strict Path=/api/oauth/token so it's only sent to this endpoint
     */
    public String getRefreshTokenFromCookies(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (REFRESH_TOKEN_COOKIE.equals(cookie.getName())) {
                    log.debug("Found refresh token in servlet cookies for refresh operation (strict path)");
                    return cookie.getValue();
                }
            }
        }

        log.debug("No refresh token servlet cookie found (this is normal for non-refresh requests due to strict path)");
        return null;
    }

    /**
     * Set only access token as HTTP-only cookie for automatic inclusion in requests
     * Refresh token is now returned in response body for frontend to store in memory (not cookies)
     */
    public void setAccessTokenCookie(HttpServletResponse response, String accessToken) {
        Cookie accessCookie = createSecureServletCookie(ACCESS_TOKEN_COOKIE, accessToken, accessTokenExpirationSeconds, "/");
        response.addCookie(accessCookie);
        log.debug("Set access token cookie with Path=/ (expires in {} seconds)", accessTokenExpirationSeconds);
    }

    /**
     * Set refresh token cookie with STRICT PATH - only sent to refresh endpoint for security
     * This prevents refresh token from being sent on every API request
     */
    public void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        Cookie refreshCookie = createSecureServletCookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshTokenExpirationSeconds, "/api/oauth/token");
        response.addCookie(refreshCookie);
        log.debug("Set refresh token cookie with Path=/api/oauth/token (expires in {} seconds)", refreshTokenExpirationSeconds);
    }

    /**
     * @deprecated Use setAccessTokenCookie() and setRefreshTokenCookie() instead for better security.
     * This method is kept for backward compatibility but now uses strict paths.
     */
    @Deprecated(since = "1.0", forRemoval = true)
    public void setTokenCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        log.warn("DEPRECATED: setTokenCookies() - use setAccessTokenCookie() and setRefreshTokenCookie() instead");
        log.info("Now using strict paths: access_token (Path=/), refresh_token (Path=/api/oauth/token)");

        setAccessTokenCookie(response, accessToken);
        setRefreshTokenCookie(response, refreshToken);
    }

    /**
     * Clear both access and refresh token cookies (for logout)
     * Uses the same paths as when they were set for proper clearing
     */
    public void clearTokenCookies(HttpServletResponse response) {
        Cookie clearAccessCookie = createClearServletCookie(ACCESS_TOKEN_COOKIE, "/");
        response.addCookie(clearAccessCookie);

        Cookie clearRefreshCookie = createClearServletCookie(REFRESH_TOKEN_COOKIE, "/api/oauth/token");
        response.addCookie(clearRefreshCookie);

        log.debug("Cleared access token cookie (Path=/) and refresh token cookie (Path=/api/oauth/token)");
    }

    private Cookie createSecureServletCookie(String name, String value, int maxAgeSeconds, String path) {
        Cookie cookie = new Cookie(name, value);
        cookie.setMaxAge(maxAgeSeconds);
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath(path);

        if (cookieDomain != null && !cookieDomain.isBlank()) {
            cookie.setDomain(cookieDomain);
        }

        return cookie;
    }

    private Cookie createClearServletCookie(String name, String path) {
        Cookie cookie = new Cookie(name, "");
        cookie.setMaxAge(0);
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath(path);

        if (cookieDomain != null && !cookieDomain.isBlank()) {
            cookie.setDomain(cookieDomain);
        }

        return cookie;
    }
} 