package com.openframe.authz.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * User registration request DTO for multi-tenant registration
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRegistrationRequest {
    
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;
    
    @NotBlank(message = "First name is required")
    @JsonProperty("first_name")
    private String firstName;
    
    @NotBlank(message = "Last name is required")  
    @JsonProperty("last_name")
    private String lastName;
    
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;
    
    /**
     * Organization/tenant name for registration
     * This will be used to create a new tenant if it doesn't exist
     */
    @NotBlank(message = "Organization name is required")
    @JsonProperty("tenant_name")
    private String tenantName;
    
    /**
     * Tenant domain (optional, will be generated if not provided)
     * For development: localhost
     * For production: {tenantName}.openframe.io
     */
    @JsonProperty("tenant_domain")
    private String tenantDomain;
    
    /**
     * Get tenant domain, generating one if not provided
     */
    public String getTenantDomain() {
        if (tenantDomain != null && !tenantDomain.trim().isEmpty()) {
            return tenantDomain.trim();
        }
        
        // Generate domain based on tenant name
        if ("localhost".equalsIgnoreCase(tenantName)) {
            return "localhost";
        }
        
        return tenantName.toLowerCase() + ".openframe.io";
    }
}