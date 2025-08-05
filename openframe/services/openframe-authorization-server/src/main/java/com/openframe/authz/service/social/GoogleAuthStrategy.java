package com.openframe.authz.service.social;

import com.google.api.client.auth.oauth2.TokenResponse;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken.Payload;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.openframe.authz.dto.SSOProvider;
import com.openframe.authz.dto.SocialAuthRequest;
import com.openframe.authz.exception.SocialAuthException;
import com.openframe.authz.service.OAuthService;
import com.openframe.authz.document.User;
import com.openframe.authz.repository.TenantAwareSSOConfigRepository;
import com.openframe.authz.repository.UserRepository;
import com.openframe.core.model.SSOConfig;
import com.openframe.core.service.EncryptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class GoogleAuthStrategy implements SocialAuthStrategy {
    private final OAuthService oauthService;
    private final UserRepository userRepository;
    private final TenantAwareSSOConfigRepository ssoConfigRepository;
    private final EncryptionService encryptionService;

    @Value("${openframe.security.jwt.access-token-expiration:900}")
    private int accessTokenExpirationSeconds;

    @Override
    public com.openframe.authz.dto.TokenResponse authenticate(SocialAuthRequest request) {
        validateRequest(request);

        SSOConfig googleConfig = getGoogleConfig();
        String clientSecret = encryptionService.decryptClientSecret(googleConfig.getClientSecret());

        if (clientSecret == null) {
            throw new SocialAuthException("client_secret_not_found", "Client secret not found or could not be decrypted");
        }
        
        try {
            TokenResponse tokenResponse = exchangeCodeForToken(request, googleConfig.getClientId(), clientSecret);
            GoogleIdToken googleIdToken = verifyAndParseIdToken(tokenResponse, googleConfig.getClientId());
            User user = findOrCreateUser(googleIdToken.getPayload(), "default"); // TODO: get tenant from request context
            return generateAppTokens(user);
        } catch (IOException | GeneralSecurityException e) {
            log.error("Error exchanging Google code for token: {}", e.getMessage());
            throw new SocialAuthException("token_exchange_failed", "Failed to exchange authorization code for token");
        }
    }

    @Override
    public SSOProvider getProvider() {
        return SSOProvider.GOOGLE;
    }

    private SSOConfig getGoogleConfig() {
        // TODO: Extract tenant from request context\n
        String tenantId = "default";
        return ssoConfigRepository.findByProviderAndTenant(SSOProvider.GOOGLE.getProvider(), tenantId)
                .filter(SSOConfig::isEnabled)
                .orElseThrow(() -> new SocialAuthException("provider_not_configured",
                        "Google OAuth is not configured or disabled"));
    }

    private void validateRequest(SocialAuthRequest request) {
        if (request.getCode() == null && request.getIdToken() == null) {
            throw new SocialAuthException("missing_code_or_token", "Authorization code or ID token is required");
        }
    }

    private TokenResponse exchangeCodeForToken(SocialAuthRequest request, String clientId, String clientSecret) 
            throws IOException {
        GoogleAuthorizationCodeTokenRequest tokenRequest = new GoogleAuthorizationCodeTokenRequest(
                new NetHttpTransport(),
                GsonFactory.getDefaultInstance(),
                "https://oauth2.googleapis.com/token",
                clientId,
                clientSecret,
                request.getCode(),
                request.getRedirectUri()
        );

        return tokenRequest.execute();
    }

    private GoogleIdToken verifyAndParseIdToken(TokenResponse tokenResponse, String clientId) 
            throws GeneralSecurityException, IOException {
        String idTokenString = (String) tokenResponse.get("id_token");
        if (idTokenString == null) {
            throw new SocialAuthException("missing_id_token", "ID token not found in Google response");
        }

        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(), GsonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(clientId))
                .build();

        GoogleIdToken googleIdToken = verifier.verify(idTokenString);
        if (googleIdToken == null) {
            throw new SocialAuthException("invalid_id_token", "Invalid Google ID token");
        }

        return googleIdToken;
    }

    private User findOrCreateUser(Payload payload, String tenantId) {
        String email = payload.getEmail();
        String firstName = (String) payload.get("given_name");
        String lastName = (String) payload.get("family_name");
        String googleUserId = payload.getSubject();

        // Try to find existing user by Google ID first
        Optional<User> existingUser = userRepository.findByExternalUserIdAndLoginProvider(googleUserId, "GOOGLE");
        if (existingUser.isPresent()) {
            return existingUser.get();
        }

        // Try to find by email
        Optional<User> userByEmail = userRepository.findByEmail(email);
        if (userByEmail.isPresent()) {
            User user = userByEmail.get();
            // Link Google account
            user.setExternalUserId(googleUserId);
            user.setLoginProvider("GOOGLE");
            user.setEmailVerified(true);
            user.setLastLogin(Instant.now());
            return userRepository.save(user);
        }

        User newUser = User.builder()
                .email(email)
                .firstName(firstName)
                .lastName(lastName)
                .tenantId(tenantId != null ? tenantId : "default")
                .roles(List.of("USER"))
                .loginProvider("GOOGLE")
                .externalUserId(googleUserId)
                .emailVerified(true)
                .status("ACTIVE")
                .lastLogin(Instant.now())
                .build();
        
        return userRepository.save(newUser);
    }

    private com.openframe.authz.dto.TokenResponse generateAppTokens(User user) {
        return oauthService.generateTokens(user, "openframe-ui", "social");
    }
}