package com.openframe.api.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.openframe.api.TestUtils;
import com.openframe.api.dto.oauth.TokenResponse;
import com.openframe.api.exception.GlobalExceptionHandler;
import com.openframe.api.service.OAuthService;

@ExtendWith(MockitoExtension.class)
class OAuthControllerTest {

    @Mock
    private OAuthService oauthService;

    @InjectMocks
    private OAuthController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();
    }

    @Test
    void authorize_WithValidRequest_ShouldReturnAuthCode() throws Exception {
        when(oauthService.authorize(any(), any(), any(), any(), any()))
            .thenReturn(TestUtils.createTestAuthResponse());

        mockMvc.perform(post("/oauth/authorize")
                .param("response_type", "code")
                .param("client_id", "test_client")
                .param("redirect_uri", "http://localhost/callback"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").exists());
    }

    @Test
    void token_WithAuthorizationCode_ShouldReturnAccessToken() throws Exception {
        TokenResponse mockResponse = TokenResponse.builder()
            .accessToken("test.token")
            .tokenType("Bearer")
            .expiresIn(3600)
            .build();

        when(oauthService.token(any(), any(), any(), any(), any(), any(), any()))
            .thenReturn(mockResponse);

        mockMvc.perform(post("/oauth/token")
                .param("grant_type", "authorization_code")
                .param("code", "test_code")
                .param("client_id", "test_client")
                .param("client_secret", "test_secret"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token").exists())
                .andExpect(jsonPath("$.token_type").value("Bearer"));
    }
} 