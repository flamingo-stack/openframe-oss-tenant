'use client';

import {
  Board,
  type BoardChange,
  type BoardColumnDef,
  type BoardTicket,
  columnFromTicketStatus,
} from '@flamingo-stack/openframe-frontend-core/components/features';
import { SearchIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { Input, PageError, PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { type ReactNode, useCallback, useMemo } from 'react';
import { useMoveTicket, useMovingTicketIds } from '../hooks/use-move-ticket';
import { useTicketStatusTransitions } from '../hooks/use-ticket-status-transitions';
import { useTicketsActions } from '../hooks/use-tickets-actions';
import { BOARD_STATUSES, useTicketsBoardQuery } from '../hooks/use-tickets-board-query';
import type { BoardStatus } from '../services/ticket-service.types';
import type { Dialog } from '../types/dialog.types';
import { AssigneeFilter } from './assignee-filter';
import { BoardAssigneePicker } from './board-assignee-picker';
import { OrganizationFilter } from './organization-filter';

interface TicketsBoardProps {
  selector?: ReactNode;
  organizationIds?: string[];
  onOrganizationIdsChange?: (ids: string[]) => void;
  assigneeIds?: string[];
  onAssigneeIdsChange?: (ids: string[]) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

function initialsOf(name?: string): string | undefined {
  if (!name) return undefined;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p.charAt(0).toUpperCase()).join('') || undefined;
}

function dialogToBoardTicket(dialog: Dialog): BoardTicket {
  return {
    id: dialog.id,
    title: dialog.title,
    ticketNumber: dialog.ticketNumber !== undefined ? String(dialog.ticketNumber) : '',
    status: dialog.status,
    deviceHostnames: dialog.deviceHostname ? [dialog.deviceHostname] : undefined,
    organizationName: dialog.organizationName,
    assignees: dialog.assignedTo
      ? [
          {
            id: dialog.assignedTo,
            name: dialog.assignedName,
            initials: initialsOf(dialog.assignedName),
            avatarUrl: dialog.assigneeImageUrl,
          },
        ]
      : undefined,
    tags: dialog.labels?.map(l => l.key),
  };
}

export function TicketsBoard({
  selector,
  organizationIds,
  onOrganizationIdsChange,
  assigneeIds,
  onAssigneeIdsChange,
  search,
  onSearchChange,
}: TicketsBoardProps) {
  const debouncedSearch = useDebounce(search, 300);

  const { columns, loadMore, isLoading, error } = useTicketsBoardQuery({
    search: debouncedSearch,
    organizationIds,
    assigneeIds,
  });
  const { mutate: moveTicket } = useMoveTicket();
  const movingIds = useMovingTicketIds();
  const { data: statusTransitions } = useTicketStatusTransitions();
  const { actions, menuActions } = useTicketsActions({ isLoading });

  const allowedFromByStatus = useMemo<Partial<Record<BoardStatus, string[]>>>(() => {
    if (!statusTransitions) return {};
    const map: Partial<Record<BoardStatus, string[]>> = {};
    for (const { from, to } of statusTransitions) {
      for (const target of to) {
        if (!BOARD_STATUSES.includes(target as BoardStatus)) continue;
        const targetKey = target as BoardStatus;
        (map[targetKey] ??= []).push(from);
      }
    }
    return map;
  }, [statusTransitions]);

  const boardColumns = useMemo<BoardColumnDef[]>(
    () =>
      BOARD_STATUSES.map(status => {
        const state = columns[status];
        return columnFromTicketStatus(status, state.tickets.map(dialogToBoardTicket), {
          total: state.total,
          hasMore: state.hasMore,
          isLoading,
          isLoadingMore: state.isLoadingMore,
          system: ['ACTIVE', 'TECH_REQUIRED', 'RESOLVED'].includes(status),
          allowedFromColumns: allowedFromByStatus[status],
        });
      }),
    [columns, allowedFromByStatus, isLoading],
  );

  const getTicketHref = useCallback((id: string) => `/tickets/dialog?id=${id}`, []);

  const handleChange = useCallback(
    (change: BoardChange) => {
      moveTicket({
        ticketId: change.ticketId,
        sourceStatus: change.fromColumnId as BoardStatus,
        targetStatus: change.toColumnId as BoardStatus,
        afterTicketId: change.afterTicketId,
        beforeTicketId: change.beforeTicketId,
      });
    },
    [moveTicket],
  );

  if (error) {
    return <PageError message={error} />;
  }

  return (
    <PageLayout
      title="Tickets"
      actions={actions.length > 0 ? actions : undefined}
      menuActions={menuActions.length > 0 ? menuActions : undefined}
      actionsVariant="menu-primary"
      selector={selector}
      className="h-full px-[var(--spacing-system-l)] pb-[var(--spacing-system-l)]"
      contentClassName="flex flex-col min-h-0"
    >
      <div className="flex flex-col gap-[var(--spacing-system-l)]">
        <Input
          placeholder="Search for Ticket"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          startAdornment={<SearchIcon className="w-4 h-4 md:w-6 md:h-6" />}
        />
        <div className="grid grid-cols-4 gap-[var(--spacing-system-l)]">
          <OrganizationFilter
            value={organizationIds ?? []}
            onChange={ids => onOrganizationIdsChange?.(ids)}
            className="col-span-1"
          />
          <AssigneeFilter
            value={assigneeIds ?? []}
            onChange={ids => onAssigneeIdsChange?.(ids)}
            className="col-span-1"
          />
        </div>
      </div>

      <div aria-busy={isLoading || movingIds.size > 0} className="flex-1 min-h-0 -mx-[var(--spacing-system-l)]">
        <Board
          columns={boardColumns}
          onChange={handleChange}
          onLoadMore={loadMore}
          getTicketHref={getTicketHref}
          renderAssignSlot={ticket => <BoardAssigneePicker ticket={ticket} />}
          collapseStorageKey="tickets-board"
          className="h-full px-[var(--spacing-system-l)]"
        />
      </div>
    </PageLayout>
  );
}
