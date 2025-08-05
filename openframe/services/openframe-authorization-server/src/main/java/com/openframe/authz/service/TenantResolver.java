package com.openframe.authz.service;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * Service for resolving tenant context from HTTP requests
 * Supports multiple strategies: subdomain, header, URL parameter
 */
@Service
@Slf4j
public class TenantResolver {
    
    /**
     * Extract tenant ID from request
     * Priority: 1) Header, 2) Subdomain, 3) Parameter, 4) Default
     */
    public String resolveTenantId(HttpServletRequest request) {
        // Strategy 1: X-Tenant-ID header
        String tenantId = request.getHeader("X-Tenant-ID");
        if (tenantId != null && !tenantId.trim().isEmpty()) {
            log.debug("Resolved tenant ID from header: {}", tenantId);
            return tenantId.trim();
        }
        
        // Strategy 2: Subdomain (e.g., tenant1.openframe.com)
        tenantId = extractTenantFromSubdomain(request);
        if (tenantId != null) {
            log.debug("Resolved tenant ID from subdomain: {}", tenantId);
            return tenantId;
        }
        
        // Strategy 3: URL parameter
        tenantId = request.getParameter("tenant_id");
        if (tenantId != null && !tenantId.trim().isEmpty()) {
            log.debug("Resolved tenant ID from parameter: {}", tenantId);
            return tenantId.trim();
        }
        
        // Strategy 4: Default tenant for single-tenant mode
        log.debug("No tenant ID found, using default tenant");
        return "default";
    }
    
    /**
     * Extract tenant from subdomain (e.g., tenant1.openframe.com -> tenant1)
     */
    private String extractTenantFromSubdomain(HttpServletRequest request) {
        String serverName = request.getServerName();
        if (serverName == null || serverName.equals("localhost")) {
            return null;
        }
        
        // Split domain parts
        String[] parts = serverName.split("\\.");
        if (parts.length < 3) {
            return null; // No subdomain
        }
        
        String subdomain = parts[0];
        
        // Ignore common subdomains
        if ("www".equals(subdomain) || "api".equals(subdomain) || "auth".equals(subdomain)) {
            return null;
        }
        
        return subdomain;
    }
    
    /**
     * Build tenant domain URL from tenant ID
     */
    public String buildTenantUrl(String tenantId, boolean https) {
        if ("default".equals(tenantId)) {
            return (https ? "https" : "http") + "://localhost:3000";
        }
        
        return (https ? "https" : "http") + "://" + tenantId + ".openframe.com";
    }
}