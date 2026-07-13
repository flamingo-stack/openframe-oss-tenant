'use client';

import { useMemo } from 'react';
import { DevicesPanel } from '@/app/components/shared';
import { routes } from '@/lib/routes';

interface CustomerDevicesTabProps {
  organizationId: string;
}

export function CustomerDevicesTab({ organizationId }: CustomerDevicesTabProps) {
  const lockedFilters = useMemo(() => ({ organizationIds: [organizationId] }), [organizationId]);

  return (
    <DevicesPanel
      embedded
      addDeviceHref={routes.devices.new({ organizationId })}
      lockedFilters={lockedFilters}
      hideColumns={['organization']}
      hideFilters={['organization']}
    />
  );
}
