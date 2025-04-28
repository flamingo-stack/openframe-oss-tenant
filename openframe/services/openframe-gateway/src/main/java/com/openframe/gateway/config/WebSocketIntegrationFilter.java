package com.openframe.gateway.config;

import com.openframe.core.model.IntegratedTool;
import com.openframe.core.model.ToolUrl;
import com.openframe.core.model.ToolUrlType;
import com.openframe.data.repository.mongo.IntegratedToolRepository;
import com.openframe.data.service.ToolUrlService;
import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.RouteToRequestUrlFilter;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.core.Ordered;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Mono;

import java.net.URI;

import static com.openframe.gateway.config.WebSocketGatewayConfig.WS_ENDPOINT_PREFIX;

@Component
@RequiredArgsConstructor
public class WebSocketIntegrationFilter implements GatewayFilter, Ordered {

    private final IntegratedToolRepository toolRepository;
    private final ToolUrlService toolUrlService;

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
        URI toolUri = buildURI(toolUrl.getUrl());

        String proxyPath = getProxyPath(path, toolId);

        URI proxyUri = UriComponentsBuilder.newInstance()
                 .scheme(toolUri.getScheme())
                 .host(toolUri.getHost())
                 .port(toolUrl.getPort())
                 .replacePath(proxyPath)
                 .build()
                 .toUri();

        exchange.getAttributes()
                .put(ServerWebExchangeUtils.GATEWAY_REQUEST_URL_ATTR, proxyUri);

        return chain.filter(exchange);
    }

    private String getRequestToolId(String path) {
        return path.split("/")[4];
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

    private String getProxyPath(String path, String toolId) {
        return path.replaceFirst(WS_ENDPOINT_PREFIX + toolId + "/", "");
    }

    private URI buildURI(String uri) {
        try {
            return new URI(uri);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}