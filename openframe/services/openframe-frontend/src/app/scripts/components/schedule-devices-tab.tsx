'use client';

import { LoadError, OSTypeBadge } from '@flamingo-stack/openframe-frontend-core';
import { Table, type TableColumn } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useMemo } from 'react';
import { useScriptScheduleAgents } from '../hooks/use-script-schedule';
import type { ScriptScheduleAgent, ScriptScheduleDetail } from '../types/script-schedule.types';

interface ScheduleDevicesTabProps {
  schedule: ScriptScheduleDetail;
  scheduleId: string;
}

export function ScheduleDevicesTab({ schedule, scheduleId }: ScheduleDevicesTabProps) {
  const { agents, isLoading, error } = useScriptScheduleAgents(scheduleId);

  const columns: TableColumn<ScriptScheduleAgent>[] = useMemo(
    () => [
      {
        key: 'device',
        label: 'DEVICE',
        renderCell: agent => (
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-medium text-[18px] leading-[24px] text-ods-text-primary">{agent.hostname}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'details',
        label: 'DETAILS',
        hideAt: 'md' as const,
        renderCell: agent => <OSTypeBadge osType={agent.plat} />,
      },
    ],
    [],
  );

  if (error) {
    return <LoadError message={`Failed to load assigned devices: ${error}`} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Table
        data={agents}
        columns={columns}
        rowKey="agent_id"
        loading={isLoading}
        skeletonRows={5}
        emptyMessage="No devices assigned to this schedule"
        showFilters={false}
      />
      {agents.length > 0 && (
        <div className="text-right text-[14px] text-ods-text-secondary">Showing {agents.length} results</div>
      )}
    </div>
  );
}
