'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '../constants';
import {
  CREATE_TICKET_LABEL_MUTATION,
  DELETE_TICKET_LABEL_MUTATION,
  GET_TICKET_LABELS_QUERY,
  UPDATE_TICKET_LABEL_MUTATION,
} from '../queries/ticket-queries';
import type { TicketLabel } from '../types/ticket.types';
import type { GraphQlResponse } from '../utils/graphql';
import { extractGraphQlData } from '../utils/graphql';
import { ticketsQueryKeys } from '../utils/query-keys';

interface LabelPayload {
  label?: TicketLabel | null;
  userErrors: Array<{ field?: string[]; message: string }>;
}

interface DeletePayload {
  userErrors: Array<{ field?: string[]; message: string }>;
}

export function useTicketLabels() {
  return useQuery({
    queryKey: ticketsQueryKeys.labels(),
    queryFn: async (): Promise<TicketLabel[]> => {
      const response = await apiClient.post<GraphQlResponse<{ ticketLabels: TicketLabel[] }>>(API_ENDPOINTS.GRAPHQL, {
        query: GET_TICKET_LABELS_QUERY,
      });
      const data = extractGraphQlData(response);
      return data.ticketLabels ?? [];
    },
  });
}

export function useCreateTicketLabel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, color }: { name: string; color?: string }) => {
      const response = await apiClient.post<GraphQlResponse<{ createTicketLabel: LabelPayload }>>(
        API_ENDPOINTS.GRAPHQL,
        {
          query: CREATE_TICKET_LABEL_MUTATION,
          variables: { input: { name, color } },
        },
      );
      const data = extractGraphQlData(response);
      if (data.createTicketLabel.userErrors?.length) {
        throw new Error(data.createTicketLabel.userErrors[0].message);
      }
      return data.createTicketLabel.label;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketsQueryKeys.labels() });
      toast({ title: 'Success', description: 'Label created', variant: 'success' });
    },
    onError: err => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create label',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTicketLabel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name?: string; color?: string }) => {
      const response = await apiClient.post<GraphQlResponse<{ updateTicketLabel: LabelPayload }>>(
        API_ENDPOINTS.GRAPHQL,
        {
          query: UPDATE_TICKET_LABEL_MUTATION,
          variables: { input: { id, name, color } },
        },
      );
      const data = extractGraphQlData(response);
      if (data.updateTicketLabel.userErrors?.length) {
        throw new Error(data.updateTicketLabel.userErrors[0].message);
      }
      return data.updateTicketLabel.label;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketsQueryKeys.labels() });
      toast({ title: 'Success', description: 'Label updated', variant: 'success' });
    },
    onError: err => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update label',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteTicketLabel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<GraphQlResponse<{ deleteTicketLabel: DeletePayload }>>(
        API_ENDPOINTS.GRAPHQL,
        {
          query: DELETE_TICKET_LABEL_MUTATION,
          variables: { input: { id } },
        },
      );
      const data = extractGraphQlData(response);
      if (data.deleteTicketLabel.userErrors?.length) {
        throw new Error(data.deleteTicketLabel.userErrors[0].message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ticketsQueryKeys.labels() });
      toast({ title: 'Success', description: 'Label deleted', variant: 'success' });
    },
    onError: err => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete label',
        variant: 'destructive',
      });
    },
  });
}
