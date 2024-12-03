package com.openframe.api.dto.oidc;

import java.util.List;
import lombok.Data;
import lombok.Builder;

@Data
@Builder
public class OpenIDConfiguration {
    private String issuer;
    private String authorizationEndpoint;
    private String tokenEndpoint;
    private String userinfoEndpoint;
    private String jwksUri;
    private List<String> responseTypesSupported;
    private List<String> subjectTypesSupported;
    private List<String> idTokenSigningAlgValuesSupported;
} 