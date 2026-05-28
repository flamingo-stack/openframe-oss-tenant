'use client';

import { CheckCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useDebounce, useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryLoader } from 'react-relay';
import type { notificationsListQuery as NotificationsListQueryType } from '@/__generated__/notificationsListQuery.graphql';
import {
  notificationsConnectionFilters,
  UNFILTERED_NOTIFICATION_PAIR,
} from '@/graphql/notifications/notifications-helpers';
import { notificationsListQuery } from '@/graphql/notifications/notifications-list-query';
import { useNotificationMutations } from '@/graphql/notifications/use-notification-mutations';
import { NotificationsSection } from './notifications-section';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

export function NotificationsPageView() {
  const { toast } = useToast();

  const { params, setParam } = useApiParams({
    searchNew: { type: 'string', default: '' },
    searchHistory: { type: 'string', default: '' },
  });

  const [searchNewInput, setSearchNewInput] = useState(params.searchNew);
  const [searchHistoryInput, setSearchHistoryInput] = useState(params.searchHistory);
  const debouncedSearchNew = useDebounce(searchNewInput, SEARCH_DEBOUNCE_MS);
  const debouncedSearchHistory = useDebounce(searchHistoryInput, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    if (debouncedSearchNew !== params.searchNew) {
      setParam('searchNew', debouncedSearchNew);
    }
  }, [debouncedSearchNew, params.searchNew, setParam]);

  useEffect(() => {
    if (debouncedSearchHistory !== params.searchHistory) {
      setParam('searchHistory', debouncedSearchHistory);
    }
  }, [debouncedSearchHistory, params.searchHistory, setParam]);

  const [newQueryRef, loadNew, disposeNew] = useQueryLoader<NotificationsListQueryType>(notificationsListQuery);
  const [historyQueryRef, loadHistory, disposeHistory] =
    useQueryLoader<NotificationsListQueryType>(notificationsListQuery);

  useEffect(() => {
    const trimmed = debouncedSearchNew.trim();
    loadNew(
      { first: PAGE_SIZE, after: null, filter: { read: false }, search: trimmed || null },
      { fetchPolicy: 'network-only' },
    );
    return () => disposeNew();
  }, [loadNew, disposeNew, debouncedSearchNew]);

  useEffect(() => {
    const trimmed = debouncedSearchHistory.trim();
    loadHistory(
      { first: PAGE_SIZE, after: null, filter: { read: true }, search: trimmed || null },
      { fetchPolicy: 'network-only' },
    );
    return () => disposeHistory();
  }, [loadHistory, disposeHistory, debouncedSearchHistory]);

  const filterPairs = useMemo(
    () => [
      {
        unread: notificationsConnectionFilters(false, debouncedSearchNew),
        read: notificationsConnectionFilters(true, debouncedSearchHistory),
      },
      UNFILTERED_NOTIFICATION_PAIR,
    ],
    [debouncedSearchNew, debouncedSearchHistory],
  );

  const onMarkAllReadCompleted = useCallback(() => {
    toast({ title: 'All notifications marked as read', variant: 'success' });
  }, [toast]);

  const { markRead, markAllRead, removeNotification, isMarkingAllRead } = useNotificationMutations({
    filterPairs,
    onMarkAllReadCompleted,
  });

  return (
    <div className="flex h-full flex-col gap-[var(--spacing-system-l)]">
      <NotificationsSection
        title="New Notifications"
        queryRef={newQueryRef}
        searchValue={searchNewInput}
        onSearchChange={setSearchNewInput}
        rowVariant="unread"
        onMarkRead={markRead}
        rightAction={
          <Button
            variant="outline"
            disabled={isMarkingAllRead}
            leftIcon={<CheckCircleIcon size={24} className="text-ods-text-secondary" />}
            onClick={markAllRead}
          >
            Mark All as Done
          </Button>
        }
      />

      <NotificationsSection
        title="Notifications History"
        queryRef={historyQueryRef}
        searchValue={searchHistoryInput}
        onSearchChange={setSearchHistoryInput}
        rowVariant="read"
        onDelete={removeNotification}
      />

      <p className="text-center text-h6 text-ods-text-secondary">
        Notification history is retained for 30 days, then permanently deleted.
      </p>
    </div>
  );
}
