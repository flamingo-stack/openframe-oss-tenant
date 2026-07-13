'use client';

import { PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { routes } from '@/lib/routes';
import { useCreateTicketForm } from '../../hooks/use-create-ticket-form';
import { TicketFormFields } from './ticket-form-fields';

export function CreateEditTicketPage() {
  const searchParams = useSearchParams();
  const ticketId = searchParams.get('edit');

  const { form, ticket, isEditMode, isLoadingTicket, isSubmitting, handleSave, tempAttachments, isFaeForm } =
    useCreateTicketForm({
      ticketId,
    });

  const backToTicket = useSafeBack(routes.tickets.dialog(ticketId ?? ''));
  const backToTickets = useSafeBack(routes.tickets.list);
  const backButton = useMemo(
    () =>
      isEditMode && ticketId ? { label: 'Back', onClick: backToTicket } : { label: 'Back', onClick: backToTickets },
    [isEditMode, ticketId, backToTicket, backToTickets],
  );

  const actions = useMemo(
    () => [
      {
        label: 'Cancel',
        onClick: backButton.onClick,
        variant: 'outline' as const,
        disabled: isSubmitting,
        // Desktop keeps the header "Back" link for cancelling; the explicit
        // Cancel button is only needed in the mobile/tablet bottom action bar.
        showOnlyMobile: true,
      },
      {
        label: isEditMode ? 'Save Changes' : 'Save Ticket',
        onClick: handleSave,
        variant: 'accent' as const,
        disabled: isSubmitting || isLoadingTicket,
        loading: isSubmitting,
      },
    ],
    [backButton, handleSave, isSubmitting, isLoadingTicket, isEditMode],
  );

  return (
    <PageLayout
      title={isEditMode ? 'Edit Ticket' : 'New Ticket'}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      backButton={backButton}
      actions={actions}
      actionsVariant="primary-buttons"
    >
      <TicketFormFields
        form={form}
        ticket={ticket}
        tempAttachments={tempAttachments}
        isFaeForm={isFaeForm}
        isEditMode={isEditMode}
      />
    </PageLayout>
  );
}
