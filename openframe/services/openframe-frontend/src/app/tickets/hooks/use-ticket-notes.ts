'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS } from '../constants';
import {
  ADD_TICKET_NOTE_MUTATION,
  DELETE_TICKET_NOTE_MUTATION,
  UPDATE_TICKET_NOTE_MUTATION,
} from '../queries/ticket-queries';
import type { GraphQlResponse } from '../utils/graphql';
import { extractGraphQlData } from '../utils/graphql';

interface NotePayload {
  note?: { id: string; content: string } | null;
  userErrors: Array<{ field?: string[]; message: string }>;
}

interface DeletePayload {
  userErrors: Array<{ field?: string[]; message: string }>;
}

export function useAddTicketNote(onSuccess?: () => void) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ ticketId, content }: { ticketId: string; content: string }) => {
      const response = await apiClient.post<GraphQlResponse<{ addTicketNote: NotePayload }>>(API_ENDPOINTS.GRAPHQL, {
        query: ADD_TICKET_NOTE_MUTATION,
        variables: { input: { ticketId, content } },
      });
      const data = extractGraphQlData(response);
      if (data.addTicketNote.userErrors?.length) {
        throw new Error(data.addTicketNote.userErrors[0].message);
      }
      return data.addTicketNote.note;
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Note added', variant: 'success' });
      onSuccess?.();
    },
    onError: err => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to add note',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTicketNote(onSuccess?: () => void) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const response = await apiClient.post<GraphQlResponse<{ updateTicketNote: NotePayload }>>(API_ENDPOINTS.GRAPHQL, {
        query: UPDATE_TICKET_NOTE_MUTATION,
        variables: { input: { id, content } },
      });
      const data = extractGraphQlData(response);
      if (data.updateTicketNote.userErrors?.length) {
        throw new Error(data.updateTicketNote.userErrors[0].message);
      }
      return data.updateTicketNote.note;
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Note updated', variant: 'success' });
      onSuccess?.();
    },
    onError: err => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update note',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteTicketNote(onSuccess?: () => void) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post<GraphQlResponse<{ deleteTicketNote: DeletePayload }>>(
        API_ENDPOINTS.GRAPHQL,
        {
          query: DELETE_TICKET_NOTE_MUTATION,
          variables: { input: { id } },
        },
      );
      const data = extractGraphQlData(response);
      if (data.deleteTicketNote.userErrors?.length) {
        throw new Error(data.deleteTicketNote.userErrors[0].message);
      }
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'Note deleted', variant: 'success' });
      onSuccess?.();
    },
    onError: err => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete note',
        variant: 'destructive',
      });
    },
  });
}
