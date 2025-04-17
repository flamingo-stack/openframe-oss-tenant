package com.openframe.gateway.handler;

import lombok.extern.slf4j.Slf4j;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.socket.WebSocketHandler;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import org.springframework.web.reactive.socket.client.ReactorNettyWebSocketClient;
import org.springframework.web.reactive.socket.client.WebSocketClient;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.net.URI;


@Component
@Slf4j
public class ProxyWsHandler implements WebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(IntegrationWsHandler.class);
    private final WebSocketClient client;
    private final String externalWebSocketUrl;

    public ProxyWsHandler() {
        this.client = new ReactorNettyWebSocketClient();
        this.externalWebSocketUrl = "";
    }

    @Override
    public Mono<Void> handle(WebSocketSession clientSession) {
        // Create a sink for each direction to manage the message flow
        Sinks.Many<WebSocketMessage> clientToExternalSink = Sinks.many().unicast().onBackpressureBuffer();
        Sinks.Many<WebSocketMessage> externalToClientSink = Sinks.many().unicast().onBackpressureBuffer();

        // Connect to the external WebSocket
        return client.execute(
                        URI.create(externalWebSocketUrl),
                        externalSession -> {
                            logger.info("Connected to external WebSocket at: {}", externalWebSocketUrl);

                            // Handle messages from client to external service
                            Mono<Void> clientToExternal = clientSession.receive()
                                    .doOnNext(message -> {
                                        logger.debug("Received message from client: {}", message.getPayloadAsText());
                                        WebSocketMessage proxyMessage = externalSession.textMessage(message.getPayloadAsText());
                                        clientToExternalSink.emitNext(proxyMessage, Sinks.EmitFailureHandler.FAIL_FAST);
                                    })
                                    .doOnError(error -> {
                                        logger.error("Error in client to external flow", error);
                                        clientToExternalSink.emitComplete(Sinks.EmitFailureHandler.FAIL_FAST);
                                    })
                                    .doOnComplete(() -> {
                                        logger.info("Client to external flow completed");
                                        clientToExternalSink.emitComplete(Sinks.EmitFailureHandler.FAIL_FAST);
                                    })
                                    .then();

                            // Handle messages from external service to client
                            Mono<Void> externalToClient = externalSession.receive()
                                    .doOnNext(message -> {
                                        logger.debug("Received message from external: {}", message.getPayloadAsText());
                                        WebSocketMessage proxyMessage = clientSession.textMessage(message.getPayloadAsText());
                                        externalToClientSink.emitNext(proxyMessage, Sinks.EmitFailureHandler.FAIL_FAST);
                                    })
                                    .doOnError(error -> {
                                        logger.error("Error in external to client flow", error);
                                        externalToClientSink.emitComplete(Sinks.EmitFailureHandler.FAIL_FAST);
                                    })
                                    .doOnComplete(() -> {
                                        logger.info("External to client flow completed");
                                        externalToClientSink.emitComplete(Sinks.EmitFailureHandler.FAIL_FAST);
                                    })
                                    .then();

                            // Send messages from client to external
                            Mono<Void> sendToExternal = externalSession.send(clientToExternalSink.asFlux());

                            // Send messages from external to client
                            Mono<Void> sendToClient = clientSession.send(externalToClientSink.asFlux());

                            // Combine all operations
                            return Mono.zip(clientToExternal, externalToClient, sendToExternal, sendToClient)
                                    .then()
                                    .doFinally(signalType -> {
                                        logger.info("WebSocket proxy session ended with signal: {}", signalType);
                                    });
                        })
                .onErrorResume(error -> {
                    logger.error("Failed to connect to external WebSocket", error);
                    return clientSession.close();
                });
    }
}