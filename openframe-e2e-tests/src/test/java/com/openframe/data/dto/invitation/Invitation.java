package com.openframe.data.dto.invitation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Invitation {

    private String id;
    private String email;
    private List<UserRole> roles = new ArrayList<>();
    private Instant expiresAt;
    private InvitationStatus status = InvitationStatus.PENDING;
    private Instant createdAt;
    private Instant updatedAt;
}
