'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { dashboardQueryKeys } from '@/app/(app)/dashboard/utils/query-keys';
import { apiClient } from '@/lib/api-client';
import { DEVICE_STATUS } from '../constants/device-statuses';
import { deviceQueryKeys } from '../utils/query-keys';
import { deviceFiltersQueryKeys } from './use-device-filters';

interface UseDeviceActionsOptions {
  onSuccess?: () => void;
}

export function useDeviceActions(options?: UseDeviceActionsOptions) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isArchiving, setIsArchiving] = useState(false);
  const [isUnarchiving, setIsUnarchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Every surface caching device data — lists (main / archive / customer tab),
  // detail views, filter facet counts, dashboard counters — must refresh after
  // a status mutation. Invalidating here, at the single mutation site, keeps
  // active views refetching immediately and stale caches refetching on next
  // mount, without every view wiring its own refetch callback.
  const invalidateDeviceQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: deviceQueryKeys.all });
    queryClient.invalidateQueries({ queryKey: deviceFiltersQueryKeys.all });
    queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.deviceStats() });
  }, [queryClient]);

  const archiveDevice = useCallback(
    async (deviceId: string, deviceName?: string): Promise<boolean> => {
      setIsArchiving(true);
      try {
        const response = await apiClient.patch(`/api/devices/${deviceId}`, {
          status: DEVICE_STATUS.ARCHIVED,
        });

        if (!response.ok) {
          throw new Error(response.error || 'Failed to archive device');
        }

        toast({
          title: 'Device archived',
          description: `${deviceName || deviceId} has been archived`,
        });

        invalidateDeviceQueries();
        options?.onSuccess?.();
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to archive device';
        toast({
          title: 'Archive failed',
          description: errorMessage,
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsArchiving(false);
      }
    },
    [toast, options, invalidateDeviceQueries],
  );

  // Restores an archived device. OFFLINE is the natural restore target: the
  // backend has no transition guards, and the agent heartbeat promotes the
  // device to ONLINE on its next check-in (PENDING means "never connected").
  const unarchiveDevice = useCallback(
    async (deviceId: string, deviceName?: string): Promise<boolean> => {
      setIsUnarchiving(true);
      try {
        const response = await apiClient.patch(`/api/devices/${deviceId}`, {
          status: DEVICE_STATUS.OFFLINE,
        });

        if (!response.ok) {
          throw new Error(response.error || 'Failed to unarchive device');
        }

        toast({
          title: 'Device unarchived',
          description: `${deviceName || deviceId} has been restored`,
        });

        invalidateDeviceQueries();
        options?.onSuccess?.();
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to unarchive device';
        toast({
          title: 'Unarchive failed',
          description: errorMessage,
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsUnarchiving(false);
      }
    },
    [toast, options, invalidateDeviceQueries],
  );

  const deleteDevice = useCallback(
    async (deviceId: string, deviceName?: string): Promise<boolean> => {
      setIsDeleting(true);
      try {
        const response = await apiClient.patch(`/api/devices/${deviceId}`, {
          status: DEVICE_STATUS.DELETED,
        });

        if (!response.ok) {
          throw new Error(response.error || 'Failed to delete device');
        }

        toast({
          title: 'Device deleted',
          description: `${deviceName || deviceId} has been deleted`,
        });

        invalidateDeviceQueries();
        options?.onSuccess?.();
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete device';
        toast({
          title: 'Delete failed',
          description: errorMessage,
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [toast, options, invalidateDeviceQueries],
  );

  return {
    archiveDevice,
    unarchiveDevice,
    deleteDevice,
    isArchiving,
    isUnarchiving,
    isDeleting,
    isProcessing: isArchiving || isUnarchiving || isDeleting,
  };
}
