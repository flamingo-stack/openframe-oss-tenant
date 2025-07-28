package com.openframe.api.service;

import com.openframe.api.dto.oauth.TokenResponse;
import com.openframe.core.model.OAuthClient;
import com.openframe.data.repository.mongo.OAuthClientRepository;
import com.openframe.security.jwt.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MachineAuthenticationTest {

    @Mock
    private OAuthClientRepository clientRepository;
    
    @Mock
    private JwtService jwtService;

    @InjectMocks
    private OAuthService oauthService;

    @Test
    void clientCredentials_WithValidClient_ShouldReturnToken() {
        // Arrange
        OAuthClient client = new OAuthClient();
        client.setClientId("test_machine");
        client.setClientSecret("test_secret");
        client.setGrantTypes(new String[]{"client_credentials"});
        client.setScopes(new String[]{"metrics:write"});

        when(clientRepository.findByClientId("test_machine")).thenReturn(Optional.of(client));
        when(jwtService.generateToken(any(JwtClaimsSet.class))).thenReturn("test.security.token");

        // Act
        TokenResponse response = oauthService.token(
                "client_credentials", null, null, null,
            "test_machine", "test_secret");

        // Assert
        assertThat(response.getAccessToken()).isNotNull();
        assertThat(response.getTokenType()).isEqualTo("Bearer");
    }
} 