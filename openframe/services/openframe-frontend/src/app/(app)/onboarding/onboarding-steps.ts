/**
 * Canonical onboarding step order + counting helpers.
 *
 * The two enums come from the backend schema (`npm run generate-enums`):
 * `TenantOnboardingStep` drives the tenant "Initial Setup" card on the dashboard,
 * `UserOnboardingStep` drives the per-user "Get Started" page. The ordered arrays
 * below are the single source of truth for how many steps each surface has and in
 * what order they render — nothing counts steps by a hardcoded number anymore.
 */
import { TenantOnboardingStep, UserOnboardingStep } from '@/generated/schema-enums';

/** Tenant "Initial Setup" steps, in display order. */
export const TENANT_ONBOARDING_STEPS: readonly TenantOnboardingStep[] = [
  TenantOnboardingStep.MSP_SETUP,
  TenantOnboardingStep.CUSTOMERS_SETUP,
  TenantOnboardingStep.DEVICE_MANAGEMENT,
  TenantOnboardingStep.COMPANY_TEAM,
];

/** User "Get Started" steps, in display order. */
export const USER_ONBOARDING_STEPS: readonly UserOnboardingStep[] = [
  UserOnboardingStep.CUSTOMERS_SETUP,
  UserOnboardingStep.DEVICE_MANAGEMENT,
  UserOnboardingStep.TICKETS,
  UserOnboardingStep.SCRIPTING,
  UserOnboardingStep.MONITORING,
  UserOnboardingStep.LOGGING,
  UserOnboardingStep.KNOWLEDGE_MANAGEMENT,
  UserOnboardingStep.MEET_MINGO,
];

/** Count how many of `steps` appear in `completedSteps` (order-independent). */
export function countCompleted<T extends string>(steps: readonly T[], completedSteps: readonly T[]): number {
  const done = new Set(completedSteps);
  return steps.reduce((count, step) => (done.has(step) ? count + 1 : count), 0);
}

/** Whether a given step is in the completed set. */
export function isStepDone<T extends string>(step: T, completedSteps: readonly T[]): boolean {
  return completedSteps.includes(step);
}
