package com.openframe.api;

import java.lang.reflect.Field;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openframe.api.dto.oauth.AuthorizationResponse;
import com.openframe.api.dto.oauth.TokenResponse;
import com.openframe.core.model.OAuthClient;
import com.openframe.core.model.OAuthToken;

public final class TestUtils {
    private static final ObjectMapper objectMapper = new ObjectMapper();

    private TestUtils() {}

    public static String asJsonString(final Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static void setPrivateField(Object target, String fieldName, Object value) {
        try {
            Field field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public static OAuthClient createTestClient() {
        OAuthClient client = new OAuthClient();
        client.setClientId(TestConstants.TEST_CLIENT_ID);
        client.setClientSecret(TestConstants.TEST_CLIENT_SECRET);
        client.setRedirectUris(new String[]{"http://localhost/callback"});
        client.setGrantTypes(new String[]{"authorization_code", "refresh_token"});
        client.setScopes(new String[]{"read", "write"});
        return client;
    }

    public static OAuthToken createTestToken() {
        OAuthToken token = new OAuthToken();
        token.setAccessToken(TestConstants.TEST_ACCESS_TOKEN);
        token.setRefreshToken(TestConstants.TEST_REFRESH_TOKEN);
        token.setClientId(TestConstants.TEST_CLIENT_ID);
        return token;
    }

    public static TokenResponse createTestTokenResponse() {
        return TokenResponse.builder()
            .accessToken(TestConstants.TEST_ACCESS_TOKEN)
            .refreshToken(TestConstants.TEST_REFRESH_TOKEN)
            .tokenType("Bearer")
            .expiresIn(3600)
            .build();
    }

    public static AuthorizationResponse createTestAuthResponse() {
        return AuthorizationResponse.builder()
            .code(TestConstants.TEST_AUTH_CODE)
            .state("test_state")
            .redirectUri("http://localhost/callback")
            .build();
    }
} 