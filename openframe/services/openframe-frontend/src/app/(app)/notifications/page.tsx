'use client';

export const dynamic = 'force-dynamic';

import { PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { NotificationsPageView } from './components/notifications-page-view';

export default function NotificationsPage() {
  return (
    <PageLayout showHeader={false} className="p-[var(--spacing-system-l)]" contentClassName="min-h-0">
      <NotificationsPageView />
    </PageLayout>
  );
}
