package com.openframe.api.dto.invitation;

import com.openframe.api.dto.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CreateInvitationRequest {
    @NotBlank
    @Email
    private String email;

    private List<Role> roles;
}


