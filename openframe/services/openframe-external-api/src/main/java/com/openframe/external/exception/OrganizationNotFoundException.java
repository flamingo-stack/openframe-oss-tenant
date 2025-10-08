package com.openframe.external.exception;

/**
 * Exception thrown when an organization is not found.
 */
public class OrganizationNotFoundException extends RuntimeException {
    
    public OrganizationNotFoundException(String organizationId) {
        super("Organization not found: " + organizationId);
    }
}
