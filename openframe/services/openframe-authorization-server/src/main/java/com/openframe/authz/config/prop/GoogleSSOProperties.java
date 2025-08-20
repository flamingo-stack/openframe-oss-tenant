package com.openframe.authz.config.prop;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for Google SSO
 * Contains standard Google OAuth2 URLs and settings that are the same for all tenants
 */
@Data
@Component
@ConfigurationProperties(prefix = "openframe.sso.google")
public class GoogleSSOProperties {
    
    /**
     * Google OAuth2 authorization URL
     */
    private String authorizationUrl;
    
    /**
     * Google OAuth2 token URL
     */
    private String tokenUrl;
    
    /**
     * Google OAuth2 user info URL
     */
    private String userinfoUrl;
    
    /**
     * Google OAuth2 scopes
     */
    private String scopes;
    
    /**
     * Redirect URI for Google SSO callback
     */
    private String redirectUri;
    
    /**
     * Display name for Google provider
     */
    private String displayName;
    
    /**
     * Whether Google SSO is globally enabled
     */
    private boolean enabled;
    
    /**
     * Get scopes as array
     */
    public String[] getScopesArray() {
        return scopes != null ? scopes.split(",") : new String[0];
    }
}
