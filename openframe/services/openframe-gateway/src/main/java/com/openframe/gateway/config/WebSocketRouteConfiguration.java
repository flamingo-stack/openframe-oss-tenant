package com.openframe.gateway.config;

import java.net.URI;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.util.UriComponentsBuilder;

import com.openframe.data.repository.mongo.IntegratedToolRepository;
import com.openframe.data.service.ToolUrlService;
import com.openframe.core.model.ToolUrl;
import com.openframe.core.model.ToolUrlType;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Mono;

@Component
@Slf4j
public class WebSocketRouteConfiguration extends AbstractGatewayFilterFactory<WebSocketRouteConfiguration.Config> {

    private final ToolUrlService toolUrlService;
    private final IntegratedToolRepository toolRepository;

    public WebSocketRouteConfiguration(ToolUrlService toolUrlService, IntegratedToolRepository toolRepository) {
        super(Config.class);
        this.toolUrlService = toolUrlService;
        this.toolRepository = toolRepository;
    }

    public static class Config {
        // Put configuration properties here if needed
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            URI wsUri = UriComponentsBuilder.newInstance()
                    .scheme("ws")
                    .host("tactical-api.192.168.100.100.nip.io")
                    .port("80")
                    .path("natsws")
                    .build()
                    .toUri();

            ServerWebExchange modifiedExchange = exchange.mutate()
                    .request(exchange.getRequest().mutate()
                            .uri(wsUri)
                            .build())
                    .build();

            return chain.filter(modifiedExchange);
        };
    }
} 