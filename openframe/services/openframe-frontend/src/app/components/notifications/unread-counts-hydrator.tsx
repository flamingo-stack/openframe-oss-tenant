'use client';

import { useEffect, useMemo } from 'react';
import { useLazyLoadQuery } from 'react-relay';
import type { unreadCountsRelayQuery as UnreadCountsRelayQueryType } from '@/__generated__/unreadCountsRelayQuery.graphql';
import type { NotificationCategory } from '@/generated/schema-enums';
import { unreadCountsRelayQuery } from '@/graphql/notifications/unread-counts-relay';

export type UnreadCountsByCategory = Partial<Record<NotificationCategory, number>>;

interface UnreadCountsHydratorProps {
  onChange: (counts: UnreadCountsByCategory) => void;
}

/**
 * Loads per-category unread notification counts into the Relay store and lifts
 * them to the app shell. Subscribed to the store, so `refreshUnreadCounts`
 * calls (NATS pushes, mark-read mutations) propagate here automatically.
 */
export function UnreadCountsHydrator({ onChange }: UnreadCountsHydratorProps) {
  const data = useLazyLoadQuery<UnreadCountsRelayQueryType>(
    unreadCountsRelayQuery,
    {},
    { fetchPolicy: 'store-and-network' },
  );

  const counts = useMemo(() => {
    const next: UnreadCountsByCategory = {};
    for (const entry of data.unreadCountsByCategory) {
      if (entry.count > 0 && entry.category !== '%future added value') {
        next[entry.category] = entry.count;
      }
    }
    return next;
  }, [data.unreadCountsByCategory]);

  useEffect(() => {
    onChange(counts);
  }, [counts, onChange]);

  return null;
}
