package com.openframe.authz.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.experimental.SuperBuilder;

/**
 * User registration request DTO for multi-tenant registration
 */
@Data
@EqualsAndHashCode(callSuper = true)
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
public class TenantRegistrationRequest extends CoreUserRequest {
    
    @NotBlank(message = "Email is required")
    @Email(
            regexp = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}$",
            message = "Invalid email format"
    )
    private String email;
    
    /**
     * Organization/tenant name for registration
     * This will be used to create a new tenant if it doesn't exist
     */
    @NotBlank(message = "Organization name is required")
    @Pattern(
            regexp = "^[\\p{L}\\p{M}0-9&.,'’\"()\\- ]{2,100}$",
            message = "Invalid organization name"
    )
    private String tenantName;
    
    /**
     * Tenant domain
     */
    @NotBlank(message = "Tenant domain is required")
    private String tenantDomain;
}