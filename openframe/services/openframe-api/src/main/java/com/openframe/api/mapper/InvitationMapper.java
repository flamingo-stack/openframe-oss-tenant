package com.openframe.api.mapper;

import com.openframe.api.dto.Role;
import com.openframe.api.dto.invitation.CreateInvitationRequest;
import com.openframe.api.dto.invitation.InvitationResponse;
import com.openframe.api.dto.invitation.InvitationStatus;
import com.openframe.data.document.user.Invitation;
import com.openframe.data.document.user.UserRole;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static com.openframe.data.document.user.InvitationStatus.PENDING;
import static com.openframe.data.document.user.UserRole.ADMIN;
import static java.util.UUID.randomUUID;

@Component
public class InvitationMapper {

    @Value("${invitation.ttl:24h}")
    private Duration ttl;

    public Invitation toEntity(CreateInvitationRequest request) {
        Instant createdAt = Instant.now();

        return Invitation.builder()
                .id(randomUUID().toString())
                .email(request.getEmail())
                .roles(request.getRoles() != null ? request.getRoles().stream().map(r -> UserRole.valueOf(r.name())).toList() : List.of(ADMIN))
                .createdAt(createdAt)
                .expiresAt(createdAt.plus(ttl))
                .status(PENDING)
                .build();
    }

    public InvitationResponse toResponse(Invitation entity) {
        InvitationStatus status = InvitationStatus.valueOf(entity.getStatus().name());
        if (status == InvitationStatus.PENDING && entity.getExpiresAt().isBefore(Instant.now())) {
            status = InvitationStatus.EXPIRED;
        }

        return InvitationResponse.builder()
                .id(entity.getId())
                .email(entity.getEmail())
                .roles(entity.getRoles().stream().map(r -> Role.valueOf(r.name())).toList())
                .createdAt(entity.getCreatedAt())
                .expiresAt(entity.getExpiresAt())
                .status(status)
                .build();
    }
}
