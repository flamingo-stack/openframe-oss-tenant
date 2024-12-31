package com.openframe.api.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;

import com.openframe.core.model.User;
import com.openframe.security.UserSecurity;
import com.openframe.security.jwt.JwtService;

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
        // Given
        User user = new User();
        user.setEmail("test@example.com");
        user.setFirstName("Test");
        user.setLastName("User");
        UserSecurity userDetails = new UserSecurity(user);
        
        Jwt jwt = Jwt.withTokenValue("token")
            .header("alg", "RS256")
            .claim("email", "test@example.com")
            .claim("given_name", "Test")
            .claim("family_name", "User")
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plus(1, ChronoUnit.DAYS))
            .build();
        
        when(decoder.decode(anyString())).thenReturn(jwt);
        when(encoder.encode(any())).thenReturn(jwt);

        // When
        String token = jwtService.generateToken(userDetails);

        // Then
        assertThat(token).isNotNull();
        assertThat(jwtService.isTokenValid(token, userDetails)).isTrue();
    }
    
    @Test
    void extractUsername_ShouldReturnCorrectUsername() {
        // Given
        Jwt jwt = Jwt.withTokenValue("token")
            .header("alg", "RS256")
            .claim("email", "test@example.com")
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plus(1, ChronoUnit.DAYS))
            .build();
        
        when(decoder.decode(anyString())).thenReturn(jwt);

        // When
        String username = jwtService.extractUsername("token");

        // Then
        assertThat(username).isEqualTo("test@example.com");
    }
} 