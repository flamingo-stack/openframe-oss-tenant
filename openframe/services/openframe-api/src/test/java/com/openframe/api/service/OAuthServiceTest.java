package com.openframe.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.openframe.api.dto.oauth.AuthorizationResponse;
import com.openframe.core.model.OAuthClient;
import com.openframe.data.repository.OAuthClientRepository;
import com.openframe.data.repository.OAuthTokenRepository;
import com.openframe.data.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class OAuthServiceTest {

    @Mock
    private OAuthClientRepository clientRepository;
    
    @Mock
    private OAuthTokenRepository tokenRepository;
    
    @Mock
    private UserRepository userRepository;
    
    @Mock
    private JwtService jwtService;

    @InjectMocks
    private OAuthService oauthService;

    @Test
    void authorize_WithValidClient_ShouldReturnAuthCode() {
        // Arrange
        String clientId = "test_client";
        String redirectUri = "http://localhost:3000/callback";
        String scope = "read write";
        String state = "xyz";
        
        OAuthClient client = new OAuthClient();
        client.setClientId(clientId);
        client.setGrantTypes(new String[]{"authorization_code"});
        client.setScopes(new String[]{"read", "write"});
        
        when(clientRepository.findByClientId(clientId)).thenReturn(client);
        
        // Act
        AuthorizationResponse response = oauthService.authorize(
            "code", clientId, redirectUri, scope, state);
        
        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getCode()).isNotNull();
        assertThat(response.getState()).isEqualTo(state);
        assertThat(response.getRedirectUri()).isEqualTo(redirectUri);
        
        verify(clientRepository).findByClientId(clientId);
    }

    @Test
    void token_WithValidAuthorizationCode_ShouldReturnAccessToken() {
        // Test implementation
    }
} 