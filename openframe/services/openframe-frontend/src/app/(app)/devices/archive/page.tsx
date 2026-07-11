'use client';

import { DevicesPanel } from '@/app/components/shared';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { routes } from '@/lib/routes';
import { DEVICE_STATUS } from '../constants/device-statuses';

// Statuses are locked to ARCHIVED here; the main /devices page shows the rest
// (online / offline / pending) and links to this page via the Archive button.
const ARCHIVED_ONLY_FILTERS = { statuses: [DEVICE_STATUS.ARCHIVED] };
// Module-level so the prop keeps a stable identity across renders.
const NO_DEFAULT_STATUSES: string[] = [];

export default function ArchivedDevices() {
  const handleBack = useSafeBack(routes.devices.list);

  return (
    <DevicesPanel
      title="Archived Devices"
      backButton={{ label: 'Back', onClick: handleBack }}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      lockedFilters={ARCHIVED_ONLY_FILTERS}
      defaultStatuses={NO_DEFAULT_STATUSES}
      hideFilters={['status']}
      showAddDevice={false}
      emptyMessage="No archived devices."
    />
  );
}
