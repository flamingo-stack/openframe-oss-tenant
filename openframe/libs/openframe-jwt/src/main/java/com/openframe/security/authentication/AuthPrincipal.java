package com.openframe.security.authentication;

import lombok.Builder;
import lombok.Data;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;

/**
 * Wrapper for authenticated principal information extracted from JWT token.
 * Provides clean access to user claims without working with raw JWT.
 */
@Data
@Builder
public class AuthPrincipal {

    /**
     * User ID from 'sub' claim
     */
    private final String id;

    /**
     * User email from 'email' claim
     */
    private final String email;

    /**
     * User first name from 'given_name' or 'firstName' claim
     */
    private final String firstName;

    /**
     * User last name from 'family_name' or 'lastName' claim
     */
    private final String lastName;

    /**
     * User roles from 'roles' claim
     */
    private final List<String> roles;

    /**
     * OAuth scopes from 'scope' claim
     */
    private final List<String> scopes;

    /**
     * Tenant ID from 'tenant_id' claim
     */
    private final String tenantId;

    /**
     * Tenant domain from 'tenant_domain' claim
     */
    private final String tenantDomain;

    /**
     * Creates AuthPrincipal from JWT token
     */
    public static AuthPrincipal fromJwt(Jwt jwt) {
        return AuthPrincipal.builder()
                .id(jwt.getSubject())
                .email(jwt.getClaimAsString("email"))
                .firstName(getFirstNameFromJwt(jwt))
                .lastName(getLastNameFromJwt(jwt))
                .roles(jwt.getClaimAsStringList("roles"))
                .scopes(jwt.getClaimAsStringList("scope"))
                .tenantId(jwt.getClaimAsString("tenant_id"))
                .tenantDomain(jwt.getClaimAsString("tenant_domain"))
                .build();
    }

    private static String getFirstNameFromJwt(Jwt jwt) {
        // Try 'given_name' first (standard OAuth2 claim), then 'firstName'
        String firstName = jwt.getClaimAsString("given_name");
        if (firstName == null) {
            firstName = jwt.getClaimAsString("firstName");
        }
        return firstName;
    }

    private static String getLastNameFromJwt(Jwt jwt) {
        // Try 'family_name' first (standard OAuth2 claim), then 'lastName'
        String lastName = jwt.getClaimAsString("family_name");
        if (lastName == null) {
            lastName = jwt.getClaimAsString("lastName");
        }
        return lastName;
    }

    /**
     * Get display name (firstName + lastName)
     */
    public String getDisplayName() {
        if (firstName != null && lastName != null) {
            return firstName + " " + lastName;
        } else if (firstName != null) {
            return firstName;
        } else if (lastName != null) {
            return lastName;
        } else if (email != null) {
            return email.split("@")[0];
        }
        return id;
    }
} 