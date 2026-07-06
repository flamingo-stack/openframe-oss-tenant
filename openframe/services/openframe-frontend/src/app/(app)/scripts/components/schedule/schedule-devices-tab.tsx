'use client';

import { LoadError } from '@flamingo-stack/openframe-frontend-core';
import { useMemo } from 'react';
import { DeviceSelector } from '@/app/components/shared/device-selector';
import type { Device } from '../../../devices/types/device.types';
import { useScriptScheduleAgents } from '../../hooks/use-script-schedule';
import type { ScriptScheduleAgent, ScriptScheduleDetail } from '../../types/script-schedule.types';

interface ScheduleDevicesTabProps {
  schedule: ScriptScheduleDetail;
  scheduleId: string;
}

// TODO(openframe-rmm): Tactical RMM removed — `useScriptScheduleAgents` now returns an empty
// list, so this tab renders no assigned devices until the OpenFrame RMM schedule API is wired
// up. Adapts a schedule-agent shape to the Device shape DeviceSelector renders.
function agentToDevice(agent: ScriptScheduleAgent): Device {
  return {
    id: agent.agent_id,
    machineId: agent.agent_id,
    hostname: agent.hostname,
    displayName: agent.hostname,
    osType: agent.plat,
    operating_system: agent.operating_system,
    organization: agent.client_name,
  } as Device;
}

export function ScheduleDevicesTab({ scheduleId }: ScheduleDevicesTabProps) {
  const { agents, isLoading, error } = useScriptScheduleAgents(scheduleId);
  const devices = useMemo<Device[]>(() => agents.map(agentToDevice), [agents]);

  if (error) {
    return <LoadError message={`Failed to load assigned devices: ${error}`} />;
  }

  return (
    <DeviceSelector
      devices={devices}
      loading={isLoading}
      readOnly
      hideColumns={['organization', 'status', 'actions']}
    />
  );
}
