'use client';

import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useEffect, useRef, useState } from 'react';

interface UseSearchParamResult {
  /** Controlled value for the search input. */
  search: string;
  /** Updates the input immediately (drives `search`). */
  setSearch: (value: string) => void;
  /** Debounced value — feed this to the query; it's also pushed via `onDebouncedChange`. */
  debouncedSearch: string;
}

/**
 * Bridges a free-typing search input to a URL/query param (via `useApiParams`)
 * without the race that erases in-progress typing.
 *
 * Flow:
 * - `search` / `setSearch` drive the controlled input — instant, local, never
 *   reverted mid-typing.
 * - `debouncedSearch` is pushed UP through `onDebouncedChange` (e.g. `setParam`)
 *   and is what you pass to the query.
 * - A genuine external param change (browser back/forward) syncs DOWN into the
 *   input. The echo of our own debounced write is ignored via `lastSyncedRef`, so
 *   characters typed while a fetch is in flight are never clobbered.
 *
 * @param paramValue        Current value of the URL/query param.
 * @param onDebouncedChange Called with the debounced value to write it back to
 *                          the param — e.g. `(v) => setParam('search', v)`.
 * @param delay             Debounce delay in ms (default 300).
 */
export function useSearchParam(
  paramValue: string,
  onDebouncedChange: (value: string) => void,
  delay = 300,
): UseSearchParamResult {
  const [search, setSearch] = useState(paramValue);
  const debouncedSearch = useDebounce(search, delay);

  // `onDebouncedChange` is typically a fresh closure each render — read it from a
  // ref so the write-up effect keys on the debounced value only.
  const onChangeRef = useRef(onDebouncedChange);
  onChangeRef.current = onDebouncedChange;

  // Last value we pushed up, so we can tell our own echo from an external change.
  const lastSyncedRef = useRef(paramValue);

  // Sync UP: debounced input → param. Skip when the value already matches what's
  // in the param (notably the initial mount, where `debouncedSearch` starts equal
  // to `paramValue`). Writing an unchanged value still triggers a `router.replace`
  // that, raced against an in-flight navigation (e.g. a urlSync tab switch reading
  // a stale URL snapshot), can clobber other params — so only write real changes.
  useEffect(() => {
    if (debouncedSearch === lastSyncedRef.current) return;
    lastSyncedRef.current = debouncedSearch;
    onChangeRef.current(debouncedSearch);
  }, [debouncedSearch]);

  // Sync DOWN: external param change (back/forward) → input. Skip our own echo so
  // characters typed during an in-flight fetch aren't reverted.
  useEffect(() => {
    if (paramValue !== lastSyncedRef.current) {
      lastSyncedRef.current = paramValue;
      setSearch(paramValue);
    }
  }, [paramValue]);

  return { search, setSearch, debouncedSearch };
}
