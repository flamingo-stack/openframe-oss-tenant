'use client';

import type { BoardTicket } from '@flamingo-stack/openframe-frontend-core/components/features';
import { AssigneeDropdown } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useAssignTicket } from '../hooks/use-assign-ticket';
import { useAssigneeOptions } from '../hooks/use-ticket-options';

interface BoardAssigneePickerProps {
  ticket: BoardTicket;
}

export function BoardAssigneePicker({ ticket }: BoardAssigneePickerProps) {
  const { options, isLoading } = useAssigneeOptions();
  const assign = useAssignTicket();
  const assignee = ticket.assignees?.[0];

  return (
    <AssigneeDropdown
      variant="compact"
      currentAssignee={
        assignee
          ? {
              id: assignee.id,
              name: assignee.name ?? assignee.initials ?? assignee.id,
              avatarSrc: assignee.avatarUrl,
            }
          : undefined
      }
      options={options}
      isLoading={isLoading}
      isPending={assign.isPending}
      onAssign={userId => assign.mutate({ ticketId: ticket.id, assigneeId: userId })}
    />
  );
}
