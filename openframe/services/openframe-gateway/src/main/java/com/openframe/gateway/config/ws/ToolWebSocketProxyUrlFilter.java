package com.openframe.gateway.config.ws;

import com.openframe.core.model.IntegratedTool;
import com.openframe.core.model.ToolUrl;
import com.openframe.core.model.ToolUrlType;
import com.openframe.data.repository.mongo.IntegratedToolRepository;
import com.openframe.data.service.ToolUrlService;
import com.openframe.gateway.service.ProxyUrlResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.RouteToRequestUrlFilter;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.util.UriComponentsBuilder;
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
        String path = request.getURI().getPath();

        String toolId = getRequestToolId(path);
        ToolUrl toolUrl = getToolUrl(toolId);

        String endpointPrefix = getEndpointPrefix();
        URI proxyUri = proxyUrlResolver.resolve(toolId, toolUrl, path, endpointPrefix);

        // Create a new request without the origin header
        ServerHttpRequest newRequest = request.mutate()
                .headers(headers -> {
                    headers.remove("Origin");
                    headers.add("Origin", "https://meshcentral.192.168.100.100.nip.io");
                })
                .build();

        exchange.getAttributes()
                .put(ServerWebExchangeUtils.GATEWAY_REQUEST_URL_ATTR, proxyUri);

        return chain.filter(exchange.mutate().request(newRequest).build());
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
