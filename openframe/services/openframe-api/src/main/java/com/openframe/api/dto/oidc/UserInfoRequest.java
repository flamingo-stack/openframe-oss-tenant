package com.openframe.api.dto.oidc;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserInfoRequest {
    private String userId;
    private String email;
    private String firstName;
    private String lastName;
}
