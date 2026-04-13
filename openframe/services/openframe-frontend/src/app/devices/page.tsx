'use client';

export const dynamic = 'force-dynamic';

import { AppLayout } from '../components/app-layout';
import { DevicesView } from './components/devices-view';

export default function Devices() {
  return (
    <AppLayout>
      <DevicesView />
    </AppLayout>
  );
}
