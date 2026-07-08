/**
 * Static onboarding demo state — there is no backend yet, so the whole onboarding
 * feature is a dumb static prototype. Tweak these to change what the UI shows.
 * The per-step "completed / active" statuses are hardcoded directly in the
 * components (onboarding-content.tsx, initial-setup-card.tsx).
 */

// Tenant "Initial Setup": 4 steps, 3 shown as done. `> 0` flips the top-bar
// label from "Start Setup" to "Continue Setup". Set to 4 (== total) to leave the
// tenant phase and preview the per-user tour bar instead.
export const INITIAL_SETUP_TOTAL = 4;
export const INITIAL_SETUP_DONE = 3;

// User "Get Started": 8 steps, 2 shown as done → sidebar badge is 6. `> 0` flips
// the tour-bar label from "Take the Tour" to "Continue Onboarding".
export const USER_ONBOARDING_TOTAL = 8;
export const USER_ONBOARDING_DONE = 2;
export const USER_ONBOARDING_REMAINING = USER_ONBOARDING_TOTAL - USER_ONBOARDING_DONE;
