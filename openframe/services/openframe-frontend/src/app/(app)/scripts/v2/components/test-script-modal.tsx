'use client';

import {
  Button,
  ModalV2,
  ModalV2Content,
  ModalV2Footer,
  ModalV2Header,
  ModalV2Title,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { DeviceSelector } from '@/app/components/shared/device-selector';
import { apiClient } from '@/lib/api-client';
import { DEVICE_STATUS } from '../../../devices/constants/device-statuses';
import { GET_DEVICES_QUERY } from '../../../devices/queries/devices-queries';
import type { Device, DevicesGraphQlNode, GraphQlResponse } from '../../../devices/types/device.types';
import { createDeviceListItem } from '../../../devices/utils/device-transform';
import { getDevicePrimaryId } from '../../utils/device-helpers';
import { mapPlatformsToOsTypes } from '../../utils/script-utils';

export interface SelectedTestDevice {
  machineId: string;
  deviceName: string;
}

interface TestScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceSelected: (device: SelectedTestDevice) => void;
  supportedPlatforms: string[];
}

async function fetchOnlineDevices(supportedPlatforms: string[]): Promise<Device[]> {
  const osTypes = mapPlatformsToOsTypes(supportedPlatforms || []);

  const filter = {
    statuses: [DEVICE_STATUS.ONLINE],
    ...(osTypes.length > 0 && { osTypes }),
  };

  const response = await apiClient.post<
    GraphQlResponse<{
      devices: {
        edges: Array<{ node: DevicesGraphQlNode; cursor: string }>;
        pageInfo: { hasNextPage: boolean; endCursor?: string };
        filteredCount: number;
      };
    }>
  >('/api/graphql', {
    query: GET_DEVICES_QUERY,
    variables: { filter, first: 100, search: '', sort: { field: 'status', direction: 'DESC' } },
  });

  if (!response.ok) {
    throw new Error(response.error || 'Failed to fetch devices');
  }

  const graphqlResponse = response.data;
  if (!graphqlResponse?.data) {
    throw new Error('No data received from server');
  }
  if (graphqlResponse.errors && graphqlResponse.errors.length > 0) {
    throw new Error(graphqlResponse.errors[0].message);
  }

  const nodes = graphqlResponse.data.devices.edges.map(e => e.node);
  return nodes.map(createDeviceListItem);
}

export function TestScriptModal({ isOpen, onClose, onDeviceSelected, supportedPlatforms }: TestScriptModalProps) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const platformsKey = JSON.stringify(supportedPlatforms);
  const hasPlatforms = supportedPlatforms.length > 0;

  const devicesQuery = useQuery({
    queryKey: ['test-script-v2-devices', platformsKey],
    queryFn: () => fetchOnlineDevices(supportedPlatforms),
    enabled: isOpen && hasPlatforms,
  });

  const devices = devicesQuery.data ?? [];

  const handleConfirm = useCallback(() => {
    if (selectedIds.size === 0) {
      toast({ title: 'No device selected', description: 'Please select a device.', variant: 'destructive' });
      return;
    }

    const selectedDevice = devices.find(d => selectedIds.has(getDevicePrimaryId(d)));
    if (!selectedDevice) return;

    const machineId = selectedDevice.machineId;
    if (!machineId) {
      toast({
        title: 'No machine ID',
        description: 'This device has no machine ID and cannot run a test.',
        variant: 'destructive',
      });
      return;
    }

    onDeviceSelected({
      machineId,
      deviceName: selectedDevice.displayName || selectedDevice.hostname,
    });
    setSelectedIds(new Set());
    onClose();
  }, [selectedIds, devices, toast, onDeviceSelected, onClose]);

  const handleClose = useCallback(() => {
    setSelectedIds(new Set());
    onClose();
  }, [onClose]);

  return (
    <ModalV2 isOpen={isOpen} onClose={handleClose} className="max-w-6xl h-[90vh] max-h-[900px]">
      <ModalV2Header>
        <ModalV2Title>Select Device</ModalV2Title>
      </ModalV2Header>
      <ModalV2Content>
        {!hasPlatforms ? (
          <div className="flex items-center justify-center h-64 bg-ods-card border border-ods-border rounded-[6px]">
            <p className="text-ods-text-secondary">Select at least one supported platform to see available devices.</p>
          </div>
        ) : (
          <DeviceSelector
            devices={devices}
            loading={devicesQuery.isLoading}
            selectedIds={selectedIds}
            getDeviceKey={getDevicePrimaryId}
            onSelectionChange={setSelectedIds}
            showSelectionModeRadio={false}
            addAllBehavior="replace"
            singleSelect
            isDeviceDisabled={d => (!d.machineId ? 'Agent is not\nconnected' : undefined)}
          />
        )}
      </ModalV2Content>
      <ModalV2Footer className="justify-end">
        <div className="flex gap-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button variant="accent" onClick={handleConfirm} disabled={selectedIds.size === 0}>
            Select Device
          </Button>
        </div>
      </ModalV2Footer>
    </ModalV2>
  );
}
