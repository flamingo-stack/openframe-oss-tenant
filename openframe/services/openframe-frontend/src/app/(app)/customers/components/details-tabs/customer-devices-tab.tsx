'use client';

import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { DevicesList, DevicesViewModeToggle } from '@/app/components/shared/devices-list';
import { CustomerTabHeader } from './customer-tab-header';

interface CustomerDevicesTabProps {
  organizationId: string;
}

export function CustomerDevicesTab({ organizationId }: CustomerDevicesTabProps) {
  const router = useRouter();

  const baseFilters = useMemo(() => ({ organizationIds: [organizationId] }), [organizationId]);

  return (
    <div className="flex flex-col gap-[var(--spacing-system-l)]">
      <CustomerTabHeader
        title="Devices"
        rightActions={
          <>
            <DevicesViewModeToggle />
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push(`/devices/new?organizationId=${organizationId}`)}
              leftIcon={<PlusCircleIcon className="w-5 h-5 text-ods-text-secondary" />}
              aria-label="Add Device"
              className="md:hidden"
            />
            <Button
              variant="outline"
              onClick={() => router.push(`/devices/new?organizationId=${organizationId}`)}
              leftIcon={<PlusCircleIcon className="w-5 h-5 text-ods-text-secondary" />}
              className="hidden md:inline-flex"
            >
              Add Device
            </Button>
          </>
        }
      />

      <DevicesList
        baseFilters={baseFilters}
        hideColumns={['organization']}
        enableGrid
        stickyContainerClassName="py-[var(--spacing-system-l)] -my-[var(--spacing-system-l)]"
        emptyMessage="No devices found for this customer."
      />
    </div>
  );
}
