package com.openframe.api.dto.oidc;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.Data;
import lombok.Builder;

@Data
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserInfo {
    private String sub;
    private String name;
    @JsonProperty("given_name")
    private String givenName;
    @JsonProperty("family_name")
    private String familyName;
    private String email;
    @JsonProperty("email_verified")
    private Boolean emailVerified;
    private String error;
    @JsonProperty("error_description")
    private String errorDescription;
} 