'use client';

import { PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { useCreateTicketForm } from '../../hooks/use-create-ticket-form';
import { TicketFormFields } from './ticket-form-fields';

export function CreateEditTicketPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketId = searchParams.get('edit');

  const { form, isEditMode, isLoadingTicket, isSubmitting, handleSave, tempAttachments, isFaeForm } =
    useCreateTicketForm({
      ticketId,
    });

  const backButton = useMemo(
    () =>
      isEditMode && ticketId
        ? { label: 'Back to Ticket', onClick: () => router.push(`/tickets/dialog?id=${ticketId}`) }
        : { label: 'Back to Tickets', onClick: () => router.push('/tickets') },
    [router, isEditMode, ticketId],
  );

  const actions = useMemo(
    () => [
      {
        label: isEditMode ? 'Save Changes' : 'Save Ticket',
        onClick: handleSave,
        variant: 'primary' as const,
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
