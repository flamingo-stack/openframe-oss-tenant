'use client';

import { useSearchParams } from 'next/navigation';
import React, { useEffect, useRef } from 'react';
import { LogsTable, type LogsTableRef } from '../../../logs-page/components/logs-table';

interface LogsTabProps {
  device: any;
}

export function LogsTab({ device }: LogsTabProps) {
  const searchParams = useSearchParams();
  const refreshParam = searchParams?.get('refresh');
  const logsTableRef = useRef<LogsTableRef>(null);

  // Use machineId as the primary device identifier for filtering logs
  const deviceId = device?.machineId || device?.id;

  // Trigger refresh when refresh param changes
  useEffect(() => {
    if (refreshParam && logsTableRef.current) {
      // Small delay to ensure tab is fully rendered
      const timer = setTimeout(() => {
        logsTableRef.current?.refresh();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [refreshParam]);

  if (!deviceId) {
    return (
      <div className="space-y-4 mt-6">
        <div className="p-4 bg-ods-card border border-ods-border rounded-[6px] text-ods-text-secondary font-['DM_Sans'] text-[14px]">
          No device ID available to filter logs.
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <LogsTable deviceId={deviceId} embedded={true} ref={logsTableRef} />
    </div>
  );
}
