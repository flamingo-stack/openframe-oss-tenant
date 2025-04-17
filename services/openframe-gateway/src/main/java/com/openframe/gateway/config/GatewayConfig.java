package com.openframe.gateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class GatewayConfig {

    private final WebSocketRouteConfiguration webSocketRouteConfig;
    private final Environment environment;

    private boolean isLocalProfile() {
        for (String profile : environment.getActiveProfiles()) {
            if (profile.equals("local")) {
                return true;
            }
        }
        return environment.getActiveProfiles().length == 0;
    }

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
                .route("dynamic_websocket_route", r -> r
                        .path("/tools/{toolId}/**")
                        // .filters(f -> f.filter(webSocketRouteConfig.apply(new WebSocketRouteConfiguration.Config())))
                        .uri("ws://tactical-api.192.168.100.100.nip.io:80/natsws"))
                .build();
    }
}
