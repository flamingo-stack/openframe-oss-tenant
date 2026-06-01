'use client';

export const dynamic = 'force-dynamic';

import { PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { notFound } from 'next/navigation';
import { featureFlags } from '@/lib/feature-flags';
import { NotificationsPageView } from './components/notifications-page-view';

export default function NotificationsPage() {
  if (!featureFlags.notifications.enabled()) {
    notFound();
  }

  return (
    <PageLayout showHeader={false} className="p-[var(--spacing-system-l)]" contentClassName="min-h-0">
      <NotificationsPageView />
    </PageLayout>
  );
}
