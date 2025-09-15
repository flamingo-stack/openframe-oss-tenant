package com.openframe.api.dto.user;

import com.openframe.core.dto.PageResponse;
import lombok.EqualsAndHashCode;
import lombok.experimental.SuperBuilder;

@EqualsAndHashCode(callSuper = true)
@SuperBuilder
public class UserPageResponse extends PageResponse<UserResponse> {
}


