package com.openframe.authz.service;

import com.openframe.authz.document.SSOConfig;
import com.openframe.authz.document.Tenant;
import com.openframe.authz.document.User;
import com.openframe.authz.dto.TenantDiscoveryResponse;
import com.openframe.authz.dto.TenantDiscoveryResponse.TenantInfo;
import com.openframe.authz.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service for tenant discovery based on user email
 * Helps users find which tenants they have access to
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TenantDiscoveryService {

    private static final String DEFAULT_PROVIDER = "openframe-sso";
    private final UserRepository userRepository;
    private final TenantService tenantService;
    private final SSOConfigService ssoConfigService;
    
    /**
     * Discover tenants for a given email
     * Returns available authentication providers for each tenant
     */
    public TenantDiscoveryResponse discoverTenantsForEmail(String email) {
        log.debug("Discovering tenants for email: {}", email);
        
        List<User> users = userRepository.findAllByEmail(email);

        List<TenantInfo> tenants = users.stream()
                .map(this::mapUserToTenantInfo)
                .flatMap(Optional::stream)
                .collect(Collectors.toList());
        
        return TenantDiscoveryResponse.builder()
                .email(email)
                .tenants(tenants)
                .hasExistingAccounts(!tenants.isEmpty())
                .build();
    }
    
    /**
     * Check if tenant name is available for registration
     */
    public boolean isTenantNameAvailable(String tenantName) {
        return tenantService.isTenantNameAvailable(tenantName);
    }
    
    /**
     * Get available authentication providers for a tenant/user combination
     */
    private List<String> getAvailableAuthProviders(Tenant tenant, User user) {

        List<String> ssoProviders = ssoConfigService.getActiveSSOConfigsForTenant(tenant.getId())
                .stream()
                .map(SSOConfig::getProvider)
                .toList();

        List<String> providers = new ArrayList<>(ssoProviders);
        providers.add(DEFAULT_PROVIDER);
        
        return providers.stream()
                .filter(p -> p != null && !p.isBlank())
                .distinct()
                .collect(Collectors.toList());
    }

    private Optional<TenantInfo> mapUserToTenantInfo(User user) {
        Tenant tenant = tenantService.findById(user.getTenantId()).orElse(null);
        if (tenant == null || !tenant.isActive()) {
            return Optional.empty();
        }

        List<String> authProviders = getAvailableAuthProviders(tenant, user);

        TenantInfo info = TenantInfo.builder()
                .tenantId(tenant.getId())
                .tenantName(tenant.getName())
                .tenantDomain(tenant.getDomain())
                .authProviders(authProviders)
                .userExists(true)
                .build();

        return Optional.of(info);
    }
}