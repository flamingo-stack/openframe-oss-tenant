'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '../constants';
import { ARCHIVE_RESOLVED_TICKETS_MUTATION } from '../queries/ticket-queries';
import type { Dialog } from '../types/dialog.types';
import type { GraphQlResponse } from '../utils/graphql';
import { extractGraphQlData } from '../utils/graphql';
import { dialogsQueryKeys, invalidateAllDialogs, ticketsQueryKeys } from '../utils/query-keys';

interface ArchiveResolvedPayload {
  archiveResolvedTickets: {
    count: number;
    userErrors: Array<{ field?: string[]; message: string }>;
  };
}

export function useArchiveResolvedMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<{ count: number }> => {
      const response = await apiClient.post<GraphQlResponse<ArchiveResolvedPayload>>(API_ENDPOINTS.GRAPHQL, {
        query: ARCHIVE_RESOLVED_TICKETS_MUTATION,
      });

      const data = extractGraphQlData(response);
      const payload = data.archiveResolvedTickets;

      if (payload.userErrors?.length) {
        throw new Error(payload.userErrors[0].message);
      }

      return { count: payload.count };
    },

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: dialogsQueryKeys.lists() });

      const previousQueries = queryClient.getQueriesData({ queryKey: dialogsQueryKeys.lists() });

      queryClient.setQueriesData({ queryKey: dialogsQueryKeys.lists() }, (oldData: any) => {
        if (!oldData?.pages) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            dialogs: page.dialogs.filter((dialog: Dialog) => dialog.status !== 'RESOLVED'),
          })),
        };
      });

      return { previousQueries };
    },

    onError: (error, _variables, context) => {
      if (context?.previousQueries) {
        for (const [queryKey, previousData] of context.previousQueries) {
          queryClient.setQueryData(queryKey, previousData);
        }
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to archive resolved tickets';
      console.error('Failed to archive resolved tickets:', error);

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
    },

    onSuccess: ({ count }) => {
      toast({
        title: 'Success',
        description: `${count} ticket${count !== 1 ? 's' : ''} archived successfully`,
        variant: 'success',
        duration: 4000,
      });
    },

    onSettled: () => {
      invalidateAllDialogs(queryClient);
      queryClient.invalidateQueries({ queryKey: ticketsQueryKeys.statistics() });
    },
  });
}
