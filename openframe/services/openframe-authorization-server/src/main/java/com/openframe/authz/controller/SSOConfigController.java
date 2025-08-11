package com.openframe.authz.controller;

import com.openframe.authz.document.SSOConfig;
import com.openframe.authz.service.SSOConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/admin/sso")
@RequiredArgsConstructor
public class SSOConfigController {
    
    private final SSOConfigService ssoConfigService;

    /**
     * Get all SSO configurations for a tenant
     */
    @GetMapping("/configs/{tenantId}")
    public ResponseEntity<List<SSOConfig>> getSSOConfigs(@PathVariable String tenantId) {
        List<SSOConfig> configs = ssoConfigService.getSSOConfigsForTenant(tenantId);
        return ResponseEntity.ok(configs);
    }

    /**
     * Get active SSO configurations for a tenant
     */
    @GetMapping("/configs/{tenantId}/active")
    public ResponseEntity<List<SSOConfig>> getActiveSSOConfigs(@PathVariable String tenantId) {
        List<SSOConfig> configs = ssoConfigService.getActiveSSOConfigsForTenant(tenantId);
        return ResponseEntity.ok(configs);
    }

    /**
     * Get specific SSO configuration
     */
    @GetMapping("/configs/{tenantId}/{provider}")
    public ResponseEntity<SSOConfig> getSSOConfig(
            @PathVariable String tenantId,
            @PathVariable String provider) {
        return ssoConfigService.getSSOConfig(tenantId, provider)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Create or update SSO configuration
     */
    @PostMapping("/configs/{tenantId}")
    public ResponseEntity<SSOConfig> saveSSOConfig(
            @PathVariable String tenantId,
            @RequestBody SSOConfig config) {
        config.setTenantId(tenantId);
        SSOConfig savedConfig = ssoConfigService.saveSSOConfig(config);
        return ResponseEntity.ok(savedConfig);
    }

    /**
     * Enable SSO provider for a tenant
     */
    @PostMapping("/configs/{tenantId}/{provider}/enable")
    public ResponseEntity<SSOConfig> enableSSOProvider(
            @PathVariable String tenantId,
            @PathVariable String provider) {
        try {
            SSOConfig config = ssoConfigService.enableSSOProvider(tenantId, provider);
            return ResponseEntity.ok(config);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Disable SSO provider for a tenant
     */
    @PostMapping("/configs/{tenantId}/{provider}/disable")
    public ResponseEntity<SSOConfig> disableSSOProvider(
            @PathVariable String tenantId,
            @PathVariable String provider) {
        try {
            SSOConfig config = ssoConfigService.disableSSOProvider(tenantId, provider);
            return ResponseEntity.ok(config);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Delete SSO configuration
     */
    @DeleteMapping("/configs/{tenantId}/{provider}")
    public ResponseEntity<Void> deleteSSOConfig(
            @PathVariable String tenantId,
            @PathVariable String provider) {
        ssoConfigService.deleteSSOConfig(tenantId, provider);
        return ResponseEntity.ok().build();
    }

    /**
     * Create empty Google SSO configuration for a tenant
     */
    @PostMapping("/configs/{tenantId}/google/init")
    public ResponseEntity<SSOConfig> createEmptyGoogleConfig(@PathVariable String tenantId) {
        SSOConfig config = ssoConfigService.createEmptyGoogleConfig(tenantId);
        return ResponseEntity.ok(config);
    }

    /**
     * Get Google SSO configuration with properties merged
     */
    @GetMapping("/configs/{tenantId}/google/view")
    public ResponseEntity<SSOConfigService.GoogleSSOConfigView> getGoogleConfigView(@PathVariable String tenantId) {
        SSOConfigService.GoogleSSOConfigView configView = ssoConfigService.getGoogleConfigView(tenantId);
        return ResponseEntity.ok(configView);
    }



    /**
     * Check if SSO provider is active for a tenant
     */
    @GetMapping("/configs/{tenantId}/{provider}/status")
    public ResponseEntity<Map<String, Object>> getSSOProviderStatus(
            @PathVariable String tenantId,
            @PathVariable String provider) {
        boolean isActive = ssoConfigService.isSSOProviderActive(tenantId, provider);
        return ResponseEntity.ok(Map.of(
                "tenantId", tenantId,
                "provider", provider,
                "active", isActive
        ));
    }
}
