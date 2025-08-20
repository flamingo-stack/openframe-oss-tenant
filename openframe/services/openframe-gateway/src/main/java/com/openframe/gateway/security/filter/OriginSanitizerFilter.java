package com.openframe.gateway.security.filter;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class OriginSanitizerFilter implements WebFilter {
    private static final String ORIGIN = "Origin";

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String origin = exchange.getRequest().getHeaders().getFirst(ORIGIN);
        if (origin != null && "null".equalsIgnoreCase(origin.trim())) {
            ServerHttpRequest mutated = exchange.getRequest()
                .mutate()
                .headers(h -> h.remove(ORIGIN))
                .build();
            return chain.filter(exchange.mutate().request(mutated).build());
        }
        return chain.filter(exchange);
    }
}


