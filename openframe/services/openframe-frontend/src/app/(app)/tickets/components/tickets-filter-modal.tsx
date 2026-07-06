'use client';

import { Button, Label } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useEffect, useState } from 'react';
import { SimpleModal } from '@/app/components/shared/simple-modal';
import { AssigneeFilter } from './assignee-filter';
import { OrganizationFilter } from './organization-filter';

interface TicketsFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationIds: string[];
  assigneeIds: string[];
  /** Applies both filters in one call — two sequential URL writes would clobber each other. */
  onApply: (filters: { organizationIds: string[]; assigneeIds: string[] }) => void;
}

/**
 * Mobile-only modal hosting the customer/assignee autocomplete filters.
 * Selection is buffered locally and flushed on Apply (FilterModal behavior).
 */
export function TicketsFilterModal({
  isOpen,
  onClose,
  organizationIds,
  assigneeIds,
  onApply,
}: TicketsFilterModalProps) {
  const [localOrganizationIds, setLocalOrganizationIds] = useState(organizationIds);
  const [localAssigneeIds, setLocalAssigneeIds] = useState(assigneeIds);

  useEffect(() => {
    if (isOpen) {
      setLocalOrganizationIds(organizationIds);
      setLocalAssigneeIds(assigneeIds);
    }
  }, [isOpen, organizationIds, assigneeIds]);

  const handleReset = () => {
    onApply({ organizationIds: [], assigneeIds: [] });
    onClose();
  };

  const handleApply = () => {
    onApply({ organizationIds: localOrganizationIds, assigneeIds: localAssigneeIds });
    onClose();
  };

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Filter Tickets"
      footer={
        <>
          <Button variant="outline" className="flex-1 h-11" onClick={handleReset}>
            Reset Filters
          </Button>
          <Button variant="accent" className="flex-1 h-11" onClick={handleApply}>
            Apply Filters
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <Label>Customer</Label>
        <OrganizationFilter value={localOrganizationIds} onChange={setLocalOrganizationIds} />
      </div>

      <div className="space-y-2">
        <Label>Assignee</Label>
        <AssigneeFilter value={localAssigneeIds} onChange={setLocalAssigneeIds} />
      </div>
    </SimpleModal>
  );
}
