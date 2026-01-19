package com.openframe.data.dto.invitation;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AcceptInvitationRequest {
    private String invitationId;
    private String firstName;
    private String lastName;
    private String password;
    private boolean switchTenant = false;
}
