package com.openframe.data.dto.user;

import com.openframe.data.dto.invitation.UserRole;
import com.openframe.data.dto.invitation.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthUser {
    private String id;
    private String tenantId;
    private String passwordHash;
    private Boolean emailVerified;
    private String loginProvider;
    private String email;
    private String firstName;
    private String lastName;
    private List<UserRole> roles;
    private UserStatus status;
}