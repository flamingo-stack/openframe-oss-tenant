'use client';

export const dynamic = 'force-dynamic';

import { ContentPageContainer } from '@flamingo-stack/openframe-frontend-core';
import { AppLayout } from '../components/app-layout';
import { SettingsView } from './components/settings-view';

export default function Settings() {
  return (
    <AppLayout mainClassName="pt-0 sm:pt-0">
      <ContentPageContainer padding="none" showHeader={false}>
        <SettingsView />
      </ContentPageContainer>
    </AppLayout>
  );
}
