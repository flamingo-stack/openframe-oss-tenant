'use client';

import { DetailPageContainer, LoadError, NotFoundError } from '@flamingo-stack/openframe-frontend-core';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { DeviceSelector } from '../../../components/shared/device-selector';
import { DEVICE_STATUS } from '../../../devices/constants/device-statuses';
import { GET_DEVICES_QUERY } from '../../../devices/queries/devices-queries';
import type { Device, DevicesGraphQlNode, GraphQlResponse } from '../../../devices/types/device.types';
import { createDeviceListItem } from '../../../devices/utils/device-transform';
import { useScriptSchedule, useScriptScheduleAgents } from '../../hooks/use-script-schedule';
import { useReplaceScheduleAgents } from '../../hooks/use-script-schedule-mutations';
import { formatScheduleDate, getRepeatLabel } from '../../types/script-schedule.types';
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

const getDeviceKey = (d: Device) => d.tacticalAgentId;

export function ScheduleAssignDevicesView({ scheduleId }: ScheduleAssignDevicesViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { schedule, isLoading: isLoadingSchedule, error: scheduleError } = useScriptSchedule(scheduleId);
  const { agents: currentAgents, isLoading: isLoadingAgents } = useScriptScheduleAgents(scheduleId);
  const replaceAgentsMutation = useReplaceScheduleAgents();

  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize selected agents from current assignment
  if (!isInitialized && !isLoadingAgents && currentAgents.length > 0) {
    const ids = new Set(currentAgents.map(a => a.agent_id));
    setSelectedAgentIds(ids);
    setIsInitialized(true);
  }
  if (!isInitialized && !isLoadingAgents && currentAgents.length === 0) {
    setIsInitialized(true);
  }

  const supportedPlatforms = mapPlatformsToOsTypes(schedule?.task_supported_platforms ?? []);

  const devicesQuery = useQuery({
    queryKey: ['schedule-assign-devices', scheduleId, supportedPlatforms],
    queryFn: () => fetchDevicesByPlatforms(supportedPlatforms),
    enabled: Boolean(scheduleId) && Boolean(schedule),
  });

  // Only include devices that have a Tactical RMM agent_id
  const allDevices = useMemo(() => {
    return (devicesQuery.data ?? []).filter(d => !!d.tacticalAgentId);
  }, [devicesQuery.data]);

  const handleBack = useCallback(() => {
    router.push(`/scripts/schedules/${scheduleId}`);
  }, [router, scheduleId]);

  const handleSave = useCallback(async () => {
    try {
      await replaceAgentsMutation.mutateAsync({
        id: scheduleId,
        agents: Array.from(selectedAgentIds),
      });
      toast({
        title: 'Devices saved',
        description: `${selectedAgentIds.size} device(s) assigned to schedule.`,
        variant: 'success',
      });
      router.push(`/scripts/schedules/${scheduleId}?tab=schedule-devices`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save devices';
      toast({ title: 'Save failed', description: msg, variant: 'destructive' });
    }
  }, [replaceAgentsMutation, scheduleId, selectedAgentIds, toast, router]);

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
        variant: 'primary' as const,
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
    <DetailPageContainer
      title="Schedule Devices"
      backButton={{ label: 'Back to Schedule', onClick: handleBack }}
      actions={actions}
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
    </DetailPageContainer>
  );
}
