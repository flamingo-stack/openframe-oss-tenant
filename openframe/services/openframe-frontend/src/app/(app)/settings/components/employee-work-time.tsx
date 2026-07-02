'use client';

import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useState } from 'react';
import { WorkTimeTable } from '@/app/components/shared/work-time-table';

export function EmployeeWorkTime({ userId }: { userId: string }) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <section className="flex flex-col pt-[var(--spacing-system-l)] gap-[var(--spacing-system-l)]">
      <div className="flex items-center justify-between gap-[var(--spacing-system-m)]">
        <h2 className="text-h2 text-ods-text-primary">Employee Work Time</h2>
        <Button
          variant="outline"
          onClick={() => setAddOpen(true)}
          leftIcon={<PlusCircleIcon className="h-5 w-5 text-ods-text-secondary" />}
        >
          Add Work Time
        </Button>
      </div>

      <WorkTimeTable showCustomer employeeId={userId} addWorkTimeOpen={addOpen} onAddWorkTimeOpenChange={setAddOpen} />
    </section>
  );
}
