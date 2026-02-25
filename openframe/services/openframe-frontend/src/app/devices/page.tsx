'use client';

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { AppLayout } from '../components/app-layout';
import { DevicesView } from './components/devices-view';

export default function Devices() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-ods-text-secondary">Loading...</div>
        </div>
      }
    >
      <AppLayout>
        <DevicesView />
      </AppLayout>
    </Suspense>
  );
}
