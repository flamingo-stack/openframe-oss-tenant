'use client';

import { Modal, ModalHeader, ModalTitle } from '@flamingo-stack/openframe-frontend-core';
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { DeviceSelector } from '@/app/components/shared/device-selector';
import { apiClient } from '@/lib/api-client';
import { DEVICE_STATUS } from '../../../devices/constants/device-statuses';
import { GET_DEVICES_QUERY } from '../../../devices/queries/devices-queries';
import type { Device, DevicesGraphQlNode, GraphQlResponse } from '../../../devices/types/device.types';
import { getTacticalAgentId } from '../../../devices/utils/device-action-utils';
import { createDeviceListItem } from '../../../devices/utils/device-transform';
import { getDevicePrimaryId } from '../../utils/device-helpers';
import { mapPlatformsToOsTypes } from '../../utils/script-utils';

export interface SelectedTestDevice {
  agentToolId: string;
  deviceName: string;
}

interface TestScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceSelected: (device: SelectedTestDevice) => void;
  supportedPlatforms: string[];
}

async function fetchDevicesForTest(supportedPlatforms: string[]): Promise<Device[]> {
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
  const all = nodes.map(createDeviceListItem);

  const withTactical: Device[] = [];
  const withoutTactical: Device[] = [];
  for (const d of all) {
    if (getTacticalAgentId(d)) {
      withTactical.push(d);
    } else {
      withoutTactical.push(d);
    }
  }
  return [...withTactical, ...withoutTactical];
}

export function TestScriptModal({ isOpen, onClose, onDeviceSelected, supportedPlatforms }: TestScriptModalProps) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const platformsKey = JSON.stringify(supportedPlatforms);
  const hasPlatforms = supportedPlatforms.length > 0;

  const devicesQuery = useQuery({
    queryKey: ['test-script-devices', platformsKey],
    queryFn: () => fetchDevicesForTest(supportedPlatforms),
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

    const agentToolId = getTacticalAgentId(selectedDevice);
    if (!agentToolId) {
      toast({
        title: 'No Tactical Agent',
        description: 'This device has no Tactical RMM agent connected.',
        variant: 'destructive',
      });
      return;
    }

    onDeviceSelected({
      agentToolId,
      deviceName: selectedDevice.displayName || selectedDevice.hostname,
    });
    setSelectedIds(new Set());
    onClose();
  }, [selectedIds, devices, toast, onDeviceSelected, onClose]);

  const handleClose = useCallback(() => {
    setSelectedIds(new Set());
    onClose();
  }, [onClose]);

  const footer = useMemo(
    () => (
      <div className="flex justify-end gap-3 px-10 py-6 border-t border-ods-border">
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleConfirm} disabled={selectedIds.size === 0}>
          Select Device
        </Button>
      </div>
    ),
    [handleClose, handleConfirm, selectedIds.size],
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-6xl h-[90vh] max-h-[900px] flex flex-col">
      <ModalHeader>
        <div className="flex items-center justify-between w-full">
          <ModalTitle>Select Device</ModalTitle>
          <button
            type="button"
            onClick={handleClose}
            className="text-ods-text-secondary hover:text-ods-text-primary transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </ModalHeader>

      <div className="flex-1 min-h-0 overflow-y-auto px-10 pt-4 pb-6">
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
            isDeviceDisabled={d => (!getTacticalAgentId(d) ? 'Tactical agent is\nnot installed' : undefined)}
          />
        )}
      </div>

      {footer}
    </Modal>
  );
}
