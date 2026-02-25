'use client';

import { use } from 'react';

// Force dynamic rendering due to useSearchParams in AppLayout
export const dynamic = 'force-dynamic';

import { AppLayout } from '../../../components/app-layout';
import { DeviceDetailsView } from '../../components/device-details-view';

interface DeviceDetailsPageProps {
  params: Promise<{
    deviceId: string;
  }>;
}

export default function DeviceDetailsPage({ params }: DeviceDetailsPageProps) {
  const resolvedParams = use(params);
  const id = resolvedParams.deviceId;
  return (
    <AppLayout>
      <DeviceDetailsView deviceId={id} />
    </AppLayout>
  );
}
