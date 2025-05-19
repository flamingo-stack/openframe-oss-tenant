package com.openframe.gateway.config.ws;

import com.openframe.core.model.*;
import com.openframe.data.repository.mongo.IntegratedToolRepository;
import com.openframe.data.service.ToolUrlService;
import com.openframe.gateway.service.ProxyUrlResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.RouteToRequestUrlFilter;
import org.springframework.cloud.gateway.support.ServerWebExchangeUtils;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Mono;

import java.net.URI;

import static com.openframe.gateway.config.ws.WebSocketGatewayConfig.TOOLS_API_WS_ENDPOINT_PREFIX;

@Component
public class ToolApiWebSocketProxyUrlFilter extends ToolWebSocketProxyUrlFilter {

    public ToolApiWebSocketProxyUrlFilter(
            IntegratedToolRepository toolRepository,
            ToolUrlService toolUrlService,
            ProxyUrlResolver proxyUrlResolver
    ) {
        super(toolRepository, toolUrlService, proxyUrlResolver);
    }

    @Override
    protected String getRequestToolId(String path) {
        return path.split("/")[3];
    }

    @Override
    protected String getEndpointPrefix() {
        return TOOLS_API_WS_ENDPOINT_PREFIX;
    }
}
