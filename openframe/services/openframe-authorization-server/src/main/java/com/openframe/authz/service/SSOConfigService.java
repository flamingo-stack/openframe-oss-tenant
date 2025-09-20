package com.openframe.authz.service;

import com.openframe.core.service.EncryptionService;
import com.openframe.data.document.sso.SSOConfig;

import com.openframe.data.document.tenant.SSOPerTenantConfig;
import com.openframe.data.repository.tenant.SSOPerTenantConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

import static com.openframe.authz.config.GoogleSSOProperties.GOOGLE;

@Slf4j
@Service
@RequiredArgsConstructor
public class SSOConfigService {

    private final SSOPerTenantConfigRepository ssoPerTenantConfigRepository;
    private final EncryptionService encryptionService;

    /**
     * Get ACTIVE SSO configuration by tenant and provider.
     */
    public Optional<SSOPerTenantConfig> getSSOConfig(String tenantId, String provider) {
        return ssoPerTenantConfigRepository.findFirstByTenantIdAndProviderAndEnabledTrue(tenantId, provider);
    }

    /**
     * Get ACTIVE SSO configurations for a tenant (independent of provider).
     * Active = enabled + non-empty clientId/clientSecret.
     */
    public List<SSOPerTenantConfig> getActiveForTenant(String tenantId) {
        return ssoPerTenantConfigRepository.findByTenantIdAndEnabledTrue(tenantId);
    }

    //TODO strategy for providers
    public Optional<SSOPerTenantConfig> getGoogleConfig(boolean localTenant, String tenantId) {
        return localTenant
                ? getActiveByProvider(GOOGLE)
                : getSSOConfig(tenantId, GOOGLE);
    }

    /**
     * Get ACTIVE SSO configurations by provider (for local-tenant/global usage).
     */
    public Optional<SSOPerTenantConfig> getActiveByProvider(String provider) {
        return ssoPerTenantConfigRepository.findByProvider(provider);
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
}