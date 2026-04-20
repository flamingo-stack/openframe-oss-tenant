'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores';
import { API_ENDPOINTS } from '../constants';
import {
  ADD_TICKET_NOTE_MUTATION,
  DELETE_TICKET_NOTE_MUTATION,
  UPDATE_TICKET_NOTE_MUTATION,
} from '../queries/ticket-queries';
import { useDialogDetailsStore } from '../stores/dialog-details-store';
import type { GraphQlResponse } from '../utils/graphql';
import { extractGraphQlData } from '../utils/graphql';

interface NotePayload {
  note?: { id: string; content: string } | null;
  userErrors: Array<{ field?: string[]; message: string }>;
}

interface DeletePayload {
  userErrors: Array<{ field?: string[]; message: string }>;
}

type DialogNotes = NonNullable<
  NonNullable<ReturnType<typeof useDialogDetailsStore.getState>['currentDialog']>['notes']
>;

function getDialogState() {
  return useDialogDetailsStore.getState();
}

function setDialogNotes(notes: DialogNotes) {
  const state = getDialogState();
  if (state.currentDialog) {
    useDialogDetailsStore.setState({
      currentDialog: { ...state.currentDialog, notes },
    });
  }
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
    onMutate: async ({ ticketId, content }) => {
      const previousNotes = getDialogState().currentDialog?.notes || [];
      const currentUser = useAuthStore.getState().user;
      const optimisticNote = {
        id: `optimistic-${Date.now()}`,
        ticketId,
        content,
        authorId: currentUser?.id || '',
        authorName: currentUser
          ? `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'You'
          : 'You',
        authorImageUrl: currentUser?.image?.imageUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setDialogNotes([...previousNotes, optimisticNote]);
      return { previousNotes };
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (err, _vars, context) => {
      if (context?.previousNotes) setDialogNotes(context.previousNotes);
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
    onMutate: async ({ id, content }) => {
      const previousNotes = getDialogState().currentDialog?.notes || [];
      const updatedNotes = previousNotes.map(note =>
        note.id === id ? { ...note, content, updatedAt: new Date().toISOString() } : note,
      );
      setDialogNotes(updatedNotes);
      return { previousNotes };
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (err, _vars, context) => {
      if (context?.previousNotes) setDialogNotes(context.previousNotes);
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
    onMutate: async id => {
      const previousNotes = getDialogState().currentDialog?.notes || [];
      setDialogNotes(previousNotes.filter(note => note.id !== id));
      return { previousNotes };
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (err, _vars, context) => {
      if (context?.previousNotes) setDialogNotes(context.previousNotes);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to delete note',
        variant: 'destructive',
      });
    },
  });
}
