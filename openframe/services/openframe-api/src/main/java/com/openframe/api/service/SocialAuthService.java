package com.openframe.api.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.openframe.api.dto.oauth.TokenResponse;
import com.openframe.api.exception.SocialAuthException;
import com.openframe.core.model.User;
import com.openframe.data.repository.mongo.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class SocialAuthService {
    private final GoogleIdTokenVerifier googleVerifier;
    private final OAuthService oauthService;
    private final UserRepository userRepository;

    @Value("${security.oauth2.token.access.expiration-seconds}")
    private int accessTokenExpirationSeconds;

    public TokenResponse authenticate(String provider, String token) {
        return switch (provider.toLowerCase()) {
            case "google" -> {
                User user = validateGoogleToken(token);
                user = findOrCreateUser(user);
                String accessToken = oauthService.generateAccessToken(user, "social");
                String refreshToken = oauthService.generateRefreshToken(user.getId());
                yield TokenResponse.builder()
                        .accessToken(accessToken)
                        .refreshToken(refreshToken)
                        .tokenType("Bearer")
                        .expiresIn(accessTokenExpirationSeconds)
                        .build();
            }
            default -> throw new SocialAuthException("unsupported_provider", "Unsupported provider: " + provider);
        };
    }

    private User validateGoogleToken(String token) {
        try {
            var idToken = googleVerifier.verify(token);
            if (idToken == null) {
                throw new SocialAuthException("invalid_token", "Invalid Google token");
            }

            var payload = idToken.getPayload();
            String email = payload.getEmail();
            String name = (String) payload.get("name");

            return User.builder()
                    .email(email)
                    .firstName(name)
                    .roles(new String[]{"USER"})
                    .build();

        } catch (Exception e) {
            log.error("Error validating Google token: {}", e.getMessage());
            throw new SocialAuthException("invalid_token", "Invalid Google token");
        }
    }

    private User findOrCreateUser(User user) {
        return userRepository.findByEmail(user.getEmail())
                .orElseGet(() -> userRepository.save(user));
    }
} 