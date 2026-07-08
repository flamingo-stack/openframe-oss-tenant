/**
 * Backend error codes returned by the SaaS-shared auth & registration endpoints
 * (domain availability, organization registration).
 *
 * Centralized so both the domain-availability check (choice-section) and the
 * organization registration handler (use-auth) reference the same constants
 * instead of duplicating string literals.
 */
export const AUTH_ERROR_CODE = {
  INVALID_ARGUMENT: 'INVALID_ARGUMENT',
  TENANT_REGISTRATION_BLOCKED: 'TENANT_REGISTRATION_BLOCKED',
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODE)[keyof typeof AUTH_ERROR_CODE];
