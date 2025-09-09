package com.openframe.authz.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.List;

@Data
@Component
@ConfigurationProperties(prefix = "openframe.sso.google")
public class GoogleSSOProperties {

    public static final String GOOGLE = "google";

    private String registrationRedirectUri;
    private String loginRedirectUri;

    private String authorizationUrl;
    private String tokenUrl;
    private String userInfoUrl;
    private String issuerUri;
    private String jwkSetUri;

    private List<String> scopes;
}


