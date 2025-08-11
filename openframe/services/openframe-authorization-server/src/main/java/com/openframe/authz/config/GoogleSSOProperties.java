package com.openframe.authz.config;

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
    private String authorizationUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    
    /**
     * Google OAuth2 token URL
     */
    private String tokenUrl = "https://oauth2.googleapis.com/token";
    
    /**
     * Google OAuth2 user info URL
     */
    private String userinfoUrl = "https://www.googleapis.com/oauth2/v3/userinfo";
    
    /**
     * Google OAuth2 scopes
     */
    private String scopes = "openid,email,profile";
    
    /**
     * Redirect URI for Google SSO callback
     */
    private String redirectUri = "https://localhost/oauth2/callback/google";
    
    /**
     * Display name for Google provider
     */
    private String displayName = "Google";
    
    /**
     * Whether Google SSO is globally enabled
     */
    private boolean enabled = true;
    
    /**
     * Get scopes as array
     */
    public String[] getScopesArray() {
        return scopes != null ? scopes.split(",") : new String[0];
    }
}
