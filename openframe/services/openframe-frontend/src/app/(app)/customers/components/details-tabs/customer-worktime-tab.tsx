'use client';

import { PlusCircleIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useMemo, useState } from 'react';
import { WorkTimeTable } from '@/app/components/shared/work-time-table';
import { getFullImageUrl } from '@/lib/image-url';
import type { CustomerDetails } from '../../hooks/use-customer-details';
import { CustomerTabHeader } from './customer-tab-header';

interface CustomerWorktimeTabProps {
  organization: CustomerDetails;
}

/** Worktime logged for this customer — Employee + Time + Ticket & Notes (Customer column omitted). */
export function CustomerWorktimeTab({ organization }: CustomerWorktimeTabProps) {
  const [addOpen, setAddOpen] = useState(false);

  // "Add Work Time" here is scoped to this customer: prefill + lock the customer field.
  const addDefaultCustomer = useMemo(
    () => ({
      id: organization.organizationId,
      label: organization.name,
      imageUrl: getFullImageUrl(organization.imageUrl, organization.imageHash),
    }),
    [organization.organizationId, organization.name, organization.imageUrl, organization.imageHash],
  );

  return (
    <div className="flex flex-col gap-[var(--spacing-system-l)]">
      <CustomerTabHeader
        title="Worktime"
        rightActions={
          <Button
            variant="outline"
            onClick={() => setAddOpen(true)}
            leftIcon={<PlusCircleIcon className="h-5 w-5 text-ods-text-secondary" />}
          >
            Add Work Time
          </Button>
        }
      />
      <WorkTimeTable
        organizationGlobalId={organization.id}
        showEmployee
        addWorkTimeOpen={addOpen}
        onAddWorkTimeOpenChange={setAddOpen}
        addDefaultCustomer={addDefaultCustomer}
      />
    </div>
  );
}
