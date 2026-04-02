'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { DialogStatus } from '../types/dialog.types';
import { invalidateAllDialogs } from '../utils/query-keys';

interface UpdateStatusResponse {
  success: boolean;
  dialog?: {
    id: string;
    status: DialogStatus;
  };
  error?: string;
}

export function useDialogStatus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateDialogStatus = useCallback(
    async (dialogId: string, status: DialogStatus): Promise<boolean> => {
      if (isUpdating) return false;

      setIsUpdating(true);

      try {
        const response = await apiClient.patch<UpdateStatusResponse>(`/chat/api/v1/dialogs/${dialogId}/status`, {
          status,
        });

        if (!response.ok) {
          throw new Error(response.error || `Failed to update dialog status`);
        }

        toast({
          title: 'Success',
          description: `Dialog ${status === 'ON_HOLD' ? 'put on hold' : status === 'RESOLVED' ? 'resolved' : 'status updated'} successfully`,
          variant: 'success',
          duration: 3000,
        });

        invalidateAllDialogs(queryClient);

        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update dialog status';
        console.error('Failed to update dialog status:', error);

        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
          duration: 5000,
        });

        return false;
      } finally {
        setIsUpdating(false);
      }
    },
    [isUpdating, toast, queryClient],
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

  return {
    updateDialogStatus,
    putOnHold,
    resolve,
    activate,
    isUpdating,
  };
}
