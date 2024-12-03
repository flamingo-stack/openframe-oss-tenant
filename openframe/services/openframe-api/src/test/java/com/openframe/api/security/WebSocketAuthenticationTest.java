package com.openframe.api.security;

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

import com.openframe.api.service.JwtService;

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

        when(jwtService.validateToken("valid.jwt.token")).thenReturn(true);
        when(jwtService.extractMachineId("valid.jwt.token")).thenReturn("test_machine");

        // Act
        interceptor.preSend(message, null);

        // Assert
        verify(jwtService).validateToken("valid.jwt.token");
        verify(jwtService).extractMachineId("valid.jwt.token");
    }
} 