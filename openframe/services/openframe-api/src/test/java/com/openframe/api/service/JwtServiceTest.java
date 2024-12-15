package com.openframe.api.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;

import com.openframe.api.security.JwtService;
import com.openframe.api.security.UserSecurity;
import com.openframe.core.model.User;

@ExtendWith(MockitoExtension.class)
class JwtServiceTest {
    
    @Mock
    private JwtEncoder encoder;
    
    @Mock
    private JwtDecoder decoder;
    
    @InjectMocks
    private JwtService jwtService;
    
    @Test
    void generateToken_ShouldCreateValidToken() {
        // Arrange
        User user = new User();
        user.setEmail("test@example.com");
        UserDetails userDetails = new UserSecurity(user);
        
        when(encoder.encode(any(JwtEncoderParameters.class)))
            .thenReturn(createMockJwt("test.token"));
        
        when(decoder.decode("test.token"))
            .thenReturn(Jwt.withTokenValue("test.token")
                .header("alg", "RS256")
                .subject("test@example.com")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plus(1, ChronoUnit.DAYS))
                .build());
        
        // Act
        String token = jwtService.generateToken(userDetails);
        
        // Assert
        assertThat(token).isNotNull();
        assertThat(jwtService.isTokenValid(token, userDetails)).isTrue();
    }
    
    @Test
    void extractUsername_ShouldReturnCorrectUsername() {
        // Arrange
        String token = "test.token";
        when(decoder.decode(token))
            .thenReturn(Jwt.withTokenValue(token)
                .header("alg", "RS256")
                .subject("test@example.com")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plus(1, ChronoUnit.DAYS))
                .build());
        
        // Act
        String username = jwtService.extractUsername(token);
        
        // Assert
        assertThat(username).isEqualTo("test@example.com");
    }

    private Jwt createMockJwt(String tokenValue) {
        return Jwt.withTokenValue(tokenValue)
            .header("alg", "RS256")
            .subject("test@example.com")
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plus(1, ChronoUnit.DAYS))
            .build();
    }
} 