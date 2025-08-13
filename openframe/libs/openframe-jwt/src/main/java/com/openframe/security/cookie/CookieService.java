package com.openframe.security.cookie;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpCookie;
import org.springframework.http.ResponseCookie;
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
    private String domain;

    @Value("${openframe.security.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${openframe.security.cookie.same-site:Lax}")
    private String cookieSameSite;


    public ResponseCookie createAccessTokenCookie(String accessToken) {
        return createCookie(ACCESS_TOKEN_COOKIE, accessToken, "/");
    }

    /**
     * Створює ResponseCookie для refresh token з налаштуваннями з CookieService
     */
    public ResponseCookie createRefreshTokenCookie(String refreshToken) {
        return createCookie(REFRESH_TOKEN_COOKIE, refreshToken,"/oauth2/token/refresh");
    }

    public ResponseCookie createCookie(String name, String value, String path) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path(path)
                .maxAge(accessTokenExpirationSeconds)
                .domain(domain)
                .build();
    }

    /**
     * Get JWT access token from reactive ServerWebExchange cookies
     * This is automatically sent by browser on every request
     */
    public String getAccessTokenFromCookies(ServerWebExchange exchange) {
        return getCookieValueFromExchange(exchange, ACCESS_TOKEN_COOKIE);
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
        Cookie clearRefreshCookie = createClearServletCookie(REFRESH_TOKEN_COOKIE, "/oauth2/token/refresh");
        response.addCookie(clearRefreshCookie);
        log.debug("Cleared access token cookie (Path=/) and refresh token cookie (Path=/oauth2/token/refresh)");
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
        if (domain != null && !domain.isBlank()) {
            cookie.setDomain(domain);
        }

        cookie.setAttribute("SameSite", cookieSameSite);

        return cookie;
    }
} 