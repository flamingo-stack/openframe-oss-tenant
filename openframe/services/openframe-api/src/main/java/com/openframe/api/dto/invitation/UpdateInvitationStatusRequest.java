package com.openframe.api.dto.invitation;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateInvitationStatusRequest {
    @NotNull
    private InvitationStatus status;
}


