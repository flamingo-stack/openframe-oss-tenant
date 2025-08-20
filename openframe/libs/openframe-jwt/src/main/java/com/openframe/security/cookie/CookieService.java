package com.openframe.security.cookie;

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
        return createCookie(ACCESS_TOKEN_COOKIE, accessToken, "/", accessTokenExpirationSeconds);
    }

    /**
     * Створює ResponseCookie для refresh token з налаштуваннями з CookieService
     */
    public ResponseCookie createRefreshTokenCookie(String refreshToken) {
        return createCookie(REFRESH_TOKEN_COOKIE, refreshToken, "/oauth/refresh", refreshTokenExpirationSeconds);
    }

    public ResponseCookie createCookie(String name, String value, String path, int age) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(cookieSecure)
                .sameSite(cookieSameSite)
                .path(path)
                .maxAge(age)
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
} 