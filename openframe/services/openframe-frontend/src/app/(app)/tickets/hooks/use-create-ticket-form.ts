'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useApplyAssignmentsDiff, useAssignedItems } from '@/components/assignments';
import { apiClient } from '@/lib/api-client';
import { API_ENDPOINTS, CREATION_SOURCE } from '../constants';
import { GET_TICKET_QUERY } from '../queries/ticket-queries';
import { type CreateTicketFormData, createTicketSchema } from '../types/create-ticket.types';
import type { Ticket } from '../types/ticket.types';
import type { GraphQlResponse } from '../utils/graphql';
import { extractGraphQlData } from '../utils/graphql';
import { ticketsQueryKeys } from '../utils/query-keys';
import { useCreateTicket } from './use-create-ticket';
import { useTempAttachments } from './use-temp-attachments';
import { useUpdateTicket } from './use-update-ticket';

interface UseCreateTicketFormOptions {
  ticketId?: string | null;
}

export function useCreateTicketForm({ ticketId }: UseCreateTicketFormOptions = {}) {
  const isEditMode = !!ticketId;
  const createTicketMutation = useCreateTicket();
  const updateTicketMutation = useUpdateTicket();
  const tempAttachments = useTempAttachments();
  const { mutateAsync: applyAssignmentsDiff } = useApplyAssignmentsDiff();

  const { data: ticket, isLoading: isLoadingTicket } = useQuery({
    queryKey: ticketsQueryKeys.detail(ticketId || ''),
    queryFn: async () => {
      const response = await apiClient.post<GraphQlResponse<{ ticket: Ticket }>>(API_ENDPOINTS.GRAPHQL, {
        query: GET_TICKET_QUERY,
        variables: { id: ticketId },
      });
      return extractGraphQlData(response).ticket;
    },
    enabled: isEditMode,
  });

  const form = useForm<CreateTicketFormData>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      title: '',
      organizationId: undefined,
      deviceId: undefined,
      userId: undefined,
      assignedTo: undefined,
      type: 'text',
      labelIds: [],
      description: '',
      assignKnowledgeBase: false,
      assignments: {},
    },
  });

  const assignedItems = useAssignedItems({
    itemId: ticketId ?? null,
    itemType: 'TICKET',
    enabled: isEditMode,
  });

  // Prefill form when ticket data loads
  useEffect(() => {
    if (ticket && isEditMode && assignedItems.isReady) {
      form.reset({
        title: ticket.title || '',
        description: ticket.description || '',
        organizationId: ticket.organizationId || undefined,
        deviceId: ticket.deviceId || undefined,
        assignedTo: ticket.assignedTo || undefined,
        userId: undefined,
        type: 'text',
        labelIds: ticket.labels?.map(l => l.id) || [],
        assignKnowledgeBase: false,
        assignments: assignedItems.value,
      });

      if (ticket.attachments?.length) {
        tempAttachments.initializeExisting(ticket.attachments);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tempAttachments.initializeExisting is stable (useCallback)
  }, [ticket, isEditMode, form, tempAttachments.initializeExisting, assignedItems.isReady, assignedItems.value]);

  const handleSave = form.handleSubmit(async data => {
    const nextAssignments = data.assignments ?? {};
    if (isEditMode && ticketId) {
      const tempAttachmentIds = tempAttachments.getTempAttachmentIds();

      if (tempAttachments.hasPendingDeletes) {
        await tempAttachments.deleteRemovedAttachments();
      }

      await updateTicketMutation.mutateAsync({
        id: ticketId,
        title: data.title,
        description: data.description || undefined,
        organizationId: data.organizationId ?? null,
        deviceId: data.deviceId ?? null,
        assigneeId: data.assignedTo ?? null,
        labelIds: data.labelIds,
        tempAttachmentIds: tempAttachmentIds.length ? tempAttachmentIds : undefined,
      });

      await applyAssignmentsDiff({
        itemId: ticketId,
        itemType: 'TICKET',
        prev: assignedItems.value,
        next: nextAssignments,
      });
    } else {
      const tempAttachmentIds = tempAttachments.getTempAttachmentIds();

      const created = await createTicketMutation.mutateAsync({
        title: data.title,
        description: data.description || undefined,
        organizationId: data.organizationId || undefined,
        deviceId: data.deviceId || undefined,
        assigneeId: data.assignedTo || undefined,
        labelIds: data.labelIds.length ? data.labelIds : undefined,
        tempAttachmentIds: tempAttachmentIds.length ? tempAttachmentIds : undefined,
      });

      if (created?.id && Object.keys(nextAssignments).length > 0) {
        await applyAssignmentsDiff({
          itemId: created.id,
          itemType: 'TICKET',
          prev: {},
          next: nextAssignments,
        });
      }
    }
  });

  const isFaeForm = ticket?.creationSource === CREATION_SOURCE.FAE_FORM;

  return {
    form,
    isEditMode,
    isLoadingTicket,
    isSubmitting: createTicketMutation.isPending || updateTicketMutation.isPending,
    handleSave,
    tempAttachments,
    isFaeForm,
  };
}
