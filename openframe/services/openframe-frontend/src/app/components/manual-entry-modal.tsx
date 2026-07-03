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
import { avatarStartAdornment, renderAvatarOption } from '@/app/(app)/tickets/components/avatar-autocomplete';
import { type AvatarOption, useAssigneeOptions } from '@/app/(app)/tickets/hooks/use-ticket-options';
import { SimpleModal } from '@/app/components/shared/simple-modal';
import { useTicketCustomerSelection } from '@/app/components/use-ticket-customer-selection';
import { createTimeEntryMutation } from '@/graphql/time-tracker/create-time-entry-mutation';
import {
  CLEAR_ORGANIZATION_ID,
  CLEAR_TICKET_ID,
  calendarDayToInstant,
  formatDurationLabel,
  instantToCalendarDay,
  makeCreateTimeEntryUpdater,
  moveInstantToCalendarDay,
  parseDurationLabel,
  toOrganizationGlobalId,
  toTicketGlobalId,
} from '@/graphql/time-tracker/time-tracker-helpers';
import { updateTimeEntryMutation } from '@/graphql/time-tracker/update-time-entry-mutation';
import { formatDate } from '@/lib/format-date';
import { getFullImageUrl } from '@/lib/image-url';
import { ensureGlobalIdForType } from '@/lib/relay-id';
import { useAuthStore } from '@/stores';

const manualEntrySchema = z.object({
  workTime: z.string().refine(value => {
    const seconds = parseDurationLabel(value);
    return seconds !== null && seconds > 0;
  }, 'Enter a duration greater than 00:00:00 — minutes and seconds must be 00–59'),
  startedAt: z.date(),
  notes: z.string(),
});

type ManualEntryFormValues = z.infer<typeof manualEntrySchema>;

const defaultFormValues = (): ManualEntryFormValues => ({
  workTime: '00:00:00',
  startedAt: new Date(),
  notes: '',
});

const renderCustomerOption = renderAvatarOption('square');
const renderUserOption = renderAvatarOption('round');

function AssignedUserField({
  value,
  onChange,
  seedOption,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  // The pre-selected user (create default or edited entry's user)
  seedOption?: AvatarOption;
}) {
  const { options, isLoading } = useAssigneeOptions();
  const mergedOptions = useMemo(() => {
    if (!seedOption || options.some(option => option.value === seedOption.value)) return options;
    return [seedOption, ...options];
  }, [options, seedOption]);
  const selected = mergedOptions.find(option => option.value === value);
  return (
    <div className="space-y-2">
      <Label>Employee</Label>
      <Autocomplete
        placeholder="Select Employee"
        value={selected ? value : null}
        onChange={onChange}
        options={mergedOptions}
        loading={isLoading}
        startAdornment={avatarStartAdornment(selected, 'round')}
        renderOption={renderUserOption}
      />
    </div>
  );
}

/** The subset of a TimeEntry needed to pre-fill the form when editing. */
export interface ManualEntryEditTarget {
  id: string;
  durationSeconds: number;
  startedAt: unknown;
  ticketId?: string | null;
  ticketNumber?: number | null;
  ticketTitle?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  userId?: string | null;
  userName?: string | null;
  userImageUrl?: string;
  notes?: string | null;
}

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** User the entry belongs to. Defaults to the signed-in user. */
  userId?: string;
  /**
   * Show an Employee field so the entry can be assigned/reassigned to another user (global
   * Worktime add + edit). Ignored when `userId` fixes the target (e.g. the employee details page).
   */
  selectableUser?: boolean;
  /**
   * Pre-select + lock the customer when creating (e.g. a customer-scoped Worktime tab), so the
   * entry is attributed to that customer. Ignored in edit mode. Memoize to keep it stable.
   */
  defaultCustomer?: { id: string; label: string; imageUrl?: string } | null;
  /** When provided, the modal edits this entry instead of creating a new one. */
  entry?: ManualEntryEditTarget | null;
  /** Called after a successful create/update (e.g. to refetch a list). */
  onSuccess?: () => void;
}

function ticketLabelFromEntry(entry: ManualEntryEditTarget): string {
  if (!entry.ticketId) return '';
  if (!entry.ticketTitle) return entry.ticketId;
  return `${entry.ticketNumber != null ? `#${entry.ticketNumber} ` : ''}${entry.ticketTitle}`;
}

export function ManualEntryModal({
  isOpen,
  onClose,
  userId,
  selectableUser,
  defaultCustomer,
  entry,
  onSuccess,
}: ManualEntryModalProps) {
  const { toast } = useToast();
  const currentUser = useAuthStore(state => state.user);
  const currentUserId = currentUser?.id;
  const isEditMode = !!entry;
  const showUserField = !!selectableUser && !userId;

  const [assignedUserId, setAssignedUserId] = useState<string | null>(null);
  const targetUserId = showUserField ? assignedUserId : (userId ?? currentUserId);

  const assignedUserSeed = useMemo<AvatarOption | undefined>(() => {
    if (entry?.userId) {
      return { value: entry.userId, label: entry.userName || entry.userId, imageUrl: entry.userImageUrl };
    }
    if (currentUser?.id) {
      const label = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
      return {
        value: currentUser.id,
        label,
        imageUrl: getFullImageUrl(currentUser.image?.imageUrl, currentUser.image?.hash),
      };
    }
    return undefined;
  }, [entry, currentUser]);

  const ticketCustomer = useTicketCustomerSelection();
  const { reset: resetTicketCustomer } = ticketCustomer;

  const [createTimeEntry, isCreating] = useMutation<CreateTimeEntryMutationType>(createTimeEntryMutation);
  const [updateTimeEntry, isUpdating] = useMutation<UpdateTimeEntryMutationType>(updateTimeEntryMutation);
  const isSubmitting = isCreating || isUpdating;

  const { control, handleSubmit, register, reset, formState, setError, clearErrors } = useForm<ManualEntryFormValues>({
    resolver: zodResolver(manualEntrySchema),
    defaultValues: defaultFormValues(),
  });

  useEffect(() => {
    if (!isOpen) return;
    setAssignedUserId(entry?.userId ?? currentUserId ?? null);
    reset(
      entry
        ? {
            workTime: formatDurationLabel(entry.durationSeconds),
            startedAt: instantToCalendarDay(entry.startedAt),
            notes: entry.notes ?? '',
          }
        : defaultFormValues(),
    );
    resetTicketCustomer(
      entry
        ? {
            ticketId: entry.ticketId ?? null,
            ticketLabel: ticketLabelFromEntry(entry),
            customerId: entry.organizationId ?? null,
            customerLabel: entry.organizationName ?? null,
            // Locked only when ticket-derived; a customer picked without a ticket stays editable.
            lockCustomer: !!(entry.ticketId && entry.organizationId),
          }
        : defaultCustomer
          ? {
              customerId: defaultCustomer.id,
              customerLabel: defaultCustomer.label,
              customerImageUrl: defaultCustomer.imageUrl,
              fixedCustomer: true,
            }
          : undefined,
    );
  }, [isOpen, entry, defaultCustomer, currentUserId, reset, resetTicketCustomer]);

  useEffect(() => {
    if (ticketCustomer.ticketId) clearErrors('notes');
  }, [ticketCustomer.ticketId, clearErrors]);

  const selectedCustomer = ticketCustomer.customerOptions.find(option => option.value === ticketCustomer.customerId);

  const onSubmit = handleSubmit(values => {
    const notes = values.notes.trim();
    if (!ticketCustomer.ticketId && !notes) {
      setError('notes', { message: 'Select a ticket or add notes' });
      return;
    }
    clearErrors('notes');

    if (showUserField && !assignedUserId) {
      toast({ title: 'Error', description: 'Select an employee to assign the entry to', variant: 'destructive' });
      return;
    }

    const durationSeconds = parseDurationLabel(values.workTime) ?? 0;
    const ticketId = toTicketGlobalId(ticketCustomer.ticketId);
    const organizationId = toOrganizationGlobalId(ticketCustomer.customerId);
    const notesValue = notes || null;
    const startedAt = entry
      ? moveInstantToCalendarDay(entry.startedAt, values.startedAt)
      : calendarDayToInstant(values.startedAt);

    if (entry) {
      updateTimeEntry({
        variables: {
          input: {
            id: entry.id,
            // Reassign the employee only when the field is shown (updateTimeEntry supports userId).
            ...(showUserField && assignedUserId ? { userId: ensureGlobalIdForType('User', assignedUserId) } : {}),
            ticketId: ticketId ?? CLEAR_TICKET_ID,
            organizationId: organizationId ?? CLEAR_ORGANIZATION_ID,
            notes,
            durationSeconds,
            startedAt,
          },
        },
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
          organizationId,
          notes: notesValue,
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
      {showUserField && (
        <AssignedUserField value={assignedUserId} onChange={setAssignedUserId} seedOption={assignedUserSeed} />
      )}

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

      <div className="grid grid-cols-2 gap-[var(--spacing-system-m)]">
        <div className="space-y-2">
          <Label>Ticket</Label>
          <Autocomplete
            placeholder="Select Ticket"
            value={ticketCustomer.ticketId}
            onChange={ticketCustomer.selectTicket}
            options={ticketCustomer.ticketOptions}
            onInputChange={(value, reason) => {
              if (reason === 'input') ticketCustomer.setTicketSearch(value);
            }}
            disableClientFilter
            loading={ticketCustomer.ticketsLoading}
          />
        </div>

        <div className="space-y-2">
          <Label>Customer</Label>
          <Autocomplete
            placeholder="Select Customer"
            value={ticketCustomer.customerId}
            onChange={ticketCustomer.selectCustomer}
            options={ticketCustomer.customerOptions}
            onInputChange={(value, reason) => {
              if (reason === 'input') ticketCustomer.setCustomerSearch(value);
            }}
            disabled={ticketCustomer.customerLocked}
            disableClientFilter
            loading={ticketCustomer.customersLoading}
            startAdornment={avatarStartAdornment(selectedCustomer, 'square')}
            renderOption={renderCustomerOption}
          />
        </div>
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
