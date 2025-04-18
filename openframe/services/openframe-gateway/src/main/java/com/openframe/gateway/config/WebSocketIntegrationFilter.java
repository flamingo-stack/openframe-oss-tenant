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
import java.net.URISyntaxException;

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
        String toolId = path.split("/")[4];

        IntegratedTool tool = toolRepository.findById(toolId)
                .orElseThrow(() -> new IllegalArgumentException("Invalid tool id: " + toolId));
        if (!tool.isEnabled()) {
            // TODO: use other exception
            throw new IllegalArgumentException("Tool " + tool.getName() + " is not enabled");
        }

        ToolUrl toolUrl = toolUrlService.getUrlByToolType(tool, ToolUrlType.WS)
                .orElseThrow(() -> new IllegalArgumentException("Tool " + tool.getName() + " have no web socket url"));

        URI toolUri = null;
        try {
            toolUri = new URI(toolUrl.getUrl());
        } catch (URISyntaxException e) {
            throw new RuntimeException(e);
        }

        String pathSuffix = path.replaceFirst("^/ws/tools/agent/" + toolId + "/", "");

         URI modifiedUri = UriComponentsBuilder.newInstance()
                 .scheme(toolUri.getScheme())
                 .host(toolUri.getHost())
                 .port(toolUrl.getPort())
                 .replacePath(pathSuffix)
                 .build()
                 .toUri();

//        URI modifiedUri = UriComponentsBuilder.newInstance()
//                .scheme("ws")
//                .host("tactical-nginx.integrated-tools.svc.cluster.local")
//                .port("8000")
//                .replacePath("natsws")
//                .build()
//                .toUri();

        exchange.getAttributes().put(ServerWebExchangeUtils.GATEWAY_REQUEST_URL_ATTR, modifiedUri);

        return chain.filter(exchange);
    }
}