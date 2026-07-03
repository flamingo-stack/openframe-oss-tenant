'use client';

import { Suspense } from 'react';
import { NewDeviceContent } from './new-device-content';
import { NewDeviceSkeleton } from './new-device-skeleton';

export default function NewDevicePage() {
  return (
    <Suspense fallback={<NewDeviceSkeleton />}>
      <NewDeviceContent />
    </Suspense>
  );
}
