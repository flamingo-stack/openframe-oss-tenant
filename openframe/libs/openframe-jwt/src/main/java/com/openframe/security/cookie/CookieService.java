package com.openframe.security.cookie;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpCookie;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.server.ServerWebExchange;

/**
 * Service for managing HTTP cookies used for authentication tokens.
 * Handles setting, getting, and clearing access and refresh token cookies.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CookieService {

    public static final String ACCESS_TOKEN_COOKIE = "access_token";
    public static final String REFRESH_TOKEN_COOKIE = "refresh_token";

    @Value("${security.oauth2.token.access.expiration-seconds}")
    private int accessTokenExpirationSeconds;

    @Value("${security.oauth2.token.refresh.expiration-seconds}")
    private int refreshTokenExpirationSeconds;

    @Value("${openframe.security.cookie.domain:#{null}}")
    private String cookieDomain;

    @Value("${openframe.security.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${openframe.security.cookie.same-site:Lax}")
    private String cookieSameSite;

    /**
     * Set access token as HttpOnly cookie with Path=/ (sent on all API requests)
     */
    public void setAccessTokenCookie(HttpServletResponse response, String accessToken) {
        Cookie accessCookie = createSecureServletCookie(ACCESS_TOKEN_COOKIE, accessToken, accessTokenExpirationSeconds, "/");
        response.addCookie(accessCookie);
        log.debug("Set access token cookie with Path=/ (expires in {} seconds)", accessTokenExpirationSeconds);
    }

    /**
     * Set refresh token as HttpOnly cookie with strict Path=/api/oauth/token
     * This way it's ONLY sent to refresh endpoint, not on every request
     */
    public void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        Cookie refreshCookie = createSecureServletCookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshTokenExpirationSeconds, "/oauth2/token");
        response.addCookie(refreshCookie);
        log.debug("Set refresh token cookie with Path=/oauth2/token (expires in {} seconds)", refreshTokenExpirationSeconds);
    }

    /**
     * Get JWT access token from reactive ServerWebExchange cookies
     * This is automatically sent by browser on every request
     */
    public String getAccessTokenFromCookies(ServerWebExchange exchange) {
        return getCookieValueFromExchange(exchange, ACCESS_TOKEN_COOKIE);
    }

    /**
     * Get refresh token from ServerWebExchange cookies (reactive environment)
     */
    public String getRefreshTokenFromCookies(ServerWebExchange exchange) {
        return getCookieValueFromExchange(exchange, REFRESH_TOKEN_COOKIE);
    }

    /**
     * Common method to extract cookie value from ServerWebExchange
     *
     * @param exchange   the ServerWebExchange containing the request
     * @param cookieName the name of the cookie to extract
     * @return cookie value or null if not found
     */
    private String getCookieValueFromExchange(ServerWebExchange exchange, String cookieName) {
        ServerHttpRequest request = exchange.getRequest();
        MultiValueMap<String, HttpCookie> cookies = request.getCookies();

        HttpCookie cookie = cookies.getFirst(cookieName);
        if (cookie != null) {
            log.debug("Found {} cookie in request", cookieName);
            return cookie.getValue();
        }

        log.debug("Cookie {} not found in request", cookieName);
        return null;
    }

    /**
     * Clear both access and refresh token cookies with their respective paths
     */
    public void clearTokenCookies(HttpServletResponse response) {
        Cookie clearAccessCookie = createClearServletCookie(ACCESS_TOKEN_COOKIE, "/");
        response.addCookie(clearAccessCookie);
        Cookie clearRefreshCookie = createClearServletCookie(REFRESH_TOKEN_COOKIE, "/oauth2/token");
        response.addCookie(clearRefreshCookie);
        log.debug("Cleared access token cookie (Path=/) and refresh token cookie (Path=/oauth2/token)");
    }

    /**
     * Create a secure servlet cookie with specified path
     */
    private Cookie createSecureServletCookie(String name, String value, int maxAgeSeconds, String path) {
        Cookie cookie = new Cookie(name, value);
        cookie.setMaxAge(maxAgeSeconds);
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath(path);
        if (cookieDomain != null && !cookieDomain.isBlank()) {
            cookie.setDomain(cookieDomain);
        }

        cookie.setAttribute("SameSite", this.cookieSameSite);

        return cookie;
    }

    /**
     * Create a cookie for clearing (empty value, maxAge=0)
     */
    private Cookie createClearServletCookie(String name, String path) {
        Cookie cookie = new Cookie(name, "");
        cookie.setMaxAge(0);
        cookie.setHttpOnly(true);
        cookie.setSecure(cookieSecure);
        cookie.setPath(path);
        if (cookieDomain != null && !cookieDomain.isBlank()) {
            cookie.setDomain(cookieDomain);
        }

        cookie.setAttribute("SameSite", cookieSameSite);

        return cookie;
    }
} 