package com.openframe.authz.repository;

import com.openframe.authz.tenant.TenantContext;
import com.openframe.core.model.OAuthClient;
import com.openframe.core.service.EncryptionService;
import com.openframe.data.repository.mongo.OAuthClientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;
import org.springframework.security.oauth2.server.authorization.settings.TokenSettings;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Arrays;
import java.util.Objects;

/**
 * MongoDB-backed implementation of Spring Authorization Server's RegisteredClientRepository.
 * Bridges the gap between OpenFrame's OAuthClient model and Spring's RegisteredClient.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MongoRegisteredClientRepository implements RegisteredClientRepository {
    
    private final OAuthClientRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final EncryptionService encryptionService;
    
    @Override
    public void save(RegisteredClient registeredClient) {
        try {
            OAuthClient client = convertFromRegisteredClient(registeredClient);
            repository.save(client);
            log.debug("Saved OAuth client: {} for tenant: {}", 
                     client.getClientId(), client.getTenantId());
        } catch (Exception e) {
            log.error("Failed to save OAuth client: {}", registeredClient.getClientId(), e);
            throw new IllegalStateException("Failed to save OAuth client", e);
        }
    }
    
    @Override
    public RegisteredClient findById(String id) {
        try {
            return repository.findById(id)
                    .filter(OAuthClient::isActive)
                    .map(this::convertToRegisteredClient)
                    .orElse(null);
        } catch (Exception e) {
            log.error("Failed to find OAuth client by ID: {}", id, e);
            return null;
        }
    }
    
    @Override
    public RegisteredClient findByClientId(String clientId) {
        String tenantId = TenantContext.getTenantId();
        if (tenantId == null) {
            log.error("Tenant context not available for client lookup: {}", clientId);
            return null;
        }
        
        try {
            return repository.findByClientIdAndTenantId(clientId, tenantId)
                    .filter(OAuthClient::isActive)
                    .map(this::convertToRegisteredClient)
                    .orElse(null);
        } catch (Exception e) {
            log.error("Failed to find OAuth client by clientId: {} in tenant: {}", clientId, tenantId, e);
            return null;
        }
    }
    
    /**
     * Converts OpenFrame's OAuthClient to Spring's RegisteredClient
     */
    private RegisteredClient convertToRegisteredClient(OAuthClient client) {
        var builder = RegisteredClient.withId(client.getId())
                .clientId(client.getClientId());
        
        // Set client name
        if (client.getClientName() != null) {
            builder.clientName(client.getClientName());
        }
        
        // Handle client secret
        if (client.getClientSecret() != null && !client.getClientSecret().isEmpty()) {
            try {
                String decrypted = encryptionService.decryptClientSecret(client.getClientSecret());
                builder.clientSecret(passwordEncoder.encode(decrypted));
            } catch (Exception e) {
                log.warn("Failed to decrypt client secret for client: {}, treating as public client", 
                        client.getClientId(), e);
            }
        }
        
        // Authentication Methods
        if (client.getClientAuthenticationMethods() != null) {
            Arrays.stream(client.getClientAuthenticationMethods())
                    .filter(Objects::nonNull)
                    .map(ClientAuthenticationMethod::new)
                    .forEach(builder::clientAuthenticationMethod);
        } else {
            // Default to client_secret_basic if not specified
            builder.clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC);
        }
        
        // Grant Types
        if (client.getGrantTypes() != null) {
            Arrays.stream(client.getGrantTypes())
                    .filter(Objects::nonNull)
                    .map(AuthorizationGrantType::new)
                    .forEach(builder::authorizationGrantType);
        }
        
        // Redirect URIs
        if (client.getRedirectUris() != null) {
            Arrays.stream(client.getRedirectUris())
                    .filter(Objects::nonNull)
                    .filter(uri -> !uri.trim().isEmpty())
                    .forEach(builder::redirectUri);
        }
        
        // Scopes
        if (client.getScopes() != null) {
            Arrays.stream(client.getScopes())
                    .filter(Objects::nonNull)
                    .filter(scope -> !scope.trim().isEmpty())
                    .forEach(builder::scope);
        }
        
        // Client Settings
        builder.clientSettings(ClientSettings.builder()
                .requireProofKey(client.isRequireProofKey())
                .requireAuthorizationConsent(client.isRequireAuthorizationConsent())
                .build());
        
        // Token Settings
        builder.tokenSettings(TokenSettings.builder()
                .accessTokenTimeToLive(Duration.ofSeconds(
                        client.getAccessTokenTimeToLive() != null ? 
                        client.getAccessTokenTimeToLive() : 3600L))
                .refreshTokenTimeToLive(Duration.ofSeconds(
                        client.getRefreshTokenTimeToLive() != null ? 
                        client.getRefreshTokenTimeToLive() : 86400L))
                .reuseRefreshTokens(client.isReuseRefreshTokens())
                .build());
        
        return builder.build();
    }
    
    /**
     * Converts Spring's RegisteredClient to OpenFrame's OAuthClient
     */
    private OAuthClient convertFromRegisteredClient(RegisteredClient registered) {
        OAuthClient client = new OAuthClient();
        client.setId(registered.getId());
        client.setClientId(registered.getClientId());
        client.setClientName(registered.getClientName());
        client.setTenantId(TenantContext.getTenantId());
        
        // Handle client secret
        if (registered.getClientSecret() != null) {
            try {
                client.setClientSecret(encryptionService.encryptClientSecret(registered.getClientSecret()));
            } catch (Exception e) {
                log.error("Failed to encrypt client secret for client: {}", registered.getClientId(), e);
                throw new IllegalStateException("Failed to encrypt client secret", e);
            }
        }
        
        // Authentication Methods
        client.setClientAuthenticationMethods(
                registered.getClientAuthenticationMethods().stream()
                        .map(ClientAuthenticationMethod::getValue)
                        .toArray(String[]::new)
        );
        
        // Grant Types
        client.setGrantTypes(
                registered.getAuthorizationGrantTypes().stream()
                        .map(AuthorizationGrantType::getValue)
                        .toArray(String[]::new)
        );
        
        // Redirect URIs
        client.setRedirectUris(registered.getRedirectUris().toArray(new String[0]));
        
        // Scopes
        client.setScopes(registered.getScopes().toArray(new String[0]));
        
        // Client Settings
        ClientSettings clientSettings = registered.getClientSettings();
        client.setRequireProofKey(clientSettings.isRequireProofKey());
        client.setRequireAuthorizationConsent(clientSettings.isRequireAuthorizationConsent());
        
        // Token Settings
        TokenSettings tokenSettings = registered.getTokenSettings();
        client.setAccessTokenTimeToLive(tokenSettings.getAccessTokenTimeToLive().getSeconds());
        client.setRefreshTokenTimeToLive(tokenSettings.getRefreshTokenTimeToLive().getSeconds());
        client.setReuseRefreshTokens(tokenSettings.isReuseRefreshTokens());
        
        // Default values
        client.setEnabled(true);
        client.setClientType("external"); // Default for dynamically registered clients
        
        return client;
    }
}