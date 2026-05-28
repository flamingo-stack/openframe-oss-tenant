'use client';

import { useNotifications } from '@flamingo-stack/openframe-frontend-core';
import { useEffect, useMemo } from 'react';
import { type PreloadedQuery, usePreloadedQuery } from 'react-relay';
import type { notificationsListQuery as NotificationsListQueryType } from '@/__generated__/notificationsListQuery.graphql';
import { mapNotificationNode } from '@/graphql/notifications/notifications-helpers';
import { notificationsListQuery } from '@/graphql/notifications/notifications-list-query';

interface NotificationsListHydratorProps {
  queryRef: PreloadedQuery<NotificationsListQueryType> | null | undefined;
}

export function NotificationsListHydrator({ queryRef }: NotificationsListHydratorProps) {
  if (!queryRef) return null;
  return <HydratorInner queryRef={queryRef} />;
}

function HydratorInner({ queryRef }: { queryRef: PreloadedQuery<NotificationsListQueryType> }) {
  const data = usePreloadedQuery(notificationsListQuery, queryRef);
  const { setNotifications } = useNotifications();

  const list = useMemo(
    () => (data.notifications?.edges ?? []).map(edge => mapNotificationNode(edge.node)),
    [data.notifications?.edges],
  );

  useEffect(() => {
    setNotifications(list);
  }, [list, setNotifications]);

  return null;
}
