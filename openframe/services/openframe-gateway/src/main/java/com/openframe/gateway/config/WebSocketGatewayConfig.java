package com.openframe.gateway.config;

import com.openframe.security.jwt.JwtAuthenticationOperations;
import com.openframe.security.jwt.JwtService;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.reactive.socket.server.WebSocketService;
import org.springframework.web.reactive.socket.server.support.HandshakeWebSocketService;
import org.springframework.web.reactive.socket.server.upgrade.ReactorNettyRequestUpgradeStrategy;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class WebSocketGatewayConfig {

    static final String WS_ENDPOINT_PREFIX = "/ws/tools/agent";

    /*
           Currently if one device have valid open-frame machine JWT token, it can send WS request,
           make subscriptions for other device.
           TODO: implement device access validation after tool connection feature is implemented.

           Tactical ws request payload format:
           1. {
                "agentId": "*",
              }
           2. SUB {agentId}.{topic}
     */
    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder, WebSocketProxyUrlFilter filter) {
        return builder.routes()
                .route("agent_gateway_websocket_route", r -> r
                        .path(WS_ENDPOINT_PREFIX + "{toolId}/**")
                        .filters(f -> f.filter(filter))
                        .uri("no://op"))
                .build();
    }

    @Bean
    @Primary
    public WebSocketService customWebSocketService(
            JwtService jwtService,
            JwtAuthenticationOperations jwtAuthenticationOperations
    ) {
        ReactorNettyRequestUpgradeStrategy upgradeStrategy = new ReactorNettyRequestUpgradeStrategy();
        HandshakeWebSocketService delegate = new HandshakeWebSocketService(upgradeStrategy);
        return new WebSocketServiceDecorator(delegate, jwtService, jwtAuthenticationOperations);
    }



}
