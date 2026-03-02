'use client';

import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { tacticalApiClient } from '../../../lib/tactical-api-client';
import type { ScriptEntry } from '../stores/scripts-store';

const PAGE_SIZE = 25;

async function fetchScriptsV2(search: string, platforms: string[]): Promise<ScriptEntry[]> {
  const response = await tacticalApiClient.getScriptsV2({
    search: search || undefined,
    page_size: PAGE_SIZE,
    supported_platforms: platforms.length ? platforms.join(',') : undefined,
  });

  if (!response.ok) {
    throw new Error(response.error || `Request failed with status ${response.status}`);
  }

  return response.data?.results ?? [];
}

async function fetchScriptById(id: number): Promise<ScriptEntry> {
  const response = await tacticalApiClient.getScript(String(id));

  if (!response.ok) {
    throw new Error(response.error || `Request failed with status ${response.status}`);
  }

  return response.data as ScriptEntry;
}

/**
 * Hook for server-side script autocomplete backed by /v2/scripts/.
 *
 * Loading strategy:
 * - The search query is lazy: it only fires while the dropdown is active (focused).
 *   This avoids redundant requests on mount, especially when multiple cards are rendered.
 * - On blur the input text is cleared so the next open always starts with an unfiltered list.
 * - On re-focus the query refetches (staleTime: 0) — intentional "refresh on open" behaviour.
 *
 * Edit-mode support:
 * - When `selectedScriptId` is provided, that script is fetched immediately (on mount)
 *   and prepended to the options list so it is always visible regardless of pagination.
 * - staleTime: Infinity — script metadata is stable within a session.
 */
export function useScriptsAutocomplete(supportedPlatforms: string[], selectedScriptId?: number) {
  const [inputValue, setInputValue] = useState('');
  const [isActive, setIsActive] = useState(false);
  const debouncedSearch = useDebounce(inputValue, 500);
  const platformsKey = supportedPlatforms.join(',');

  // Lazy search query — only runs while the dropdown is active.
  const searchQuery = useQuery({
    queryKey: ['scripts-v2', debouncedSearch, platformsKey] as const,
    queryFn: () => fetchScriptsV2(debouncedSearch, supportedPlatforms),
    enabled: isActive,
  });

  // Always fetch the pre-selected script (edit mode).
  // Runs on mount, independently of the dropdown being open.
  const selectedScriptQuery = useQuery({
    queryKey: ['script-by-id', selectedScriptId] as const,
    queryFn: () => fetchScriptById(selectedScriptId!),
    enabled: !!selectedScriptId && selectedScriptId > 0,
    staleTime: Infinity,
  });

  // Deduplicated options list.
  // The pre-selected script is prepended only when the search is empty so it is
  // always visible on open. During an active search the server results are the
  // single source of truth — we do not force-inject a non-matching script.
  const results = searchQuery.data ?? [];
  const preSelected = selectedScriptQuery.data;

  const scripts: ScriptEntry[] = [];
  const seen = new Set<number>();

  if (preSelected && !debouncedSearch) {
    scripts.push(preSelected);
    seen.add(preSelected.id);
  }

  for (const s of results) {
    if (!seen.has(s.id)) {
      scripts.push(s);
      seen.add(s.id);
    }
  }

  const onOpen = () => setIsActive(true);

  const onClose = () => {
    setIsActive(false);
    setInputValue(''); // Reset so next open shows unfiltered results
  };

  // Exposed to the card so it can notify the hook when the user clears the field.
  // Bypasses the debounce so the list refreshes immediately on clear.
  const onClear = () => setInputValue('');

  return {
    scripts,
    isLoading: searchQuery.isFetching,
    inputValue,
    onInputChange: setInputValue,
    onOpen,
    onClose,
    onClear,
  };
}
