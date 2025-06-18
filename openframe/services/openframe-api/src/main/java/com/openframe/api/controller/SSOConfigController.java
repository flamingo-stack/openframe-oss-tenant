package com.openframe.api.controller;

import com.openframe.api.dto.SSOConfigRequest;
import com.openframe.api.dto.SSOConfigResponse;
import com.openframe.api.dto.SSOConfigStatusResponse;
import com.openframe.api.dto.SSOProviderInfo;
import com.openframe.api.service.SSOConfigService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.http.HttpStatus.*;

@RestController
@RequestMapping("/sso")
@RequiredArgsConstructor
public class SSOConfigController {
    private final SSOConfigService ssoConfigService;

    /**
     * Get list of enabled SSO providers - used by login components
     * Returns list of configured and enabled providers with their client IDs
     */
    @GetMapping("/providers")
    @ResponseStatus(OK)
    public List<SSOConfigStatusResponse> getEnabledProviders() {
        return ssoConfigService.getEnabledProviders();
    }

    /**
     * Get list of available SSO providers - used by admin dropdowns
     * Returns all providers that have strategy implementations
     */
    @GetMapping("/providers/available")
    @ResponseStatus(OK)
    public List<SSOProviderInfo> getAvailableProviders() {
        return ssoConfigService.getAvailableProviders();
    }

    /**
     * Get full SSO configuration for admin forms
     */
    @GetMapping("/{provider}")
    @ResponseStatus(OK)
    public SSOConfigResponse getConfig(@PathVariable String provider) {
        return ssoConfigService.getConfig(provider);
    }

    @PostMapping("/{provider}")
    @ResponseStatus(CREATED)
    public SSOConfigResponse saveConfig(@PathVariable String provider, @Valid @RequestBody SSOConfigRequest request) {
        return ssoConfigService.saveConfig(provider, request);
    }

    @PutMapping("/{provider}")
    @ResponseStatus(OK)
    public SSOConfigResponse updateConfig(@PathVariable String provider, @Valid @RequestBody SSOConfigRequest request) {
        return ssoConfigService.updateConfig(provider, request);
    }

    @PatchMapping("/{provider}/toggle")
    @ResponseStatus(NO_CONTENT)
    public void toggleEnabled(@PathVariable String provider, @RequestParam boolean enabled) {
        ssoConfigService.toggleEnabled(provider, enabled);
    }

    @DeleteMapping("/{provider}")
    @ResponseStatus(NO_CONTENT)
    public void deleteConfig(@PathVariable String provider) {
        ssoConfigService.deleteConfig(provider);
    }
}