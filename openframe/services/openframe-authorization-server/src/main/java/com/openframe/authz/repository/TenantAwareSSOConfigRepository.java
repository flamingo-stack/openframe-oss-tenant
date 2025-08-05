package com.openframe.authz.repository;

import com.openframe.core.model.SSOConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Tenant-aware SSO Config Repository
 * Handles multi-tenant SSO configuration with fallback to global configs
 */
@Repository
@RequiredArgsConstructor
public class TenantAwareSSOConfigRepository {
    
    private final SSOConfigRepository ssoConfigRepository;
    
    /**
     * Find SSO config by provider and tenant ID with fallback to global config
     */
    public Optional<SSOConfig> findByProviderAndTenant(String provider, String tenantId) {
        // First try tenant-specific config
        Optional<SSOConfig> tenantConfig = ssoConfigRepository.findByProviderAndTenantId(provider, tenantId);
        if (tenantConfig.isPresent()) {
            return tenantConfig;
        }
        
        // Fallback to global config (tenant_id = null or "global")
        return ssoConfigRepository.findByProvider(provider);
    }
    
    /**
     * Get all enabled SSO providers for a tenant with global fallback
     */
    public List<SSOConfig> findEnabledProviders(String tenantId) {
        List<SSOConfig> tenantConfigs = ssoConfigRepository.findByEnabledTrueAndTenantId(tenantId);
        
        // If no tenant-specific configs, use global configs
        if (tenantConfigs.isEmpty()) {
            return ssoConfigRepository.findByEnabledTrue();
        }
        
        return tenantConfigs;
    }
    
    /**
     * Save SSO config with tenant awareness
     */
    public SSOConfig save(SSOConfig ssoConfig) {
        return ssoConfigRepository.save(ssoConfig);
    }
}