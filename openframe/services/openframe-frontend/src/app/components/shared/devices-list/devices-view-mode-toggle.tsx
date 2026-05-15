'use client';

import { GridIcon, TableCellIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { TabSelector } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useApiParams } from '@flamingo-stack/openframe-frontend-core/hooks';

/**
 * Table/grid view toggle for DevicesList. Reads/writes the `viewMode` URL
 * param so it stays in sync with the `<DevicesList />` body without prop
 * plumbing. Render this wherever the surrounding chrome places it (e.g.
 * PageLayout's `selector` slot on the main /devices page).
 */
export function DevicesViewModeToggle() {
  const { params, setParam } = useApiParams({
    viewMode: { type: 'string', default: 'table' },
  });

  return (
    <div className="hidden md:flex">
      <TabSelector
        value={params.viewMode}
        onValueChange={v => setParam('viewMode', v as 'table' | 'grid')}
        items={[
          { id: 'table', icon: <TableCellIcon className="w-6 h-6" /> },
          { id: 'grid', icon: <GridIcon className="w-6 h-6" /> },
        ]}
      />
    </div>
  );
}
