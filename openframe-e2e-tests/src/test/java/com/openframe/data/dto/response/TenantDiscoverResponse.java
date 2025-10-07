package com.openframe.data.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
public class TenantDiscoverResponse {
    private String email;
    
    @JsonProperty("has_existing_accounts")
    private Boolean hasExistingAccounts;
    
    @JsonProperty("tenant_id")
    private String tenantId;
    
    @JsonProperty("auth_providers")
    private List<String> authProviders;
}

