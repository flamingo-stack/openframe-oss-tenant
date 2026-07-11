'use client';

import { LoadError, NotFoundError, PageLayout } from '@flamingo-stack/openframe-frontend-core';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { DeviceSelector } from '@/app/components/shared/device-selector';
import { safeBackOrReplace, useSafeBack } from '@/app/hooks/use-safe-back';
import { apiClient } from '@/lib/api-client';
import { routes } from '@/lib/routes';
import { DEVICE_STATUS } from '../../../devices/constants/device-statuses';
import { GET_DEVICES_QUERY } from '../../../devices/queries/devices-queries';
import type { Device, DevicesGraphQlNode, GraphQlResponse } from '../../../devices/types/device.types';
import { createDeviceListItem } from '../../../devices/utils/device-transform';
import { useScriptSchedule, useScriptScheduleAgents } from '../../hooks/use-script-schedule';
import { useReplaceScheduleAgents } from '../../hooks/use-script-schedule-mutations';
import { formatScheduleDate, getRepeatLabel } from '../../types/script-schedule.types';
import { getDevicePrimaryId } from '../../utils/device-helpers';
import { mapPlatformsToOsTypes } from '../../utils/script-utils';
import { ScheduleAssignDevicesSkeleton } from './schedule-assign-devices-skeleton';
import { ScheduleInfoBarFromData } from './schedule-info-bar';

interface ScheduleAssignDevicesViewProps {
  scheduleId: string;
}

async function fetchDevicesByPlatforms(platforms: string[]): Promise<Device[]> {
  const filter = {
    statuses: [DEVICE_STATUS.ONLINE, DEVICE_STATUS.OFFLINE],
    osTypes: platforms,
  };

  const response = await apiClient.post<
    GraphQlResponse<{
      devices: {
        edges: Array<{ node: DevicesGraphQlNode; cursor: string }>;
        pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean };
        filteredCount: number;
      };
    }>
  >('/api/graphql', {
    query: GET_DEVICES_QUERY,
    variables: {
      filter,
      first: 100,
      search: '',
      sort: { field: 'status', direction: 'DESC' },
    },
  });

  if (!response.ok) {
    throw new Error(response.error || 'Failed to fetch devices');
  }

  const graphqlResponse = response.data;
  if (!graphqlResponse?.data) {
    throw new Error('No data received from server');
  }

  const nodes = graphqlResponse.data.devices.edges.map(e => e.node);
  return nodes.map(createDeviceListItem);
}

const getDeviceKey = getDevicePrimaryId;

export function ScheduleAssignDevicesView({ scheduleId }: ScheduleAssignDevicesViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { schedule, isLoading: isLoadingSchedule, error: scheduleError } = useScriptSchedule(scheduleId);
  const { isLoading: isLoadingAgents } = useScriptScheduleAgents(scheduleId);
  const replaceAgentsMutation = useReplaceScheduleAgents();

  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  const supportedPlatforms = mapPlatformsToOsTypes(schedule?.task_supported_platforms ?? []);

  const devicesQuery = useQuery({
    queryKey: ['schedule-assign-devices', scheduleId, supportedPlatforms],
    queryFn: () => fetchDevicesByPlatforms(supportedPlatforms),
    enabled: Boolean(scheduleId) && Boolean(schedule),
  });

  // TODO(openframe-rmm): Tactical RMM removed — devices were previously sorted by, and the
  // current selection seeded from, Tactical agent IDs. Restore an OpenFrame-RMM-agent
  // mapping once the schedule/assign API is wired up.
  const allDevices = useMemo(() => devicesQuery.data ?? [], [devicesQuery.data]);

  // `currentAgents` is empty until the OpenFrame RMM schedule API exists, so nothing is
  // pre-selected; just mark the view initialized once the agent load settles.
  if (!isInitialized && !isLoadingAgents && !devicesQuery.isLoading) {
    setIsInitialized(true);
  }

  const handleBack = useSafeBack(routes.scripts.schedules.details(scheduleId));

  const handleSave = useCallback(async () => {
    // TODO(openframe-rmm): Tactical RMM removed — assigning devices to a schedule mapped
    // selection to Tactical agent IDs. Until the OpenFrame RMM schedule API is wired up we
    // pass the device primary ids; the mutation itself rejects (migration pending) and the
    // catch surfaces a clear toast. See scripts-migration.ts.
    const selectedDevices = allDevices.filter(d => selectedAgentIds.has(getDevicePrimaryId(d)));
    const agentIds = selectedDevices.map(getDevicePrimaryId);

    try {
      await replaceAgentsMutation.mutateAsync({
        id: scheduleId,
        agents: agentIds,
      });
      toast({
        title: 'Devices saved',
        description: `${agentIds.length} device(s) assigned to schedule.`,
        variant: 'success',
      });
      safeBackOrReplace(router, routes.scripts.schedules.details(scheduleId, { tab: 'schedule-devices' }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save devices';
      toast({ title: 'Save failed', description: msg, variant: 'destructive' });
    }
  }, [replaceAgentsMutation, scheduleId, selectedAgentIds, allDevices, toast, router]);

  const actions = useMemo(
    () => [
      {
        label: 'Cancel',
        onClick: handleBack,
        variant: 'outline' as const,
        showOnlyMobile: true,
      },
      {
        label: 'Save Devices',
        onClick: handleSave,
        variant: 'accent' as const,
        loading: replaceAgentsMutation.isPending,
      },
    ],
    [handleSave, replaceAgentsMutation.isPending, handleBack],
  );

  if (isLoadingSchedule) {
    return <ScheduleAssignDevicesSkeleton />;
  }

  if (scheduleError) {
    return <LoadError message={`Error loading schedule: ${scheduleError}`} />;
  }

  if (!schedule) {
    return <NotFoundError message="Schedule not found" />;
  }

  const { date, time } = formatScheduleDate(schedule.run_time_date);
  const repeat = getRepeatLabel(schedule);

  return (
    <PageLayout
      title="Schedule Devices"
      backButton={{ label: 'Back', onClick: handleBack }}
      actions={actions}
      actionsVariant="primary-buttons"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      <div className="flex flex-col gap-6 overflow-auto">
        <DeviceSelector
          devices={allDevices}
          loading={devicesQuery.isLoading}
          selectedIds={selectedAgentIds}
          getDeviceKey={getDeviceKey}
          onSelectionChange={setSelectedAgentIds}
          addAllBehavior="replace"
          headerContent={
            <ScheduleInfoBarFromData
              name={schedule.name}
              note=""
              date={date}
              time={time}
              repeat={repeat}
              platforms={schedule.task_supported_platforms}
            />
          }
        />
      </div>
    </PageLayout>
  );
}
