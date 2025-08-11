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

import static com.openframe.gateway.security.SecurityConstants.AUTHORIZATION_QUERY_PARAM;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;

/**
 * WebFilter that adds Authorization header from cookie tokens or query parameters.
 * This allows OAuth2 Resource Server to work with cookie-based authentication
 * and query parameter authentication without modifying the standard Spring Security flow.
 * <p>
 * Priority order:
 * 1. If request has Authorization header - passes through unchanged
 * 2. If request has JWT cookie - adds Authorization: Bearer <token> header
 * 3. If request has authorization query parameter - adds Authorization: Bearer <token> header
 * 4. If no token found - passes through unchanged (will be handled by OAuth2 Resource Server)
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
            log.debug("Authorization header already present, skipping cookie and query parameter check");
            return chain.filter(exchange);
        }

        String accessToken = cookieService.getAccessTokenFromCookies(exchange);

        if (accessToken == null) {
            accessToken = request.getQueryParams().getFirst(AUTHORIZATION_QUERY_PARAM);
            if (accessToken != null) {
                log.debug("Found authorization token in query parameter");
            }
        } else {
            log.debug("Found authorization token in cookies");
        }

        ServerHttpRequest.Builder requestBuilder = request.mutate();
        boolean headersAdded = false;

        if (accessToken != null) {
            requestBuilder.header(AUTHORIZATION, "Bearer " + accessToken);
            headersAdded = true;
            log.debug("Added Authorization header from token");
        }

        if (headersAdded) {
            ServerWebExchange modifiedExchange = exchange.mutate()
                    .request(requestBuilder.build())
                    .build();
            return chain.filter(modifiedExchange);
        }

        log.debug("No JWT token found in cookies or query parameters, continuing without Authorization header");
        return chain.filter(exchange);
    }

} 