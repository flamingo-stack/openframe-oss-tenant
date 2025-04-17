package com.openframe.gateway.handler;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class IntegrationWsHandler implements WebSocketHandler {

    private final Sinks.Many<String> messageSink = Sinks.many().multicast().directBestEffort();
    private final Flux<String> messageFlux = messageSink.asFlux().share();
    private final Set<WebSocketSession> sessions = ConcurrentHashMap.newKeySet();

    @Override
    public Mono<Void> handle(WebSocketSession session) {
        log.info("Headers: {}", session.getHandshakeInfo().getHeaders());
        log.info("Subscribed to WebSocket with ID: {}", session.getId());

        sessions.add(session);

        return session.receive()
                .doOnNext(message -> {
                    try {
                        String payloadAsText = message.getPayloadAsText();
                        log.info("Received message from {}: {}", session.getId(), payloadAsText);

                        session.send(Mono.just(session.textMessage("Echo: " + payloadAsText)))
                               .subscribe();

                        messageSink.tryEmitNext(payloadAsText);
                    } catch (Exception e) {
                        log.error("Message processing error: {}", e.getMessage(), e);
                    }
                })
                .doOnError(e -> {
                    log.error("WebSocket error for session {}: {}", session.getId(), e.getMessage(), e);
                    sessions.remove(session);
                })
                .doOnComplete(() -> {
                    log.info("WebSocket stream completed for session {}", session.getId());
                    sessions.remove(session);
                })
                .doOnCancel(() -> {
                    log.info("WebSocket stream cancelled for session {}", session.getId());
                    sessions.remove(session);
                })
                .then();
    }
}