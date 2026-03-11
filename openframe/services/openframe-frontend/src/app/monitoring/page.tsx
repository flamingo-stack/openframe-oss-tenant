'use client';

export const dynamic = 'force-dynamic';

import { ContentPageContainer } from '@flamingo-stack/openframe-frontend-core';
import { AppLayout } from '../components/app-layout';
import { MonitoringView } from './components/monitoring-view';

export default function Monitoring() {
  return (
    <AppLayout>
      <ContentPageContainer padding="none" showHeader={false}>
        <MonitoringView />
      </ContentPageContainer>
    </AppLayout>
  );
}
