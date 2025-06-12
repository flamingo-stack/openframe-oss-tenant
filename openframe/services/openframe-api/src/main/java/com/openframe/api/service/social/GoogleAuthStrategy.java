package com.openframe.api.service.social;

import com.google.api.client.auth.oauth2.TokenResponse;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.openframe.api.dto.oauth.SocialAuthRequest;
import com.openframe.api.exception.SocialAuthException;
import com.openframe.api.service.OAuthService;
import com.openframe.core.model.User;
import com.openframe.data.repository.mongo.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.security.GeneralSecurityException;

@Slf4j
@Component
@RequiredArgsConstructor
public class GoogleAuthStrategy implements SocialAuthStrategy {
    private final GoogleIdTokenVerifier googleVerifier;
    private final OAuthService oauthService;
    private final UserRepository userRepository;

    @Value("${security.oauth2.google.client-id}")
    private String clientId;

    @Value("${security.oauth2.google.client-secret}")
    private String clientSecret;

    @Value("${security.oauth2.token.access.expiration-seconds}")
    private int accessTokenExpirationSeconds;

    @Override
    public com.openframe.api.dto.oauth.TokenResponse authenticate(SocialAuthRequest request) {
        validateRequest(request);
        
        try {
            TokenResponse tokenResponse = exchangeCodeForToken(request);
            GoogleIdToken googleIdToken = verifyAndParseIdToken(tokenResponse);
            User user = findOrCreateUser(googleIdToken.getPayload());
            return generateAppTokens(user);
        } catch (IOException | GeneralSecurityException e) {
            log.error("Error exchanging Google code for token: {}", e.getMessage());
            throw new SocialAuthException("token_exchange_failed", "Failed to exchange authorization code for token");
        }
    }

    @Override
    public String getProviderName() {
        return "google";
    }

    private void validateRequest(SocialAuthRequest request) {
        if (request.getCode() == null || request.getCode_verifier() == null || request.getRedirect_uri() == null) {
            throw new SocialAuthException("invalid_request", "Code, code_verifier and redirect_uri are required");
        }
    }

    private TokenResponse exchangeCodeForToken(SocialAuthRequest request) throws IOException {
        return new GoogleAuthorizationCodeTokenRequest(
            new NetHttpTransport(),
            new GsonFactory(),
            "https://oauth2.googleapis.com/token",
            clientId,
            clientSecret,
            request.getCode(),
            request.getRedirect_uri()
        )
        .set("code_verifier", request.getCode_verifier())
        .execute();
    }

    private GoogleIdToken verifyAndParseIdToken(TokenResponse tokenResponse) throws GeneralSecurityException, IOException {
        String idToken = (String) tokenResponse.get("id_token");
        GoogleIdToken googleIdToken = googleVerifier.verify(idToken);
        if (googleIdToken == null) {
            throw new SocialAuthException("invalid_token", "Invalid ID token");
        }
        return googleIdToken;
    }

    private User findOrCreateUser(Payload payload) {
        String email = payload.getEmail();
        String firstName = (String) payload.get("given_name");
        String lastName = (String) payload.get("family_name");

        return userRepository.findByEmail(email)
            .orElseGet(() -> {
                User newUser = User.builder()
                    .email(email)
                    .firstName(firstName)
                    .lastName(lastName)
                    .roles(new String[]{"USER"})
                    .build();
                return userRepository.save(newUser);
            });
    }

    private com.openframe.api.dto.oauth.TokenResponse generateAppTokens(User user) {
        String accessToken = oauthService.generateAccessToken(user, "social");
        String refreshToken = oauthService.generateRefreshToken(user.getId());

        return com.openframe.api.dto.oauth.TokenResponse.builder()
            .accessToken(accessToken)
            .refreshToken(refreshToken)
            .tokenType("Bearer")
            .expiresIn(accessTokenExpirationSeconds)
            .build();
    }
} 