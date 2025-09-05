package com.openframe.gateway.config.ws;

import com.openframe.core.service.ProxyUrlResolver;
import com.openframe.data.reactive.repository.tool.ReactiveIntegratedToolRepository;
import com.openframe.data.service.ToolUrlService;
import org.springframework.stereotype.Component;

import static com.openframe.gateway.config.ws.WebSocketGatewayConfig.TOOLS_API_WS_ENDPOINT_PREFIX;

@Component
public class ToolApiWebSocketProxyUrlFilter extends ToolWebSocketProxyUrlFilter {

    public ToolApiWebSocketProxyUrlFilter(
            ReactiveIntegratedToolRepository toolRepository,
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
