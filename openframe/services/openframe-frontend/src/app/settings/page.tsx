'use client';

export const dynamic = 'force-dynamic';

import { AppLayout } from '../components/app-layout';
import { SettingsHub } from './components/settings-hub';

export default function Settings() {
  return (
    <AppLayout>
      <SettingsHub />
    </AppLayout>
  );
}
