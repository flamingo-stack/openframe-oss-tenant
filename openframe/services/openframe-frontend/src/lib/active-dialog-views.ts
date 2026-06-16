/**
 * Tracks which chat dialogs are currently on screen with a live tail (mingo
 * page or chat drawer). Lets the notifications pipeline skip the popup and
 * auto-mark-read for messages the user is already watching arrive in the chat.
 */

const viewCounts = new Map<string, number>();

/** Mark a dialog as actively viewed. Returns an unregister cleanup for unmount. */
export function registerActiveDialogView(dialogId: string): () => void {
  viewCounts.set(dialogId, (viewCounts.get(dialogId) ?? 0) + 1);
  return () => {
    const next = (viewCounts.get(dialogId) ?? 1) - 1;
    if (next <= 0) {
      viewCounts.delete(dialogId);
    } else {
      viewCounts.set(dialogId, next);
    }
  };
}

/** True while any live chat surface is showing this dialog. */
export function isDialogViewActive(dialogId: string): boolean {
  return (viewCounts.get(dialogId) ?? 0) > 0;
}
