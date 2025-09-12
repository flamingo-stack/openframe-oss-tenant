package com.openframe.authz.exception;

public class UserActiveInAnotherTenantException extends RuntimeException {
    public UserActiveInAnotherTenantException(String email) {
        super("User is active in another tenant: " + email);
    }
}
