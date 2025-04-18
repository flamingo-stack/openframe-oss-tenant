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
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.socket.HandshakeInfo;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.server.WebSocketService;
import org.springframework.web.reactive.socket.server.support.HandshakeWebSocketService;
import org.springframework.web.reactive.socket.server.upgrade.ReactorNettyRequestUpgradeStrategy;
import reactor.core.Disposable;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.Instant;

import static com.openframe.security.jwt.JwtAuthenticationOperations.AUTHORISATION_QUERY_PARAM;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class WebSocketGatewayConfig {

    private final JwtAuthenticationOperations jwtAuthenticationOperations;
    private final JwtService jwtService;
    private final WebSocketIntegrationFilter webSocketIntegrationFilter;

    @Bean
    @Primary
    public WebSocketService customWebSocketService() {
        ReactorNettyRequestUpgradeStrategy upgradeStrategy = new ReactorNettyRequestUpgradeStrategy();
        HandshakeWebSocketService delegate = new HandshakeWebSocketService(upgradeStrategy);
        return (exchange, handler) -> {
            WebSocketHandler wrapper = session -> {
                log.info("Handling request: {}", session.getId());
                HandshakeInfo handshakeInfo = session.getHandshakeInfo();
                log.info("HandshakeInfo: {}", handshakeInfo);
                MultiValueMap<String, String> queryParams = exchange.getRequest().getQueryParams();
                log.info("QueryParams: {}", queryParams);

                String authorization = queryParams.getFirst(AUTHORISATION_QUERY_PARAM);
                String jwt = jwtAuthenticationOperations.extractJwt(authorization);
                Jwt decodedJwt = jwtService.decodeToken(jwt);
                Instant expiresAt = decodedJwt.getExpiresAt();
                long secondsUntilExpiration = Duration.between(Instant.now(), expiresAt).getSeconds();

                Disposable disposable = Mono.delay(Duration.ofSeconds(secondsUntilExpiration))
                        .subscribe(__ -> {
                            log.info("Closing session: {}", session.getId());
                            session.close();
                            // TODO: process exceptions and success
                            log.info("Closed session: {}", session.getId());
                        });

                session.closeStatus()
                        .subscribe(status -> {
                            // TODO: imrove logs
                            log.info("Session {} closed with status: {}", session.getId(), status);
                            disposable.dispose();
                        });


                return handler.handle(session);
            };
            return delegate.handleRequest(exchange, wrapper);
        };
    }

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
                .route("dynamic_websocket_route", r -> r
                        .path("/ws/tools/agent/{toolId}/**")
                        .filters(f -> f
                            .filter(webSocketIntegrationFilter)
                        )
                        .uri("no://op"))
//                .uri("ws://tactical-nginx.integrated-tools.svc.cluster.local:8000/natsws"))
                .build();
    }
}
