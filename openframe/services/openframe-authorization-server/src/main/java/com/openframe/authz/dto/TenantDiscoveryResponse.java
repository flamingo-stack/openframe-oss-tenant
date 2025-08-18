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

    @JsonProperty("tenant_id")
    private String tenantId;

    @JsonProperty("auth_providers")
    private List<String> authProviders;
}