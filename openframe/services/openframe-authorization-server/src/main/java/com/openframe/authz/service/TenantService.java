package com.openframe.authz.service;

import com.openframe.authz.document.Tenant;
import com.openframe.authz.document.TenantPlan;
import com.openframe.authz.document.TenantStatus;
import com.openframe.authz.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.regex.Pattern;

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
        
        if (tenantRepository.existsByNameIgnoreCase(tenantName)) {
            throw new IllegalArgumentException("Tenant name already exists");
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
     * Check if tenant name is available (case-insensitive)
     */
    public boolean isTenantNameAvailable(String tenantName) {
        if (nonValidTenantName(tenantName)) {
            return false;
        }
        return !tenantRepository.existsByNameIgnoreCase(tenantName);
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