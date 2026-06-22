'use client';

import { type TabItem, TabNavigation } from '@flamingo-stack/openframe-frontend-core';
import {
  BellIcon,
  CheckCircleIcon,
  ClockHistoryIcon,
  TrashIcon,
} from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { type PageActionButton } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams, useDebounce, useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueryLoader } from 'react-relay';
import type { notificationsSectionRelayQuery as NotificationsSectionRelayQueryType } from '@/__generated__/notificationsSectionRelayQuery.graphql';
import {
  notificationsConnectionFilters,
  UNFILTERED_NOTIFICATION_PAIR,
} from '@/graphql/notifications/notifications-helpers';
import { notificationsSectionRelayQuery } from '@/graphql/notifications/notifications-section-relay';
import { useNotificationMutations } from '@/graphql/notifications/use-notification-mutations';
import { NOTIFICATIONS_SECTION_PAGE_SIZE, NotificationsSection } from './notifications-section';

const SEARCH_DEBOUNCE_MS = 300;

const NOTIFICATIONS_TABS: TabItem[] = [
  { id: 'new', label: 'New Notifications', icon: BellIcon },
  { id: 'history', label: 'Notifications History', icon: ClockHistoryIcon },
];

export function NotificationsPageView() {
  const { toast } = useToast();

  const { params, setParam } = useApiParams({
    tab: { type: 'string', default: 'new' },
    searchNew: { type: 'string', default: '' },
    searchHistory: { type: 'string', default: '' },
  });

  const handleTabChange = useCallback((tabId: string) => setParam('tab', tabId), [setParam]);

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

  const [newQueryRef, loadNew, disposeNew] =
    useQueryLoader<NotificationsSectionRelayQueryType>(notificationsSectionRelayQuery);
  const [historyQueryRef, loadHistory, disposeHistory] =
    useQueryLoader<NotificationsSectionRelayQueryType>(notificationsSectionRelayQuery);

  useEffect(() => {
    const trimmed = debouncedSearchNew.trim();
    loadNew(
      { first: NOTIFICATIONS_SECTION_PAGE_SIZE, after: null, filter: { read: false }, search: trimmed || null },
      { fetchPolicy: 'network-only' },
    );
    return () => disposeNew();
  }, [loadNew, disposeNew, debouncedSearchNew]);

  useEffect(() => {
    const trimmed = debouncedSearchHistory.trim();
    loadHistory(
      { first: NOTIFICATIONS_SECTION_PAGE_SIZE, after: null, filter: { read: true }, search: trimmed || null },
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

  const onDeleteAllReadCompleted = useCallback(() => {
    toast({ title: 'All read notifications deleted', variant: 'success' });
  }, [toast]);

  const { markRead, markAllRead, removeNotification, removeAllRead, isMarkingAllRead, isDeletingAllRead } =
    useNotificationMutations({
      filterPairs,
      onMarkAllReadCompleted,
      onDeleteAllReadCompleted,
    });

  const newActions: PageActionButton[] = [
    {
      label: 'Mark All as Done',
      icon: <CheckCircleIcon className="text-ods-text-secondary" />,
      onClick: markAllRead,
      variant: 'outline',
      disabled: isMarkingAllRead,
    },
  ];

  const historyActions: PageActionButton[] = [
    {
      label: 'Delete All',
      icon: <TrashIcon className="text-ods-text-secondary" />,
      onClick: removeAllRead,
      variant: 'outline',
      disabled: isDeletingAllRead,
    },
  ];

  const activeTab = params.tab === 'history' ? 'history' : 'new';

  return (
    <div className="flex w-full flex-col -mt-4">
      <TabNavigation
        tabs={NOTIFICATIONS_TABS}
        activeTab={activeTab}
        urlSync={false}
        onTabChange={handleTabChange}
        showRightGradient
      />

      {activeTab === 'history' ? (
        <NotificationsSection
          key="history"
          title="Notifications History"
          queryRef={historyQueryRef}
          searchValue={searchHistoryInput}
          onSearchChange={setSearchHistoryInput}
          rowVariant="read"
          onDelete={removeNotification}
          actions={historyActions}
        />
      ) : (
        <NotificationsSection
          key="new"
          title="New Notifications"
          queryRef={newQueryRef}
          searchValue={searchNewInput}
          onSearchChange={setSearchNewInput}
          rowVariant="unread"
          onMarkRead={markRead}
          actions={newActions}
        />
      )}
    </div>
  );
}
