'use client';

/**
 * Shared bits for the per-type context-item components (the host data layer
 * behind the lib's `ChatContextPickerConfig.renderItems`). Each component
 * fetches with its own hook (react-relay / TanStack) and renders the lib's
 * `<ContextItemsList>`.
 */

import type { ChatContextItem } from '@flamingo-stack/openframe-frontend-core/components/chat';
import { useState } from 'react';

/** Page size for every source (matches the picker's skeleton count). */
export const MINGO_CONTEXT_PAGE_SIZE = 10;

/** Props every per-type items component receives from `renderItems`. */
export interface ContextItemsProps {
  /** Debounced search text from the picker. */
  query: string;
  selectedKeys: Set<string>;
  onToggle: (item: ChatContextItem) => void;
  atLimit: boolean;
}

/** Case-insensitive substring match for the client-filtered (batch) sources. */
export function matches(haystack: string | undefined, needle: string): boolean {
  if (!needle) return true;
  return (haystack ?? '').toLowerCase().includes(needle.toLowerCase());
}

/**
 * Client-side incremental paging over a fully-loaded list (the batch sources:
 * scripts / users / policies). Reveals `pageSize` more on each `loadMore`, and
 * resets when the source list changes (new search) — via the
 * adjust-state-during-render pattern so there's no flash.
 */
export function useClientPaging<T>(all: T[], pageSize: number = MINGO_CONTEXT_PAGE_SIZE) {
  const [count, setCount] = useState(pageSize);
  const [prevAll, setPrevAll] = useState(all);
  if (all !== prevAll) {
    setPrevAll(all);
    setCount(pageSize);
  }
  return {
    items: all.slice(0, count),
    hasMore: count < all.length,
    loadMore: () => setCount(c => Math.min(c + pageSize, all.length)),
  };
}
