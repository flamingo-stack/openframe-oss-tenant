'use client';

export const dynamic = 'force-dynamic';

import { AppLayout } from '../../components/app-layout';
import { SsoConfigurationTab } from '../components/tabs/sso-configuration';

export default function SsoConfigurationPage() {
  return (
    <AppLayout>
      <SsoConfigurationTab />
    </AppLayout>
  );
}
