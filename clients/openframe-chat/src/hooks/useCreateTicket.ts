import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { ticketGraphQlService } from '../services/ticketGraphQlService';
import { useFeatureFlags } from '../contexts/FeatureFlagsContext';

interface CreateTicketForm {
  subject: string;
  description: string;
  attachments: File[];
}

async function uploadAttachments(files: File[]): Promise<string[]> {
  const tempIds: string[] = [];

  for (const file of files) {
    const temp = await ticketGraphQlService.createTempAttachmentUploadUrl(file.name, file.type || undefined);

    await fetch(temp.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: file,
    });

    tempIds.push(temp.id);
  }

  return tempIds;
}

export function useCreateTicket(onSuccess?: () => void) {
  const { flags } = useFeatureFlags();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CreateTicketForm>({
    subject: '',
    description: '',
    attachments: [],
  });

  const setField = useCallback(<K extends keyof CreateTicketForm>(key: K, value: CreateTicketForm[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setForm({ subject: '', description: '', attachments: [] });
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      const tempAttachmentIds = form.attachments.length > 0 ? await uploadAttachments(form.attachments) : undefined;

      await ticketGraphQlService.createTicket({
        title: form.subject.trim(),
        description: form.description || undefined,
        tempAttachmentIds,
      });
    },
    onSuccess: () => {
      if (flags.tickets) {
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
      }
      toast({ title: 'Success', description: 'Ticket created successfully', variant: 'success' });
      resetForm();
      onSuccess?.();
    },
    onError: err => {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create ticket',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = useCallback(() => {
    if (!form.subject.trim()) {
      toast({ title: 'Validation Error', description: 'Subject is required', variant: 'destructive' });
      return;
    }
    mutation.mutate();
  }, [form.subject, mutation, toast]);

  return { form, setField, isSubmitting: mutation.isPending, handleSubmit, resetForm };
}
