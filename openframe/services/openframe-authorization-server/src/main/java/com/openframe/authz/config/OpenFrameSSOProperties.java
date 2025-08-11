package com.openframe.authz.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for OpenFrame SSO
 */
@Data
@Component
@ConfigurationProperties(prefix = "openframe.sso.openframe")
public class OpenFrameSSOProperties {
    
    /**
     * OpenFrame SSO client ID
     */
    private String clientId = "openframe-ui";
    
    /**
     * Redirect URI for OpenFrame SSO callback
     */
    private String redirectUri = "https://localhost/oauth2/callback/openframe-sso";
    
    /**
     * Authorization URL for OpenFrame SSO
     */
    private String authorizationUrl = "https://localhost:9000/oauth2/authorize";
    
    /**
     * Token URL for OpenFrame SSO
     */
    private String tokenUrl = "https://localhost:9000/oauth2/token";
    
    /**
     * User info URL for OpenFrame SSO
     */
    private String userinfoUrl = "https://localhost:9000/oauth/userinfo";
    
    /**
     * Scopes for OpenFrame SSO
     */
    private String scopes = "openid,email,profile";
    
    /**
     * Whether OpenFrame SSO is enabled
     */
    private boolean enabled = true;
    
    /**
     * Get scopes as array
     */
    public String[] getScopesArray() {
        return scopes != null ? scopes.split(",") : new String[0];
    }
}
