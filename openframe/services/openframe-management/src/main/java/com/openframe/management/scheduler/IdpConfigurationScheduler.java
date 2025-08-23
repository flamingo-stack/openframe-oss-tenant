package com.openframe.management.scheduler;

import com.openframe.core.model.OAuthClient;
import com.openframe.core.service.EncryptionService;
import com.openframe.data.repository.mongo.OAuthClientRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(value = "openframe.management.idp.init.enabled", havingValue = "true", matchIfMissing = true)
public class IdpConfigurationScheduler {

    private final OAuthClientRepository oAuthClientRepository;
    private final EncryptionService encryptionService;

    @Value("${openframe.auth.gateway.client.id}")
    private String gatewayClientId;

    @Value("${openframe.auth.gateway.client.secret}")
    private String gatewayClientSecret;

    @Value("${openframe.auth.gateway.redirect-uri}")
    private String gatewayRedirectUri;

    @Value("${security.oauth2.token.access.expiration-seconds:3600}")
    private long accessTokenExpirationSeconds;

    @Value("${security.oauth2.token.refresh.expiration-seconds:86400}")
    private long refreshTokenExpirationSeconds;

    @Scheduled(fixedDelay = Long.MAX_VALUE, initialDelay = 5000) // Run once, 5 seconds after startup
    @SchedulerLock(name = "IdpConfigurationScheduler_initializeDefaultIdp", lockAtMostFor = "10m", lockAtLeastFor = "1m")
    public void initializeDefaultIdp() {
        log.info("Starting default IDP configuration initialization...");
        
        try {
            createGatewayClientIfNeeded();
            log.info("Default IDP configuration completed successfully");
        } catch (Exception e) {
            log.error("Failed to initialize default IDP configuration", e);
        }
    }

    private void createGatewayClientIfNeeded() {
        // Check if gateway client already exists
        var existingClient = oAuthClientRepository.findByClientId(gatewayClientId);
        
        if (existingClient.isPresent()) {
            log.info("Gateway client '{}' already exists, skipping creation", gatewayClientId);
            return;
        }

        log.info("Creating gateway client '{}'", gatewayClientId);
        
        OAuthClient gatewayClient = new OAuthClient();
        gatewayClient.setClientId(gatewayClientId);
        gatewayClient.setClientName("OpenFrame Gateway");
        gatewayClient.setClientDescription("Default IDP client for OpenFrame platform authentication");
        
        // Encrypt client secret
        try {
            gatewayClient.setClientSecret(encryptionService.encryptClientSecret(gatewayClientSecret));
        } catch (Exception e) {
            log.error("Failed to encrypt gateway client secret", e);
            throw new RuntimeException("Failed to encrypt client secret", e);
        }
        
        // Set redirect URIs
        gatewayClient.setRedirectUris(new String[]{gatewayRedirectUri});
        
        // Set supported grant types
        gatewayClient.setGrantTypes(new String[]{
            "authorization_code",
            "refresh_token"
        });
        
        // Set scopes
        gatewayClient.setScopes(new String[]{
            "openid",
            "profile",
            "email",
            "read",
            "write"
        });
        
        // Set authentication methods
        gatewayClient.setClientAuthenticationMethods(new String[]{
            "client_secret_basic",
            "client_secret_post"
        });
        
        // Configure as confidential client with PKCE
        gatewayClient.setRequireProofKey(true);
        gatewayClient.setRequireAuthorizationConsent(false); // Internal client, no consent needed
        
        // Set token lifetimes
        gatewayClient.setAccessTokenTimeToLive(accessTokenExpirationSeconds);
        gatewayClient.setRefreshTokenTimeToLive(refreshTokenExpirationSeconds);
        gatewayClient.setReuseRefreshTokens(false);
        
        // Set client metadata
        gatewayClient.setClientType("internal");
        gatewayClient.setEnabled(true);
        
        // Note: tenantId will be null for now (global client)
        // This can be updated later for multi-tenant support
        
        // Set audit fields
        gatewayClient.setCreatedAt(LocalDateTime.now());
        gatewayClient.setUpdatedAt(LocalDateTime.now());
        
        // Save the client
        oAuthClientRepository.save(gatewayClient);
        
        log.info("Successfully created gateway client '{}' with redirect URI '{}'", 
                gatewayClientId, gatewayRedirectUri);
    }
}