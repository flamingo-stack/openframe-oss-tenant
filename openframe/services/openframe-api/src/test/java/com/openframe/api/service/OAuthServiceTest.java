package com.openframe.api.service;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

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
        OAuthClient client = new OAuthClient();
        client.setClientId("test_client");
        
        when(clientRepository.findByClientId("test_client")).thenReturn(client);

        var response = oauthService.authorize("code", "test_client", 
            "http://localhost/callback", "read", "test_state");

        assertThat(response.getCode()).isNotNull();
        assertThat(response.getState()).isEqualTo("test_state");
    }

    @Test
    void token_WithValidAuthorizationCode_ShouldReturnAccessToken() {
        // Test implementation
    }
} 