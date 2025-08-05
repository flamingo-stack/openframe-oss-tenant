package com.openframe.authz.service;

import com.openframe.authz.document.User;
import com.openframe.authz.dto.UserRegistrationRequest;
import com.openframe.authz.dto.TokenResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Base64;

@Slf4j
@Service
@RequiredArgsConstructor
public class RegistrationService {

    private final UserService userService;
    private final OAuthService oauthService;

    public TokenResponse registerUser(UserRegistrationRequest request, String authHeader) {
        if (!authHeader.startsWith("Basic ")) {
            throw new IllegalArgumentException("Client authentication required");
        }

        // Parse Basic Auth credentials
        String base64Credentials = authHeader.substring("Basic ".length()).trim();
        String credentials = new String(Base64.getDecoder().decode(base64Credentials));
        final String[] values = credentials.split(":", 2);

        if (values.length != 2) {
            throw new IllegalArgumentException("Invalid client credentials format");
        }

        final String clientId = values[0];
        final String clientSecret = values[1];

        // Validate client (basic validation for now)
        if (!"openframe-ui".equals(clientId)) {
            throw new IllegalArgumentException("Invalid client");
        }

        // Use tenant from request
        String tenantId = request.getTenantId();
        String tenantDomain = request.getTenantDomain();
        
        // Validate tenant (basic validation for now)
        validateTenant(tenantId);

        // Register user with domain
        User user = userService.registerUser(
            tenantId,
            tenantDomain,
            request.getEmail(),
            request.getFirstName(),
            request.getLastName(),
            request.getPassword()
        );

        // Generate tokens using OAuthService
        return oauthService.generateTokens(user, clientId, "registration");
    }

    /**
     * Validate tenant ID - basic validation for tenant existence and accessibility
     */
    private void validateTenant(String tenantId) {
        if (tenantId == null || tenantId.trim().isEmpty()) {
            throw new IllegalArgumentException("Tenant ID cannot be empty");
        }
        
        // Basic tenant validation - in production this should check tenant existence
        // and user permissions to access the tenant
        if (!tenantId.matches("^[a-zA-Z0-9_-]+$")) {
            throw new IllegalArgumentException("Invalid tenant ID format");
        }
        
        // TODO: Implement proper tenant validation
        // - Check if tenant exists
        // - Check if tenant is active
        // - Check if current user has access to the tenant
        log.debug("Validated tenant: {}", tenantId);
    }

    /**
     * Get current tenant ID - placeholder for tenant resolution logic
     */
    @SuppressWarnings("unused")
    private String getCurrentTenantId() {
        // TODO: Implement proper tenant resolution from context, domain, etc.
        return "localhost";
    }
}