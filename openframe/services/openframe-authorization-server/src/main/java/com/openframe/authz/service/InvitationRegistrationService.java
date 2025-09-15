package com.openframe.authz.service;

import com.openframe.authz.dto.InvitationRegistrationRequest;
import com.openframe.authz.exception.UserActiveInAnotherTenantException;
import com.openframe.data.document.auth.AuthInvitation;
import com.openframe.data.document.auth.AuthUser;
import com.openframe.data.repository.auth.AuthInvitationRepository;
import com.openframe.data.repository.auth.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;

import static com.openframe.data.document.user.InvitationStatus.ACCEPTED;
import static com.openframe.data.document.user.InvitationStatus.PENDING;
import static java.lang.Boolean.TRUE;

@Slf4j
@Service
@RequiredArgsConstructor
public class InvitationRegistrationService {

    private final UserService userService;
    private final AuthInvitationRepository invitationRepository;
    private final TenantRepository tenantRepository;

    @Value("${openframe.tenancy.local-tenant:false}")
    private boolean localTenant;

    public AuthUser registerByInvitation(InvitationRegistrationRequest request) {
        AuthInvitation invitation = invitationRepository.findById(request.getInvitationId())
                .orElseThrow(() -> new IllegalArgumentException("Invitation not found"));

        if (!PENDING.equals(invitation.getStatus())) {
            throw new IllegalStateException("Invitation already used or revoked");
        }
        if (invitation.getExpiresAt() != null && invitation.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalStateException("Invitation expired");
        }

        var existing = userService.findActiveByEmail(invitation.getEmail());
        if (existing.isPresent()) {
            if (TRUE.equals(request.getSwitchTenant())) {
                userService.deactivateUser(existing.get());
            } else {
                throw new UserActiveInAnotherTenantException(invitation.getEmail());
            }
        }

        String tenantId = invitation.getTenantId();
        if(localTenant){
            tenantId = tenantRepository.findAll().getFirst().getId();
        }

        AuthUser user = userService.registerUser(
                tenantId,
                invitation.getEmail(),
                request.getFirstName(),
                request.getLastName(),
                request.getPassword(),
                invitation.getRoles()
        );

        invitation.setStatus(ACCEPTED);
        invitationRepository.save(invitation);

        // TODO: publish to Kafka user info (future)

        return user;
    }
}


