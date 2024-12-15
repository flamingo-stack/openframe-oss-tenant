package com.openframe.api.dto.oidc;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserInfo {
    private String sub;
    private String email;
    private boolean emailVerified;
} 