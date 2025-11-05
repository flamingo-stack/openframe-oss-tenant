package com.openframe.gateway.security.filter;

import com.openframe.security.cookie.CookieService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import static com.openframe.security.oauth.SecurityConstants.ACCESS_TOKEN_HEADER;
import static com.openframe.security.oauth.SecurityConstants.AUTHORIZATION_QUERY_PARAM;
import static org.springframework.http.HttpHeaders.AUTHORIZATION;
import static org.springframework.util.StringUtils.hasText;

/**
 * Pre-auth filter that ensures an Authorization header is present by resolving the
 * bearer token from multiple sources (cookie, custom header, query param) and adding
 * it to the request if missing. This allows the resource server to authenticate using
 * the standard Authorization header while supporting our multi-source token strategy.
 */
@RequiredArgsConstructor
@Slf4j
public class AddAuthorizationHeaderFilter implements WebFilter {

    private final CookieService cookieService;

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String existingAuth = request.getHeaders().getFirst(AUTHORIZATION);
        if (hasText(existingAuth)) {
            return chain.filter(exchange);
        }

        String token = resolveBearerToken(exchange);
        if (hasText(token)) {
            ServerHttpRequest mutated = request.mutate()
                    .header(AUTHORIZATION, "Bearer " + token)
                    .build();
            return chain.filter(exchange.mutate().request(mutated).build());
        }

        return chain.filter(exchange);
    }

    private String resolveBearerToken(ServerWebExchange exchange) {
        ServerHttpRequest request = exchange.getRequest();

        String fromCookie = cookieService.getAccessTokenFromCookies(exchange);
        if (hasText(fromCookie)) {
            log.debug("Using bearer token from access_token cookie");
            return fromCookie;
        }


        String fromHeaderAlt = request.getHeaders().getFirst(ACCESS_TOKEN_HEADER);
        if (hasText(fromHeaderAlt)) {
            log.debug("Using bearer token from Access-Token header");
            return fromHeaderAlt;
        }

        String fromQuery = request.getQueryParams().getFirst(AUTHORIZATION_QUERY_PARAM);
        if (hasText(fromQuery)) {
            log.debug("Using bearer token from authorization query param");
            return fromQuery;
        }

        return null;
    }
}


