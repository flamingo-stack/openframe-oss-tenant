'use client';

import { LoadError, OSTypeBadge } from '@flamingo-stack/openframe-frontend-core';
import {
  type ColumnDef,
  DataTable,
  type Row,
  useDataTable,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useMemo } from 'react';
import { useScriptScheduleAgents } from '../../hooks/use-script-schedule';
import type { ScriptScheduleAgent, ScriptScheduleDetail } from '../../types/script-schedule.types';

interface ScheduleDevicesTabProps {
  schedule: ScriptScheduleDetail;
  scheduleId: string;
}

export function ScheduleDevicesTab({ schedule, scheduleId }: ScheduleDevicesTabProps) {
  const { agents, isLoading, error } = useScriptScheduleAgents(scheduleId);

  const columns = useMemo<ColumnDef<ScriptScheduleAgent>[]>(
    () => [
      {
        accessorKey: 'hostname',
        id: 'device',
        header: 'DEVICE',
        cell: ({ row }: { row: Row<ScriptScheduleAgent> }) => (
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-h4 text-ods-text-primary">{row.original.hostname}</span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'plat',
        id: 'details',
        header: 'DETAILS',
        cell: ({ row }: { row: Row<ScriptScheduleAgent> }) => <OSTypeBadge osType={row.original.plat} />,
        meta: { hideAt: 'md' as const },
      },
    ],
    [],
  );

  const table = useDataTable<ScriptScheduleAgent>({
    data: agents,
    columns,
    getRowId: (row: ScriptScheduleAgent) => row.agent_id,
    enableSorting: false,
  });

  if (error) {
    return <LoadError message={`Failed to load assigned devices: ${error}`} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <DataTable table={table}>
        <DataTable.Header rightSlot={<DataTable.RowCount />} />
        <DataTable.Body loading={isLoading} skeletonRows={5} emptyMessage="No devices assigned to this schedule" />
      </DataTable>
    </div>
  );
}
