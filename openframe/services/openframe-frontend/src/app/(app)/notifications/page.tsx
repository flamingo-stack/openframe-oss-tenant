'use client';

import { notFound } from 'next/navigation';
import { featureFlags } from '@/lib/feature-flags';
import { NotificationsPageView } from './components/notifications-page-view';

export default function NotificationsPage() {
  if (!featureFlags.notifications.enabled()) {
    notFound();
  }

  return <NotificationsPageView />;
}
