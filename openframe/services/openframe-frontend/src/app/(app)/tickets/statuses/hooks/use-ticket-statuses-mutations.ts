'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '../../constants';
import { extractGraphQlData, type GraphQlResponse } from '../../utils/graphql';
import { invalidateAllDialogs, ticketsQueryKeys } from '../../utils/query-keys';
import {
  CREATE_TICKET_STATUS_MUTATION,
  DELETE_TICKET_STATUS_MUTATION,
  REORDER_TICKET_STATUS_MUTATION,
  UPDATE_TICKET_STATUS_MUTATION,
} from '../queries/ticket-statuses-queries';
import type { CustomTicketStatus, TicketStatusDefinition } from '../types/ticket-statuses.types';

async function runStatusMutation<K extends string>(
  query: string,
  key: K,
  variables: Record<string, unknown>,
): Promise<TicketStatusDefinition> {
  const response = await apiClient.post<GraphQlResponse<Record<K, TicketStatusDefinition>>>(API_ENDPOINTS.GRAPHQL, {
    query,
    variables,
  });
  return extractGraphQlData(response)[key];
}

export interface SaveTicketStatusesInput {
  customStatuses: CustomTicketStatus[];
  snapshot: TicketStatusDefinition[];
}

/**
 * Diffs form state against the server snapshot and dispatches the minimal
 * create/update/reorder sequence. Deletes are handled separately and
 * immediately (see useDeleteTicketStatusMutation) because reassignment must
 * reference statuses that already exist on the server. Returns the final
 * custom list with real ids so the form can drop temp ids and clear dirty.
 */
async function saveTicketStatuses({
  customStatuses,
  snapshot,
}: SaveTicketStatusesInput): Promise<CustomTicketStatus[]> {
  const snapshotCustoms = snapshot.filter(d => !d.isSystem);
  const snapshotById = new Map(snapshotCustoms.map(d => [d.id, d]));
  const tempIdToRealId = new Map<string, string>();

  // 1. Creates — rows not present in the snapshot.
  for (const custom of customStatuses) {
    if (snapshotById.has(custom.id)) continue;
    const created = await runStatusMutation(CREATE_TICKET_STATUS_MUTATION, 'createTicketStatus', {
      input: { name: custom.name, color: custom.color },
    });
    tempIdToRealId.set(custom.id, created.id);
  }

  // 2. Updates — persisted rows whose name or color changed.
  for (const custom of customStatuses) {
    const prev = snapshotById.get(custom.id);
    if (!prev) continue;
    const input: { id: string; name?: string; color?: string } = { id: custom.id };
    if (custom.name !== prev.name) input.name = custom.name;
    if (custom.color !== prev.color) input.color = custom.color;
    if (input.name === undefined && input.color === undefined) continue;
    await runStatusMutation(UPDATE_TICKET_STATUS_MUTATION, 'updateTicketStatus', { input });
  }

  const resolveId = (custom: CustomTicketStatus) => tempIdToRealId.get(custom.id) ?? custom.id;
  const finalIds = customStatuses.map(resolveId);

  // 3. Reorders — only when the custom group order changed or rows were created.
  const snapshotIds = snapshotCustoms.map(d => d.id);
  const sameOrder = finalIds.length === snapshotIds.length && finalIds.every((id, i) => id === snapshotIds[i]);
  if (finalIds.length > 0 && (tempIdToRealId.size > 0 || !sameOrder)) {
    const anchorSystemId = precedingSystemId(snapshot);
    for (let i = 0; i < finalIds.length; i++) {
      const input: { id: string; afterStatusId?: string; beforeStatusId?: string } = { id: finalIds[i] };
      if (i === 0) {
        // Top row: anchor it before its successor so it lands above the rest of
        // the group. Fall back to the preceding system row only when it's the
        // sole custom status (no successor to anchor against).
        if (finalIds.length > 1) {
          input.beforeStatusId = finalIds[1];
        } else if (anchorSystemId) {
          input.afterStatusId = anchorSystemId;
        } else {
          continue;
        }
      } else {
        input.afterStatusId = finalIds[i - 1];
      }
      await runStatusMutation(REORDER_TICKET_STATUS_MUTATION, 'reorderTicketStatus', { input });
    }
  }

  return customStatuses.map(custom => ({ ...custom, id: resolveId(custom) }));
}

// The system status the custom group should sit directly beneath: the system
// row immediately preceding the first custom, or — when no custom exists yet —
// the row just above the first closing status (RESOLVED/ARCHIVED).
function precedingSystemId(snapshot: TicketStatusDefinition[]): string | undefined {
  const firstCustomIndex = snapshot.findIndex(d => !d.isSystem);
  if (firstCustomIndex > 0) return snapshot[firstCustomIndex - 1].id;

  const closingIndex = snapshot.findIndex(d => d.isSystem && (d.kind === 'RESOLVED' || d.kind === 'ARCHIVED'));
  if (closingIndex > 0) return snapshot[closingIndex - 1].id;

  const systemRows = snapshot.filter(d => d.isSystem);
  return systemRows.length > 0 ? systemRows[systemRows.length - 1].id : undefined;
}

export function useSaveTicketStatusesMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveTicketStatuses,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketsQueryKeys.statuses() });
      queryClient.invalidateQueries({ queryKey: ticketsQueryKeys.statusTransitionRules() });
      toast({ title: 'Saved', description: 'Ticket statuses updated', variant: 'success' });
    },
    onError: err => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save ticket statuses',
        variant: 'destructive',
      });
    },
  });
}

export interface DeleteTicketStatusInput {
  id: string;
  replacementStatusId?: string;
}

export function useDeleteTicketStatusMutation() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteTicketStatusInput) => {
      const response = await apiClient.post<GraphQlResponse<{ deleteTicketStatus: boolean }>>(API_ENDPOINTS.GRAPHQL, {
        query: DELETE_TICKET_STATUS_MUTATION,
        variables: { input },
      });
      return extractGraphQlData(response).deleteTicketStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketsQueryKeys.statuses() });
      queryClient.invalidateQueries({ queryKey: ticketsQueryKeys.statusTransitionRules() });
      // Deleting a status reassigns its tickets to the replacement status — refresh the board columns / list.
      invalidateAllDialogs(queryClient);
      toast({ title: 'Deleted', description: 'Ticket status removed', variant: 'success' });
    },
    onError: err => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete ticket status',
        variant: 'destructive',
      });
    },
  });
}
