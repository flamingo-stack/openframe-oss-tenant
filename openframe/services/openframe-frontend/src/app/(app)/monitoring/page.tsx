'use client';

export const dynamic = 'force-dynamic';

import { ContentPageContainer } from '@flamingo-stack/openframe-frontend-core';
import { MonitoringView } from './components/monitoring-view';

export default function Monitoring() {
  return (
    <ContentPageContainer className="p-[var(--spacing-system-l)]" padding="none" showHeader={false}>
      <MonitoringView />
    </ContentPageContainer>
  );
}
