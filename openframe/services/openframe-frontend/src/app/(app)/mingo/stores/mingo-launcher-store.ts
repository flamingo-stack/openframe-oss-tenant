import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { getMingoPrompt, type MingoPromptSource } from '../prompts/mingo-prompts';

/**
 * Owns the Mingo chat drawer's open state (lifted out of `AppShell` so any page
 * can open it) plus a one-shot `pendingPrompt` that the chat embedder consumes
 * on open to auto-send a context prompt.
 *
 * `askMingo(source)` is the single entry point used by EmptyState "Ask Mingo
 * about X" buttons: it resolves the source's prompt and opens the drawer. The
 * embedder (`OpenframeEmbeddableChatEntry`) drains `pendingPrompt` via
 * `consumePendingPrompt()` once it mounts, starting a fresh dialog with the
 * prompt already sent.
 */
interface MingoLauncherStore {
  isOpen: boolean;
  /** One-shot prompt to auto-send on the next drawer open; null once consumed. */
  pendingPrompt: string | null;

  setOpen: (open: boolean) => void;
  toggle: () => void;
  close: () => void;
  /** Open the drawer and queue the source's prompt (or an override) for auto-send. */
  askMingo: (source: MingoPromptSource, promptOverride?: string) => void;
  /** Read and clear the pending prompt in one step (safe against double-consume). */
  consumePendingPrompt: () => string | null;
}

export const useMingoLauncherStore = create<MingoLauncherStore>()(
  devtools(
    (set, get) => ({
      isOpen: false,
      pendingPrompt: null,

      setOpen: open => set({ isOpen: open }, false, 'setOpen'),
      toggle: () => set(state => ({ isOpen: !state.isOpen }), false, 'toggle'),
      close: () => set({ isOpen: false }, false, 'close'),

      askMingo: (source, promptOverride) =>
        set({ isOpen: true, pendingPrompt: promptOverride ?? getMingoPrompt(source) }, false, 'askMingo'),

      consumePendingPrompt: () => {
        const { pendingPrompt } = get();
        if (pendingPrompt !== null) set({ pendingPrompt: null }, false, 'consumePendingPrompt');
        return pendingPrompt;
      },
    }),
    { name: 'mingo-launcher-store' },
  ),
);
