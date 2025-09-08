package com.openframe.authz.service;

import com.openframe.core.service.EncryptionService;
import com.openframe.data.document.sso.SSOPerTenantConfig;
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

    private final SSOPerTenantConfigRepository ssoConfigRepository;
    private final EncryptionService encryptionService;

    /**
     * Get SSO configuration by tenant and provider
     */
    public Optional<SSOPerTenantConfig> getSSOConfig(String tenantId, String provider) {
        return ssoConfigRepository.findByTenantIdAndProvider(tenantId, provider);
    }

    /**
     * Get all active SSO configurations for a tenant
     */
    public List<SSOPerTenantConfig> getActiveSSOConfigsForTenant(String tenantId) {
        return ssoConfigRepository.findByTenantIdAndEnabledTrue(tenantId);
    }

    /**
     * Get decrypted client secret for SSO configuration
     */
    public String getDecryptedClientSecret(SSOPerTenantConfig config) {
        if (config.getClientSecret() == null) {
            return null;
        }
        return encryptionService.decryptClientSecret(config.getClientSecret());
    }
}