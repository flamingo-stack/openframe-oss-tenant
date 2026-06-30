'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { LogsTable, type LogsTableRef } from '@/app/(app)/logs-page/components/logs-table';
import type { Device } from '../../types/device.types';
import { DeviceInfoSection } from '../device-info-section';
import { DeviceTagsSection } from '../device-tags-section';

interface OverviewTabProps {
  device: Device;
}

/**
 * Device Overview tab — the device summary grid, its tags, and the device-scoped
 * logs table. The logs table renders without its own header (`showHeader={false}`)
 * since this tab already provides the page context.
 */
export function OverviewTab({ device }: OverviewTabProps) {
  const searchParams = useSearchParams();
  const refreshParam = searchParams?.get('refresh');
  const logsTableRef = useRef<LogsTableRef>(null);

  // Use machineId as the primary device identifier for filtering logs.
  const deviceId = device?.machineId || device?.id;

  // Trigger a logs refresh when the `refresh` param changes (e.g. after running a script).
  useEffect(() => {
    if (refreshParam && logsTableRef.current) {
      const timer = setTimeout(() => {
        logsTableRef.current?.refresh();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [refreshParam]);

  return (
    <div className="flex flex-col gap-[var(--spacing-system-l)]">
      <DeviceInfoSection device={device} />

      <DeviceTagsSection device={device} />

      {deviceId ? <LogsTable deviceId={deviceId} ref={logsTableRef} showHeader={false} /> : null}
    </div>
  );
}
