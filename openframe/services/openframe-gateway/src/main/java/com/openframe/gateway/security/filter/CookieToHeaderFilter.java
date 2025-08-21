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
import static org.springframework.http.HttpMethod.GET;

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

        if (isOAuthEndpoint(request)) {
            return chain.filter(exchange);
        }

        if (!isProtectedGet(request)) {
            return chain.filter(exchange);
        }

        if (hasAuthorizationHeader(request)) {
            log.debug("Authorization header already present, skipping cookie and query parameter check");
            return chain.filter(exchange);
        }

        String accessToken = resolveAccessToken(exchange, request);

        if (accessToken != null) {
            log.debug("Added Authorization header from token");
            ServerHttpRequest mutated = request.mutate()
                    .header(AUTHORIZATION, "Bearer " + accessToken)
                    .build();
            return chain.filter(exchange.mutate().request(mutated).build());
        }

        log.debug("No JWT token found in cookies or query parameters, continuing without Authorization header");
        return chain.filter(exchange);
    }

    private boolean isOAuthEndpoint(ServerHttpRequest request) {
        String path = request.getPath().value();
        return path.startsWith("/oauth/") || path.startsWith("/sas/");
    }

    private boolean isProtectedGet(ServerHttpRequest request) {
        if (request.getMethod() != GET) {
            return true;
        }
        String path = request.getPath().value();
        return path.startsWith("/api/")
                || "/graphql".equals(path)
                || path.startsWith("/tools/")
                || path.startsWith("/clients/")
                // TODO: fix
                || path.startsWith("/ws/");
    }

    private boolean hasAuthorizationHeader(ServerHttpRequest request) {
        String existingAuth = request.getHeaders().getFirst(AUTHORIZATION);
        return StringUtils.hasText(existingAuth);
    }

    private String resolveAccessToken(ServerWebExchange exchange, ServerHttpRequest request) {
        String accessToken = cookieService.getAccessTokenFromCookies(exchange);
        if (accessToken != null) {
            log.debug("Found authorization token in cookies");
            return accessToken;
        }
        String fromQuery = request.getQueryParams().getFirst(AUTHORIZATION_QUERY_PARAM);
        if (fromQuery != null) {
            log.debug("Found authorization token in query parameter");
            return fromQuery;
        }
        return null;
    }
} 