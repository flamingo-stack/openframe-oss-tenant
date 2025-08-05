package com.openframe.authz.controller;

import com.openframe.authz.dto.SSOConfigStatusResponse;
import com.openframe.authz.service.SSOConfigService;
import com.openframe.authz.service.TenantResolver;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.http.HttpStatus.*;

/**
 * SSO Management Controller for Authorization Server
 * Provides tenant-aware SSO provider management
 */
@RestController
@RequestMapping("/sso")
@RequiredArgsConstructor
public class SSOManagementController {
    private final SSOConfigService ssoConfigService;
    private final TenantResolver tenantResolver;

    /**
     * Get list of enabled SSO providers for current tenant
     * Supports multi-tenant resolution via subdomain, header, or parameter
     */
    @GetMapping("/providers")
    @ResponseStatus(OK)
    public List<SSOConfigStatusResponse> getEnabledProviders(HttpServletRequest request) {
        String tenantId = tenantResolver.resolveTenantId(request);
        return ssoConfigService.getEnabledProviders(tenantId);
    }
    
    /**
     * Get list of enabled SSO providers for specific tenant (admin endpoint)
     */
    @GetMapping("/providers/{tenantId}")
    @ResponseStatus(OK)
    public List<SSOConfigStatusResponse> getEnabledProvidersForTenant(@PathVariable String tenantId) {
        return ssoConfigService.getEnabledProviders(tenantId);
    }
}