package com.openframe.api.controller;

import com.openframe.api.dto.SSOConfigRequest;
import com.openframe.api.dto.SSOConfigResponse;
import com.openframe.api.dto.SSOConfigStatusResponse;
import com.openframe.api.service.SSOConfigService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import static org.springframework.http.HttpStatus.*;

@RestController
@RequestMapping("/sso")
@RequiredArgsConstructor
public class SSOConfigController {
    private final SSOConfigService ssoConfigService;

    /**
     * Get SSO provider status - used by login components to check if provider is available
     * Returns minimal information needed for OAuth flow
     */
    @GetMapping("/{provider}/status")
    @ResponseStatus(OK)
    public SSOConfigStatusResponse getConfigStatus(@PathVariable String provider) {
        return ssoConfigService.getConfigStatus(provider);
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