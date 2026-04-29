'use client';

import { Suspense } from 'react';
import { NewDeviceContent } from './new-device-content';
import { NewDeviceSkeleton } from './new-device-skeleton';

// Force dynamic rendering for this page due to useSearchParams in AppLayout
export const dynamic = 'force-dynamic';

export default function NewDevicePage() {
  return (
    <Suspense fallback={<NewDeviceSkeleton />}>
      <NewDeviceContent />
    </Suspense>
  );
}
