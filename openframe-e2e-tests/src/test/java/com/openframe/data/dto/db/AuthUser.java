package com.openframe.data.dto.db;

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
    private String _id;
    private String tenantId;
    private String passwordHash;
    private Boolean emailVerified;
    private String loginProvider;
    private String email;
    private String firstName;
    private String lastName;
    private List<String> roles;
    private String status;
}