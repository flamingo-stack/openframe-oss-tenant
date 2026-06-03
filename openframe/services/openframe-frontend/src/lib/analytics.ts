import { apiClient } from '@/lib/api-client';

/**
 * Dashboard activity (button/action) tracking.
 *
 * Fire-and-forget analytics for high-signal activation events. Tracking must
 * never block, delay, or break the UX — `trackDashboardActivity` returns
 * immediately and swallows every error.
 *
 * See `docs/dashboard-activity-events.md` for the full event catalog.
 */

/** Always this value for every tracked dashboard activity event. */
export const EVENT_TYPE = 'DASHBOARD_ACTIVITY' as const;

/**
 * `SINGULAR` = count once per user (one-time activation milestone).
 * `MULTI` = count every occurrence (recurring engagement).
 */
export const REPEAT_MODE = {
  SINGULAR: 'SINGULAR',
  MULTI: 'MULTI',
} as const;

export type RepeatMode = (typeof REPEAT_MODE)[keyof typeof REPEAT_MODE];

/**
 * Single source of truth for event subtypes. Call sites must pass one of these
 * constants — never a hand-written string. Naming convention:
 * `<action>_<surface>` where surface is `main_dashboard` | `mingo` |
 * `ticket_detail`.
 */
export const EVENT_SUBTYPE = {
  // /dashboard — Get Started checklist
  ADD_DEVICE: 'add_device_main_dashboard',
  ADD_SSO_IDP: 'add_sso_idp_main_dashboard',
  SKIP_ONBOARDING: 'skip_onboarding_main_dashboard',
  // /mingo — chat
  SEND_MINGO_MESSAGE: 'send_mingo_message_mingo',
  APPROVE_MINGO_COMMAND: 'approve_mingo_command_mingo',
  REJECT_MINGO_COMMAND: 'reject_mingo_command_mingo',
  // /tickets/dialog — ticket detail
  OPEN_REMOTE_SHELL: 'open_remote_shell_ticket_detail',
  OPEN_REMOTE_CONTROL: 'open_remote_control_ticket_detail',
  RESOLVE_TICKET: 'resolve_ticket_ticket_detail',
  START_DIRECT_CHAT: 'start_direct_chat_ticket_detail',
} as const;

export type EventSubtype = (typeof EVENT_SUBTYPE)[keyof typeof EVENT_SUBTYPE];

/**
 * Subtypes counted once per user (`SINGULAR`). Everything else is `MULTI`
 * (every occurrence counts). Keeping this here means call sites never pass a
 * repeat mode — it is derived from the subtype.
 */
const SINGULAR_SUBTYPES: ReadonlySet<EventSubtype> = new Set([
  EVENT_SUBTYPE.SKIP_ONBOARDING,
  EVENT_SUBTYPE.ADD_SSO_IDP,
]);

function repeatModeFor(subtype: EventSubtype): RepeatMode {
  return SINGULAR_SUBTYPES.has(subtype) ? REPEAT_MODE.SINGULAR : REPEAT_MODE.MULTI;
}

/**
 * Fire-and-forget POST to `/api/events`. Does not return a promise, never
 * throws, and never affects the calling flow. Safe to call from event handlers
 * and mutation success callbacks.
 */
export function trackDashboardActivity(subtype: EventSubtype): void {
  try {
    void apiClient
      .post('/api/events', {
        eventType: EVENT_TYPE,
        subtype,
        repeatMode: repeatModeFor(subtype),
      })
      .catch(() => {
        // Analytics must never surface errors to the user.
      });
  } catch {
    // Swallow synchronous failures too (e.g. serialization edge cases).
  }
}
