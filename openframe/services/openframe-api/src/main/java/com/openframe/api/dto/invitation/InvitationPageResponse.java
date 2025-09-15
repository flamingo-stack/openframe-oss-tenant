package com.openframe.api.dto.invitation;

import com.openframe.core.dto.PageResponse;
import lombok.EqualsAndHashCode;
import lombok.experimental.SuperBuilder;

@EqualsAndHashCode(callSuper = true)
@SuperBuilder
public class InvitationPageResponse extends PageResponse<InvitationResponse> {
}


