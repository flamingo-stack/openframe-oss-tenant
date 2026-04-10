import { useEffect, useRef, useState } from 'react';

const DEFAULT_DELAY_MS = 150;
const DEFAULT_MIN_DURATION_MS = 300;

interface UseDeferredLoadingOptions {
  /** Don't show loader at all if loading finishes before this (ms). Prevents flash on cache hits / fast responses. */
  delayMs?: number;
  /** Once shown, keep the loader visible for at least this long (ms). Prevents flash when response barely exceeds `delayMs`. */
  minDurationMs?: number;
}

/**
 * Delays showing a loading state and enforces a minimum visible duration.
 *
 * Three cases:
 * 1. Loading finishes before `delayMs` → loader never shown.
 * 2. Loading finishes between `delayMs` and `delayMs + minDurationMs` → loader stays visible until the minimum elapses.
 * 3. Loading finishes after `delayMs + minDurationMs` → loader hides as soon as loading ends.
 */
export function useDeferredLoading(isLoading: boolean, options: UseDeferredLoadingOptions = {}): boolean {
  const { delayMs = DEFAULT_DELAY_MS, minDurationMs = DEFAULT_MIN_DURATION_MS } = options;

  const [showLoading, setShowLoading] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const shownAtRef = useRef<number | null>(null);
  const isShownRef = useRef(false);

  useEffect(() => {
    if (isLoading) {
      // New load started — cancel any pending hide
      clearTimeout(hideTimerRef.current);
      // If loader is already visible, don't re-schedule a show
      if (isShownRef.current) return;
      showTimerRef.current = setTimeout(() => {
        isShownRef.current = true;
        shownAtRef.current = Date.now();
        setShowLoading(true);
      }, delayMs);
    } else {
      // Load finished — cancel any pending show (may not have fired yet)
      clearTimeout(showTimerRef.current);
      // If loader was never shown, nothing to do
      if (!isShownRef.current) return;

      const elapsed = Date.now() - (shownAtRef.current ?? Date.now());
      const remaining = minDurationMs - elapsed;

      if (remaining <= 0) {
        isShownRef.current = false;
        shownAtRef.current = null;
        setShowLoading(false);
      } else {
        hideTimerRef.current = setTimeout(() => {
          isShownRef.current = false;
          shownAtRef.current = null;
          setShowLoading(false);
        }, remaining);
      }
    }
  }, [isLoading, delayMs, minDurationMs]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      clearTimeout(showTimerRef.current);
      clearTimeout(hideTimerRef.current);
    },
    [],
  );

  return showLoading;
}
