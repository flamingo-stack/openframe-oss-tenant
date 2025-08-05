package com.openframe.gateway.config.ws.nats;

import lombok.RequiredArgsConstructor;
import lombok.experimental.Delegate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.reactive.socket.WebSocketMessage;
import org.springframework.web.reactive.socket.WebSocketSession;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Slf4j
@RequiredArgsConstructor
public class NatsWebSocketSessionWrapper implements WebSocketSession {

    @Delegate
    private final WebSocketSession delegate;
    private final NatsMessageValidator natsMessageValidator;
    private final Jwt jwt;

    
    @Override
    public Flux<WebSocketMessage> receive() {
        return delegate.receive()
                .handle((message, sink) -> {
                    // TODO: message
                    String payload = message.getPayloadAsText();
                    log.debug("Received nats message:" + payload);
                    sink.next(message);
//                    NatsMessageValidationResult validationResult = natsMessageValidator.validate(payload, jwt);
//                    if (!validationResult.isValid()) {
//                        sink.next(message);
//                    } else {
//                        String validationMessage = validationResult.getMessage();
//                        delegate.send(Mono.just(delegate.textMessage(validationMessage)));
//                    }
                });
    }
}
