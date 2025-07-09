package com.openframe.gateway.config.ws;

import com.openframe.core.model.IntegratedTool;
import com.openframe.core.model.ToolUrl;
import com.openframe.core.model.ToolUrlType;
import com.openframe.core.service.ProxyUrlResolver;
import com.openframe.data.repository.mongo.IntegratedToolRepository;
import com.openframe.data.service.ToolUrlService;
import lombok.RequiredArgsConstructor;
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
public abstract class ToolWebSocketProxyUrlFilter implements GatewayFilter, Ordered {

    private final IntegratedToolRepository toolRepository;
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
        ToolUrl toolUrl = getToolUrl(toolId);

        String endpointPrefix = getEndpointPrefix();
        URI proxyUri = proxyUrlResolver.resolve(toolId, toolUrl, requestUri, endpointPrefix);

        exchange.getAttributes()
                .put(ServerWebExchangeUtils.GATEWAY_REQUEST_URL_ATTR, proxyUri);

        return chain.filter(exchange);
    }

    private ToolUrl getToolUrl(String toolId) {
        IntegratedTool tool = toolRepository.findById(toolId)
                .orElseThrow(() -> new IllegalArgumentException("Tool not found: " + toolId));

        if (!tool.isEnabled()) {
            throw new IllegalArgumentException("Tool " + tool.getName() + " is not enabled");
        }

        return toolUrlService.getUrlByToolType(tool, ToolUrlType.WS)
                .orElseThrow(() -> new IllegalArgumentException("Tool " + tool.getName() + " have no web socket url"));
    }

    protected abstract String getRequestToolId(String path);

    protected abstract String getEndpointPrefix();

}
