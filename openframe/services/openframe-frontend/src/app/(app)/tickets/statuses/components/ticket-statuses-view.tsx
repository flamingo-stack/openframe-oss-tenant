'use client';

import { TicketStatusConfigList } from '@flamingo-stack/openframe-frontend-core/components/features';
import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  DEFAULT_CUSTOM_STATUS_COLOR,
  type PageActionButton,
  PageLayout,
  TicketStatusConfigRow,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { routes } from '@/lib/routes';
import { useTicketStatusesForm } from '../hooks/use-ticket-statuses-form';
import type { CustomTicketStatus, SystemTicketStatus } from '../types/ticket-statuses.types';
import { DeleteStatusDialog } from './delete-status-dialog';

const DELETE_DISABLED_REASON = 'At least one custom status is required';
const TOP_KINDS = new Set(['AI_ASSISTANCE', 'TECH_REQUIRED']);

function createCustomStatus(): CustomTicketStatus {
  return {
    kind: 'custom',
    id: crypto.randomUUID(),
    name: 'New status',
    color: DEFAULT_CUSTOM_STATUS_COLOR,
    preset: undefined,
  };
}

function renderSystemRow(row: SystemTicketStatus) {
  return (
    <TicketStatusConfigRow
      key={row.id}
      variant="system"
      statusKey={row.statusKey}
      name={row.name}
      systemTooltip={row.tooltip}
      systemTagVariant={row.tagVariant}
    />
  );
}

export function TicketStatusesView() {
  const handleBack = useSafeBack(routes.tickets.list);
  const {
    form,
    fieldArray,
    saveMutation,
    deleteMutation,
    onValidSubmit,
    onInvalidSubmit,
    canDelete,
    systemStatuses,
    persistedCustomIds,
    replacementOptionsFor,
  } = useTicketStatusesForm();

  const [pendingDelete, setPendingDelete] = useState<{ index: number; custom: CustomTicketStatus } | null>(null);

  const systemTop = systemStatuses.filter(s => TOP_KINDS.has(s.kind));
  const systemBottom = systemStatuses.filter(s => !TOP_KINDS.has(s.kind));

  const handleAdd = () => {
    fieldArray.append(createCustomStatus(), { shouldFocus: false });
  };

  const handleDelete = (index: number, custom: CustomTicketStatus) => {
    if (persistedCustomIds.has(custom.id)) {
      setPendingDelete({ index, custom });
    } else {
      fieldArray.remove(index);
    }
  };

  const confirmDelete = (replacementStatusId: string) => {
    if (!pendingDelete) return;
    deleteMutation.mutate(
      { id: pendingDelete.custom.id, replacementStatusId },
      {
        onSuccess: () => {
          fieldArray.remove(pendingDelete.index);
          setPendingDelete(null);
        },
      },
    );
  };

  const submit = form.handleSubmit(onValidSubmit, onInvalidSubmit);

  const actions: PageActionButton[] = [
    {
      label: 'Save Statuses',
      onClick: submit,
      variant: 'accent',
      disabled: !form.formState.isDirty || saveMutation.isPending,
      loading: saveMutation.isPending,
    },
  ];

  return (
    <PageLayout
      title="Ticket Statuses"
      backButton={{ label: 'Back', onClick: handleBack }}
      actions={actions}
      actionsVariant="primary-buttons"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      contentClassName="flex flex-col gap-[var(--spacing-system-l)]"
    >
      <form onSubmit={submit} className="flex w-full flex-col gap-[var(--spacing-system-l)]">
        <section aria-label="System statuses" className="flex w-full flex-col gap-[var(--spacing-system-xs)]">
          {systemTop.map(renderSystemRow)}
        </section>

        <section aria-label="Custom statuses" className="flex w-full flex-col gap-[var(--spacing-system-xs)]">
          <TicketStatusConfigList
            items={fieldArray.fields.map((f, index) => ({ id: f.id, rhfKey: f._key, index }))}
            onReorder={fieldArray.move}
            renderRow={(row, { dragHandleProps, dragHandleAttributes, isDragging }) => (
              <Controller
                key={row.rhfKey}
                control={form.control}
                name={`customStatuses.${row.index}`}
                render={({ field }) => (
                  <TicketStatusConfigRow
                    variant="custom"
                    statusKey={field.value.id}
                    name={field.value.name}
                    onNameChange={value => field.onChange({ ...field.value, name: value })}
                    color={field.value.color}
                    presetKey={field.value.preset}
                    onColorChange={next => field.onChange({ ...field.value, color: next.color, preset: next.preset })}
                    onDelete={() => handleDelete(row.index, field.value)}
                    deleteDisabled={!canDelete}
                    deleteDisabledReason={!canDelete ? DELETE_DISABLED_REASON : undefined}
                    dragHandleProps={dragHandleProps}
                    dragHandleAttributes={dragHandleAttributes}
                    isDragging={isDragging}
                  />
                )}
              />
            )}
          />

          <Button
            type="button"
            variant="outline"
            size="small"
            onClick={handleAdd}
            className="self-start"
            leftIcon={<PlusCircleIcon className="text-ods-text-secondary" />}
          >
            Add Status
          </Button>
        </section>

        <section aria-label="Resolved status" className="flex w-full flex-col gap-[var(--spacing-system-xs)]">
          {systemBottom.map(renderSystemRow)}
        </section>
      </form>

      <DeleteStatusDialog
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        statusName={pendingDelete?.custom.name ?? ''}
        options={replacementOptionsFor(pendingDelete?.custom.id)}
        onConfirm={confirmDelete}
        isPending={deleteMutation.isPending}
      />
    </PageLayout>
  );
}
