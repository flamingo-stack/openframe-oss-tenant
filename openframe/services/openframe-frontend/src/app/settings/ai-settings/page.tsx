'use client';

export const dynamic = 'force-dynamic';

import { AppLayout } from '../../components/app-layout';
import { AiSettingsTab } from '../components/tabs/ai-settings';

export default function AiSettingsPage() {
  return (
    <AppLayout>
      <AiSettingsTab />
    </AppLayout>
  );
}
