/**
 * Backend error codes returned by the SaaS-shared auth & registration endpoints
 * (access-code validation, domain availability, organization registration).
 *
 * Centralized so both the domain-availability check (choice-section) and the
 * organization registration handler (use-auth) reference the same constants
 * instead of duplicating string literals.
 */
export const AUTH_ERROR_CODE = {
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
  INVALID_ACCESS_CODE: 'INVALID_ACCESS_CODE',
  ACCESS_CODE_ALREADY_USED: 'ACCESS_CODE_ALREADY_USED',
  ACCESS_CODE_VALIDATION_FAILED: 'ACCESS_CODE_VALIDATION_FAILED',
  TENANT_REGISTRATION_BLOCKED: 'TENANT_REGISTRATION_BLOCKED',
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODE)[keyof typeof AUTH_ERROR_CODE];
