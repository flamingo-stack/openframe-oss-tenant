package com.openframe.authz.service;

import com.openframe.authz.document.Tenant;
import com.openframe.authz.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
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
    private static final Pattern DOMAIN_PATTERN = Pattern.compile("^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.[a-zA-Z]{2,}$");
    
    /**
     * Create a new tenant
     */
    public Tenant createTenant(String tenantName, String domain, String ownerId) {
        log.debug("Creating tenant: {} with domain: {}", tenantName, domain);
        
        // Validate tenant name
        if (!isValidTenantName(tenantName)) {
            throw new IllegalArgumentException("Invalid tenant name. Must be 3-50 characters, alphanumeric, hyphens, and underscores only.");
        }
        
        // Validate domain
        if (!isValidDomain(domain)) {
            throw new IllegalArgumentException("Invalid domain format");
        }
        
        // Check if tenant already exists
        if (tenantRepository.existsByNameIgnoreCase(tenantName)) {
            throw new IllegalArgumentException("Tenant name already exists");
        }
        
        // Check if domain already exists
        if (tenantRepository.existsByDomain(domain)) {
            throw new IllegalArgumentException("Tenant domain already exists");
        }
        
        // Create tenant
        Tenant tenant = Tenant.builder()
                .id(Tenant.generateTenantId())
                .name(tenantName)
                .domain(domain)
                .ownerId(ownerId)
                .status("ACTIVE")
                .registrationOpen(true) // Will be closed after first user for single-tenant mode
                .plan("FREE")
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
     * Find tenant by ID
     */
    public Optional<Tenant> findById(String tenantId) {
        return tenantRepository.findById(tenantId);
    }
    
    /**
     * Check if tenant name is available (case-insensitive)
     */
    public boolean isTenantNameAvailable(String tenantName) {
        if (!isValidTenantName(tenantName)) {
            return false;
        }
        return !tenantRepository.existsByNameIgnoreCase(tenantName);
    }

    /**
     * Close registration for a tenant (typically after first user for single-tenant)
     */
    public void closeRegistration(String tenantId) {
        tenantRepository.findById(tenantId).ifPresent(tenant -> {
            tenant.closeRegistration();
            tenantRepository.save(tenant);
            log.info("Closed registration for tenant: {}", tenant.getName());
        });
    }

    /**
     * Validate tenant name format
     */
    private boolean isValidTenantName(String tenantName) {
        if (tenantName == null || tenantName.trim().isEmpty()) {
            return false;
        }
        return TENANT_NAME_PATTERN.matcher(tenantName.trim()).matches();
    }
    
    /**
     * Validate domain format
     */
    private boolean isValidDomain(String domain) {
        if (domain == null || domain.trim().isEmpty()) {
            return false;
        }
        // Allow localhost for development
        if ("localhost".equals(domain)) {
            return true;
        }
        return DOMAIN_PATTERN.matcher(domain.trim()).matches();
    }
    
    /**
     * Save tenant
     */
    public Tenant save(Tenant tenant) {
        return tenantRepository.save(tenant);
    }
}