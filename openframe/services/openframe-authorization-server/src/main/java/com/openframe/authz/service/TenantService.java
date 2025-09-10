package com.openframe.authz.service;

import com.openframe.data.document.auth.Tenant;
import com.openframe.data.document.auth.TenantPlan;
import com.openframe.data.document.auth.TenantStatus;
import com.openframe.data.repository.auth.TenantRepository;
import com.openframe.data.repository.auth.TenantRepository.DomainView;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Service for managing tenants in multi-tenant architecture
 */
@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;
    
    private static final Pattern TENANT_NAME_PATTERN = Pattern.compile("^[a-zA-Z0-9_-]{3,50}$");

    @Value("${openframe.domain.validation.regex}")
    private String domainValidationRegex;

    /**
     * Create a new tenant
     */
    public Tenant createTenant(String tenantName, String domain) {
        log.debug("Creating tenant: {} with domain: {}", tenantName, domain);

        if (nonValidTenantName(tenantName)) {
            throw new IllegalArgumentException("Invalid tenant name. Must be 3-50 characters, alphanumeric, hyphens, and underscores only.");
        }

        if (nonValidDomain(domain)) {
            throw new IllegalArgumentException("Invalid domain format");
        }

        if (tenantRepository.existsByDomain(domain)) {
            throw new IllegalArgumentException("Tenant domain already exists");
        }
        
        Tenant tenant = Tenant.builder()
                .id(Tenant.generateTenantId())
                .name(tenantName)
                .domain(domain)
                .status(TenantStatus.ACTIVE)
                .plan(TenantPlan.FREE)
                .build();
        
        Tenant savedTenant = tenantRepository.save(tenant);
        log.info("Created tenant: {} with ID: {} and domain: {}", savedTenant.getName(), savedTenant.getId(), savedTenant.getDomain());

        return savedTenant;
    }

    /**
     * Find tenant by domain
     */
    public Optional<Tenant> findByDomain(String domain) {
        return tenantRepository.findByDomain(domain);
    }


    /**
     * Find tenant by domain
     */
    public boolean existByDomain(String domain) {
        return tenantRepository.existsByDomain(domain);
    }

    /**
     * Find tenant by ID
     */
    public Optional<Tenant> findById(String tenantId) {
        return tenantRepository.findById(tenantId);
    }

    /**
     * Check if tenant domain is available for registration
     */
    public boolean isTenantDomainAvailable(String domain) {
        if (nonValidDomain(domain)) {
            return false;
        }
        return !tenantRepository.existsByDomain(domain);
    }

    /**
     * Find which domains from the provided collection already exist (single DB roundtrip).
     */
    public Set<String> findExistingDomains(List<String> domains) {
        if (domains == null || domains.isEmpty()) {
            return Set.of();
        }
        return tenantRepository.findByDomainIn(domains)
                .stream()
                .map(DomainView::getDomain)
                .collect(Collectors.toSet());
    }

    /**
     * Validate tenant name format
     */
    private boolean nonValidTenantName(String tenantName) {
        if (tenantName == null || tenantName.trim().isEmpty()) {
            return true;
        }
        return !TENANT_NAME_PATTERN.matcher(tenantName.trim()).matches();
    }
    
    /**
     * Validate domain format
     */
    private boolean nonValidDomain(String domain) {
        if (domain == null || domain.trim().isEmpty()) {
            return true;
        }
        return !domain.trim().matches(domainValidationRegex);
    }
    
    /**
     * Save tenant
     */
    public Tenant save(Tenant tenant) {
        return tenantRepository.save(tenant);
    }
}