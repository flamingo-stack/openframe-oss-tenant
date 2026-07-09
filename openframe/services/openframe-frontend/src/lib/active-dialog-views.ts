/**
 * Tracks which chat dialogs are currently on screen with a live tail (mingo
 * page or chat drawer). Lets the notifications pipeline skip the popup and
 * auto-mark-read for messages the user is already watching arrive in the chat.
 */

const viewCounts = new Map<string, number>();
const listeners = new Set<() => void>();
const EMPTY_VIEWS: ReadonlySet<string> = new Set();
let snapshot: ReadonlySet<string> = EMPTY_VIEWS;

function rebuildSnapshot() {
  snapshot = new Set(viewCounts.keys());
  for (const listener of listeners) {
    listener();
  }
}

/** Mark a dialog as actively viewed. Returns an unregister cleanup for unmount. */
export function registerActiveDialogView(dialogId: string): () => void {
  const next = (viewCounts.get(dialogId) ?? 0) + 1;
  viewCounts.set(dialogId, next);
  if (next === 1) rebuildSnapshot();
  return () => {
    const remaining = (viewCounts.get(dialogId) ?? 1) - 1;
    if (remaining <= 0) {
      viewCounts.delete(dialogId);
      rebuildSnapshot();
    } else {
      viewCounts.set(dialogId, remaining);
    }
  };
}

/** True while any live chat surface is showing this dialog. */
export function isDialogViewActive(dialogId: string): boolean {
  return (viewCounts.get(dialogId) ?? 0) > 0;
}

/** Subscribe to active-view membership changes (for `useSyncExternalStore`). */
export function subscribeActiveDialogViews(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Current set of on-screen dialog ids; stable between membership changes. */
export function getActiveDialogViews(): ReadonlySet<string> {
  return snapshot;
}

export function getServerActiveDialogViews(): ReadonlySet<string> {
  return EMPTY_VIEWS;
}
