package com.openframe.gateway.config.ws;

import com.openframe.data.repository.mongo.IntegratedToolRepository;
import com.openframe.data.service.ToolUrlService;
import com.openframe.gateway.service.ProxyUrlResolver;
import org.springframework.stereotype.Component;

import static com.openframe.gateway.config.ws.WebSocketGatewayConfig.TOOLS_AGENT_WS_ENDPOINT_PREFIX;

@Component
public class ToolAgentWebSocketProxyUrlFilter extends ToolWebSocketProxyUrlFilter {

    public ToolAgentWebSocketProxyUrlFilter(
            IntegratedToolRepository toolRepository,
            ToolUrlService toolUrlService,
            ProxyUrlResolver proxyUrlResolver
    ) {
        super(toolRepository, toolUrlService, proxyUrlResolver);
    }

    @Override
    protected String getRequestToolId(String path) {
        return path.split("/")[4];
    }

    @Override
    protected String getEndpointPrefix() {
        return TOOLS_AGENT_WS_ENDPOINT_PREFIX;
    }

}