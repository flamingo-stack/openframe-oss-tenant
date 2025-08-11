package com.openframe.authz.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AutoRegistrationRequest {
    @NotBlank @Email
    private String email;

    @NotBlank
    @JsonProperty("first_name")
    private String firstName;

    @NotBlank
    @JsonProperty("last_name")
    private String lastName;

    @NotBlank @Size(min = 8)
    private String password;

    @NotBlank
    @JsonProperty("tenant_name")
    private String tenantName;

    @JsonProperty("tenant_domain")
    private String tenantDomain;

    // PKCE
    @NotBlank
    @JsonProperty("pkce_challenge")
    private String pkceChallenge; // S256 from frontend

    @NotBlank
    @JsonProperty("redirect_uri")
    private String redirectUri; // callback URL used by frontend
}


