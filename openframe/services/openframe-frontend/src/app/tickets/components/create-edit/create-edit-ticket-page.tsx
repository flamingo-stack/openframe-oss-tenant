'use client';

import { FormPageContainer } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { useCreateTicketForm } from '../../hooks/use-create-ticket-form';
import { TicketFormFields } from './ticket-form-fields';

export function CreateEditTicketPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketId = searchParams.get('edit');

  const { form, isEditMode, isLoadingTicket, isSubmitting, handleSave, tempAttachments } = useCreateTicketForm({
    ticketId,
  });

  const backButton = useMemo(() => ({ label: 'Back to Tickets', onClick: () => router.push('/tickets') }), [router]);

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
    <FormPageContainer
      title={isEditMode ? 'Edit Ticket' : 'New Ticket'}
      backButton={backButton}
      actions={actions}
      padding="none"
    >
      <TicketFormFields form={form} tempAttachments={tempAttachments} />
    </FormPageContainer>
  );
}
