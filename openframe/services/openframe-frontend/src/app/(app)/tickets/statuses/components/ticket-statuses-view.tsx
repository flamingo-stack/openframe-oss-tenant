'use client';

import { TicketStatusConfigList } from '@flamingo-stack/openframe-frontend-core/components/features';
import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import {
  Button,
  DEFAULT_CUSTOM_STATUS_COLOR,
  type PageActionButton,
  PageLayout,
  type TicketStatus,
  TicketStatusConfigRow,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { Controller } from 'react-hook-form';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { useTicketStatusesForm } from '../hooks/use-ticket-statuses-form';
import type { CustomTicketStatus } from '../types/ticket-statuses.types';

interface SystemRow {
  statusKey: TicketStatus;
  label: string;
  tooltip: string;
  tagVariant: 'outline' | 'primary';
}

const SYSTEM_TOP: SystemRow[] = [
  {
    statusKey: 'ACTIVE',
    label: 'AI-Assistance',
    tooltip: 'System status for new tickets. The AI assistant manages the conversation here.',
    tagVariant: 'outline',
  },
  {
    statusKey: 'TECH_REQUIRED',
    label: 'Tech Required',
    tooltip: 'System status. Auto-assigned when the AI assistant needs approval to run a command.',
    tagVariant: 'primary',
  },
];

const SYSTEM_BOTTOM: SystemRow = {
  statusKey: 'RESOLVED',
  label: 'Resolved',
  tooltip: 'System status. Marks tickets as completed and closes the conversation.',
  tagVariant: 'outline',
};

const DELETE_DISABLED_REASON = 'At least one custom status is required';

function createCustomStatus(): CustomTicketStatus {
  return {
    kind: 'custom',
    id: crypto.randomUUID(),
    label: 'New status',
    color: DEFAULT_CUSTOM_STATUS_COLOR,
    preset: undefined,
  };
}

function renderSystemRow(row: SystemRow) {
  return (
    <TicketStatusConfigRow
      key={row.statusKey}
      variant="system"
      statusKey={row.statusKey}
      label={row.label}
      systemTooltip={row.tooltip}
      systemTagVariant={row.tagVariant}
    />
  );
}

export function TicketStatusesView() {
  const handleBack = useSafeBack('/tickets');
  const { form, fieldArray, mutation, onValidSubmit, onInvalidSubmit, canDelete } = useTicketStatusesForm();

  const handleAdd = () => {
    fieldArray.append(createCustomStatus(), { shouldFocus: false });
  };

  const submit = form.handleSubmit(onValidSubmit, onInvalidSubmit);

  const actions: PageActionButton[] = [
    {
      label: 'Save Statuses',
      onClick: submit,
      variant: 'accent',
      disabled: !form.formState.isDirty || mutation.isPending,
      loading: mutation.isPending,
    },
  ];

  return (
    <PageLayout
      title="Ticket Statuses"
      backButton={{ label: 'Back to Tickets', onClick: handleBack }}
      actions={actions}
      actionsVariant="primary-buttons"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      contentClassName="flex flex-col gap-[var(--spacing-system-l)]"
    >
      <form onSubmit={submit} className="flex w-full flex-col gap-[var(--spacing-system-l)]">
        <section aria-label="System statuses" className="flex w-full flex-col gap-[var(--spacing-system-xs)]">
          {SYSTEM_TOP.map(renderSystemRow)}
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
                    label={field.value.label}
                    onLabelChange={value => field.onChange({ ...field.value, label: value })}
                    color={field.value.color}
                    presetKey={field.value.preset}
                    onColorChange={next => field.onChange({ ...field.value, color: next.color, preset: next.preset })}
                    onDelete={() => fieldArray.remove(row.index)}
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

        <section aria-label="Resolved status" className="w-full">
          {renderSystemRow(SYSTEM_BOTTOM)}
        </section>
      </form>
    </PageLayout>
  );
}
