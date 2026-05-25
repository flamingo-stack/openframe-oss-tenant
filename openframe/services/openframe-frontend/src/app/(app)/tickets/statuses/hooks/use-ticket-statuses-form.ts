'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { type FieldErrors, useFieldArray, useForm } from 'react-hook-form';
import { type TicketStatusesPayload, ticketStatusesSchema } from '../types/ticket-statuses.types';
import { useTicketStatusesQuery, useUpdateTicketStatusesMutation } from './use-ticket-statuses-mock';

export function useTicketStatusesForm() {
  const { data } = useTicketStatusesQuery();
  const mutation = useUpdateTicketStatusesMutation();
  const { toast } = useToast();

  const form = useForm<TicketStatusesPayload>({
    resolver: zodResolver(ticketStatusesSchema),
    defaultValues: { customStatuses: [] },
  });

  const fieldArray = useFieldArray({
    control: form.control,
    name: 'customStatuses',
    keyName: '_key',
  });

  const { reset } = form;
  // keepDirtyValues protects user edits that land mid-refetch from being clobbered.
  useEffect(() => {
    if (data) reset(data, { keepDirtyValues: true });
  }, [data, reset]);

  const onValidSubmit = (payload: TicketStatusesPayload) => {
    mutation.mutate(payload, {
      onSuccess: saved => reset(saved, { keepDirty: false }),
    });
  };

  const onInvalidSubmit = (errors: FieldErrors<TicketStatusesPayload>) => {
    const messages = collectErrorMessages(errors);
    toast({
      title: 'Validation Error',
      description: messages.join(', ') || 'Please review highlighted fields.',
      variant: 'destructive',
    });
  };

  return {
    form,
    fieldArray,
    mutation,
    onValidSubmit,
    onInvalidSubmit,
    canDelete: fieldArray.fields.length > 1,
  };
}

function collectErrorMessages(errors: FieldErrors): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    if ('message' in node && typeof (node as { message?: unknown }).message === 'string') {
      out.push((node as { message: string }).message);
    }
    for (const key of Object.keys(node)) {
      if (key === 'message' || key === 'ref' || key === 'type') continue;
      walk((node as Record<string, unknown>)[key]);
    }
  };
  walk(errors);
  return Array.from(new Set(out));
}
