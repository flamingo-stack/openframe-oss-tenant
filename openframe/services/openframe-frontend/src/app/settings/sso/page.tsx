'use client';

export const dynamic = 'force-dynamic';

import { ContentPageContainer } from '@flamingo-stack/openframe-frontend-core';
import { AppLayout } from '../../components/app-layout';
import { SettingsSubPageHeader } from '../components/settings-sub-page-header';
import { SsoConfigurationTab } from '../components/tabs/sso-configuration';

export default function SsoConfigurationPage() {
  return (
    <AppLayout>
      <SsoConfigurationTab />
    </AppLayout>
  );
}
