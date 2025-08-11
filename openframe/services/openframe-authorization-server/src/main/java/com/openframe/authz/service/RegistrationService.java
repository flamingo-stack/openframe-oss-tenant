package com.openframe.authz.service;

import com.openframe.authz.document.Tenant;
import com.openframe.authz.document.User;
import com.openframe.authz.dto.UserRegistrationRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class RegistrationService {

    private final UserService userService;
    private final TenantService tenantService;

    public void registerUser(UserRegistrationRequest request, String authHeader) {
        Tenant tenant = getOrCreateTenant(request);
        if (!tenant.canRegister()) {
            throw new IllegalArgumentException("Registration is closed for this organization");
        }

        User user = userService.registerUser(
                tenant.getId(),
                tenant.getDomain(),
                request.getEmail(),
                request.getFirstName(),
                request.getLastName(),
                request.getPassword()
        );

        tenantService.closeRegistration(tenant.getId());

        if (tenant.getOwnerId() == null) {
            tenant.setOwnerId(user.getId());
            tenantService.save(tenant);
        }
    }

    /**
     * Get existing tenant or create new one based on request
     */
    private Tenant getOrCreateTenant(UserRegistrationRequest request) {
        String tenantDomain = request.getTenantDomain();

        Optional<Tenant> existingTenant = tenantService.findByDomain(tenantDomain);
        return existingTenant.orElseGet(() -> tenantService.createTenant(request.getTenantName(), tenantDomain, null));
    }

}