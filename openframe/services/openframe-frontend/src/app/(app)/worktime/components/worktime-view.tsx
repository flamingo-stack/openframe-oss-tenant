'use client';

import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons';
import { PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useState } from 'react';
import { WorkTimeTable } from '@/app/components/shared/work-time-table';

export function WorktimeView() {
  const [addWorkTimeOpen, setAddWorkTimeOpen] = useState(false);

  const actions = [
    {
      label: 'Add Work Time',
      icon: <PlusCircleIcon iconSize={20} whiteOverlay />,
      onClick: () => setAddWorkTimeOpen(true),
      variant: 'outline' as const,
    },
  ];

  return (
    <PageLayout
      title="Worktime"
      actions={actions}
      actionsVariant="primary-buttons"
      className="px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
    >
      <WorkTimeTable
        showEmployee
        showCustomer
        addWorkTimeOpen={addWorkTimeOpen}
        onAddWorkTimeOpenChange={setAddWorkTimeOpen}
      />
    </PageLayout>
  );
}
