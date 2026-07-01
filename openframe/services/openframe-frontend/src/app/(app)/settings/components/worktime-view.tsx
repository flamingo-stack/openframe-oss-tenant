'use client';

import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import { PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useState } from 'react';
import { WorkTimeTable } from '@/app/components/shared/work-time-table';
import { useSafeBack } from '@/app/hooks/use-safe-back';
import { useInvitations } from '../hooks/use-invitations';
import { AddUsersModal } from './add-users-modal';

export function WorktimeView() {
  const handleBack = useSafeBack('/settings');
  const { inviteUsers } = useInvitations();

  const [addWorkTimeOpen, setAddWorkTimeOpen] = useState(false);
  const [addUsersOpen, setAddUsersOpen] = useState(false);

  const handleInviteUsers = async (rows: { email: string }[]) => {
    await inviteUsers(rows.map(r => r.email));
  };

  const actions = [
    {
      label: 'Add Work Time',
      icon: <PlusCircleIcon iconSize={20} whiteOverlay />,
      onClick: () => setAddWorkTimeOpen(true),
      variant: 'outline' as const,
    },
    {
      label: 'Add Users',
      icon: <PlusCircleIcon iconSize={20} whiteOverlay />,
      onClick: () => setAddUsersOpen(true),
      variant: 'outline' as const,
    },
  ];

  return (
    <PageLayout
      title="Worktime"
      actions={actions}
      actionsVariant="primary-buttons"
      backButton={{ label: 'Back', onClick: handleBack }}
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      <WorkTimeTable
        showEmployee
        showCustomer
        addWorkTimeOpen={addWorkTimeOpen}
        onAddWorkTimeOpenChange={setAddWorkTimeOpen}
      />
      <AddUsersModal isOpen={addUsersOpen} onClose={() => setAddUsersOpen(false)} invite={handleInviteUsers} />
    </PageLayout>
  );
}
