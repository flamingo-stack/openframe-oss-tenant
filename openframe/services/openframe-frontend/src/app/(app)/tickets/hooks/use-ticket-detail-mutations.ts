'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '../constants';
import { DELETE_TICKET_ATTACHMENT, UPDATE_TICKET_MUTATION } from '../queries/ticket-queries';
import type { Ticket, TicketPayload, UpdateTicketInput } from '../types/ticket.types';
import type { GraphQlResponse } from '../utils/graphql';
import { extractGraphQlData } from '../utils/graphql';
import { dialogsQueryKeys, ticketsQueryKeys } from '../utils/query-keys';
import { createTempAttachment } from './use-temp-attachments';

/**
 * Inline ticket mutations for the detail view. Unlike `useUpdateTicket` (which is
 * the edit-form flow and navigates away on success), these refresh the detail
 * cache in place and stay on the page.
 */

async function updateTicket(input: UpdateTicketInput): Promise<Ticket | null> {
  const response = await apiClient.post<GraphQlResponse<{ updateTicket: TicketPayload }>>(API_ENDPOINTS.GRAPHQL, {
    query: UPDATE_TICKET_MUTATION,
    variables: { input },
  });
  const payload = extractGraphQlData(response).updateTicket;
  if (payload.userErrors?.length) throw new Error(payload.userErrors[0].message);
  return payload.ticket;
}

function useTicketCacheInvalidation(ticketId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ticketsQueryKeys.detail(ticketId) });
    queryClient.invalidateQueries({ queryKey: dialogsQueryKeys.all });
  };
}

/** Replaces the ticket's full label set (add/remove tags). */
export function useSetTicketLabels(ticketId: string) {
  const { toast } = useToast();
  const invalidate = useTicketCacheInvalidation(ticketId);
  return useMutation({
    mutationFn: (labelIds: string[]) => updateTicket({ id: ticketId, labelIds }),
    onSuccess: invalidate,
    onError: err =>
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update tags',
        variant: 'destructive',
      }),
  });
}

/** Uploads files as temp attachments and attaches them to the ticket. */
export function useAddTicketAttachments(ticketId: string) {
  const { toast } = useToast();
  const invalidate = useTicketCacheInvalidation(ticketId);
  return useMutation({
    mutationFn: async (files: File[]) => {
      const uploaded = await Promise.all(files.map(createTempAttachment));
      return updateTicket({ id: ticketId, tempAttachmentIds: uploaded.map(u => u.id) });
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Success', description: 'Attachment(s) added', variant: 'success' });
    },
    onError: err =>
      toast({
        title: 'Upload Error',
        description: err instanceof Error ? err.message : 'Failed to add attachments',
        variant: 'destructive',
      }),
  });
}

/** Permanently deletes a ticket attachment. */
export function useDeleteTicketAttachment(ticketId: string) {
  const { toast } = useToast();
  const invalidate = useTicketCacheInvalidation(ticketId);
  return useMutation({
    mutationFn: async (attachmentId: string) => {
      const response = await apiClient.post<
        GraphQlResponse<{ deleteTicketAttachment: { userErrors: TicketPayload['userErrors'] } }>
      >(API_ENDPOINTS.GRAPHQL, { query: DELETE_TICKET_ATTACHMENT, variables: { input: { id: attachmentId } } });
      const payload = extractGraphQlData(response).deleteTicketAttachment;
      if (payload.userErrors?.length) throw new Error(payload.userErrors[0].message);
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Success', description: 'Attachment removed', variant: 'success' });
    },
    onError: err =>
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to remove attachment',
        variant: 'destructive',
      }),
  });
}
