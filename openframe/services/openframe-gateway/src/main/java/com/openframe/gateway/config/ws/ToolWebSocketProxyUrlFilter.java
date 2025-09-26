package com.openframe.gateway.config.ws;

import com.openframe.core.service.ProxyUrlResolver;
import com.openframe.data.document.tool.ToolUrl;
import com.openframe.data.document.tool.ToolUrlType;
import com.openframe.data.reactive.repository.tool.ReactiveIntegratedToolRepository;
import com.openframe.data.service.ToolUrlService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.RouteToRequestUrlFilter;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.net.URI;

@RequiredArgsConstructor
@Slf4j
public abstract class ToolWebSocketProxyUrlFilter implements GatewayFilter, Ordered {

    private final ReactiveIntegratedToolRepository toolRepository;
    private final ToolUrlService toolUrlService;
    private final ProxyUrlResolver proxyUrlResolver;

    @Override
    public int getOrder() {
        return RouteToRequestUrlFilter.ROUTE_TO_URL_FILTER_ORDER + 1;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        URI requestUri = request.getURI();
        String path = requestUri.getPath();

        String toolId = getRequestToolId(path);

        return getToolUrl(toolId)
                .flatMap(toolUrl -> {
                    String endpointPrefix = getEndpointPrefix();
                    URI proxyUri = proxyUrlResolver.resolve(toolId, toolUrl.getUrl(), toolUrl.getPort(), requestUri, endpointPrefix);

                    log.info("Proxy web socket request: {}", proxyUri);

                    exchange.getAttributes()
                            .put(ServerWebExchangeUtils.GATEWAY_REQUEST_URL_ATTR, proxyUri);

                    return chain.filter(exchange);
                });
    }

    private Mono<ToolUrl> getToolUrl(String toolId) {
        return toolRepository.findById(toolId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Tool not found: " + toolId)))
                .flatMap(tool -> {
                    if (!tool.isEnabled()) {
                        return Mono.error(new IllegalArgumentException("Tool " + tool.getName() + " is not enabled"));
                    }

                    return toolUrlService.getUrlByToolType(tool, ToolUrlType.WS)
                            .map(Mono::just)
                            .orElse(Mono.error(new IllegalArgumentException("Tool " + tool.getName() + " have no web socket url")));
                });
    }

    protected abstract String getRequestToolId(String path);

    protected abstract String getEndpointPrefix();

}
