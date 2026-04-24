'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { getDialogService } from '../services';
import { DialogServiceV2 } from '../services/dialog-service-v2';
import type { DialogStatus } from '../types/dialog.types';
import { invalidateAllDialogs } from '../utils/query-keys';
import { useDialogVersion } from './use-dialog-version';

export function useDialogStatus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);
  const version = useDialogVersion();
  const service = getDialogService(version);

  const updateDialogStatus = useCallback(
    async (dialogId: string, status: DialogStatus): Promise<DialogStatus | null> => {
      if (isUpdating) return null;

      setIsUpdating(true);

      try {
        const nextStatus =
          service instanceof DialogServiceV2
            ? await service.mutateStatus(dialogId, status)
            : (await service.updateStatus(dialogId, status))
              ? status
              : null;

        if (nextStatus) {
          invalidateAllDialogs(queryClient);
        }

        return nextStatus;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update dialog status';
        console.error('Failed to update dialog status:', error);

        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
          duration: 5000,
        });

        return null;
      } finally {
        setIsUpdating(false);
      }
    },
    [isUpdating, toast, service, queryClient],
  );

  const putOnHold = useCallback(
    async (dialogId: string) => {
      return updateDialogStatus(dialogId, 'ON_HOLD');
    },
    [updateDialogStatus],
  );

  const resolve = useCallback(
    async (dialogId: string) => {
      return updateDialogStatus(dialogId, 'RESOLVED');
    },
    [updateDialogStatus],
  );

  const activate = useCallback(
    async (dialogId: string) => {
      return updateDialogStatus(dialogId, 'ACTIVE');
    },
    [updateDialogStatus],
  );

  const archive = useCallback(
    async (dialogId: string) => {
      return updateDialogStatus(dialogId, 'ARCHIVED');
    },
    [updateDialogStatus],
  );

  return {
    updateDialogStatus,
    putOnHold,
    resolve,
    activate,
    archive,
    isUpdating,
  };
}
