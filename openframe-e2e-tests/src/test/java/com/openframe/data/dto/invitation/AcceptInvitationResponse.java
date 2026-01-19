package com.openframe.data.dto.invitation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AcceptInvitationResponse {
    private String id;
    private String email;
    private String firstName;
    private String lastName;
    private List<UserRole> roles;
    private UserStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String tenantId;
    private String passwordHash;
    private Boolean emailVerified;
    private String loginProvider;
    private String externalUserId;
    private Instant lastLogin;
    private String fullName;
}
