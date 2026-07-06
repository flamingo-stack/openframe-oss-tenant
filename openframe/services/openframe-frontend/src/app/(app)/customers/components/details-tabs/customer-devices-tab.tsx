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
      embedded
      addDeviceHref={`/devices/new?organizationId=${organizationId}`}
      // Archived devices live on the dedicated archive page; deep-link with the
      // customer preselected (organizationIds is a URL-driven filter there).
      archiveHref={`/devices/archive?organizationIds=${organizationId}`}
      lockedFilters={lockedFilters}
      hideColumns={['organization']}
      hideFilters={['organization']}
    />
  );
}
