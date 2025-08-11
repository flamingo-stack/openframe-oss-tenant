package com.openframe.authz.service;

import com.openframe.authz.config.GoogleSSOProperties;
import com.openframe.authz.document.SSOConfig;
import com.openframe.authz.repository.SSOConfigRepository;
import com.openframe.core.service.EncryptionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class SSOConfigService {
    
    private final SSOConfigRepository ssoConfigRepository;
    private final EncryptionService encryptionService;
    private final GoogleSSOProperties googleSSOProperties;

    /**
     * Create or update SSO configuration for a tenant
     */
    public SSOConfig saveSSOConfig(SSOConfig config) {
        // Encrypt client secret if provided
        if (config.getClientSecret() != null && !config.getClientSecret().startsWith("encrypted:")) {
            String encryptedSecret = encryptionService.encryptClientSecret(config.getClientSecret());
            config.setClientSecret(encryptedSecret);
        }
        
        return ssoConfigRepository.save(config);
    }

    /**
     * Get SSO configuration by tenant and provider
     */
    public Optional<SSOConfig> getSSOConfig(String tenantId, String provider) {
        return ssoConfigRepository.findByTenantIdAndProvider(tenantId, provider);
    }

    /**
     * Get all SSO configurations for a tenant
     */
    public List<SSOConfig> getSSOConfigsForTenant(String tenantId) {
        return ssoConfigRepository.findByTenantId(tenantId);
    }

    /**
     * Get all active SSO configurations for a tenant
     */
    public List<SSOConfig> getActiveSSOConfigsForTenant(String tenantId) {
        return ssoConfigRepository.findByTenantIdAndEnabledTrue(tenantId);
    }

    /**
     * Enable SSO provider for a tenant
     */
    public SSOConfig enableSSOProvider(String tenantId, String provider) {
        return ssoConfigRepository.findByTenantIdAndProvider(tenantId, provider)
                .map(config -> {
                    config.setEnabled(true);
                    return ssoConfigRepository.save(config);
                })
                .orElseThrow(() -> new IllegalArgumentException(
                        "SSO configuration not found for tenant: " + tenantId + ", provider: " + provider));
    }

    /**
     * Disable SSO provider for a tenant
     */
    public SSOConfig disableSSOProvider(String tenantId, String provider) {
        return ssoConfigRepository.findByTenantIdAndProvider(tenantId, provider)
                .map(config -> {
                    config.setEnabled(false);
                    return ssoConfigRepository.save(config);
                })
                .orElseThrow(() -> new IllegalArgumentException(
                        "SSO configuration not found for tenant: " + tenantId + ", provider: " + provider));
    }

    /**
     * Delete SSO configuration
     */
    public void deleteSSOConfig(String tenantId, String provider) {
        ssoConfigRepository.findByTenantIdAndProvider(tenantId, provider)
                .ifPresent(ssoConfigRepository::delete);
    }

    /**
     * Create empty Google SSO configuration for a tenant
     * Only stores tenantId and provider - URLs come from GoogleSSOProperties
     */
    public SSOConfig createEmptyGoogleConfig(String tenantId) {
        SSOConfig googleConfig = SSOConfig.builder()
                .tenantId(tenantId)
                .provider("google")
                .enabled(false) // Disabled by default, needs clientId/clientSecret
                .build();
        
        return ssoConfigRepository.save(googleConfig);
    }
    
    /**
     * Get Google SSO configuration with properties merged
     */
    public GoogleSSOConfigView getGoogleConfigView(String tenantId) {
        Optional<SSOConfig> dbConfig = getSSOConfig(tenantId, "google");
        
        return GoogleSSOConfigView.builder()
                .tenantId(tenantId)
                .provider("google")
                .clientId(dbConfig.map(SSOConfig::getClientId).orElse(null))
                .hasClientSecret(dbConfig.map(config -> config.getClientSecret() != null).orElse(false))
                .enabled(dbConfig.map(SSOConfig::isEnabled).orElse(false))
                .configured(dbConfig.map(SSOConfig::isActive).orElse(false))
                // Standard properties from config
                .displayName(googleSSOProperties.getDisplayName())
                .authorizationUrl(googleSSOProperties.getAuthorizationUrl())
                .tokenUrl(googleSSOProperties.getTokenUrl())
                .userinfoUrl(googleSSOProperties.getUserinfoUrl())
                .scopes(googleSSOProperties.getScopes())
                .redirectUri(googleSSOProperties.getRedirectUri())
                .build();
    }
    
    /**
     * Google SSO configuration view that combines DB data with properties
     */
    @lombok.Data
    @lombok.Builder
    public static class GoogleSSOConfigView {
        private String tenantId;
        private String provider;
        
        // From database
        private String clientId;
        private boolean hasClientSecret;
        private boolean enabled;
        private boolean configured;
        
        // From properties
        private String displayName;
        private String authorizationUrl;
        private String tokenUrl;
        private String userinfoUrl;
        private String scopes;
        private String redirectUri;
    }



    /**
     * Get decrypted client secret for SSO configuration
     */
    public String getDecryptedClientSecret(SSOConfig config) {
        if (config.getClientSecret() == null) {
            return null;
        }
        return encryptionService.decryptClientSecret(config.getClientSecret());
    }

    /**
     * Check if SSO provider is configured and active for a tenant
     */
    public boolean isSSOProviderActive(String tenantId, String provider) {
        return ssoConfigRepository.findByTenantIdAndProvider(tenantId, provider)
                .map(SSOConfig::isActive)
                .orElse(false);
    }
}