package com.openframe.api.dto.invitation;

import com.openframe.api.dto.Role;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.util.List;

@Data
@Builder
public class InvitationResponse {
    private String id;
    private String email;
    private List<Role> roles;
    private Instant createdAt;
    private Instant expiresAt;
    private InvitationStatus status;
}


