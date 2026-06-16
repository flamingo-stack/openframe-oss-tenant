'use client';

import { useOptionalNotifications } from '@flamingo-stack/openframe-frontend-core';
import {
  Board,
  type BoardChange,
  type BoardColumnDef,
  type BoardTicket,
  columnFromTicketStatus,
} from '@flamingo-stack/openframe-frontend-core/components/features';
import { TagIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { PageError, PageLayout } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { useDebounce } from '@flamingo-stack/openframe-frontend-core/hooks';
import { type ReactNode, useCallback, useMemo } from 'react';
import { EmptyState } from '@/app/components/shared';
import { appendImageHash } from '@/lib/image-url';
import { useMoveTicket, useMovingTicketIds } from '../hooks/use-move-ticket';
import { useTicketStatusTransitions } from '../hooks/use-ticket-status-transitions';
import { useTicketsActions } from '../hooks/use-tickets-actions';
import { BOARD_STATUSES, useTicketsBoardQuery } from '../hooks/use-tickets-board-query';
import type { BoardStatus } from '../services/ticket-service.types';
import type { Dialog } from '../types/dialog.types';
import { AssigneeFilter } from './assignee-filter';
import { BoardAssigneePicker } from './board-assignee-picker';
import { OrganizationFilter } from './organization-filter';
import { TicketLabelSearchInput, TicketLabelsRow } from './ticket-label-filter';

interface TicketsBoardProps {
  selector?: ReactNode;
  organizationIds?: string[];
  onOrganizationIdsChange?: (ids: string[]) => void;
  assigneeIds?: string[];
  onAssigneeIdsChange?: (ids: string[]) => void;
  labelIds?: string[];
  onLabelIdsChange?: (ids: string[]) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

function initialsOf(name?: string): string | undefined {
  if (!name) return undefined;
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map(p => p.charAt(0).toUpperCase()).join('') || undefined;
}

function dialogToBoardTicket(dialog: Dialog, hasNewMessage = false): BoardTicket {
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
            avatarUrl: appendImageHash(dialog.assigneeImageUrl, dialog.assigneeImageHash),
          },
        ]
      : undefined,
    tags: dialog.labels?.map(l => l.key),
    hasNewMessage,
  };
}

export function TicketsBoard({
  selector,
  organizationIds,
  onOrganizationIdsChange,
  assigneeIds,
  onAssigneeIdsChange,
  labelIds,
  onLabelIdsChange,
  search,
  onSearchChange,
}: TicketsBoardProps) {
  const debouncedSearch = useDebounce(search, 300);

  const { columns, loadMore, isLoading, error } = useTicketsBoardQuery({
    search: debouncedSearch,
    organizationIds,
    assigneeIds,
    labelIds,
  });
  const { mutate: moveTicket } = useMoveTicket();
  const movingIds = useMovingTicketIds();
  const notifications = useOptionalNotifications();

  // Tickets have no unread field of their own; unread state comes from notifications (a separate
  // entity) matched by ticket id.
  const ticketIdsWithUnread = useMemo(() => {
    const ids = new Set<string>();
    for (const notification of notifications?.notifications ?? []) {
      if (notification.read) continue;
      const ticketId = notification.meta?.ticketId;
      if (typeof ticketId === 'string') ids.add(ticketId);
    }
    return ids;
  }, [notifications?.notifications]);
  const { data: statusTransitions } = useTicketStatusTransitions();
  const {
    actions,
    menuActions,
    dialog: ticketsActionsDialog,
    canArchiveResolved,
    openArchiveResolvedConfirm,
  } = useTicketsActions({ isLoading });

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
        return columnFromTicketStatus(
          status,
          state.tickets.map(ticket => dialogToBoardTicket(ticket, ticketIdsWithUnread.has(ticket.id))),
          {
            total: state.total,
            hasMore: state.hasMore,
            isLoading,
            isLoadingMore: state.isLoadingMore,
            system: ['ACTIVE', 'TECH_REQUIRED', 'RESOLVED'].includes(status),
            allowedFromColumns: allowedFromByStatus[status],
            archivable: status === 'RESOLVED' && canArchiveResolved,
          },
        );
      }),
    [columns, allowedFromByStatus, isLoading, canArchiveResolved, ticketIdsWithUnread],
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

  const showEmptyState =
    !isLoading &&
    !debouncedSearch &&
    (organizationIds?.length ?? 0) === 0 &&
    (assigneeIds?.length ?? 0) === 0 &&
    (labelIds?.length ?? 0) === 0 &&
    BOARD_STATUSES.every(status => columns[status].tickets.length === 0);

  if (error) {
    return <PageError message={error} />;
  }

  return (
    <>
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
          <div className="flex flex-col gap-[var(--spacing-system-xxs)]">
            <TicketLabelSearchInput
              search={search}
              onSearchChange={onSearchChange}
              labelIds={labelIds ?? []}
              onLabelIdsChange={ids => onLabelIdsChange?.(ids)}
            />
            <TicketLabelsRow selectedIds={labelIds ?? []} onAdd={id => onLabelIdsChange?.([...(labelIds ?? []), id])} />
          </div>
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

        {showEmptyState ? (
          <EmptyState
            icon={<TagIcon />}
            title="Ticket history empty"
            description="Tickets will appear here when available"
          />
        ) : (
          <div aria-busy={isLoading || movingIds.size > 0} className="flex-1 min-h-0 -mx-[var(--spacing-system-l)]">
            <Board
              columns={boardColumns}
              onChange={handleChange}
              onLoadMore={loadMore}
              onArchiveColumn={openArchiveResolvedConfirm}
              getTicketHref={getTicketHref}
              renderAssignSlot={ticket => <BoardAssigneePicker ticket={ticket} />}
              collapseStorageKey="tickets-board"
              className="h-full px-[var(--spacing-system-l)]"
            />
          </div>
        )}
      </PageLayout>
      {ticketsActionsDialog}
    </>
  );
}
