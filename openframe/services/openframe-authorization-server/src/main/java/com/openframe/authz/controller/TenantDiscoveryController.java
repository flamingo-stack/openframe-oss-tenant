package com.openframe.authz.controller;

import com.openframe.authz.dto.TenantAvailabilityResponse;
import com.openframe.authz.dto.TenantDiscoveryResponse;
import com.openframe.authz.service.TenantDiscoveryService;
import com.openframe.authz.service.TenantService;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
    private final TenantService tenantService;

    /**
     * Discover tenants and authentication providers for a given email
     * Used in the returning user flow
     */
    @GetMapping(value = "/discover", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<TenantDiscoveryResponse> discoverTenants(
            @RequestParam @Email @NotBlank String email) {
        
        log.debug("Tenant discovery request for email: {}", email);
        
        try {
            TenantDiscoveryResponse response = tenantDiscoveryService.discoverTenantsForEmail(email);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error discovering tenants for email {}: {}", email, e.getMessage());
            
            TenantDiscoveryResponse emptyResponse = TenantDiscoveryResponse.builder()
                    .email(email)
                    .hasExistingAccounts(false)
                    .build();
            
            return ResponseEntity.ok(emptyResponse);
        }
    }

    /**
     * Check if a tenant domain is available for registration
     * Used in the new user registration flow
     */
    @GetMapping(value = "/availability", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<TenantAvailabilityResponse> checkTenantAvailability(
            @RequestParam("domain") @NotBlank String domain) {
        
        log.debug("Checking tenant availability for domain: {}", domain);
        
        try {
            boolean isAvailable = tenantDiscoveryService.isTenantDomainAvailable(domain);
            
            String message;
            String suggestedUrl = null;
            
            if (isAvailable) {
                    message = "Domain is available";
                    suggestedUrl = String.format("https://%s", domain.toLowerCase());
            } else {
                message = "Domain is already taken";
            }
            
            TenantAvailabilityResponse response = TenantAvailabilityResponse.builder()
                    .tenantName(domain)
                    .isAvailable(isAvailable)
                    .suggestedUrl(suggestedUrl)
                    .message(message)
                    .build();
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error checking tenant availability for domain {}: {}", domain, e.getMessage());
            
            TenantAvailabilityResponse errorResponse = TenantAvailabilityResponse.builder()
                    .tenantName(domain)
                    .isAvailable(false)
                    .message("Unable to check domain availability. Please try again.")
                    .build();
            
            return ResponseEntity.ok(errorResponse);
        }
    }
}