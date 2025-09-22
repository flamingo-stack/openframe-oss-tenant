package com.openframe.data.dto.request;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * User registration request DTO for tests
 * Represents the data structure used in API calls
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRegistrationRequest {
    
    private String email;
    private String firstName;
    private String lastName;
    private String password;
    private String tenantName;
    private String tenantDomain;
}
