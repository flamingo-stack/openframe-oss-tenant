'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useCallback, useState } from 'react';
import { apiClient } from '@/lib/api-client';

interface UseDeviceActionsOptions {
  onSuccess?: () => void;
}

export function useDeviceActions(options?: UseDeviceActionsOptions) {
  const { toast } = useToast();
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const archiveDevice = useCallback(
    async (deviceId: string, deviceName?: string): Promise<boolean> => {
      setIsArchiving(true);
      try {
        const response = await apiClient.patch(`/api/devices/${deviceId}`, {
          status: 'ARCHIVED',
        });

        if (!response.ok) {
          throw new Error(response.error || 'Failed to archive device');
        }

        toast({
          title: 'Device archived',
          description: `${deviceName || deviceId} has been archived`,
        });

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
    [toast, options],
  );

  const deleteDevice = useCallback(
    async (deviceId: string, deviceName?: string): Promise<boolean> => {
      setIsDeleting(true);
      try {
        const response = await apiClient.patch(`/api/devices/${deviceId}`, {
          status: 'DELETED',
        });

        if (!response.ok) {
          throw new Error(response.error || 'Failed to delete device');
        }

        toast({
          title: 'Device deleted',
          description: `${deviceName || deviceId} has been deleted`,
        });

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
    [toast, options],
  );

  return {
    archiveDevice,
    deleteDevice,
    isArchiving,
    isDeleting,
    isProcessing: isArchiving || isDeleting,
  };
}
