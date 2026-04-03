'use client';

import {
  type DeviceType,
  getDeviceTypeIcon,
  Modal,
  ModalHeader,
  ModalTitle,
  Tag,
} from '@flamingo-stack/openframe-frontend-core';
import { Filter02Icon, SearchIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  Input,
  MobileFilterModal,
  Table,
  type TableColumn,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce, useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { formatRelativeTime } from '@flamingo-stack/openframe-frontend-core/utils';
import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { DEVICE_STATUS } from '../../../devices/constants/device-statuses';
import { GET_DEVICES_QUERY } from '../../../devices/queries/devices-queries';
import type { Device, DevicesGraphQlNode, GraphQlResponse } from '../../../devices/types/device.types';
import { getTacticalAgentId } from '../../../devices/utils/device-action-utils';
import { createDeviceListItem } from '../../../devices/utils/device-transform';
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

function getStatusLabel(status?: string): string {
  const upper = status?.toUpperCase();
  if (upper === 'ONLINE') return 'ACTIVE';
  if (upper === 'OFFLINE') return 'OFFLINE';
  return upper || 'UNKNOWN';
}

export function TestScriptModal({ isOpen, onClose, onDeviceSelected, supportedPlatforms }: TestScriptModalProps) {
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [allDevices, setAllDevices] = useState<Device[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const hasFetchedRef = useRef(false);
  const prevPlatformsRef = useRef<string>(JSON.stringify(supportedPlatforms));
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const key = JSON.stringify(supportedPlatforms);
    if (key !== prevPlatformsRef.current) {
      prevPlatformsRef.current = key;
      hasFetchedRef.current = false;
      abortControllerRef.current?.abort();
      setAllDevices([]);
    }
  }, [supportedPlatforms]);

  const filteredDevices = useMemo(() => {
    let filtered = allDevices;

    const term = (debouncedSearch || '').toLowerCase();
    if (term) {
      filtered = filtered.filter(d => {
        const name = (d.displayName || d.hostname || '').toLowerCase();
        const os = (d.osType || '').toLowerCase();
        return name.includes(term) || os.includes(term);
      });
    }

    const deviceTypeFilter = columnFilters.device;
    if (deviceTypeFilter?.length) {
      filtered = filtered.filter(d => deviceTypeFilter.includes(d.type?.toLowerCase() || ''));
    }

    const orgFilter = columnFilters.organization;
    if (orgFilter?.length) {
      filtered = filtered.filter(d => d.organizationId && orgFilter.includes(d.organizationId));
    }

    const statusFilter = columnFilters.status;
    if (statusFilter?.length) {
      filtered = filtered.filter(d => statusFilter.includes(d.status?.toUpperCase() || ''));
    }

    return filtered;
  }, [allDevices, debouncedSearch, columnFilters]);

  const fetchDevices = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoadingDevices(true);
    try {
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
      >(
        '/api/graphql',
        {
          query: GET_DEVICES_QUERY,
          variables: { filter, first: 100, search: '' },
        },
        { signal: controller.signal },
      );

      if (controller.signal.aborted) return;

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
      setAllDevices(nodes.map(createDeviceListItem));
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : 'Failed to load devices';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingDevices(false);
      }
    }
  }, [supportedPlatforms, toast]);

  const hasPlatforms = supportedPlatforms.length > 0;

  useEffect(() => {
    if (isOpen && !hasFetchedRef.current && hasPlatforms) {
      hasFetchedRef.current = true;
      fetchDevices();
    }
  }, [isOpen, fetchDevices, hasPlatforms]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      abortControllerRef.current?.abort();
    }
  }, [isOpen]);

  const handleRowClick = useCallback(
    (device: Device) => {
      const agentToolId = getTacticalAgentId(device);

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
        deviceName: device.displayName || device.hostname,
      });
      onClose();
    },
    [toast, onDeviceSelected, onClose],
  );

  const deviceTypeOptions = useMemo(() => {
    const types = new Set(allDevices.map(d => d.type?.toLowerCase()).filter(Boolean));
    return Array.from(types).map(t => ({
      id: t as string,
      label: (t as string).charAt(0).toUpperCase() + (t as string).slice(1),
      value: t as string,
    }));
  }, [allDevices]);

  const organizationOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const d of allDevices) {
      const orgId = d.organizationId;
      const orgName = d.organization;
      if (orgId && orgName && !seen.has(orgId)) {
        seen.set(orgId, orgName);
      }
    }
    return Array.from(seen, ([id, name]) => ({ id, label: name, value: id }));
  }, [allDevices]);

  const statusOptions = useMemo(() => {
    const statuses = new Set(allDevices.map(d => d.status?.toUpperCase()).filter(Boolean));
    return Array.from(statuses).map(s => ({ id: s as string, label: getStatusLabel(s), value: s as string }));
  }, [allDevices]);

  const columns: TableColumn<Device>[] = useMemo(
    () => [
      {
        key: 'device',
        label: 'DEVICE',
        filterable: true,
        filterOptions: deviceTypeOptions,
        renderCell: (device: Device) => {
          const lastSeen = device.last_seen || device.lastSeen;
          const deviceType = device.type?.toLowerCase() as DeviceType;
          return (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center shrink-0 rounded-[6px] border border-ods-border">
                {getDeviceTypeIcon(deviceType, { className: 'size-4 text-ods-text-secondary' })}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-lg font-medium text-ods-text-primary truncate">
                  {device.displayName || device.hostname}
                </span>
                <span className="text-sm font-medium text-ods-text-secondary truncate">
                  Last Online: {lastSeen ? formatRelativeTime(lastSeen) : 'unknown'}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'organization',
        label: 'ORGANIZATION',
        width: 'w-[200px]',
        hideAt: 'md',
        filterable: true,
        filterOptions: organizationOptions,
        renderCell: (device: Device) => (
          <span className="text-sm font-medium text-ods-text-secondary truncate">{device.organization || '—'}</span>
        ),
      },
      {
        key: 'status',
        label: 'STATUS',
        width: 'w-[160px]',
        filterable: true,
        filterOptions: statusOptions,
        renderCell: (device: Device) => (
          <Tag label={getStatusLabel(device.status)} variant={'success'} className="w-min" />
        ),
      },
    ],
    [deviceTypeOptions, organizationOptions, statusOptions],
  );

  const handleFilterChange = useCallback((filters: Record<string, any[]>) => {
    setColumnFilters(filters);
  }, []);

  const filterGroups = useMemo(
    () => columns.filter(c => c.filterable).map(c => ({ id: c.key, title: c.label, options: c.filterOptions || [] })),
    [columns],
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-6xl h-[90vh] max-h-[900px] flex flex-col">
      <ModalHeader>
        <div className="flex items-center justify-between w-full">
          <ModalTitle>Select Device</ModalTitle>
          <button
            type="button"
            onClick={onClose}
            className="text-ods-text-secondary hover:text-ods-text-primary transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </ModalHeader>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col px-10 pt-4 pb-10 gap-6">
        <div className="flex gap-4 items-center">
          <Input
            startAdornment={<SearchIcon />}
            placeholder="Search for Devices"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          {filterGroups.length > 0 && (
            <Button
              variant="search"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileFilterOpen(true)}
              aria-label="Open filters"
            >
              <Filter02Icon />
            </Button>
          )}
        </div>

        {filterGroups.length > 0 && (
          <MobileFilterModal
            isOpen={mobileFilterOpen}
            onClose={() => setMobileFilterOpen(false)}
            filterGroups={filterGroups}
            onFilterChange={handleFilterChange}
            currentFilters={columnFilters}
          />
        )}

        {!hasPlatforms ? (
          <div className="flex items-center justify-center h-64 bg-ods-card border border-ods-border rounded-[6px]">
            <p className="text-ods-text-secondary">Select at least one supported platform to see available devices.</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto bg-ods-bg border border-ods-border rounded-[6px] px-4 pb-4">
            <Table
              data={filteredDevices}
              columns={columns}
              rowKey="id"
              loading={isLoadingDevices}
              skeletonRows={8}
              emptyMessage="No devices found"
              showFilters={true}
              filters={columnFilters}
              onFilterChange={handleFilterChange}
              onRowClick={handleRowClick}
              stickyHeader
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
