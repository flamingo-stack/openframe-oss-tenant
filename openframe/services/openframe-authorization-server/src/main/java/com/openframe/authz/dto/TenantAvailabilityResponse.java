package com.openframe.authz.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for tenant name availability check
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TenantAvailabilityResponse {
    
    @JsonProperty("tenant_name")
    private String tenantName;
    
    @JsonProperty("is_available")
    private boolean isAvailable;
    
    @JsonProperty("suggested_url")
    private String suggestedUrl;
    
    private String message;
}