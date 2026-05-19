'use client';

import { useMemo } from 'react';
import { DevicesPanel } from '@/app/components/shared';

interface CustomerDevicesTabProps {
  organizationId: string;
}

export function CustomerDevicesTab({ organizationId }: CustomerDevicesTabProps) {
  const lockedFilters = useMemo(() => ({ organizationIds: [organizationId] }), [organizationId]);

  return (
    <DevicesPanel
      addDeviceHref={`/devices/new?organizationId=${organizationId}`}
      lockedFilters={lockedFilters}
      hideColumns={['organization']}
      hideFilters={['organization']}
      defaultStatuses={[]}
    />
  );
}
