'use client';

import { useMingoLauncherStore } from '../stores/mingo-launcher-store';

/**
 * Launcher hook for opening the Mingo chat with a context prompt. Returns the
 * store's `askMingo(source, promptOverride?)` action so call sites import one
 * thing:
 *
 *   const askMingo = useAskMingo();
 *   <EmptyState ... onButtonClick={() => askMingo('queries')} />
 */
export function useAskMingo() {
  return useMingoLauncherStore(s => s.askMingo);
}
