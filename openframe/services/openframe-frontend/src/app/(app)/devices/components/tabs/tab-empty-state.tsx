import { NoData } from '@flamingo-stack/openframe-frontend-core/components/ui';
import type { ReactNode } from 'react';

/**
 * Unified empty screen for device detail tabs — the same wrapper + `NoData`
 * padding that `DataTable.Body` renders for empty tables, so content tabs
 * (hardware, network, OS, …) are pixel-identical to the table tabs.
 * Pass the tab's own icon from `device-tabs.tsx` so the empty state matches
 * the tab bar.
 */
export function TabEmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col gap-[var(--spacing-system-xsf)] w-full">
      <NoData icon={icon} title={title} description={description} className="py-[var(--spacing-system-xxl)]" />
    </div>
  );
}
