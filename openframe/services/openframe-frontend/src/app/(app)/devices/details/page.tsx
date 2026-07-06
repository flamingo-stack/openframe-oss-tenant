'use client';

import { useSearchParams } from 'next/navigation';
import { DeviceDetailsView } from '../components/device-details-view';

export default function DeviceDetailsPage() {
  const deviceId = useSearchParams().get('id') ?? '';
  return <DeviceDetailsView deviceId={deviceId} />;
}
