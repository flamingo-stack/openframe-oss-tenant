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
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.socket.HandshakeInfo;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketSession;
import org.springframework.web.reactive.socket.server.WebSocketService;
import org.springframework.web.reactive.socket.server.support.HandshakeWebSocketService;
import org.springframework.web.reactive.socket.server.upgrade.ReactorNettyRequestUpgradeStrategy;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.Disposable;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.Instant;

import static com.openframe.security.jwt.JwtAuthenticationOperations.AUTHORIZATION_QUERY_PARAM;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class WebSocketGatewayConfig {

    static final String WS_ENDPOINT_PREFIX = "/ws/tools/agent";

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder, WebSocketIntegrationFilter filter) {
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
