package com.openframe.authz.controller;

import com.openframe.authz.dto.TenantDiscoveryResponse;
import com.openframe.authz.service.TenantDiscoveryService;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import static org.springframework.http.HttpStatus.OK;

/**
 * Controller for tenant discovery and availability checking
 * Used during the multi-tenant login and registration flow
 */
@Slf4j
@RestController
@RequestMapping("/tenant")
@RequiredArgsConstructor
public class TenantDiscoveryController {

    private final TenantDiscoveryService tenantDiscoveryService;

    /**
     * Discover tenants and authentication providers for a given email
     * Used in the returning user flow
     */
    @GetMapping(value = "/discover", produces = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(OK)
    public TenantDiscoveryResponse discoverTenants(
            @RequestParam @Email @NotBlank String email) {
        
        log.debug("Tenant discovery request for email: {}", email);
        return tenantDiscoveryService.discoverTenantForEmail(email);
    }
}