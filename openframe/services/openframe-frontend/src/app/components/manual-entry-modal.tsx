'use client';

import {
  Autocomplete,
  Button,
  DatePicker,
  DurationInput,
  Label,
  Textarea,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useMutation } from 'react-relay';
import { z } from 'zod';
import type { createTimeEntryMutation as CreateTimeEntryMutationType } from '@/__generated__/createTimeEntryMutation.graphql';
import type { updateTimeEntryMutation as UpdateTimeEntryMutationType } from '@/__generated__/updateTimeEntryMutation.graphql';
import { useTicketSearchOptions } from '@/app/(app)/tickets/hooks/use-ticket-options';
import { SimpleModal } from '@/app/components/shared/simple-modal';
import { createTimeEntryMutation } from '@/graphql/time-tracker/create-time-entry-mutation';
import {
  calendarDayToInstant,
  formatDurationLabel,
  instantToCalendarDay,
  makeCreateTimeEntryUpdater,
  parseDurationLabel,
  toTicketGlobalId,
} from '@/graphql/time-tracker/time-tracker-helpers';
import { updateTimeEntryMutation } from '@/graphql/time-tracker/update-time-entry-mutation';
import { formatDate } from '@/lib/format-date';
import { ensureGlobalIdForType } from '@/lib/relay-id';
import { useAuthStore } from '@/stores';

const manualEntrySchema = z
  .object({
    workTime: z.string().refine(value => {
      const seconds = parseDurationLabel(value);
      return seconds !== null && seconds > 0;
    }, 'Enter a duration greater than 00:00:00 — minutes and seconds must be 00–59'),
    startedAt: z.date(),
    ticketId: z.string().nullable(),
    notes: z.string(),
  })
  .refine(data => !!data.ticketId || data.notes.trim().length > 0, {
    message: 'Select a ticket or add notes',
    path: ['notes'],
  });

type ManualEntryFormValues = z.infer<typeof manualEntrySchema>;

const defaultFormValues = (): ManualEntryFormValues => ({
  workTime: '00:00:00',
  startedAt: new Date(),
  ticketId: null,
  notes: '',
});

/** The subset of a TimeEntry needed to pre-fill the form when editing. */
export interface ManualEntryEditTarget {
  id: string;
  durationSeconds: number;
  startedAt: unknown;
  ticketId?: string | null;
  ticketNumber?: number | null;
  ticketTitle?: string | null;
  notes?: string | null;
}

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** User the entry belongs to. Defaults to the signed-in user. */
  userId?: string;
  /** When provided, the modal edits this entry instead of creating a new one. */
  entry?: ManualEntryEditTarget | null;
  /** Called after a successful create/update (e.g. to refetch a list). */
  onSuccess?: () => void;
}

function ticketOptionFromEntry(entry: ManualEntryEditTarget | null | undefined) {
  if (!entry?.ticketId) return null;
  const label = entry.ticketTitle
    ? `${entry.ticketNumber != null ? `#${entry.ticketNumber} ` : ''}${entry.ticketTitle}`
    : entry.ticketId;
  return { label, value: entry.ticketId };
}

export function ManualEntryModal({ isOpen, onClose, userId, entry, onSuccess }: ManualEntryModalProps) {
  const { toast } = useToast();
  const currentUserId = useAuthStore(state => state.user?.id);
  const targetUserId = userId ?? currentUserId;
  const isEditMode = !!entry;

  const [ticketSearch, setTicketSearch] = useState('');
  const { options: ticketOptions, isLoading: ticketsLoading } = useTicketSearchOptions(ticketSearch);

  const options = useMemo(() => {
    const seed = ticketOptionFromEntry(entry);
    if (!seed || ticketOptions.some(option => option.value === seed.value)) return ticketOptions;
    return [seed, ...ticketOptions];
  }, [entry, ticketOptions]);

  const [createTimeEntry, isCreating] = useMutation<CreateTimeEntryMutationType>(createTimeEntryMutation);
  const [updateTimeEntry, isUpdating] = useMutation<UpdateTimeEntryMutationType>(updateTimeEntryMutation);
  const isSubmitting = isCreating || isUpdating;

  const { control, handleSubmit, register, reset, formState } = useForm<ManualEntryFormValues>({
    resolver: zodResolver(manualEntrySchema),
    defaultValues: defaultFormValues(),
  });

  useEffect(() => {
    if (!isOpen) return;
    setTicketSearch('');
    reset(
      entry
        ? {
            workTime: formatDurationLabel(entry.durationSeconds),
            startedAt: instantToCalendarDay(entry.startedAt),
            ticketId: entry.ticketId ?? null,
            notes: entry.notes ?? '',
          }
        : defaultFormValues(),
    );
  }, [isOpen, entry, reset]);

  const onSubmit = handleSubmit(values => {
    const durationSeconds = parseDurationLabel(values.workTime) ?? 0;
    const ticketId = toTicketGlobalId(values.ticketId);
    const notes = values.notes.trim() || null;
    const startedAt = calendarDayToInstant(values.startedAt);

    if (entry) {
      updateTimeEntry({
        variables: { input: { id: entry.id, ticketId, notes, durationSeconds, startedAt } },
        onCompleted: () => {
          toast({ title: 'Time entry updated', variant: 'success' });
          onSuccess?.();
          onClose();
        },
        onError: err => {
          toast({ title: 'Failed to update time entry', description: err.message, variant: 'destructive' });
        },
      });
      return;
    }

    if (!targetUserId) {
      toast({ title: 'Error', description: 'You must be signed in to add a time entry', variant: 'destructive' });
      return;
    }
    createTimeEntry({
      variables: {
        input: {
          userId: ensureGlobalIdForType('User', targetUserId),
          ticketId,
          notes,
          startedAt,
          durationSeconds,
        },
      },
      updater: targetUserId === currentUserId ? makeCreateTimeEntryUpdater() : undefined,
      onCompleted: () => {
        toast({ title: 'Time entry added', variant: 'success' });
        onSuccess?.();
        onClose();
      },
      onError: err => {
        toast({ title: 'Failed to add time entry', description: err.message, variant: 'destructive' });
      },
    });
  });

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Entry' : 'Manual Entry'}
      className="max-w-2xl"
      contentClassName="flex flex-col gap-[var(--spacing-system-l)]"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="flex-1">
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Entry'}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <Label>Work Time</Label>
        <Controller
          name="workTime"
          control={control}
          render={({ field }) => (
            <DurationInput value={field.value} onChange={field.onChange} invalid={!!formState.errors.workTime} />
          )}
        />
        {formState.errors.workTime && <p className="text-ods-error text-h6">{formState.errors.workTime.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Date</Label>
        <Controller
          name="startedAt"
          control={control}
          render={({ field }) => (
            <DatePicker
              mode="single"
              value={field.value}
              onChange={date => {
                if (date) field.onChange(date);
              }}
              formatDate={formatDate}
            />
          )}
        />
      </div>

      <div className="space-y-2">
        <Label>Ticket</Label>
        <Controller
          name="ticketId"
          control={control}
          render={({ field }) => (
            <Autocomplete
              placeholder="Assign Ticket"
              value={field.value}
              onChange={field.onChange}
              options={options}
              onInputChange={(value, reason) => {
                if (reason === 'input') setTicketSearch(value);
              }}
              disableClientFilter
              loading={ticketsLoading}
            />
          )}
        />
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          placeholder="Additional Notes (optional if ticket selected)"
          rows={4}
          className="bg-ods-card"
          {...register('notes')}
        />
        {formState.errors.notes && <p className="text-ods-error text-h6">{formState.errors.notes.message}</p>}
      </div>
    </SimpleModal>
  );
}
