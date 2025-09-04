package com.openframe.client.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class WebSocketAuthenticationTest {

    @Mock
    private MessageChannel messageChannel;

    @InjectMocks
    private WebSocketAuthInterceptor interceptor;

    @Test
    void whenValidHeaders_ShouldAuthenticateConnection() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setLeaveMutable(true);
        accessor.addNativeHeader("X-User-Id", "test-user-id");
        accessor.addNativeHeader("X-User-Email", "test@example.com");
        accessor.addNativeHeader("X-User-Roles", "USER");
        Message<?> message = MessageBuilder.createMessage("payload", accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, messageChannel);

        assertNotNull(result);
        StompHeaderAccessor resultAccessor = StompHeaderAccessor.wrap(result);
        assertNotNull(resultAccessor);
        assertNotNull(resultAccessor.getUser());
        assertEquals("test-user-id", resultAccessor.getUser().getName());
    }
}