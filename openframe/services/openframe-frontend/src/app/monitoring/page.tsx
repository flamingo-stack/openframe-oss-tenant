'use client';

export const dynamic = 'force-dynamic';

import { ContentPageContainer } from '@flamingo-stack/openframe-frontend-core';
import { AppLayout } from '../components/app-layout';
import { MonitoringView } from './components/monitoring-view';

export default function Monitoring() {
  return (
    <AppLayout mainClassName="pt-0 sm:pt-0">
      <ContentPageContainer padding="none" showHeader={false}>
        <MonitoringView />
      </ContentPageContainer>
    </AppLayout>
  );
}
