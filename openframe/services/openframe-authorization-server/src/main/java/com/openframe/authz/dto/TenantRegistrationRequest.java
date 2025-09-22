package com.openframe.authz.dto;

import com.openframe.core.validation.TenantDomain;
import com.openframe.core.validation.ValidEmail;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
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

    @ValidEmail
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
    @TenantDomain
    private String tenantDomain;
}