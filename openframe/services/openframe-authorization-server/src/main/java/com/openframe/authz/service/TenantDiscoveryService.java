package com.openframe.authz.service;

import com.openframe.authz.dto.TenantDiscoveryResponse;
import com.openframe.data.document.auth.AuthUser;
import com.openframe.data.document.auth.Tenant;
import com.openframe.data.document.sso.SSOConfig;
import com.openframe.data.document.sso.SSOPerTenantConfig;
import com.openframe.data.document.user.UserStatus;
import com.openframe.data.repository.auth.AuthUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import static com.openframe.authz.config.GoogleSSOProperties.GOOGLE;

/**
 * Service for tenant discovery based on user email
 * Helps users find which tenants they have access to
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TenantDiscoveryService {

    private static final String DEFAULT_PROVIDER = "openframe-sso";
    private final AuthUserRepository userRepository;
    private final TenantService tenantService;
    private final SSOConfigService ssoConfigService;

    @Value("${openframe.tenancy.local-tenant:false}")
    private boolean localTenant;
    
    /**
     * Discover tenants for a given email
     * Returns available authentication providers for each tenant
     */
    public TenantDiscoveryResponse discoverTenantsForEmail(String email) {
        log.debug("Discovering tenants for email: {}", email);

        List<AuthUser> users = userRepository.findAllByEmailAndStatus(email, UserStatus.ACTIVE);

        for (AuthUser user : users) {
            Tenant tenant = tenantService.findById(user.getTenantId()).orElse(null);
            if (tenant == null || !tenant.isActive()) {
                continue;
            }

            List<String> authProviders = getAvailableAuthProviders(tenant);

            return TenantDiscoveryResponse.builder()
                    .email(email)
                    .hasExistingAccounts(true)
                    .tenantId(tenant.getId())
                    .authProviders(authProviders)
                    .build();
        }

        return TenantDiscoveryResponse.builder()
                .email(email)
                .hasExistingAccounts(false)
                .build();
    }

    /**
     * Check if tenant domain is available for registration
     */
    public boolean isTenantDomainAvailable(String domain) {
        return tenantService.isTenantDomainAvailable(domain);
    }
    
    /**
     * Get available authentication providers for a tenant/user combination
     */
    private List<String> getAvailableAuthProviders(Tenant tenant) {

        List<String> ssoProviders;
        if (localTenant) {
            ssoProviders = ssoConfigService.getActiveByProvider(GOOGLE)
                    .stream()
                    .map(SSOConfig::getProvider)
                    .map(String::toLowerCase)
                    .toList();
        } else {
            ssoProviders = ssoConfigService.getActiveForTenant(tenant.getId())
                    .stream()
                    .map(SSOPerTenantConfig::getProvider)
                    .map(String::toLowerCase)
                    .toList();
        }

        List<String> providers = new ArrayList<>(ssoProviders);
        providers.add(DEFAULT_PROVIDER);
        
        return providers.stream()
                .filter(p -> p != null && !p.isBlank())
                .distinct()
                .collect(Collectors.toList());
    }
}