import { ADMIN_APPROVAL_REQUEST_CONTEXT_TYPE, type Notification } from '@flamingo-stack/openframe-frontend-core';

/** Context discriminator for a Mingo admin-chat AI message. */
export const ADMIN_AI_MESSAGE_CONTEXT_TYPE = 'ADMIN_AI_MESSAGE';

export interface NotificationAction {
  label: string;
  route: string;
}

const mingoDialogRoute = (dialogId: string) => `/mingo?dialogId=${encodeURIComponent(dialogId)}`;
const ticketRoute = (ticketId: string) => `/tickets/dialog?id=${encodeURIComponent(ticketId)}`;

/**
 * Resolve the navigation action a notification offers (button label + route), or null when it
 * points at no entity.
 */
export function resolveNotificationAction(notification: Notification): NotificationAction | null {
  const meta = notification.meta ?? {};
  const dialogId = typeof meta.dialogId === 'string' ? meta.dialogId : null;

  if (meta.contextType === ADMIN_APPROVAL_REQUEST_CONTEXT_TYPE) {
    const ticketId = typeof meta.ticketId === 'string' ? meta.ticketId : null;
    if (ticketId) return { label: 'Open Ticket', route: ticketRoute(ticketId) };
    if (dialogId) return { label: 'Open in Mingo', route: mingoDialogRoute(dialogId) };
  }

  if (meta.contextType === ADMIN_AI_MESSAGE_CONTEXT_TYPE && dialogId) {
    return { label: 'Open in Mingo', route: mingoDialogRoute(dialogId) };
  }

  return null;
}

/** Convenience for callers that only need the route (e.g. tile body navigation). */
export function resolveNotificationRoute(notification: Notification): string | null {
  return resolveNotificationAction(notification)?.route ?? null;
}
