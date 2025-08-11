package com.openframe.authz.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO for tenant discovery
 * Contains information about tenants and auth providers available for a given email
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantDiscoveryResponse {
    
    private String email;
    
    @JsonProperty("has_existing_accounts")
    private boolean hasExistingAccounts;
    
    private List<TenantInfo> tenants;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TenantInfo {
        
        @JsonProperty("tenant_id")
        private String tenantId;
        
        @JsonProperty("tenant_name")
        private String tenantName;
        
        @JsonProperty("tenant_domain")
        private String tenantDomain;
        
        @JsonProperty("openframe_url")
        private String openFrameUrl;
        
        @JsonProperty("auth_providers")
        private List<String> authProviders; // ["password", "google", "openframe_sso"]
        
        @JsonProperty("user_exists")
        private boolean userExists;
    }
}