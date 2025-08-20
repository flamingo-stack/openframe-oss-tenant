package com.openframe.authz.document;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

/**
 * SSO Configuration document
 * Contains only tenant-specific data (clientId, clientSecret)
 * Standard OAuth URLs are configured in application properties
 */
@Data
@Builder(toBuilder = true)
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "sso_configs")
@CompoundIndex(def = "{'tenantId': 1, 'provider': 1}", unique = true)
public class SSOConfig {
    
    @Id
    private String id;
    
    /**
     * Tenant ID this SSO configuration belongs to
     */
    @Indexed
    private String tenantId;
    
    /**
     * SSO provider (google, microsoft, slack, etc.)
     */
    @Indexed
    private String provider;
    
    /**
     * OAuth2 client ID (tenant-specific)
     */
    private String clientId;
    
    /**
     * Encrypted OAuth2 client secret (tenant-specific)
     */
    private String clientSecret;
    
    /**
     * Whether this SSO provider is enabled for this tenant
     */
    @Builder.Default
    private boolean enabled = false;
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;

    /**
     * Check if this SSO configuration is active (enabled and has credentials)
     */
    public boolean isActive() {
        return enabled && clientId != null && !clientId.trim().isEmpty() 
               && clientSecret != null && !clientSecret.trim().isEmpty();
    }
}
