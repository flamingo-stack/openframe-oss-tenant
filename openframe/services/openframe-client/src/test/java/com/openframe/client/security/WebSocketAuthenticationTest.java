package com.openframe.client.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

import com.openframe.security.WebSocketAuthInterceptor;
import com.openframe.security.jwt.JwtService;

@ExtendWith(MockitoExtension.class)
class WebSocketAuthenticationTest {

    @Mock
    private JwtService jwtService;

    @InjectMocks
    private WebSocketAuthInterceptor interceptor;

    @Test
    void whenValidToken_ShouldAuthenticateConnection() {
        // Arrange
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.addNativeHeader("Authorization", "Bearer valid.jwt.token");

        Message<?> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        when(jwtService.isTokenValid("valid.jwt.token", null)).thenReturn(true);
        when(jwtService.extractUsername("valid.jwt.token")).thenReturn("test_user");

        // Act
        interceptor.preSend(message, null);

        // Assert
        verify(jwtService).isTokenValid("valid.jwt.token", null);
        verify(jwtService).extractUsername("valid.jwt.token");
    }
} 