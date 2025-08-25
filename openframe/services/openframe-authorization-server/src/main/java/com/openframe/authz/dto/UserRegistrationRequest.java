package com.openframe.authz.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
    private String firstName;
    
    @NotBlank(message = "Last name is required")  
    private String lastName;
    
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-={}\\[\\]|:;\"'<>,.?/]).+$",
        message = "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character"
    )
    private String password;
    
    /**
     * Organization/tenant name for registration
     * This will be used to create a new tenant if it doesn't exist
     */
    @NotBlank(message = "Organization name is required")
    private String tenantName;
    
    /**
     * Tenant domain
     */
    @NotBlank(message = "Tenant domain is required")
    private String tenantDomain;
}