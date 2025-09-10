package com.openframe.authz.service;

import com.openframe.core.service.EncryptionService;
import com.openframe.data.document.sso.SSOConfig;
import com.openframe.data.document.sso.SSOPerTenantConfig;
import com.openframe.data.repository.sso.SSOConfigRepository;
import com.openframe.data.repository.sso.SSOPerTenantConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class SSOConfigService {

    private final SSOPerTenantConfigRepository ssoPerTenantConfigRepository;
    private final SSOConfigRepository ssoConfigRepository;
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

    /**
     * Get ACTIVE SSO configurations by provider (for local-tenant/global usage).
     */
    public Optional<SSOConfig> getActiveByProvider(String provider) {
        return ssoConfigRepository.findByProvider(provider);
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