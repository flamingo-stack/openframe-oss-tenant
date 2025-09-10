package com.openframe.authz.service;

import com.openframe.authz.dto.TenantDiscoveryResponse;
import com.openframe.data.document.auth.Tenant;
import com.openframe.data.document.sso.SSOConfig;
import com.openframe.data.document.sso.SSOPerTenantConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import static com.openframe.authz.config.GoogleSSOProperties.GOOGLE;
import static com.openframe.core.util.SlugUtil.toSlug;

/**
 * Service for tenant discovery based on user email
 * Helps users find which tenants they have access to
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TenantDiscoveryService {

    private static final String DEFAULT_PROVIDER = "openframe-sso";
    private final UserService userService;
    private final TenantService tenantService;
    private final SSOConfigService ssoConfigService;

    @Value("${openframe.tenancy.local-tenant:false}")
    private boolean localTenant;

    @Value("${openframe.tenancy.base-domain:openframe.ai}")
    private String baseDomain;
    /**
     * Discover tenants for a given email
     * Returns available authentication providers for each tenant
     */
    public TenantDiscoveryResponse discoverTenantForEmail(String email) {
        log.debug("Discovering tenants for email: {}", email);

        return userService.findActiveByEmail(email)
                .map(user -> tenantService.findById(user.getTenantId())
                        .filter(Tenant::isActive)
                        .map(tenant -> TenantDiscoveryResponse.builder()
                                .email(email)
                                .hasExistingAccounts(true)
                                .tenantId(tenant.getId())
                                .authProviders(getAvailableAuthProviders(tenant))
                                .build())
                        .orElseGet(() -> TenantDiscoveryResponse.builder()
                                .email(email)
                                .hasExistingAccounts(false)
                                .build())
                )
                .orElseGet(() -> TenantDiscoveryResponse.builder()
                        .email(email)
                        .hasExistingAccounts(false)
                        .build());
    }

    /**
     * Suggest available domain(s) based on requested domain and organization name.
     * - If requested domain is free -> return empty list
     * - Else -> generate candidates from organization name and append configured base domain
     */
    public List<String> suggestDomains(String requestedDomain, String organizationName) {
        if (tenantService.isTenantDomainAvailable(requestedDomain)) {
            return List.of();
        }

        String orgSlug = toSlug(organizationName);

        List<String> labels = List.of(orgSlug, orgSlug + "-app", orgSlug + "-team", orgSlug + "-io");
        List<String> candidates = labels.stream().map(c -> c + "." + baseDomain).toList();

        var existing = tenantService.findExistingDomains(candidates);
        return candidates.stream()
                .filter(d -> !existing.contains(d))
                .distinct()
                .limit(3)
                .toList();
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