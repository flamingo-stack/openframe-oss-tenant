package com.openframe.security;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.openframe.security.jwt.JwtService;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class WebSocketAuthInterceptor implements ChannelInterceptor {
    
    private final JwtService jwtService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(
            message, StompHeaderAccessor.class);

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = accessor.getFirstNativeHeader("Authorization");
            if (token != null && token.startsWith("Bearer ")) {
                token = token.substring(7);
                if (jwtService.isTokenValid(token, null)) {
                    String username = jwtService.extractUsername(token);
                    SecurityContextHolder.getContext().setAuthentication(
                        new UsernamePasswordAuthenticationToken(username, null, null));
                }
            }
        }
        return message;
    }
} 