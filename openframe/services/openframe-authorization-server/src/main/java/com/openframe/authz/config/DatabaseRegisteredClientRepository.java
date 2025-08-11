package com.openframe.authz.config;

import com.openframe.authz.document.SSOConfig;
import com.openframe.authz.service.SSOConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.oidc.OidcScopes;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;

import java.util.Optional;
import java.util.UUID;

/**
 * Dynamic RegisteredClientRepository that loads OAuth2 clients from database
 * Supports both static clients (OpenFrame UI) and dynamic SSO providers (Google, etc.)
 */
@Slf4j
@RequiredArgsConstructor
public class DatabaseRegisteredClientRepository implements RegisteredClientRepository {

    private final SSOConfigService ssoConfigService;
    private final GoogleSSOProperties googleSSOProperties;
    private final RegisteredClient openFrameClient;

    @Override
    public void save(RegisteredClient registeredClient) {
        // For now, we don't support dynamic registration
        // SSO configs are managed through SSOConfigService
        log.warn("Dynamic client registration not supported: {}", registeredClient.getClientId());
    }

    @Override
    public RegisteredClient findById(String id) {
        // First check if it's the static OpenFrame client
        if (openFrameClient.getId().equals(id)) {
            return openFrameClient;
        }

        // Try to find as SSO provider
        return findSSOClient(id);
    }

    @Override
    public RegisteredClient findByClientId(String clientId) {
        log.debug("Looking for client: {}", clientId);

        // First check if it's the static OpenFrame client
        if (openFrameClient.getClientId().equals(clientId)) {
            return openFrameClient;
        }

        // Try to find as SSO provider client
        if (clientId.startsWith("google-")) {
            // Extract tenant ID from client ID format: "google-{tenantId}"
            String tenantId = clientId.substring("google-".length());
            return createGoogleClient(tenantId);
        }

        log.warn("Client not found: {}", clientId);
        return null;
    }

    /**
     * Create Google OAuth2 client for specific tenant
     */
    private RegisteredClient createGoogleClient(String tenantId) {
        try {
            Optional<SSOConfig> googleConfig = ssoConfigService.getSSOConfig(tenantId, "google");
            
            if (googleConfig.isEmpty() || !googleConfig.get().isActive()) {
                log.warn("Google SSO not configured or disabled for tenant: {}", tenantId);
                return null;
            }

            SSOConfig config = googleConfig.get();
            String decryptedSecret = ssoConfigService.getDecryptedClientSecret(config);

            if (decryptedSecret == null) {
                log.error("Failed to decrypt Google client secret for tenant: {}", tenantId);
                return null;
            }

            return RegisteredClient.withId(UUID.randomUUID().toString())
                    .clientId(config.getClientId())
                    .clientSecret("{noop}" + decryptedSecret) // Spring will handle encoding
                    .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                    .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
                    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                    .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
                    .redirectUri(googleSSOProperties.getRedirectUri())
                    .scope(OidcScopes.OPENID)
                    .scope(OidcScopes.PROFILE)
                    .scope(OidcScopes.EMAIL)
                    .clientSettings(ClientSettings.builder()
                            .requireAuthorizationConsent(false)
                            .build())
                    .build();

        } catch (Exception e) {
            log.error("Error creating Google client for tenant {}: {}", tenantId, e.getMessage());
            return null;
        }
    }

    /**
     * Find SSO client by internal ID
     */
    private RegisteredClient findSSOClient(String id) {
        // This would require storing the mapping between Spring's generated IDs 
        // and our tenant/provider combinations. For now, return null.
        log.debug("SSO client lookup by ID not implemented: {}", id);
        return null;
    }
}
