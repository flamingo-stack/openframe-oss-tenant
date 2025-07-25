package com.openframe.gateway.security.filter;

import com.openframe.security.cookie.CookieService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import static com.openframe.core.constants.HttpHeaders.X_REFRESH_TOKEN;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;

/**
 * WebFilter that adds Authorization header from cookie tokens.
 * This allows OAuth2 Resource Server to work with cookie-based authentication
 * without modifying the standard Spring Security flow.
 * <p>
 * If request has Authorization header - passes through unchanged
 * If request has JWT cookie - adds Authorization: Bearer <token> header
 * If no token found - passes through unchanged (will be handled by OAuth2 Resource Server)
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class CookieToHeaderFilter implements WebFilter {

    private final CookieService cookieService;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();

        String existingAuth = request.getHeaders().getFirst(AUTHORIZATION);
        if (StringUtils.hasText(existingAuth)) {
            log.debug("Authorization header already present, skipping cookie check");
            return chain.filter(exchange);
        }

        String accessToken = cookieService.getAccessTokenFromCookies(exchange);

        ServerHttpRequest.Builder requestBuilder = request.mutate();
        boolean headersAdded = false;

        if (accessToken != null) {
            requestBuilder.header(AUTHORIZATION, "Bearer " + accessToken);
            headersAdded = true;
            log.debug("Added Authorization header from access_token cookie");
        }

        String path = request.getPath().value();
        if (path.equals("/api/oauth/token")) {
            String refreshToken = cookieService.getRefreshTokenFromCookies(exchange);
            if (refreshToken != null) {
                requestBuilder.header(X_REFRESH_TOKEN, refreshToken);
                headersAdded = true;
                log.debug("Added {} header from refresh_token cookie", X_REFRESH_TOKEN);
            }
        }

        if (headersAdded) {
            ServerWebExchange modifiedExchange = exchange.mutate()
                    .request(requestBuilder.build())
                    .build();
            return chain.filter(modifiedExchange);
        }

        log.debug("No JWT token found in cookies, continuing without Authorization header");
        return chain.filter(exchange);
    }

} 