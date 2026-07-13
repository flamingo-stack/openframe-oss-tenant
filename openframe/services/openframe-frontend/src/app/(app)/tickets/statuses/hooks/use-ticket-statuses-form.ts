'use client';

import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { type FieldErrors, useFieldArray, useForm } from 'react-hook-form';
import { safeBackOrReplace } from '@/app/hooks/use-safe-back';
import { routes } from '@/lib/routes';
import { useTicketStatusTransitionRules } from '../../hooks/use-ticket-status-transition-rules';
import { type TicketStatusesPayload, ticketStatusesSchema } from '../types/ticket-statuses.types';
import { useDeleteTicketStatusMutation, useSaveTicketStatusesMutation } from './use-ticket-statuses-mutations';
import { useTicketStatusesQuery } from './use-ticket-statuses-query';

export interface ReplacementOption {
  id: string;
  name: string;
  color: string;
}

export function useTicketStatusesForm() {
  const { data } = useTicketStatusesQuery();
  const { data: transitionRules } = useTicketStatusTransitionRules();
  const saveMutation = useSaveTicketStatusesMutation();
  const deleteMutation = useDeleteTicketStatusMutation();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<TicketStatusesPayload>({
    resolver: zodResolver(ticketStatusesSchema),
    defaultValues: { customStatuses: [] },
  });

  const fieldArray = useFieldArray({
    control: form.control,
    name: 'customStatuses',
    keyName: '_key',
  });

  const { reset, formState } = form;
  // Read isDirty through a ref so the reset effect fires only when server `data`
  // changes — never when the dirty flag flips. Keying on isDirty would re-run
  // this right after a save's reset() clears dirty, clobbering the just-saved
  // order with the still-stale pre-refetch `data` (a visible flick) until the
  // refetch lands.
  const isDirtyRef = useRef(formState.isDirty);
  isDirtyRef.current = formState.isDirty;

  // Adopt server data only while the form is pristine — never clobber edits in
  // progress. After a save clears dirty state, the next refetch repopulates with
  // real ids.
  useEffect(() => {
    if (data && !isDirtyRef.current) {
      reset({ customStatuses: data.customStatuses });
    }
  }, [data, reset]);

  const persistedCustomIds = useMemo(
    () => new Set((data?.snapshot ?? []).filter(d => !d.isSystem).map(d => d.id)),
    [data],
  );

  const replacementOptions = useMemo<ReplacementOption[]>(
    () => (data?.snapshot ?? []).map(d => ({ id: d.id, name: d.name, color: d.color })),
    [data],
  );

  // Tickets in the deleted status can only be reassigned to a status it is
  // allowed to transition to, per the transition-rule matrix.
  const replacementOptionsFor = useCallback(
    (statusId: string | undefined): ReplacementOption[] => {
      if (!statusId) return [];
      const allowed = new Set(transitionRules?.find(r => r.from === statusId)?.to ?? []);
      return replacementOptions.filter(o => o.id !== statusId && allowed.has(o.id));
    },
    [transitionRules, replacementOptions],
  );

  const onValidSubmit = (payload: TicketStatusesPayload) => {
    saveMutation.mutate(
      { customStatuses: payload.customStatuses, snapshot: data?.snapshot ?? [] },
      {
        onSuccess: saved => {
          reset({ customStatuses: saved });
          safeBackOrReplace(router, routes.tickets.list);
        },
      },
    );
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
    saveMutation,
    deleteMutation,
    onValidSubmit,
    onInvalidSubmit,
    canDelete: fieldArray.fields.length > 1,
    systemStatuses: data?.systemStatuses ?? [],
    persistedCustomIds,
    replacementOptionsFor,
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
