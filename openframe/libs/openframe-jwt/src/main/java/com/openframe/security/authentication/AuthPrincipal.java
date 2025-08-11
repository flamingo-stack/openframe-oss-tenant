package com.openframe.security.authentication;

import lombok.Builder;
import lombok.Data;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;

import static java.util.Collections.emptyList;

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
        // Prefer userId; fallback to sub
        String userIdClaim = jwt.getClaimAsString("userId");
        String sub = jwt.getSubject();
        String id = (userIdClaim != null && !userIdClaim.isBlank()) ? userIdClaim : sub;

        // Roles list (optional)
        List<String> roles = jwt.getClaimAsStringList("roles");
        roles = (roles != null) ? roles : emptyList();

        // Scope: support list or space-delimited string
        List<String> scopes = jwt.getClaimAsStringList("scope");
        if (scopes == null) {
            String scopeStr = jwt.getClaimAsString("scope");
            if (scopeStr != null && !scopeStr.isBlank()) {
                scopes = java.util.Arrays.stream(scopeStr.split(" "))
                        .filter(s -> !s.isBlank())
                        .toList();
            } else {
                scopes = emptyList();
            }
        }

        String tenantId = jwt.getClaimAsString("tenant_id");
        String tenantDomain = jwt.getClaimAsString("tenant_domain");

        // Email: prefer explicit claim; fallback to sub if it looks like email
        String email = jwt.getClaimAsString("email");
        if ((email == null || email.isBlank()) && sub != null && sub.contains("@")) {
            email = sub;
        }

        return AuthPrincipal.builder()
                .id(id)
                .email(email)
                .firstName(getFirstNameFromJwt(jwt))
                .lastName(getLastNameFromJwt(jwt))
                .roles(roles)
                .scopes(scopes)
                .tenantId(tenantId)
                .tenantDomain(tenantDomain)
                .build();
    }

    private static String getFirstNameFromJwt(Jwt jwt) {
        return jwt.getClaimAsString("firstName");
    }

    private static String getLastNameFromJwt(Jwt jwt) {
        return jwt.getClaimAsString("lastName");
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