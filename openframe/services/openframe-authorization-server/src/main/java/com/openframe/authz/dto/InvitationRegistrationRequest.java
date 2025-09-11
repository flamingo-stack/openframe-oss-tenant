package com.openframe.authz.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class InvitationRegistrationRequest {

    @NotBlank
    private String invitationId;

    @NotBlank
    private String password;

    private String firstName;
    private String lastName;

    private Boolean switchTenant;
}


