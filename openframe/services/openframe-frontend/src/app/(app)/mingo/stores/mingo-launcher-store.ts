import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { getMingoPrompt, type MingoPromptSource } from '../prompts/mingo-prompts';

/**
 * The transport a queued launcher prompt should be sent through. EmptyState
 * "Ask Mingo about X" buttons launch GUIDE mode (contextual section guidance);
 * the `'mingo'` value is kept for any future agent-mode launcher.
 */
export type MingoLaunchMode = 'guide' | 'mingo';

/**
 * Owns the Mingo chat drawer's open state (lifted out of `AppShell` so any page
 * can open it) plus a one-shot `pendingPrompt` (+ its target `pendingMode`) that
 * the chat embedder consumes on open to auto-send a context prompt.
 *
 * `askMingo(source)` is the single entry point used by EmptyState "Ask Mingo
 * about X" buttons: it resolves the source's prompt, opens the drawer, and
 * targets GUIDE mode. The embedder (`OpenframeEmbeddableChatEntry`) forces
 * `activeMode='guide'` and forwards the prompt to the lib's `guidePendingPrompt`
 * one-shot, then clears it via `consumePendingPrompt()`.
 */
interface MingoLauncherStore {
  isOpen: boolean;
  /** One-shot prompt to auto-send on the next drawer open; null once consumed. */
  pendingPrompt: string | null;
  /** Transport the queued prompt targets; null when nothing is queued. */
  pendingMode: MingoLaunchMode | null;

  setOpen: (open: boolean) => void;
  toggle: () => void;
  close: () => void;
  /** Open the drawer and queue the source's prompt (or an override) for Guide-mode auto-send. */
  askMingo: (source: MingoPromptSource, promptOverride?: string) => void;
  /** Open the drawer and queue a prompt for MINGO agent-mode auto-send — the chat
   *  entry drains it straight into a fresh Mingo dialog via `sendInNewDialog`. Used
   *  by agent-mode launchers (e.g. the onboarding "Meet Mingo" quick-action chips). */
  sendToMingo: (prompt: string) => void;
  /** Read and clear the pending prompt + mode in one step (safe against double-consume). */
  consumePendingPrompt: () => string | null;
}

export const useMingoLauncherStore = create<MingoLauncherStore>()(
  devtools(
    (set, get) => ({
      isOpen: false,
      pendingPrompt: null,
      pendingMode: null,

      setOpen: open => set({ isOpen: open }, false, 'setOpen'),
      toggle: () => set(state => ({ isOpen: !state.isOpen }), false, 'toggle'),
      close: () => set({ isOpen: false }, false, 'close'),

      askMingo: (source, promptOverride) =>
        set(
          { isOpen: true, pendingPrompt: promptOverride ?? getMingoPrompt(source), pendingMode: 'guide' },
          false,
          'askMingo',
        ),

      sendToMingo: prompt => set({ isOpen: true, pendingPrompt: prompt, pendingMode: 'mingo' }, false, 'sendToMingo'),

      consumePendingPrompt: () => {
        const { pendingPrompt } = get();
        if (pendingPrompt !== null) set({ pendingPrompt: null, pendingMode: null }, false, 'consumePendingPrompt');
        return pendingPrompt;
      },
    }),
    { name: 'mingo-launcher-store' },
  ),
);
