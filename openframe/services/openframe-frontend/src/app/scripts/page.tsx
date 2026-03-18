'use client';

export const dynamic = 'force-dynamic';

import { ContentPageContainer } from '@flamingo-stack/openframe-frontend-core';
import { AppLayout } from '../components/app-layout';
import { ScriptsView } from './components/scripts-view';

export default function Scripts() {
  return (
    <AppLayout>
      <ContentPageContainer padding="none" showHeader={false}>
        <ScriptsView />
      </ContentPageContainer>
    </AppLayout>
  );
}
