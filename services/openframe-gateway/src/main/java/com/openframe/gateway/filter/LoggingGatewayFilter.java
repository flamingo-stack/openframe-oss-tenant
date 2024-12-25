package com.openframe.gateway.filter;

import javax.annotation.PostConstruct;

import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.cloud.gateway.route.Route;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;

import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Mono;

@Slf4j
@Component("LoggingGatewayFilter")
public class LoggingGatewayFilter implements GlobalFilter, Ordered {

    @PostConstruct
    public void init() {
        log.info("Initializing LoggingGatewayFilter");
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        log.info("LoggingGatewayFilter is processing a request");
        
        Route route = exchange.getAttribute(ServerWebExchangeUtils.GATEWAY_ROUTE_ATTR);
        log.info("Route found: {}", route != null ? route.getId() : "null");
        
        if (route != null) {
            String proxiedUrl = route.getUri().toString() + exchange.getRequest().getPath().value().replace("/tools", "");
            log.info("Proxied URL will be: {}", proxiedUrl);
            
            StringBuilder curl = new StringBuilder("curl '");
            curl.append(proxiedUrl).append("' \\\n");
            
            // Add method
            curl.append("  -X '").append(exchange.getRequest().getMethod()).append("' \\\n");
            
            // Add headers
            HttpHeaders headers = exchange.getRequest().getHeaders();
            headers.forEach((name, values) -> {
                values.forEach(value -> {
                    curl.append("  -H '").append(name).append(": ").append(value).append("' \\\n");
                });
            });

            // Get the body content
            return exchange.getRequest()
                .getBody()
                .map(dataBuffer -> {
                    byte[] bytes = new byte[dataBuffer.readableByteCount()];
                    dataBuffer.read(bytes);
                    return new String(bytes);
                })
                .collectList()
                .defaultIfEmpty(java.util.Collections.emptyList())
                .flatMap(bodyParts -> {
                    String bodyContent = String.join("", bodyParts);
                    if (!bodyContent.isEmpty()) {
                        curl.append("  --data-raw '").append(bodyContent).append("'");
                    }
                    log.info("Proxied request as curl command: \n{}", curl.toString());
                    return chain.filter(exchange);
                });
        }
        
        log.info("No route found, passing through");
        return chain.filter(exchange);
    }

    @Override
    public int getOrder() {
        // Run after route predicate evaluation but before the route is executed
        return 1;
    }
} 