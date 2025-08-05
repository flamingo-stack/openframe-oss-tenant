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
 * User registration request DTO for multi-tenant domain-based registration
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
    
    @NotBlank(message = "Tenant domain is required")
    @JsonProperty("tenant_domain")
    private String tenantDomain; // Domain where user will be redirected after login
    
    // Generate tenant ID from domain (e.g., "company.com" -> "company")
    public String getTenantId() {
        if (tenantDomain == null) return "default";
        return tenantDomain.split("\\.")[0].toLowerCase();
    }
}