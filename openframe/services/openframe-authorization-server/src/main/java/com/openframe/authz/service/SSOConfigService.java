package com.openframe.authz.service;

import com.openframe.authz.dto.SSOConfigStatusResponse;
import com.openframe.authz.repository.TenantAwareSSOConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SSOConfigService {
    private final TenantAwareSSOConfigRepository ssoConfigRepository;

    /**
     * Get list of enabled SSO providers - used by login components (default tenant)
     */
    public List<SSOConfigStatusResponse> getEnabledProviders() {
        return getEnabledProviders("default");
    }
    
    /**
     * Get list of enabled SSO providers for specific tenant
     */
    public List<SSOConfigStatusResponse> getEnabledProviders(String tenantId) {
        log.debug("Getting enabled SSO providers for tenant: {}", tenantId);

        return ssoConfigRepository.findEnabledProviders(tenantId).stream()
                .map(config -> SSOConfigStatusResponse.builder()
                        .provider(config.getProvider())
                        .enabled(true)
                        .clientId(config.getClientId())
                        .build())
                .collect(Collectors.toList());
    }
}