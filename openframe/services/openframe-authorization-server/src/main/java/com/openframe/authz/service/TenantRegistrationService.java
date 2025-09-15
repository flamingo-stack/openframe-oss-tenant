package com.openframe.authz.service;

import com.openframe.authz.dto.TenantRegistrationRequest;
import com.openframe.data.document.auth.AuthUser;
import com.openframe.data.document.auth.Tenant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

import static com.openframe.data.document.user.UserRole.OWNER;

@Slf4j
@Service
@RequiredArgsConstructor
public class TenantRegistrationService {

    private final UserService userService;
    private final TenantService tenantService;

    public Tenant registerTenant(TenantRegistrationRequest request) {
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

        AuthUser user = userService.registerUser(
                tenant.getId(),
                request.getEmail(),
                request.getFirstName(),
                request.getLastName(),
                request.getPassword(),
                List.of(OWNER)
        );

        tenant.setOwnerId(user.getId());

        return tenantService.save(tenant);
        // TODO: publish to Kafka (future)
    }
}