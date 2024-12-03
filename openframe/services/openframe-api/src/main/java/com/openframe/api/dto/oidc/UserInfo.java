package com.openframe.api.dto.oidc;

import lombok.Data;
import lombok.Builder;

@Data
@Builder
public class UserInfo {
    private String sub;
    private String email;
    private boolean emailVerified;
    private String name;
    private String givenName;
    private String familyName;
    private String picture;
} 