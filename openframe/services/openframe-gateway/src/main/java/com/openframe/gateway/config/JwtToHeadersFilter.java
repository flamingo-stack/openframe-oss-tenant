package com.openframe.gateway.config;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.config.web.server.SecurityWebFiltersOrder;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import com.openframe.security.adapter.UserSecurity;
import com.openframe.security.adapter.OAuthClientSecurity;

@Component
public class JwtToHeadersFilter implements GlobalFilter, Ordered {

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        return ReactiveSecurityContextHolder.getContext()
                .map(SecurityContext::getAuthentication)
                .filter(Authentication::isAuthenticated)
                .map(authentication -> addHeaders(exchange, authentication))
                .defaultIfEmpty(exchange)
                .flatMap(chain::filter);
    }

    private ServerWebExchange addHeaders(ServerWebExchange exchange, Authentication authentication) {
        ServerHttpRequest.Builder requestBuilder = exchange.getRequest().mutate();

        if (authentication.getPrincipal() instanceof UserSecurity userSecurity) {
            requestBuilder
                    .header("X-User-Id", userSecurity.getUser().getId())
                    .header("X-User-Email", userSecurity.getUser().getEmail());

            if (userSecurity.getUser().getFirstName() != null) {
                requestBuilder.header("X-User-FirstName", userSecurity.getUser().getFirstName());
            }

            if (userSecurity.getUser().getLastName() != null) {
                requestBuilder.header("X-User-LastName", userSecurity.getUser().getLastName());
            }

            if (userSecurity.getUser().getRoles() != null && userSecurity.getUser().getRoles().length > 0) {
                requestBuilder.header("X-User-Roles", String.join(",", userSecurity.getUser().getRoles()));
            }
        }
        else if (authentication.getPrincipal() instanceof OAuthClientSecurity clientSecurity) {
            requestBuilder
                    .header("X-Client-Id", clientSecurity.getClient().getClientId())
                    .header("X-Machine-Id", clientSecurity.getClient().getMachineId());

            if (clientSecurity.getClient().getScopes() != null && clientSecurity.getClient().getScopes().length > 0) {
                requestBuilder.header("X-Client-Scopes", String.join(",", clientSecurity.getClient().getScopes()));
            }
        }

        return exchange.mutate().request(requestBuilder.build()).build();
    }

    @Override
    public int getOrder() {
        return SecurityWebFiltersOrder.AUTHORIZATION.getOrder() + 1;
    }
}
