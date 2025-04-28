package com.openframe.gateway.config;

import com.openframe.security.jwt.JwtAuthenticationOperations;
import com.openframe.security.jwt.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketSession;
import org.springframework.web.reactive.socket.server.WebSocketService;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.Disposable;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.Instant;

import static com.openframe.security.jwt.JwtAuthenticationOperations.AUTHORIZATION_QUERY_PARAM;

@RequiredArgsConstructor
@Slf4j
public class WebSocketServiceDecorator implements WebSocketService {

    private final WebSocketService delegate;
    private final JwtService jwtService;
    private final JwtAuthenticationOperations jwtAuthenticationOperations;

    @Override
    public Mono<Void> handleRequest(ServerWebExchange exchange, WebSocketHandler webSocketHandler) {
        return delegate.handleRequest(exchange, session -> {
            Jwt jwt = getRequestJwt(exchange);
            Instant expiresAt = jwt.getExpiresAt();
            long secondsUntilExpiration = Duration.between(Instant.now(), expiresAt).getSeconds();

            Disposable disposable = scheduleSessionRemoveJob(session, secondsUntilExpiration);
            processSessionClosedEvent(session, disposable);

            return webSocketHandler.handle(session);
        });
    }

    private Jwt getRequestJwt(ServerWebExchange exchange) {
        ServerHttpRequest request = exchange.getRequest();
        MultiValueMap<String, String> queryParams = request.getQueryParams();
        String authorisation = queryParams.getFirst(AUTHORIZATION_QUERY_PARAM);
        String jwt = jwtAuthenticationOperations.extractJwt(authorisation);
        return jwtService.decodeToken(jwt);
    }

    private Disposable scheduleSessionRemoveJob(WebSocketSession session, long secondsUntilExpiration) {
        String sessionId = session.getId();
        log.info("Scheduling session remove job: {} - {} seconds", sessionId, secondsUntilExpiration);
        return Mono.delay(Duration.ofSeconds(secondsUntilExpiration))
                .flatMap(__ -> {
                    log.info("Executing session remove job: {}", sessionId);
                    return session.close()
                            .doOnSuccess(___ -> log.info("Closed session: {}", sessionId))
                            .doOnError(ex -> log.error("Failed to close session {}", sessionId, ex));
                })
                .subscribe();
    }

    private void processSessionClosedEvent(WebSocketSession session, Disposable disposable) {
        session.closeStatus()
                .subscribe(status -> {
                    log.info("Session {} has been closed with status {}", session.getId(), status);
                    log.info("Cancelling session remove job: {}", session.getId());
                    disposable.dispose();
                    log.info("Cancelled session remove job: {}", session.getId());
                });
    }
}
