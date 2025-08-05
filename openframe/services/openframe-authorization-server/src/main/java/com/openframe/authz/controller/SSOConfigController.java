package com.openframe.authz.controller;

import com.openframe.authz.dto.SSOConfigStatusResponse;
import com.openframe.authz.service.SSOConfigService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.http.HttpStatus.*;

/**
 * SSO Configuration Controller for Authorization Server
 * Provides SSO provider information for login screens
 */
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
}