package com.openframe.authz.service;

import com.openframe.authz.document.Tenant;
import com.openframe.authz.document.User;
import com.openframe.authz.dto.UserRegistrationRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class RegistrationService {

    private final UserService userService;
    private final TenantService tenantService;

    public Tenant registerTenant(UserRegistrationRequest request) {
        String tenantDomain = request.getTenantDomain();

        if (tenantService.existByDomain(tenantDomain)) {
            throw new IllegalArgumentException("Registration is closed for this organization");
        }

        boolean hasActiveUser = userService.findActiveByEmail(request.getEmail())
                .isPresent();

        if (hasActiveUser) {
            throw new IllegalArgumentException("Registration is closed for this user");
        }

        Tenant tenant = tenantService.createTenant(request.getTenantName(), tenantDomain);

        User user = userService.registerUser(
                tenant.getId(),
                tenant.getDomain(),
                request.getEmail(),
                request.getFirstName(),
                request.getLastName(),
                request.getPassword()
        );

        if (tenant.getOwnerId() == null) {
            tenant.setOwnerId(user.getId());
        }

        return tenantService.save(tenant);
    }
}