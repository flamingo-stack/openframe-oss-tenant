'use client';

import { PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { useCreateTicketForm } from '../../hooks/use-create-ticket-form';
import { TicketFormFields } from './ticket-form-fields';

export function CreateEditTicketPage() {
  const searchParams = useSearchParams();
  const ticketId = searchParams.get('edit');

  const { form, isEditMode, isLoadingTicket, isSubmitting, handleSave, tempAttachments, isFaeForm } =
    useCreateTicketForm({
      ticketId,
    });

  const backToTicket = useSafeBack(`/tickets/dialog?id=${ticketId ?? ''}`);
  const backToTickets = useSafeBack('/tickets');
  const backButton = useMemo(
    () =>
      isEditMode && ticketId ? { label: 'Back', onClick: backToTicket } : { label: 'Back', onClick: backToTickets },
    [isEditMode, ticketId, backToTicket, backToTickets],
  );

  const actions = useMemo(
    () => [
      {
        label: isEditMode ? 'Save Changes' : 'Save Ticket',
        onClick: handleSave,
        variant: 'accent' as const,
        disabled: isSubmitting || isLoadingTicket,
        loading: isSubmitting,
      },
    ],
    [handleSave, isSubmitting, isLoadingTicket, isEditMode],
  );

  return (
    <PageLayout
      title={isEditMode ? 'Edit Ticket' : 'New Ticket'}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      backButton={backButton}
      actions={actions}
    >
      <TicketFormFields form={form} tempAttachments={tempAttachments} isFaeForm={isFaeForm} isEditMode={isEditMode} />
    </PageLayout>
  );
}
